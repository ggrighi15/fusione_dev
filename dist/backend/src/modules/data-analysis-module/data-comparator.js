class DataComparator {
  constructor(logger) {
    this.logger = logger;
    this.comparisonStrategies = {
      'excel-excel': this.compareExcelFiles.bind(this),
      'json-json': this.compareJsonFiles.bind(this),
      'xml-xml': this.compareXmlFiles.bind(this),
      'mixed': this.compareMixedFiles.bind(this)
    };
  }

  /**
   * Compara múltiplos datasets de diferentes tipos e identifica diferenças
   * @param {Array} datasets - Array de datasets com diferentes tipos
   * @param {Object} options - Opções de comparação
   * @returns {Object} Resultado da comparação
   */
  async compareDatasets(datasets, options = {}) {
    try {
      this.logger.info(`Iniciando comparação de ${datasets.length} datasets`);
      
      if (!datasets || datasets.length < 2) {
        throw new Error('Pelo menos 2 datasets são necessários para comparação');
      }

      // Determinar estratégia de comparação baseada nos tipos de arquivo
      const fileTypes = datasets.map(d => d.type || 'unknown');
      const strategy = this.determineComparisonStrategy(fileTypes);
      
      const comparison = {
        summary: {
          totalDatasets: datasets.length,
          fileTypes: fileTypes,
          comparisonStrategy: strategy,
          comparisonType: options.type || 'full',
          timestamp: new Date().toISOString()
        },
        datasets: datasets.map(d => this.getDatasetSummary(d)),
        comparisons: [],
        differences: [],
        similarities: [],
        crossAnalysis: {},
        statistics: {}
      };

      // Executar comparação baseada na estratégia
      if (strategy === 'mixed') {
        comparison.crossAnalysis = await this.performCrossTypeAnalysis(datasets, options);
      }

      // Comparar cada par de datasets
      for (let i = 0; i < datasets.length; i++) {
        for (let j = i + 1; j < datasets.length; j++) {
          const pairComparison = await this.comparePair(
            datasets[i], 
            datasets[j], 
            options
          );
          
          comparison.comparisons.push(pairComparison);
          comparison.differences.push(...pairComparison.differences);
          comparison.similarities.push(...pairComparison.similarities);
        }
      }

      // Análise de padrões globais
      comparison.globalPatterns = this.analyzeGlobalPatterns(datasets);
      
      // Calcular estatísticas gerais
      comparison.statistics = this.calculateStatistics(comparison);
      
      this.logger.info('Comparação de datasets concluída');
      return comparison;
    } catch (error) {
      this.logger.error('Erro na comparação de datasets:', error);
      throw error;
    }
  }

  /**
   * Compara dois datasets individuais (método legado mantido para compatibilidade)
   * @param {Array} dataset1 - Dataset do primeiro período
   * @param {Array} dataset2 - Dataset do segundo período
   * @param {Object} options - Opções de comparação
   * @returns {Object} Resultado da comparação
   */
  compareTwoDatasets(dataset1, dataset2, options = {}) {
    const startTime = Date.now();
    
    this.logger.info('Iniciando comparação de datasets...');
    this.logger.info(`Dataset 1: ${dataset1.length} registros`);
    this.logger.info(`Dataset 2: ${dataset2.length} registros`);
    
    // Configurações padrão
    const config = {
      keyField: options.keyField || 'Pasta',
      compareFields: options.compareFields || null, // null = comparar todos os campos
      numericThreshold: options.numericThreshold || 0.01,
      ignoreCase: options.ignoreCase !== false,
      trimStrings: options.trimStrings !== false,
      ...options
    };
    
    // Criar índices para comparação eficiente
    const index1 = this.createIndex(dataset1, config.keyField);
    const index2 = this.createIndex(dataset2, config.keyField);
    
    // Realizar comparação
    const comparison = this.performComparison(index1, index2, config);
    
    // Calcular estatísticas
    const stats = this.calculateStatistics(comparison, dataset1.length, dataset2.length);
    
    const endTime = Date.now();
    this.logger.info(`Comparação concluída em ${endTime - startTime}ms`);
    
    return {
      config,
      comparison,
      statistics: stats,
      metadata: {
        comparisonTime: endTime - startTime,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Cria índice para acesso rápido aos registros
   */
  createIndex(dataset, keyField) {
    const index = {
      byKey: {},
      keys: new Set(),
      duplicateKeys: new Set()
    };
    
    dataset.forEach((record, originalIndex) => {
      const key = this.extractKey(record, keyField);
      
      if (key === null || key === undefined) {
        this.logger.warn(`Registro sem chave válida no índice ${originalIndex}:`, record);
        return;
      }
      
      const normalizedKey = this.normalizeKey(key);
      
      if (index.byKey[normalizedKey]) {
        // Chave duplicada
        index.duplicateKeys.add(normalizedKey);
        if (!Array.isArray(index.byKey[normalizedKey])) {
          index.byKey[normalizedKey] = [index.byKey[normalizedKey]];
        }
        index.byKey[normalizedKey].push({ ...record, _originalIndex: originalIndex });
      } else {
        index.byKey[normalizedKey] = { ...record, _originalIndex: originalIndex };
        index.keys.add(normalizedKey);
      }
    });
    
    if (index.duplicateKeys.size > 0) {
      this.logger.warn(`Encontradas ${index.duplicateKeys.size} chaves duplicadas`);
    }
    
    return index;
  }

  /**
   * Extrai a chave de um registro
   */
  extractKey(record, keyField) {
    if (Array.isArray(keyField)) {
      // Chave composta
      return keyField.map(field => record[field]).join('|');
    }
    
    return record[keyField];
  }

  /**
   * Normaliza uma chave para comparação
   */
  normalizeKey(key) {
    if (key === null || key === undefined) {
      return null;
    }
    
    return String(key).trim().toLowerCase();
  }

  /**
   * Realiza a comparação entre os índices
   */
  performComparison(index1, index2, config) {
    const comparison = {
      newRecords: [],
      removedRecords: [],
      modifiedRecords: [],
      unchangedRecords: [],
      duplicateHandling: {
        dataset1Duplicates: Array.from(index1.duplicateKeys),
        dataset2Duplicates: Array.from(index2.duplicateKeys)
      }
    };
    
    const allKeys = new Set([...index1.keys, ...index2.keys]);
    
    for (const key of allKeys) {
      const record1 = index1.byKey[key];
      const record2 = index2.byKey[key];
      
      if (!record1 && record2) {
        // Novo registro
        this.handleNewRecord(comparison, key, record2);
      } else if (record1 && !record2) {
        // Registro removido
        this.handleRemovedRecord(comparison, key, record1);
      } else if (record1 && record2) {
        // Registro existe em ambos - verificar modificações
        this.handleExistingRecord(comparison, key, record1, record2, config);
      }
    }
    
    return comparison;
  }

  /**
   * Processa novo registro
   */
  handleNewRecord(comparison, key, record2) {
    if (Array.isArray(record2)) {
      // Múltiplos registros com a mesma chave
      record2.forEach(rec => {
        comparison.newRecords.push({
          key,
          record: this.cleanRecord(rec),
          type: 'new',
          isDuplicate: true
        });
      });
    } else {
      comparison.newRecords.push({
        key,
        record: this.cleanRecord(record2),
        type: 'new',
        isDuplicate: false
      });
    }
  }

  /**
   * Processa registro removido
   */
  handleRemovedRecord(comparison, key, record1) {
    if (Array.isArray(record1)) {
      // Múltiplos registros com a mesma chave
      record1.forEach(rec => {
        comparison.removedRecords.push({
          key,
          record: this.cleanRecord(rec),
          type: 'removed',
          isDuplicate: true
        });
      });
    } else {
      comparison.removedRecords.push({
        key,
        record: this.cleanRecord(record1),
        type: 'removed',
        isDuplicate: false
      });
    }
  }

  /**
   * Processa registro existente em ambos datasets
   */
  handleExistingRecord(comparison, key, record1, record2, config) {
    // Lidar com duplicatas
    if (Array.isArray(record1) || Array.isArray(record2)) {
      this.handleDuplicateComparison(comparison, key, record1, record2, config);
      return;
    }
    
    // Comparação simples
    const differences = this.compareRecords(record1, record2, config);
    
    if (differences.length > 0) {
      comparison.modifiedRecords.push({
        key,
        record1: this.cleanRecord(record1),
        record2: this.cleanRecord(record2),
        differences,
        type: 'modified'
      });
    } else {
      comparison.unchangedRecords.push({
        key,
        record: this.cleanRecord(record1),
        type: 'unchanged'
      });
    }
  }

  /**
   * Lida com comparação de registros duplicados
   */
  handleDuplicateComparison(comparison, key, record1, record2, config) {
    const records1 = Array.isArray(record1) ? record1 : [record1];
    const records2 = Array.isArray(record2) ? record2 : [record2];
    
    // Estratégia: comparar o primeiro registro de cada conjunto
    // e marcar como modificado se houver diferenças
    const differences = this.compareRecords(records1[0], records2[0], config);
    
    comparison.modifiedRecords.push({
      key,
      record1: this.cleanRecord(records1[0]),
      record2: this.cleanRecord(records2[0]),
      differences,
      type: 'modified_duplicate',
      duplicateInfo: {
        dataset1Count: records1.length,
        dataset2Count: records2.length,
        allRecords1: records1.map(r => this.cleanRecord(r)),
        allRecords2: records2.map(r => this.cleanRecord(r))
      }
    });
  }

  /**
   * Compara dois registros individuais
   */
  compareRecords(record1, record2, config) {
    const differences = [];
    
    // Determinar campos a comparar
    const fieldsToCompare = config.compareFields || 
      this.getAllFields(record1, record2);
    
    for (const field of fieldsToCompare) {
      // Pular campos internos
      if (field.startsWith('_')) continue;
      
      const value1 = record1[field];
      const value2 = record2[field];
      
      const difference = this.compareValues(field, value1, value2, config);
      
      if (difference) {
        differences.push(difference);
      }
    }
    
    return differences;
  }

  /**
   * Obtém todos os campos únicos de dois registros
   */
  getAllFields(record1, record2) {
    const fields = new Set();
    
    Object.keys(record1 || {}).forEach(field => fields.add(field));
    Object.keys(record2 || {}).forEach(field => fields.add(field));
    
    return Array.from(fields);
  }

  /**
   * Compara dois valores individuais
   */
  compareValues(field, value1, value2, config) {
    // Normalizar valores
    const norm1 = this.normalizeValue(value1, config);
    const norm2 = this.normalizeValue(value2, config);
    
    // Verificar se são diferentes
    if (this.valuesAreEqual(norm1, norm2, config)) {
      return null; // Valores são iguais
    }
    
    // Determinar tipo de diferença
    const differenceType = this.getDifferenceType(norm1, norm2);
    
    // Calcular magnitude da diferença (para valores numéricos)
    const magnitude = this.calculateMagnitude(norm1, norm2);
    
    return {
      field,
      oldValue: value1,
      newValue: value2,
      normalizedOldValue: norm1,
      normalizedNewValue: norm2,
      type: differenceType,
      magnitude,
      significance: this.assessSignificance(field, norm1, norm2, magnitude)
    };
  }

  /**
   * Normaliza um valor para comparação
   */
  normalizeValue(value, config) {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (typeof value === 'string') {
      let normalized = value;
      
      if (config.trimStrings) {
        normalized = normalized.trim();
      }
      
      if (config.ignoreCase) {
        normalized = normalized.toLowerCase();
      }
      
      return normalized === '' ? null : normalized;
    }
    
    if (typeof value === 'number') {
      return value;
    }
    
    return value;
  }

  /**
   * Verifica se dois valores são iguais
   */
  valuesAreEqual(value1, value2, config) {
    // Ambos nulos
    if (value1 === null && value2 === null) {
      return true;
    }
    
    // Um é nulo, outro não
    if (value1 === null || value2 === null) {
      return false;
    }
    
    // Ambos são números
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      return Math.abs(value1 - value2) <= config.numericThreshold;
    }
    
    // Comparação padrão
    return value1 === value2;
  }

  /**
   * Determina o tipo de diferença
   */
  getDifferenceType(value1, value2) {
    if (value1 === null && value2 !== null) return 'added';
    if (value1 !== null && value2 === null) return 'removed';
    if (typeof value1 === 'number' && typeof value2 === 'number') return 'numeric_change';
    if (typeof value1 === 'string' && typeof value2 === 'string') return 'text_change';
    return 'type_change';
  }

  /**
   * Calcula a magnitude da diferença
   */
  calculateMagnitude(value1, value2) {
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      const diff = Math.abs(value2 - value1);
      const base = Math.abs(value1) || 1;
      return {
        absolute: diff,
        relative: diff / base,
        percentage: (diff / base) * 100
      };
    }
    
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return {
        levenshteinDistance: this.levenshteinDistance(value1, value2),
        similarity: this.stringSimilarity(value1, value2)
      };
    }
    
    return null;
  }

  /**
   * Avalia a significância de uma diferença
   */
  assessSignificance(field, value1, value2, magnitude) {
    // Campos críticos
    const criticalFields = ['valor', 'risco', 'situacao', 'status'];
    const isCritical = criticalFields.some(cf => 
      field.toLowerCase().includes(cf)
    );
    
    if (isCritical) {
      return 'high';
    }
    
    // Mudanças numéricas significativas
    if (magnitude && magnitude.percentage > 10) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Calcula distância de Levenshtein entre duas strings
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
   * Calcula similaridade entre duas strings
   */
  stringSimilarity(str1, str2) {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Remove campos internos do registro
   */
  cleanRecord(record) {
    const cleaned = { ...record };
    Object.keys(cleaned).forEach(key => {
      if (key.startsWith('_')) {
        delete cleaned[key];
      }
    });
    return cleaned;
  }

  /**
   * Calcula estatísticas da comparação
   */
  calculateStatistics(comparison, dataset1Size, dataset2Size) {
    // Método legado para compatibilidade com comparação de dois datasets
    if (dataset1Size !== undefined && dataset2Size !== undefined) {
      const stats = {
        datasets: {
          dataset1Size,
          dataset2Size,
          sizeDifference: dataset2Size - dataset1Size,
          sizeChangePercentage: dataset1Size > 0 ? 
            ((dataset2Size - dataset1Size) / dataset1Size) * 100 : 0
        },
        records: {
          new: comparison.newRecords.length,
          removed: comparison.removedRecords.length,
          modified: comparison.modifiedRecords.length,
          unchanged: comparison.unchangedRecords.length,
          total: comparison.newRecords.length + comparison.removedRecords.length + 
                 comparison.modifiedRecords.length + comparison.unchangedRecords.length
        },
        duplicates: {
          dataset1: comparison.duplicateHandling.dataset1Duplicates.length,
          dataset2: comparison.duplicateHandling.dataset2Duplicates.length
        }
      };
      
      // Calcular percentuais
      const total = stats.records.total;
      if (total > 0) {
        stats.percentages = {
          new: (stats.records.new / total) * 100,
          removed: (stats.records.removed / total) * 100,
          modified: (stats.records.modified / total) * 100,
          unchanged: (stats.records.unchanged / total) * 100
        };
      }
      
      // Análise de significância
      stats.significance = this.analyzeSignificance(comparison);
      
      return stats;
    }

    // Novo método para múltiplos datasets
    const stats = {
      totalComparisons: comparison.comparisons.length,
      totalDifferences: comparison.differences.length,
      totalSimilarities: comparison.similarities.length,
      averageSimilarity: 0,
      mostCommonDifference: null,
      dataQualityScore: 0,
      typeDistribution: {},
      crossTypeCompatibility: 0
    };

    if (comparison.comparisons.length > 0) {
      const similarities = comparison.comparisons.map(c => c.similarity);
      stats.averageSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    }

    // Encontrar diferença mais comum
    const diffTypes = comparison.differences.map(d => d.type);
    const diffCounts = {};
    diffTypes.forEach(type => {
      diffCounts[type] = (diffCounts[type] || 0) + 1;
    });
    
    if (Object.keys(diffCounts).length > 0) {
      stats.mostCommonDifference = Object.keys(diffCounts).reduce((a, b) => 
        diffCounts[a] > diffCounts[b] ? a : b
      );
    }

    // Distribuição de tipos
    comparison.summary.fileTypes.forEach(type => {
      stats.typeDistribution[type] = (stats.typeDistribution[type] || 0) + 1;
    });

    // Compatibilidade entre tipos
    if (comparison.crossAnalysis && comparison.crossAnalysis.compatibility) {
      stats.crossTypeCompatibility = comparison.crossAnalysis.compatibility;
    }

    // Score de qualidade dos dados (0-100)
    const totalRows = comparison.datasets.reduce((sum, d) => sum + d.rows, 0);
    stats.dataQualityScore = Math.round(
      (stats.averageSimilarity * 0.4 + 
       (1 - stats.totalDifferences / Math.max(totalRows, 1)) * 0.3 +
       stats.crossTypeCompatibility * 0.3) * 100
    );

    return stats;
  }

  // Novos métodos para suporte a múltiplos tipos
  determineComparisonStrategy(fileTypes) {
    const uniqueTypes = [...new Set(fileTypes)];
    
    if (uniqueTypes.length === 1) {
      const type = uniqueTypes[0];
      return `${type}-${type}`;
    }
    
    return 'mixed';
  }

  getDatasetSummary(dataset) {
    return {
      name: dataset.name,
      type: dataset.type || 'unknown',
      rows: Array.isArray(dataset.data) ? dataset.data.length : 0,
      columns: this.getColumnCount(dataset),
      size: dataset.size || 0,
      structure: this.analyzeStructure(dataset)
    };
  }

  getColumnCount(dataset) {
    if (!dataset.data || !Array.isArray(dataset.data) || dataset.data.length === 0) {
      return 0;
    }
    
    if (dataset.type === 'xml') {
      return dataset.metadata ? Object.keys(dataset.metadata).length : 0;
    }
    
    return Object.keys(dataset.data[0] || {}).length;
  }

  analyzeStructure(dataset) {
    const structure = {
      type: dataset.type || 'unknown',
      hasHeaders: false,
      dataTypes: {},
      nested: false
    };

    if (dataset.type === 'xml') {
      structure.nested = true;
      structure.hasHeaders = true;
      if (dataset.metadata) {
        Object.keys(dataset.metadata).forEach(key => {
          structure.dataTypes[key] = typeof dataset.metadata[key];
        });
      }
    } else if (Array.isArray(dataset.data) && dataset.data.length > 0) {
      structure.hasHeaders = true;
      const sample = dataset.data[0];
      Object.keys(sample).forEach(key => {
        structure.dataTypes[key] = typeof sample[key];
      });
    }

    return structure;
  }

  async performCrossTypeAnalysis(datasets, options) {
    const analysis = {
      compatibility: 0,
      commonFields: [],
      typeConflicts: [],
      recommendations: []
    };

    // Encontrar campos comuns entre diferentes tipos
    const allFields = new Map();
    
    datasets.forEach(dataset => {
      const fields = this.extractFields(dataset);
      fields.forEach(field => {
        if (!allFields.has(field.name)) {
          allFields.set(field.name, []);
        }
        allFields.get(field.name).push({
          dataset: dataset.name,
          type: field.type,
          datasetType: dataset.type
        });
      });
    });

    // Analisar compatibilidade
    let compatibleFields = 0;
    let totalFields = 0;

    allFields.forEach((occurrences, fieldName) => {
      totalFields++;
      
      if (occurrences.length > 1) {
        const types = [...new Set(occurrences.map(o => o.type))];
        
        if (types.length === 1) {
          compatibleFields++;
          analysis.commonFields.push({
            name: fieldName,
            type: types[0],
            datasets: occurrences.map(o => o.dataset)
          });
        } else {
          analysis.typeConflicts.push({
            field: fieldName,
            conflicts: occurrences
          });
        }
      }
    });

    analysis.compatibility = totalFields > 0 ? compatibleFields / totalFields : 0;

    // Gerar recomendações
    if (analysis.compatibility < 0.5) {
      analysis.recommendations.push('Considere normalizar os tipos de dados entre os arquivos');
    }
    
    if (analysis.typeConflicts.length > 0) {
      analysis.recommendations.push('Resolva os conflitos de tipo antes da análise final');
    }

    return analysis;
  }

  extractFields(dataset) {
    const fields = [];
    
    if (dataset.type === 'xml' && dataset.metadata) {
      Object.keys(dataset.metadata).forEach(key => {
        fields.push({
          name: key,
          type: typeof dataset.metadata[key]
        });
      });
    } else if (Array.isArray(dataset.data) && dataset.data.length > 0) {
      const sample = dataset.data[0];
      Object.keys(sample).forEach(key => {
        fields.push({
          name: key,
          type: typeof sample[key]
        });
      });
    }
    
    return fields;
  }

  analyzeGlobalPatterns(datasets) {
    const patterns = {
      commonStructures: [],
      dataDistribution: {},
      qualityMetrics: {},
      trends: []
    };

    // Analisar estruturas comuns
    const structures = datasets.map(d => this.analyzeStructure(d));
    const structureGroups = new Map();
    
    structures.forEach((structure, index) => {
      const key = JSON.stringify(structure.dataTypes);
      if (!structureGroups.has(key)) {
        structureGroups.set(key, []);
      }
      structureGroups.get(key).push(datasets[index].name);
    });

    structureGroups.forEach((datasetNames, structureKey) => {
      if (datasetNames.length > 1) {
        patterns.commonStructures.push({
          structure: JSON.parse(structureKey),
          datasets: datasetNames
        });
      }
    });

    // Distribuição de dados
    datasets.forEach(dataset => {
      const type = dataset.type || 'unknown';
      if (!patterns.dataDistribution[type]) {
        patterns.dataDistribution[type] = {
          count: 0,
          totalRows: 0,
          avgSize: 0
        };
      }
      
      patterns.dataDistribution[type].count++;
      patterns.dataDistribution[type].totalRows += Array.isArray(dataset.data) ? dataset.data.length : 0;
      patterns.dataDistribution[type].avgSize += dataset.size || 0;
    });

    // Calcular médias
    Object.keys(patterns.dataDistribution).forEach(type => {
      const dist = patterns.dataDistribution[type];
      dist.avgSize = dist.avgSize / dist.count;
    });

    return patterns;
  }

  // Métodos específicos para cada tipo de arquivo
  async compareExcelFiles(datasets, options) {
    // Implementação específica para Excel
    return this.compareTabularData(datasets, options);
  }

  async compareJsonFiles(datasets, options) {
    // Implementação específica para JSON
    return this.compareStructuredData(datasets, options);
  }

  async compareXmlFiles(datasets, options) {
    // Implementação específica para XML
    return this.compareHierarchicalData(datasets, options);
  }

  async compareMixedFiles(datasets, options) {
    // Implementação para tipos mistos
    const normalizedDatasets = await this.normalizeDatasets(datasets);
    return this.compareTabularData(normalizedDatasets, options);
  }

  async compareTabularData(datasets, options) {
    // Comparação otimizada para dados tabulares
    const results = [];
    
    for (let i = 0; i < datasets.length; i++) {
      for (let j = i + 1; j < datasets.length; j++) {
        const comparison = await this.comparePair(datasets[i], datasets[j], options);
        results.push(comparison);
      }
    }
    
    return results;
  }

  async compareStructuredData(datasets, options) {
    // Comparação para dados estruturados (JSON)
    return this.compareTabularData(datasets, options);
  }

  async compareHierarchicalData(datasets, options) {
    // Comparação para dados hierárquicos (XML)
    const results = [];
    
    for (let i = 0; i < datasets.length; i++) {
      for (let j = i + 1; j < datasets.length; j++) {
        const comparison = await this.compareXmlStructures(datasets[i], datasets[j], options);
        results.push(comparison);
      }
    }
    
    return results;
  }

  async compareXmlStructures(dataset1, dataset2, options) {
    // Comparação específica para estruturas XML
    const comparison = {
      dataset1: dataset1.name,
      dataset2: dataset2.name,
      type: 'xml-structure',
      similarity: 0,
      differences: [],
      similarities: [],
      metadata: {
        structure1: dataset1.metadata || {},
        structure2: dataset2.metadata || {}
      }
    };

    // Comparar metadados XML
    const keys1 = Object.keys(dataset1.metadata || {});
    const keys2 = Object.keys(dataset2.metadata || {});
    
    const commonKeys = keys1.filter(key => keys2.includes(key));
    const uniqueKeys1 = keys1.filter(key => !keys2.includes(key));
    const uniqueKeys2 = keys2.filter(key => !keys1.includes(key));

    comparison.similarity = commonKeys.length / Math.max(keys1.length, keys2.length, 1);

    commonKeys.forEach(key => {
      comparison.similarities.push({
        type: 'common_field',
        field: key,
        value1: dataset1.metadata[key],
        value2: dataset2.metadata[key]
      });
    });

    uniqueKeys1.forEach(key => {
      comparison.differences.push({
        type: 'missing_field',
        field: key,
        dataset: dataset2.name,
        value: dataset1.metadata[key]
      });
    });

    uniqueKeys2.forEach(key => {
      comparison.differences.push({
        type: 'missing_field',
        field: key,
        dataset: dataset1.name,
        value: dataset2.metadata[key]
      });
    });

    return comparison;
  }

  async normalizeDatasets(datasets) {
    // Normalizar datasets de diferentes tipos para comparação
    return datasets.map(dataset => {
      const normalized = {
        ...dataset,
        normalizedData: []
      };

      if (dataset.type === 'xml' && dataset.metadata) {
        // Converter metadados XML para formato tabular
        normalized.normalizedData = [dataset.metadata];
      } else if (Array.isArray(dataset.data)) {
        normalized.normalizedData = dataset.data;
      }

      return normalized;
    });
  }

  async comparePair(dataset1, dataset2, options) {
    // Implementação básica de comparação entre dois datasets
    const comparison = {
      dataset1: dataset1.name,
      dataset2: dataset2.name,
      type: 'pair-comparison',
      similarity: 0,
      differences: [],
      similarities: []
    };

    // Lógica de comparação básica
    // Esta seria expandida baseada no tipo de dados
    
    return comparison;
  }

  /**
   * Analisa a significância das mudanças
   */
  analyzeSignificance(comparison) {
    const significance = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    comparison.modifiedRecords.forEach(record => {
      record.differences.forEach(diff => {
        significance[diff.significance]++;
      });
    });
    
    return significance;
  }

  /**
   * Gera resumo da comparação
   */
  generateSummary(comparisonResult) {
    const { comparison, statistics } = comparisonResult;
    
    const summary = {
      overview: {
        totalChanges: statistics.records.new + statistics.records.removed + statistics.records.modified,
        changeRate: statistics.percentages ? 
          (100 - statistics.percentages.unchanged).toFixed(2) + '%' : '0%',
        datasetGrowth: statistics.datasets.sizeChangePercentage.toFixed(2) + '%'
      },
      highlights: [],
      recommendations: []
    };
    
    // Adicionar destaques
    if (statistics.records.new > 0) {
      summary.highlights.push(`${statistics.records.new} novos registros adicionados`);
    }
    
    if (statistics.records.removed > 0) {
      summary.highlights.push(`${statistics.records.removed} registros removidos`);
    }
    
    if (statistics.records.modified > 0) {
      summary.highlights.push(`${statistics.records.modified} registros modificados`);
    }
    
    if (statistics.duplicates.dataset1 > 0 || statistics.duplicates.dataset2 > 0) {
      summary.highlights.push('Chaves duplicadas detectadas - revisar dados');
    }
    
    // Adicionar recomendações
    if (statistics.significance.high > 0) {
      summary.recommendations.push('Revisar mudanças de alta significância');
    }
    
    if (statistics.records.removed > statistics.records.new) {
      summary.recommendations.push('Investigar motivo da redução no número de registros');
    }
    
    return summary;
  }
}

export default DataComparator;