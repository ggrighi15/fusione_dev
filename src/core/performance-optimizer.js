import { createLogger } from './logger.js';


/**
 * Otimizador de Performance do Fusione Core System
 * Implementa cache inteligente, análise de queries e monitoramento
 */
class PerformanceOptimizer {
    constructor(databaseManager, config = {}) {
        this.databaseManager = databaseManager;
        this.logger = createLogger('PerformanceOptimizer');
        
        this.config = {
            enableQueryAnalysis: config.enableQueryAnalysis ?? true,
            enableSmartCache: config.enableSmartCache ?? true,
            slowQueryThreshold: config.slowQueryThreshold || 1000, // ms
            cacheHitRateThreshold: config.cacheHitRateThreshold || 0.8,
            maxCacheSize: config.maxCacheSize || '500MB',
            queryAnalysisInterval: config.queryAnalysisInterval || 300000, // 5 min
            ...config
        };
        
        this.metrics = {
            queryCount: 0,
            slowQueries: [],
            cacheHits: 0,
            cacheMisses: 0,
            avgResponseTime: 0,
            peakMemoryUsage: 0,
            lastOptimization: null
        };
        
        this.queryPatterns = new Map();
        this.cacheStrategies = new Map();
        this.isMonitoring = false;
    }

    /**
     * Inicializa o otimizador de performance
     */
    async initialize() {
        try {
            this.logger.info('Inicializando Performance Optimizer...');
            
            if (this.config.enableQueryAnalysis) {
                await this.setupQueryAnalysis();
            }
            
            if (this.config.enableSmartCache) {
                await this.setupSmartCache();
            }
            
            await this.startMonitoring();
            
            this.logger.info('Performance Optimizer inicializado com sucesso');
            return true;
        } catch (error) {
            this.logger.error('Erro ao inicializar Performance Optimizer:', error);
            return false;
        }
    }

    /**
     * Configura análise de queries
     */
    async setupQueryAnalysis() {
        try {
            // Inicia análise periódica
            setInterval(() => {
                this.analyzeQueries();
            }, this.config.queryAnalysisInterval);
            
            this.logger.info('Análise de queries configurada');
        } catch (error) {
            this.logger.error('Erro ao configurar análise de queries:', error);
        }
    }

    /**
     * Configura cache inteligente
     */
    async setupSmartCache() {
        try {
            // Estratégias de cache baseadas em padrões de uso
            this.cacheStrategies.set('user_data', {
                ttl: 1800, // 30 min
                pattern: /^user:/,
                priority: 'high'
            });
            
            this.cacheStrategies.set('static_data', {
                ttl: 7200, // 2 horas
                pattern: /^(config|settings|templates):/,
                priority: 'medium'
            });
            
            this.cacheStrategies.set('dynamic_data', {
                ttl: 300, // 5 min
                pattern: /^(reports|analytics):/,
                priority: 'low'
            });
            
            this.logger.info('Cache inteligente configurado');
        } catch (error) {
            this.logger.error('Erro ao configurar cache inteligente:', error);
        }
    }

    /**
     * Inicia monitoramento de performance
     */
    async startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        
        // Monitora métricas a cada minuto
        setInterval(() => {
            this.collectMetrics();
        }, 60000);
        
        // Otimização automática a cada 15 minutos
        setInterval(() => {
            this.autoOptimize();
        }, 900000);
        
