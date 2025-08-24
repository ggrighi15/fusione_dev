/**
 * Módulo de API REST
 * Expõe endpoints HTTP para interação com o sistema
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

export default class ApiModule {
  constructor(core) {
    this.core = core;
    this.name = 'api-module';
    this.version = '1.0.0';
    this.description = 'Módulo para exposição de API REST';
    this.logger = core.logger;
    this.eventBus = core.eventBus;
    this.cache = core.cache;
    this.database = core.database;
    
    // Configurações do módulo
    this.config = {
      port: process.env.API_PORT || 3000,
      host: process.env.API_HOST || 'localhost',
      enableCors: true,
      enableHelmet: true,
      enableCompression: true,
      enableRateLimit: true,
      rateLimitWindow: 15 * 60 * 1000, // 15 minutos
      rateLimitMax: 100, // máximo 100 requests por janela
      apiPrefix: '/api/v1',
      enableSwagger: true,
      enableMetrics: true
    };
    
    // Express app
    this.app = null;
    this.server = null;
    
    // Rotas registradas
    this.routes = new Map();
    
    // Middlewares customizados
    this.middlewares = new Map();
    
    // Métricas da API
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      averageResponseTime: 0,
      activeConnections: 0
    };
  }

  /**
   * Inicializa o módulo
   */
  async initialize() {
    try {
      this.logger.info('Inicializando módulo de API');
      
      // Carregar configurações
      await this.loadConfig();
      
      // Configurar Express
      this.setupExpress();
      
      // Configurar middlewares
      this.setupMiddlewares();
      
      // Configurar rotas padrão
      this.setupDefaultRoutes();
      
      // Registrar eventos
      this.registerEvents();
      
      // Iniciar servidor
      await this.startServer();
      
      this.logger.info('Módulo de API inicializado com sucesso', {
        port: this.config.port,
        host: this.config.host
      });
      
      // Emitir evento de inicialização
      this.eventBus.emit('module:api:initialized', {
        module: this.name,
        version: this.version,
        port: this.config.port
      });
      
      return true;
    } catch (error) {
      this.logger.error('Erro ao inicializar módulo de API', { error });
      throw error;
    }
  }

  /**
   * Configura o Express
   */
  setupExpress() {
    this.app = express();
    
    // Configurações básicas
    this.app.set('trust proxy', 1);
    this.app.disable('x-powered-by');
    
    // Parser JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    this.logger.debug('Express configurado');
  }

  /**
   * Configura middlewares
   */
  setupMiddlewares() {
    // Helmet para segurança
    if (this.config.enableHelmet) {
      this.app.use(helmet());
    }
    
    // CORS
    if (this.config.enableCors) {
      this.app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
      }));
    }
    
    // Compressão
    if (this.config.enableCompression) {
      this.app.use(compression());
    }
    
    // Rate limiting
    if (this.config.enableRateLimit) {
      const limiter = rateLimit({
        windowMs: this.config.rateLimitWindow,
        max: this.config.rateLimitMax,
        message: {
          error: 'Muitas requisições, tente novamente mais tarde',
          retryAfter: Math.ceil(this.config.rateLimitWindow / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false
      });
      
      this.app.use(limiter);
    }
    
    // Middleware de logging
    this.app.use(this.createLoggingMiddleware());
    
    // Middleware de métricas
    if (this.config.enableMetrics) {
      this.app.use(this.createMetricsMiddleware());
    }
    
    // Middleware de autenticação
    this.app.use(this.createAuthMiddleware());
    
    this.logger.debug('Middlewares configurados');
  }

  /**
   * Configura rotas padrão
   */
  setupDefaultRoutes() {
    const router = express.Router();
    
    // Health check
    router.get('/health', this.handleHealthCheck.bind(this));
    
    // Status do sistema
    router.get('/status', this.handleSystemStatus.bind(this));
    
    // Métricas
    router.get('/metrics', this.handleMetrics.bind(this));
    
    // Informações da API
    router.get('/info', this.handleApiInfo.bind(this));
    
    // Rotas de autenticação
    router.post('/auth/login', this.handleLogin.bind(this));
    router.post('/auth/logout', this.handleLogout.bind(this));
    router.post('/auth/refresh', this.handleRefreshToken.bind(this));
    router.get('/auth/me', this.handleGetCurrentUser.bind(this));
    
    // Rotas de usuários
    router.get('/users', this.handleGetUsers.bind(this));
    router.get('/users/:id', this.handleGetUser.bind(this));
    router.post('/users', this.handleCreateUser.bind(this));
    router.put('/users/:id', this.handleUpdateUser.bind(this));
    router.delete('/users/:id', this.handleDeleteUser.bind(this));
    
    // Rotas de notificações
    router.get('/notifications', this.handleGetNotifications.bind(this));
    router.post('/notifications', this.handleCreateNotification.bind(this));
    router.put('/notifications/:id/read', this.handleMarkNotificationRead.bind(this));
    
    // Rotas de analytics
    router.get('/analytics/metrics', this.handleGetAnalytics.bind(this));
    router.get('/analytics/dashboard', this.handleGetDashboard.bind(this));
    
    // Usar router com prefixo
    this.app.use(this.config.apiPrefix, router);
    
    // Middleware de erro 404
    this.app.use('*', this.handleNotFound.bind(this));
    
    // Middleware de tratamento de erros
    this.app.use(this.createErrorHandler());
    
    this.logger.debug('Rotas padrão configuradas');
  }

  /**
   * Registra eventos do sistema
   */
  registerEvents() {
    // Eventos de módulos
    this.eventBus.on('module:loaded', this.handleModuleLoaded.bind(this));
    this.eventBus.on('module:unloaded', this.handleModuleUnloaded.bind(this));
    
    // Eventos de sistema
    this.eventBus.on('system:error', this.handleSystemError.bind(this));
    
    this.logger.debug('Eventos registrados para API');
  }

  /**
   * Carrega configurações do cache
   */
  async loadConfig() {
    try {
      const cachedConfig = await this.cache.get('api:config');
      if (cachedConfig) {
        this.config = { ...this.config, ...cachedConfig };
        this.logger.debug('Configurações de API carregadas', { config: this.config });
      }
    } catch (error) {
      this.logger.warn('Erro ao carregar configurações de API', { error });
    }
  }

  /**
   * Inicia o servidor
   */
  async startServer() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, this.config.host, (error) => {
        if (error) {
          reject(error);
        } else {
          this.logger.info(`Servidor API iniciado em http://${this.config.host}:${this.config.port}`);
          resolve();
        }
      });
      
      // Configurar eventos do servidor
      this.server.on('connection', () => {
        this.metrics.activeConnections++;
      });
      
      this.server.on('close', () => {
        this.metrics.activeConnections--;
      });
    });
  }

  /**
   * Middlewares customizados
   */
  createLoggingMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const requestId = this.generateRequestId();
      
      req.requestId = requestId;
      req.startTime = startTime;
      
      // Log da requisição
      this.logger.info('Requisição recebida', {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Emitir evento de início de requisição
      this.eventBus.emit('request:start', {
        requestId,
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      // Interceptar resposta
      const originalSend = res.send;
      res.send = function(data) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Log da resposta
        this.logger.info('Resposta enviada', {
          requestId,
          statusCode: res.statusCode,
          duration,
          responseSize: Buffer.byteLength(data || '')
        });
        
        // Emitir evento de fim de requisição
        this.eventBus.emit('request:end', {
          requestId,
          statusCode: res.statusCode,
          duration,
          responseSize: Buffer.byteLength(data || '')
        });
        
        return originalSend.call(this, data);
      }.bind(this);
      
      next();
    };
  }

  createMetricsMiddleware() {
    return (req, res, next) => {
      this.metrics.totalRequests++;
      
      const startTime = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        // Atualizar tempo médio de resposta
        this.metrics.averageResponseTime = 
          (this.metrics.averageResponseTime * 0.9) + (duration * 0.1);
        
        // Contar erros
        if (res.statusCode >= 400) {
          this.metrics.totalErrors++;
        }
      });
      
      next();
    };
  }

  createAuthMiddleware() {
    return async (req, res, next) => {
      // Rotas que não precisam de autenticação
      const publicRoutes = [
        '/health',
        '/status',
        '/info',
        '/auth/login',
        '/auth/refresh'
      ];
      
      const isPublicRoute = publicRoutes.some(route => 
        req.path.startsWith(this.config.apiPrefix + route)
      );
      
      if (isPublicRoute) {
        return next();
      }
      
      try {
        const token = this.extractToken(req);
        if (!token) {
          return res.status(401).json({
            error: 'Token de acesso requerido',
            code: 'MISSING_TOKEN'
          });
        }
        
        // Validar token usando o módulo de autenticação
        const authModule = this.core.moduleManager.getModule('auth-module');
        if (!authModule) {
          return res.status(500).json({
            error: 'Módulo de autenticação não disponível',
            code: 'AUTH_MODULE_UNAVAILABLE'
          });
        }
        
        const tokenData = await authModule.validateToken(token);
        req.user = tokenData.user;
        req.session = tokenData.session;
        
        next();
      } catch (error) {
        this.logger.warn('Erro na autenticação', { error: error.message });
        res.status(401).json({
          error: 'Token inválido',
          code: 'INVALID_TOKEN'
        });
      }
    };
  }

  createErrorHandler() {
    return (error, req, res, next) => {
      this.logger.error('Erro na API', {
        error,
        requestId: req.requestId,
        method: req.method,
        url: req.url
      });
      
      // Emitir evento de erro
      this.eventBus.emit('error:occurred', {
        type: 'api',
        error: error.message,
        stack: error.stack,
        requestId: req.requestId,
        userId: req.user?.id
      });
      
      // Resposta de erro
      const statusCode = error.statusCode || 500;
      const response = {
        error: error.message || 'Erro interno do servidor',
        code: error.code || 'INTERNAL_ERROR',
        requestId: req.requestId
      };
      
      if (process.env.NODE_ENV === 'development') {
        response.stack = error.stack;
      }
      
      res.status(statusCode).json(response);
    };
  }

  /**
   * Handlers de rotas
   */
  async handleHealthCheck(req, res) {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.version
    });
  }

  async handleSystemStatus(req, res) {
    try {
      const status = {
        system: 'online',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        modules: {},
        services: {
          cache: 'unknown',
          database: 'unknown'
        }
      };
      
      // Status dos módulos
      const modules = this.core.moduleManager.getLoadedModules();
      for (const [name, module] of modules) {
        status.modules[name] = {
          version: module.version,
          status: 'loaded'
        };
      }
      
      // Status dos serviços
      try {
        await this.cache.get('health-check');
        status.services.cache = 'online';
      } catch {
        status.services.cache = 'offline';
      }
      
      res.json(status);
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter status do sistema',
        code: 'STATUS_ERROR'
      });
    }
  }

  async handleMetrics(req, res) {
    try {
      const metrics = {
        api: this.metrics,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        },
        modules: {}
      };
      
      // Métricas dos módulos
      const modules = this.core.moduleManager.getLoadedModules();
      for (const [name, module] of modules) {
        if (typeof module.getStats === 'function') {
          metrics.modules[name] = module.getStats();
        }
      }
      
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao obter métricas',
        code: 'METRICS_ERROR'
      });
    }
  }

  async handleApiInfo(req, res) {
    res.json({
      name: this.name,
      version: this.version,
      description: this.description,
      endpoints: Array.from(this.routes.keys()),
      config: {
        apiPrefix: this.config.apiPrefix,
        enableCors: this.config.enableCors,
        enableRateLimit: this.config.enableRateLimit
      }
    });
  }

  /**
   * Handlers de autenticação
   */
  async handleLogin(req, res) {
    try {
      const authModule = this.core.moduleManager.getModule('auth-module');
      if (!authModule) {
        return res.status(500).json({
          error: 'Módulo de autenticação não disponível',
          code: 'AUTH_MODULE_UNAVAILABLE'
        });
      }
      
      const credentials = {
        ...req.body,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      };
      
      const result = await authModule.login(credentials);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(401).json({
        error: error.message,
        code: 'LOGIN_FAILED'
      });
    }
  }

  async handleLogout(req, res) {
    try {
      const authModule = this.core.moduleManager.getModule('auth-module');
      if (!authModule) {
        return res.status(500).json({
          error: 'Módulo de autenticação não disponível',
          code: 'AUTH_MODULE_UNAVAILABLE'
        });
      }
      
      await authModule.logout(req.session.id);
      
      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        code: 'LOGOUT_FAILED'
      });
    }
  }

  async handleRefreshToken(req, res) {
    try {
      const authModule = this.core.moduleManager.getModule('auth-module');
      if (!authModule) {
        return res.status(500).json({
          error: 'Módulo de autenticação não disponível',
          code: 'AUTH_MODULE_UNAVAILABLE'
        });
      }
      
      const { refreshToken } = req.body;
      const result = await authModule.refreshToken(refreshToken);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(401).json({
        error: error.message,
        code: 'REFRESH_FAILED'
      });
    }
  }

  async handleGetCurrentUser(req, res) {
    res.json({
      success: true,
      data: req.user
    });
  }

  /**
   * Handlers de usuários
   */
  async handleGetUsers(req, res) {
    try {
      // Verificar permissão
      const authModule = this.core.moduleManager.getModule('auth-module');
      const hasPermission = await authModule.checkPermission(req.user.id, 'read');
      
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Permissão negada',
          code: 'PERMISSION_DENIED'
        });
      }
      
      // Implementação simplificada
      res.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0
        }
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        code: 'GET_USERS_FAILED'
      });
    }
  }

  async handleGetUser(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar se é o próprio usuário ou tem permissão
      if (req.user.id !== id) {
        const authModule = this.core.moduleManager.getModule('auth-module');
        const hasPermission = await authModule.checkPermission(req.user.id, 'read');
        
        if (!hasPermission) {
          return res.status(403).json({
            error: 'Permissão negada',
            code: 'PERMISSION_DENIED'
          });
        }
      }
      
      // Implementação simplificada
      res.json({
        success: true,
        data: req.user
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        code: 'GET_USER_FAILED'
      });
    }
  }

  async handleCreateUser(req, res) {
    try {
      const authModule = this.core.moduleManager.getModule('auth-module');
      if (!authModule) {
        return res.status(500).json({
          error: 'Módulo de autenticação não disponível',
          code: 'AUTH_MODULE_UNAVAILABLE'
        });
      }
      
      const user = await authModule.register(req.body);
      
      res.status(201).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        error: error.message,
        code: 'CREATE_USER_FAILED'
      });
    }
  }

  async handleUpdateUser(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar se é o próprio usuário ou tem permissão
      if (req.user.id !== id) {
        const authModule = this.core.moduleManager.getModule('auth-module');
        const hasPermission = await authModule.checkPermission(req.user.id, 'write');
        
        if (!hasPermission) {
          return res.status(403).json({
            error: 'Permissão negada',
            code: 'PERMISSION_DENIED'
          });
        }
      }
      
      // Implementação simplificada
      res.json({
        success: true,
        data: { ...req.user, ...req.body, id }
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        code: 'UPDATE_USER_FAILED'
      });
    }
  }

  async handleDeleteUser(req, res) {
    try {
      const { id } = req.params;
      
      const authModule = this.core.moduleManager.getModule('auth-module');
      const hasPermission = await authModule.checkPermission(req.user.id, 'write');
      
      if (!hasPermission) {
        return res.status(403).json({
          error: 'Permissão negada',
          code: 'PERMISSION_DENIED'
        });
      }
      
      // Implementação simplificada
      res.json({
        success: true,
        message: 'Usuário deletado com sucesso'
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        code: 'DELETE_USER_FAILED'
      });
    }
  }

  /**
   * Handlers de notificações
   */
  async handleGetNotifications(req, res) {
    try {
      const notificationModule = this.core.moduleManager.getModule('notification-module');
      if (!notificationModule) {
        return res.status(500).json({
          error: 'Módulo de notificações não disponível',
          code: 'NOTIFICATION_MODULE_UNAVAILABLE'
        });
      }
      
      const notifications = await notificationModule.getNotifications(req.user.id);
      
      res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        code: 'GET_NOTIFICATIONS_FAILED'
      });
    }
  }

  async handleCreateNotification(req, res) {
    try {
      const notificationModule = this.core.moduleManager.getModule('notification-module');
      if (!notificationModule) {
        return res.status(500).json({
          error: 'Módulo de notificações não disponível',
          code: 'NOTIFICATION_MODULE_UNAVAILABLE'
        });
      }
      
      const notification = await notificationModule.createNotification({
        ...req.body,
        createdBy: req.user.id
      });
      
      res.status(201).json({
        success: true,
        data: notification
      });
    } catch (error) {
      res.status(400).json({
        error: error.message,
        code: 'CREATE_NOTIFICATION_FAILED'
      });
    }
  }

  async handleMarkNotificationRead(req, res) {
    try {
      const { id } = req.params;
      
      const notificationModule = this.core.moduleManager.getModule('notification-module');
      if (!notificationModule) {
        return res.status(500).json({
          error: 'Módulo de notificações não disponível',
          code: 'NOTIFICATION_MODULE_UNAVAILABLE'
        });
      }
      
      await notificationModule.markAsRead(id, req.user.id);
      
      res.json({
        success: true,
        message: 'Notificação marcada como lida'
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        code: 'MARK_NOTIFICATION_READ_FAILED'
      });
    }
  }

  /**
   * Handlers de analytics
   */
  async handleGetAnalytics(req, res) {
    try {
      const analyticsModule = this.core.moduleManager.getModule('analytics-module');
      if (!analyticsModule) {
        return res.status(500).json({
          error: 'Módulo de analytics não disponível',
          code: 'ANALYTICS_MODULE_UNAVAILABLE'
        });
      }
      
      const { timeRange = '1h', metricType = 'all' } = req.query;
      const metrics = await analyticsModule.getMetrics(timeRange, metricType);
      
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        code: 'GET_ANALYTICS_FAILED'
      });
    }
  }

  async handleGetDashboard(req, res) {
    try {
      const analyticsModule = this.core.moduleManager.getModule('analytics-module');
      if (!analyticsModule) {
        return res.status(500).json({
          error: 'Módulo de analytics não disponível',
          code: 'ANALYTICS_MODULE_UNAVAILABLE'
        });
      }
      
      const dashboard = {
        overview: await analyticsModule.getMetrics('24h', 'all'),
        realTime: analyticsModule.getStats()
      };
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        code: 'GET_DASHBOARD_FAILED'
      });
    }
  }

  async handleNotFound(req, res) {
    res.status(404).json({
      error: 'Endpoint não encontrado',
      code: 'NOT_FOUND',
      path: req.path
    });
  }

  /**
   * Handlers de eventos
   */
  handleModuleLoaded(data) {
    this.logger.info('Módulo carregado', { module: data.module });
  }

  handleModuleUnloaded(data) {
    this.logger.info('Módulo descarregado', { module: data.module });
  }

  handleSystemError(data) {
    this.logger.error('Erro do sistema', data);
  }

  /**
   * Métodos auxiliares
   */
  extractToken(req) {
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Registra uma nova rota
   */
  registerRoute(method, path, handler, middleware = []) {
    const fullPath = this.config.apiPrefix + path;
    const routeKey = `${method.toUpperCase()} ${fullPath}`;
    
    this.routes.set(routeKey, {
      method,
      path: fullPath,
      handler,
      middleware
    });
    
    // Registrar no Express
    this.app[method.toLowerCase()](fullPath, ...middleware, handler);
    
    this.logger.debug('Rota registrada', { method, path: fullPath });
  }

  /**
   * Remove uma rota
   */
  unregisterRoute(method, path) {
    const fullPath = this.config.apiPrefix + path;
    const routeKey = `${method.toUpperCase()} ${fullPath}`;
    
    this.routes.delete(routeKey);
    
    this.logger.debug('Rota removida', { method, path: fullPath });
  }

  /**
   * Obtém estatísticas do módulo
   */
  getStats() {
    return {
      metrics: this.metrics,
      routes: this.routes.size,
      middlewares: this.middlewares.size,
      server: {
        listening: this.server?.listening || false,
        port: this.config.port,
        host: this.config.host
      }
    };
  }

  /**
   * Atualiza configurações
   */
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Salvar no cache
    await this.cache.set('api:config', this.config, 86400);
    
    this.logger.info('Configurações de API atualizadas', { config: this.config });
    
    this.eventBus.emit('api:config:updated', this.config);
  }

  /**
   * Finaliza o módulo
   */
  async shutdown() {
    try {
      this.logger.info('Finalizando módulo de API');
      
      // Fechar servidor
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
      }
      
      // Limpar dados
      this.routes.clear();
      this.middlewares.clear();
      
      this.logger.info('Módulo de API finalizado');
      
      return true;
    } catch (error) {
      this.logger.error('Erro ao finalizar módulo de API', { error });
      throw error;
    }
  }
}