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
import { DatabaseManager } from './core/database-manager.js';
import AuthManager from './core/auth-manager.js';
import CacheManager from './core/cache-manager.js';
import WebSocketManager from './core/websocket-manager.js';
import { apiRoutes } from './routes/api.js';
import { setupAuthRoutes } from './routes/auth.js';

// Configuração do ambiente
dotenv.config();

class FusioneCoreSystem {
  constructor() {
    this.app = express();
    this.logger = createLogger('FusioneCoreSystem');
    this.configManager = new ConfigManager();
    this.eventBus = new EventBus();
    this.databaseManager = null; // Será inicializado se habilitado
    this.cacheManager = null; // Será inicializado se habilitado
    this.websocketManager = null; // Será inicializado se habilitado
    this.authManager = null; // Será inicializado após o configManager e databaseManager
    this.moduleManager = new ModuleManager(this.eventBus, this.logger, this.configManager, this);
    this.healthCheck = new HealthCheck();
    
    this.setupMiddleware();
    this.setupRoutes();
    // setupErrorHandling será chamado após configuração das rotas de auth
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
        modules: this.moduleManager.getLoadedModules(),
        components: {
          database: {
            enabled: this.configManager.get('database.enabled'),
            connected: this.databaseManager ? this.databaseManager.isHealthy() : false
          },
          cache: {
            enabled: this.configManager.get('redis.enabled'),
            connected: this.cacheManager ? this.cacheManager.isConnected : false
          },
          websocket: {
            enabled: this.configManager.get('websocket.enabled'),
            initialized: this.websocketManager ? this.websocketManager.isInitialized : false
          },
          authentication: {
            enabled: this.configManager.get('api.authentication.enabled'),
            available: this.authManager !== null
          }
        }
      });
    });
  }

  setupAuthRoutes() {
    // Authentication routes (configuradas após inicialização do AuthManager)
    if (this.authManager) {
      this.app.use('/auth', setupAuthRoutes(this.authManager, this.logger));
    }
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
      
      // Inicializar DatabaseManager se habilitado
      const databaseEnabled = this.configManager.get('database.enabled');
      this.logger.info(`Database configuração: enabled=${databaseEnabled}`);
      
      if (databaseEnabled) {
        try {
          this.databaseManager = new DatabaseManager(this.configManager, this.logger);
          await this.databaseManager.connect();
          this.logger.info('🗄️ DatabaseManager inicializado e conectado');
        } catch (error) {
          this.logger.error('❌ Falha ao conectar ao banco de dados. Sistema continuará sem persistência:', error.message);
          this.databaseManager = null;
        }
      } else {
        this.logger.info('Database desabilitado na configuração');
      }
      
      // Inicializar CacheManager se habilitado
      const cacheEnabled = this.configManager.get('redis.enabled');
      this.logger.info(`Cache configuração: enabled=${cacheEnabled}`);
      
      if (cacheEnabled) {
        try {
          const redisConfig = this.configManager.get('redis');
          this.cacheManager = new CacheManager(redisConfig, this.logger);
          const cacheConnected = await this.cacheManager.connect();
          if (cacheConnected) {
            this.logger.info('🔄 CacheManager inicializado e conectado');
            
            // Registrar health check do cache
            this.healthCheck.register('cache', async () => {
              return await this.cacheManager.healthCheck();
            }, { critical: false, timeout: 5000 });
          } else {
            this.logger.warn('⚠️ CacheManager inicializado mas não conectado (modo fallback)');
            this.cacheManager = null;
          }
        } catch (error) {
          this.logger.error('❌ Falha ao inicializar cache. Sistema continuará sem cache:', error.message);
          this.cacheManager = null;
        }
      } else {
        this.logger.info('Cache desabilitado na configuração');
      }
      
      // Inicializar AuthManager se autenticação estiver habilitada
      if (this.configManager.get('api.authentication.enabled')) {
        try {
          this.authManager = new AuthManager(this.configManager, this.logger, this.databaseManager, this.cacheManager);
          this.logger.info('🔐 AuthManager inicializado');
          
          // Configurar rotas de autenticação
          this.setupAuthRoutes();
        } catch (error) {
          this.logger.error('❌ Falha ao inicializar AuthManager. Autenticação desabilitada:', error.message);
          this.authManager = null;
        }
      }
      
      // Configurar module manager no app Express
      this.app.set('moduleManager', this.moduleManager);
      this.app.set('configManager', this.configManager);
      this.app.set('eventBus', this.eventBus);
      this.app.set('logger', this.logger);
      
      // Configurar handlers de erro após todas as rotas
      this.setupErrorHandling();
      
      // Carregar módulos
      await this.moduleManager.loadModules();
      
      // Iniciar servidor
      const port = process.env.PORT || 3000;
      const host = process.env.HOST || 'localhost';
      
      this.server = this.app.listen(port, host, () => {
        this.logger.info(`🚀 Fusione Core System iniciado em http://${host}:${port}`);
        this.logger.info(`📊 Health check disponível em http://${host}:${port}/health`);
        
        // Inicializar WebSocketManager se habilitado
        const websocketEnabled = this.configManager.get('websocket.enabled', true);
        if (websocketEnabled) {
          try {
            const websocketConfig = this.configManager.get('websocket', {});
            this.websocketManager = new WebSocketManager(this.server, websocketConfig, this.logger);
            const wsInitialized = this.websocketManager.initialize();
            if (wsInitialized) {
              this.logger.info('🔌 WebSocketManager inicializado');
              
              // Registrar health check do WebSocket
              this.healthCheck.register('websocket', async () => {
                return await this.websocketManager.healthCheck();
              }, { critical: false, timeout: 5000 });
            } else {
              this.logger.warn('⚠️ WebSocketManager não pôde ser inicializado');
              this.websocketManager = null;
            }
          } catch (error) {
            this.logger.error('❌ Falha ao inicializar WebSocket. Sistema continuará sem WebSocket:', error.message);
            this.websocketManager = null;
          }
        }
        
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
    
    // Desconectar WebSocket
    if (this.websocketManager) {
      await this.websocketManager.shutdown();
      this.logger.info('🔌 WebSocket desconectado');
    }
    
    // Desconectar cache
    if (this.cacheManager) {
      await this.cacheManager.disconnect();
      this.logger.info('🔄 Cache desconectado');
    }
    
    // Desconectar banco de dados
    if (this.databaseManager) {
      await this.databaseManager.disconnect();
      this.logger.info('🗄️ Banco de dados desconectado');
    }
    
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
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
  console.error('Promise:', promise);
  system.stop();
});

// Iniciar sistema
(async () => {
  try {
    await system.start();
  } catch (error) {
    console.error('Erro ao iniciar o sistema:', error);
    process.exit(1);
  }
})();

export default system;