import { EventEmitter } from 'events';
import winston from 'winston';
import { ModuleActivator } from './module-activator.js';

/**
 * Sistema Core do Fusione
 * Gerencia todos os componentes centrais e módulos
 */
class CoreSystem extends EventEmitter {
  constructor() {
    super();
    
    // Configuração do logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: 'logs/fusione-core.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });

    // Componentes centrais
    this.eventBus = new EventEmitter();
    this.eventBus.setMaxListeners(100); // Aumenta limite para muitos módulos
    
    this.database = this.createDatabaseMock();
    this.cacheManager = this.createCacheManager();
    this.configManager = this.createConfigManager();
    
    // Ativador de módulos
    this.moduleActivator = new ModuleActivator(this);
    
    // Estado do sistema
    this.isInitialized = false;
    this.startTime = new Date();
    
    this.setupEventHandlers();
  }

  /**
   * Cria um mock do banco de dados
   */
  createDatabaseMock() {
    return {
      isConnected: true,
      query: async (sql, params) => {
        this.logger.debug(`DB Query: ${sql}`, { params });
        return { rows: [], affectedRows: 0 };
      },
      insert: async (table, data) => {
        this.logger.debug(`DB Insert: ${table}`, { data });
        return { insertId: Math.floor(Math.random() * 10000) };
      },
      update: async (table, data, where) => {
        this.logger.debug(`DB Update: ${table}`, { data, where });
        return { affectedRows: 1 };
      },
      delete: async (table, where) => {
        this.logger.debug(`DB Delete: ${table}`, { where });
        return { affectedRows: 1 };
      },
      transaction: async (callback) => {
        this.logger.debug('DB Transaction started');
        try {
          const result = await callback(this);
          this.logger.debug('DB Transaction committed');
          return result;
        } catch (error) {
          this.logger.debug('DB Transaction rolled back');
          throw error;
        }
      }
    };
  }

  /**
   * Cria o gerenciador de cache
   */
  createCacheManager() {
    const cache = new Map();
    
    return {
      get: async (key) => {
        const value = cache.get(key);
        this.logger.debug(`Cache GET: ${key}`, { found: !!value });
        return value;
      },
      set: async (key, value, ttl = 3600) => {
        cache.set(key, value);
        this.logger.debug(`Cache SET: ${key}`, { ttl });
        
        // Simula TTL
        if (ttl > 0) {
          setTimeout(() => {
            cache.delete(key);
            this.logger.debug(`Cache EXPIRED: ${key}`);
          }, ttl * 1000);
        }
      },
      delete: async (key) => {
        const deleted = cache.delete(key);
        this.logger.debug(`Cache DELETE: ${key}`, { deleted });
        return deleted;
      },
      clear: async () => {
        cache.clear();
        this.logger.debug('Cache CLEARED');
      },
      keys: async () => {
        return Array.from(cache.keys());
      },
      size: () => cache.size
    };
  }

  /**
   * Cria o gerenciador de configurações
   */
  createConfigManager() {
    const configs = new Map();
    
    return {
      get: (key, defaultValue = null) => {
        const value = configs.get(key) ?? defaultValue;
        this.logger.debug(`Config GET: ${key}`, { value });
        return value;
      },
      set: (key, value) => {
        configs.set(key, value);
        this.logger.debug(`Config SET: ${key}`, { value });
        this.eventBus.emit('config:changed', { key, value });
      },
      has: (key) => {
        return configs.has(key);
      },
      delete: (key) => {
        const deleted = configs.delete(key);
        this.logger.debug(`Config DELETE: ${key}`, { deleted });
        if (deleted) {
          this.eventBus.emit('config:deleted', { key });
        }
        return deleted;
      },
      getAll: () => {
        return Object.fromEntries(configs);
      },
      load: async (configData) => {
        for (const [key, value] of Object.entries(configData)) {
          configs.set(key, value);
        }
        this.logger.info(`Configurações carregadas: ${Object.keys(configData).length} itens`);
        this.eventBus.emit('config:loaded', configData);
      }
    };
  }

