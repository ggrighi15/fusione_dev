/**
 * Módulo de Notificações
 * Demonstra a funcionalidade de módulos do Fusione Core System
 */

export default class NotificationModule {
  constructor(core) {
    this.core = core;
    this.name = 'notification-module';
    this.version = '1.0.0';
    this.description = 'Módulo para gerenciar notificações do sistema';
    this.logger = core.logger;
    this.eventBus = core.eventBus;
    this.cache = core.cache;
    
    // Configurações do módulo
    this.config = {
      maxNotifications: 100,
      defaultTTL: 3600, // 1 hora
      enablePush: true,
      enableEmail: false
    };
    
    // Armazenamento de notificações
    this.notifications = new Map();
    this.subscribers = new Map();
  }

  /**
   * Inicializa o módulo
   */
  async initialize() {
    try {
      this.logger.info('Inicializando módulo de notificações');
      
      // Registrar eventos
      this.registerEvents();
      
      // Carregar configurações do cache se existirem
      await this.loadConfig();
      
      this.logger.info('Módulo de notificações inicializado com sucesso');
      
      // Emitir evento de inicialização
      this.eventBus.emit('module:notification:initialized', {
        module: this.name,
        version: this.version
      });
      
      return true;
    } catch (error) {
      this.logger.error('Erro ao inicializar módulo de notificações', { error });
      throw error;
    }
  }

  /**
   * Registra os eventos do módulo
   */
  registerEvents() {
    // Escutar eventos do sistema
    this.eventBus.on('user:login', this.handleUserLogin.bind(this));
    this.eventBus.on('user:logout', this.handleUserLogout.bind(this));
    this.eventBus.on('system:error', this.handleSystemError.bind(this));
    this.eventBus.on('module:loaded', this.handleModuleLoaded.bind(this));
    
    this.logger.debug('Eventos registrados para o módulo de notificações');
  }

  /**
   * Carrega configurações do cache
   */
  async loadConfig() {
    try {
      const cachedConfig = await this.cache.get('notification:config');
      if (cachedConfig) {
        this.config = { ...this.config, ...cachedConfig };
        this.logger.debug('Configurações carregadas do cache', { config: this.config });
      }
    } catch (error) {
      this.logger.warn('Erro ao carregar configurações do cache', { error });
    }
  }

  /**
   * Salva configurações no cache
   */
  async saveConfig() {
    try {
      await this.cache.set('notification:config', this.config, this.config.defaultTTL);
      this.logger.debug('Configurações salvas no cache');
    } catch (error) {
      this.logger.warn('Erro ao salvar configurações no cache', { error });
    }
  }

  /**
   * Cria uma nova notificação
   */
  async createNotification(data) {
    try {
      const notification = {
        id: this.generateId(),
        type: data.type || 'info',
        title: data.title,
        message: data.message,
        userId: data.userId,
        metadata: data.metadata || {},
        createdAt: new Date().toISOString(),
        read: false,
        priority: data.priority || 'normal'
      };

      // Validar notificação
      this.validateNotification(notification);

      // Armazenar notificação
      this.notifications.set(notification.id, notification);

      // Salvar no cache se disponível
      if (this.cache && typeof this.cache.set === 'function') {
        await this.cache.set(
          `notification:${notification.id}`,
          notification,
          this.config.defaultTTL
        );
      }

      // Limitar número de notificações
      await this.cleanupOldNotifications();

      this.logger.info('Notificação criada', {
        id: notification.id,
        type: notification.type,
        userId: notification.userId
      });

      // Emitir evento
      this.eventBus.emit('notification:created', notification);

      // Enviar notificação se habilitado
      if (this.config.enablePush) {
        await this.sendPushNotification(notification);
      }

      return notification;
    } catch (error) {
      this.logger.error('Erro ao criar notificação', { error, data });
      throw error;
    }
  }

