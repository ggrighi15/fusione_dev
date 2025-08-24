import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../../core/logger.js';
import config from './config.js';

const logger = createLogger('XMLLoaderUtils');

/**
 * Utilitários para o módulo XML Loader
 */
class XMLLoaderUtils {
  /**
   * Valida se um caminho é seguro e permitido
   */
  static validatePath(filePath) {
    try {
      const resolvedPath = path.resolve(filePath);
      
      // Verificar se o caminho está dentro dos diretórios permitidos
      const isAllowed = config.allowedDirectories.some(allowedDir => 
        resolvedPath.startsWith(path.resolve(allowedDir))
      );
      
      if (!isAllowed) {
        return {
          isValid: false,
          error: 'Caminho não permitido por questões de segurança'
        };
      }
      
      // Verificar padrões bloqueados
      const hasBlockedPattern = config.security.blockedPatterns.some(pattern => 
        pattern.test(filePath)
      );
      
      if (hasBlockedPattern) {
        return {
          isValid: false,
          error: 'Caminho contém caracteres não permitidos'
        };
      }
      
      // Verificar comprimento do caminho
      if (filePath.length > config.security.maxPathLength) {
        return {
          isValid: false,
          error: 'Caminho muito longo'
        };
      }
      
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Erro na validação do caminho: ${error.message}`
      };
    }
  }
  
  /**
   * Valida se um arquivo XML é válido
   */
  static async validateXMLFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          isValid: false,
          error: 'Arquivo não encontrado'
        };
      }
      
      const stats = fs.statSync(filePath);
      
      // Verificar tamanho do arquivo
      if (stats.size > config.validation.maxXMLSize) {
        return {
          isValid: false,
          error: 'Arquivo muito grande'
        };
      }
      
      // Verificar extensão
      const ext = path.extname(filePath).toLowerCase();
      if (!config.upload.allowedExtensions.includes(ext)) {
        return {
          isValid: false,
          error: 'Extensão de arquivo não permitida'
        };
      }
      
      // Tentar fazer parse do XML
      const xmlContent = fs.readFileSync(filePath, 'utf8');
      const parser = new xml2js.Parser({ explicitArray: false });
      
      try {
        await parser.parseStringPromise(xmlContent);
      } catch (parseError) {
        return {
          isValid: false,
          error: `XML inválido: ${parseError.message}`
        };
      }
      
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Erro na validação: ${error.message}`
      };
    }
  }
  
  /**
   * Calcula hash SHA256 de um arquivo
   */
  static async calculateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
  
  /**
   * Separa código e rótulo de uma string
   */
  static splitCodeLabel(str) {
    if (!str || typeof str !== 'string') {
      return { code: '', label: '' };
    }
    
    const cleanStr = str.trim();
    
    // Padrões comuns de separação
    const separators = [' - ', ' – ', ' — ', ': ', ' | '];
    
    for (const separator of separators) {
      if (cleanStr.includes(separator)) {
        const [code, ...labelParts] = cleanStr.split(separator);
        return {
          code: code.trim(),
          label: labelParts.join(separator).trim()
        };
      }
    }
    
    // Se não encontrou separador, usar a string inteira
    return {
      code: cleanStr,
      label: cleanStr
    };
  }
  
  /**
   * Extrai valor de campo usando múltiplos nomes possíveis
   */
  static extractFieldValue(obj, fieldNames) {
    if (!obj || typeof obj !== 'object') {
      return null;
    }
    
    for (const fieldName of fieldNames) {
      if (obj[fieldName] !== undefined && obj[fieldName] !== null) {
        return obj[fieldName];
      }
    }
    
    return null;
  }
  
  /**
   * Busca nós específicos na estrutura XML
   */
  static findNodesInXML(xmlData, nodeName) {
    const nodes = [];
    
    const traverse = (obj, currentPath = []) => {
      if (typeof obj === 'object' && obj !== null) {
        // Verificar se o objeto atual é o nó procurado
        if (currentPath[currentPath.length - 1] === nodeName) {
          nodes.push(obj);
          return;
        }
        
        // Continuar busca nos filhos
        Object.entries(obj).forEach(([key, value]) => {
          if (key === nodeName) {
            if (Array.isArray(value)) {
              nodes.push(...value);
            } else {
              nodes.push(value);
            }
          } else if (typeof value === 'object') {
            traverse(value, [...currentPath, key]);
          }
        });
      }
    };
    
    traverse(xmlData);
    return nodes;
  }
  
  /**
   * Normaliza dados de classificação
   */
  static normalizeClassificacao(data) {
    const classificacao = this.extractFieldValue(data, config.fieldMappings.classificacao);
    const contagem = this.extractFieldValue(data, config.fieldMappings.contagem);
    const classificacaoPai = this.extractFieldValue(data, config.fieldMappings.classificacaoPai);
    
    if (!classificacao) {
      return null;
    }
    
    const { code, label } = this.splitCodeLabel(classificacao);
    const { code: codigoPai } = this.splitCodeLabel(classificacaoPai || '');
    
    // Determinar nível baseado no padrão do código
    let nivel = 0;
    if (/^\d+\.\d+/.test(code) || codigoPai) {
      nivel = 1; // Filho
    }
    
    return {
      codigo: code,
      rotulo: label,
      codigoPai: codigoPai || null,
      contagem: parseInt(contagem) || 0,
      nivel,
      classificacaoOriginal: classificacao,
      classificacaoPaiOriginal: classificacaoPai || null
    };
  }
  
  /**
   * Gera estatísticas de processamento
   */
  static generateProcessingStats(results) {
    const stats = {
      total: results.length,
      successful: 0,
      failed: 0,
      totalRows: 0,
      totalDefinitions: 0,
      errors: [],
      processingTime: 0
    };
    
    results.forEach(result => {
      if (result.success) {
        stats.successful++;
        stats.totalRows += result.rows || 0;
        stats.totalDefinitions += result.definitions || 0;
      } else {
        stats.failed++;
        stats.errors.push({
          file: result.filename,
          error: result.error
        });
      }
    });
    
    return stats;
  }
  
  /**
   * Limpa arquivos temporários antigos
   */
  static async cleanupTempFiles(maxAge = 24 * 60 * 60 * 1000) { // 24 horas
    try {
      const tempDir = config.upload.tempDirectory;
      
      if (!fs.existsSync(tempDir)) {
        return { cleaned: 0 };
      }
      
      const files = fs.readdirSync(tempDir);
      let cleaned = 0;
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);
        
        if (Date.now() - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      }
      
      logger.info(`Limpeza de arquivos temporários: ${cleaned} arquivos removidos`);
      return { cleaned };
    } catch (error) {
      logger.error('Erro na limpeza de arquivos temporários:', error);
      throw error;
    }
  }
  
  /**
   * Converte dados para formato CSV
   */
  static convertToCSV(data, headers = null) {
    if (!data || data.length === 0) {
      return '';
    }
    
    // Se headers não fornecidos, extrair do primeiro objeto
    if (!headers) {
      headers = Object.keys(data[0]).filter(key => 
        !key.startsWith('_') && 
        key !== '__v' && 
        typeof data[0][key] !== 'object'
      );
    }
    
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => 
      headers.map(header => {
        let value = row[header];
        
        // Tratar valores especiais
        if (value === null || value === undefined) {
          value = '';
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        } else if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }
  
  /**
   * Valida estrutura de dados de classificação
   */
  static validateClassificacaoData(data) {
    const errors = [];
    
    if (!data.codigo) {
      errors.push('Código é obrigatório');
    }
    
    if (!data.rotulo) {
      errors.push('Rótulo é obrigatório');
    }
    
    if (typeof data.contagem !== 'number' || data.contagem < 0) {
      errors.push('Contagem deve ser um número não negativo');
    }
    
    if (data.nivel !== 0 && data.nivel !== 1) {
      errors.push('Nível deve ser 0 (pai) ou 1 (filho)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Formata bytes para formato legível
   */
  static formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  /**
   * Gera ID único para processamento
   */
  static generateProcessingId() {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default XMLLoaderUtils;