/**
 * Fusione Core System
 * Sistema central para integração e gerenciamento de módulos
 * 
 * @author Gustavo Righi <gustavorighi@gmail.com>
 * @version 1.0.0
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createLogger } from './core/logger.js';
import { ModuleManager } from './core/module-manager.js';
import { ConfigManager } from './core/config-manager.js';
import { EventBus } from './core/event-bus.js';
import { HealthCheck } from './core/health-check.js';
import { apiRoutes } from './routes/api.js';

// Configuração do ambiente
dotenv.config();

class FusioneCoreSystem {
  constructor() {
    this.app = express();
    this.logger = createLogger('FusioneCoreSystem');
    this.configManager = new ConfigManager();
    this.eventBus = new EventBus();
    this.moduleManager = new ModuleManager(this.eventBus, this.logger, this.configManager);
    this.healthCheck = new HealthCheck();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Segurança
    this.app.use(helmet());
    
    // CORS
    this.app.use(cors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true
    }));
    
    // Parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Logging de requisições
    this.app.use((req, res, next) => {
      this.logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      const health = this.healthCheck.getStatus();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });
    
    // API routes
    this.app.use('/api', apiRoutes);
    
    // Rota padrão
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Fusione Core System',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        modules: this.moduleManager.getLoadedModules()
      });
    });
  }

  setupErrorHandling() {
    // 404 Handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Endpoint não encontrado',
        path: req.originalUrl,
        method: req.method
      });
    });
    
    // Error Handler
    this.app.use((err, req, res, next) => {
      this.logger.error('Erro não tratado:', err);
      
      res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
          ? 'Erro interno do servidor' 
          : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
      });
    });
  }

  async start() {
    try {
      // Inicializar configurações
      await this.configManager.initialize();
      
      // Carregar módulos
      await this.moduleManager.loadModules();
      
      // Iniciar servidor
      const port = process.env.PORT || 3000;
      const host = process.env.HOST || 'localhost';
      
      this.server = this.app.listen(port, host, () => {
        this.logger.info(`🚀 Fusione Core System iniciado em http://${host}:${port}`);
        this.logger.info(`📊 Health check disponível em http://${host}:${port}/health`);
        
        // Emitir evento de sistema iniciado
        this.eventBus.emit('system:started', {
          host,
          port,
          timestamp: new Date().toISOString()
        });
      });
      
    } catch (error) {
      this.logger.error('Erro ao iniciar o sistema:', error);
      process.exit(1);
    }
  }

  async stop() {
    this.logger.info('Parando Fusione Core System...');
    
    // Parar módulos
    await this.moduleManager.unloadModules();
    
    // Fechar servidor
    if (this.server) {
      this.server.close(() => {
        this.logger.info('Sistema parado com sucesso');
        process.exit(0);
      });
    }
  }
}

// Inicializar sistema
const system = new FusioneCoreSystem();

// Handlers de processo
process.on('SIGTERM', () => system.stop());
process.on('SIGINT', () => system.stop());
process.on('uncaughtException', (error) => {
  console.error('Exceção não capturada:', error);
  system.stop();
});

// Iniciar sistema
system.start();

export default system;