import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/user.js';
import { RefreshToken } from '../models/refresh-token.js';

/**
 * Gerenciador de Autenticação JWT
 * Responsável por gerenciar tokens JWT, autenticação e autorização
 */
class AuthManager {
    constructor(config, logger, databaseManager = null, cacheManager = null) {
        this.config = config;
        this.logger = logger.child({ service: 'AuthManager' });
        this.databaseManager = databaseManager;
        this.cacheManager = cacheManager;
        this.jwtSecret = this.config.get('auth.jwtSecret') || process.env.JWT_SECRET || 'fusione-default-secret';
        this.jwtExpiration = this.config.get('auth.jwtExpiration') || '24h';
        this.refreshTokenExpiration = this.config.get('auth.refreshTokenExpiration') || '7d';
        this.saltRounds = this.config.get('auth.saltRounds') || 12;
        
        // Fallback para armazenamento em memória se o banco não estiver disponível
        this.refreshTokens = new Map();
        this.useDatabaseStorage = databaseManager && databaseManager.isHealthy();
        this.useCacheStorage = cacheManager && cacheManager.isConnected;
        
        this.logger.info('AuthManager inicializado', {
            jwtExpiration: this.jwtExpiration,
            refreshTokenExpiration: this.refreshTokenExpiration,
            useDatabaseStorage: this.useDatabaseStorage,
            useCacheStorage: this.useCacheStorage
        });
        
        // Configurar limpeza automática de tokens expirados
        this.setupTokenCleanup();
    }

    /**
     * Gera hash da senha
     * @param {string} password - Senha em texto plano
     * @returns {Promise<string>} Hash da senha
     */
    async hashPassword(password) {
        try {
            const salt = await bcrypt.genSalt(this.saltRounds);
            return await bcrypt.hash(password, salt);
        } catch (error) {
            this.logger.error('Erro ao gerar hash da senha', { error: error.message });
            throw new Error('Erro interno do servidor');
        }
    }

    /**
     * Verifica se a senha está correta
     * @param {string} password - Senha em texto plano
     * @param {string} hashedPassword - Hash da senha
     * @returns {Promise<boolean>} True se a senha estiver correta
     */
    async verifyPassword(password, hashedPassword) {
        try {
            return await bcrypt.compare(password, hashedPassword);
        } catch (error) {
            this.logger.error('Erro ao verificar senha', { error: error.message });
            return false;
        }
    }

    /**
     * Gera token JWT
     * @param {Object} payload - Dados do usuário
     * @returns {string} Token JWT
     */
    generateToken(payload) {
        try {
            const tokenPayload = {
                id: payload.id,
                email: payload.email,
                role: payload.role || 'user',
                permissions: payload.permissions || [],
                iat: Math.floor(Date.now() / 1000)
            };

            return jwt.sign(tokenPayload, this.jwtSecret, {
                expiresIn: this.jwtExpiration,
                issuer: 'fusione-core-system',
                audience: 'fusione-users'
            });
        } catch (error) {
            this.logger.error('Erro ao gerar token JWT', { error: error.message });
            throw new Error('Erro ao gerar token de autenticação');
        }
    }

