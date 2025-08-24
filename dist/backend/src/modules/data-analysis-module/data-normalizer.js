/**
 * Módulo de Normalização de Dados
 * 
 * Este módulo é responsável por normalizar dados usando dicionários JSON
 * para padronizar nomes de clientes, categorias, polos, riscos, etc.
 */

class DataNormalizer {
  constructor() {
    this.dictionaries = {
      clientes: new Map(),
      categorias: new Map(),
      polos: new Map(),
      riscos: new Map(),
      custom: new Map()
    };
    
    this.normalizationStats = {
      totalNormalizations: 0,
      byType: {
        clientes: 0,
        categorias: 0,
        polos: 0,
        riscos: 0,
        custom: 0
      },
      unmatchedValues: new Set()
    };
  }

  /**
   * Carrega dicionários a partir de arquivos JSON
   * @param {Object} dictionaries - Objeto contendo os dicionários por tipo
   */
  loadDictionaries(dictionaries) {
    try {
      Object.entries(dictionaries).forEach(([type, dictionary]) => {
        if (this.dictionaries.has(type)) {
          this.dictionaries.set(type, new Map());
        } else {
          this.dictionaries.set(type, new Map());
        }
        
        const typeMap = this.dictionaries.get(type);
        
        // Suporta diferentes formatos de dicionário
        if (Array.isArray(dictionary)) {
          // Formato: [{"original": "valor1", "normalized": "Valor Normalizado"}, ...]
          dictionary.forEach(entry => {
            if (entry.original && entry.normalized) {
              typeMap.set(this.normalizeKey(entry.original), entry.normalized);
            }
          });
        } else if (typeof dictionary === 'object') {
          // Formato: {"valor1": "Valor Normalizado", "valor2": "Outro Valor", ...}
          Object.entries(dictionary).forEach(([original, normalized]) => {
            typeMap.set(this.normalizeKey(original), normalized);
          });
        }
      });
      
      console.log('Dicionários carregados:', {
        clientes: this.dictionaries.get('clientes')?.size || 0,
        categorias: this.dictionaries.get('categorias')?.size || 0,
        polos: this.dictionaries.get('polos')?.size || 0,
        riscos: this.dictionaries.get('riscos')?.size || 0,
        custom: this.dictionaries.get('custom')?.size || 0
      });
      
    } catch (error) {
      console.error('Erro ao carregar dicionários:', error);
      throw new Error('Falha ao carregar dicionários de normalização');
    }
  }

  /**
   * Identifica o tipo de dicionário baseado no nome do arquivo ou conteúdo
   * @param {string} filename - Nome do arquivo
   * @param {Object} content - Conteúdo do arquivo JSON
   * @returns {string} - Tipo identificado
   */
  identifyDictionaryType(filename, content) {
    const lowerFilename = filename.toLowerCase();
    
    // Identificação por nome do arquivo
    if (lowerFilename.includes('cliente')) return 'clientes';
    if (lowerFilename.includes('categoria')) return 'categorias';
    if (lowerFilename.includes('polo')) return 'polos';
    if (lowerFilename.includes('risco')) return 'riscos';
    
    // Identificação por conteúdo (chaves mais comuns)
    if (content && typeof content === 'object') {
      const keys = Object.keys(content);
      const sampleKeys = keys.slice(0, 5).join(' ').toLowerCase();
      
      if (sampleKeys.includes('cliente') || sampleKeys.includes('empresa')) return 'clientes';
      if (sampleKeys.includes('categoria') || sampleKeys.includes('tipo')) return 'categorias';
      if (sampleKeys.includes('polo') || sampleKeys.includes('regional')) return 'polos';
      if (sampleKeys.includes('risco') || sampleKeys.includes('rating')) return 'riscos';
    }
    
    return 'custom';
  }

