/**
 * Gerenciador de Configurações do Fusione Core System
 * Centraliza e gerencia todas as configurações do sistema
 */

import fs from 'fs/promises';
import path from 'path';
import Joi from 'joi';
import { createLogger } from './logger.js';

export class ConfigManager {
  constructor() {
    this.logger = createLogger('ConfigManager');
    this.config = new Map();
    this.watchers = new Map();
    this.configPath = path.join(process.cwd(), 'config');
    this.defaultConfigFile = path.join(this.configPath, 'default.json');
    this.envConfigFile = path.join(this.configPath, `${process.env.NODE_ENV || 'development'}.json`);
  }

  /**
   * Inicializa o gerenciador de configurações
   */
  async initialize() {
    try {
      this.logger.info('Inicializando gerenciador de configurações...');
      
      // Criar diretório de configurações se não existir
      await this.ensureConfigDirectory();
      
      // Carregar configurações padrão
      await this.loadDefaultConfig();
      
      // Carregar configurações do ambiente
      await this.loadEnvironmentConfig();
      
      // Aplicar variáveis de ambiente
      this.applyEnvironmentVariables();
      
      // Validar configurações
      this.validateConfig();
      
      this.logger.info('Configurações carregadas com sucesso');
      
    } catch (error) {
      this.logger.error('Erro ao inicializar configurações:', error);
      throw error;
    }
  }