  /**
   * Configura manipuladores de eventos
   */
  setupEventHandlers() {
    // Eventos do sistema
    this.eventBus.on('system:shutdown', () => {
      this.logger.info('🛑 Iniciando shutdown do sistema...');
      this.shutdown();
    });

    // Eventos dos módulos
    this.moduleActivator.on('modules:activated', (data) => {
      this.logger.info(`🎉 Todos os módulos foram ativados: ${data.modules.join(', ')}`);
      this.eventBus.emit('system:ready');
    });

    this.moduleActivator.on('module:initialized', (data) => {
      this.logger.info(`✅ Módulo inicializado: ${data.name}`);
      this.eventBus.emit('module:ready', data);
    });

    // Tratamento de erros
    this.eventBus.on('error', (error) => {
      this.logger.error('❌ Erro no sistema:', error);
    });

    // Eventos de monitoramento
    this.setupMonitoring();
  }

  /**
   * Configura monitoramento do sistema
   */
  setupMonitoring() {
    // Monitora uso de memória
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memInfo = {
        rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
      };
      
      this.eventBus.emit('system:memory', memInfo);
    }, 30000); // A cada 30 segundos

    // Monitora uptime
    setInterval(() => {
      const uptime = Date.now() - this.startTime.getTime();
      this.eventBus.emit('system:uptime', {
        uptime: uptime,
        uptimeFormatted: this.formatUptime(uptime)
      });
    }, 60000); // A cada minuto
  }

  /**
   * Formata tempo de atividade
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Inicializa o sistema core
   */
  async initialize() {
    try {
      this.logger.info('🚀 Inicializando Fusione Core System...');
      
      // Carrega configurações padrão
      await this.loadDefaultConfigs();
      
      // Inicializa componentes
      this.logger.info('✅ Componentes centrais inicializados');
      
      this.isInitialized = true;
      this.eventBus.emit('core:initialized');
      
      this.logger.info('🎉 Fusione Core System inicializado com sucesso!');
      
    } catch (error) {
      this.logger.error('❌ Erro ao inicializar sistema core:', error);
      throw error;
    }
  }

  /**
   * Carrega configurações padrão
   */
  async loadDefaultConfigs() {
    const defaultConfigs = {
      'system.name': 'Fusione Core System',
      'system.version': '1.0.0',
      'system.environment': 'development',
      'modules.autoStart': true,
      'modules.maxRetries': 3,
      'monitoring.enabled': true,
      'monitoring.interval': 30000,
      'cache.defaultTtl': 3600,
      'database.connectionTimeout': 30000
    };
    
    await this.configManager.load(defaultConfigs);
  }

  /**
   * Ativa todos os módulos
   */
  async activateModules() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      this.logger.info('🔄 Ativando módulos do sistema...');
      const activeModules = await this.moduleActivator.activateAllModules();
      
      return activeModules;
    } catch (error) {
      this.logger.error('❌ Erro ao ativar módulos:', error);
      throw error;
    }
  }

  /**
   * Obtém status completo do sistema
   */
  getSystemStatus() {
    const memUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime.getTime();
    
    return {
      system: {
        name: this.configManager.get('system.name'),
        version: this.configManager.get('system.version'),
        environment: this.configManager.get('system.environment'),
        initialized: this.isInitialized,
        startTime: this.startTime,
        uptime: uptime,
        uptimeFormatted: this.formatUptime(uptime)
      },
      resources: {
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
          external: Math.round(memUsage.external / 1024 / 1024) + 'MB'
        },
        cache: {
          size: this.cacheManager.size(),
          keys: this.cacheManager.keys()
        }
      },
      modules: this.moduleActivator.getModulesStatus(),
      database: {
        connected: this.database.isConnected
      }
    };
  }

  /**
   * Desliga o sistema
   */
  async shutdown() {
    try {
      this.logger.info('🛑 Iniciando shutdown do Fusione Core System...');
      
      // Desativa todos os módulos
      const activeModules = this.moduleActivator.getActiveModules();
      for (const moduleName of activeModules) {
        try {
          await this.moduleActivator.deactivateModule(moduleName);
        } catch (error) {
          this.logger.error(`Erro ao desativar módulo ${moduleName}:`, error);
        }
      }
      
      // Limpa cache
      await this.cacheManager.clear();
      
      this.logger.info('✅ Fusione Core System desligado com sucesso');
      
    } catch (error) {
      this.logger.error('❌ Erro durante shutdown:', error);
      throw error;
    }
  }
}

export { CoreSystem };
export default CoreSystem;