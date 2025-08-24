import express from 'express';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';

const router = express.Router();

/**
 * Configuração das rotas de autenticação
 * @param {Object} authManager - Instância do AuthManager
 * @param {Object} logger - Logger do sistema
 * @returns {Object} Router configurado
 */
export function setupAuthRoutes(authManager, logger) {
    const authLogger = logger.child({ service: 'AuthRoutes' });

    // Rate limiting para rotas de autenticação
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 5, // máximo 5 tentativas por IP
        message: {
            error: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.',
            code: 'RATE_LIMIT_EXCEEDED'
        },
        standardHeaders: true,
        legacyHeaders: false
    });

    // Rate limiting mais restritivo para login
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutos
        max: 3, // máximo 3 tentativas de login por IP
        message: {
            error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
            code: 'LOGIN_RATE_LIMIT_EXCEEDED'
        }
    });

    // Schemas de validação
    const registerSchema = Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Email deve ter um formato válido',
            'any.required': 'Email é obrigatório'
        }),
        password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required().messages({
            'string.min': 'Senha deve ter pelo menos 8 caracteres',
            'string.pattern.base': 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
            'any.required': 'Senha é obrigatória'
        }),
        name: Joi.string().min(2).max(100).required().messages({
            'string.min': 'Nome deve ter pelo menos 2 caracteres',
            'string.max': 'Nome deve ter no máximo 100 caracteres',
            'any.required': 'Nome é obrigatório'
        }),
        role: Joi.string().valid('user', 'admin', 'moderator').default('user')
    });

    const loginSchema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const refreshTokenSchema = Joi.object({
        refreshToken: Joi.string().required().messages({
            'any.required': 'Refresh token é obrigatório'
        })
    });

    // Simulação de banco de dados de usuários (em produção, usar BD real)
    const users = new Map();
    
    // Criar usuário padrão para teste
    const createDefaultUser = async () => {
        const defaultEmail = 'gustavorighi@gmail.com';
        if (!users.has(defaultEmail)) {
            const hashedPassword = await authManager.hashPassword('123456');
            const defaultUser = {
                id: 'user_default_001',
                email: defaultEmail,
                password: hashedPassword,
                name: 'Gustavo Righi',
                role: 'admin',
                permissions: ['read', 'write', 'delete', 'admin'],
                createdAt: new Date(),
                lastLogin: null
            };
            users.set(defaultEmail, defaultUser);
            authLogger.info('Usuário padrão criado', { email: defaultEmail });
        }
    };
    
    // Criar usuário padrão imediatamente
    createDefaultUser().catch(error => {
        authLogger.error('Erro ao criar usuário padrão', { error: error.message });
    });

    /**
     * POST /auth/register
     * Registra um novo usuário
     */
    router.post('/register', authLimiter, async (req, res) => {
        try {
            const { error, value } = registerSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    error: 'Dados de registro inválidos',
                    details: error.details.map(detail => detail.message),
                    code: 'VALIDATION_ERROR'
                });
            }

            const { email, password, name, role } = value;

            // Verificar se usuário já existe
            if (users.has(email)) {
                return res.status(409).json({
                    error: 'Usuário já existe com este email',
                    code: 'USER_ALREADY_EXISTS'
                });
            }

            // Hash da senha
            const hashedPassword = await authManager.hashPassword(password);

            // Criar usuário
            const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const user = {
                id: userId,
                email,
                password: hashedPassword,
                name,
                role,
                permissions: role === 'admin' ? ['read', 'write', 'delete', 'admin'] : ['read'],
                createdAt: new Date(),
                lastLogin: null
            };

            users.set(email, user);

            // Gerar tokens
            const token = authManager.generateToken({
                id: user.id,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            });
            const refreshToken = authManager.generateRefreshToken(user.id);

            authLogger.info('Usuário registrado com sucesso', {
                userId: user.id,
                email: user.email,
                role: user.role,
                ip: req.ip
            });

            res.status(201).json({
                message: 'Usuário registrado com sucesso',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    permissions: user.permissions
                },
                tokens: {
                    accessToken: token,
                    refreshToken,
                    expiresIn: '24h'
                }
            });
        } catch (error) {
            authLogger.error('Erro no registro de usuário', {
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Erro interno do servidor',
                code: 'INTERNAL_SERVER_ERROR'
            });
        }
    });

    /**
     * POST /auth/login
     * Autentica um usuário
     */
    router.post('/login', loginLimiter, async (req, res) => {
        try {
            const { error, value } = loginSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    error: 'Dados de login inválidos',
                    details: error.details.map(detail => detail.message),
                    code: 'VALIDATION_ERROR'
                });
            }

            const { email, password } = value;

            // Buscar usuário
            const user = users.get(email);
            if (!user) {
                authLogger.warn('Tentativa de login com email inexistente', {
                    email,
                    ip: req.ip
                });
                return res.status(401).json({
                    error: 'Credenciais inválidas',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Verificar senha
            const isPasswordValid = await authManager.verifyPassword(password, user.password);
            if (!isPasswordValid) {
                authLogger.warn('Tentativa de login com senha incorreta', {
                    userId: user.id,
                    email: user.email,
                    ip: req.ip
                });
                return res.status(401).json({
                    error: 'Credenciais inválidas',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Atualizar último login
            user.lastLogin = new Date();

            // Gerar tokens
            const token = authManager.generateToken({
                id: user.id,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            });
            const refreshToken = authManager.generateRefreshToken(user.id);

            authLogger.info('Login realizado com sucesso', {
                userId: user.id,
                email: user.email,
                ip: req.ip
            });

            res.json({
                message: 'Login realizado com sucesso',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    permissions: user.permissions,
                    lastLogin: user.lastLogin
                },
                tokens: {
                    accessToken: token,
                    refreshToken,
                    expiresIn: '24h'
                }
            });
        } catch (error) {
            authLogger.error('Erro no login', {
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Erro interno do servidor',
                code: 'INTERNAL_SERVER_ERROR'
            });
        }
    });

    /**
     * POST /auth/refresh
     * Renova o token de acesso usando refresh token
     */
    router.post('/refresh', authLimiter, (req, res) => {
        try {
            const { error, value } = refreshTokenSchema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    error: 'Refresh token inválido',
                    details: error.details.map(detail => detail.message),
                    code: 'VALIDATION_ERROR'
                });
            }

            const { refreshToken } = value;

            // Verificar refresh token
            const tokenData = authManager.verifyRefreshToken(refreshToken);
            if (!tokenData) {
                return res.status(401).json({
                    error: 'Refresh token inválido ou expirado',
                    code: 'INVALID_REFRESH_TOKEN'
                });
            }

            // Buscar usuário
            const user = Array.from(users.values()).find(u => u.id === tokenData.userId);
            if (!user) {
                authManager.revokeRefreshToken(refreshToken);
                return res.status(401).json({
                    error: 'Usuário não encontrado',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Gerar novo token de acesso
            const newToken = authManager.generateToken({
                id: user.id,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            });

            authLogger.info('Token renovado com sucesso', {
                userId: user.id,
                ip: req.ip
            });

            res.json({
                message: 'Token renovado com sucesso',
                tokens: {
                    accessToken: newToken,
                    expiresIn: '24h'
                }
            });
        } catch (error) {
            authLogger.error('Erro na renovação do token', {
                error: error.message,
                stack: error.stack,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Erro interno do servidor',
                code: 'INTERNAL_SERVER_ERROR'
            });
        }
    });

    /**
     * POST /auth/logout
     * Faz logout do usuário (revoga refresh token)
     */
    router.post('/logout', authManager.authMiddleware(), (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (refreshToken) {
                authManager.revokeRefreshToken(refreshToken);
            }

            authLogger.info('Logout realizado', {
                userId: req.user.id,
                ip: req.ip
            });

            res.json({
                message: 'Logout realizado com sucesso'
            });
        } catch (error) {
            authLogger.error('Erro no logout', {
                error: error.message,
                userId: req.user?.id,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Erro interno do servidor',
                code: 'INTERNAL_SERVER_ERROR'
            });
        }
    });

    /**
     * GET /auth/me
     * Retorna informações do usuário autenticado
     */
    router.get('/me', authManager.authMiddleware(), (req, res) => {
        try {
            const user = Array.from(users.values()).find(u => u.id === req.user.id);
            
            if (!user) {
                return res.status(404).json({
                    error: 'Usuário não encontrado',
                    code: 'USER_NOT_FOUND'
                });
            }

            res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    permissions: user.permissions,
                    createdAt: user.createdAt,
                    lastLogin: user.lastLogin
                }
            });
        } catch (error) {
            authLogger.error('Erro ao buscar informações do usuário', {
                error: error.message,
                userId: req.user?.id,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Erro interno do servidor',
                code: 'INTERNAL_SERVER_ERROR'
            });
        }
    });

    /**
     * GET /auth/stats
     * Retorna estatísticas de autenticação (apenas para admins)
     */
    router.get('/stats', authManager.authMiddleware({ roles: ['admin'] }), (req, res) => {
        try {
            const authStats = authManager.getStats();
            const userStats = {
                total: users.size,
                byRole: {
                    admin: Array.from(users.values()).filter(u => u.role === 'admin').length,
                    moderator: Array.from(users.values()).filter(u => u.role === 'moderator').length,
                    user: Array.from(users.values()).filter(u => u.role === 'user').length
                }
            };

            res.json({
                auth: authStats,
                users: userStats,
                timestamp: new Date()
            });
        } catch (error) {
            authLogger.error('Erro ao buscar estatísticas', {
                error: error.message,
                userId: req.user?.id,
                ip: req.ip
            });

            res.status(500).json({
                error: 'Erro interno do servidor',
                code: 'INTERNAL_SERVER_ERROR'
            });
        }
    });

    // Limpeza automática de refresh tokens expirados a cada hora
    setInterval(() => {
        authManager.cleanExpiredRefreshTokens();
    }, 60 * 60 * 1000);

    authLogger.info('Rotas de autenticação configuradas');
    return router;
}

export default router;