        this.logger.info('Monitoramento de performance iniciado');
    }

    /**
     * Analisa queries
     */
    async analyzeQueries() {
        try {
            // Análise de queries será implementada conforme necessário
            this.logger.debug('Análise de queries executada');
        } catch (error) {
            this.logger.error('Erro na análise de queries:', error);
        }
    }

    /**
     * Registra query lenta para análise
     */
    recordSlowQuery(query) {
        const slowQuery = {
            timestamp: query.ts,
            duration: query.millis,
            collection: query.ns,
            operation: query.op,
            command: query.command,
            executionStats: query.execStats
        };
        
        this.metrics.slowQueries.push(slowQuery);
        
        // Mantém apenas as últimas 100 queries lentas
        if (this.metrics.slowQueries.length > 100) {
            this.metrics.slowQueries.shift();
        }
        
        this.logger.warn('Query lenta detectada:', {
            collection: slowQuery.collection,
            duration: slowQuery.duration,
            operation: slowQuery.operation
        });
    }

    /**
     * Analisa padrões de queries
     */
    analyzeQueryPattern(query) {
        const pattern = this.extractQueryPattern(query);
        
        if (this.queryPatterns.has(pattern)) {
            const stats = this.queryPatterns.get(pattern);
            stats.count++;
            stats.totalTime += query.millis;
            stats.avgTime = stats.totalTime / stats.count;
        } else {
            this.queryPatterns.set(pattern, {
                count: 1,
                totalTime: query.millis,
                avgTime: query.millis,
                collection: query.ns,
                operation: query.op
            });
        }
    }

    /**
     * Extrai padrão da query para análise
     */
    extractQueryPattern(query) {
        const collection = query.ns?.split('.').pop() || 'unknown';
        const operation = query.op || 'unknown';
        
        // Simplifica o comando para criar padrão
        let pattern = `${collection}.${operation}`;
        
        if (query.command) {
            const keys = Object.keys(query.command).filter(k => k !== collection);
            if (keys.length > 0) {
                pattern += `.${keys.join('.')}`;
            }
        }
        
        return pattern;
    }

    /**
     * Otimiza queries lentas
     */
    async optimizeSlowQueries() {
        const frequentSlowQueries = this.metrics.slowQueries
            .reduce((acc, query) => {
                const key = `${query.collection}.${query.operation}`;
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
        
        for (const [queryKey, count] of Object.entries(frequentSlowQueries)) {
            if (count >= 5) { // Query lenta frequente
                await this.suggestOptimization(queryKey);
            }
        }
    }

    /**
     * Sugere otimizações para queries
     */
    async suggestOptimization(queryKey) {
        const [collection, operation] = queryKey.split('.');
        
        try {
            const db = mongoose.connection.db;
            const collectionObj = db.collection(collection);
            
            // Analisa índices existentes
            const indexes = await collectionObj.indexes();
            
            // Sugere novos índices baseado nos padrões de query
            const suggestions = this.generateIndexSuggestions(collection, operation, indexes);
            
            if (suggestions.length > 0) {
                this.logger.info(`Sugestões de otimização para ${queryKey}:`, suggestions);
            }
        } catch (error) {
            this.logger.error(`Erro ao analisar otimizações para ${queryKey}:`, error);
        }
    }

    /**
     * Gera sugestões de índices
     */
    generateIndexSuggestions(collection, operation, existingIndexes) {
        const suggestions = [];
        
        // Padrões comuns que se beneficiam de índices
        const commonPatterns = {
            'find': ['_id', 'createdAt', 'updatedAt', 'status'],
            'aggregate': ['_id', 'createdAt', 'category', 'type'],
            'update': ['_id', 'status', 'updatedAt'],
            'delete': ['_id', 'status']
        };
        
        const recommendedFields = commonPatterns[operation] || ['_id'];
        const existingFields = existingIndexes.map(idx => Object.keys(idx.key)).flat();
        
        for (const field of recommendedFields) {
            if (!existingFields.includes(field)) {
                suggestions.push({
                    type: 'index',
                    collection,
                    field,
                    reason: `Campo ${field} frequentemente usado em ${operation}`
                });
            }
        }
        
        return suggestions;
    }

    /**
     * Coleta métricas de performance
     */
    async collectMetrics() {
        try {
            // Métricas do cache (removido - usando apenas métricas locais)
            const totalCacheOps = this.metrics.cacheHits + this.metrics.cacheMisses;
            const cacheHitRate = totalCacheOps > 0 ? this.metrics.cacheHits / totalCacheOps : 0;
            
            // Métricas do sistema
            const memoryUsage = process.memoryUsage();
            
            this.metrics.cacheHitRate = cacheHitRate;
            this.metrics.peakMemoryUsage = Math.max(this.metrics.peakMemoryUsage, memoryUsage.heapUsed);
            
            // Log métricas importantes
            if (cacheHitRate < this.config.cacheHitRateThreshold) {
                this.logger.warn(`Taxa de cache hit baixa: ${(cacheHitRate * 100).toFixed(2)}%`);
            }
            
        } catch (error) {
            this.logger.error('Erro ao coletar métricas:', error);
        }
    }

    /**
     * Obtém estatísticas do banco de dados
     */
    async getDatabaseStats() {
        try {
            // Estatísticas do banco serão implementadas conforme necessário
            return {};
        } catch (error) {
            this.logger.error('Erro ao obter stats do DB:', error);
            return {};
        }
    }

    /**
     * Otimização automática
     */
    async autoOptimize() {
        try {
            this.logger.info('Iniciando otimização automática...');
            
            // Limpa cache de baixa prioridade se necessário
            await this.optimizeCache();
            
            // Analisa e otimiza queries
            await this.analyzeQueries();
            
            // Atualiza timestamp da última otimização
            this.metrics.lastOptimization = new Date();
            
            this.logger.info('Otimização automática concluída');
        } catch (error) {
            this.logger.error('Erro na otimização automática:', error);
        }
    }

    /**
     * Otimiza o cache (desabilitado - cache removido)
     */
    async optimizeCache() {
        try {
            // Cache removido - função mantida para compatibilidade
            this.logger.debug('Cache otimization skipped - cache disabled');
        } catch (error) {
            this.logger.error('Erro ao otimizar cache:', error);
        }
    }

    /**
     * Limpa cache de baixa prioridade (desabilitado - cache removido)
     */
    async clearLowPriorityCache() {
        // Cache removido - função mantida para compatibilidade
        this.logger.debug('Cache cleanup skipped - cache disabled');
    }

    /**
     * Atualiza TTL do cache baseado no uso
     */
    async updateCacheTTL() {
        // Implementa lógica para ajustar TTL baseado nos padrões de acesso
        // Por exemplo, aumentar TTL para dados frequentemente acessados
    }

    /**
     * Converte string de memória para bytes
     */
    parseMemorySize(sizeStr) {
        const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
        const match = sizeStr.match(/^(\d+)\s*(B|KB|MB|GB)$/i);
        if (match) {
            return parseInt(match[1]) * units[match[2].toUpperCase()];
        }
        return 0;
    }

    /**
     * Obtém relatório de performance
     */
    getPerformanceReport() {
        const totalCacheOps = this.metrics.cacheHits + this.metrics.cacheMisses;
        
        return {
            timestamp: new Date(),
            metrics: {
                ...this.metrics,
                cacheHitRate: totalCacheOps > 0 ? this.metrics.cacheHits / totalCacheOps : 0,
                memoryUsageMB: Math.round(this.metrics.peakMemoryUsage / 1024 / 1024)
            },
            queryPatterns: Array.from(this.queryPatterns.entries())
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 10), // Top 10 padrões
            recommendations: this.generateRecommendations()
        };
    }

    /**
     * Gera recomendações de otimização
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Recomendações baseadas em cache hit rate
        const totalCacheOps = this.metrics.cacheHits + this.metrics.cacheMisses;
        const cacheHitRate = totalCacheOps > 0 ? this.metrics.cacheHits / totalCacheOps : 0;
        
        if (cacheHitRate < this.config.cacheHitRateThreshold) {
            recommendations.push({
                type: 'cache',
                priority: 'high',
                message: 'Taxa de cache hit baixa. Considere revisar estratégias de cache.',
                value: `${(cacheHitRate * 100).toFixed(2)}%`
            });
        }
        
        // Recomendações baseadas em queries lentas
        if (this.metrics.slowQueries.length > 10) {
            recommendations.push({
                type: 'database',
                priority: 'high',
                message: 'Muitas queries lentas detectadas. Revisar índices e otimizar queries.',
                value: this.metrics.slowQueries.length
            });
        }
        
        // Recomendações baseadas em uso de memória
        const memoryUsageMB = this.metrics.peakMemoryUsage / 1024 / 1024;
        if (memoryUsageMB > 512) {
            recommendations.push({
                type: 'memory',
                priority: 'medium',
                message: 'Alto uso de memória detectado. Considere otimizar cache e queries.',
                value: `${Math.round(memoryUsageMB)}MB`
            });
        }
        
        return recommendations;
    }

    /**
     * Para o monitoramento
     */
    stop() {
        this.isMonitoring = false;
        this.logger.info('Performance Optimizer parado');
    }
}

export default PerformanceOptimizer;