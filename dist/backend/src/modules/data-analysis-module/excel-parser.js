import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

class ExcelParser {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Analisa um arquivo Excel e detecta automaticamente a estrutura
   * @param {string} filePath - Caminho para o arquivo Excel
   * @param {string} originalName - Nome original do arquivo
   * @param {Object} options - Opções de parsing
   * @returns {Object} Dados processados com metadados
   */
  async parseExcelFile(filePath, originalName, options = {}) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetNames = workbook.SheetNames;
      
      this.logger.info(`Processando arquivo Excel: ${originalName}`);
      this.logger.info(`Planilhas encontradas: ${sheetNames.join(', ')}`);
      
      // Processar primeira planilha por padrão
      const sheetName = options.sheetName || sheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new Error(`Planilha '${sheetName}' não encontrada`);
      }
      
      // Detectar estrutura do arquivo
      const structure = this.detectFileStructure(worksheet, originalName);
      
      // Extrair dados baseado na estrutura detectada
      const data = this.extractData(worksheet, structure, options);
      
      // Limpar e validar dados
      const cleanData = this.cleanData(data, structure);
      
      return {
        originalName,
        sheetName,
        structure,
        data: cleanData,
        metadata: {
          totalRows: cleanData.length,
          columns: Object.keys(cleanData[0] || {}),
          detectedStructure: structure.type,
          headerRow: structure.headerRow,
          dataStartRow: structure.dataStartRow
        }
      };
    } catch (error) {
      this.logger.error(`Erro ao processar arquivo Excel ${originalName}:`, error);
      throw new Error(`Erro ao processar arquivo Excel: ${error.message}`);
    }
  }

  /**
   * Detecta a estrutura do arquivo Excel
   * @param {Object} worksheet - Planilha do Excel
   * @param {string} originalName - Nome original do arquivo
   * @returns {Object} Estrutura detectada
   */
  detectFileStructure(worksheet, originalName) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const maxRow = Math.min(range.e.r, 10); // Verificar apenas as primeiras 10 linhas
    
    // Padrões conhecidos baseados no nome do arquivo
    if (originalName.includes('08-2025')) {
      return this.detectStructure08_2025(worksheet, range);
    } else if (originalName.includes('12-2024')) {
      return this.detectStructure12_2024(worksheet, range);
    }
    
    // Detecção genérica
    return this.detectGenericStructure(worksheet, range);
  }

  /**
   * Detecta estrutura específica do arquivo 08-2025
   */
  detectStructure08_2025(worksheet, range) {
    // Baseado na informação fornecida: cabeçalhos na linha 3
    const headerRow = 2; // linha 3 (0-indexed)
    const dataStartRow = 3; // linha 4 (0-indexed)
    
    const headers = this.extractHeaders(worksheet, headerRow, range.e.c);
    
    return {
      type: '08-2025',
      headerRow,
      dataStartRow,
      headers,
      skipRows: 2,
      description: 'Arquivo 08-2025 com cabeçalhos na linha 3'
    };
  }

  /**
   * Detecta estrutura específica do arquivo 12-2024
   */
  detectStructure12_2024(worksheet, range) {
    // Estrutura padrão com cabeçalhos na primeira linha
    const headerRow = 0;
    const dataStartRow = 1;
    
    const headers = this.extractHeaders(worksheet, headerRow, range.e.c);
    
    return {
      type: '12-2024',
      headerRow,
      dataStartRow,
      headers,
      skipRows: 0,
      description: 'Arquivo 12-2024 com estrutura padrão'
    };
  }

  /**
   * Detecta estrutura genérica
   */
  detectGenericStructure(worksheet, range) {
    let bestHeaderRow = 0;
    let bestScore = 0;
    
    // Testar diferentes linhas como possíveis cabeçalhos
    for (let row = 0; row <= Math.min(5, range.e.r); row++) {
      const headers = this.extractHeaders(worksheet, row, range.e.c);
      const score = this.scoreHeaders(headers);
      
      if (score > bestScore) {
        bestScore = score;
        bestHeaderRow = row;
      }
    }
    
    const headers = this.extractHeaders(worksheet, bestHeaderRow, range.e.c);
    
    return {
      type: 'generic',
      headerRow: bestHeaderRow,
      dataStartRow: bestHeaderRow + 1,
      headers,
      skipRows: bestHeaderRow,
      description: `Estrutura genérica detectada com cabeçalhos na linha ${bestHeaderRow + 1}`
    };
  }

  /**
   * Extrai cabeçalhos de uma linha específica
   */
  extractHeaders(worksheet, row, maxCol) {
    const headers = [];
    
    for (let col = 0; col <= maxCol; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v) {
        headers.push({
          index: col,
          name: String(cell.v).trim(),
          originalName: String(cell.v)
        });
      } else {
        headers.push({
          index: col,
          name: `Col${col}`,
          originalName: null
        });
      }
    }
    
    return headers;
  }

  /**
   * Pontua a qualidade dos cabeçalhos
   */
  scoreHeaders(headers) {
    let score = 0;
    
    headers.forEach(header => {
      if (header.originalName) {
        score += 1;
        
        // Bonus para cabeçalhos que parecem válidos
        const name = header.name.toLowerCase();
        if (name.includes('pasta') || name.includes('cliente') || 
            name.includes('valor') || name.includes('categoria') ||
            name.includes('risco') || name.includes('situacao') ||
            name.includes('fase') || name.includes('polo')) {
          score += 2;
        }
        
        // Penalidade para cabeçalhos que parecem dados
        if (/^\d+$/.test(name) || name.includes('unnamed')) {
          score -= 1;
        }
      }
    });
    
    return score;
  }

  /**
   * Extrai dados da planilha baseado na estrutura
   */
  extractData(worksheet, structure, options = {}) {
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    const data = [];
    
    // Criar mapeamento de colunas
    const columnMap = this.createColumnMap(structure.headers);
    
    // Extrair dados linha por linha
    for (let row = structure.dataStartRow; row <= range.e.r; row++) {
      const rowData = {};
      let hasData = false;
      
      structure.headers.forEach(header => {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: header.index });
        const cell = worksheet[cellAddress];
        
        let value = null;
        if (cell) {
          value = cell.v;
          if (value !== null && value !== undefined && value !== '') {
            hasData = true;
          }
        }
        
        rowData[header.name] = value;
      });
      
      // Só adicionar linhas que têm pelo menos um valor
      if (hasData) {
        data.push(rowData);
      }
    }
    
    return data;
  }

  /**
   * Cria mapeamento de colunas
   */
  createColumnMap(headers) {
    const map = {};
    
    headers.forEach(header => {
      const normalizedName = this.normalizeColumnName(header.name);
      map[normalizedName] = header.index;
    });
    
    return map;
  }

  /**
   * Normaliza nomes de colunas
   */
  normalizeColumnName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Limpa e valida os dados extraídos
   */
  cleanData(data, structure) {
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    return data.map(row => {
      const cleanRow = {};
      
      Object.keys(row).forEach(key => {
        let value = row[key];
        
        // Limpar valores
        if (typeof value === 'string') {
          value = value.trim();
          if (value === '') {
            value = null;
          }
        }
        
        // Converter valores numéricos
        if (this.isNumericColumn(key) && value !== null) {
          const numValue = this.parseNumericValue(value);
          if (!isNaN(numValue)) {
            cleanRow[`${key}_Numerico`] = numValue;
          }
        }
        
        cleanRow[key] = value;
      });
      
      return cleanRow;
    }).filter(row => {
      // Filtrar linhas completamente vazias
      return Object.values(row).some(value => 
        value !== null && value !== undefined && value !== ''
      );
    });
  }

  /**
   * Verifica se uma coluna contém valores numéricos
   */
  isNumericColumn(columnName) {
    const numericKeywords = ['valor', 'preco', 'custo', 'total', 'quantidade', 'qtd'];
    const name = columnName.toLowerCase();
    return numericKeywords.some(keyword => name.includes(keyword));
  }

  /**
   * Converte string para valor numérico
   */
  parseNumericValue(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return NaN;
    
    // Remover caracteres não numéricos exceto ponto, vírgula e sinal negativo
    const cleaned = value.replace(/[^\d.,\-]/g, '');
    
    // Detectar formato brasileiro (vírgula como decimal)
    if (cleaned.includes(',') && cleaned.includes('.')) {
      // Formato: 1.234.567,89
      const parts = cleaned.split(',');
      if (parts.length === 2) {
        const integerPart = parts[0].replace(/\./g, '');
        const decimalPart = parts[1];
        return parseFloat(`${integerPart}.${decimalPart}`);
      }
    } else if (cleaned.includes(',')) {
      // Apenas vírgula - assumir como decimal
      return parseFloat(cleaned.replace(',', '.'));
    }
    
    return parseFloat(cleaned);
  }

  /**
   * Mostra preview das primeiras linhas do arquivo
   */
  async showPreview(filePath, originalName, lines = 5) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const preview = [];
      
      // Mostrar as primeiras linhas como estão
      for (let row = 0; row < Math.min(lines, range.e.r + 1); row++) {
        const rowData = [];
        
        for (let col = 0; col <= Math.min(10, range.e.c); col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          rowData.push(cell ? cell.v : null);
        }
        
        preview.push({
          row: row + 1,
          data: rowData
        });
      }
      
      return {
        fileName: originalName,
        sheetName,
        totalRows: range.e.r + 1,
        totalCols: range.e.c + 1,
        preview
      };
    } catch (error) {
      this.logger.error(`Erro ao gerar preview do arquivo ${originalName}:`, error);
      throw error;
    }
  }

  /**
   * Valida se o arquivo Excel é válido
   */
  validateExcelFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error('Arquivo não encontrado');
      }
      
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        throw new Error('Arquivo está vazio');
      }
      
      // Tentar ler o arquivo
      const workbook = XLSX.readFile(filePath);
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Arquivo não contém planilhas válidas');
      }
      
      return {
        valid: true,
        fileSize: stats.size,
        sheets: workbook.SheetNames
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

export default ExcelParser;