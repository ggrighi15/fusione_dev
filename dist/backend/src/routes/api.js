/**
 * Rotas da API do Fusione Core System
 * Define endpoints para gerenciamento do sistema e módulos
 */

import express from 'express';
import { createLogger } from '../core/logger.js';
import algorithmsRoutes from './algorithms.js';
import dataRoutes from './data.js';
import templatesRoutes from './templates.js';
import businessRoutes from './business.js';
import reportsRoutes from './reports.js';
import notificationsRoutes from './notifications.js';
import xmlLoaderRoutes from './xml-loader.js';
import contratosRoutes from './contratos.js';

const router = express.Router();
const logger = createLogger('API');

// Middleware para logging de API
router.use((req, res, next) => {
  logger.debug(`API Request: ${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

// Middleware para resposta padrão
router.use((req, res, next) => {
  res.apiResponse = (data, message = 'Success', status = 200) => {
    res.status(status).json({
      success: status < 400,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  };
  
  res.apiError = (message, status = 500, details = null) => {
    res.status(status).json({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    });
  };
  
  next();
});

// Rotas de informações do sistema
router.get('/system/info', (req, res) => {
  const systemInfo = {
    name: 'Fusione Core System',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
    platform: process.platform,
    nodeVersion: process.version
  };
  
  res.apiResponse(systemInfo, 'Informações do sistema obtidas com sucesso');
});

// Rotas de módulos
router.get('/modules', (req, res) => {
  try {
    // Obter instância do module manager do app
    const moduleManager = req.app.get('moduleManager');
    if (!moduleManager) {
      return res.apiError('Module Manager não disponível', 503);
    }
    
    const modules = moduleManager.getLoadedModules();
    res.apiResponse(modules, 'Lista de módulos obtida com sucesso');
    
  } catch (error) {
    logger.error('Erro ao obter módulos:', error);
    res.apiError('Erro interno do servidor', 500, error.message);
  }
});

router.get('/modules/:name', (req, res) => {
  try {
    const { name } = req.params;
    const moduleManager = req.app.get('moduleManager');
    
    if (!moduleManager) {
      return res.apiError('Module Manager não disponível', 503);
    }
    
    const module = moduleManager.getModule(name);
    if (!module) {
      return res.apiError(`Módulo '${name}' não encontrado`, 404);
    }
    
    const moduleInfo = {
      name,
      status: 'loaded',
      config: moduleManager.moduleConfigs.get(name),
      // Adicionar informações específicas do módulo se disponíveis
      ...(typeof module.getInfo === 'function' ? module.getInfo() : {})
    };
    
    res.apiResponse(moduleInfo, `Informações do módulo '${name}' obtidas com sucesso`);
    
  } catch (error) {
    logger.error(`Erro ao obter módulo ${req.params.name}:`, error);
    res.apiError('Erro interno do servidor', 500, error.message);
  }
});

router.post('/modules/:name/reload', async (req, res) => {
  try {
    const { name } = req.params;
    const moduleManager = req.app.get('moduleManager');
    
    if (!moduleManager) {
      return res.apiError('Module Manager não disponível', 503);
    }
    
    await moduleManager.reloadModule(name);
    
    res.apiResponse(
      { name, status: 'reloaded' },
      `Módulo '${name}' recarregado com sucesso`
    );
    
  } catch (error) {
    logger.error(`Erro ao recarregar módulo ${req.params.name}:`, error);
    res.apiError(
      `Erro ao recarregar módulo '${req.params.name}'`,
      500,
      error.message
    );
  }
});

// Rotas de configuração
router.get('/config', (req, res) => {
  try {
    const configManager = req.app.get('configManager');
    if (!configManager) {
      return res.apiError('Config Manager não disponível', 503);
    }
    
    const config = configManager.getAll();
    res.apiResponse(config, 'Configurações obtidas com sucesso');
    
  } catch (error) {
    logger.error('Erro ao obter configurações:', error);
    res.apiError('Erro interno do servidor', 500, error.message);
  }
});

router.get('/config/:key', (req, res) => {
  try {
    const { key } = req.params;
    const configManager = req.app.get('configManager');
    
    if (!configManager) {
      return res.apiError('Config Manager não disponível', 503);
    }
    
    const value = configManager.get(key);
    if (value === undefined) {
      return res.apiError(`Configuração '${key}' não encontrada`, 404);
    }
    
    res.apiResponse(
      { key, value },
      `Configuração '${key}' obtida com sucesso`
    );
    
  } catch (error) {
    logger.error(`Erro ao obter configuração ${req.params.key}:`, error);
    res.apiError('Erro interno do servidor', 500, error.message);
  }
});

router.put('/config/:key', (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const configManager = req.app.get('configManager');
    
    if (!configManager) {
      return res.apiError('Config Manager não disponível', 503);
    }
    
    if (value === undefined) {
      return res.apiError('Valor da configuração é obrigatório', 400);
    }
    
    configManager.set(key, value);
    
    res.apiResponse(
      { key, value },
      `Configuração '${key}' atualizada com sucesso`
    );
    
  } catch (error) {
    logger.error(`Erro ao atualizar configuração ${req.params.key}:`, error);
    res.apiError('Erro interno do servidor', 500, error.message);
  }
});

// Rotas de eventos
router.get('/events/stats', (req, res) => {
  try {
    const eventBus = req.app.get('eventBus');
    if (!eventBus) {
      return res.apiError('Event Bus não disponível', 503);
    }
    
    const stats = eventBus.getStats();
    res.apiResponse(stats, 'Estatísticas de eventos obtidas com sucesso');
    
  } catch (error) {
    logger.error('Erro ao obter estatísticas de eventos:', error);
    res.apiError('Erro interno do servidor', 500, error.message);
  }
});

router.get('/events/history', (req, res) => {
  try {
    const eventBus = req.app.get('eventBus');
    if (!eventBus) {
      return res.apiError('Event Bus não disponível', 503);
    }
    
    const { limit = 100, event } = req.query;
    const history = eventBus.getHistory(parseInt(limit), event);
    
    res.apiResponse(
      {
        events: history,
        total: history.length,
        limit: parseInt(limit),
        filter: event || null
      },
      'Histórico de eventos obtido com sucesso'
    );
    
  } catch (error) {
    logger.error('Erro ao obter histórico de eventos:', error);
    res.apiError('Erro interno do servidor', 500, error.message);
  }
});

router.post('/events/emit', (req, res) => {
  try {
    const { event, data } = req.body;
    const eventBus = req.app.get('eventBus');
    
    if (!eventBus) {
      return res.apiError('Event Bus não disponível', 503);
    }
    
    if (!event) {
      return res.apiError('Nome do evento é obrigatório', 400);
    }
    
    eventBus.emit(event, data);
    
    res.apiResponse(
      { event, data, emitted: true },
      `Evento '${event}' emitido com sucesso`
    );
    
  } catch (error) {
    logger.error('Erro ao emitir evento:', error);
    res.apiError('Erro interno do servidor', 500, error.message);
  }
});

// Rota de logs (últimos logs)
router.get('/logs', (req, res) => {
  try {
    const { level = 'info', limit = 100 } = req.query;
    
    // Esta é uma implementação básica
    // Em produção, você pode querer integrar com um sistema de logs mais robusto
    res.apiResponse(
      {
        message: 'Endpoint de logs não implementado completamente',
        suggestion: 'Use ferramentas como Winston com transports apropriados para logs em produção'
      },
      'Informação sobre logs'
    );
    
  } catch (error) {
    logger.error('Erro ao obter logs:', error);
    res.apiError('Erro interno do servidor', 500, error.message);
  }
});

// Rotas dos módulos
router.use('/algorithms', algorithmsRoutes);
router.use('/data', dataRoutes);
router.use('/templates', templatesRoutes);
router.use('/business', businessRoutes);
router.use('/reports', reportsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/xml-loader', xmlLoaderRoutes);
router.use('/contratos', contratosRoutes);

// Middleware de tratamento de erros para rotas da API
router.use((error, req, res, next) => {
  logger.error('Erro não tratado na API:', error);
  
  if (!res.headersSent) {
    res.apiError(
      'Erro interno do servidor',
      500,
      process.env.NODE_ENV === 'development' ? error.message : undefined
    );
  }
});

// Middleware para rotas não encontradas na API
router.use('*', (req, res) => {
  res.apiError(
    `Endpoint da API não encontrado: ${req.method} ${req.originalUrl}`,
    404
  );
});

export { router as apiRoutes };