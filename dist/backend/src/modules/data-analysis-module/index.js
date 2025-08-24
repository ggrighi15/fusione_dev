import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import multer from 'multer';
import crypto from 'crypto';
import ExcelParser from './excel-parser.js';
import DataComparator from './data-comparator.js';
import ReportGenerator from './report-generator.js';
import DataNormalizer from './data-normalizer.js';
import UnifiedDatabase from './unified-database.js';
import HistoryManager from './history-manager.js';
import XMLProcessor from './xml-processor.js';

class DataAnalysisModule {
  constructor(core) {
    this.core = core;
    this.name = 'data-analysis-module';
    this.version = '1.0.0';
    this.description = 'Módulo para análise e comparação de dados entre períodos';
    this.logger = core.logger;
    this.eventBus = core.eventBus;
    this.cache = core.cache;
    this.database = core.database;
    this.config = core.config.get('modules.data-analysis-module', {
      uploadPath: './uploads',
      outputPath: './output/analysis',
      supportedFormats: ['xlsx', 'json'],
      maxFileSize: '50MB'
    });
    
    // Configuração do multer para upload de arquivos
    this.upload = multer({
      dest: this.config.uploadPath,
      limits: {
        fileSize: this.parseFileSize(this.config.maxFileSize),
        files: 20 // máximo 20 arquivos simultâneos
      },
      fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const isSupported = this.config.supportedFormats.some(format => 
          ext === `.${format}` || ext === format
        );
        cb(null, isSupported);
      }
    });
    
    // Dicionários de normalização
    this.dictionaries = {
      categorias: null,
      clientes: null,
      polos: null,
      riscos: null
    };
    
    // Cache para análises
    this.analysisCache = new Map();
    
    // Parser Excel
    this.excelParser = new ExcelParser(this.logger);
    
    // Comparador de dados
    this.dataComparator = new DataComparator(this.logger);
    
    // Gerador de relatórios
    this.reportGenerator = new ReportGenerator(this.logger);
    
    // Normalizador de dados
    this.dataNormalizer = new DataNormalizer(this.logger);
    
    // Banco de dados unificado
    this.unifiedDatabase = new UnifiedDatabase(this.logger);
    
    // Gerenciador de histórico
    this.historyManager = new HistoryManager(this.logger);
    
    // Processador XML
    this.xmlProcessor = new XMLProcessor(this.logger);
    
