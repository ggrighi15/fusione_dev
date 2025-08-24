/**
 * Módulo de Segurança
 * Controle avançado de segurança lógica e física com OAuth2 + 2FA
 */

import crypto from 'crypto';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import geoip from 'geoip-lite';
import useragent from 'useragent';

export default class SegurancaModule {
  constructor(core) {
    this.core = core;
    this.name = 'seguranca-module';
    this.version = '1.0.0';
    this.description = 'Módulo de segurança avançada com OAuth2 + 2FA';
    this.logger = core.logger;
    this.eventBus = core.eventBus;
    this.cache = core.cache;
    this.database = core.database;
    
    // Configurações do módulo
    this.config = {
      oauth2: {
        authorizationCodeExpiry: 10 * 60 * 1000, // 10 minutos
        accessTokenExpiry: 60 * 60 * 1000, // 1 hora
        refreshTokenExpiry: 30 * 24 * 60 * 60 * 1000, // 30 dias
        clientSecretLength: 64
      },
      twoFactor: {
        issuer: 'Fusione Core System',
        window: 2, // Janela de tolerância para TOTP
        backupCodesCount: 10
      },
      security: {
        maxLoginAttempts: 5,
        lockoutDuration: 30 * 60 * 1000, // 30 minutos
        sessionTimeout: 2 * 60 * 60 * 1000, // 2 horas
        passwordMinLength: 12,
        passwordComplexity: true,
        forcePasswordChange: 90 * 24 * 60 * 60 * 1000, // 90 dias
        suspiciousActivityThreshold: 3
      },
      audit: {
        retentionDays: 365,
        logSensitiveData: false,
        realTimeAlerts: true
      }
    };
    
    // Cache para códigos de autorização e tokens
    this.authorizationCodes = new Map();
    this.accessTokens = new Map();
    this.refreshTokens = new Map();
    
    // Controle de tentativas de login
    this.loginAttempts = new Map();
    
    // Sessões ativas
    this.activeSessions = new Map();
  }

  /**
   * Inicializa o módulo
   */
  async initialize() {
    try {
      this.logger.info('Inicializando módulo de Segurança');
      
      await this.createTables();
      await this.registerEvents();
      await this.loadConfig();
      await this.startSecurityMonitoring();
      
      this.logger.info('Módulo de Segurança inicializado com sucesso');
      return true;
    } catch (error) {
      this.logger.error('Erro ao inicializar módulo de Segurança:', error);
      throw error;
    }
  }

  /**
   * Cria as tabelas necessárias no banco de dados
   */
  async createTables() {
    const createOAuth2ClientsTable = `
      CREATE TABLE IF NOT EXISTS oauth2_clients (
        id VARCHAR(36) PRIMARY KEY,
        client_id VARCHAR(255) UNIQUE NOT NULL,
        client_secret VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        redirect_uris JSON NOT NULL,
        scopes JSON NOT NULL,
        grant_types JSON NOT NULL,
        response_types JSON NOT NULL,
        is_confidential BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by VARCHAR(36),
        INDEX idx_client_id (client_id)
      )
    `;

    const createAccessLevelsTable = `
      CREATE TABLE IF NOT EXISTS access_levels (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        permissions JSON NOT NULL,
        priority INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by VARCHAR(36),
        INDEX idx_name (name),
        INDEX idx_priority (priority)
      )
    `;

    const createUserAccessTable = `
      CREATE TABLE IF NOT EXISTS user_access (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        access_level_id VARCHAR(36) NOT NULL,
        granted_by VARCHAR(36),
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT true,
        FOREIGN KEY (access_level_id) REFERENCES access_levels(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_access_level_id (access_level_id),
        INDEX idx_expires_at (expires_at)
      )
    `;

    const createTwoFactorTable = `
      CREATE TABLE IF NOT EXISTS user_two_factor (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) UNIQUE NOT NULL,
        secret VARCHAR(255) NOT NULL,
        backup_codes JSON NOT NULL,
        is_enabled BOOLEAN DEFAULT false,
        last_used_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      )
    `;

    const createSecurityLogsTable = `
      CREATE TABLE IF NOT EXISTS security_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        session_id VARCHAR(36),
        event_type VARCHAR(100) NOT NULL,
        event_category ENUM('authentication', 'authorization', 'access', 'security', 'audit') NOT NULL,
        severity ENUM('low', 'medium', 'high', 'critical') NOT NULL,
        description TEXT NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        location JSON,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_event_type (event_type),
        INDEX idx_event_category (event_category),
        INDEX idx_severity (severity),
        INDEX idx_created_at (created_at),
        INDEX idx_ip_address (ip_address)
      )
    `;

    const createSessionsTable = `
      CREATE TABLE IF NOT EXISTS security_sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        location JSON,
        is_active BOOLEAN DEFAULT true,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_session_token (session_token),
        INDEX idx_expires_at (expires_at),
        INDEX idx_last_activity (last_activity)
      )
    `;

    const createPermissionsTable = `
      CREATE TABLE IF NOT EXISTS permissions (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        resource VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        conditions JSON,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_name (name),
        INDEX idx_resource (resource),
        INDEX idx_action (action)
      )
    `;

    await this.database.query(createOAuth2ClientsTable);
    await this.database.query(createAccessLevelsTable);
    await this.database.query(createUserAccessTable);
    await this.database.query(createTwoFactorTable);
    await this.database.query(createSecurityLogsTable);
    await this.database.query(createSessionsTable);
    await this.database.query(createPermissionsTable);

    // Insere permissões padrão
    await this.insertDefaultPermissions();
    await this.insertDefaultAccessLevels();
  }

