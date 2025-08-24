import jwt from 'jsonwebtoken';
import { createLogger } from '../core/logger.js';

const logger = createLogger('AuthMiddleware');

/**
 * Middleware para autenticar token JWT
 */
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acesso requerido'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fusione-secret-key', (err, user) => {
    if (err) {
      logger.warn('Token inválido:', err.message);
      return res.status(403).json({
        success: false,
        message: 'Token inválido'
      });
    }

    req.user = user;
    next();
  });
};

/**
 * Middleware para verificar roles/permissões
 */
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.role];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      logger.warn(`Acesso negado para usuário ${req.user.id}. Roles requeridas: ${roles.join(', ')}, Roles do usuário: ${userRoles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: 'Permissões insuficientes'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar se o usuário é admin
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Middleware para verificar se o usuário é operador ou admin
 */
export const requireOperator = requireRole(['admin', 'operator']);

/**
 * Middleware opcional de autenticação (não falha se não houver token)
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fusione-secret-key', (err, user) => {
    if (err) {
      req.user = null;
    } else {
      req.user = user;
    }
    next();
  });
};

export default {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireOperator,
  optionalAuth
};