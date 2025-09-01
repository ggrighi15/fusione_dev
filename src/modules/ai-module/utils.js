import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Utilitários para o módulo de IA
 */
class AIUtils {
  
  /**
   * Processamento de texto e NLP
   */
  static textProcessing = {
    
    /**
     * Remove stopwords do texto
     */
    removeStopwords(text, language = 'pt') {
      const stopwords = {
        pt: ['a', 'o', 'e', 'é', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com', 'não', 'que', 'se', 'por', 'mais', 'as', 'os', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'era', 'depois', 'sem', 'mesmo', 'aos', 'ter', 'seus', 'suas', 'numa', 'pelos', 'pelas', 'esse', 'esses', 'essa', 'essas', 'dele', 'dela', 'deles', 'delas', 'esta', 'estas', 'este', 'estes', 'aquele', 'aquela', 'aqueles', 'aquelas'],
        en: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']
      };
      
      const words = text.toLowerCase().split(/\s+/);
      const stopwordList = stopwords[language] || stopwords.pt;
      
      return words.filter(word => !stopwordList.includes(word)).join(' ');
    },
    
    /**
     * Extrai entidades nomeadas do texto
     */
    extractNamedEntities(text) {
      const entities = {
        pessoas: [],
        organizacoes: [],
        locais: [],
        datas: [],
        valores: [],
        cpf: [],
        cnpj: [],
        processos: []
      };
      
      // Padrões regex para diferentes entidades
      const patterns = {
        cpf: /\d{3}\.\d{3}\.\d{3}-\d{2}/g,
        cnpj: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g,
        processo: /\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/g,
        data: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/gi,
        valor: /R\$\s*\d{1,3}(?:\.\d{3})*(?:,\d{2})?/gi,
        pessoa: /\b[A-ZÁÊÇÕ][a-záêçõ]+(?:\s+[A-ZÁÊÇÕ][a-záêçõ]+)+\b/g,
        organizacao: /\b[A-ZÁÊÇÕ][A-Za-záêçõ\s]+(?:LTDA|S\/A|SA|EIRELI|ME|EPP)\b/gi
      };
      
      // Extrai CPFs
      const cpfMatches = text.match(patterns.cpf);
      if (cpfMatches) entities.cpf = [...new Set(cpfMatches)];
      
      // Extrai CNPJs
      const cnpjMatches = text.match(patterns.cnpj);
      if (cnpjMatches) entities.cnpj = [...new Set(cnpjMatches)];
      
      // Extrai números de processo
      const processoMatches = text.match(patterns.processo);
      if (processoMatches) entities.processos = [...new Set(processoMatches)];
      
      // Extrai datas
      const dataMatches = text.match(patterns.data);
      if (dataMatches) entities.datas = [...new Set(dataMatches)];
      
      // Extrai valores monetários
      const valorMatches = text.match(patterns.valor);
      if (valorMatches) entities.valores = [...new Set(valorMatches)];
      
      // Extrai possíveis nomes de pessoas
      const pessoaMatches = text.match(patterns.pessoa);
      if (pessoaMatches) {
        entities.pessoas = [...new Set(pessoaMatches)].filter(nome => 
          nome.split(' ').length >= 2 && nome.length > 5
        );
      }
      
      // Extrai organizações
      const orgMatches = text.match(patterns.organizacao);
      if (orgMatches) entities.organizacoes = [...new Set(orgMatches)];
      
      return entities;
    },
    
    /**
     * Calcula similaridade entre textos usando Jaccard
     */
    calculateSimilarity(text1, text2) {
      const words1 = new Set(text1.toLowerCase().split(/\s+/));
      const words2 = new Set(text2.toLowerCase().split(/\s+/));
      
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      
      return intersection.size / union.size;
    },
    
    /**
     * Extrai palavras-chave do texto
     */
    extractKeywords(text, maxKeywords = 10) {
      // Remove stopwords e pontuação
      const cleanText = this.removeStopwords(text)
        .replace(/[^\w\s]/g, '')
        .toLowerCase();
      
      // Conta frequência das palavras
      const words = cleanText.split(/\s+/).filter(word => word.length > 3);
      const frequency = {};
      
      words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
      });
      
      // Ordena por frequência e retorna top keywords
      return Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, maxKeywords)
        .map(([word, freq]) => ({ word, frequency: freq }));
    },
    
    /**
     * Analisa sentimento do texto (básico)
     */
    analyzeSentiment(text) {
      const positiveWords = ['bom', 'ótimo', 'excelente', 'positivo', 'favorável', 'sucesso', 'ganhar', 'vitória', 'aprovado', 'satisfeito'];
      const negativeWords = ['ruim', 'péssimo', 'negativo', 'desfavorável', 'fracasso', 'perder', 'derrota', 'rejeitado', 'insatisfeito', 'problema'];
      
      const words = text.toLowerCase().split(/\s+/);
      let positiveScore = 0;
      let negativeScore = 0;
      
      words.forEach(word => {
        if (positiveWords.includes(word)) positiveScore++;
        if (negativeWords.includes(word)) negativeScore++;
      });
      
      const totalScore = positiveScore - negativeScore;
      const sentiment = totalScore > 0 ? 'positivo' : totalScore < 0 ? 'negativo' : 'neutro';
      
      return {
        sentiment: sentiment,
        score: totalScore,
        positive: positiveScore,
        negative: negativeScore,
        confidence: Math.abs(totalScore) / words.length
      };
    }
  };
  
  /**
   * Utilitários de validação
   */
  static validation = {
    
    /**
     * Valida CPF
     */
    isValidCPF(cpf) {
      cpf = cpf.replace(/[^\d]/g, '');
      
      if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
      }
      
      let sum = 0;
      for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
      }
      
      let remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      if (remainder !== parseInt(cpf.charAt(9))) return false;
      
      sum = 0;
      for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
      }
      
      remainder = (sum * 10) % 11;
      if (remainder === 10 || remainder === 11) remainder = 0;
      
      return remainder === parseInt(cpf.charAt(10));
    },
    
    /**
     * Valida CNPJ
     */
    isValidCNPJ(cnpj) {
      cnpj = cnpj.replace(/[^\d]/g, '');
      
      if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
        return false;
      }
      
      const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        sum += parseInt(cnpj.charAt(i)) * weights1[i];
      }
      
      let remainder = sum % 11;
      const digit1 = remainder < 2 ? 0 : 11 - remainder;
      
      if (digit1 !== parseInt(cnpj.charAt(12))) return false;
      
      sum = 0;
      for (let i = 0; i < 13; i++) {
        sum += parseInt(cnpj.charAt(i)) * weights2[i];
      }
      
      remainder = sum % 11;
      const digit2 = remainder < 2 ? 0 : 11 - remainder;
      
      return digit2 === parseInt(cnpj.charAt(13));
    },
    
    /**
     * Valida número de processo judicial
     */
    isValidProcessNumber(processo) {
      const pattern = /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/;
      return pattern.test(processo);
    },
    
    /**
     * Valida estrutura de documento
     */
    validateDocumentStructure(document) {
      const errors = [];
      
      if (!document.content || document.content.trim().length === 0) {
        errors.push('Conteúdo do documento é obrigatório');
      }
      
      if (!document.filename || document.filename.trim().length === 0) {
        errors.push('Nome do arquivo é obrigatório');
      }
      
      if (document.content && document.content.length > 1000000) {
        errors.push('Conteúdo do documento muito grande (máximo 1MB)');
      }
      
      return {
        isValid: errors.length === 0,
        errors: errors
      };
    }
  };
  
  /**
   * Utilitários de dados
   */
  static dataUtils = {
    
    /**
     * Normaliza dados numéricos
     */
    normalize(data, min = 0, max = 1) {
      if (!Array.isArray(data)) return data;
      
      const dataMin = Math.min(...data);
      const dataMax = Math.max(...data);
      const range = dataMax - dataMin;
      
      if (range === 0) return data.map(() => min);
      
      return data.map(value => 
        min + ((value - dataMin) / range) * (max - min)
      );
    },
    
    /**
     * Calcula estatísticas descritivas
     */
    calculateStats(data) {
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }
      
      const sorted = [...data].sort((a, b) => a - b);
      const sum = data.reduce((acc, val) => acc + val, 0);
      const mean = sum / data.length;
      
      const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / data.length;
      const stdDev = Math.sqrt(variance);
      
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      
      return {
        count: data.length,
        sum: sum,
        mean: mean,
        median: median,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        variance: variance,
        standardDeviation: stdDev,
        quartiles: {
          q1: sorted[Math.floor(sorted.length * 0.25)],
          q2: median,
          q3: sorted[Math.floor(sorted.length * 0.75)]
        }
      };
    },
    
    /**
     * Detecta outliers usando IQR
     */
    detectOutliers(data) {
      const stats = this.calculateStats(data);
      if (!stats) return [];
      
      const iqr = stats.quartiles.q3 - stats.quartiles.q1;
      const lowerBound = stats.quartiles.q1 - 1.5 * iqr;
      const upperBound = stats.quartiles.q3 + 1.5 * iqr;
      
      return data.map((value, index) => ({
        index: index,
        value: value,
        isOutlier: value < lowerBound || value > upperBound
      })).filter(item => item.isOutlier);
    },
    
    /**
     * Agrupa dados por critério
     */
    groupBy(data, keyFunction) {
      return data.reduce((groups, item) => {
        const key = keyFunction(item);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
        return groups;
      }, {});
    },
    
    /**
     * Calcula correlação entre duas séries
     */
    calculateCorrelation(x, y) {
      if (x.length !== y.length || x.length === 0) {
        return null;
      }
      
      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
      const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
      
      const numerator = n * sumXY - sumX * sumY;
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      
      return denominator === 0 ? 0 : numerator / denominator;
    }
  };
  
  /**
   * Utilitários de arquivo
   */
  static fileUtils = {
    
    /**
     * Detecta tipo de arquivo por extensão
     */
    detectFileType(filename) {
      const extension = filename.split('.').pop()?.toLowerCase();
      
      const types = {
        pdf: 'document',
        doc: 'document',
        docx: 'document',
        txt: 'text',
        rtf: 'document',
        odt: 'document',
        jpg: 'image',
        jpeg: 'image',
        png: 'image',
        gif: 'image',
        mp4: 'video',
        avi: 'video',
        mov: 'video',
        mp3: 'audio',
        wav: 'audio',
        xlsx: 'spreadsheet',
        xls: 'spreadsheet',
        csv: 'data'
      };
      
      return types[extension] || 'unknown';
    },
    
    /**
     * Calcula hash de arquivo
     */
    calculateFileHash(content, algorithm = 'sha256') {
      return crypto.createHash(algorithm).update(content).digest('hex');
    },
    
    /**
     * Valida tamanho de arquivo
     */
    validateFileSize(size, maxSize = 10 * 1024 * 1024) { // 10MB default
      return {
        isValid: size <= maxSize,
        size: size,
        maxSize: maxSize,
        sizeFormatted: this.formatFileSize(size),
        maxSizeFormatted: this.formatFileSize(maxSize)
      };
    },
    
    /**
     * Formata tamanho de arquivo
     */
    formatFileSize(bytes) {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
  };
  
  /**
   * Utilitários de cache
   */
  static cacheUtils = {
    
    /**
     * Gera chave de cache
     */
    generateCacheKey(prefix, ...parts) {
      const key = parts.map(part => 
        typeof part === 'object' ? JSON.stringify(part) : String(part)
      ).join(':');
      
      return `${prefix}:${crypto.createHash('md5').update(key).digest('hex')}`;
    },
    
    /**
     * Verifica se cache expirou
     */
    isExpired(timestamp, ttl) {
      return Date.now() - timestamp > ttl;
    },
    
    /**
     * Calcula TTL baseado em tipo de dados
     */
    calculateTTL(dataType) {
      const ttls = {
        'classification': 60 * 60 * 1000, // 1 hora
        'prediction': 30 * 60 * 1000,     // 30 minutos
        'analysis': 2 * 60 * 60 * 1000,   // 2 horas
        'model': 24 * 60 * 60 * 1000,     // 24 horas
        'default': 60 * 60 * 1000         // 1 hora
      };
      
      return ttls[dataType] || ttls.default;
    }
  };
  
  /**
   * Utilitários de performance
   */
  static performance = {
    
    /**
     * Mede tempo de execução
     */
    async measureTime(fn, ...args) {
      const start = process.hrtime.bigint();
      const result = await fn(...args);
      const end = process.hrtime.bigint();
      
      return {
        result: result,
        executionTime: Number(end - start) / 1000000, // em milissegundos
        timestamp: new Date().toISOString()
      };
    },
    
    /**
     * Throttle de função
     */
    throttle(fn, delay) {
      let lastCall = 0;
      return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
          lastCall = now;
          return fn.apply(this, args);
        }
      };
    },
    
    /**
     * Debounce de função
     */
    debounce(fn, delay) {
      let timeoutId;
      return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    }
  };
  
  /**
   * Utilitários de logging
   */
  static logging = {
    
    /**
     * Formata log de IA
     */
    formatAILog(level, message, data = {}) {
      return {
        timestamp: new Date().toISOString(),
        level: level,
        module: 'ai-module',
        message: message,
        data: data,
        pid: process.pid
      };
    },
    
    /**
     * Sanitiza dados sensíveis para log
     */
    sanitizeForLog(data) {
      const sensitiveFields = ['password', 'token', 'cpf', 'cnpj', 'email'];
      const sanitized = JSON.parse(JSON.stringify(data));
      
      function sanitizeObject(obj) {
        for (const key in obj) {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          } else if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
            obj[key] = '***REDACTED***';
          }
        }
      }
      
      sanitizeObject(sanitized);
      return sanitized;
    }
  };
}

export { AIUtils };