  /**
   * Registra os eventos do módulo
   */
  async registerEvents() {
    this.eventBus.on('user:login', this.handleUserLogin.bind(this));
    this.eventBus.on('user:logout', this.handleUserLogout.bind(this));
    this.eventBus.on('user:failed_login', this.handleFailedLogin.bind(this));
    this.eventBus.on('security:suspicious_activity', this.handleSuspiciousActivity.bind(this));
    this.eventBus.on('permission:granted', this.handlePermissionGranted.bind(this));
    this.eventBus.on('permission:revoked', this.handlePermissionRevoked.bind(this));
  }

  /**
   * Carrega configurações do módulo
   */
  async loadConfig() {
    try {
      const config = await this.core.config.get('seguranca-module');
      if (config) {
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      this.logger.warn('Erro ao carregar configurações do módulo Segurança:', error);
    }
  }

  /**
   * OAuth2 - Registra um novo cliente
   */
  async registerOAuth2Client(clientData, userId) {
    try {
      const clientId = this.generateClientId();
      const clientSecret = this.generateClientSecret();
      const id = this.generateId();

      const query = `
        INSERT INTO oauth2_clients 
        (id, client_id, client_secret, name, description, redirect_uris, 
         scopes, grant_types, response_types, is_confidential, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.database.query(query, [
        id,
        clientId,
        await bcrypt.hash(clientSecret, 12),
        clientData.name,
        clientData.description,
        JSON.stringify(clientData.redirectUris),
        JSON.stringify(clientData.scopes),
        JSON.stringify(clientData.grantTypes || ['authorization_code', 'refresh_token']),
        JSON.stringify(clientData.responseTypes || ['code']),
        clientData.isConfidential !== false,
        userId
      ]);

      await this.logSecurityEvent(userId, null, 'oauth2_client_registered', 'authorization', 'medium', 
        `Cliente OAuth2 registrado: ${clientData.name}`, null, null, { clientId });

      this.logger.info(`Cliente OAuth2 registrado: ${clientId}`);
      return { clientId, clientSecret, id };
    } catch (error) {
      this.logger.error('Erro ao registrar cliente OAuth2:', error);
      throw error;
    }
  }

  /**
   * OAuth2 - Gera código de autorização
   */
  async generateAuthorizationCode(clientId, userId, scopes, redirectUri) {
    try {
      // Valida cliente
      const client = await this.getOAuth2Client(clientId);
      if (!client || !client.is_active) {
        throw new Error('Cliente inválido ou inativo');
      }

      // Valida redirect URI
      const redirectUris = JSON.parse(client.redirect_uris);
      if (!redirectUris.includes(redirectUri)) {
        throw new Error('Redirect URI não autorizada');
      }

      // Gera código de autorização
      const code = crypto.randomBytes(32).toString('hex');
      const expiresAt = Date.now() + this.config.oauth2.authorizationCodeExpiry;

      // Armazena código
      this.authorizationCodes.set(code, {
        clientId,
        userId,
        scopes,
        redirectUri,
        expiresAt,
        used: false
      });

      await this.logSecurityEvent(userId, null, 'authorization_code_generated', 'authorization', 'low', 
        'Código de autorização gerado', null, null, { clientId, scopes });

      return code;
    } catch (error) {
      this.logger.error('Erro ao gerar código de autorização:', error);
      throw error;
    }
  }

  /**
   * OAuth2 - Troca código por token de acesso
   */
  async exchangeCodeForToken(code, clientId, clientSecret, redirectUri) {
    try {
      // Valida código de autorização
      const authCode = this.authorizationCodes.get(code);
      if (!authCode || authCode.used || Date.now() > authCode.expiresAt) {
        throw new Error('Código de autorização inválido ou expirado');
      }

      // Valida cliente
      const client = await this.getOAuth2Client(clientId);
      if (!client || !await bcrypt.compare(clientSecret, client.client_secret)) {
        throw new Error('Credenciais do cliente inválidas');
      }

      // Valida redirect URI
      if (authCode.redirectUri !== redirectUri) {
        throw new Error('Redirect URI não confere');
      }

      // Marca código como usado
      authCode.used = true;

      // Gera tokens
      const accessToken = this.generateAccessToken(authCode.userId, authCode.scopes, clientId);
      const refreshToken = this.generateRefreshToken(authCode.userId, clientId);

      await this.logSecurityEvent(authCode.userId, null, 'access_token_generated', 'authorization', 'low', 
        'Token de acesso gerado via OAuth2', null, null, { clientId, scopes: authCode.scopes });

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: this.config.oauth2.accessTokenExpiry / 1000,
        scope: authCode.scopes.join(' ')
      };
    } catch (error) {
      this.logger.error('Erro ao trocar código por token:', error);
      throw error;
    }
  }

  /**
   * 2FA - Configura autenticação de dois fatores para usuário
   */
  async setup2FA(userId) {
    try {
      // Gera secret para TOTP
      const secret = speakeasy.generateSecret({
        name: `Fusione (${userId})`,
        issuer: this.config.twoFactor.issuer,
        length: 32
      });

      // Gera códigos de backup
      const backupCodes = this.generateBackupCodes();

      // Salva no banco de dados
      const id = this.generateId();
      const query = `
        INSERT INTO user_two_factor (id, user_id, secret, backup_codes)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        secret = VALUES(secret),
        backup_codes = VALUES(backup_codes),
        is_enabled = false,
        updated_at = CURRENT_TIMESTAMP
      `;

      await this.database.query(query, [
        id,
        userId,
        secret.base32,
        JSON.stringify(backupCodes)
      ]);

      // Gera QR Code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

      await this.logSecurityEvent(userId, null, '2fa_setup_initiated', 'security', 'medium', 
        'Configuração de 2FA iniciada', null, null);

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        backupCodes,
        manualEntryKey: secret.base32
      };
    } catch (error) {
      this.logger.error('Erro ao configurar 2FA:', error);
      throw error;
    }
  }

  /**
   * 2FA - Verifica e ativa autenticação de dois fatores
   */
  async verify2FA(userId, token) {
    try {
      const query = 'SELECT * FROM user_two_factor WHERE user_id = ?';
      const result = await this.database.query(query, [userId]);
      
      if (!result[0]) {
        throw new Error('2FA não configurado para este usuário');
      }

      const twoFactorData = result[0];
      
      // Verifica token TOTP
      const verified = speakeasy.totp.verify({
        secret: twoFactorData.secret,
        encoding: 'base32',
        token,
        window: this.config.twoFactor.window
      });

      if (!verified) {
        await this.logSecurityEvent(userId, null, '2fa_verification_failed', 'security', 'high', 
          'Falha na verificação de 2FA', null, null);
        throw new Error('Token 2FA inválido');
      }

      // Ativa 2FA
      const updateQuery = `
        UPDATE user_two_factor 
        SET is_enabled = true, last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `;
      await this.database.query(updateQuery, [userId]);

      await this.logSecurityEvent(userId, null, '2fa_enabled', 'security', 'medium', 
        '2FA ativado com sucesso', null, null);

      this.logger.info(`2FA ativado para usuário: ${userId}`);
      return true;
    } catch (error) {
      this.logger.error('Erro ao verificar 2FA:', error);
      throw error;
    }
  }

  /**
   * 2FA - Valida token durante login
   */
  async validate2FAToken(userId, token) {
    try {
      const query = 'SELECT * FROM user_two_factor WHERE user_id = ? AND is_enabled = true';
      const result = await this.database.query(query, [userId]);
      
      if (!result[0]) {
        return true; // 2FA não está ativado
      }

      const twoFactorData = result[0];
      
      // Verifica se é um código de backup
      const backupCodes = JSON.parse(twoFactorData.backup_codes);
      const backupCodeIndex = backupCodes.findIndex(code => code.code === token && !code.used);
      
      if (backupCodeIndex !== -1) {
        // Marca código de backup como usado
        backupCodes[backupCodeIndex].used = true;
        backupCodes[backupCodeIndex].usedAt = new Date().toISOString();
        
        const updateQuery = `
          UPDATE user_two_factor 
          SET backup_codes = ?, last_used_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `;
        await this.database.query(updateQuery, [JSON.stringify(backupCodes), userId]);

        await this.logSecurityEvent(userId, null, '2fa_backup_code_used', 'security', 'medium', 
          'Código de backup 2FA utilizado', null, null);

        return true;
      }
      
      // Verifica token TOTP
      const verified = speakeasy.totp.verify({
        secret: twoFactorData.secret,
        encoding: 'base32',
        token,
        window: this.config.twoFactor.window
      });

      if (verified) {
        const updateQuery = `
          UPDATE user_two_factor 
          SET last_used_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `;
        await this.database.query(updateQuery, [userId]);

        await this.logSecurityEvent(userId, null, '2fa_token_validated', 'security', 'low', 
          'Token 2FA validado com sucesso', null, null);
      } else {
        await this.logSecurityEvent(userId, null, '2fa_token_invalid', 'security', 'high', 
          'Token 2FA inválido fornecido', null, null);
      }

      return verified;
    } catch (error) {
      this.logger.error('Erro ao validar token 2FA:', error);
      throw error;
    }
  }

  /**
   * Controle de Acesso - Cria nível de acesso
   */
  async createAccessLevel(levelData, userId) {
    try {
      const id = this.generateId();
      const query = `
        INSERT INTO access_levels 
        (id, name, description, permissions, priority, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      await this.database.query(query, [
        id,
        levelData.name,
        levelData.description,
        JSON.stringify(levelData.permissions),
        levelData.priority || 0,
        userId
      ]);

      await this.logSecurityEvent(userId, null, 'access_level_created', 'authorization', 'medium', 
        `Nível de acesso criado: ${levelData.name}`, null, null, { accessLevelId: id });

      this.logger.info(`Nível de acesso criado: ${id}`);
      return id;
    } catch (error) {
      this.logger.error('Erro ao criar nível de acesso:', error);
      throw error;
    }
  }

  /**
   * Controle de Acesso - Concede acesso a usuário
   */
  async grantUserAccess(userId, accessLevelId, grantedBy, expiresAt = null) {
    try {
      const id = this.generateId();
      const query = `
        INSERT INTO user_access 
        (id, user_id, access_level_id, granted_by, expires_at)
        VALUES (?, ?, ?, ?, ?)
      `;

      await this.database.query(query, [
        id,
        userId,
        accessLevelId,
        grantedBy,
        expiresAt
      ]);

      await this.logSecurityEvent(grantedBy, null, 'access_granted', 'authorization', 'medium', 
        `Acesso concedido ao usuário ${userId}`, null, null, { 
          targetUserId: userId, 
          accessLevelId, 
          expiresAt 
        });

      // Emite evento
      this.eventBus.emit('permission:granted', {
        userId,
        accessLevelId,
        grantedBy,
        expiresAt
      });

      this.logger.info(`Acesso concedido: usuário ${userId}, nível ${accessLevelId}`);
      return id;
    } catch (error) {
      this.logger.error('Erro ao conceder acesso:', error);
      throw error;
    }
  }

  /**
   * Controle de Acesso - Verifica permissões do usuário
   */
  async checkUserPermission(userId, permission) {
    try {
      const query = `
        SELECT al.permissions
        FROM user_access ua
        JOIN access_levels al ON ua.access_level_id = al.id
        WHERE ua.user_id = ? 
        AND ua.is_active = true 
        AND al.is_active = true
        AND (ua.expires_at IS NULL OR ua.expires_at > NOW())
        ORDER BY al.priority DESC
      `;

      const results = await this.database.query(query, [userId]);
      
      for (const result of results) {
        const permissions = JSON.parse(result.permissions);
        if (permissions.includes(permission) || permissions.includes('*')) {
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Auditoria - Registra evento de segurança
   */
  async logSecurityEvent(userId, sessionId, eventType, category, severity, description, ipAddress, userAgent, metadata = {}) {
    try {
      const id = this.generateId();
      let location = null;

      // Obtém localização pelo IP
      if (ipAddress) {
        const geo = geoip.lookup(ipAddress);
        if (geo) {
          location = {
            country: geo.country,
            region: geo.region,
            city: geo.city,
            timezone: geo.timezone,
            coordinates: [geo.ll[1], geo.ll[0]] // [longitude, latitude]
          };
        }
      }

      const query = `
        INSERT INTO security_logs 
        (id, user_id, session_id, event_type, event_category, severity, 
         description, ip_address, user_agent, location, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await this.database.query(query, [
        id,
        userId,
        sessionId,
        eventType,
        category,
        severity,
        description,
        ipAddress,
        userAgent,
        location ? JSON.stringify(location) : null,
        JSON.stringify(metadata)
      ]);

      // Alerta em tempo real para eventos críticos
      if (severity === 'critical' && this.config.audit.realTimeAlerts) {
        this.eventBus.emit('security:critical_event', {
          id,
          userId,
          eventType,
          description,
          ipAddress,
          location,
          metadata
        });
      }

      return id;
    } catch (error) {
      this.logger.error('Erro ao registrar evento de segurança:', error);
    }
  }

  /**
   * Auditoria - Busca logs de segurança
   */
  async getSecurityLogs(filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 50, orderBy = 'created_at', orderDirection = 'DESC' } = pagination;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (filters.userId) {
        whereClause += ' AND user_id = ?';
        params.push(filters.userId);
      }

      if (filters.eventType) {
        whereClause += ' AND event_type = ?';
        params.push(filters.eventType);
      }

      if (filters.category) {
        whereClause += ' AND event_category = ?';
        params.push(filters.category);
      }

      if (filters.severity) {
        whereClause += ' AND severity = ?';
        params.push(filters.severity);
      }

      if (filters.ipAddress) {
        whereClause += ' AND ip_address = ?';
        params.push(filters.ipAddress);
      }

      if (filters.dateFrom) {
        whereClause += ' AND created_at >= ?';
        params.push(filters.dateFrom);
      }

      if (filters.dateTo) {
        whereClause += ' AND created_at <= ?';
        params.push(filters.dateTo);
      }

      const query = `
        SELECT * FROM security_logs 
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT ? OFFSET ?
      `;
      params.push(limit, offset);

      const countQuery = `SELECT COUNT(*) as total FROM security_logs ${whereClause}`;
      const countParams = params.slice(0, -2);

      const [logs, countResult] = await Promise.all([
        this.database.query(query, params),
        this.database.query(countQuery, countParams)
      ]);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      // Parse dos campos JSON
      const parsedLogs = logs.map(log => ({
        ...log,
        location: this.safeJsonParse(log.location),
        metadata: this.safeJsonParse(log.metadata)
      }));

      return {
        logs: parsedLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      this.logger.error('Erro ao buscar logs de segurança:', error);
      throw error;
    }
  }

  /**
   * Sessões - Cria nova sessão de segurança
   */
  async createSecuritySession(userId, ipAddress, userAgent) {
    try {
      const sessionId = this.generateId();
      const sessionToken = crypto.randomBytes(64).toString('hex');
      const expiresAt = new Date(Date.now() + this.config.security.sessionTimeout);

      let location = null;
      if (ipAddress) {
        const geo = geoip.lookup(ipAddress);
        if (geo) {
          location = {
            country: geo.country,
            region: geo.region,
            city: geo.city,
            timezone: geo.timezone
          };
        }
      }

      const query = `
        INSERT INTO security_sessions 
        (id, user_id, session_token, ip_address, user_agent, location, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      await this.database.query(query, [
        sessionId,
        userId,
        sessionToken,
        ipAddress,
        userAgent,
        location ? JSON.stringify(location) : null,
        expiresAt
      ]);

      // Armazena em cache para acesso rápido
      this.activeSessions.set(sessionToken, {
        sessionId,
        userId,
        ipAddress,
        userAgent,
        location,
        expiresAt: expiresAt.getTime(),
        lastActivity: Date.now()
      });

      await this.logSecurityEvent(userId, sessionId, 'session_created', 'access', 'low', 
        'Nova sessão de segurança criada', ipAddress, userAgent, { location });

      return { sessionId, sessionToken };
    } catch (error) {
      this.logger.error('Erro ao criar sessão de segurança:', error);
      throw error;
    }
  }

  /**
   * Sessões - Valida sessão
   */
  async validateSession(sessionToken) {
    try {
      // Verifica cache primeiro
      const cachedSession = this.activeSessions.get(sessionToken);
      if (cachedSession) {
        if (Date.now() > cachedSession.expiresAt) {
          this.activeSessions.delete(sessionToken);
          return null;
        }
        
        // Atualiza última atividade
        cachedSession.lastActivity = Date.now();
        return cachedSession;
      }

      // Busca no banco de dados
      const query = `
        SELECT * FROM security_sessions 
        WHERE session_token = ? AND is_active = true AND expires_at > NOW()
      `;
      const result = await this.database.query(query, [sessionToken]);
      
      if (!result[0]) {
        return null;
      }

      const session = result[0];
      
      // Atualiza última atividade
      const updateQuery = `
        UPDATE security_sessions 
        SET last_activity = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      await this.database.query(updateQuery, [session.id]);

      // Adiciona ao cache
      this.activeSessions.set(sessionToken, {
        sessionId: session.id,
        userId: session.user_id,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        location: this.safeJsonParse(session.location),
        expiresAt: new Date(session.expires_at).getTime(),
        lastActivity: Date.now()
      });

      return this.activeSessions.get(sessionToken);
    } catch (error) {
      this.logger.error('Erro ao validar sessão:', error);
      return null;
    }
  }

  /**
   * Monitoramento - Inicia monitoramento de segurança
   */
  async startSecurityMonitoring() {
    // Limpeza de sessões expiradas a cada 5 minutos
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);

    // Limpeza de códigos de autorização expirados a cada minuto
    setInterval(() => {
      this.cleanupExpiredAuthCodes();
    }, 60 * 1000);

    // Análise de atividades suspeitas a cada 10 minutos
    setInterval(() => {
      this.analyzeSuspiciousActivity();
    }, 10 * 60 * 1000);

    this.logger.info('Monitoramento de segurança iniciado');
  }

  /**
   * Limpeza de sessões expiradas
   */
  async cleanupExpiredSessions() {
    try {
      // Remove do cache
      for (const [token, session] of this.activeSessions.entries()) {
        if (Date.now() > session.expiresAt) {
          this.activeSessions.delete(token);
        }
      }

      // Remove do banco de dados
      const query = `
        UPDATE security_sessions 
        SET is_active = false 
        WHERE expires_at < NOW() AND is_active = true
      `;
      const result = await this.database.query(query);
      
      if (result.affectedRows > 0) {
        this.logger.info(`${result.affectedRows} sessões expiradas removidas`);
      }
    } catch (error) {
      this.logger.error('Erro na limpeza de sessões expiradas:', error);
    }
  }

  /**
   * Limpeza de códigos de autorização expirados
   */
  cleanupExpiredAuthCodes() {
    const now = Date.now();
    for (const [code, data] of this.authorizationCodes.entries()) {
      if (now > data.expiresAt || data.used) {
        this.authorizationCodes.delete(code);
      }
    }
  }

  /**
   * Análise de atividades suspeitas
   */
  async analyzeSuspiciousActivity() {
    try {
      // Detecta múltiplas tentativas de login falhadas
      const failedLoginsQuery = `
        SELECT user_id, ip_address, COUNT(*) as attempts
        FROM security_logs 
        WHERE event_type = 'login_failed' 
        AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        GROUP BY user_id, ip_address
        HAVING attempts >= ?
      `;
      
      const suspiciousLogins = await this.database.query(failedLoginsQuery, 
        [this.config.security.suspiciousActivityThreshold]);

      for (const suspicious of suspiciousLogins) {
        await this.logSecurityEvent(suspicious.user_id, null, 'suspicious_login_attempts', 
          'security', 'high', 
          `${suspicious.attempts} tentativas de login falhadas detectadas`, 
          suspicious.ip_address, null, { attempts: suspicious.attempts });

        this.eventBus.emit('security:suspicious_activity', {
          type: 'multiple_failed_logins',
          userId: suspicious.user_id,
          ipAddress: suspicious.ip_address,
          attempts: suspicious.attempts
        });
      }

      // Detecta logins de localizações incomuns
      await this.detectUnusualLocations();
      
    } catch (error) {
      this.logger.error('Erro na análise de atividades suspeitas:', error);
    }
  }

  /**
   * Detecta logins de localizações incomuns
   */
  async detectUnusualLocations() {
    try {
      const query = `
        SELECT DISTINCT user_id, 
               JSON_EXTRACT(location, '$.country') as country,
               JSON_EXTRACT(location, '$.city') as city,
               ip_address
        FROM security_logs 
        WHERE event_type = 'user_login' 
        AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND location IS NOT NULL
      `;
      
      const recentLogins = await this.database.query(query);
      
      for (const login of recentLogins) {
        // Verifica se é uma localização nova para o usuário
        const historicalQuery = `
          SELECT COUNT(*) as count
          FROM security_logs 
          WHERE user_id = ? 
          AND JSON_EXTRACT(location, '$.country') = ?
          AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
          AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
        `;
        
        const historical = await this.database.query(historicalQuery, 
          [login.user_id, login.country]);
        
        if (historical[0].count === 0) {
          await this.logSecurityEvent(login.user_id, null, 'unusual_location_login', 
            'security', 'medium', 
            `Login de localização incomum detectado: ${login.city}, ${login.country}`, 
            login.ip_address, null, { 
              country: login.country, 
              city: login.city 
            });
        }
      }
    } catch (error) {
      this.logger.error('Erro ao detectar localizações incomuns:', error);
    }
  }

  /**
   * Utilitários
   */
  generateId() {
    return crypto.randomUUID();
  }

  generateClientId() {
    return crypto.randomBytes(16).toString('hex');
  }

  generateClientSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateAccessToken(userId, scopes, clientId) {
    const payload = {
      sub: userId,
      scope: scopes.join(' '),
      client_id: clientId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.config.oauth2.accessTokenExpiry) / 1000)
    };
    
    return jwt.sign(payload, this.config.oauth2.jwtSecret || 'default-secret');
  }

  generateRefreshToken(userId, clientId) {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = Date.now() + this.config.oauth2.refreshTokenExpiry;
    
    this.refreshTokens.set(token, {
      userId,
      clientId,
      expiresAt
    });
    
    return token;
  }

  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < this.config.twoFactor.backupCodesCount; i++) {
      codes.push({
        code: crypto.randomBytes(4).toString('hex').toUpperCase(),
        used: false,
        usedAt: null
      });
    }
    return codes;
  }

  safeJsonParse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch {
      return jsonString;
    }
  }

  /**
   * Insere permissões padrão
   */
  async insertDefaultPermissions() {
    const defaultPermissions = [
      { name: 'users:read', description: 'Visualizar usuários', resource: 'users', action: 'read' },
      { name: 'users:write', description: 'Criar/editar usuários', resource: 'users', action: 'write' },
      { name: 'users:delete', description: 'Excluir usuários', resource: 'users', action: 'delete' },
      { name: 'pessoas:read', description: 'Visualizar pessoas', resource: 'pessoas', action: 'read' },
      { name: 'pessoas:write', description: 'Criar/editar pessoas', resource: 'pessoas', action: 'write' },
      { name: 'contratos:read', description: 'Visualizar contratos', resource: 'contratos', action: 'read' },
      { name: 'contratos:write', description: 'Criar/editar contratos', resource: 'contratos', action: 'write' },
      { name: 'security:admin', description: 'Administrar segurança', resource: 'security', action: 'admin' },
      { name: 'audit:read', description: 'Visualizar auditoria', resource: 'audit', action: 'read' }
    ];

    for (const permission of defaultPermissions) {
      try {
        const query = `
          INSERT IGNORE INTO permissions (id, name, description, resource, action)
          VALUES (?, ?, ?, ?, ?)
        `;
        await this.database.query(query, [
          this.generateId(),
          permission.name,
          permission.description,
          permission.resource,
          permission.action
        ]);
      } catch (error) {
        // Ignora erros de duplicação
      }
    }
  }

  /**
   * Insere níveis de acesso padrão
   */
  async insertDefaultAccessLevels() {
    const defaultLevels = [
      {
        name: 'Administrador',
        description: 'Acesso total ao sistema',
        permissions: ['*'],
        priority: 100
      },
      {
        name: 'Gerente',
        description: 'Acesso gerencial',
        permissions: ['users:read', 'pessoas:read', 'pessoas:write', 'contratos:read', 'contratos:write', 'audit:read'],
        priority: 80
      },
      {
        name: 'Operador',
        description: 'Acesso operacional',
        permissions: ['pessoas:read', 'pessoas:write', 'contratos:read'],
        priority: 60
      },
      {
        name: 'Consulta',
        description: 'Acesso somente leitura',
        permissions: ['pessoas:read', 'contratos:read'],
        priority: 40
      }
    ];

    for (const level of defaultLevels) {
      try {
        const query = `
          INSERT IGNORE INTO access_levels (id, name, description, permissions, priority)
          VALUES (?, ?, ?, ?, ?)
        `;
        await this.database.query(query, [
          this.generateId(),
          level.name,
          level.description,
          JSON.stringify(level.permissions),
          level.priority
        ]);
      } catch (error) {
        // Ignora erros de duplicação
      }
    }
  }

  /**
   * Busca cliente OAuth2
   */
  async getOAuth2Client(clientId) {
    try {
      const query = 'SELECT * FROM oauth2_clients WHERE client_id = ?';
      const result = await this.database.query(query, [clientId]);
      return result[0] || null;
    } catch (error) {
      this.logger.error('Erro ao buscar cliente OAuth2:', error);
      return null;
    }
  }

  /**
   * Handlers de eventos
   */
  handleUserLogin(data) {
    this.logSecurityEvent(data.userId, data.sessionId, 'user_login', 'authentication', 'low', 
      'Usuário fez login', data.ipAddress, data.userAgent);
  }

  handleUserLogout(data) {
    this.logSecurityEvent(data.userId, data.sessionId, 'user_logout', 'authentication', 'low', 
      'Usuário fez logout', data.ipAddress, data.userAgent);
  }

  handleFailedLogin(data) {
    this.logSecurityEvent(data.userId, null, 'login_failed', 'authentication', 'medium', 
      'Tentativa de login falhada', data.ipAddress, data.userAgent, { reason: data.reason });
  }

  handleSuspiciousActivity(data) {
    this.logSecurityEvent(data.userId, data.sessionId, 'suspicious_activity', 'security', 'high', 
      data.description, data.ipAddress, data.userAgent, data.metadata);
  }

  handlePermissionGranted(data) {
    this.logSecurityEvent(data.grantedBy, null, 'permission_granted', 'authorization', 'medium', 
      `Permissão concedida ao usuário ${data.userId}`, null, null, data);
  }

  handlePermissionRevoked(data) {
    this.logSecurityEvent(data.revokedBy, null, 'permission_revoked', 'authorization', 'medium', 
      `Permissão revogada do usuário ${data.userId}`, null, null, data);
  }

  /**
   * Estatísticas do módulo
   */
  async getStats() {
    try {
      const queries = {
        totalSessions: 'SELECT COUNT(*) as count FROM security_sessions WHERE is_active = true',
        activeSessions: 'SELECT COUNT(*) as count FROM security_sessions WHERE is_active = true AND expires_at > NOW()',
        totalLogs: 'SELECT COUNT(*) as count FROM security_logs',
        criticalEvents: 'SELECT COUNT(*) as count FROM security_logs WHERE severity = "critical" AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)',
        oauth2Clients: 'SELECT COUNT(*) as count FROM oauth2_clients WHERE is_active = true',
        users2FA: 'SELECT COUNT(*) as count FROM user_two_factor WHERE is_enabled = true'
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await this.database.query(query);
        results[key] = result[0].count;
      }

      return results;
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Finaliza o módulo
   */
  async shutdown() {
    try {
      this.logger.info('Finalizando módulo de Segurança');
      
      // Limpa caches
      this.authorizationCodes.clear();
      this.accessTokens.clear();
      this.refreshTokens.clear();
      this.loginAttempts.clear();
      this.activeSessions.clear();
      
      this.logger.info('Módulo de Segurança finalizado');
    } catch (error) {
      this.logger.error('Erro ao finalizar módulo de Segurança:', error);
    }
  }
}