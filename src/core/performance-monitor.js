import { createLogger } from './logger.js';
import EventEmitter from 'events';

/**
 * Monitor de Performance em Tempo Real
 * Coleta e analisa métricas de performance do sistema
 */
class PerformanceMonitor extends EventEmitter {
    constructor(config = {}) {
        super();
        this.logger = createLogger('PerformanceMonitor');
        
        this.config = {
            monitoringInterval: config.monitoringInterval || 5000, // 5 segundos
            alertThresholds: {
                cpuUsage: config.cpuThreshold || 80, // %
                memoryUsage: config.memoryThreshold || 85, // %
                responseTime: config.responseTimeThreshold || 2000, // ms
                errorRate: config.errorRateThreshold || 5, // %
                ...config.alertThresholds
            },
            retentionPeriod: config.retentionPeriod || 86400000, // 24 horas
            enableAlerts: config.enableAlerts ?? true,
            enablePredictiveAnalysis: config.enablePredictiveAnalysis ?? true,
            ...config
        };
        
        this.metrics = {
            system: {
                cpu: [],
                memory: [],
                disk: [],
                network: []
            },
            application: {
                responseTime: [],
                throughput: [],
                errorRate: [],
                activeConnections: []
            },
            database: {
                queryTime: [],
                connections: [],
                operations: []
            },
            cache: {
                hitRate: [],
                memory: [],
                operations: []
            }
        };
        
        this.alerts = [];
        this.isMonitoring = false;
        this.startTime = Date.now();
        this.requestCount = 0;
        this.errorCount = 0;
    }

    /**
     * Inicia o monitoramento
     */
    async start() {
        if (this.isMonitoring) {
            this.logger.warn('Monitor já está em execução');
            return;
        }
        
        this.isMonitoring = true;
        this.startTime = Date.now();
        
        // Inicia coleta de métricas
        this.monitoringInterval = setInterval(() => {
            this.collectMetrics();
        }, this.config.monitoringInterval);
        
        // Limpeza periódica de dados antigos
        this.cleanupInterval = setInterval(() => {
            this.cleanupOldMetrics();
        }, 3600000); // 1 hora
        
        this.logger.info('Performance Monitor iniciado');
        this.emit('started');
    }

