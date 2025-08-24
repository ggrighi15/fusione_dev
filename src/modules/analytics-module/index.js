/**
 * Módulo de Analytics
 * Coleta e analisa métricas do sistema
 */

export default class AnalyticsModule {
  constructor(core) {
    this.core = core;
    this.name = 'analytics-module';
    this.version = '1.0.0';
    this.description = 'Módulo para coleta e análise de métricas do sistema';
    this.logger = core.logger;
    this.eventBus = core.eventBus;
    this.cache = core.cache;
    this.database = core.database;
    
    // Configurações do módulo
    this.config = {
      enableRealTimeMetrics: true,
      metricsRetentionDays: 30,
      aggregationInterval: 60000, // 1 minuto
      enableUserTracking: true,
      enablePerformanceTracking: true
    };
    
    // Armazenamento de métricas em memória
    this.metrics = {
      requests: new Map(),
      users: new Map(),
      errors: new Map(),
      performance: new Map()
    };
    
    // Contadores em tempo real
    this.counters = {
      totalRequests: 0,
      activeUsers: 0,
      totalErrors: 0,
      avgResponseTime: 0
    };
    
    // Intervalos de agregação
    this.intervals = new Map();
  }

  /**
   * Inicializa o módulo
   */
  async initialize() {
    try {
      this.logger.info('Inicializando módulo de analytics');
      
      // Registrar eventos
      this.registerEvents();
      
      // Carregar configurações
      await this.loadConfig();
      
      // Iniciar coleta de métricas
      if (this.config.enableRealTimeMetrics) {
        this.startMetricsCollection();
      }
      
      // Carregar dados históricos
      await this.loadHistoricalData();
      
      this.logger.info('Módulo de analytics inicializado com sucesso');
      
      // Emitir evento de inicialização
      this.eventBus.emit('module:analytics:initialized', {
        module: this.name,
        version: this.version
      });
      
      return true;
    } catch (error) {
      this.logger.error('Erro ao inicializar módulo de analytics', { error });
      throw error;
    }
  }

  /**
   * Registra eventos do sistema
   */
  registerEvents() {
    // Eventos de requisições
    this.eventBus.on('request:start', this.handleRequestStart.bind(this));
    this.eventBus.on('request:end', this.handleRequestEnd.bind(this));
    
    // Eventos de usuários
    this.eventBus.on('user:login', this.handleUserLogin.bind(this));
    this.eventBus.on('user:logout', this.handleUserLogout.bind(this));
    this.eventBus.on('user:action', this.handleUserAction.bind(this));
    
    // Eventos de erros
    this.eventBus.on('error:occurred', this.handleError.bind(this));
    this.eventBus.on('system:error', this.handleSystemError.bind(this));
    
    // Eventos de performance
    this.eventBus.on('performance:metric', this.handlePerformanceMetric.bind(this));
    
    this.logger.debug('Eventos registrados para analytics');
  }

  /**
   * Carrega configurações do cache
   */
  async loadConfig() {
    try {
      const cachedConfig = await this.cache.get('analytics:config');
      if (cachedConfig) {
        this.config = { ...this.config, ...cachedConfig };
        this.logger.debug('Configurações de analytics carregadas', { config: this.config });
      }
    } catch (error) {
      this.logger.warn('Erro ao carregar configurações de analytics', { error });
    }
  }

  /**
   * Carrega dados históricos
   */
  async loadHistoricalData() {
    try {
      // Carregar contadores do cache
      const cachedCounters = await this.cache.get('analytics:counters');
      if (cachedCounters) {
        this.counters = { ...this.counters, ...cachedCounters };
      }
      
      this.logger.debug('Dados históricos carregados', { counters: this.counters });
    } catch (error) {
      this.logger.warn('Erro ao carregar dados históricos', { error });
    }
  }

  /**
   * Inicia coleta de métricas em tempo real
   */
  startMetricsCollection() {
    // Agregação de métricas a cada minuto
    const aggregationInterval = setInterval(() => {
      this.aggregateMetrics();
    }, this.config.aggregationInterval);
    
    this.intervals.set('aggregation', aggregationInterval);
    
    // Limpeza de dados antigos a cada hora
    const cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 3600000); // 1 hora
    
    this.intervals.set('cleanup', cleanupInterval);
    
