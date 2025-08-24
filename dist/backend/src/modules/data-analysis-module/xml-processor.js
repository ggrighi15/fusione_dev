import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import xml2js from 'xml2js';

class XMLProcessor {
  constructor(logger) {
    this.logger = logger;
    this.parser = new xml2js.Parser({
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true
    });
  }

  async processXMLFile(filePath) {
    try {
      this.logger.info(`Processando arquivo XML: ${filePath}`);
      
      const xmlContent = fs.readFileSync(filePath, 'utf8');
      const result = await this.parser.parseStringPromise(xmlContent);
      
      const extractedData = {
        metadata: this.extractMetadata(result, filePath),
        tabularData: this.extractTabularData(result),
        reportDefinition: this.extractReportDefinition(result),
        rawStructure: this.analyzeStructure(result)
      };
      
      this.logger.info(`XML processado com sucesso: ${extractedData.tabularData.length} registros extraídos`);
      
      return extractedData;
    } catch (error) {
      this.logger.error(`Erro ao processar XML ${filePath}:`, error);
      throw error;
    }
  }

  extractMetadata(xmlData, filePath) {
    const metadata = {
      sourceFile: path.basename(filePath),
      fileHash: this.calculateFileHash(filePath),
      processedAt: new Date().toISOString(),
      rootElement: null,
      attributes: {},
      namespaces: [],
      encoding: 'UTF-8'
    };

    // Extrair elemento raiz
    const rootKeys = Object.keys(xmlData);
    if (rootKeys.length > 0) {
      metadata.rootElement = rootKeys[0];
      const rootData = xmlData[rootKeys[0]];
      
      // Extrair atributos do elemento raiz
      if (typeof rootData === 'object' && rootData !== null) {
        Object.keys(rootData).forEach(key => {
          if (key.startsWith('$') || key.includes(':')) {
            metadata.attributes[key] = rootData[key];
          }
        });
      }
    }

    return metadata;
  }

  extractTabularData(xmlData) {
    const tabularData = [];
    
    // Procurar por elementos que contenham dados tabulares
    this.findTabularElements(xmlData, tabularData);
    
    return tabularData;
  }