  /**
   * Obtém notificações de um usuário
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        unreadOnly = false,
        type = null
      } = options;

      // Buscar notificações do cache
      const cacheKey = `user:${userId}:notifications`;
      let notifications = await this.cache.get(cacheKey);

      if (!notifications) {
        // Se não estiver no cache, buscar da memória
        notifications = Array.from(this.notifications.values())
          .filter(n => n.userId === userId);

        // Salvar no cache
        await this.cache.set(cacheKey, notifications, 300); // 5 minutos
      }

      // Aplicar filtros
      if (unreadOnly) {
        notifications = notifications.filter(n => !n.read);
      }

      if (type) {
        notifications = notifications.filter(n => n.type === type);
      }

      // Ordenar por data (mais recentes primeiro)
      notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // Aplicar paginação
      const total = notifications.length;
      notifications = notifications.slice(offset, offset + limit);

      return {
        notifications,
        total,
        hasMore: offset + limit < total
      };
    } catch (error) {
      this.logger.error('Erro ao obter notificações do usuário', { error, userId });
      throw error;
    }
  }

  /**
   * Marca notificação como lida
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = this.notifications.get(notificationId);
      
      if (!notification) {
        throw new Error('Notificação não encontrada');
      }

      if (notification.userId !== userId) {
        throw new Error('Acesso negado à notificação');
      }

      notification.read = true;
      notification.readAt = new Date().toISOString();

      // Atualizar no cache
      await this.cache.set(
        `notification:${notificationId}`,
        notification,
        this.config.defaultTTL
      );

      // Invalidar cache do usuário
      await this.cache.del(`user:${userId}:notifications`);

      this.logger.debug('Notificação marcada como lida', {
        id: notificationId,
        userId
      });

      // Emitir evento
      this.eventBus.emit('notification:read', {
        id: notificationId,
        userId
      });

      return notification;
    } catch (error) {
      this.logger.error('Erro ao marcar notificação como lida', {
        error,
        notificationId,
        userId
      });
      throw error;
    }
  }

  /**
   * Subscreve usuário a notificações
   */
  subscribe(userId, callback) {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, new Set());
    }
    
    this.subscribers.get(userId).add(callback);
    
    this.logger.debug('Usuário subscrito a notificações', { userId });
    
    // Retornar função para cancelar subscrição
    return () => {
      const userSubscribers = this.subscribers.get(userId);
      if (userSubscribers) {
        userSubscribers.delete(callback);
        if (userSubscribers.size === 0) {
          this.subscribers.delete(userId);
        }
      }
    };
  }

  /**
   * Envia notificação push
   */
  async sendPushNotification(notification) {
    try {
      const subscribers = this.subscribers.get(notification.userId);
      
      if (subscribers && subscribers.size > 0) {
        for (const callback of subscribers) {
          try {
            await callback(notification);
          } catch (error) {
            this.logger.warn('Erro ao enviar notificação push', {
              error,
              userId: notification.userId
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Erro no envio de notificação push', { error });
    }
  }

  /**
   * Handlers de eventos
   */
  async handleUserLogin(data) {
    await this.createNotification({
      type: 'info',
      title: 'Login realizado',
      message: 'Você fez login no sistema com sucesso',
      userId: data.userId,
      metadata: {
        ip: data.ip,
        userAgent: data.userAgent
      }
    });
  }

  async handleUserLogout(data) {
    await this.createNotification({
      type: 'info',
      title: 'Logout realizado',
      message: 'Você saiu do sistema',
      userId: data.userId
    });
  }

  async handleSystemError(data) {
    // Notificar administradores sobre erros do sistema
    const adminUsers = await this.getAdminUsers();
    
    for (const adminId of adminUsers) {
      await this.createNotification({
        type: 'error',
        title: 'Erro do Sistema',
        message: `Erro detectado: ${data.message}`,
        userId: adminId,
        priority: 'high',
        metadata: data
      });
    }
  }

  async handleModuleLoaded(data) {
    const adminUsers = await this.getAdminUsers();
    
    for (const adminId of adminUsers) {
      await this.createNotification({
        type: 'info',
        title: 'Módulo Carregado',
        message: `Módulo ${data.name} foi carregado com sucesso`,
        userId: adminId,
        metadata: data
      });
    }
  }

  /**
   * Métodos auxiliares
   */
  generateId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  validateNotification(notification) {
    if (!notification.title || !notification.message) {
      throw new Error('Título e mensagem são obrigatórios');
    }
    
    if (!notification.userId) {
      throw new Error('ID do usuário é obrigatório');
    }
    
    const validTypes = ['info', 'warning', 'error', 'success'];
    if (!validTypes.includes(notification.type)) {
      throw new Error('Tipo de notificação inválido');
    }
  }

  async cleanupOldNotifications() {
    if (this.notifications.size > this.config.maxNotifications) {
      const sortedNotifications = Array.from(this.notifications.entries())
        .sort(([,a], [,b]) => new Date(a.createdAt) - new Date(b.createdAt));
      
      const toRemove = sortedNotifications.slice(0, this.notifications.size - this.config.maxNotifications);
      
      for (const [id] of toRemove) {
        this.notifications.delete(id);
        await this.cache.del(`notification:${id}`);
      }
      
      this.logger.debug(`Removidas ${toRemove.length} notificações antigas`);
    }
  }

  async getAdminUsers() {
    // Implementação simplificada - em um sistema real, isso viria do banco de dados
    return ['admin', 'system'];
  }

  /**
   * Obtém estatísticas do módulo
   */
  getStats() {
    return {
      totalNotifications: this.notifications.size,
      activeSubscribers: this.subscribers.size,
      config: this.config,
      uptime: process.uptime()
    };
  }

  /**
   * Atualiza configurações do módulo
   */
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
    
    this.logger.info('Configurações atualizadas', { config: this.config });
    
    this.eventBus.emit('notification:config:updated', this.config);
  }

  /**
   * Finaliza o módulo
   */
  async shutdown() {
    try {
      this.logger.info('Finalizando módulo de notificações');
      
      // Limpar subscribers
      this.subscribers.clear();
      
      // Salvar configurações finais
      await this.saveConfig();
      
      this.logger.info('Módulo de notificações finalizado');
      
      return true;
    } catch (error) {
      this.logger.error('Erro ao finalizar módulo de notificações', { error });
      throw error;
    }
  }
}