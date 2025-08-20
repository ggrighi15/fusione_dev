/**
 * Módulo de Exemplo - Fusione Core System
 * 
 * Este módulo demonstra como criar e implementar módulos
 * para o Fusione Core System.
 */

export default class ExampleModule {
  constructor({ eventBus, logger, config }) {
    this.eventBus = eventBus;
    this.logger = logger.child({ service: 'ExampleModule' });
    this.config = config;
    this.isRunning = false;
    this.intervalId = null;
    this.stats = {
      startTime: null,
      eventsProcessed: 0,
      lastActivity: null
    };
  }

  /**
   * Inicializa o módulo
   */
  async initialize() {
    try {
      this.logger.info('Inicializando módulo de exemplo...');
      
      // Registrar listeners de eventos
      this.setupEventListeners();
      
      // Configurar estatísticas
      this.stats.startTime = new Date();
      
      // Emitir evento de inicialização
      this.eventBus.emit('module:example:initialized', {
        module: 'example-module',
        timestamp: new Date(),
        config: this.getModuleConfig()
      });
      
      this.logger.info('Módulo de exemplo inicializado com sucesso');
      
    } catch (error) {
      this.logger.error('Erro ao inicializar módulo de exemplo:', error);
      throw error;
    }
  }

  /**
   * Inicia o módulo
   */
  async start() {
    if (this.isRunning) {
      this.logger.warn('Módulo já está em execução');
      return;
    }

    try {
      this.logger.info('Iniciando módulo de exemplo...');
      
      this.isRunning = true;
      
      // Iniciar processo periódico
      this.startPeriodicTask();
      
      // Emitir evento de início
      this.eventBus.emit('module:example:started', {
        module: 'example-module',
        timestamp: new Date()
      });
      
      this.logger.info('Módulo de exemplo iniciado');
      
    } catch (error) {
      this.logger.error('Erro ao iniciar módulo de exemplo:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Para o módulo
   */
  async stop() {
    if (!this.isRunning) {
      this.logger.warn('Módulo já está parado');
      return;
    }

    try {
      this.logger.info('Parando módulo de exemplo...');
      
      this.isRunning = false;
      
      // Parar processo periódico
      this.stopPeriodicTask();
      
      // Emitir evento de parada
      this.eventBus.emit('module:example:stopped', {
        module: 'example-module',
        timestamp: new Date(),
        stats: this.getStats()
      });
      
      this.logger.info('Módulo de exemplo parado');
      
    } catch (error) {
      this.logger.error('Erro ao parar módulo de exemplo:', error);
      throw error;
    }
  }

  /**
   * Limpa recursos do módulo
   */
  async cleanup() {
    try {
      this.logger.info('Limpando recursos do módulo de exemplo...');
      
      // Parar se estiver rodando
      if (this.isRunning) {
        await this.stop();
      }
      
      // Remover todos os listeners
      this.eventBus.removeAllListeners('system:shutdown');
      this.eventBus.removeAllListeners('config:changed');
      
      // Emitir evento de limpeza
      this.eventBus.emit('module:example:cleanup', {
        module: 'example-module',
        timestamp: new Date(),
        finalStats: this.getStats()
      });
      
      this.logger.info('Recursos do módulo de exemplo limpos');
      
    } catch (error) {
      this.logger.error('Erro ao limpar recursos do módulo de exemplo:', error);
      throw error;
    }
  }

  /**
   * Configura os listeners de eventos
   */
  setupEventListeners() {
    // Listener para shutdown do sistema
    this.eventBus.on('system:shutdown', this.onSystemShutdown.bind(this));
    
    // Listener para mudanças de configuração
    this.eventBus.on('config:changed', this.onConfigChanged.bind(this));
    
    // Listener para eventos de teste
    this.eventBus.on('test:ping', this.onTestPing.bind(this));
    
    this.logger.debug('Event listeners configurados');
  }

  /**
   * Inicia tarefa periódica
   */
  startPeriodicTask() {
    const interval = this.getModuleConfig().settings?.interval || 5000;
    
    this.intervalId = setInterval(() => {
      this.performPeriodicTask();
    }, interval);
    
    this.logger.debug(`Tarefa periódica iniciada com intervalo de ${interval}ms`);
  }

  /**
   * Para tarefa periódica
   */
  stopPeriodicTask() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.logger.debug('Tarefa periódica parada');
    }
  }

  /**
   * Executa tarefa periódica
   */
  performPeriodicTask() {
    try {
      this.stats.lastActivity = new Date();
      this.stats.eventsProcessed++;
      
      // Emitir evento de heartbeat
      this.eventBus.emit('module:example:heartbeat', {
        module: 'example-module',
        timestamp: this.stats.lastActivity,
        stats: this.getStats()
      });
      
      this.logger.debug('Tarefa periódica executada');
      
    } catch (error) {
      this.logger.error('Erro na tarefa periódica:', error);
    }
  }

  /**
   * Handler para shutdown do sistema
   */
  onSystemShutdown(data) {
    this.logger.info('Recebido sinal de shutdown do sistema', data);
    this.stop().catch(error => {
      this.logger.error('Erro ao parar módulo durante shutdown:', error);
    });
  }

  /**
   * Handler para mudanças de configuração
   */
  onConfigChanged(data) {
    this.logger.info('Configuração alterada', data);
    
    // Reconfigurar se necessário
    if (data.key && data.key.startsWith('modules.example-module')) {
      this.logger.info('Reconfigurando módulo...');
      // Implementar lógica de reconfiguração aqui
    }
  }

  /**
   * Handler para eventos de teste
   */
  onTestPing(data) {
    this.logger.debug('Recebido ping de teste', data);
    
    // Responder com pong
    this.eventBus.emit('test:pong', {
      module: 'example-module',
      originalData: data,
      timestamp: new Date(),
      response: 'pong from example module'
    });
  }

  /**
   * Retorna informações do módulo
   */
  getInfo() {
    return {
      name: 'example-module',
      version: '1.0.0',
      status: this.isRunning ? 'running' : 'stopped',
      stats: this.getStats(),
      config: this.getModuleConfig(),
      health: this.getHealthStatus()
    };
  }

  /**
   * Retorna estatísticas do módulo
   */
  getStats() {
    const uptime = this.stats.startTime ? 
      Date.now() - this.stats.startTime.getTime() : 0;
    
    return {
      ...this.stats,
      uptime,
      uptimeFormatted: this.formatUptime(uptime)
    };
  }

  /**
   * Retorna configuração do módulo
   */
  getModuleConfig() {
    return this.config.get('modules.example-module', {
      enabled: true,
      autoStart: true,
      settings: {
        interval: 5000,
        maxRetries: 3
      }
    });
  }

  /**
   * Retorna status de saúde do módulo
   */
  getHealthStatus() {
    const now = Date.now();
    const lastActivity = this.stats.lastActivity ? 
      this.stats.lastActivity.getTime() : now;
    const timeSinceLastActivity = now - lastActivity;
    
    // Considera saudável se a última atividade foi há menos de 30 segundos
    const isHealthy = timeSinceLastActivity < 30000;
    
    return {
      status: isHealthy ? 'healthy' : 'warning',
      lastActivity: this.stats.lastActivity,
      timeSinceLastActivity,
      isRunning: this.isRunning,
      checks: {
        recentActivity: isHealthy,
        processRunning: this.isRunning
      }
    };
  }

  /**
   * Formata tempo de uptime
   */
  formatUptime(uptimeMs) {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Método para executar comandos customizados
   */
  async executeCommand(command, params = {}) {
    this.logger.info(`Executando comando: ${command}`, params);
    
    switch (command) {
      case 'ping':
        return { response: 'pong', timestamp: new Date() };
      
      case 'stats':
        return this.getStats();
      
      case 'health':
        return this.getHealthStatus();
      
      case 'restart':
        await this.stop();
        await this.start();
        return { message: 'Módulo reiniciado', timestamp: new Date() };
      
      default:
        throw new Error(`Comando desconhecido: ${command}`);
    }
  }
}