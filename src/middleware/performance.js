import PerformanceMonitor from '../core/performance-monitor.js';
import PerformanceOptimizer from '../core/performance-optimizer.js';
import { createLogger } from '../core/logger.js';

/**
 * Middleware de Performance para Express
 * Integra monitoramento e otimização de performance
 */
class PerformanceMiddleware {
    constructor(databaseManager, config = {}) {
        this.logger = createLogger('PerformanceMiddleware');
        
        // Inicializa monitor e otimizador
        this.monitor = new PerformanceMonitor(config.monitor);
        this.optimizer = new PerformanceOptimizer(databaseManager, config.optimizer);
        
        this.config = {
            enableRequestTracking: config.enableRequestTracking ?? true,
            enableResponseTimeTracking: config.enableResponseTimeTracking ?? true,
            enableErrorTracking: config.enableErrorTracking ?? true,
            enableCacheOptimization: config.enableCacheOptimization ?? true,
            slowRequestThreshold: config.slowRequestThreshold || 1000, // ms
            enableDetailedLogging: config.enableDetailedLogging ?? false,
            ...config
        };
        
        this.requestStats = {
            total: 0,
            errors: 0,
            slow: 0,
            byEndpoint: new Map(),
            byMethod: new Map()
        };
        
        this.isInitialized = false;
    }

    /**
     * Inicializa o middleware
     */
    async initialize() {
        try {
            this.logger.info('Inicializando Performance Middleware...');
            
            // Inicializa componentes
            await this.monitor.start();
            await this.optimizer.initialize();
            
            // Configura listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            this.logger.info('Performance Middleware inicializado com sucesso');
            
            return true;
        } catch (error) {
            this.logger.error('Erro ao inicializar Performance Middleware:', error);
            return false;
        }
    }

    /**
     * Configura listeners de eventos
     */
    setupEventListeners() {
        // Listener para alertas do monitor
        this.monitor.on('alert', (alert) => {
            this.handlePerformanceAlert(alert);
        });
        
        // Listener para predições
        this.monitor.on('prediction', (prediction) => {
            this.handlePerformancePrediction(prediction);
        });
        
        // Listener para métricas coletadas
        this.monitor.on('metricsCollected', (metrics) => {
            if (this.config.enableDetailedLogging) {
                this.logger.debug('Métricas coletadas:', metrics);
            }
        });
    }

    /**
     * Middleware principal para requisições HTTP
     */
    middleware() {
        return (req, res, next) => {
            if (!this.isInitialized) {
                return next();
            }
            
            const startTime = Date.now();
            const requestId = this.generateRequestId();
            
            // Adiciona informações de performance ao request
            req.performance = {
                id: requestId,
                startTime,
                endpoint: `${req.method} ${req.route?.path || req.path}`,
                userAgent: req.get('User-Agent'),
                ip: req.ip || req.connection.remoteAddress
            };
            
            // Intercepta o final da resposta
            const originalSend = res.send;
            const originalJson = res.json;
            
            res.send = (body) => {
                this.trackResponse(req, res, startTime, body);
                return originalSend.call(res, body);
            };
            
            res.json = (body) => {
                this.trackResponse(req, res, startTime, body);
                return originalJson.call(res, body);
            };
            
            // Intercepta erros
            res.on('error', (error) => {
                this.trackError(req, res, startTime, error);
            });
            
            // Aplica otimizações de cache se habilitado
            if (this.config.enableCacheOptimization) {
                this.applyCacheOptimization(req, res);
            }
            
            next();
        };
    }

    /**
     * Gera ID único para requisição
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Rastreia resposta da requisição
     */
    trackResponse(req, res, startTime, body) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        const isError = res.statusCode >= 400;
        const isSlow = responseTime > this.config.slowRequestThreshold;
        
        // Atualiza estatísticas
        this.updateRequestStats(req, res, responseTime, isError, isSlow);
        
        // Registra no monitor
        if (this.config.enableRequestTracking) {
            this.monitor.recordRequest(responseTime, isError);
        }
        
