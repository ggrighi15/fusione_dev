/**
 * Sistema de Health Check do Fusione Core System
 * Monitora a saúde do sistema e seus componentes
 */

import os from 'os';
import { createLogger } from './logger.js';

export class HealthCheck {
  constructor() {
    this.logger = createLogger('HealthCheck');
    this.checks = new Map();
    this.startTime = Date.now();
    this.lastCheck = null;
    this.checkInterval = null;
    
    // Registrar checks básicos do sistema
    this.registerSystemChecks();
  }

  /**
   * Registra um novo health check
   * @param {string} name - Nome do check
   * @param {Function} checkFunction - Função que executa o check
   * @param {Object} options - Opções do check
   */
  register(name, checkFunction, options = {}) {
    const check = {
      name,
      checkFunction,
      timeout: options.timeout || 5000,
      critical: options.critical || false,
      interval: options.interval || null,
      lastRun: null,
      lastResult: null,
      enabled: options.enabled !== false
    };
    
    this.checks.set(name, check);
    
    this.logger.debug(`Health check registrado: ${name}`, {
      critical: check.critical,
      timeout: check.timeout
    });
    
    // Configurar execução periódica se especificada
    if (check.interval) {
      this.scheduleCheck(name, check.interval);
    }
  }

  /**
   * Remove um health check
   * @param {string} name - Nome do check
   */
  unregister(name) {
    if (this.checks.has(name)) {
      this.checks.delete(name);
      this.logger.debug(`Health check removido: ${name}`);
    }
  }

  /**
   * Executa todos os health checks
   * @returns {Object} Resultado consolidado dos checks
   */
  async getStatus() {
    const startTime = Date.now();
    const results = new Map();
    const errors = [];
    
    // Executar todos os checks habilitados
    for (const [name, check] of this.checks) {
      if (!check.enabled) {
        continue;
      }
      
      try {
        const result = await this.runCheck(name);
        results.set(name, result);
        
        if (!result.healthy && check.critical) {
          errors.push(`Check crítico falhou: ${name} - ${result.message}`);
        }
        
      } catch (error) {
        const errorResult = {
          healthy: false,
          message: error.message,
          error: true,
          timestamp: new Date().toISOString()
        };
        
        results.set(name, errorResult);
        
        if (check.critical) {
          errors.push(`Check crítico com erro: ${name} - ${error.message}`);
        }
        
        this.logger.error(`Erro no health check ${name}:`, error);
      }
    }
    
    // Determinar status geral
    const overallHealthy = errors.length === 0;
    const status = overallHealthy ? 'healthy' : 'unhealthy';
    
    const healthStatus = {
      status,
      healthy: overallHealthy,
      timestamp: new Date().toISOString(),
      uptime: this.getUptime(),
      duration: Date.now() - startTime,
      checks: Object.fromEntries(results),
      errors: errors.length > 0 ? errors : undefined,
      system: this.getSystemInfo()
    };
    
    this.lastCheck = healthStatus;
    
    // Log do resultado
    if (overallHealthy) {
      this.logger.debug('Health check concluído - Sistema saudável');
    } else {
      this.logger.warn('Health check concluído - Sistema com problemas', {
        errors: errors.length,
        failedChecks: Array.from(results.entries())
          .filter(([, result]) => !result.healthy)
          .map(([name]) => name)
      });
    }
    
    return healthStatus;
  }

