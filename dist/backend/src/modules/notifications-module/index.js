import EventEmitter from 'events';
import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

/**
 * Módulo de Notificações Personalizadas
 * Gerencia diferentes tipos de notificações (email, SMS, push, webhook)
 */
class NotificationsModule extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      email: {
        enabled: true,
        smtp: {
          host: process.env.SMTP_HOST || 'localhost',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
          }
        },
        from: process.env.EMAIL_FROM || 'noreply@fusione.com',
        templates: {
          path: './templates/email',
          defaultTemplate: 'default.html'
        }
      },
      sms: {
        enabled: false,
        provider: 'twilio', // twilio, nexmo, etc.
        apiKey: process.env.SMS_API_KEY || '',
        apiSecret: process.env.SMS_API_SECRET || '',
        from: process.env.SMS_FROM || ''
      },
      push: {
        enabled: false,
        firebase: {
          serverKey: process.env.FIREBASE_SERVER_KEY || '',
          projectId: process.env.FIREBASE_PROJECT_ID || ''
        }
      },
      webhook: {
        enabled: true,
        timeout: 5000,
        retries: 3,
        retryDelay: 1000
      },
      queue: {
        enabled: true,
        maxRetries: 3,
        retryDelay: 5000
      },
      ...config
    };
    
    // Filas de notificações
    this.notificationQueue = [];
    this.processingQueue = false;
    
    // Templates de notificação
    this.templates = new Map();
    
    // Histórico de notificações
    this.notificationHistory = [];
    
    // Estatísticas
    this.stats = {
      totalSent: 0,
      totalFailed: 0,
      byType: {
        email: { sent: 0, failed: 0 },
        sms: { sent: 0, failed: 0 },
        push: { sent: 0, failed: 0 },
        webhook: { sent: 0, failed: 0 }
      },
      lastSent: null,
      startTime: new Date()
    };
    
    // Configurações de transporte
    this.emailTransporter = null;
    this.smsClient = null;
    this.pushClient = null;
    
    // Listeners de eventos
    this.eventListeners = new Map();
    
    this.name = 'notifications-module';
    this.version = '1.0.0';
    this.description = 'Módulo de notificações personalizadas';
  }
  
  /**
   * Inicializar o módulo
   */
  async initialize() {
    try {
      console.log('Inicializando módulo de notificações...');
      
      // Configurar transportes
      await this.setupTransports();
      
      // Carregar templates
      await this.loadTemplates();
      
      // Configurar listeners de eventos
      this.setupEventListeners();
      
      // Iniciar processamento da fila
      if (this.config.queue.enabled) {
        this.startQueueProcessing();
      }
      
      this.emit('module:initialized', {
        module: this.name,
        version: this.version,
        timestamp: new Date().toISOString()
      });
      
      console.log('Módulo de notificações inicializado com sucesso');
      return true;
      
    } catch (error) {
      console.error('Erro ao inicializar módulo de notificações:', error);
      throw error;
    }
  }
  
  /**
   * Configurar transportes de notificação
   */
  async setupTransports() {
    // Configurar transporte de email
    if (this.config.email.enabled) {
      try {
        this.emailTransporter = nodemailer.createTransporter(this.config.email.smtp);
        await this.emailTransporter.verify();
        console.log('Transporte de email configurado com sucesso');
      } catch (error) {
        console.warn('Falha ao configurar transporte de email:', error.message);
        this.config.email.enabled = false;
      }
    }
    
    // Configurar cliente SMS (placeholder)
    if (this.config.sms.enabled) {
      // Implementar integração com provedor SMS
      console.log('Cliente SMS configurado');
    }
    
    // Configurar cliente Push (placeholder)
    if (this.config.push.enabled) {
      // Implementar integração com Firebase/FCM
      console.log('Cliente Push configurado');
    }
  }
  
  /**
   * Carregar templates de notificação
   */
  async loadTemplates() {
    try {
      const templatesPath = this.config.email.templates.path;
      
      // Templates padrão
      const defaultTemplates = {
        'welcome': {
          subject: 'Bem-vindo ao Fusione!',
          html: '<h1>Bem-vindo, {{name}}!</h1><p>Obrigado por se juntar a nós.</p>',
          text: 'Bem-vindo, {{name}}! Obrigado por se juntar a nós.'
        },
        'notification': {
          subject: 'Nova Notificação',
          html: '<h2>{{title}}</h2><p>{{message}}</p>',
          text: '{{title}}\n\n{{message}}'
        },
        'alert': {
          subject: 'Alerta do Sistema',
          html: '<div style="color: red;"><h2>⚠️ {{title}}</h2><p>{{message}}</p></div>',
          text: '⚠️ {{title}}\n\n{{message}}'
        },
        'report': {
          subject: 'Relatório Disponível',
          html: '<h2>📊 Relatório: {{reportName}}</h2><p>Seu relatório está pronto para download.</p>',
          text: 'Relatório: {{reportName}}\n\nSeu relatório está pronto para download.'
        }
      };
      
      // Carregar templates padrão
      for (const [name, template] of Object.entries(defaultTemplates)) {
        this.templates.set(name, template);
      }
      
      console.log(`${this.templates.size} templates carregados`);
      
    } catch (error) {
      console.warn('Erro ao carregar templates:', error.message);
    }
  }
  
  /**
   * Configurar listeners de eventos do sistema
   */
  setupEventListeners() {
    // Listener para eventos de usuário
    this.eventListeners.set('user:registered', async (data) => {
      await this.sendNotification({
        type: 'email',
        to: data.email,
        template: 'welcome',
        data: { name: data.name }
      });
    });
    
    // Listener para eventos de relatório
    this.eventListeners.set('report:generated', async (data) => {
      if (data.notifyEmail) {
        await this.sendNotification({
          type: 'email',
          to: data.notifyEmail,
          template: 'report',
          data: { reportName: data.reportName }
        });
      }
    });
    
    // Listener para alertas do sistema
    this.eventListeners.set('system:alert', async (data) => {
      await this.sendNotification({
        type: 'email',
        to: data.adminEmail || 'admin@fusione.com',
        template: 'alert',
        data: { title: data.title, message: data.message }
      });
    });
  }
  
  /**
   * Enviar notificação
   */
  async sendNotification(notification) {
    try {
      // Validar notificação
      if (!this.validateNotification(notification)) {
        throw new Error('Notificação inválida');
      }
      
      // Adicionar à fila se habilitado
      if (this.config.queue.enabled) {
        return this.addToQueue(notification);
      }
      
      // Enviar diretamente
      return await this.processNotification(notification);
      
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      this.updateStats('failed', notification.type);
      throw error;
    }
  }
  
  /**
   * Validar notificação
   */
  validateNotification(notification) {
    if (!notification.type || !notification.to) {
      return false;
    }
    
    const validTypes = ['email', 'sms', 'push', 'webhook'];
    if (!validTypes.includes(notification.type)) {
      return false;
    }
    
    // Validações específicas por tipo
    switch (notification.type) {
      case 'email':
        return this.validateEmail(notification.to);
      case 'sms':
        return this.validatePhone(notification.to);
      case 'webhook':
        return this.validateUrl(notification.to);
      default:
        return true;
    }
  }
  
  /**
   * Processar notificação
   */
  async processNotification(notification) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (notification.type) {
        case 'email':
          result = await this.sendEmail(notification);
          break;
        case 'sms':
          result = await this.sendSMS(notification);
          break;
        case 'push':
          result = await this.sendPush(notification);
          break;
        case 'webhook':
          result = await this.sendWebhook(notification);
          break;
        default:
          throw new Error(`Tipo de notificação não suportado: ${notification.type}`);
      }
      
      // Atualizar estatísticas
      this.updateStats('sent', notification.type);
      
      // Adicionar ao histórico
      this.addToHistory({
        ...notification,
        status: 'sent',
        sentAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        result
      });
      
      this.emit('notification:sent', {
        type: notification.type,
        to: notification.to,
        result
      });
      
      return result;
      
    } catch (error) {
      this.updateStats('failed', notification.type);
      
      this.addToHistory({
        ...notification,
        status: 'failed',
        failedAt: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        error: error.message
      });
      
      this.emit('notification:failed', {
        type: notification.type,
        to: notification.to,
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Enviar email
   */
  async sendEmail(notification) {
    if (!this.config.email.enabled || !this.emailTransporter) {
      throw new Error('Transporte de email não disponível');
    }
    
    // Processar template
    const emailContent = await this.processTemplate(notification);
    
    const mailOptions = {
      from: this.config.email.from,
      to: notification.to,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      ...notification.options
    };
    
    const result = await this.emailTransporter.sendMail(mailOptions);
    return {
      messageId: result.messageId,
      response: result.response
    };
  }
  
  /**
   * Enviar SMS (placeholder)
   */
  async sendSMS(notification) {
    if (!this.config.sms.enabled) {
      throw new Error('SMS não habilitado');
    }
    
    // Implementar integração com provedor SMS
    console.log('Enviando SMS para:', notification.to);
    
    return {
      messageId: `sms_${Date.now()}`,
      status: 'sent'
    };
  }
  
  /**
   * Enviar push notification (placeholder)
   */
  async sendPush(notification) {
    if (!this.config.push.enabled) {
      throw new Error('Push notifications não habilitado');
    }
    
    // Implementar integração com Firebase/FCM
    console.log('Enviando push para:', notification.to);
    
    return {
      messageId: `push_${Date.now()}`,
      status: 'sent'
    };
  }
  
  /**
   * Enviar webhook
   */
  async sendWebhook(notification) {
    const payload = {
      timestamp: new Date().toISOString(),
      data: notification.data || {},
      ...notification.payload
    };
    
    const response = await fetch(notification.to, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...notification.headers
      },
      body: JSON.stringify(payload),
      timeout: this.config.webhook.timeout
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      url: notification.to
    };
  }
  
  /**
   * Processar template
   */
  async processTemplate(notification) {
    let template;
    
    if (notification.template && this.templates.has(notification.template)) {
      template = this.templates.get(notification.template);
    } else {
      // Template inline
      template = {
        subject: notification.subject || 'Notificação',
        html: notification.html || notification.message || '',
        text: notification.text || notification.message || ''
      };
    }
    
    // Substituir variáveis
    const data = notification.data || {};
    
    return {
      subject: this.replaceVariables(template.subject, data),
      html: this.replaceVariables(template.html, data),
      text: this.replaceVariables(template.text, data)
    };
  }
  
  /**
   * Substituir variáveis no template
   */
  replaceVariables(template, data) {
    if (!template) return '';
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }
  
  /**
   * Adicionar notificação à fila
   */
  addToQueue(notification) {
    const queueItem = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      notification,
      addedAt: new Date().toISOString(),
      retries: 0,
      maxRetries: this.config.queue.maxRetries
    };
    
    this.notificationQueue.push(queueItem);
    
    this.emit('notification:queued', {
      id: queueItem.id,
      type: notification.type,
      queueSize: this.notificationQueue.length
    });
    
    return queueItem.id;
  }
  
  /**
   * Iniciar processamento da fila
   */
  startQueueProcessing() {
    if (this.processingQueue) return;
    
    this.processingQueue = true;
    
    const processQueue = async () => {
      while (this.notificationQueue.length > 0 && this.processingQueue) {
        const queueItem = this.notificationQueue.shift();
        
        try {
          await this.processNotification(queueItem.notification);
          
        } catch (error) {
          queueItem.retries++;
          
          if (queueItem.retries < queueItem.maxRetries) {
            // Reagendar para retry
            setTimeout(() => {
              this.notificationQueue.push(queueItem);
            }, this.config.queue.retryDelay);
          } else {
            console.error(`Notificação ${queueItem.id} falhou após ${queueItem.maxRetries} tentativas:`, error);
          }
        }
        
        // Pequena pausa entre processamentos
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Reagendar processamento
      if (this.processingQueue) {
        setTimeout(processQueue, 1000);
      }
    };
    
    processQueue();
  }
  
  /**
   * Parar processamento da fila
   */
  stopQueueProcessing() {
    this.processingQueue = false;
  }
  
  /**
   * Atualizar estatísticas
   */
  updateStats(status, type) {
    if (status === 'sent') {
      this.stats.totalSent++;
      this.stats.byType[type].sent++;
      this.stats.lastSent = new Date().toISOString();
    } else if (status === 'failed') {
      this.stats.totalFailed++;
      this.stats.byType[type].failed++;
    }
  }
  
  /**
   * Adicionar ao histórico
   */
  addToHistory(notification) {
    this.notificationHistory.unshift(notification);
    
    // Manter apenas os últimos 1000 registros
    if (this.notificationHistory.length > 1000) {
      this.notificationHistory = this.notificationHistory.slice(0, 1000);
    }
  }
  
  /**
   * Obter estatísticas
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.notificationQueue.length,
      uptime: Date.now() - this.stats.startTime.getTime(),
      successRate: this.stats.totalSent > 0 ? 
        ((this.stats.totalSent / (this.stats.totalSent + this.stats.totalFailed)) * 100).toFixed(2) + '%' : '0%'
    };
  }
  
  /**
   * Obter histórico de notificações
   */
  getHistory(limit = 50) {
    return this.notificationHistory.slice(0, limit);
  }
  
  /**
   * Obter templates disponíveis
   */
  getTemplates() {
    const templates = [];
    
    for (const [name, template] of this.templates) {
      templates.push({
        name,
        subject: template.subject,
        description: template.description || 'Template personalizado'
      });
    }
    
    return templates;
  }
  
  /**
   * Adicionar template personalizado
   */
  addTemplate(name, template) {
    this.templates.set(name, {
      ...template,
      createdAt: new Date().toISOString()
    });
  }
  
  /**
   * Remover template
   */
  removeTemplate(name) {
    return this.templates.delete(name);
  }
  
  /**
   * Validar email
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validar telefone
   */
  validatePhone(phone) {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }
  
  /**
   * Validar URL
   */
  validateUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Limpar cache e histórico
   */
  clearHistory() {
    const cleared = this.notificationHistory.length;
    this.notificationHistory = [];
    return cleared;
  }
  
  /**
   * Finalizar módulo
   */
  async shutdown() {
    console.log('Finalizando módulo de notificações...');
    
    // Parar processamento da fila
    this.stopQueueProcessing();
    
    // Fechar transportes
    if (this.emailTransporter) {
      this.emailTransporter.close();
    }
    
    this.emit('module:shutdown', {
      module: this.name,
      timestamp: new Date().toISOString()
    });
    
    console.log('Módulo de notificações finalizado');
  }
}

export default NotificationsModule;