    this.logger.debug('Coleta de métricas iniciada');
  }

  /**
   * Handlers de eventos
   */
  handleRequestStart(data) {
    const requestId = data.requestId || this.generateId();
    const timestamp = Date.now();
    
    this.metrics.requests.set(requestId, {
      id: requestId,
      method: data.method,
      url: data.url,
      startTime: timestamp,
      userAgent: data.userAgent,
      ip: data.ip
    });
    
    this.counters.totalRequests++;
  }

  handleRequestEnd(data) {
    const request = this.metrics.requests.get(data.requestId);
    if (request) {
      const endTime = Date.now();
      const duration = endTime - request.startTime;
      
      request.endTime = endTime;
      request.duration = duration;
      request.statusCode = data.statusCode;
      request.responseSize = data.responseSize;
      
      // Atualizar tempo médio de resposta
      this.updateAverageResponseTime(duration);
      
      // Salvar métrica agregada
      this.saveRequestMetric(request);
    }
  }

  handleUserLogin(data) {
    const userId = data.userId;
    const timestamp = Date.now();
    
    this.metrics.users.set(userId, {
      userId,
      loginTime: timestamp,
      ip: data.ip,
      userAgent: data.userAgent,
      sessionId: data.sessionId
    });
    
    this.counters.activeUsers++;
    
    // Salvar evento de login
    this.saveUserEvent('login', data);
  }

  handleUserLogout(data) {
    const user = this.metrics.users.get(data.userId);
    if (user) {
      const sessionDuration = Date.now() - user.loginTime;
      
      // Salvar evento de logout com duração da sessão
      this.saveUserEvent('logout', {
        ...data,
        sessionDuration
      });
      
      this.metrics.users.delete(data.userId);
      this.counters.activeUsers--;
    }
  }

  handleUserAction(data) {
    // Rastrear ações do usuário
    this.saveUserEvent('action', data);
  }

  handleError(data) {
    const errorId = this.generateId();
    const timestamp = Date.now();
    
    this.metrics.errors.set(errorId, {
      id: errorId,
      timestamp,
      type: data.type || 'unknown',
      message: data.message,
      stack: data.stack,
      userId: data.userId,
      requestId: data.requestId
    });
    
    this.counters.totalErrors++;
    
    // Salvar erro no banco de dados
    this.saveErrorMetric({
      id: errorId,
      timestamp,
      ...data
    });
  }

  handleSystemError(data) {
    this.handleError({
      ...data,
      type: 'system'
    });
  }

  handlePerformanceMetric(data) {
    const metricId = this.generateId();
    const timestamp = Date.now();
    
    this.metrics.performance.set(metricId, {
      id: metricId,
      timestamp,
      name: data.name,
      value: data.value,
      unit: data.unit,
      tags: data.tags || {}
    });
    
    // Salvar métrica de performance
    this.savePerformanceMetric({
      id: metricId,
      timestamp,
      ...data
    });
  }

  /**
   * Métodos de persistência
   */
  async saveRequestMetric(request) {
    try {
      const metric = {
        timestamp: request.endTime,
        type: 'request',
        data: {
          method: request.method,
          url: request.url,
          duration: request.duration,
          statusCode: request.statusCode,
          responseSize: request.responseSize
        }
      };
      
      // Salvar no cache se disponível
      if (this.cache && typeof this.cache.set === 'function') {
        await this.cache.set(
          `analytics:request:${request.id}`,
          metric,
          86400 // 24 horas
        );
      }
    } catch (error) {
      this.logger.warn('Erro ao salvar métrica de requisição', { 
        module: this.name,
        error: error.message || 'Erro desconhecido'
      });
    }
  }

  async saveUserEvent(eventType, data) {
    try {
      const event = {
        timestamp: Date.now(),
        type: 'user_event',
        eventType,
        data
      };
      
      // Salvar no cache se disponível
      if (this.cache && typeof this.cache.set === 'function') {
        await this.cache.set(
          `analytics:user_event:${this.generateId()}`,
          event,
          86400 // 24 horas
        );
      }
    } catch (error) {
      this.logger.warn('Erro ao salvar evento de usuário', { 
        module: this.name,
        error: error.message || 'Erro desconhecido'
      });
    }
  }

  async saveErrorMetric(error) {
    try {
      const metric = {
        timestamp: error.timestamp,
        type: 'error',
        data: error
      };
      
      // Salvar no cache se disponível
      if (this.cache && typeof this.cache.set === 'function') {
        await this.cache.set(
          `analytics:error:${error.id}`,
          metric,
          604800 // 7 dias
        );
      }
    } catch (error) {
      this.logger.warn('Erro ao salvar métrica de erro', { 
        module: this.name,
        error: error.message || 'Erro desconhecido'
      });
    }
  }

  async savePerformanceMetric(metric) {
    try {
      const data = {
        timestamp: metric.timestamp,
        type: 'performance',
        data: metric
      };
      
      // Salvar no cache se disponível
      if (this.cache && typeof this.cache.set === 'function') {
        await this.cache.set(
          `analytics:performance:${metric.id}`,
          data,
          86400 // 24 horas
        );
      }
    } catch (error) {
      this.logger.warn('Erro ao salvar métrica de performance', { 
        module: this.name,
        error: error.message || 'Erro desconhecido'
      });
    }
  }

  /**
   * Métodos de análise
   */
  async getMetrics(timeRange = '1h', metricType = 'all') {
    try {
      const endTime = Date.now();
      const startTime = this.parseTimeRange(timeRange, endTime);
      
      const metrics = {
        timeRange: { start: startTime, end: endTime },
        counters: this.counters,
        data: {}
      };
      
      if (metricType === 'all' || metricType === 'requests') {
        metrics.data.requests = await this.getRequestMetrics(startTime, endTime);
      }
      
      if (metricType === 'all' || metricType === 'users') {
        metrics.data.users = await this.getUserMetrics(startTime, endTime);
      }
      
      if (metricType === 'all' || metricType === 'errors') {
        metrics.data.errors = await this.getErrorMetrics(startTime, endTime);
      }
      
      if (metricType === 'all' || metricType === 'performance') {
        metrics.data.performance = await this.getPerformanceMetrics(startTime, endTime);
      }
      
      return metrics;
    } catch (error) {
      this.logger.error('Erro ao obter métricas', { error });
      throw error;
    }
  }

  async getRequestMetrics(startTime, endTime) {
    // Implementação simplificada - buscar do cache
    const requests = [];
    
    for (const [id, request] of this.metrics.requests) {
      if (request.endTime >= startTime && request.endTime <= endTime) {
        requests.push(request);
      }
    }
    
    return {
      total: requests.length,
      avgDuration: this.calculateAverage(requests.map(r => r.duration)),
      statusCodes: this.groupBy(requests, 'statusCode'),
      methods: this.groupBy(requests, 'method'),
      topUrls: this.getTopItems(requests, 'url', 10)
    };
  }

  async getUserMetrics(startTime, endTime) {
    const activeUsers = Array.from(this.metrics.users.values());
    
    return {
      activeUsers: activeUsers.length,
      totalSessions: activeUsers.length, // Simplificado
      avgSessionDuration: this.calculateAverageSessionDuration(activeUsers)
    };
  }

  async getErrorMetrics(startTime, endTime) {
    const errors = [];
    
    for (const [id, error] of this.metrics.errors) {
      if (error.timestamp >= startTime && error.timestamp <= endTime) {
        errors.push(error);
      }
    }
    
    return {
      total: errors.length,
      byType: this.groupBy(errors, 'type'),
      topErrors: this.getTopItems(errors, 'message', 5)
    };
  }

  async getPerformanceMetrics(startTime, endTime) {
    const metrics = [];
    
    for (const [id, metric] of this.metrics.performance) {
      if (metric.timestamp >= startTime && metric.timestamp <= endTime) {
        metrics.push(metric);
      }
    }
    
    return {
      total: metrics.length,
      byName: this.groupBy(metrics, 'name'),
      averages: this.calculateMetricAverages(metrics)
    };
  }

  /**
   * Métodos de agregação
   */
  async aggregateMetrics() {
    try {
      // Salvar contadores atuais no cache (se disponível)
      if (this.cache && typeof this.cache.set === 'function') {
        await this.cache.set('analytics:counters', this.counters, 3600);
      }
      
      // Emitir evento com métricas atuais
      this.eventBus.emit('analytics:metrics:aggregated', {
        timestamp: Date.now(),
        counters: this.counters,
        activeMetrics: {
          requests: this.metrics.requests.size,
          users: this.metrics.users.size,
          errors: this.metrics.errors.size,
          performance: this.metrics.performance.size
        }
      });
      
      this.logger.debug('Métricas agregadas', { counters: this.counters });
    } catch (error) {
      this.logger.warn('Erro ao agregar métricas', { 
        module: this.name,
        error: error.message || 'Erro desconhecido'
      });
    }
  }

  async cleanupOldData() {
    try {
      const cutoffTime = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
      
      // Limpar requisições antigas
      for (const [id, request] of this.metrics.requests) {
        if (request.endTime && request.endTime < cutoffTime) {
          this.metrics.requests.delete(id);
        }
      }
      
      // Limpar erros antigos
      for (const [id, error] of this.metrics.errors) {
        if (error.timestamp < cutoffTime) {
          this.metrics.errors.delete(id);
        }
      }
      
      // Limpar métricas de performance antigas
      for (const [id, metric] of this.metrics.performance) {
        if (metric.timestamp < cutoffTime) {
          this.metrics.performance.delete(id);
        }
      }
      
      this.logger.debug('Dados antigos limpos');
    } catch (error) {
      this.logger.warn('Erro ao limpar dados antigos', { error });
    }
  }

  /**
   * Métodos auxiliares
   */
  generateId() {
    return `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  parseTimeRange(timeRange, endTime) {
    const units = {
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };
    
    const match = timeRange.match(/^(\d+)([mhd])$/);
    if (!match) {
      throw new Error('Formato de tempo inválido');
    }
    
    const [, amount, unit] = match;
    return endTime - (parseInt(amount) * units[unit]);
  }

  updateAverageResponseTime(duration) {
    // Cálculo simplificado de média móvel
    if (this.counters.avgResponseTime === 0) {
      this.counters.avgResponseTime = duration;
    } else {
      this.counters.avgResponseTime = (this.counters.avgResponseTime * 0.9) + (duration * 0.1);
    }
  }

  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  calculateAverageSessionDuration(users) {
    const currentTime = Date.now();
    const durations = users.map(user => currentTime - user.loginTime);
    return this.calculateAverage(durations);
  }

  calculateMetricAverages(metrics) {
    const grouped = this.groupBy(metrics, 'name');
    const averages = {};
    
    for (const [name, items] of Object.entries(grouped)) {
      averages[name] = this.calculateAverage(items.map(item => item.value));
    }
    
    return averages;
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = (groups[group] || 0) + 1;
      return groups;
    }, {});
  }

  getTopItems(array, key, limit = 10) {
    const counts = {};
    
    array.forEach(item => {
      const value = item[key] || 'unknown';
      counts[value] = (counts[value] || 0) + 1;
    });
    
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([item, count]) => ({ item, count }));
  }

  /**
   * Obtém estatísticas do módulo
   */
  getStats() {
    return {
      counters: this.counters,
      metricsInMemory: {
        requests: this.metrics.requests.size,
        users: this.metrics.users.size,
        errors: this.metrics.errors.size,
        performance: this.metrics.performance.size
      },
      config: this.config,
      uptime: process.uptime()
    };
  }

  /**
   * Atualiza configurações
   */
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Salvar no cache
    await this.cache.set('analytics:config', this.config, 86400);
    
    this.logger.info('Configurações de analytics atualizadas', { config: this.config });
    
    // Reiniciar coleta se necessário
    if (newConfig.enableRealTimeMetrics !== undefined) {
      if (newConfig.enableRealTimeMetrics && !this.intervals.has('aggregation')) {
        this.startMetricsCollection();
      } else if (!newConfig.enableRealTimeMetrics && this.intervals.has('aggregation')) {
        this.stopMetricsCollection();
      }
    }
    
    this.eventBus.emit('analytics:config:updated', this.config);
  }

  /**
   * Para coleta de métricas
   */
  stopMetricsCollection() {
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
    }
    this.intervals.clear();
    
    this.logger.debug('Coleta de métricas parada');
  }

  /**
   * Finaliza o módulo
   */
  async shutdown() {
    try {
      this.logger.info('Finalizando módulo de analytics');
      
      // Parar coleta de métricas
      this.stopMetricsCollection();
      
      // Salvar dados finais
      await this.aggregateMetrics();
      
      // Limpar dados em memória
      this.metrics.requests.clear();
      this.metrics.users.clear();
      this.metrics.errors.clear();
      this.metrics.performance.clear();
      
      this.logger.info('Módulo de analytics finalizado');
      
      return true;
    } catch (error) {
      this.logger.error('Erro ao finalizar módulo de analytics', { error });
      throw error;
    }
  }
}