    /**
     * Para o monitoramento
     */
    stop() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
        }
        
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        
        this.logger.info('Performance Monitor parado');
        this.emit('stopped');
    }

    /**
     * Coleta métricas do sistema
     */
    async collectMetrics() {
        try {
            const timestamp = Date.now();
            
            // Métricas do sistema
            const systemMetrics = await this.getSystemMetrics();
            this.addMetric('system', 'cpu', systemMetrics.cpu, timestamp);
            this.addMetric('system', 'memory', systemMetrics.memory, timestamp);
            this.addMetric('system', 'disk', systemMetrics.disk, timestamp);
            this.addMetric('system', 'network', systemMetrics.network, timestamp);
            
            // Métricas da aplicação
            const appMetrics = this.getApplicationMetrics();
            this.addMetric('application', 'responseTime', appMetrics.responseTime, timestamp);
            this.addMetric('application', 'throughput', appMetrics.throughput, timestamp);
            this.addMetric('application', 'errorRate', appMetrics.errorRate, timestamp);
            this.addMetric('application', 'activeConnections', appMetrics.activeConnections, timestamp);
            
            // Verifica alertas
            if (this.config.enableAlerts) {
                this.checkAlerts({
                    ...systemMetrics,
                    ...appMetrics,
                    timestamp
                });
            }
            
            // Análise preditiva
            if (this.config.enablePredictiveAnalysis) {
                this.performPredictiveAnalysis();
            }
            
            this.emit('metricsCollected', {
                system: systemMetrics,
                application: appMetrics,
                timestamp
            });
            
        } catch (error) {
            this.logger.error('Erro ao coletar métricas:', error);
        }
    }

    /**
     * Obtém métricas do sistema
     */
    async getSystemMetrics() {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            cpu: this.calculateCpuUsage(cpuUsage),
            memory: {
                used: memoryUsage.heapUsed,
                total: memoryUsage.heapTotal,
                external: memoryUsage.external,
                rss: memoryUsage.rss,
                percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
            },
            disk: await this.getDiskUsage(),
            network: this.getNetworkStats()
        };
    }

    /**
     * Calcula uso de CPU
     */
    calculateCpuUsage(cpuUsage) {
        if (!this.lastCpuUsage) {
            this.lastCpuUsage = cpuUsage;
            return { percentage: 0 };
        }
        
        const userDiff = cpuUsage.user - this.lastCpuUsage.user;
        const systemDiff = cpuUsage.system - this.lastCpuUsage.system;
        const totalDiff = userDiff + systemDiff;
        
        this.lastCpuUsage = cpuUsage;
        
        return {
            user: userDiff,
            system: systemDiff,
            total: totalDiff,
            percentage: (totalDiff / 1000000) * 100 // Converte para porcentagem
        };
    }

    /**
     * Obtém uso do disco
     */
    async getDiskUsage() {
        try {
            // Implementação simplificada - em produção usar bibliotecas específicas
            return {
                used: 0,
                total: 0,
                percentage: 0
            };
        } catch (error) {
            return { used: 0, total: 0, percentage: 0 };
        }
    }

    /**
     * Obtém estatísticas de rede
     */
    getNetworkStats() {
        // Implementação simplificada
        return {
            bytesReceived: 0,
            bytesSent: 0,
            packetsReceived: 0,
            packetsSent: 0
        };
    }

    /**
     * Obtém métricas da aplicação
     */
    getApplicationMetrics() {
        const uptime = Date.now() - this.startTime;
        const throughput = this.requestCount / (uptime / 1000); // requests per second
        const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
        
        return {
            responseTime: this.getAverageResponseTime(),
            throughput,
            errorRate,
            activeConnections: this.getActiveConnections(),
            uptime
        };
    }

    /**
     * Obtém tempo médio de resposta
     */
    getAverageResponseTime() {
        const recentResponses = this.metrics.application.responseTime
            .filter(metric => Date.now() - metric.timestamp < 60000) // Últimos 60 segundos
            .map(metric => metric.value);
        
        if (recentResponses.length === 0) return 0;
        
        return recentResponses.reduce((sum, time) => sum + time, 0) / recentResponses.length;
    }

    /**
     * Obtém número de conexões ativas
     */
    getActiveConnections() {
        // Implementação simplificada - em produção integrar com servidor HTTP
        return 0;
    }

    /**
     * Adiciona métrica ao histórico
     */
    addMetric(category, type, value, timestamp) {
        if (!this.metrics[category] || !this.metrics[category][type]) {
            return;
        }
        
        this.metrics[category][type].push({
            value,
            timestamp
        });
        
        // Limita o tamanho do array para evitar uso excessivo de memória
        if (this.metrics[category][type].length > 1000) {
            this.metrics[category][type] = this.metrics[category][type].slice(-500);
        }
    }

    /**
     * Verifica alertas baseado nos thresholds
     */
    checkAlerts(metrics) {
        const alerts = [];
        
        // Alerta de CPU
        if (metrics.cpu.percentage > this.config.alertThresholds.cpuUsage) {
            alerts.push({
                type: 'cpu_high',
                severity: 'warning',
                message: `Alto uso de CPU: ${metrics.cpu.percentage.toFixed(2)}%`,
                value: metrics.cpu.percentage,
                threshold: this.config.alertThresholds.cpuUsage,
                timestamp: metrics.timestamp
            });
        }
        
        // Alerta de memória
        if (metrics.memory.percentage > this.config.alertThresholds.memoryUsage) {
            alerts.push({
                type: 'memory_high',
                severity: 'warning',
                message: `Alto uso de memória: ${metrics.memory.percentage.toFixed(2)}%`,
                value: metrics.memory.percentage,
                threshold: this.config.alertThresholds.memoryUsage,
                timestamp: metrics.timestamp
            });
        }
        
        // Alerta de tempo de resposta
        if (metrics.responseTime > this.config.alertThresholds.responseTime) {
            alerts.push({
                type: 'response_time_high',
                severity: 'warning',
                message: `Tempo de resposta alto: ${metrics.responseTime.toFixed(2)}ms`,
                value: metrics.responseTime,
                threshold: this.config.alertThresholds.responseTime,
                timestamp: metrics.timestamp
            });
        }
        
        // Alerta de taxa de erro
        if (metrics.errorRate > this.config.alertThresholds.errorRate) {
            alerts.push({
                type: 'error_rate_high',
                severity: 'critical',
                message: `Alta taxa de erro: ${metrics.errorRate.toFixed(2)}%`,
                value: metrics.errorRate,
                threshold: this.config.alertThresholds.errorRate,
                timestamp: metrics.timestamp
            });
        }
        
        // Processa alertas
        for (const alert of alerts) {
            this.processAlert(alert);
        }
    }

    /**
     * Processa um alerta
     */
    processAlert(alert) {
        // Evita spam de alertas do mesmo tipo
        const recentAlert = this.alerts.find(a => 
            a.type === alert.type && 
            Date.now() - a.timestamp < 300000 // 5 minutos
        );
        
        if (recentAlert) return;
        
        this.alerts.push(alert);
        
        this.logger.warn(`ALERTA: ${alert.message}`, {
            type: alert.type,
            severity: alert.severity,
            value: alert.value,
            threshold: alert.threshold
        });
        
        this.emit('alert', alert);
    }

    /**
     * Análise preditiva simples
     */
    performPredictiveAnalysis() {
        try {
            // Análise de tendência de CPU
            const cpuTrend = this.analyzeTrend('system', 'cpu');
            if (cpuTrend.slope > 0.1) { // Tendência de crescimento
                this.emit('prediction', {
                    type: 'cpu_trend',
                    message: 'Tendência de aumento no uso de CPU detectada',
                    trend: cpuTrend,
                    timestamp: Date.now()
                });
            }
            
            // Análise de tendência de memória
            const memoryTrend = this.analyzeTrend('system', 'memory');
            if (memoryTrend.slope > 0.1) {
                this.emit('prediction', {
                    type: 'memory_trend',
                    message: 'Tendência de aumento no uso de memória detectada',
                    trend: memoryTrend,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            this.logger.error('Erro na análise preditiva:', error);
        }
    }

    /**
     * Analisa tendência de uma métrica
     */
    analyzeTrend(category, type) {
        const metrics = this.metrics[category][type];
        if (metrics.length < 10) {
            return { slope: 0, correlation: 0 };
        }
        
        // Pega os últimos 10 pontos
        const recentMetrics = metrics.slice(-10);
        const n = recentMetrics.length;
        
        // Calcula regressão linear simples
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        
        recentMetrics.forEach((metric, index) => {
            const x = index;
            const y = typeof metric.value === 'object' ? metric.value.percentage || 0 : metric.value;
            
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        });
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        return {
            slope,
            direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable'
        };
    }

    /**
     * Limpa métricas antigas
     */
    cleanupOldMetrics() {
        const cutoffTime = Date.now() - this.config.retentionPeriod;
        
        Object.keys(this.metrics).forEach(category => {
            Object.keys(this.metrics[category]).forEach(type => {
                this.metrics[category][type] = this.metrics[category][type]
                    .filter(metric => metric.timestamp > cutoffTime);
            });
        });
        
        // Limpa alertas antigos
        this.alerts = this.alerts.filter(alert => 
            Date.now() - alert.timestamp < this.config.retentionPeriod
        );
        
        this.logger.debug('Limpeza de métricas antigas concluída');
    }

    /**
     * Registra uma requisição
     */
    recordRequest(responseTime, isError = false) {
        this.requestCount++;
        if (isError) {
            this.errorCount++;
        }
        
        this.addMetric('application', 'responseTime', responseTime, Date.now());
    }

    /**
     * Obtém relatório de performance
     */
    getPerformanceReport(timeRange = 3600000) { // 1 hora por padrão
        const cutoffTime = Date.now() - timeRange;
        
        const report = {
            timestamp: Date.now(),
            timeRange,
            summary: {
                uptime: Date.now() - this.startTime,
                totalRequests: this.requestCount,
                totalErrors: this.errorCount,
                errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0
            },
            metrics: {},
            alerts: this.alerts.filter(alert => alert.timestamp > cutoffTime),
            recommendations: this.generateRecommendations()
        };
        
        // Agrega métricas por categoria
        Object.keys(this.metrics).forEach(category => {
            report.metrics[category] = {};
            Object.keys(this.metrics[category]).forEach(type => {
                const recentMetrics = this.metrics[category][type]
                    .filter(metric => metric.timestamp > cutoffTime);
                
                if (recentMetrics.length > 0) {
                    report.metrics[category][type] = this.aggregateMetrics(recentMetrics);
                }
            });
        });
        
        return report;
    }

    /**
     * Agrega métricas para relatório
     */
    aggregateMetrics(metrics) {
        const values = metrics.map(m => 
            typeof m.value === 'object' ? m.value.percentage || 0 : m.value
        );
        
        return {
            count: metrics.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: values.reduce((sum, val) => sum + val, 0) / values.length,
            latest: values[values.length - 1]
        };
    }

    /**
     * Gera recomendações baseadas nas métricas
     */
    generateRecommendations() {
        const recommendations = [];
        
        // Recomendações baseadas em alertas recentes
        const recentAlerts = this.alerts.filter(alert => 
            Date.now() - alert.timestamp < 3600000 // Última hora
        );
        
        const alertTypes = [...new Set(recentAlerts.map(alert => alert.type))];
        
        if (alertTypes.includes('cpu_high')) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Considere otimizar algoritmos ou adicionar mais recursos de CPU',
                category: 'cpu'
            });
        }
        
        if (alertTypes.includes('memory_high')) {
            recommendations.push({
                type: 'performance',
                priority: 'high',
                message: 'Verifique vazamentos de memória ou considere aumentar RAM',
                category: 'memory'
            });
        }
        
        if (alertTypes.includes('response_time_high')) {
            recommendations.push({
                type: 'performance',
                priority: 'medium',
                message: 'Otimize queries de banco de dados e implemente cache',
                category: 'response_time'
            });
        }
        
        if (alertTypes.includes('error_rate_high')) {
            recommendations.push({
                type: 'reliability',
                priority: 'critical',
                message: 'Investigue e corrija erros na aplicação imediatamente',
                category: 'errors'
            });
        }
        
        return recommendations;
    }

    /**
     * Obtém status atual do monitor
     */
    getStatus() {
        return {
            isMonitoring: this.isMonitoring,
            uptime: Date.now() - this.startTime,
            totalRequests: this.requestCount,
            totalErrors: this.errorCount,
            activeAlerts: this.alerts.filter(alert => 
                Date.now() - alert.timestamp < 300000 // Últimos 5 minutos
            ).length,
            metricsCount: Object.values(this.metrics)
                .reduce((total, category) => 
                    total + Object.values(category)
                        .reduce((sum, metrics) => sum + metrics.length, 0), 0
                )
        };
    }
}

export default PerformanceMonitor;