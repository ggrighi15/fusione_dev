/**
 * Sistema de Logging do Fusione Core System
 * Configuração centralizada de logs com Winston
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração de formatos
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let log = `${timestamp} [${service || 'SYSTEM'}] ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    return log;
  })
);

// Configuração de transports
const transports = [
  // Console
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: consoleFormat
  })
];

// Adicionar file transports em produção
if (process.env.NODE_ENV === 'production') {
  const logsDir = path.join(process.cwd(), 'logs');
  
  transports.push(
    // Logs gerais
    new winston.transports.File({
      filename: path.join(logsDir, 'fusione-core.log'),
      level: 'info',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Logs de erro
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Logger principal
const mainLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

/**
 * Cria um logger específico para um serviço/módulo
 * @param {string} service - Nome do serviço/módulo
 * @returns {winston.Logger} Logger configurado
 */
export function createLogger(service) {
  return mainLogger.child({ service });
}

/**
 * Logger padrão do sistema
 */
export const logger = mainLogger;

/**
 * Middleware para logging de requisições HTTP
 */
export function httpLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    if (res.statusCode >= 400) {
      mainLogger.warn('HTTP Request', logData);
    } else {
      mainLogger.info('HTTP Request', logData);
    }
  });
  
  next();
}

export default mainLogger;