/**
 * Módulo de Autenticação
 * Gerencia autenticação, autorização e sessões de usuários
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export default class AuthModule {
  constructor(core) {
    this.core = core;
    this.name = 'auth-module';
    this.version = '1.0.0';
    this.description = 'Módulo para autenticação e autorização de usuários';
    this.logger = core.logger;
    this.eventBus = core.eventBus;
    this.cache = core.cache;
    this.database = core.database;
    
    // Configurações do módulo
    this.config = {
      jwtSecret: process.env.JWT_SECRET || 'fusione-default-secret',
      jwtExpiresIn: '24h',
      refreshTokenExpiresIn: '7d',
      bcryptRounds: 12,
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutos
      sessionTimeout: 30 * 60 * 1000, // 30 minutos
      enableTwoFactor: false,
      passwordMinLength: 8,
      passwordRequireSpecialChars: true
    };
    
    // Armazenamento de sessões ativas
    this.activeSessions = new Map();
    
    // Tentativas de login
    this.loginAttempts = new Map();
    
    // Tokens de refresh
    this.refreshTokens = new Map();
  }

  /**
   * Inicializa o módulo
   */
  async initialize() {
    try {
      this.logger.info('Inicializando módulo de autenticação');
      
      // Registrar eventos
      this.registerEvents();
      
      // Carregar configurações
      await this.loadConfig();
      
      // Carregar sessões ativas do cache
      await this.loadActiveSessions();
      
      // Iniciar limpeza automática de sessões
      this.startSessionCleanup();
      
      this.logger.info('Módulo de autenticação inicializado com sucesso');
      
      // Emitir evento de inicialização
      this.eventBus.emit('module:auth:initialized', {
        module: this.name,
        version: this.version
      });
      
      return true;
    } catch (error) {
      this.logger.error('Erro ao inicializar módulo de autenticação', { error });
      throw error;
    }
  }

  /**
   * Registra eventos do sistema
   */
  registerEvents() {
    // Eventos de sistema
    this.eventBus.on('user:created', this.handleUserCreated.bind(this));
    this.eventBus.on('user:updated', this.handleUserUpdated.bind(this));
    this.eventBus.on('user:deleted', this.handleUserDeleted.bind(this));
    
    // Eventos de segurança
    this.eventBus.on('security:suspicious-activity', this.handleSuspiciousActivity.bind(this));
    
    this.logger.debug('Eventos registrados para autenticação');
  }

  /**
   * Carrega configurações do cache
   */
  async loadConfig() {
    try {
      const cachedConfig = await this.cache.get('auth:config');
      if (cachedConfig) {
        this.config = { ...this.config, ...cachedConfig };
        this.logger.debug('Configurações de autenticação carregadas', { config: this.config });
      }
    } catch (error) {
      this.logger.warn('Erro ao carregar configurações de autenticação', { error });
    }
  }

  /**
   * Carrega sessões ativas do cache
   */
  async loadActiveSessions() {
    try {
      const sessions = await this.cache.get('auth:active-sessions');
      if (sessions) {
        this.activeSessions = new Map(sessions);
        this.logger.debug(`${this.activeSessions.size} sessões ativas carregadas`);
      }
    } catch (error) {
      this.logger.warn('Erro ao carregar sessões ativas', { error });
    }
  }

  /**
   * Registra um novo usuário
   */
  async register(userData) {
    try {
      const { email, password, name, role = 'user' } = userData;
      
      // Validar dados
      this.validateUserData({ email, password, name });
      
      // Verificar se usuário já existe
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        throw new Error('Usuário já existe com este email');
      }
      
      // Hash da senha
      const hashedPassword = await this.hashPassword(password);
      
      // Criar usuário
      const userId = this.generateId();
      const user = {
        id: userId,
        email,
        name,
        role,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        emailVerified: false,
        twoFactorEnabled: false
      };
      
      // Salvar no banco de dados
      await this.saveUser(user);
      
      // Emitir evento
      this.eventBus.emit('auth:user:registered', {
        userId,
        email,
        name,
        role
      });
      
      this.logger.info('Usuário registrado com sucesso', { userId, email });
      
      // Retornar dados sem senha
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      this.logger.error('Erro ao registrar usuário', { error, email: userData.email });
      throw error;
    }
  }

  /**
   * Autentica um usuário
   */
  async login(credentials) {
    try {
      const { email, password, rememberMe = false } = credentials;
      
      // Verificar tentativas de login
      await this.checkLoginAttempts(email);
      
      // Buscar usuário
      const user = await this.findUserByEmail(email);
      if (!user) {
        await this.recordFailedLogin(email);
        throw new Error('Credenciais inválidas');
      }
      
      // Verificar se usuário está ativo
      if (!user.isActive) {
        throw new Error('Conta desativada');
      }
      
      // Verificar senha
      const isValidPassword = await this.verifyPassword(password, user.password);
      if (!isValidPassword) {
        await this.recordFailedLogin(email);
        throw new Error('Credenciais inválidas');
      }
      
      // Limpar tentativas de login
      this.loginAttempts.delete(email);
      
      // Criar sessão
      const session = await this.createSession(user, rememberMe);
      
      // Emitir evento
      this.eventBus.emit('auth:user:login', {
        userId: user.id,
        email: user.email,
        sessionId: session.id,
        ip: credentials.ip,
        userAgent: credentials.userAgent
      });
      
      this.logger.info('Login realizado com sucesso', { userId: user.id, email });
      
      return {
        user: this.sanitizeUser(user),
        session,
        tokens: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken
        }
      };
    } catch (error) {
      this.logger.error('Erro no login', { error, email: credentials.email });
      throw error;
    }
  }

  /**
   * Faz logout de um usuário
   */
  async logout(sessionId) {
    try {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        throw new Error('Sessão não encontrada');
      }
      
      // Remover sessão
      this.activeSessions.delete(sessionId);
      
      // Remover refresh token
      this.refreshTokens.delete(session.refreshToken);
      
      // Invalidar no cache
      await this.cache.delete(`auth:session:${sessionId}`);
      
      // Emitir evento
      this.eventBus.emit('auth:user:logout', {
        userId: session.userId,
        sessionId
      });
      
      this.logger.info('Logout realizado com sucesso', { userId: session.userId, sessionId });
      
      return true;
    } catch (error) {
      this.logger.error('Erro no logout', { error, sessionId });
      throw error;
    }
  }

  /**
   * Renova token de acesso
   */
  async refreshToken(refreshToken) {
    try {
      const tokenData = this.refreshTokens.get(refreshToken);
      if (!tokenData) {
        throw new Error('Refresh token inválido');
      }
      
      // Verificar expiração
      if (Date.now() > tokenData.expiresAt) {
        this.refreshTokens.delete(refreshToken);
        throw new Error('Refresh token expirado');
      }
      
      // Buscar usuário
      const user = await this.findUserById(tokenData.userId);
      if (!user || !user.isActive) {
        throw new Error('Usuário inválido');
      }
      
      // Gerar novo access token
      const newAccessToken = this.generateAccessToken(user);
      
      // Atualizar sessão
      const session = this.activeSessions.get(tokenData.sessionId);
      if (session) {
        session.accessToken = newAccessToken;
        session.lastActivity = Date.now();
      }
      
      this.logger.debug('Token renovado com sucesso', { userId: user.id });
      
      return {
        accessToken: newAccessToken,
        user: this.sanitizeUser(user)
      };
    } catch (error) {
      this.logger.error('Erro ao renovar token', { error });
      throw error;
    }
  }

  /**
   * Valida um token de acesso
   */
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.config.jwtSecret);
      
      // Buscar usuário
      const user = await this.findUserById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('Usuário inválido');
      }
      
      // Verificar sessão
      const session = this.activeSessions.get(decoded.sessionId);
      if (!session) {
        throw new Error('Sessão inválida');
      }
      
      // Atualizar última atividade
      session.lastActivity = Date.now();
      
      return {
        user: this.sanitizeUser(user),
        session: {
          id: session.id,
          lastActivity: session.lastActivity
        }
      };
    } catch (error) {
      this.logger.debug('Token inválido', { error: error.message });
      throw new Error('Token inválido');
    }
  }

  /**
   * Verifica permissões de usuário
   */
  async checkPermission(userId, permission) {
    try {
      const user = await this.findUserById(userId);
      if (!user) {
        return false;
      }
      
      // Verificar permissões baseadas no role
      const permissions = this.getRolePermissions(user.role);
      return permissions.includes(permission) || permissions.includes('*');
    } catch (error) {
      this.logger.error('Erro ao verificar permissão', { error, userId, permission });
      return false;
    }
  }

  /**
   * Métodos auxiliares
   */
  async createSession(user, rememberMe = false) {
    const sessionId = this.generateId();
    const accessToken = this.generateAccessToken(user, sessionId);
    const refreshToken = this.generateRefreshToken();
    
    const expiresIn = rememberMe ? 
      this.config.refreshTokenExpiresIn : 
      this.config.sessionTimeout;
    
    const session = {
      id: sessionId,
      userId: user.id,
      accessToken,
      refreshToken,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + this.parseTimeToMs(expiresIn),
      rememberMe
    };
    
    // Armazenar sessão
    this.activeSessions.set(sessionId, session);
    
    // Armazenar refresh token
    this.refreshTokens.set(refreshToken, {
      sessionId,
      userId: user.id,
      expiresAt: session.expiresAt
    });
    
    // Salvar no cache
    await this.cache.set(`auth:session:${sessionId}`, session, expiresIn);
    
    return session;
  }

  generateAccessToken(user, sessionId = null) {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId
    };
    
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn
    });
  }

  generateRefreshToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async hashPassword(password) {
    return bcrypt.hash(password, this.config.bcryptRounds);
  }

  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  validateUserData({ email, password, name }) {
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Email inválido');
    }
    
    if (!password || password.length < this.config.passwordMinLength) {
      throw new Error(`Senha deve ter pelo menos ${this.config.passwordMinLength} caracteres`);
    }
    
    if (this.config.passwordRequireSpecialChars && !this.hasSpecialChars(password)) {
      throw new Error('Senha deve conter caracteres especiais');
    }
    
    if (!name || name.trim().length < 2) {
      throw new Error('Nome deve ter pelo menos 2 caracteres');
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  hasSpecialChars(password) {
    const specialCharsRegex = /[!@#$%^&*(),.?":{}|<>]/;
    return specialCharsRegex.test(password);
  }

  sanitizeUser(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  getRolePermissions(role) {
    const permissions = {
      admin: ['*'],
      moderator: ['read', 'write', 'moderate'],
      user: ['read'],
      guest: []
    };
    
    return permissions[role] || [];
  }

  async checkLoginAttempts(email) {
    const attempts = this.loginAttempts.get(email);
    if (attempts && attempts.count >= this.config.maxLoginAttempts) {
      const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
      if (timeSinceLastAttempt < this.config.lockoutDuration) {
        const remainingTime = Math.ceil((this.config.lockoutDuration - timeSinceLastAttempt) / 1000 / 60);
        throw new Error(`Conta bloqueada. Tente novamente em ${remainingTime} minutos`);
      } else {
        // Reset attempts after lockout period
        this.loginAttempts.delete(email);
      }
    }
  }

  async recordFailedLogin(email) {
    const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
    attempts.count++;
    attempts.lastAttempt = Date.now();
    this.loginAttempts.set(email, attempts);
    
    this.eventBus.emit('auth:login:failed', {
      email,
      attempts: attempts.count,
      timestamp: attempts.lastAttempt
    });
  }

  parseTimeToMs(timeString) {
    const units = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000
    };
    
    const match = timeString.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 30 * 60 * 1000; // Default 30 minutes
    }
    
    const [, amount, unit] = match;
    return parseInt(amount) * units[unit];
  }

  generateId() {
    return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Métodos de persistência
   */
  async saveUser(user) {
    // Implementação simplificada - salvar no cache
    await this.cache.set(`auth:user:${user.id}`, user, 86400);
    await this.cache.set(`auth:user:email:${user.email}`, user.id, 86400);
  }

  async findUserById(userId) {
    try {
      return await this.cache.get(`auth:user:${userId}`);
    } catch (error) {
      this.logger.warn('Erro ao buscar usuário por ID', { error, userId });
      return null;
    }
  }

  async findUserByEmail(email) {
    try {
      const userId = await this.cache.get(`auth:user:email:${email}`);
      if (userId) {
        return await this.findUserById(userId);
      }
      return null;
    } catch (error) {
      this.logger.warn('Erro ao buscar usuário por email', { error, email });
      return null;
    }
  }

  /**
   * Handlers de eventos
   */
  handleUserCreated(data) {
    this.logger.info('Usuário criado', { userId: data.userId });
  }

  handleUserUpdated(data) {
    this.logger.info('Usuário atualizado', { userId: data.userId });
    
    // Invalidar sessões se necessário
    if (data.changes.includes('password') || data.changes.includes('isActive')) {
      this.invalidateUserSessions(data.userId);
    }
  }

  handleUserDeleted(data) {
    this.logger.info('Usuário deletado', { userId: data.userId });
    
    // Invalidar todas as sessões do usuário
    this.invalidateUserSessions(data.userId);
  }

  handleSuspiciousActivity(data) {
    this.logger.warn('Atividade suspeita detectada', data);
    
    // Implementar medidas de segurança
    if (data.userId) {
      this.invalidateUserSessions(data.userId);
    }
  }

  /**
   * Invalidar sessões de usuário
   */
  async invalidateUserSessions(userId) {
    const sessionsToRemove = [];
    
    for (const [sessionId, session] of this.activeSessions) {
      if (session.userId === userId) {
        sessionsToRemove.push(sessionId);
      }
    }
    
    for (const sessionId of sessionsToRemove) {
      await this.logout(sessionId);
    }
    
    this.logger.info(`${sessionsToRemove.length} sessões invalidadas para usuário`, { userId });
  }

  /**
   * Limpeza automática de sessões
   */
  startSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // A cada 5 minutos
  }

  async cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];
    
    for (const [sessionId, session] of this.activeSessions) {
      if (now > session.expiresAt || 
          (now - session.lastActivity) > this.config.sessionTimeout) {
        expiredSessions.push(sessionId);
      }
    }
    
    for (const sessionId of expiredSessions) {
      await this.logout(sessionId);
    }
    
    if (expiredSessions.length > 0) {
      this.logger.debug(`${expiredSessions.length} sessões expiradas removidas`);
    }
  }

  /**
   * Obtém estatísticas do módulo
   */
  getStats() {
    return {
      activeSessions: this.activeSessions.size,
      refreshTokens: this.refreshTokens.size,
      loginAttempts: this.loginAttempts.size,
      config: {
        maxLoginAttempts: this.config.maxLoginAttempts,
        sessionTimeout: this.config.sessionTimeout,
        enableTwoFactor: this.config.enableTwoFactor
      }
    };
  }

  /**
   * Atualiza configurações
   */
  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Salvar no cache
    await this.cache.set('auth:config', this.config, 86400);
    
    this.logger.info('Configurações de autenticação atualizadas', { config: this.config });
    
    this.eventBus.emit('auth:config:updated', this.config);
  }

  /**
   * Finaliza o módulo
   */
  async shutdown() {
    try {
      this.logger.info('Finalizando módulo de autenticação');
      
      // Salvar sessões ativas no cache
      await this.cache.set('auth:active-sessions', Array.from(this.activeSessions), 3600);
      
      // Limpar dados em memória
      this.activeSessions.clear();
      this.refreshTokens.clear();
      this.loginAttempts.clear();
      
      this.logger.info('Módulo de autenticação finalizado');
      
      return true;
    } catch (error) {
      this.logger.error('Erro ao finalizar módulo de autenticação', { error });
      throw error;
    }
  }
}