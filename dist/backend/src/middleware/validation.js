import { validationResult } from 'express-validator';
import { createLogger } from '../core/logger.js';

const logger = createLogger('ValidationMiddleware');

/**
 * Middleware para processar resultados de validação do express-validator
 */
export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));
    
    logger.warn('Erro de validação:', {
      url: req.originalUrl,
      method: req.method,
      errors: errorMessages
    });
    
    return res.status(400).json({
      success: false,
      message: 'Dados de entrada inválidos',
      errors: errorMessages
    });
  }
  
  next();
};

/**
 * Middleware para validar tipos de arquivo
 */
export const validateFileType = (allowedTypes) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files || [req.file];
    
    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Tipo de arquivo não permitido: ${file.mimetype}. Tipos permitidos: ${allowedTypes.join(', ')}`
        });
      }
    }
    
    next();
  };
};

/**
 * Middleware para validar tamanho de arquivo
 */
export const validateFileSize = (maxSize) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files || [req.file];
    
    for (const file of files) {
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `Arquivo muito grande: ${file.originalname}. Tamanho máximo: ${maxSize} bytes`
        });
      }
    }
    
    next();
  };
};

/**
 * Middleware para sanitizar entrada
 */
export const sanitizeInput = (req, res, next) => {
  // Função recursiva para sanitizar objetos
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Remove caracteres perigosos
      return obj.replace(/<script[^>]*>.*?<\/script>/gi, '')
                .replace(/<[^>]*>/g, '')
                .trim();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  // Sanitizar body, query e params
  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }
  
  next();
};

/**
 * Middleware para rate limiting simples
 */
export const rateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Limpar registros antigos
    for (const [id, data] of requests.entries()) {
      if (now - data.firstRequest > windowMs) {
        requests.delete(id);
      }
    }
    
    // Verificar limite para o cliente atual
    const clientData = requests.get(clientId);
    
    if (!clientData) {
      requests.set(clientId, {
        firstRequest: now,
        count: 1
      });
      return next();
    }
    
    if (now - clientData.firstRequest > windowMs) {
      // Reset da janela
      requests.set(clientId, {
        firstRequest: now,
        count: 1
      });
      return next();
    }
    
    clientData.count++;
    
    if (clientData.count > maxRequests) {
      logger.warn(`Rate limit excedido para ${clientId}`);
      return res.status(429).json({
        success: false,
        message: 'Muitas requisições. Tente novamente mais tarde.',
        retryAfter: Math.ceil((windowMs - (now - clientData.firstRequest)) / 1000)
      });
    }
    
    next();
  };
};

export default {
  validateRequest,
  validateFileType,
  validateFileSize,
  sanitizeInput,
  rateLimit
};