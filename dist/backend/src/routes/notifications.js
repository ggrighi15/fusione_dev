import express from 'express';
import multer from 'multer';

const router = express.Router();

// Configuração do multer para upload de templates
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 1 * 1024 * 1024 // 1MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/html' || file.mimetype === 'text/plain' || 
        file.originalname.endsWith('.html') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos HTML e TXT são permitidos'), false);
    }
  }
});

// POST /api/notifications/send - Enviar uma notificação
router.post('/send', async (req, res) => {
  try {
    const { type, to, template, data, options } = req.body;
    
    if (!type || !to) {
      return res.status(400).json({
        success: false,
        error: 'type e to são obrigatórios'
      });
    }
    
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    // Enviar notificação
    const result = await notificationsModule.sendNotification({
      type,
      to,
      template,
      data,
      options
    });
    
    res.json({
      success: true,
      message: `Notificação ${type} enviada com sucesso`,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/notifications/send/batch - Enviar múltiplas notificações
router.post('/send/batch', async (req, res) => {
  try {
    const { notifications } = req.body;
    
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'notifications deve ser um array não vazio'
      });
    }
    
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Enviar cada notificação
    for (let i = 0; i < notifications.length; i++) {
      const notification = notifications[i];
      
      try {
        if (!notification.type || !notification.to) {
          results.push({
            index: i,
            success: false,
            error: 'type e to são obrigatórios',
            notification
          });
          errorCount++;
          continue;
        }
        
        const result = await notificationsModule.sendNotification(notification);
        
        results.push({
          index: i,
          success: true,
          result,
          notification
        });
        
        successCount++;
        
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message,
          notification
        });
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: 'Envio em lote concluído',
      data: {
        totalNotifications: notifications.length,
        successfulSends: successCount,
        failedSends: errorCount,
        successRate: (successCount / notifications.length * 100).toFixed(2) + '%',
        results
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/notifications/templates - Listar templates disponíveis
router.get('/templates', async (req, res) => {
  try {
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    const templates = notificationsModule.getTemplates();
    
    res.json({
      success: true,
      message: 'Templates obtidos com sucesso',
      data: {
        templates,
        totalTemplates: templates.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/notifications/templates - Adicionar novo template
router.post('/templates', async (req, res) => {
  try {
    const { name, subject, html, text, description } = req.body;
    
    if (!name || !subject) {
      return res.status(400).json({
        success: false,
        error: 'name e subject são obrigatórios'
      });
    }
    
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    // Verificar se template já existe
    if (notificationsModule.templates.has(name)) {
      return res.status(409).json({
        success: false,
        error: `Template '${name}' já existe`
      });
    }
    
    // Adicionar template
    notificationsModule.addTemplate(name, {
      subject,
      html: html || '',
      text: text || '',
      description: description || 'Template personalizado'
    });
    
    res.json({
      success: true,
      message: `Template '${name}' adicionado com sucesso`,
      data: {
        name,
        subject,
        description
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/notifications/templates/upload - Upload de template
router.post('/templates/upload', upload.single('template'), async (req, res) => {
  try {
    const { name, subject, description } = req.body;
    
    if (!name || !subject) {
      return res.status(400).json({
        success: false,
        error: 'name e subject são obrigatórios'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Arquivo de template é obrigatório'
      });
    }
    
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    // Verificar se template já existe
    if (notificationsModule.templates.has(name)) {
      return res.status(409).json({
        success: false,
        error: `Template '${name}' já existe`
      });
    }
    
    const content = req.file.buffer.toString('utf8');
    const isHtml = req.file.mimetype === 'text/html' || req.file.originalname.endsWith('.html');
    
    // Adicionar template
    notificationsModule.addTemplate(name, {
      subject,
      html: isHtml ? content : '',
      text: isHtml ? '' : content,
      description: description || 'Template carregado via upload',
      uploadedAt: new Date().toISOString(),
      fileSize: req.file.size
    });
    
    res.json({
      success: true,
      message: `Template '${name}' carregado com sucesso`,
      data: {
        name,
        subject,
        description,
        fileSize: req.file.size,
        contentType: isHtml ? 'html' : 'text'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/notifications/templates/:name - Remover template
router.delete('/templates/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    if (!notificationsModule.templates.has(name)) {
      return res.status(404).json({
        success: false,
        error: `Template '${name}' não encontrado`
      });
    }
    
    const removed = notificationsModule.removeTemplate(name);
    
    if (removed) {
      res.json({
        success: true,
        message: `Template '${name}' removido com sucesso`,
        data: { name },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Falha ao remover template'
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/notifications/history - Obter histórico de notificações
router.get('/history', async (req, res) => {
  try {
    const { limit = 50, type, status } = req.query;
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    let history = notificationsModule.getHistory(parseInt(limit));
    
    // Filtrar por tipo se especificado
    if (type) {
      history = history.filter(item => item.type === type);
    }
    
    // Filtrar por status se especificado
    if (status) {
      history = history.filter(item => item.status === status);
    }
    
    res.json({
      success: true,
      message: 'Histórico obtido com sucesso',
      data: {
        history,
        totalItems: history.length,
        filters: {
          limit: parseInt(limit),
          type: type || 'all',
          status: status || 'all'
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/notifications/stats - Obter estatísticas do módulo
router.get('/stats', async (req, res) => {
  try {
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    const stats = notificationsModule.getStats();
    
    res.json({
      success: true,
      message: 'Estatísticas obtidas com sucesso',
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/notifications/queue - Obter status da fila de notificações
router.get('/queue', async (req, res) => {
  try {
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    const queueStatus = {
      size: notificationsModule.notificationQueue.length,
      processing: notificationsModule.processingQueue,
      items: notificationsModule.notificationQueue.slice(0, 10).map(item => ({
        id: item.id,
        type: item.notification.type,
        to: item.notification.to,
        addedAt: item.addedAt,
        retries: item.retries,
        maxRetries: item.maxRetries
      }))
    };
    
    res.json({
      success: true,
      message: 'Status da fila obtido com sucesso',
      data: queueStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/notifications/queue/clear - Limpar fila de notificações
router.post('/queue/clear', async (req, res) => {
  try {
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    const queueSize = notificationsModule.notificationQueue.length;
    notificationsModule.notificationQueue = [];
    
    res.json({
      success: true,
      message: 'Fila de notificações limpa com sucesso',
      data: {
        clearedItems: queueSize,
        clearedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/notifications/test - Testar configuração de transporte
router.post('/test', async (req, res) => {
  try {
    const { type, to } = req.body;
    
    if (!type || !to) {
      return res.status(400).json({
        success: false,
        error: 'type e to são obrigatórios'
      });
    }
    
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    // Preparar notificação de teste
    const testNotification = {
      type,
      to,
      template: 'notification',
      data: {
        title: 'Teste de Notificação',
        message: `Esta é uma notificação de teste do tipo ${type} enviada em ${new Date().toLocaleString()}.`
      }
    };
    
    // Enviar notificação de teste
    const result = await notificationsModule.sendNotification(testNotification);
    
    res.json({
      success: true,
      message: `Teste de notificação ${type} realizado com sucesso`,
      data: {
        type,
        to,
        result,
        testPerformedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/notifications/types - Listar tipos de notificação disponíveis
router.get('/types', async (req, res) => {
  try {
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    const types = [
      {
        type: 'email',
        name: 'Email',
        description: 'Notificações por email',
        enabled: notificationsModule.config.email.enabled,
        validation: ['to', 'subject']
      },
      {
        type: 'sms',
        name: 'SMS',
        description: 'Notificações por SMS',
        enabled: notificationsModule.config.sms.enabled,
        validation: ['to', 'message']
      },
      {
        type: 'push',
        name: 'Push Notification',
        description: 'Notificações push para dispositivos',
        enabled: notificationsModule.config.push.enabled,
        validation: ['to', 'title', 'body']
      },
      {
        type: 'webhook',
        name: 'Webhook',
        description: 'Notificações via HTTP POST',
        enabled: notificationsModule.config.webhook.enabled,
        validation: ['to', 'payload']
      }
    ];
    
    res.json({
      success: true,
      message: 'Tipos de notificação obtidos com sucesso',
      data: {
        types,
        totalTypes: types.length,
        enabledTypes: types.filter(t => t.enabled).length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/notifications/history/clear - Limpar histórico
router.delete('/history/clear', async (req, res) => {
  try {
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    const cleared = notificationsModule.clearHistory();
    
    res.json({
      success: true,
      message: 'Histórico de notificações limpo com sucesso',
      data: {
        clearedItems: cleared,
        clearedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/notifications/preview/:template - Preview de template
router.get('/preview/:template', async (req, res) => {
  try {
    const { template } = req.params;
    const { data = {} } = req.query;
    
    const notificationsModule = req.app.moduleManager?.getModule('notifications-module');
    
    if (!notificationsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de notificações não disponível'
      });
    }
    
    if (!notificationsModule.templates.has(template)) {
      return res.status(404).json({
        success: false,
        error: `Template '${template}' não encontrado`
      });
    }
    
    // Dados de exemplo para preview
    const sampleData = {
      name: 'João Silva',
      email: 'joao@email.com',
      title: 'Título de Exemplo',
      message: 'Esta é uma mensagem de exemplo para preview do template.',
      reportName: 'Relatório Mensal',
      actionUrl: 'https://exemplo.com/acao',
      ...JSON.parse(data || '{}')
    };
    
    // Processar template com dados de exemplo
    const preview = await notificationsModule.processTemplate({
      template,
      data: sampleData
    });
    
    res.json({
      success: true,
      message: `Preview do template '${template}' gerado com sucesso`,
      data: {
        template,
        preview,
        sampleData
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;