  /**
   * Normaliza uma chave para busca (remove acentos, espaços, etc.)
   * @param {string} key - Chave a ser normalizada
   * @returns {string} - Chave normalizada
   */
  normalizeKey(key) {
    if (!key || typeof key !== 'string') return '';
    
    return key
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '') // Remove caracteres especiais
      .trim();
  }

  /**
   * Normaliza um valor usando os dicionários carregados
   * @param {string} value - Valor a ser normalizado
   * @param {string} type - Tipo de normalização (clientes, categorias, etc.)
   * @returns {Object} - Resultado da normalização
   */
  normalizeValue(value, type = 'auto') {
    if (!value || typeof value !== 'string') {
      return {
        original: value,
        normalized: value,
        wasNormalized: false,
        confidence: 0,
        type: null
      };
    }

    const normalizedKey = this.normalizeKey(value);
    let result = {
      original: value,
      normalized: value,
      wasNormalized: false,
      confidence: 0,
      type: null
    };

    // Se tipo específico foi fornecido
    if (type !== 'auto' && this.dictionaries.has(type)) {
      const dictionary = this.dictionaries.get(type);
      if (dictionary.has(normalizedKey)) {
        result = {
          original: value,
          normalized: dictionary.get(normalizedKey),
          wasNormalized: true,
          confidence: 1.0,
          type: type
        };
        this.normalizationStats.totalNormalizations++;
        this.normalizationStats.byType[type]++;
        return result;
      }
    }

    // Busca automática em todos os dicionários
    if (type === 'auto') {
      for (const [dictType, dictionary] of this.dictionaries.entries()) {
        if (dictionary.has(normalizedKey)) {
          result = {
            original: value,
            normalized: dictionary.get(normalizedKey),
            wasNormalized: true,
            confidence: 1.0,
            type: dictType
          };
          this.normalizationStats.totalNormalizations++;
          this.normalizationStats.byType[dictType]++;
          return result;
        }
      }
      
      // Busca fuzzy (similaridade)
      const fuzzyResult = this.findSimilarValue(normalizedKey);
      if (fuzzyResult.confidence > 0.8) {
        result = {
          original: value,
          normalized: fuzzyResult.normalized,
          wasNormalized: true,
          confidence: fuzzyResult.confidence,
          type: fuzzyResult.type
        };
        this.normalizationStats.totalNormalizations++;
        this.normalizationStats.byType[fuzzyResult.type]++;
        return result;
      }
    }

    // Valor não encontrado
    this.normalizationStats.unmatchedValues.add(value);
    return result;
  }

  /**
   * Busca valores similares usando algoritmo de similaridade
   * @param {string} normalizedKey - Chave normalizada para busca
   * @returns {Object} - Melhor match encontrado
   */
  findSimilarValue(normalizedKey) {
    let bestMatch = {
      normalized: null,
      confidence: 0,
      type: null
    };

    for (const [dictType, dictionary] of this.dictionaries.entries()) {
      for (const [key, value] of dictionary.entries()) {
        const similarity = this.calculateSimilarity(normalizedKey, key);
        if (similarity > bestMatch.confidence) {
          bestMatch = {
            normalized: value,
            confidence: similarity,
            type: dictType
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calcula similaridade entre duas strings usando distância de Levenshtein
   * @param {string} str1 - Primeira string
   * @param {string} str2 - Segunda string
   * @returns {number} - Índice de similaridade (0-1)
   */
  calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0;

    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1.0;

    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calcula distância de Levenshtein entre duas strings
   * @param {string} str1 - Primeira string
   * @param {string} str2 - Segunda string
   * @returns {number} - Distância de Levenshtein
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Normaliza um dataset completo
   * @param {Array} data - Array de objetos a serem normalizados
   * @param {Object} fieldMapping - Mapeamento de campos para tipos de normalização
   * @returns {Object} - Dataset normalizado e estatísticas
   */
  normalizeDataset(data, fieldMapping = {}) {
    if (!Array.isArray(data)) {
      throw new Error('Dataset deve ser um array');
    }

    const normalizedData = [];
    const normalizationLog = [];

    data.forEach((record, index) => {
      const normalizedRecord = { ...record };
      const recordLog = {
        index,
        normalizations: []
      };

      // Normalizar campos específicos
      Object.entries(fieldMapping).forEach(([field, type]) => {
        if (record[field]) {
          const result = this.normalizeValue(record[field], type);
          normalizedRecord[field] = result.normalized;
          
          if (result.wasNormalized) {
            recordLog.normalizations.push({
              field,
              original: result.original,
              normalized: result.normalized,
              confidence: result.confidence,
              type: result.type
            });
          }
        }
      });

      // Auto-normalização para campos não mapeados
      Object.keys(record).forEach(field => {
        if (!fieldMapping[field] && typeof record[field] === 'string') {
          const result = this.normalizeValue(record[field], 'auto');
          if (result.wasNormalized && result.confidence > 0.9) {
            normalizedRecord[field] = result.normalized;
            recordLog.normalizations.push({
              field,
              original: result.original,
              normalized: result.normalized,
              confidence: result.confidence,
              type: result.type
            });
          }
        }
      });

      normalizedData.push(normalizedRecord);
      if (recordLog.normalizations.length > 0) {
        normalizationLog.push(recordLog);
      }
    });

    return {
      data: normalizedData,
      log: normalizationLog,
      stats: this.getStats()
    };
  }

  /**
   * Retorna estatísticas de normalização
   * @returns {Object} - Estatísticas detalhadas
   */
  getStats() {
    return {
      ...this.normalizationStats,
      unmatchedValues: Array.from(this.normalizationStats.unmatchedValues),
      dictionarySizes: {
        clientes: this.dictionaries.get('clientes')?.size || 0,
        categorias: this.dictionaries.get('categorias')?.size || 0,
        polos: this.dictionaries.get('polos')?.size || 0,
        riscos: this.dictionaries.get('riscos')?.size || 0,
        custom: this.dictionaries.get('custom')?.size || 0
      }
    };
  }

  /**
   * Reseta as estatísticas de normalização
   */
  resetStats() {
    this.normalizationStats = {
      totalNormalizations: 0,
      byType: {
        clientes: 0,
        categorias: 0,
        polos: 0,
        riscos: 0,
        custom: 0
      },
      unmatchedValues: new Set()
    };
  }

  /**
   * Adiciona um novo mapeamento ao dicionário
   * @param {string} type - Tipo do dicionário
   * @param {string} original - Valor original
   * @param {string} normalized - Valor normalizado
   */
  addMapping(type, original, normalized) {
    if (!this.dictionaries.has(type)) {
      this.dictionaries.set(type, new Map());
    }
    
    const dictionary = this.dictionaries.get(type);
    dictionary.set(this.normalizeKey(original), normalized);
  }

  /**
   * Remove um mapeamento do dicionário
   * @param {string} type - Tipo do dicionário
   * @param {string} original - Valor original a ser removido
   */
  removeMapping(type, original) {
    if (this.dictionaries.has(type)) {
      const dictionary = this.dictionaries.get(type);
      dictionary.delete(this.normalizeKey(original));
    }
  }

  /**
   * Exporta os dicionários atuais
   * @returns {Object} - Dicionários em formato JSON
   */
  exportDictionaries() {
    const exported = {};
    
    for (const [type, dictionary] of this.dictionaries.entries()) {
      exported[type] = {};
      for (const [key, value] of dictionary.entries()) {
        exported[type][key] = value;
      }
    }
    
    return exported;
  }
}

export default DataNormalizer;