    /**
     * Gera refresh token
     * @param {string} userId - ID do usuário
     * @param {Object} metadata - Metadados adicionais (userAgent, ipAddress, etc.)
     * @returns {Promise<string>} Refresh token
     */
    async generateRefreshToken(userId, metadata = {}) {
        const refreshToken = uuidv4();
        const expiresAt = new Date();
        expiresAt.setTime(expiresAt.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 dias

        if (this.useDatabaseStorage) {
            try {
                // Limitar número de tokens ativos por usuário
                await RefreshToken.limitTokensPerUser(userId, 5);
                
                // Criar novo token no banco
                await RefreshToken.create({
                    token: refreshToken,
                    userId,
                    expiresAt,
                    userAgent: metadata.userAgent || '',
                    ipAddress: metadata.ipAddress || '',
                    deviceInfo: metadata.deviceInfo || {},
                    location: metadata.location || {},
                    metadata: {
                        source: metadata.source || 'web',
                        sessionId: metadata.sessionId,
                        fingerprint: metadata.fingerprint
                    }
                });
                
                this.logger.info('Refresh token gerado no banco', { userId, expiresAt });
            } catch (error) {
                this.logger.error('Erro ao salvar refresh token no banco', { error: error.message, userId });
                // Fallback para memória
                this.refreshTokens.set(refreshToken, {
                    userId,
                    expiresAt,
                    createdAt: new Date()
                });
            }
        } else {
            // Armazenamento em memória
            this.refreshTokens.set(refreshToken, {
                userId,
                expiresAt,
                createdAt: new Date()
            });
            this.logger.info('Refresh token gerado em memória', { userId, expiresAt });
        }

        return refreshToken;
    }

    /**
     * Verifica e decodifica token JWT
     * @param {string} token - Token JWT
     * @returns {Object} Payload decodificado
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret, {
                issuer: 'fusione-core-system',
                audience: 'fusione-users'
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token expirado');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Token inválido');
            } else {
                this.logger.error('Erro ao verificar token', { error: error.message });
                throw new Error('Erro na verificação do token');
            }
        }
    }

    /**
     * Verifica refresh token
     * @param {string} refreshToken - Refresh token
     * @returns {Promise<Object|null>} Dados do refresh token ou null se inválido
     */
    async verifyRefreshToken(refreshToken) {
        if (this.useDatabaseStorage) {
            try {
                const tokenData = await RefreshToken.findValidToken(refreshToken);
                
                if (tokenData) {
                    // Marcar como usado
                    await tokenData.markAsUsed();
                    return {
                        userId: tokenData.userId._id,
                        user: tokenData.userId,
                        expiresAt: tokenData.expiresAt,
                        createdAt: tokenData.createdAt
                    };
                }
                
                return null;
            } catch (error) {
                this.logger.error('Erro ao verificar refresh token no banco', { error: error.message });
                // Fallback para memória
                return this.verifyRefreshTokenMemory(refreshToken);
            }
        } else {
            return this.verifyRefreshTokenMemory(refreshToken);
        }
    }

    /**
     * Verifica refresh token em memória (fallback)
     * @param {string} refreshToken - Refresh token
     * @returns {Object|null} Dados do refresh token ou null se inválido
     */
    verifyRefreshTokenMemory(refreshToken) {
        const tokenData = this.refreshTokens.get(refreshToken);
        
        if (!tokenData) {
            return null;
        }

        if (new Date() > tokenData.expiresAt) {
            this.refreshTokens.delete(refreshToken);
            return null;
        }

        return tokenData;
    }

    /**
     * Revoga refresh token
     * @param {string} refreshToken - Refresh token a ser revogado
     * @returns {Promise<boolean>} True se o token foi revogado
     */
    async revokeRefreshToken(refreshToken) {
        if (this.useDatabaseStorage) {
            try {
                const tokenDoc = await RefreshToken.findOne({ token: refreshToken, isActive: true });
                if (tokenDoc) {
                    await tokenDoc.revoke();
                    this.logger.info('Refresh token revogado no banco', { refreshToken: refreshToken.substring(0, 8) + '...' });
                    return true;
                }
                return false;
            } catch (error) {
                this.logger.error('Erro ao revogar refresh token no banco', { error: error.message });
                // Fallback para memória
                return this.revokeRefreshTokenMemory(refreshToken);
            }
        } else {
            return this.revokeRefreshTokenMemory(refreshToken);
        }
    }

    /**
     * Revoga refresh token em memória (fallback)
     * @param {string} refreshToken - Refresh token a ser revogado
     * @returns {boolean} True se o token foi revogado
     */
    revokeRefreshTokenMemory(refreshToken) {
        const deleted = this.refreshTokens.delete(refreshToken);
        if (deleted) {
            this.logger.info('Refresh token revogado em memória', { refreshToken: refreshToken.substring(0, 8) + '...' });
        }
        return deleted;
    }

    /**
     * Revoga todos os refresh tokens de um usuário
     * @param {string} userId - ID do usuário
     * @returns {Promise<number>} Número de tokens revogados
     */
    async revokeAllUserTokens(userId) {
        if (this.useDatabaseStorage) {
            try {
                const result = await RefreshToken.revokeAllUserTokens(userId);
                this.logger.info('Todos os refresh tokens do usuário revogados no banco', { userId, count: result.modifiedCount });
                return result.modifiedCount;
            } catch (error) {
                this.logger.error('Erro ao revogar tokens do usuário no banco', { error: error.message, userId });
                return 0;
            }
        } else {
            // Revogar tokens em memória
            let revoked = 0;
            for (const [token, data] of this.refreshTokens.entries()) {
                if (data.userId === userId) {
                    this.refreshTokens.delete(token);
                    revoked++;
                }
            }
            this.logger.info('Todos os refresh tokens do usuário revogados em memória', { userId, count: revoked });
            return revoked;
        }
    }

    /**
     * Limpa refresh tokens expirados
     * @returns {Promise<number>} Número de tokens removidos
     */
    async cleanExpiredRefreshTokens() {
        if (this.useDatabaseStorage) {
            try {
                const result = await RefreshToken.cleanupExpired();
                if (result.deletedCount > 0) {
                    this.logger.info('Refresh tokens expirados removidos do banco', { count: result.deletedCount });
                }
                return result.deletedCount;
            } catch (error) {
                this.logger.error('Erro ao limpar tokens expirados no banco', { error: error.message });
                return 0;
            }
        } else {
            // Limpeza em memória
            const now = new Date();
            let cleaned = 0;

            for (const [token, data] of this.refreshTokens.entries()) {
                if (now > data.expiresAt) {
                    this.refreshTokens.delete(token);
                    cleaned++;
                }
            }

            if (cleaned > 0) {
                this.logger.info('Refresh tokens expirados removidos da memória', { count: cleaned });
            }
            return cleaned;
        }

        return cleaned;
    }

    /**
     * Configura limpeza automática de tokens expirados
     */
    setupTokenCleanup() {
        // Executar limpeza a cada hora
        setInterval(async () => {
            try {
                const cleaned = await this.cleanExpiredRefreshTokens();
                if (cleaned > 0) {
                    this.logger.info('Limpeza automática de tokens executada', { tokensRemovidos: cleaned });
                }
            } catch (error) {
                this.logger.error('Erro na limpeza automática de tokens', { error: error.message });
            }
        }, 60 * 60 * 1000); // 1 hora

        this.logger.info('Limpeza automática de tokens configurada');
    }

    /**
     * Middleware de autenticação para Express
     * @param {Object} options - Opções do middleware
     * @returns {Function} Middleware function
     */
    authMiddleware(options = {}) {
        const {
            required = true,
            roles = [],
            permissions = []
        } = options;

        return (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    if (required) {
                        return res.status(401).json({
                            error: 'Token de autenticação requerido',
                            code: 'AUTH_TOKEN_REQUIRED'
                        });
                    }
                    return next();
                }

                const token = authHeader.substring(7); // Remove 'Bearer '
                const decoded = this.verifyToken(token);

                // Verificar roles se especificados
                if (roles.length > 0 && !roles.includes(decoded.role)) {
                    return res.status(403).json({
                        error: 'Acesso negado - role insuficiente',
                        code: 'INSUFFICIENT_ROLE',
                        required: roles,
                        current: decoded.role
                    });
                }

                // Verificar permissões se especificadas
                if (permissions.length > 0) {
                    const userPermissions = decoded.permissions || [];
                    const hasPermission = permissions.some(perm => userPermissions.includes(perm));
                    
                    if (!hasPermission) {
                        return res.status(403).json({
                            error: 'Acesso negado - permissão insuficiente',
                            code: 'INSUFFICIENT_PERMISSION',
                            required: permissions,
                            current: userPermissions
                        });
                    }
                }

                req.user = decoded;
                next();
            } catch (error) {
                this.logger.warn('Falha na autenticação', { 
                    error: error.message,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });

                return res.status(401).json({
                    error: error.message,
                    code: 'AUTH_FAILED'
                });
            }
        };
    }

    /**
     * Obtém estatísticas do AuthManager
     * @returns {Promise<Object>} Estatísticas
     */
    async getStats() {
        let refreshTokenStats = {
            active: 0,
            expired: 0,
            total: 0,
            revoked: 0
        };

        if (this.useDatabaseStorage) {
            try {
                refreshTokenStats = await RefreshToken.getStats();
            } catch (error) {
                this.logger.error('Erro ao obter estatísticas do banco', { error: error.message });
                // Fallback para estatísticas em memória
                refreshTokenStats = this.getMemoryStats();
            }
        } else {
            refreshTokenStats = this.getMemoryStats();
        }

        return {
            refreshTokens: refreshTokenStats,
            database: {
                enabled: this.useDatabaseStorage,
                healthy: this.databaseManager ? this.databaseManager.isHealthy() : false
            },
            config: {
                jwtExpiration: this.jwtExpiration,
                refreshTokenExpiration: this.refreshTokenExpiration,
                saltRounds: this.saltRounds
            }
        };
    }

    /**
     * Obtém estatísticas dos tokens em memória
     * @returns {Object} Estatísticas
     */
    getMemoryStats() {
        const now = new Date();
        let activeRefreshTokens = 0;
        let expiredRefreshTokens = 0;

        for (const [, data] of this.refreshTokens.entries()) {
            if (now > data.expiresAt) {
                expiredRefreshTokens++;
            } else {
                activeRefreshTokens++;
            }
        }

        return {
            active: activeRefreshTokens,
            expired: expiredRefreshTokens,
            total: this.refreshTokens.size,
            revoked: 0
        };
    }

    /**
     * Registra um novo usuário
     * @param {Object} userData - Dados do usuário
     * @returns {Promise<Object>} Usuário criado
     */
    async registerUser(userData) {
        if (!this.useDatabaseStorage) {
            throw new Error('Registro de usuário requer conexão com banco de dados');
        }

        try {
            // Verificar se o email já existe
            const existingUser = await User.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('Email já está em uso');
            }

            // Criar novo usuário
            const user = new User(userData);
            await user.save();

            this.logger.info('Usuário registrado com sucesso', { userId: user._id, email: user.email });
            return user;
        } catch (error) {
            this.logger.error('Erro ao registrar usuário', { error: error.message, email: userData.email });
            throw error;
        }
    }

    /**
     * Autentica um usuário
     * @param {string} email - Email do usuário
     * @param {string} password - Senha do usuário
     * @returns {Promise<Object>} Dados de autenticação
     */
    async authenticateUser(email, password) {
        if (!this.useDatabaseStorage) {
            throw new Error('Autenticação requer conexão com banco de dados');
        }

        try {
            // Buscar usuário com senha
            const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
            if (!user) {
                throw new Error('Credenciais inválidas');
            }

            // Verificar se a conta está bloqueada
            if (user.isLocked) {
                throw new Error('Conta temporariamente bloqueada devido a muitas tentativas de login');
            }

            // Verificar se a conta está ativa
            if (!user.isActive) {
                throw new Error('Conta desativada');
            }

            // Verificar senha
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                await user.incLoginAttempts();
                throw new Error('Credenciais inválidas');
            }

            // Reset tentativas de login e atualizar último login
            await user.resetLoginAttempts();

            this.logger.info('Usuário autenticado com sucesso', { userId: user._id, email: user.email });
            return user;
        } catch (error) {
            this.logger.error('Erro na autenticação', { error: error.message, email });
            throw error;
        }
    }

    /**
     * Obtém dados do usuário do cache
     * @param {string} userId - ID do usuário
     * @returns {Promise<Object|null>} Dados do usuário ou null
     */
    async getUserFromCache(userId) {
        if (!this.useCacheStorage) {
            return null;
        }

        try {
            const cacheKey = `user:${userId}`;
            const cachedUser = await this.cacheManager.get(cacheKey);
            
            if (cachedUser) {
                this.logger.debug('Usuário obtido do cache', { userId });
                return cachedUser;
            }
            
            return null;
        } catch (error) {
            this.logger.error('Erro ao obter usuário do cache', { error: error.message, userId });
            return null;
        }
    }

    /**
     * Armazena dados do usuário no cache
     * @param {string} userId - ID do usuário
     * @param {Object} userData - Dados do usuário
     * @param {number} ttl - TTL em segundos (opcional)
     * @returns {Promise<boolean>} True se armazenado com sucesso
     */
    async setUserCache(userId, userData, ttl = 1800) { // 30 minutos por padrão
        if (!this.useCacheStorage) {
            return false;
        }

        try {
            const cacheKey = `user:${userId}`;
            // Remover dados sensíveis antes de cachear
            const safeUserData = {
                _id: userData._id,
                email: userData.email,
                name: userData.name,
                role: userData.role,
                isActive: userData.isActive,
                lastLogin: userData.lastLogin,
                createdAt: userData.createdAt,
                updatedAt: userData.updatedAt
            };
            
            const success = await this.cacheManager.set(cacheKey, safeUserData, ttl);
            
            if (success) {
                this.logger.debug('Usuário armazenado no cache', { userId, ttl });
            }
            
            return success;
        } catch (error) {
            this.logger.error('Erro ao armazenar usuário no cache', { error: error.message, userId });
            return false;
        }
    }

    /**
     * Remove dados do usuário do cache
     * @param {string} userId - ID do usuário
     * @returns {Promise<boolean>} True se removido com sucesso
     */
    async removeUserCache(userId) {
        if (!this.useCacheStorage) {
            return false;
        }

        try {
            const cacheKey = `user:${userId}`;
            const success = await this.cacheManager.del(cacheKey);
            
            if (success) {
                this.logger.debug('Usuário removido do cache', { userId });
            }
            
            return success;
        } catch (error) {
            this.logger.error('Erro ao remover usuário do cache', { error: error.message, userId });
            return false;
        }
    }

    /**
     * Armazena sessão ativa no cache
     * @param {string} sessionId - ID da sessão
     * @param {Object} sessionData - Dados da sessão
     * @param {number} ttl - TTL em segundos (opcional)
     * @returns {Promise<boolean>} True se armazenado com sucesso
     */
    async setSessionCache(sessionId, sessionData, ttl = 3600) { // 1 hora por padrão
        if (!this.useCacheStorage) {
            return false;
        }

        try {
            const cacheKey = `session:${sessionId}`;
            const success = await this.cacheManager.set(cacheKey, sessionData, ttl);
            
            if (success) {
                this.logger.debug('Sessão armazenada no cache', { sessionId, ttl });
            }
            
            return success;
        } catch (error) {
            this.logger.error('Erro ao armazenar sessão no cache', { error: error.message, sessionId });
            return false;
        }
    }

    /**
     * Obtém dados da sessão do cache
     * @param {string} sessionId - ID da sessão
     * @returns {Promise<Object|null>} Dados da sessão ou null
     */
    async getSessionFromCache(sessionId) {
        if (!this.useCacheStorage) {
            return null;
        }

        try {
            const cacheKey = `session:${sessionId}`;
            const sessionData = await this.cacheManager.get(cacheKey);
            
            if (sessionData) {
                this.logger.debug('Sessão obtida do cache', { sessionId });
                return sessionData;
            }
            
            return null;
        } catch (error) {
            this.logger.error('Erro ao obter sessão do cache', { error: error.message, sessionId });
            return null;
        }
    }

    /**
     * Remove sessão do cache
     * @param {string} sessionId - ID da sessão
     * @returns {Promise<boolean>} True se removido com sucesso
     */
    async removeSessionCache(sessionId) {
        if (!this.useCacheStorage) {
            return false;
        }

        try {
            const cacheKey = `session:${sessionId}`;
            const success = await this.cacheManager.del(cacheKey);
            
            if (success) {
                this.logger.debug('Sessão removida do cache', { sessionId });
            }
            
            return success;
        } catch (error) {
            this.logger.error('Erro ao remover sessão do cache', { error: error.message, sessionId });
            return false;
        }
    }

    /**
     * Limpa cache relacionado a um usuário
     * @param {string} userId - ID do usuário
     * @returns {Promise<boolean>} True se limpo com sucesso
     */
    async clearUserCache(userId) {
        if (!this.useCacheStorage) {
            return false;
        }

        try {
            const userCacheKey = `user:${userId}`;
            await this.cacheManager.del(userCacheKey);
            
            // Também limpar sessões relacionadas (se necessário)
            // Isso seria mais complexo e dependeria da implementação específica
            
            this.logger.debug('Cache do usuário limpo', { userId });
            return true;
        } catch (error) {
            this.logger.error('Erro ao limpar cache do usuário', { error: error.message, userId });
            return false;
        }
    }
}

export default AuthManager;