    // Iniciar sessão de trabalho
    this.currentSessionId = this.historyManager.startSession('Sistema de Análise de Dados');
  }

  async initialize() {
    try {
      this.logger.info('Inicializando Data Analysis Module...');
      
      // Criar diretórios necessários
      await this.createDirectories();
      
      // Registrar rotas
      this.registerRoutes();
      
      // Registrar eventos
      this.registerEvents();
      
      this.logger.info('Data Analysis Module inicializado com sucesso');
      return true;
    } catch (error) {
      this.logger.error('Erro ao inicializar Data Analysis Module:', error);
      throw error;
    }
  }

  async createDirectories() {
    const dirs = [this.config.uploadPath, this.config.outputPath];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.info(`Diretório criado: ${dir}`);
      }
    }
  }

  registerRoutes() {
    if (!this.core.express || !this.core.express.Router) {
      this.logger.warn('Express não está disponível no core, pulando registro de rotas');
      return;
    }
    const router = this.core.express.Router();
    
    // Upload de arquivos (até 20 arquivos)
    router.post('/upload', this.upload.array('files', 20), this.handleFileUpload.bind(this));
    
    // Upload de dicionários
    router.post('/dictionaries', this.upload.array('dictionaries', 10), this.handleDictionaryUpload.bind(this));
    
    // Análise de dados
    router.post('/analyze', this.handleDataAnalysis.bind(this));
    
    // Obter resultados de análise
    router.get('/results/:analysisId', this.getAnalysisResults.bind(this));
    
    // Listar análises
    router.get('/analyses', this.listAnalyses.bind(this));
    
    // Baixar relatório
    router.get('/download/:analysisId', this.downloadReport.bind(this));
    
    // Preview de arquivo Excel
    router.post('/preview', this.upload.single('file'), this.handleFilePreview.bind(this));
    
    // Rota para gerar relatório específico
    router.post('/generate-report', this.handleReportGeneration.bind(this));
    
    // Rota para listar relatórios disponíveis
    router.get('/reports', this.handleListReports.bind(this));
    
    // Rota para download de relatórios
    router.get('/reports/:reportId', this.handleReportDownload.bind(this));
    
    // Rotas para histórico
    router.get('/history', this.handleGetHistory.bind(this));
    router.get('/history/session/:sessionId', this.handleGetSessionHistory.bind(this));
    router.get('/statistics', this.handleGetStatistics.bind(this));
    router.post('/history/clear', this.handleClearHistory.bind(this));
    
    // Rota para upload completo (múltiplos arquivos)
    router.post('/upload-complete', this.upload.array('files', 20), this.handleCompleteUpload.bind(this));
    
    // Rota para upload de dicionários JSON
    router.post('/upload-dictionaries', this.upload.array('dictionaries', 10), this.handleDictionaryUpload.bind(this));
    
    this.core.app.use('/api/data-analysis', router);
    this.logger.info('Rotas do Data Analysis Module registradas');
  }

  registerEvents() {
    this.eventBus.on('data-analysis:file-uploaded', (data) => {
      this.logger.info('Arquivo carregado para análise:', data.filename);
    });
    
    this.eventBus.on('data-analysis:analysis-completed', (data) => {
      this.logger.info('Análise concluída:', data.analysisId);
    });
  }

  async handleFileUpload(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      if (req.files.length > 20) {
        this.historyManager.logError(
          new Error('Limite de arquivos excedido'),
          { attemptedFiles: req.files.length, maxAllowed: 20 }
        );
        return res.status(400).json({ error: 'Máximo de 20 arquivos permitidos' });
      }

      const uploadedFiles = [];
      const fileTypes = { excel: [], json: [], xml: [] };
      
      for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        
        // Calcular hash do arquivo
        const fileBuffer = fs.readFileSync(file.path);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        const fileInfo = {
          id: this.generateId(),
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          type: this.getFileType(ext),
          hash: fileHash,
          uploadedAt: new Date().toISOString()
        };
        
        // Adicionar ao banco de dados unificado
        const fileId = this.unifiedDatabase.addFile(fileInfo);
        fileInfo.id = fileId;
        
        // Registrar no histórico
        this.historyManager.logFileUpload(fileInfo);
        
        uploadedFiles.push(fileInfo);
        
        // Categorizar arquivos por tipo
        if (['.xlsx', '.xls'].includes(ext)) {
          fileTypes.excel.push(fileInfo);
        } else if (ext === '.json') {
          fileTypes.json.push(fileInfo);
        } else if (ext === '.xml') {
          fileTypes.xml.push(fileInfo);
        }
        
        this.eventBus.emit('data-analysis:file-uploaded', fileInfo);
      }

      res.json({
        success: true,
        message: `${uploadedFiles.length} arquivos carregados com sucesso`,
        files: uploadedFiles,
        fileTypes: fileTypes,
        summary: {
          total: uploadedFiles.length,
          excel: fileTypes.excel.length,
          json: fileTypes.json.length,
          xml: fileTypes.xml.length
        }
      });
    } catch (error) {
      this.logger.error('Erro no upload de arquivos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async handleDictionaryUpload(req, res) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'Nenhum dicionário enviado' });
      }

      const loadedDictionaries = {};
      
      for (const file of req.files) {
        const content = fs.readFileSync(file.path, 'utf8');
        const data = JSON.parse(content);
        
        // Identificar tipo de dicionário pelo nome do arquivo
        const filename = file.originalname.toLowerCase();
        let dictType = null;
        
        if (filename.includes('categoria')) dictType = 'categorias';
        else if (filename.includes('cliente')) dictType = 'clientes';
        else if (filename.includes('polo')) dictType = 'polos';
        else if (filename.includes('risco')) dictType = 'riscos';
        
        if (dictType) {
          this.dictionaries[dictType] = data;
          loadedDictionaries[dictType] = Object.keys(data).length;
        }
        
        // Limpar arquivo temporário
        fs.unlinkSync(file.path);
      }

      res.json({
        success: true,
        message: 'Dicionários carregados com sucesso',
        dictionaries: loadedDictionaries
      });
    } catch (error) {
      this.logger.error('Erro no upload de dicionários:', error);
      res.status(500).json({ error: 'Erro ao processar dicionários' });
    }
  }

  async handleDataAnalysis(req, res) {
    try {
      const { files, analysisType = 'period_comparison', options = {} } = req.body;
      
      if (!files || files.length < 2) {
        return res.status(400).json({ 
          error: 'São necessários pelo menos 2 arquivos para comparação' 
        });
      }

      // Criar análise no banco de dados unificado
      const analysisId = this.unifiedDatabase.createAnalysis({
        name: options.name || `Análise Comparativa - ${new Date().toLocaleDateString()}`,
        description: options.description || 'Análise comparativa de múltiplos arquivos',
        fileIds: files.map(f => f.id || f.filename),
        parameters: { analysisType, ...options }
      });

      const analysis = this.unifiedDatabase.getAnalysis(analysisId);
      this.analysisCache.set(analysisId, analysis);
      
      // Registrar início da análise no histórico
      this.historyManager.logAnalysisStarted(analysisId, analysis.name, files.map(f => f.id || f.filename));
      
      // Iniciar acompanhamento de progresso
      this.historyManager.startProgress('Análise Comparativa', files.length + 2); // +2 para comparação e relatório
      
      // Iniciar análise assíncrona
      this.performAnalysis(analysisId, files, analysisType, options)
        .catch(error => {
          this.logger.error('Erro na análise:', error);
          this.unifiedDatabase.updateAnalysisStatus(analysisId, 'failed', null, null, error.message);
          const updatedAnalysis = this.unifiedDatabase.getAnalysis(analysisId);
          this.analysisCache.set(analysisId, updatedAnalysis);
          
          this.historyManager.logError(error, { analysisId, files });
        });

      res.json({
        success: true,
        analysisId,
        message: 'Análise iniciada',
        status: 'processing'
      });
    } catch (error) {
      this.logger.error('Erro ao iniciar análise:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async performAnalysis(analysisId, files, analysisType, options) {
    try {
      // Atualizar status no banco de dados
      this.unifiedDatabase.updateAnalysisStatus(analysisId, 'processing', 0);
      
      // Carregar e processar arquivos
      this.historyManager.updateProgress(1, 'Carregando arquivos...');
      const datasets = await this.loadDatasets(files);
      
      // Normalizar dados usando dicionários
      this.historyManager.updateProgress(2, 'Normalizando dados...');
      const normalizedDatasets = await this.normalizeDatasets(datasets);
      
      // Realizar comparação
      this.historyManager.updateProgress(3, 'Comparando datasets...');
      const comparison = await this.compareDatasets(normalizedDatasets, options);
      
      // Gerar relatório
      this.historyManager.updateProgress(4, 'Gerando relatório...');
      const report = await this.generateReport(comparison, analysisId);
      
      // Salvar resultados
      const results = {
        datasets: datasets.map(d => ({ name: d.name, rows: d.data.length })),
        comparison,
        report,
        analysisType,
        options
      };
      
      // Atualizar análise no banco de dados
      this.unifiedDatabase.updateAnalysisStatus(analysisId, 'completed', 100, results);
      const updatedAnalysis = this.unifiedDatabase.getAnalysis(analysisId);
      this.analysisCache.set(analysisId, updatedAnalysis);
      
      // Registrar conclusão no histórico
      this.historyManager.logAnalysisCompleted(analysisId, results);
      this.historyManager.completeProgress();
      
      this.eventBus.emit('data-analysis:analysis-completed', {
        analysisId,
        results
      });
      
    } catch (error) {
      this.logger.error('Erro durante análise:', error);
      throw error;
    }
  }

  async loadDatasets(files) {
    const datasets = [];
    
    for (const fileInfo of files) {
      const filePath = path.join(this.config.uploadPath, fileInfo.filename);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${fileInfo.originalName}`);
      }
      
      let data;
      const ext = path.extname(fileInfo.originalName).toLowerCase();
      
      if (ext === '.xlsx' || ext === '.xls') {
        data = await this.readExcelFile(filePath, fileInfo.originalName);
      } else if (ext === '.json') {
        const content = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(content);
      } else {
        throw new Error(`Formato não suportado: ${ext}`);
      }
      
      datasets.push({
        name: fileInfo.originalName,
        filename: fileInfo.filename,
        data,
        loadedAt: new Date().toISOString()
      });
    }
    
    return datasets;
  }

  async readExcelFile(filePath, originalName) {
    try {
      const result = await this.excelParser.parseExcelFile(filePath, originalName);
      
      this.logger.info(`Arquivo processado: ${originalName}`);
      this.logger.info(`Estrutura detectada: ${result.structure.description}`);
      this.logger.info(`Total de registros: ${result.metadata.totalRows}`);
      
      return result.data;
    } catch (error) {
      this.logger.error('Erro ao ler arquivo Excel:', error);
      throw new Error(`Erro ao processar arquivo Excel: ${error.message}`);
    }
  }

  async normalizeDatasets(datasets) {
    const normalized = [];
    
    for (const dataset of datasets) {
      const normalizedData = await this.normalizeData(dataset.data);
      
      normalized.push({
        ...dataset,
        data: normalizedData,
        normalizedAt: new Date().toISOString()
      });
    }
    
    return normalized;
  }

  async normalizeData(data) {
    if (!Array.isArray(data)) {
      return data;
    }
    
    return data.map(row => {
      const normalized = { ...row };
      
      // Normalizar usando dicionários se disponíveis
      if (this.dictionaries.categorias && row.Categoria) {
        normalized.CategoriaNormalizada = this.dictionaries.categorias[row.Categoria] || row.Categoria;
      }
      
      if (this.dictionaries.clientes && row.Cliente) {
        normalized.ClienteNormalizado = this.dictionaries.clientes[row.Cliente] || row.Cliente;
      }
      
      if (this.dictionaries.polos && row.Polo) {
        normalized.PoloNormalizado = this.dictionaries.polos[row.Polo] || row.Polo;
      }
      
      if (this.dictionaries.riscos && row.Risco) {
        normalized.RiscoNormalizado = this.dictionaries.riscos[row.Risco] || row.Risco;
      }
      
      // Normalizar valores numéricos
      Object.keys(normalized).forEach(key => {
        if (key.toLowerCase().includes('valor') && typeof normalized[key] === 'string') {
          const numValue = this.parseNumericValue(normalized[key]);
          if (!isNaN(numValue)) {
            normalized[`${key}_Numerico`] = numValue;
          }
        }
      });
      
      return normalized;
    });
  }

  parseNumericValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return NaN;
    
    // Remover caracteres não numéricos exceto ponto e vírgula
    const cleaned = value.replace(/[^\d.,\-]/g, '');
    
    // Converter vírgula para ponto se for separador decimal
    const normalized = cleaned.replace(',', '.');
    
    return parseFloat(normalized);
  }

  async compareDatasets(datasets, options = {}) {
    if (datasets.length < 2) {
      throw new Error('São necessários pelo menos 2 datasets para comparação');
    }
    
    const [dataset1, dataset2] = datasets;
    
    this.logger.info('Iniciando comparação avançada de datasets...');
    this.logger.info(`Dataset 1 (${dataset1.name}): ${dataset1.data.length} registros`);
    this.logger.info(`Dataset 2 (${dataset2.name}): ${dataset2.data.length} registros`);
    
    // Usar o comparador avançado
    const comparisonResult = this.dataComparator.compareDatasets(
      dataset1.data, 
      dataset2.data, 
      options
    );
    
    // Gerar resumo
    const summary = this.dataComparator.generateSummary(comparisonResult);
    
    // Adicionar metadados dos datasets
    comparisonResult.datasets = {
      dataset1: {
        name: dataset1.name,
        totalRecords: dataset1.data.length
      },
      dataset2: {
        name: dataset2.name,
        totalRecords: dataset2.data.length
      }
    };
    
    comparisonResult.summary = summary;
    
    this.logger.info('Comparação concluída:');
    this.logger.info(`- Novos: ${comparisonResult.statistics.records.new}`);
    this.logger.info(`- Removidos: ${comparisonResult.statistics.records.removed}`);
    this.logger.info(`- Modificados: ${comparisonResult.statistics.records.modified}`);
    this.logger.info(`- Inalterados: ${comparisonResult.statistics.records.unchanged}`);
    
    return comparisonResult;
  }

  createRecordIndex(data, keyField) {
    const index = {};
    
    data.forEach(record => {
      const key = record[keyField];
      if (key) {
        index[key] = record;
      }
    });
    
    return index;
  }

  compareRecords(record1, record2, options = {}) {
    const differences = [];
    const fieldsToCompare = options.compareFields || Object.keys(record1);
    
    for (const field of fieldsToCompare) {
      const value1 = record1[field];
      const value2 = record2[field];
      
      if (this.valuesAreDifferent(value1, value2, options)) {
        differences.push({
          field,
          oldValue: value1,
          newValue: value2,
          type: this.getDifferenceType(value1, value2)
        });
      }
    }
    
    return differences;
  }

  valuesAreDifferent(value1, value2, options = {}) {
    // Valores nulos/undefined
    if (value1 == null && value2 == null) return false;
    if (value1 == null || value2 == null) return true;
    
    // Valores numéricos
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      const threshold = options.numericThreshold || 0.01;
      return Math.abs(value1 - value2) > threshold;
    }
    
    // Strings
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.trim().toLowerCase() !== value2.trim().toLowerCase();
    }
    
    // Outros tipos
    return value1 !== value2;
  }

  getDifferenceType(value1, value2) {
    if (value1 == null && value2 != null) return 'added';
    if (value1 != null && value2 == null) return 'removed';
    if (typeof value1 === 'number' && typeof value2 === 'number') return 'numeric_change';
    return 'modified';
  }

  async generateReport(comparison, analysisId) {
    const report = {
      id: analysisId,
      generatedAt: new Date().toISOString(),
      summary: comparison.summary,
      details: {
        newRecords: comparison.newRecords.length,
        removedRecords: comparison.removedRecords.length,
        modifiedRecords: comparison.modifiedRecords.length
      },
      recommendations: this.generateRecommendations(comparison)
    };
    
    // Salvar relatório em arquivo
    const reportPath = path.join(this.config.outputPath, `analysis_${analysisId}.json`);
    fs.writeFileSync(reportPath, JSON.stringify({
      report,
      comparison
    }, null, 2));
    
    return report;
  }

  generateRecommendations(comparison) {
    const recommendations = [];
    
    if (comparison.newRecords.length > 0) {
      recommendations.push(`${comparison.newRecords.length} novos registros identificados - revisar para validação`);
    }
    
    if (comparison.removedRecords.length > 0) {
      recommendations.push(`${comparison.removedRecords.length} registros removidos - verificar se foram encerrados corretamente`);
    }
    
    if (comparison.modifiedRecords.length > 0) {
      recommendations.push(`${comparison.modifiedRecords.length} registros modificados - analisar mudanças de valores e status`);
    }
    
    return recommendations;
  }

  async getAnalysisResults(req, res) {
    try {
      const { analysisId } = req.params;
      
      if (!this.analysisCache.has(analysisId)) {
        return res.status(404).json({ error: 'Análise não encontrada' });
      }
      
      const results = this.analysisCache.get(analysisId);
      res.json(results);
    } catch (error) {
      this.logger.error('Erro ao obter resultados:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async listAnalyses(req, res) {
    try {
      const analyses = Array.from(this.analysisCache.entries()).map(([id, data]) => ({
        id,
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        analysisType: data.analysisType
      }));
      
      res.json({ analyses });
    } catch (error) {
      this.logger.error('Erro ao listar análises:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async downloadReport(req, res) {
    try {
      const { analysisId } = req.params;
      const reportPath = path.join(this.config.outputPath, `analysis_${analysisId}.json`);
      
      if (!fs.existsSync(reportPath)) {
        return res.status(404).json({ error: 'Relatório não encontrado' });
      }
      
      res.download(reportPath, `analysis_report_${analysisId}.json`);
    } catch (error) {
      this.logger.error('Erro ao baixar relatório:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async handleFilePreview(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      const file = req.file;
      const ext = path.extname(file.originalname).toLowerCase();
      
      if (ext !== '.xlsx' && ext !== '.xls') {
        // Limpar arquivo temporário
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Apenas arquivos Excel são suportados para preview' });
      }

      // Gerar preview
      const preview = await this.excelParser.showPreview(file.path, file.originalname, 5);
      
      // Limpar arquivo temporário
      fs.unlinkSync(file.path);

      res.json({
        success: true,
        preview
      });
    } catch (error) {
      this.logger.error('Erro ao gerar preview:', error);
      
      // Limpar arquivo temporário em caso de erro
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: 'Erro ao gerar preview do arquivo' });
    }
  }

  parseFileSize(sizeStr) {
    const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+)\s*(B|KB|MB|GB)$/i);
    
    if (!match) return 50 * 1024 * 1024; // Default 50MB
    
    const [, size, unit] = match;
    return parseInt(size) * (units[unit.toUpperCase()] || 1);
  }

  getFileType(extension) {
    const typeMap = {
      '.xlsx': 'excel',
      '.xls': 'excel',
      '.json': 'json',
      '.xml': 'xml'
    };
    return typeMap[extension.toLowerCase()] || 'unknown';
  }

  async processFileByType(file) {
    try {
      this.historyManager.logFileProcessing(file.id, file.originalName, file.type);
      
      let extractedData = null;
      
      switch (file.type) {
        case 'excel':
          extractedData = await this.excelParser.parseFile(file.path);
          break;
        case 'json':
          const jsonContent = fs.readFileSync(file.path, 'utf8');
          extractedData = JSON.parse(jsonContent);
          break;
        case 'xml':
          extractedData = await this.xmlProcessor.processXMLFile(file.path);
          break;
        default:
          throw new Error(`Tipo de arquivo não suportado: ${file.type}`);
      }
      
      // Atualizar arquivo no banco de dados com os dados extraídos
      this.unifiedDatabase.updateFileData(file.id, extractedData);
      
      this.historyManager.logFileProcessed(file.id, file.originalName, extractedData);
      
      return extractedData;
    } catch (error) {
      this.historyManager.logError(error, { fileId: file.id, fileName: file.originalName });
      throw error;
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async handleReportDownload(req, res) {
    try {
      const { reportId } = req.params;
      const { format = 'json' } = req.query;
      
      // Verificar se o relatório existe
      const reportPath = this.getReportPath(reportId, format);
      
      if (!fs.existsSync(reportPath)) {
        return res.status(404).json({
          success: false,
          error: 'Relatório não encontrado'
        });
      }
      
      // Configurar headers para download
      const filename = `relatorio_${reportId}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      if (format === 'xlsx') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else {
        res.setHeader('Content-Type', 'application/json');
      }
      
      // Enviar arquivo
      res.sendFile(path.resolve(reportPath));
      
    } catch (error) {
      this.logger.error('Erro no download do relatório:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
  
  async handleReportGeneration(req, res) {
    try {
      const { analysisId, comparisonData, format = 'json', reportType = 'full', options = {} } = req.body;
      
      if (!analysisId && !comparisonData) {
        return res.status(400).json({
          success: false,
          error: 'ID da análise ou dados de comparação são obrigatórios'
        });
      }

      let report;
      let analysis = null;
      
      if (analysisId) {
        analysis = this.unifiedDatabase.getAnalysis(analysisId);
        if (!analysis) {
          return res.status(404).json({
            success: false,
            error: 'Análise não encontrada'
          });
        }

        if (analysis.status !== 'completed') {
          return res.status(400).json({
            success: false,
            error: 'Análise ainda não foi concluída'
          });
        }

        if (reportType === 'summary') {
          report = this.reportGenerator.generateSummaryReport(analysis.results);
        } else {
          report = this.reportGenerator.generateComparisonReport(analysis.results);
        }
      } else {
        if (reportType === 'summary') {
          report = this.reportGenerator.generateSummaryReport(comparisonData);
        } else {
          report = this.reportGenerator.generateComparisonReport(comparisonData);
        }
      }
      
      // Criar relatório no banco de dados unificado
      const reportId = this.unifiedDatabase.createReport({
        analysisId: analysisId || null,
        name: options.name || `Relatório ${format.toUpperCase()} - ${new Date().toLocaleDateString()}`,
        type: 'comparison',
        format,
        data: report.data,
        summary: report.summary
      });
      
      // Salvar relatório
      const outputPath = this.getReportPath(reportId, format);
      
      if (format === 'xlsx') {
        await this.reportGenerator.exportToExcel(report, outputPath);
      } else {
        await this.reportGenerator.exportToJSON(report, outputPath);
      }
      
      // Atualizar caminho do arquivo no banco
      this.unifiedDatabase.updateReportPath(reportId, outputPath);
      
      // Registrar no histórico
      this.historyManager.logReportGenerated(reportId, format, analysisId);
      
      res.json({
        success: true,
        message: 'Relatório gerado com sucesso',
        reportId,
        format,
        downloadUrl: `/api/data-analysis/reports/${reportId}?format=${format}`
      });
      
    } catch (error) {
      this.logger.error('Erro na geração do relatório:', error);
      this.historyManager.logError(error, { reportGeneration: true });
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
  
  async handleListReports(req, res) {
    try {
      const reportsDir = this.getReportsDirectory();
      
      if (!fs.existsSync(reportsDir)) {
        return res.json({
          success: true,
          reports: []
        });
      }
      
      const files = fs.readdirSync(reportsDir);
      const reports = files
        .filter(file => file.startsWith('relatorio_'))
        .map(file => {
          const stats = fs.statSync(path.join(reportsDir, file));
          const reportId = file.replace(/^relatorio_/, '').replace(/\.(json|xlsx)$/, '');
          const format = file.endsWith('.xlsx') ? 'xlsx' : 'json';
          
          return {
            id: reportId,
            filename: file,
            format,
            size: stats.size,
            createdAt: stats.birthtime,
            downloadUrl: `/api/data-analysis/reports/${reportId}?format=${format}`
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      res.json({
        success: true,
        reports
      });
      
    } catch (error) {
      this.logger.error('Erro ao listar relatórios:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
  
  generateReportId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}`;
  }
  
  getReportsDirectory() {
    const reportsDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    return reportsDir;
  }
  
  getReportPath(reportId, format) {
     const reportsDir = this.getReportsDirectory();
     return path.join(reportsDir, `relatorio_${reportId}.${format}`);
   }
   
   async handleCompleteUpload(req, res) {
     try {
       const { excel_files = [], json_files = [] } = req.files;
       const { autoAnalyze = false, reportFormat = 'json' } = req.body;
       
       this.logger.info('Processando upload completo...');
       this.logger.info(`Arquivos Excel: ${excel_files.length}`);
       this.logger.info(`Arquivos JSON: ${json_files.length}`);
       
       // Validar arquivos Excel
       if (excel_files.length < 1) {
         return res.status(400).json({
           success: false,
           error: 'Pelo menos um arquivo Excel é obrigatório'
         });
       }
       
       if (excel_files.length > 2) {
         return res.status(400).json({
           success: false,
           error: 'Máximo de 2 arquivos Excel permitidos'
         });
       }
       
       // Processar arquivos Excel
       const excelDatasets = [];
       for (const file of excel_files) {
         try {
           const data = await this.excelParser.parseFile(file.path);
           excelDatasets.push({
             name: file.originalname,
             filename: file.filename,
             data: data,
             uploadedAt: new Date().toISOString()
           });
           
           // Limpar arquivo temporário
           fs.unlinkSync(file.path);
         } catch (error) {
           this.logger.error(`Erro ao processar ${file.originalname}:`, error);
           // Limpar arquivo temporário em caso de erro
           if (fs.existsSync(file.path)) {
             fs.unlinkSync(file.path);
           }
         }
       }
       
       // Processar arquivos JSON (dicionários)
       const dictionaries = {};
       for (const file of json_files) {
         try {
           const content = fs.readFileSync(file.path, 'utf8');
           const jsonData = JSON.parse(content);
           
           // Identificar tipo de dicionário pelo nome do arquivo
           const filename = file.originalname.toLowerCase();
           if (filename.includes('cliente')) {
             dictionaries.clientes = jsonData;
           } else if (filename.includes('categoria')) {
             dictionaries.categorias = jsonData;
           } else if (filename.includes('polo')) {
             dictionaries.polos = jsonData;
           } else if (filename.includes('risco')) {
             dictionaries.riscos = jsonData;
           } else {
             // Usar nome do arquivo como chave
             const key = path.basename(file.originalname, '.json');
             dictionaries[key] = jsonData;
           }
           
           // Limpar arquivo temporário
           fs.unlinkSync(file.path);
         } catch (error) {
           this.logger.error(`Erro ao processar ${file.originalname}:`, error);
           // Limpar arquivo temporário em caso de erro
           if (fs.existsSync(file.path)) {
             fs.unlinkSync(file.path);
           }
         }
       }
       
       // Carregar dicionários no normalizador
       if (Object.keys(dictionaries).length > 0) {
         this.dataNormalizer.loadDictionaries(dictionaries);
       }
       
       // Criar ID único para esta análise
       const analysisId = this.generateReportId();
       
       // Salvar dados da análise
       const analysisData = {
         id: analysisId,
         datasets: excelDatasets,
         dictionaries: dictionaries,
         createdAt: new Date().toISOString(),
         status: 'uploaded'
       };
       
       // Salvar metadados da análise
       const analysisPath = path.join(this.getReportsDirectory(), `analysis_${analysisId}.json`);
       fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2));
       
       // Normalizar dados se temos dicionários
       let normalizedDatasets = excelDatasets;
       if (Object.keys(dictionaries).length > 0) {
         normalizedDatasets = excelDatasets.map((dataset, index) => {
           try {
             // Mapear campos comuns para tipos de normalização
             const fieldMapping = {
               'cliente': 'clientes',
               'empresa': 'clientes',
               'razao_social': 'clientes',
               'categoria': 'categorias',
               'tipo': 'categorias',
               'polo': 'polos',
               'regional': 'polos',
               'risco': 'riscos',
               'rating': 'riscos'
             };
             
             const normalizationResult = this.dataNormalizer.normalizeDataset(dataset.data, fieldMapping);
             this.logger.info(`Dataset ${index + 1} normalizado:`, normalizationResult.stats);
             
             return {
               ...dataset,
               data: normalizationResult.data,
               normalizationLog: normalizationResult.log,
               normalizationStats: normalizationResult.stats
             };
           } catch (error) {
             this.logger.error(`Erro na normalização do dataset ${index + 1}:`, error);
             return dataset;
           }
         });
       }
       
       let comparisonResult = null;
       let reportId = null;
       
       // Se solicitado, executar análise automaticamente
       if (autoAnalyze && normalizedDatasets.length >= 2) {
         try {
           this.logger.info('Executando análise automática...');
           
           // Executar comparação
           comparisonResult = await this.compareDatasets(normalizedDatasets, {
             keyField: 'Pasta',
             dictionaries: dictionaries
           });
           
           // Gerar relatório
           const report = this.reportGenerator.generateComparisonReport(comparisonResult);
           reportId = this.generateReportId();
           
           const reportPath = this.getReportPath(reportId, reportFormat);
           
           if (reportFormat === 'xlsx') {
             await this.reportGenerator.exportToExcel(report, reportPath);
           } else {
             await this.reportGenerator.exportToJSON(report, reportPath);
           }
           
           // Atualizar status da análise
           analysisData.status = 'completed';
           analysisData.reportId = reportId;
           analysisData.comparisonResult = comparisonResult;
           fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2));
           
         } catch (error) {
           this.logger.error('Erro na análise automática:', error);
           analysisData.status = 'error';
           analysisData.error = error.message;
           fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2));
         }
       }
       
       const response = {
         success: true,
         message: 'Upload processado com sucesso',
         analysisId: analysisId,
         datasets: normalizedDatasets.map(d => ({
           name: d.name,
           recordCount: d.data.length,
           normalizationStats: d.normalizationStats
         })),
         dictionaries: Object.keys(dictionaries),
         normalizationStats: this.dataNormalizer.getStats(),
         status: analysisData.status
       };
       
       if (reportId) {
         response.reportId = reportId;
         response.downloadUrl = `/api/data-analysis/reports/${reportId}?format=${reportFormat}`;
       }
       
       if (comparisonResult) {
         response.summary = {
           totalRecords: comparisonResult.statistics.records.total,
           newRecords: comparisonResult.statistics.records.new,
           removedRecords: comparisonResult.statistics.records.removed,
           modifiedRecords: comparisonResult.statistics.records.modified
         };
       }
       
       res.json(response);
       
     } catch (error) {
       this.logger.error('Erro no upload completo:', error);
       
       // Limpar arquivos temporários em caso de erro
       if (req.files) {
         const allFiles = [...(req.files.excel_files || []), ...(req.files.json_files || [])];
         allFiles.forEach(file => {
           if (fs.existsSync(file.path)) {
             fs.unlinkSync(file.path);
           }
         });
       }
       
       res.status(500).json({
         success: false,
         error: 'Erro interno do servidor'
       });
     }
   }
   
   async handleDictionaryUpload(req, res) {
     try {
       const files = req.files;
       
       if (!files || files.length === 0) {
         return res.status(400).json({
           success: false,
           error: 'Nenhum arquivo foi enviado'
         });
       }
       
       const dictionaries = {};
       const errors = [];
       
       for (const file of files) {
         try {
           // Validar se é arquivo JSON
           if (!file.originalname.toLowerCase().endsWith('.json')) {
             errors.push(`${file.originalname}: Apenas arquivos JSON são aceitos`);
             continue;
           }
           
           const content = fs.readFileSync(file.path, 'utf8');
           const jsonData = JSON.parse(content);
           
           // Identificar tipo de dicionário
           const filename = file.originalname.toLowerCase();
           let dictionaryType;
           
           if (filename.includes('cliente')) {
             dictionaryType = 'clientes';
           } else if (filename.includes('categoria')) {
             dictionaryType = 'categorias';
           } else if (filename.includes('polo')) {
             dictionaryType = 'polos';
           } else if (filename.includes('risco')) {
             dictionaryType = 'riscos';
           } else {
             dictionaryType = path.basename(file.originalname, '.json');
           }
           
           dictionaries[dictionaryType] = {
             data: jsonData,
             filename: file.originalname,
             uploadedAt: new Date().toISOString(),
             recordCount: Array.isArray(jsonData) ? jsonData.length : Object.keys(jsonData).length
           };
           
           // Limpar arquivo temporário
           fs.unlinkSync(file.path);
           
         } catch (error) {
           errors.push(`${file.originalname}: ${error.message}`);
           
           // Limpar arquivo temporário em caso de erro
           if (fs.existsSync(file.path)) {
             fs.unlinkSync(file.path);
           }
         }
       }
       
       res.json({
         success: true,
         message: 'Dicionários processados',
         dictionaries: Object.keys(dictionaries),
         details: dictionaries,
         errors: errors.length > 0 ? errors : undefined
       });
       
     } catch (error) {
       this.logger.error('Erro no upload de dicionários:', error);
       
       // Limpar arquivos temporários em caso de erro
       if (req.files) {
         req.files.forEach(file => {
           if (fs.existsSync(file.path)) {
             fs.unlinkSync(file.path);
           }
         });
       }
       
       res.status(500).json({
         success: false,
         error: 'Erro interno do servidor'
       });
     }
   }

  // Handlers para histórico e estatísticas
  async handleGetHistory(req, res) {
    try {
      const { limit = 100, offset = 0, type, sessionId } = req.query;
      
      const history = this.historyManager.getHistory({
        limit: parseInt(limit),
        offset: parseInt(offset),
        type,
        sessionId
      });
      
      res.json({
        success: true,
        history,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: this.historyManager.getHistoryCount()
        }
      });
    } catch (error) {
      this.logger.error('Erro ao obter histórico:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  async handleGetSessionHistory(req, res) {
    try {
      const { sessionId } = req.params;
      
      const sessionHistory = this.historyManager.getSessionHistory(sessionId);
      
      if (!sessionHistory) {
        return res.status(404).json({
          success: false,
          error: 'Sessão não encontrada'
        });
      }
      
      res.json({
        success: true,
        session: sessionHistory
      });
    } catch (error) {
      this.logger.error('Erro ao obter histórico da sessão:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  async handleGetStatistics(req, res) {
    try {
      const { period = '30d' } = req.query;
      
      const statistics = {
        general: this.historyManager.getGeneralStatistics(),
        period: this.historyManager.getPeriodStatistics(period),
        database: this.unifiedDatabase.getStatistics(),
        currentSession: this.historyManager.getCurrentSessionStats()
      };
      
      res.json({
        success: true,
        statistics
      });
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  async handleClearHistory(req, res) {
    try {
      const { olderThan, type } = req.body;
      
      const cleared = this.historyManager.clearHistory({ olderThan, type });
      
      res.json({
        success: true,
        message: `${cleared} registros removidos do histórico`
      });
    } catch (error) {
      this.logger.error('Erro ao limpar histórico:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  async shutdown() {
    this.logger.info('Desligando Data Analysis Module...');
    
    // Finalizar sessão atual
    this.historyManager.endSession(this.currentSessionId);
    
    // Limpar caches
    this.analysisCache.clear();
    
    // Salvar estado final
    this.unifiedDatabase.saveState();
    this.historyManager.saveState();
  }
}

export default DataAnalysisModule;