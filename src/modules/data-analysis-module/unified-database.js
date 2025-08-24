import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

class UnifiedDatabase {
  constructor(logger, dataPath = './data/unified') {
    this.logger = logger;
    this.dataPath = dataPath;
    this.data = new Map();
    this.metadata = new Map();
    this.indexes = new Map();
    
    // Garantir que o diretório existe
    this.ensureDataDirectory();
    
    // Carregar dados existentes
    this.loadState();
  }

  ensureDataDirectory() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        fs.mkdirSync(this.dataPath, { recursive: true });
        this.logger.info(`Diretório de dados criado: ${this.dataPath}`);
      }
    } catch (error) {
      this.logger.error('Erro ao criar diretório de dados:', error);
    }
  }

  generateId() {
    return crypto.randomUUID();
  }

  store(type, data, metadata = {}) {
    try {
      const id = this.generateId();
      const timestamp = new Date().toISOString();
      
      const record = {
        id,
        type,
        data,
        metadata: {
          ...metadata,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      };

      this.data.set(id, record);
      this.updateIndexes(id, record);
      
      this.logger.info(`Dados armazenados: ${type} (ID: ${id})`);
      return id;
    } catch (error) {
      this.logger.error('Erro ao armazenar dados:', error);
      throw error;
    }
  }

  retrieve(id) {
    return this.data.get(id);
  }

  query(criteria) {
    try {
      const results = [];
      
      for (const [id, record] of this.data) {
        if (this.matchesCriteria(record, criteria)) {
          results.push(record);
        }
      }
      
      return results;
    } catch (error) {
      this.logger.error('Erro na consulta:', error);
      return [];
    }
  }

  matchesCriteria(record, criteria) {
    for (const [key, value] of Object.entries(criteria)) {
      if (key === 'type' && record.type !== value) {
        return false;
      }
      if (key === 'metadata' && typeof value === 'object') {
        for (const [metaKey, metaValue] of Object.entries(value)) {
          if (record.metadata[metaKey] !== metaValue) {
            return false;
          }
        }
      }
    }
    return true;
  }

  update(id, updates) {
    try {
      const record = this.data.get(id);
      if (!record) {
        throw new Error(`Registro não encontrado: ${id}`);
      }

      const updatedRecord = {
        ...record,
        ...updates,
        metadata: {
          ...record.metadata,
          ...updates.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      this.data.set(id, updatedRecord);
      this.updateIndexes(id, updatedRecord);
      
      this.logger.info(`Dados atualizados: ${id}`);
      return updatedRecord;
    } catch (error) {
      this.logger.error('Erro ao atualizar dados:', error);
      throw error;
    }
  }

  delete(id) {
    try {
      const record = this.data.get(id);
      if (!record) {
        return false;
      }

      this.data.delete(id);
      this.removeFromIndexes(id);
      
      this.logger.info(`Dados removidos: ${id}`);
      return true;
    } catch (error) {
      this.logger.error('Erro ao remover dados:', error);
      return false;
    }
  }

  updateIndexes(id, record) {
    // Índice por tipo
    if (!this.indexes.has('type')) {
      this.indexes.set('type', new Map());
    }
    const typeIndex = this.indexes.get('type');
    if (!typeIndex.has(record.type)) {
      typeIndex.set(record.type, new Set());
    }
    typeIndex.get(record.type).add(id);

    // Índice por data de criação
    if (!this.indexes.has('createdAt')) {
      this.indexes.set('createdAt', new Map());
    }
    const dateIndex = this.indexes.get('createdAt');
    const date = record.metadata.createdAt.split('T')[0];
    if (!dateIndex.has(date)) {
      dateIndex.set(date, new Set());
    }
    dateIndex.get(date).add(id);
  }

  removeFromIndexes(id) {
    for (const [indexName, index] of this.indexes) {
      for (const [key, ids] of index) {
        if (ids.has(id)) {
          ids.delete(id);
          if (ids.size === 0) {
            index.delete(key);
          }
        }
      }
    }
  }

  getStats() {
    const stats = {
      totalRecords: this.data.size,
      typeDistribution: {},
      dateDistribution: {},
      memoryUsage: this.getMemoryUsage()
    };

    // Distribuição por tipo
    const typeIndex = this.indexes.get('type');
    if (typeIndex) {
      for (const [type, ids] of typeIndex) {
        stats.typeDistribution[type] = ids.size;
      }
    }

    // Distribuição por data
    const dateIndex = this.indexes.get('createdAt');
    if (dateIndex) {
      for (const [date, ids] of dateIndex) {
        stats.dateDistribution[date] = ids.size;
      }
    }

    return stats;
  }

  getMemoryUsage() {
    try {
      const dataSize = JSON.stringify([...this.data]).length;
      const indexSize = JSON.stringify([...this.indexes]).length;
      return {
        data: `${(dataSize / 1024).toFixed(2)} KB`,
        indexes: `${(indexSize / 1024).toFixed(2)} KB`,
        total: `${((dataSize + indexSize) / 1024).toFixed(2)} KB`
      };
    } catch (error) {
      return { error: 'Não foi possível calcular o uso de memória' };
    }
  }

  saveState() {
    try {
      const statePath = path.join(this.dataPath, 'unified-database.json');
      const state = {
        data: [...this.data],
        metadata: [...this.metadata],
        indexes: this.serializeIndexes(),
        savedAt: new Date().toISOString()
      };

      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      this.logger.info('Estado do banco unificado salvo com sucesso');
    } catch (error) {
      this.logger.error('Erro ao salvar estado do banco unificado:', error);
    }
  }

  loadState() {
    try {
      const statePath = path.join(this.dataPath, 'unified-database.json');
      
      if (!fs.existsSync(statePath)) {
        this.logger.info('Nenhum estado anterior encontrado, iniciando banco vazio');
        return;
      }

      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      
      this.data = new Map(state.data || []);
      this.metadata = new Map(state.metadata || []);
      this.indexes = this.deserializeIndexes(state.indexes || {});
      
      this.logger.info(`Estado do banco unificado carregado: ${this.data.size} registros`);
    } catch (error) {
      this.logger.error('Erro ao carregar estado do banco unificado:', error);
      this.data = new Map();
      this.metadata = new Map();
      this.indexes = new Map();
    }
  }

  serializeIndexes() {
    const serialized = {};
    for (const [indexName, index] of this.indexes) {
      serialized[indexName] = {};
      for (const [key, ids] of index) {
        serialized[indexName][key] = [...ids];
      }
    }
    return serialized;
  }

  deserializeIndexes(serialized) {
    const indexes = new Map();
    for (const [indexName, index] of Object.entries(serialized)) {
      const indexMap = new Map();
      for (const [key, ids] of Object.entries(index)) {
        indexMap.set(key, new Set(ids));
      }
      indexes.set(indexName, indexMap);
    }
    return indexes;
  }

  clear() {
    this.data.clear();
    this.metadata.clear();
    this.indexes.clear();
    this.logger.info('Banco unificado limpo');
  }

  export() {
    return {
      data: [...this.data],
      metadata: [...this.metadata],
      stats: this.getStats()
    };
  }
}

export default UnifiedDatabase;