  /**
   * Obtém uma configuração
   * @param {string} key - Chave da configuração (suporta notação de ponto)
   * @param {*} defaultValue - Valor padrão se não encontrado
   * @returns {*} Valor da configuração
   */
  get(key, defaultValue = undefined) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value instanceof Map) {
        value = value.get(k);
      } else if (typeof value === 'object' && value !== null) {
        value = value[k];
      } else {
        return defaultValue;
      }
      
      if (value === undefined) {
        return defaultValue;
      }
    }
    
    return value;
  }

  /**
   * Define uma configuração
   * @param {string} key - Chave da configuração
   * @param {*} value - Valor da configuração
   */
  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    let current = this.config;
    
    // Navegar até o objeto pai
    for (const k of keys) {
      if (!current.has(k)) {
        current.set(k, new Map());
      }
      current = current.get(k);
    }
    
    current.set(lastKey, value);
    
    this.logger.debug(`Configuração definida: ${key} = ${JSON.stringify(value)}`);
  }

  /**
   * Obtém todas as configurações como objeto
   * @returns {Object} Todas as configurações
   */
  getAll() {
    return this.mapToObject(this.config);
  }

  /**
   * Carrega configurações de um arquivo
   * @param {string} filePath - Caminho do arquivo
   * @param {boolean} merge - Se deve fazer merge com configurações existentes
   */
  async loadFromFile(filePath, merge = true) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      if (merge) {
        this.mergeConfig(data);
      } else {
        this.config = this.objectToMap(data);
      }
      
      this.logger.debug(`Configurações carregadas de: ${filePath}`);
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`Erro ao carregar configurações de ${filePath}:`, error);
        throw error;
      }
    }
  }

  /**
   * Salva configurações em um arquivo
   * @param {string} filePath - Caminho do arquivo
   * @param {Object} data - Dados para salvar (opcional, usa config atual)
   */
  async saveToFile(filePath, data = null) {
    try {
      const configData = data || this.getAll();
      const content = JSON.stringify(configData, null, 2);
      
      await fs.writeFile(filePath, content, 'utf-8');
      
      this.logger.debug(`Configurações salvas em: ${filePath}`);
      
    } catch (error) {
      this.logger.error(`Erro ao salvar configurações em ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Observa mudanças em um arquivo de configuração
   * @param {string} filePath - Caminho do arquivo
   * @param {Function} callback - Callback para mudanças
   */
  async watchFile(filePath, callback) {
    try {
      const watcher = fs.watch(filePath, async (eventType) => {
        if (eventType === 'change') {
          this.logger.debug(`Arquivo de configuração modificado: ${filePath}`);
          
          try {
            await this.loadFromFile(filePath);
            if (callback) {
              callback(this.getAll());
            }
          } catch (error) {
            this.logger.error('Erro ao recarregar configurações:', error);
          }
        }
      });
      
      this.watchers.set(filePath, watcher);
      this.logger.debug(`Observando arquivo de configuração: ${filePath}`);
      
    } catch (error) {
      this.logger.error(`Erro ao observar arquivo ${filePath}:`, error);
    }
  }

  /**
   * Para de observar um arquivo
   * @param {string} filePath - Caminho do arquivo
   */
  unwatchFile(filePath) {
    const watcher = this.watchers.get(filePath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(filePath);
      this.logger.debug(`Parou de observar arquivo: ${filePath}`);
    }
  }

  /**
   * Para de observar todos os arquivos
   */
  unwatchAll() {
    for (const [filePath, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    this.logger.debug('Parou de observar todos os arquivos de configuração');
  }

  /**
   * Garante que o diretório de configurações existe
   */
  async ensureConfigDirectory() {
    try {
      await fs.access(this.configPath);
    } catch {
      await fs.mkdir(this.configPath, { recursive: true });
      this.logger.info(`Diretório de configurações criado: ${this.configPath}`);
      
      // Criar arquivo de configuração padrão
      await this.createDefaultConfigFile();
    }
  }

  /**
   * Cria arquivo de configuração padrão
   */
  async createDefaultConfigFile() {
    const defaultConfig = {
      server: {
        port: 3000,
        host: 'localhost'
      },
      logging: {
        level: 'info',
        format: 'json'
      },
      modules: {
        autoLoad: true,
        path: './src/modules'
      },
      security: {
        cors: {
          enabled: true,
          origins: ['http://localhost:3000']
        },
        helmet: {
          enabled: true
        }
      }
    };
    
    await this.saveToFile(this.defaultConfigFile, defaultConfig);
    this.logger.info('Arquivo de configuração padrão criado');
  }

  /**
   * Carrega configurações padrão
   */
  async loadDefaultConfig() {
    await this.loadFromFile(this.defaultConfigFile, false);
  }

  /**
   * Carrega configurações do ambiente
   */
  async loadEnvironmentConfig() {
    await this.loadFromFile(this.envConfigFile, true);
  }

  /**
   * Aplica variáveis de ambiente
   */
  applyEnvironmentVariables() {
    // Mapear variáveis de ambiente para configurações
    const envMappings = {
      'PORT': 'server.port',
      'HOST': 'server.host',
      'LOG_LEVEL': 'logging.level',
      'NODE_ENV': 'environment',
      'DATABASE_ENABLED': 'database.enabled',
      'MARIADB_HOST': 'database.host',
      'MARIADB_PORT': 'database.port',
      'MARIADB_DATABASE': 'database.database',
      'MARIADB_USERNAME': 'database.username',
      'MARIADB_PASSWORD': 'database.password',
      'MARIADB_CONNECTION_LIMIT': 'database.connectionLimit',
      'MARIADB_TIMEOUT': 'database.timeout',

      'WEBSOCKET_ENABLED': 'websocket.enabled',
      'AUTH_ENABLED': 'api.authentication.enabled'
    };
    
    for (const [envVar, configKey] of Object.entries(envMappings)) {
      const value = process.env[envVar];
      if (value !== undefined) {
        // Converter tipos quando necessário
        let convertedValue = value;
        if (configKey === 'server.port' || configKey === 'database.port' || 
            configKey === 'database.connectionLimit' || configKey === 'database.timeout') {
          convertedValue = parseInt(value, 10);
        } else if (configKey.includes('.enabled')) {
          convertedValue = value.toLowerCase() === 'true';
        }
        
        this.set(configKey, convertedValue);
      }
    }
  }

  /**
   * Valida configurações usando Joi
   */
  validateConfig() {
    const schema = Joi.object({
      server: Joi.object({
        port: Joi.number().port().required(),
        host: Joi.string().required(),
        cors: Joi.object({
          enabled: Joi.boolean(),
          origins: Joi.array().items(Joi.string())
        }).optional(),
        helmet: Joi.object({
          enabled: Joi.boolean(),
          contentSecurityPolicy: Joi.boolean()
        }).optional()
      }).required(),
      logging: Joi.object({
        level: Joi.string().valid('error', 'warn', 'info', 'debug').required(),
        console: Joi.object().optional(),
        file: Joi.object().optional(),
        http: Joi.object().optional()
      }).required(),
      modules: Joi.object().optional(),
      events: Joi.object().optional(),
      healthCheck: Joi.object().optional(),
      api: Joi.object().optional(),
      system: Joi.object().optional(),
      security: Joi.object().optional(),
      performance: Joi.object().optional()
    }).unknown(true);
    
    const { error } = schema.validate(this.getAll());
    if (error) {
      throw new Error(`Configuração inválida: ${error.message}`);
    }
  }

  /**
   * Faz merge de configurações
   * @param {Object} newConfig - Novas configurações
   */
  mergeConfig(newConfig) {
    const newConfigMap = this.objectToMap(newConfig);
    this.deepMerge(this.config, newConfigMap);
  }

  /**
   * Merge profundo de Maps
   * @param {Map} target - Map de destino
   * @param {Map} source - Map de origem
   */
  deepMerge(target, source) {
    for (const [key, value] of source) {
      if (value instanceof Map && target.has(key) && target.get(key) instanceof Map) {
        this.deepMerge(target.get(key), value);
      } else {
        target.set(key, value);
      }
    }
  }

  /**
   * Converte objeto para Map recursivamente
   * @param {Object} obj - Objeto para converter
   * @returns {Map} Map resultante
   */
  objectToMap(obj) {
    const map = new Map();
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        map.set(key, this.objectToMap(value));
      } else {
        map.set(key, value);
      }
    }
    
    return map;
  }

  /**
   * Converte Map para objeto recursivamente
   * @param {Map} map - Map para converter
   * @returns {Object} Objeto resultante
   */
  mapToObject(map) {
    const obj = {};
    
    for (const [key, value] of map) {
      if (value instanceof Map) {
        obj[key] = this.mapToObject(value);
      } else {
        obj[key] = value;
      }
    }
    
    return obj;
  }
}