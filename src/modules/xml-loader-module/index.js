import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import xml2js from 'xml2js';

import config from './config.js';
import * as utils from './utils.js';
import { createLogger } from '../../core/logger.js';

const logger = createLogger('FusioneXMLLoader');

/**
 * Fusione XML Loader
 * Módulo para ingestão de XMLs do ecossistema (Espaider/relatórios)
 * Baseado no fusione_loader.py original
 */
class FusioneXMLLoader {
  constructor(core) {
    this.core = core;
    this.name = 'xml-loader-module';
    this.version = '1.0.0';
    this.description = 'Módulo para carregamento e processamento de arquivos XML';
    this.logger = core ? core.logger : logger;
    
    this.parser = new xml2js.Parser({
      explicitArray: false,
      mergeAttrs: true,
      ignoreAttrs: false,
      attrkey: '@',
      charkey: '#text'
    });
  }

  async initialize() {
    try {
      this.logger.info('Inicializando XML Loader Module...');
      
      // Registrar rotas se express estiver disponível
      if (this.core && this.core.express) {
        this.registerRoutes();
      }
      
      this.logger.info('XML Loader Module inicializado com sucesso');
    } catch (error) {
      this.logger.error('Erro ao inicializar XML Loader Module:', error);
      throw error;
    }
  }

  registerRoutes() {
    if (!this.core.express || !this.core.express.Router) {
      this.logger.warn('Express não está disponível no core, pulando registro de rotas');
      return;
    }
    
    const router = this.core.express.Router();
    
    // Rota para upload de XML
    router.post('/upload', this.handleXMLUpload.bind(this));
    
    // Rota para listar arquivos XML
    router.get('/list', this.handleListXMLFiles.bind(this));
    
    // Rota para processar XML
    router.post('/process', this.handleProcessXML.bind(this));
    
    // Registrar rotas no core
    if (this.core.app) {
      this.core.app.use('/api/xml', router);
      this.logger.info('Rotas XML registradas em /api/xml');
    }
  }