        // Log detalhado se habilitado
        if (this.config.enableDetailedLogging || isSlow || isError) {
            const logLevel = isError ? 'error' : isSlow ? 'warn' : 'info';
            this.logger[logLevel]('Requisição processada:', {
                requestId: req.performance.id,
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                responseTime,
                userAgent: req.performance.userAgent,
                ip: req.performance.ip,
                bodySize: this.getBodySize(body)
            });
        }
        
        // Aplica otimizações baseadas na performance
        if (isSlow) {
            this.handleSlowRequest(req, res, responseTime);
        }
    }

    /**
     * Rastreia erro na requisição
     */
    trackError(req, res, startTime, error) {
        const responseTime = Date.now() - startTime;
        
        this.updateRequestStats(req, res, responseTime, true, false);
        
        if (this.config.enableErrorTracking) {
            this.monitor.recordRequest(responseTime, true);
        }
        
        this.logger.error('Erro na requisição:', {
            requestId: req.performance.id,
            method: req.method,
            path: req.path,
            error: error.message,
            stack: error.stack,
            responseTime
        });
    }

    /**
     * Atualiza estatísticas de requisições
     */
    updateRequestStats(req, res, responseTime, isError, isSlow) {
        this.requestStats.total++;
        
        if (isError) {
            this.requestStats.errors++;
        }
        
        if (isSlow) {
            this.requestStats.slow++;
        }
        
        // Estatísticas por endpoint
        const endpoint = req.performance.endpoint;
        if (!this.requestStats.byEndpoint.has(endpoint)) {
            this.requestStats.byEndpoint.set(endpoint, {
                count: 0,
                errors: 0,
                slow: 0,
                totalTime: 0,
                avgTime: 0
            });
        }
        
        const endpointStats = this.requestStats.byEndpoint.get(endpoint);
        endpointStats.count++;
        endpointStats.totalTime += responseTime;
        endpointStats.avgTime = endpointStats.totalTime / endpointStats.count;
        
        if (isError) endpointStats.errors++;
        if (isSlow) endpointStats.slow++;
        
        // Estatísticas por método HTTP
        const method = req.method;
        if (!this.requestStats.byMethod.has(method)) {
            this.requestStats.byMethod.set(method, {
                count: 0,
                errors: 0,
                totalTime: 0,
                avgTime: 0
            });
        }
        
        const methodStats = this.requestStats.byMethod.get(method);
        methodStats.count++;
        methodStats.totalTime += responseTime;
        methodStats.avgTime = methodStats.totalTime / methodStats.count;
        
        if (isError) methodStats.errors++;
    }

    /**
     * Aplica otimizações de cache
     */
    applyCacheOptimization(req, res) {
        // Cache para requisições GET de dados estáticos
        if (req.method === 'GET' && this.isCacheableRequest(req)) {
            const cacheKey = this.generateCacheKey(req);
            
            // Intercepta resposta para cache
            const originalSend = res.send;
            res.send = function(body) {
                // Cache apenas respostas de sucesso
                if (res.statusCode === 200) {
                    // Implementar cache aqui
                }
                return originalSend.call(this, body);
            };
        }
    }

    /**
     * Verifica se requisição é cacheável
     */
    isCacheableRequest(req) {
        const cacheablePaths = [
            '/api/config',
            '/api/templates',
            '/api/static',
            '/api/users/profile'
        ];
        
        return cacheablePaths.some(path => req.path.startsWith(path));
    }

    /**
     * Gera chave de cache para requisição
     */
    generateCacheKey(req) {
        const userId = req.user?.id || 'anonymous';
        const queryString = new URLSearchParams(req.query).toString();
        return `${req.method}:${req.path}:${userId}:${queryString}`;
    }

    /**
     * Obtém tamanho do corpo da resposta
     */
    getBodySize(body) {
        if (!body) return 0;
        if (typeof body === 'string') return Buffer.byteLength(body, 'utf8');
        if (Buffer.isBuffer(body)) return body.length;
        return Buffer.byteLength(JSON.stringify(body), 'utf8');
    }

    /**
     * Lida com requisições lentas
     */
    handleSlowRequest(req, res, responseTime) {
        this.logger.warn('Requisição lenta detectada:', {
            endpoint: req.performance.endpoint,
            responseTime,
            threshold: this.config.slowRequestThreshold
        });
        
        // Adiciona header de debug
        res.set('X-Response-Time', `${responseTime}ms`);
        res.set('X-Performance-Warning', 'slow-request');
    }

    /**
     * Lida com alertas de performance
     */
    handlePerformanceAlert(alert) {
        this.logger.warn('Alerta de performance:', alert);
        
        // Implementar ações automáticas baseadas no tipo de alerta
        switch (alert.type) {
            case 'memory_high':
                this.triggerMemoryOptimization();
                break;
            case 'cpu_high':
                this.triggerCpuOptimization();
                break;
            case 'response_time_high':
                this.triggerResponseTimeOptimization();
                break;
        }
    }

    /**
     * Lida com predições de performance
     */
    handlePerformancePrediction(prediction) {
        this.logger.info('Predição de performance:', prediction);
        
        // Implementar ações preventivas
        if (prediction.type === 'memory_trend' && prediction.trend.direction === 'increasing') {
            this.scheduleMemoryCleanup();
        }
    }

    /**
     * Dispara otimização de memória
     */
    triggerMemoryOptimization() {
        // Força garbage collection se disponível
        if (global.gc) {
            global.gc();
            this.logger.info('Garbage collection forçado');
        }
        
        // Limpa caches desnecessários
        // Implementar limpeza específica
    }

    /**
     * Dispara otimização de CPU
     */
    triggerCpuOptimization() {
        // Implementar estratégias de otimização de CPU
        this.logger.info('Otimização de CPU disparada');
    }

    /**
     * Dispara otimização de tempo de resposta
     */
    triggerResponseTimeOptimization() {
        // Implementar otimizações de tempo de resposta
        this.logger.info('Otimização de tempo de resposta disparada');
    }

    /**
     * Agenda limpeza de memória
     */
    scheduleMemoryCleanup() {
        setTimeout(() => {
            this.triggerMemoryOptimization();
        }, 60000); // 1 minuto
    }

    /**
     * Middleware para métricas de endpoint específico
     */
    endpointMetrics(endpointName) {
        return (req, res, next) => {
            req.performance = req.performance || {};
            req.performance.endpointName = endpointName;
            next();
        };
    }

    /**
     * Obtém relatório de performance das requisições
     */
    getRequestReport() {
        const totalRequests = this.requestStats.total;
        
        return {
            timestamp: Date.now(),
            summary: {
                total: totalRequests,
                errors: this.requestStats.errors,
                slow: this.requestStats.slow,
                errorRate: totalRequests > 0 ? (this.requestStats.errors / totalRequests) * 100 : 0,
                slowRate: totalRequests > 0 ? (this.requestStats.slow / totalRequests) * 100 : 0
            },
            byEndpoint: Object.fromEntries(
                Array.from(this.requestStats.byEndpoint.entries())
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 10) // Top 10 endpoints
            ),
            byMethod: Object.fromEntries(this.requestStats.byMethod.entries()),
            systemMetrics: this.monitor.getStatus()
        };
    }

    /**
     * Obtém relatório completo de performance
     */
    getFullReport(timeRange) {
        return {
            requests: this.getRequestReport(),
            system: this.monitor.getPerformanceReport(timeRange),
            optimization: this.optimizer.getPerformanceReport()
        };
    }

    /**
     * Reseta estatísticas
     */
    resetStats() {
        this.requestStats = {
            total: 0,
            errors: 0,
            slow: 0,
            byEndpoint: new Map(),
            byMethod: new Map()
        };
        
        this.logger.info('Estatísticas de performance resetadas');
    }

    /**
     * Para o middleware
     */
    async stop() {
        if (this.monitor) {
            this.monitor.stop();
        }
        
        if (this.optimizer) {
            this.optimizer.stop();
        }
        
        this.isInitialized = false;
        this.logger.info('Performance Middleware parado');
    }
}

export default PerformanceMiddleware;