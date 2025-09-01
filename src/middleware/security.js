import SecurityAuditor from '../core/security-auditor.js';
import { createLogger } from '../core/logger.js';

/**
 * SecurityMiddleware - Middleware de segurança avançada
 * Integra auditoria de segurança, monitoramento e proteção em tempo real
 */
class SecurityMiddleware {
  constructor(config = {}) {
    this.config = {
      enableRealTimeMonitoring: config.enableRealTimeMonitoring || true,
      enableRequestAnalysis: config.enableRequestAnalysis || true,
      enableThreatDetection: config.enableThreatDetection || true,
      enableSecurityHeaders: config.enableSecurityHeaders || true,
      rateLimiting: {
        enabled: config.rateLimiting?.enabled || true,
        windowMs: config.rateLimiting?.windowMs || 900000, // 15 minutos
        maxRequests: config.rateLimiting?.maxRequests || 100,
        skipSuccessfulRequests: config.rateLimiting?.skipSuccessfulRequests || false
      },
      securityHeaders: {
        contentSecurityPolicy: config.securityHeaders?.contentSecurityPolicy || "default-src 'self'",
        xFrameOptions: config.securityHeaders?.xFrameOptions || 'DENY',
        xContentTypeOptions: config.securityHeaders?.xContentTypeOptions || 'nosniff',
        xXSSProtection: config.securityHeaders?.xXSSProtection || '1; mode=block',
        strictTransportSecurity: config.securityHeaders?.strictTransportSecurity || 'max-age=31536000; includeSubDomains'
      },
      threatDetection: {
        sqlInjectionPatterns: config.threatDetection?.sqlInjectionPatterns || [
          /('|(\-\-)|(;)|(\||\|)|(\*|\*))/i,
          /(union|select|insert|delete|update|drop|create|alter|exec|execute)/i
        ],
        xssPatterns: config.threatDetection?.xssPatterns || [
          /<script[^>]*>.*?<\/script>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi
        ],
        pathTraversalPatterns: config.threatDetection?.pathTraversalPatterns || [
          new RegExp('\\.\\.\\/','g'),
          new RegExp('\\.\\.\\\\','g'),
          new RegExp('%2e%2e%2f','gi'),
          new RegExp('%2e%2e%5c','gi')
        ]
      },
      ...config
    };
    
    this.logger = createLogger('SecurityMiddleware');
    this.securityAuditor = null;
    this.requestCounts = new Map();
    this.suspiciousActivities = new Map();
    this.blockedIPs = new Set();
    this.securityEvents = [];
    this.isInitialized = false;
  }

  /**
   * Inicializa o middleware de segurança
   */
  async initialize(auditorConfig = {}) {
    try {
      this.logger.info('🔒 Inicializando Security Middleware...');
      
      // Inicializar Security Auditor
      this.securityAuditor = new SecurityAuditor(auditorConfig);
      await this.securityAuditor.initialize();
      await this.securityAuditor.start();
      
      // Configurar limpeza periódica
      this.setupPeriodicCleanup();
      
      this.isInitialized = true;
      this.logger.info('🔒 Security Middleware inicializado com sucesso');
      
      return true;
    } catch (error) {
      this.logger.error('❌ Erro ao inicializar Security Middleware:', error);
      throw error;
    }
  }

  /**
   * Para o middleware de segurança
   */
  async stop() {
    if (this.securityAuditor) {
      await this.securityAuditor.stop();
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.logger.info('🔒 Security Middleware parado');
  }

  /**
   * Middleware principal de segurança
   */
  middleware() {
    return async (req, res, next) => {
      const startTime = Date.now();
      const clientIP = this.getClientIP(req);
      const userAgent = req.get('User-Agent') || 'unknown';
      
      try {
        // Verificar IP bloqueado
        if (this.blockedIPs.has(clientIP)) {
          this.logSecurityEvent('blocked_ip_access', {
            ip: clientIP,
            url: req.url,
            method: req.method,
            userAgent
          });
          return res.status(403).json({ error: 'Access denied' });
        }
        
        // Aplicar headers de segurança
        if (this.config.enableSecurityHeaders) {
          this.applySecurityHeaders(res);
        }
        
        // Rate limiting
        if (this.config.rateLimiting.enabled) {
          const rateLimitResult = this.checkRateLimit(clientIP);
          if (!rateLimitResult.allowed) {
            this.logSecurityEvent('rate_limit_exceeded', {
              ip: clientIP,
              requests: rateLimitResult.requests,
              limit: this.config.rateLimiting.maxRequests
            });
            return res.status(429).json({ error: 'Too many requests' });
          }
        }
        
        // Análise de ameaças em tempo real
        if (this.config.enableThreatDetection) {
          const threatAnalysis = this.analyzeThreat(req);
          if (threatAnalysis.isThreat) {
            this.handleThreat(clientIP, threatAnalysis, req);
            return res.status(400).json({ error: 'Malicious request detected' });
          }
        }
        
        // Monitoramento de requisições
        if (this.config.enableRequestAnalysis) {
          this.analyzeRequest(req, clientIP, userAgent);
        }
        
        // Interceptar resposta para análise
        const originalSend = res.send;
        res.send = function(data) {
          const responseTime = Date.now() - startTime;
          
          // Analisar resposta
          if (this.config.enableRealTimeMonitoring) {
            this.analyzeResponse(req, res, responseTime, data);
          }
          
          return originalSend.call(this, data);
        }.bind(this);
        
        next();
      } catch (error) {
        this.logger.error('❌ Erro no Security Middleware:', error);
        this.logSecurityEvent('middleware_error', {
          ip: clientIP,
          error: error.message,
          url: req.url
        });
        next();
      }
    };
  }

  /**
   * Aplica headers de segurança
   */
  applySecurityHeaders(res) {
    const headers = this.config.securityHeaders;
    
    if (headers.contentSecurityPolicy) {
      res.setHeader('Content-Security-Policy', headers.contentSecurityPolicy);
    }
    
    if (headers.xFrameOptions) {
      res.setHeader('X-Frame-Options', headers.xFrameOptions);
    }
    
    if (headers.xContentTypeOptions) {
      res.setHeader('X-Content-Type-Options', headers.xContentTypeOptions);
    }
    
    if (headers.xXSSProtection) {
      res.setHeader('X-XSS-Protection', headers.xXSSProtection);
    }
    
    if (headers.strictTransportSecurity) {
      res.setHeader('Strict-Transport-Security', headers.strictTransportSecurity);
    }
    
    // Headers adicionais de segurança
    res.setHeader('X-Powered-By', 'Fusione-Security');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }

  /**
   * Verifica rate limiting
   */
  checkRateLimit(clientIP) {
    const now = Date.now();
    const windowStart = now - this.config.rateLimiting.windowMs;
    
    if (!this.requestCounts.has(clientIP)) {
      this.requestCounts.set(clientIP, []);
    }
    
    const requests = this.requestCounts.get(clientIP);
    
    // Remover requisições antigas
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Adicionar nova requisição
    validRequests.push(now);
    this.requestCounts.set(clientIP, validRequests);
    
    const allowed = validRequests.length <= this.config.rateLimiting.maxRequests;
    
    return {
      allowed,
      requests: validRequests.length,
      remaining: Math.max(0, this.config.rateLimiting.maxRequests - validRequests.length),
      resetTime: windowStart + this.config.rateLimiting.windowMs
    };
  }

  /**
   * Analisa ameaças em tempo real
   */
  analyzeThreat(req) {
    const threats = [];
    const requestData = this.extractRequestData(req);
    
    // Verificar SQL Injection
    for (const pattern of this.config.threatDetection.sqlInjectionPatterns) {
      if (this.testPattern(requestData, pattern)) {
        threats.push({
          type: 'sql_injection',
          severity: 'high',
          pattern: pattern.toString(),
          data: requestData
        });
      }
    }
    
    // Verificar XSS
    for (const pattern of this.config.threatDetection.xssPatterns) {
      if (this.testPattern(requestData, pattern)) {
        threats.push({
          type: 'xss',
          severity: 'medium',
          pattern: pattern.toString(),
          data: requestData
        });
      }
    }
    
    // Verificar Path Traversal
    for (const pattern of this.config.threatDetection.pathTraversalPatterns) {
      if (this.testPattern(requestData, pattern)) {
        threats.push({
          type: 'path_traversal',
          severity: 'high',
          pattern: pattern.toString(),
          data: requestData
        });
      }
    }
    
    return {
      isThreat: threats.length > 0,
      threats,
      riskScore: this.calculateThreatRiskScore(threats)
    };
  }

  /**
   * Extrai dados da requisição para análise
   */
  extractRequestData(req) {
    const data = [];
    
    // URL e query parameters
    data.push(req.url);
    if (req.query) {
      data.push(JSON.stringify(req.query));
    }
    
    // Body da requisição
    if (req.body) {
      data.push(JSON.stringify(req.body));
    }
    
    // Headers suspeitos
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'user-agent', 'referer'];
    for (const header of suspiciousHeaders) {
      const value = req.get(header);
      if (value) {
        data.push(value);
      }
    }
    
    return data.join(' ');
  }

  /**
   * Testa padrão contra dados
   */
  testPattern(data, pattern) {
    try {
      return pattern.test(data);
    } catch (error) {
      this.logger.warn('Erro ao testar padrão de ameaça:', error);
      return false;
    }
  }

  /**
   * Calcula score de risco da ameaça
   */
  calculateThreatRiskScore(threats) {
    const severityWeights = {
      critical: 10,
      high: 7,
      medium: 4,
      low: 1
    };
    
    return threats.reduce((score, threat) => {
      return score + (severityWeights[threat.severity] || 0);
    }, 0);
  }

  /**
   * Manipula ameaça detectada
   */
  handleThreat(clientIP, threatAnalysis, req) {
    this.logSecurityEvent('threat_detected', {
      ip: clientIP,
      url: req.url,
      method: req.method,
      threats: threatAnalysis.threats,
      riskScore: threatAnalysis.riskScore,
      userAgent: req.get('User-Agent')
    });
    
    // Incrementar atividades suspeitas
    const suspiciousCount = (this.suspiciousActivities.get(clientIP) || 0) + 1;
    this.suspiciousActivities.set(clientIP, suspiciousCount);
    
    // Bloquear IP se muitas atividades suspeitas
    if (suspiciousCount >= 5) {
      this.blockedIPs.add(clientIP);
      this.logger.warn(`🚨 IP bloqueado por atividade suspeita: ${clientIP}`);
      
      // Remover bloqueio após 1 hora
      setTimeout(() => {
        this.blockedIPs.delete(clientIP);
        this.suspiciousActivities.delete(clientIP);
        this.logger.info(`🔓 IP desbloqueado: ${clientIP}`);
      }, 3600000); // 1 hora
    }
  }

  /**
   * Analisa requisição
   */
  analyzeRequest(req, clientIP, userAgent) {
    // Detectar user agents suspeitos
    const suspiciousUserAgents = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /sqlmap/i,
      /nikto/i,
      /nmap/i
    ];
    
    for (const pattern of suspiciousUserAgents) {
      if (pattern.test(userAgent)) {
        this.logSecurityEvent('suspicious_user_agent', {
          ip: clientIP,
          userAgent,
          url: req.url
        });
        break;
      }
    }
    
    // Detectar tentativas de acesso a arquivos sensíveis
    const sensitiveFiles = [
      /\.env$/,
      /\.git/,
      /\.ssh/,
      /passwd$/,
      /shadow$/,
      /config\.php$/,
      /wp-config\.php$/
    ];
    
    for (const pattern of sensitiveFiles) {
      if (pattern.test(req.url)) {
        this.logSecurityEvent('sensitive_file_access', {
          ip: clientIP,
          url: req.url,
          userAgent
        });
        break;
      }
    }
  }