  async handleXMLUpload(req, res) {
    try {
      // Implementação do upload será adicionada conforme necessário
      res.json({ message: 'Upload XML endpoint' });
    } catch (error) {
      this.logger.error('Erro no upload XML:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async handleListXMLFiles(req, res) {
    try {
      // Implementação da listagem será adicionada conforme necessário
      res.json({ message: 'List XML files endpoint' });
    } catch (error) {
      this.logger.error('Erro ao listar arquivos XML:', error);
      res.status(500).json({ error: error.message });
    }
  }

  async handleProcessXML(req, res) {
    try {
      // Implementação do processamento será adicionada conforme necessário
      res.json({ message: 'Process XML endpoint' });
    } catch (error) {
      this.logger.error('Erro ao processar XML:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Calcula SHA256 de um arquivo
   */
  async calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  /**
   * Separa código e rótulo de uma string no formato "CODIGO - ROTULO"
   */
  splitCodeLabel(str) {
    if (!str) return { code: '', label: '' };
    
    if (str.includes(' - ')) {
      const [code, ...labelParts] = str.split(' - ');
      return {
        code: code.trim(),
        label: labelParts.join(' - ').trim()
      };
    }
    
    return {
      code: str.trim(),
      label: str.trim()
    };
  }

  /**
   * Ingere todos os XMLs de um diretório
   */
  async ingestDirectory(directoryPath) {
    try {
      if (!fs.existsSync(directoryPath)) {
        throw new Error(`Diretório não encontrado: ${directoryPath}`);
      }

      const stats = {
        files: 0,
        rows: 0,
        definitions: 0,
        ingested: [],
        errors: []
      };

      const files = fs.readdirSync(directoryPath)
        .filter(file => file.toLowerCase().endsWith('.xml'))
        .sort();

      for (const file of files) {
        const filePath = path.join(directoryPath, file);
        try {
          const result = await this.ingestFile(filePath);
          stats.files += 1;
          stats.rows += result.rows || 0;
          stats.definitions += result.definitions || 0;
          stats.ingested.push({ file, ...result });
          
          logger.info(`XML processado: ${file} - ${result.rows} linhas, ${result.definitions} definições`);
        } catch (error) {
          logger.error(`Falha ao processar ${file}:`, error);
          stats.errors.push({ file, error: error.message });
        }
      }

      logger.info(`Ingestão concluída: ${stats.files} arquivos, ${stats.rows} linhas, ${stats.definitions} definições`);
      return stats;
    } catch (error) {
      logger.error('Erro na ingestão do diretório:', error);
      throw error;
    }
  }

  /**
   * Ingere um arquivo XML específico
   */
  async ingestFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      // Calcula hash para deduplicação
      const fileHash = await this.calculateFileHash(filePath);
      const fileName = path.basename(filePath);
      const fileSize = fs.statSync(filePath).size;

      // Verifica se já foi processado
      const existingFile = await IngestFile.findByHash(fileHash);
      if (existingFile && existingFile.filename === filePath) {
        logger.info(`Arquivo sem mudanças: ${fileName}`);
        return {
          rows: existingFile.recordsProcessed,
          definitions: 0,
          skipped: true
        };
      }

      // Cria registro de ingestão
      const ingestFile = new IngestFile({
        filename: fileName,
        filepath: filePath,
        fileHash,
        fileSize,
        status: 'pending'
      });
      await ingestFile.save();
      await ingestFile.markAsProcessing();

      // Parse do XML
      const xmlContent = fs.readFileSync(filePath, 'utf8');
      const xmlData = await this.parser.parseStringPromise(xmlContent);
      
      const result = await this.processXMLData(xmlData, filePath, ingestFile._id);
      
      // Atualiza status
      await ingestFile.markAsCompleted(result.rows);
      
      return result;
    } catch (error) {
      logger.error(`Erro ao processar arquivo ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Processa dados do XML parseado
   */
  async processXMLData(xmlData, filePath, ingestFileId) {
    try {
      // Busca por nós Details (dados tabulares)
      const detailsNodes = this.findDetailsNodes(xmlData);
      
      if (detailsNodes && detailsNodes.length > 0) {
        // Processa como dados de contrato (tipo PainelContratos)
        const rows = await this.processPainelContratosLike(detailsNodes, filePath, ingestFileId);
        return { rows, definitions: 0 };
      } else {
        // Registra como definição de relatório
        const definitions = await this.registerReportDefinition(xmlData, filePath);
        return { rows: 0, definitions: definitions ? 1 : 0 };
      }
    } catch (error) {
      logger.error('Erro no processamento dos dados XML:', error);
      throw error;
    }
  }

  /**
   * Encontra nós Details no XML
   */
  findDetailsNodes(xmlData) {
    const details = [];
    
    const traverse = (obj) => {
      if (typeof obj === 'object' && obj !== null) {
        if (obj.Details) {
          if (Array.isArray(obj.Details)) {
            details.push(...obj.Details);
          } else {
            details.push(obj.Details);
          }
        }
        
        Object.values(obj).forEach(value => {
          if (typeof value === 'object') {
            traverse(value);
          }
        });
      }
    };
    
    traverse(xmlData);
    return details;
  }

  /**
   * Processa dados no formato PainelContratos
   */
  async processPainelContratosLike(detailsNodes, filePath, ingestFileId) {
    try {
      const rows = [];
      const macroSums = new Map();

      for (const detail of detailsNodes) {
        // Tenta vários nomes de atributos
        const classificacao = detail['Classificação_Classificação'] || 
                             detail['Classificacao_Classificacao'] || 
                             detail['@Classificação_Classificação'] ||
                             detail['@Classificacao_Classificacao'];
        
        const contagem = detail['Classificação_Contagem'] || 
                        detail['Classificacao_Contagem'] ||
                        detail['@Classificação_Contagem'] ||
                        detail['@Classificacao_Contagem'];
        
        const classificacaoPai = detail['Classificação_ClassificaçãoPai'] || 
                               detail['Classificacao_ClassificacaoPai'] ||
                               detail['@Classificação_ClassificaçãoPai'] ||
                               detail['@Classificacao_ClassificacaoPai'];

        if (!classificacao) continue;

        const count = parseInt(contagem) || 0;
        const { code, label } = this.splitCodeLabel(classificacao);
        const { code: codigoPai } = this.splitCodeLabel(classificacaoPai || '');
        
        // Determina nível (Pai/Filho) baseado no padrão do código
        const nivel = /^\d+\.\d+/.test(classificacao) ? 'Filho' : 'Pai';

        const rowData = {
          codigo: code,
          rotulo: label,
          codigoPai: codigoPai,
          contagem: count,
          nivel: nivel === 'Pai' ? 0 : 1,
          metadata: {
            fonte: path.basename(filePath),
            dataReferencia: new Date(),
            versao: '1.0'
          },
          ingestFileId,
          status: 'ativo'
        };

        rows.push(rowData);

        // Agrega para macro se for filho
        if (nivel === 'Filho' && classificacaoPai) {
          const currentSum = macroSums.get(classificacaoPai) || 0;
          macroSums.set(classificacaoPai, currentSum + count);
        }
      }

      if (rows.length === 0) {
        return 0;
      }

      // Remove registros anteriores deste arquivo
      await ContratoClassificacao.deleteMany({ 
        'metadata.fonte': path.basename(filePath) 
      });
      await ContratoMacro.deleteMany({ 
        'metadata.fonte': path.basename(filePath) 
      });

      // Insere classificações
      await ContratoClassificacao.insertMany(rows);

      // Insere macros
      if (macroSums.size > 0) {
        const macroRows = [];
        for (const [macro, total] of macroSums) {
          const { code, label } = this.splitCodeLabel(macro);
          macroRows.push({
            codigoMacro: code,
            rotuloMacro: label,
            totalContagem: total,
            metadata: {
              fonte: path.basename(filePath),
              dataReferencia: new Date(),
              versao: '1.0'
            },
            ingestFileId,
            status: 'ativo'
          });
        }
        await ContratoMacro.insertMany(macroRows);
      }

      logger.info(`Processadas ${rows.length} classificações e ${macroSums.size} macros`);
      return rows.length;
    } catch (error) {
      logger.error('Erro no processamento de dados de contrato:', error);
      throw error;
    }
  }

  /**
   * Registra definição de relatório
   */
  async registerReportDefinition(xmlData, filePath) {
    try {
      const root = xmlData[Object.keys(xmlData)[0]] || xmlData;
      
      // Extrai metadados do relatório
      const name = root['@Nome'] || root['@name'] || Object.keys(xmlData)[0];
      const code = root['@Codigo'] || root['@code'] || '';
      
      // Busca interface em Detalhe
      let interfaceType = '';
      const detalhe = this.findInObject(root, 'Detalhe');
      if (detalhe && detalhe['@Interface']) {
        interfaceType = detalhe['@Interface'];
      }

      // Extrai campos de cabeçalho
      const headerFields = this.extractHeaderFields(root);
      
      // Cria ou atualiza definição
      const reportDef = await ReportDefinition.findOneAndUpdate(
        { code },
        {
          name,
          code,
          interface: interfaceType,
          headerFields,
          xmlStructure: {
            rootElement: Object.keys(xmlData)[0],
            dataElement: 'Details',
            headerElement: 'CabecalhoDetalhe'
          },
          category: this.categorizeReport(name, code),
          isActive: true
        },
        { upsert: true, new: true }
      );

      logger.info(`Definição de relatório registrada: ${name} (${code})`);
      return true;
    } catch (error) {
      logger.error('Erro ao registrar definição de relatório:', error);
      return false;
    }
  }

  /**
   * Busca um objeto específico na estrutura XML
   */
  findInObject(obj, key) {
    if (typeof obj !== 'object' || obj === null) return null;
    
    if (obj[key]) return obj[key];
    
    for (const value of Object.values(obj)) {
      if (typeof value === 'object') {
        const found = this.findInObject(value, key);
        if (found) return found;
      }
    }
    
    return null;
  }

  /**
   * Extrai campos de cabeçalho do XML
   */
  extractHeaderFields(root) {
    const fields = [];
    
    const cabecalho = this.findInObject(root, 'CabecalhoDetalhe');
    if (cabecalho) {
      const linhas = this.findInObject(cabecalho, 'Linhas');
      if (linhas) {
        this.traverseForExpressions(linhas, fields);
      }
    }
    
    return fields.map(expr => ({
      name: expr,
      type: 'string',
      required: false
    }));
  }

  /**
   * Percorre estrutura buscando expressões
   */
  traverseForExpressions(obj, fields) {
    if (typeof obj !== 'object' || obj === null) return;
    
    if (obj['@Expressao']) {
      const expr = obj['@Expressao'];
      if (expr && expr.length <= 40 && !expr.startsWith('#')) {
        fields.push(expr.trim());
      }
    }
    
    Object.values(obj).forEach(value => {
      if (typeof value === 'object') {
        this.traverseForExpressions(value, fields);
      }
    });
  }

  /**
   * Categoriza relatório baseado no nome/código
   */
  categorizeReport(name, code) {
    const nameCode = (name + ' ' + code).toLowerCase();
    
    if (nameCode.includes('contrato')) return 'contratos';
    if (nameCode.includes('financeiro') || nameCode.includes('pagamento')) return 'financeiro';
    if (nameCode.includes('operacional') || nameCode.includes('operacao')) return 'operacional';
    if (nameCode.includes('analytics') || nameCode.includes('analise')) return 'analytics';
    
    return 'custom';
  }

  /**
   * Obtém estatísticas de ingestão
   */
  async getIngestStats() {
    try {
      const [fileStats, classificacaoStats, macroStats] = await Promise.all([
        IngestFile.getProcessingStats(),
        ContratoClassificacao.getEstatisticas(),
        ContratoMacro.getResumoGeral()
      ]);

      return {
        files: fileStats,
        classificacoes: classificacaoStats,
        macros: macroStats
      };
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }
}

export default FusioneXMLLoader;