  findTabularElements(obj, tabularData, parentPath = '') {
    if (!obj || typeof obj !== 'object') return;

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      
      // Se é um array, pode conter dados tabulares
      if (Array.isArray(value)) {
        if (value.length > 0 && this.isTabularArray(value)) {
          const tableData = this.normalizeTabularArray(value, currentPath);
          tabularData.push({
            tableName: key,
            path: currentPath,
            records: tableData,
            recordCount: tableData.length
          });
        }
      }
      // Se é um objeto, continuar a busca recursiva
      else if (typeof value === 'object' && value !== null) {
        this.findTabularElements(value, tabularData, currentPath);
      }
    });
  }

  isTabularArray(array) {
    // Verificar se o array contém objetos similares (dados tabulares)
    if (array.length < 2) return false;
    
    const firstItem = array[0];
    if (typeof firstItem !== 'object' || firstItem === null) return false;
    
    const firstKeys = Object.keys(firstItem).filter(k => !k.startsWith('$'));
    if (firstKeys.length < 2) return false;
    
    // Verificar se outros itens têm estrutura similar
    const similarItems = array.slice(1, Math.min(5, array.length)).every(item => {
      if (typeof item !== 'object' || item === null) return false;
      const itemKeys = Object.keys(item).filter(k => !k.startsWith('$'));
      return itemKeys.some(key => firstKeys.includes(key));
    });
    
    return similarItems;
  }

  normalizeTabularArray(array, tableName) {
    return array.map((item, index) => {
      const record = {
        _rowIndex: index,
        _tableName: tableName
      };
      
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => {
          if (!key.startsWith('$')) {
            record[key] = this.normalizeValue(item[key]);
          }
        });
      } else {
        record.value = this.normalizeValue(item);
      }
      
      return record;
    });
  }

  normalizeValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
      // Tentar converter números
      if (/^\d+$/.test(value)) return parseInt(value, 10);
      if (/^\d*\.\d+$/.test(value)) return parseFloat(value);
      // Tentar converter datas
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date.toISOString();
      }
      return value.trim();
    }
    if (typeof value === 'object' && value !== null) {
      // Se é um objeto simples com apenas texto, extrair o texto
      const keys = Object.keys(value).filter(k => !k.startsWith('$'));
      if (keys.length === 0 && value._) return this.normalizeValue(value._);
      if (keys.length === 1) return this.normalizeValue(value[keys[0]]);
      return JSON.stringify(value);
    }
    return value;
  }

  extractReportDefinition(xmlData) {
    const definition = {
      reportType: null,
      interface: null,
      codigo: null,
      headerFields: {},
      parameters: {},
      structure: {}
    };

    // Extrair informações de definição do relatório
    this.extractDefinitionInfo(xmlData, definition);
    
    return definition;
  }

  extractDefinitionInfo(obj, definition, path = '') {
    if (!obj || typeof obj !== 'object') return;

    Object.keys(obj).forEach(key => {
      const value = obj[key];
      const lowerKey = key.toLowerCase();
      
      // Procurar por campos de definição comuns
      if (lowerKey.includes('codigo') || lowerKey.includes('code')) {
        definition.codigo = this.normalizeValue(value);
      }
      else if (lowerKey.includes('interface') || lowerKey.includes('tipo')) {
        definition.interface = this.normalizeValue(value);
      }
      else if (lowerKey.includes('relatorio') || lowerKey.includes('report')) {
        definition.reportType = this.normalizeValue(value);
      }
      else if (lowerKey.includes('parametro') || lowerKey.includes('parameter')) {
        definition.parameters[key] = this.normalizeValue(value);
      }
      else if (typeof value === 'string' && value.length < 200) {
        definition.headerFields[key] = this.normalizeValue(value);
      }
      else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.extractDefinitionInfo(value, definition, path ? `${path}.${key}` : key);
      }
    });
  }

  analyzeStructure(xmlData) {
    const structure = {
      elements: {},
      depth: 0,
      totalElements: 0,
      arrayElements: [],
      textElements: [],
      attributeElements: []
    };

    this.analyzeElementStructure(xmlData, structure, 0);
    
    return structure;
  }

  analyzeElementStructure(obj, structure, depth) {
    if (!obj || typeof obj !== 'object') return;
    
    structure.depth = Math.max(structure.depth, depth);
    
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      structure.totalElements++;
      
      if (!structure.elements[key]) {
        structure.elements[key] = {
          count: 0,
          types: new Set(),
          isArray: false,
          hasAttributes: false,
          depth: depth
        };
      }
      
      structure.elements[key].count++;
      
      if (Array.isArray(value)) {
        structure.elements[key].isArray = true;
        structure.elements[key].types.add('array');
        structure.arrayElements.push(key);
        
        if (value.length > 0) {
          this.analyzeElementStructure(value[0], structure, depth + 1);
        }
      }
      else if (typeof value === 'object' && value !== null) {
        structure.elements[key].types.add('object');
        
        // Verificar atributos
        const hasAttrs = Object.keys(value).some(k => k.startsWith('$'));
        if (hasAttrs) {
          structure.elements[key].hasAttributes = true;
          structure.attributeElements.push(key);
        }
        
        this.analyzeElementStructure(value, structure, depth + 1);
      }
      else {
        structure.elements[key].types.add(typeof value);
        if (typeof value === 'string') {
          structure.textElements.push(key);
        }
      }
    });
  }

  calculateFileHash(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      this.logger.error(`Erro ao calcular hash do arquivo ${filePath}:`, error);
      return null;
    }
  }

  // Método para processar múltiplos arquivos XML
  async processMultipleXMLFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      try {
        const result = await this.processXMLFile(filePath);
        results.push({
          filePath,
          success: true,
          data: result
        });
      } catch (error) {
        results.push({
          filePath,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  // Método para extrair dados específicos baseado em padrões
  extractDataByPattern(xmlData, patterns) {
    const extractedData = {};
    
    patterns.forEach(pattern => {
      const data = this.findDataByPath(xmlData, pattern.path);
      if (data) {
        extractedData[pattern.name] = {
          data,
          pattern: pattern.path,
          type: pattern.type || 'auto'
        };
      }
    });
    
    return extractedData;
  }

  findDataByPath(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return null;
      }
    }
    
    return current;
  }

  // Método para gerar relatório de análise XML
  generateXMLAnalysisReport(processedData) {
    const report = {
      summary: {
        totalFiles: processedData.length,
        successfulFiles: processedData.filter(p => p.success).length,
        failedFiles: processedData.filter(p => !p.success).length,
        totalRecords: 0,
        totalTables: 0
      },
      fileDetails: [],
      structureAnalysis: {
        commonElements: {},
        uniqueElements: {},
        dataPatterns: []
      }
    };

    processedData.forEach(fileData => {
      if (fileData.success) {
        const data = fileData.data;
        const fileDetail = {
          fileName: path.basename(fileData.filePath),
          metadata: data.metadata,
          tablesFound: data.tabularData.length,
          recordsFound: data.tabularData.reduce((sum, table) => sum + table.recordCount, 0),
          reportDefinition: data.reportDefinition,
          structure: data.rawStructure
        };
        
        report.fileDetails.push(fileDetail);
        report.summary.totalRecords += fileDetail.recordsFound;
        report.summary.totalTables += fileDetail.tablesFound;
        
        // Analisar elementos comuns
        Object.keys(data.rawStructure.elements).forEach(element => {
          if (!report.structureAnalysis.commonElements[element]) {
            report.structureAnalysis.commonElements[element] = 0;
          }
          report.structureAnalysis.commonElements[element]++;
        });
      }
    });
    
    return report;
  }
}

export default XMLProcessor;