  /**
   * Executa um health check específico
   * @param {string} name - Nome do check
   * @returns {Object} Resultado do check
   */
  async runCheck(name) {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check não encontrado: ${name}`);
    }
    
    const startTime = Date.now();
    
    try {
      // Executar check com timeout
      const result = await this.executeWithTimeout(
        check.checkFunction,
        check.timeout
      );
      
      const duration = Date.now() - startTime;
      
      const checkResult = {
        healthy: result.healthy !== false,
        message: result.message || 'OK',
        duration,
        timestamp: new Date().toISOString(),
        data: result.data || null
      };
      
      check.lastRun = new Date().toISOString();
      check.lastResult = checkResult;
      
      return checkResult;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const errorResult = {
        healthy: false,
        message: error.message,
        duration,
        timestamp: new Date().toISOString(),
        error: true
      };
      
      check.lastRun = new Date().toISOString();
      check.lastResult = errorResult;
      
      throw error;
    }
  }

  /**
   * Obtém informações do sistema
   * @returns {Object} Informações do sistema
   */
  getSystemInfo() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    return {
      node: {
        version: process.version,
        uptime: process.uptime(),
        memory: {
          rss: this.formatBytes(memUsage.rss),
          heapTotal: this.formatBytes(memUsage.heapTotal),
          heapUsed: this.formatBytes(memUsage.heapUsed),
          external: this.formatBytes(memUsage.external)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      os: {
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        totalmem: this.formatBytes(os.totalmem()),
        freemem: this.formatBytes(os.freemem()),
        cpus: os.cpus().length
      }
    };
  }

  /**
   * Obtém tempo de atividade do sistema
   * @returns {Object} Informações de uptime
   */
  getUptime() {
    const uptimeMs = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    
    return {
      ms: uptimeMs,
      seconds: uptimeSeconds,
      human: this.formatDuration(uptimeMs)
    };
  }

  /**
   * Inicia monitoramento periódico
   * @param {number} interval - Intervalo em ms
   */
  startPeriodicCheck(interval = 30000) {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = setInterval(async () => {
      try {
        await this.getStatus();
      } catch (error) {
        this.logger.error('Erro no health check periódico:', error);
      }
    }, interval);
    
    this.logger.info(`Health check periódico iniciado (${interval}ms)`);
  }

  /**
   * Para monitoramento periódico
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.logger.info('Health check periódico parado');
    }
  }

  /**
   * Registra health checks básicos do sistema
   */
  registerSystemChecks() {
    // Check de memória
    this.register('memory', () => {
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      return {
        healthy: heapUsedPercent < 90,
        message: `Uso de heap: ${heapUsedPercent.toFixed(2)}%`,
        data: {
          heapUsedPercent,
          heapUsed: memUsage.heapUsed,
          heapTotal: memUsage.heapTotal
        }
      };
    }, { critical: true });
    
    // Check de uptime
    this.register('uptime', () => {
      const uptime = this.getUptime();
      
      return {
        healthy: true,
        message: `Sistema ativo há ${uptime.human}`,
        data: uptime
      };
    });
    
    // Check de carga do sistema
    this.register('system-load', () => {
      const loadavg = os.loadavg();
      const cpuCount = os.cpus().length;
      const load1min = loadavg[0];
      const loadPercent = (load1min / cpuCount) * 100;
      
      return {
        healthy: loadPercent < 80,
        message: `Carga do sistema: ${loadPercent.toFixed(2)}%`,
        data: {
          loadavg,
          cpuCount,
          loadPercent
        }
      };
    });
  }

  /**
   * Executa função com timeout
   * @param {Function} fn - Função para executar
   * @param {number} timeout - Timeout em ms
   * @returns {Promise} Resultado da função
   */
  executeWithTimeout(fn, timeout) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Health check timeout (${timeout}ms)`));
      }, timeout);
      
      try {
        const result = await fn();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Agenda execução periódica de um check
   * @param {string} name - Nome do check
   * @param {number} interval - Intervalo em ms
   */
  scheduleCheck(name, interval) {
    setInterval(async () => {
      try {
        await this.runCheck(name);
      } catch (error) {
        this.logger.error(`Erro no check periódico ${name}:`, error);
      }
    }, interval);
  }

  /**
   * Formata bytes em formato legível
   * @param {number} bytes - Bytes
   * @returns {string} Formato legível
   */
  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Formata duração em formato legível
   * @param {number} ms - Milissegundos
   * @returns {string} Formato legível
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}