  /**
   * Analisa resposta
   */
  analyzeResponse(req, res, responseTime, data) {
    // Detectar vazamento de informações sensíveis
    if (typeof data === 'string') {
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /api[_-]?key/i,
        /private[_-]?key/i
      ];
      
      for (const pattern of sensitivePatterns) {
        if (pattern.test(data)) {
          this.logSecurityEvent('sensitive_data_exposure', {
            url: req.url,
            statusCode: res.statusCode,
            pattern: pattern.toString()
          });
          break;
        }
      }
    }
    
    // Detectar respostas anômalas
    if (responseTime > 5000) { // Mais de 5 segundos
      this.logSecurityEvent('slow_response', {
        url: req.url,
        responseTime,
        statusCode: res.statusCode
      });
    }
  }

  /**
   * Obtém IP do cliente
   */
  getClientIP(req) {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           'unknown';
  }

  /**
   * Registra evento de segurança
   */
  logSecurityEvent(type, data) {
    const event = {
      id: this.generateEventId(),
      type,
      timestamp: new Date().toISOString(),
      data,
      severity: this.getEventSeverity(type)
    };
    
    this.securityEvents.push(event);
    
    // Manter apenas os últimos 1000 eventos
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }
    
    // Log baseado na severidade
    switch (event.severity) {
      case 'critical':
        this.logger.error(`🚨 CRÍTICO [${type}]:`, data);
        break;
      case 'high':
        this.logger.warn(`⚠️ ALTO [${type}]:`, data);
        break;
      case 'medium':
        this.logger.warn(`⚠️ MÉDIO [${type}]:`, data);
        break;
      default:
        this.logger.info(`ℹ️ INFO [${type}]:`, data);
    }
  }

  /**
   * Obtém severidade do evento
   */
  getEventSeverity(type) {
    const severityMap = {
      threat_detected: 'high',
      blocked_ip_access: 'high',
      sensitive_data_exposure: 'critical',
      sensitive_file_access: 'high',
      suspicious_user_agent: 'medium',
      rate_limit_exceeded: 'medium',
      slow_response: 'low',
      middleware_error: 'medium'
    };
    
    return severityMap[type] || 'low';
  }

  /**
   * Configura limpeza periódica
   */
  setupPeriodicCleanup() {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const cleanupThreshold = now - (24 * 60 * 60 * 1000); // 24 horas
      
      // Limpar contadores de requisições antigas
      for (const [ip, requests] of this.requestCounts.entries()) {
        const validRequests = requests.filter(timestamp => timestamp > cleanupThreshold);
        if (validRequests.length === 0) {
          this.requestCounts.delete(ip);
        } else {
          this.requestCounts.set(ip, validRequests);
        }
      }
      
      // Limpar atividades suspeitas antigas
      // (IPs bloqueados são limpos automaticamente após timeout)
      
      this.logger.debug('🧹 Limpeza periódica de dados de segurança executada');
    }, 3600000); // A cada hora
  }

  /**
   * Gera ID único para evento
   */
  generateEventId() {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém estatísticas de segurança
   */
  getSecurityStatistics() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    const recentEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > last24h
    );
    
    const eventsByType = {};
    const eventsBySeverity = {};
    
    recentEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });
    
    return {
      totalEvents: this.securityEvents.length,
      recentEvents: recentEvents.length,
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousActivities.size,
      eventsByType,
      eventsBySeverity,
      isInitialized: this.isInitialized,
      auditorStats: this.securityAuditor ? this.securityAuditor.getSecurityStatistics() : null
    };
  }

  /**
   * Obtém eventos de segurança recentes
   */
  getRecentSecurityEvents(limit = 50) {
    return this.securityEvents.slice(-limit);
  }

  /**
   * Força auditoria de segurança
   */
  async forceSecurityAudit() {
    if (this.securityAuditor) {
      return await this.securityAuditor.performFullSecurityAudit();
    }
    throw new Error('Security Auditor não inicializado');
  }

  /**
   * Desbloqueia IP manualmente
   */
  unblockIP(ip) {
    const wasBlocked = this.blockedIPs.has(ip);
    this.blockedIPs.delete(ip);
    this.suspiciousActivities.delete(ip);
    
    if (wasBlocked) {
      this.logger.info(`🔓 IP desbloqueado manualmente: ${ip}`);
      this.logSecurityEvent('manual_ip_unblock', { ip });
    }
    
    return wasBlocked;
  }

  /**
   * Bloqueia IP manualmente
   */
  blockIP(ip, reason = 'Manual block') {
    this.blockedIPs.add(ip);
    this.logger.warn(`🚨 IP bloqueado manualmente: ${ip} - Razão: ${reason}`);
    this.logSecurityEvent('manual_ip_block', { ip, reason });
  }

  /**
   * Obtém relatório de segurança completo
   */
  getSecurityReport() {
    const stats = this.getSecurityStatistics();
    const recentEvents = this.getRecentSecurityEvents(20);
    
    return {
      timestamp: new Date().toISOString(),
      status: 'active',
      monitoring: {
        enabled: this.config.enableRealTimeMonitoring,
        requestAnalysis: this.config.enableRequestAnalysis,
        threatDetection: this.config.enableThreatDetection
      },
      statistics: stats,
      recentEvents,
      blockedIPs: Array.from(this.blockedIPs).map(ip => ({
        ip,
        reason: 'Security violation',
        timestamp: Date.now()
      })),
      auditor: {
         running: this.auditor ? this.auditor.isRunning() : false,
         lastAudit: this.auditor ? this.auditor.getLastAuditTime() : null
       }
    };
  }

  /**
   * Obtém relatório de auditoria
   */
  getAuditReport() {
    if (!this.auditor) {
      return { error: 'Security auditor not available' };
    }
    
    return this.auditor.getAuditReport();
  }

  /**
   * Obtém relatório de ameaças
   */
  getThreatReport() {
    const recentThreats = this.securityEvents
      .filter(event => ['threat_detected', 'blocked_ip_access', 'suspicious_user_agent'].includes(event.type))
      .slice(-50);
    
    return {
      timestamp: new Date().toISOString(),
      totalThreats: recentThreats.length,
      threats: recentThreats,
      threatsByType: recentThreats.reduce((acc, threat) => {
        const type = threat.type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}),
      blockedIPs: Array.from(this.blockedIPs)
    };
  }

  /**
   * Verifica se o auditor está rodando
   */
  isAuditorRunning() {
    return this.auditor ? this.auditor.isRunning() : false;
  }
}

export default SecurityMiddleware;