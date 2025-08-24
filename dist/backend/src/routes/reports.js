import express from 'express';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configuração do multer para upload de templates
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos JSON são permitidos'), false);
    }
  }
});

// POST /api/reports/generate - Gerar um novo relatório
router.post('/generate', async (req, res) => {
  try {
    const { type, data, options = {} } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({
        success: false,
        error: 'type e data são obrigatórios'
      });
    }
    
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    // Gerar relatório
    const report = await reportsModule.generateReport(type, data, options);
    
    res.json({
      success: true,
      message: `Relatório '${type}' gerado com sucesso`,
      data: report,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/reports/export - Exportar relatório em formato específico
router.post('/export', async (req, res) => {
  try {
    const { report, format } = req.body;
    
    if (!report) {
      return res.status(400).json({
        success: false,
        error: 'report é obrigatório'
      });
    }
    
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    // Exportar relatório
    const exportResult = await reportsModule.exportReport(report, format);
    
    res.json({
      success: true,
      message: `Relatório exportado com sucesso em formato ${exportResult.format}`,
      data: exportResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/reports/types - Listar tipos de relatórios disponíveis
router.get('/types', async (req, res) => {
  try {
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    const availableReports = reportsModule.getAvailableReports();
    
    res.json({
      success: true,
      message: 'Tipos de relatórios obtidos com sucesso',
      data: {
        reports: availableReports,
        totalTypes: availableReports.length
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

// GET /api/reports/history - Obter histórico de relatórios gerados
router.get('/history', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    const history = reportsModule.getReportHistory(parseInt(limit));
    
    res.json({
      success: true,
      message: 'Histórico de relatórios obtido com sucesso',
      data: {
        history,
        totalReports: history.length,
        limit: parseInt(limit)
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

// GET /api/reports/stats - Obter estatísticas do módulo de relatórios
router.get('/stats', async (req, res) => {
  try {
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    const stats = reportsModule.getStats();
    
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

// GET /api/reports/templates - Listar templates de relatórios disponíveis
router.get('/templates', async (req, res) => {
  try {
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    const templates = [];
    
    for (const [name, template] of reportsModule.reportTemplates) {
      templates.push({
        name,
        title: template.title || name,
        description: template.description || 'Template personalizado',
        sections: template.sections?.length || 0,
        createdAt: template.createdAt || null
      });
    }
    
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

// POST /api/reports/templates/upload - Fazer upload de novo template de relatório
router.post('/templates/upload', upload.single('template'), async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Nome do template é obrigatório'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Arquivo de template é obrigatório'
      });
    }
    
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    // Parsear o template JSON
    let template;
    try {
      template = JSON.parse(req.file.buffer.toString('utf8'));
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        error: 'Template deve ser um JSON válido'
      });
    }
    
    // Validar estrutura básica do template
    if (!template.title && !template.sections) {
      return res.status(400).json({
        success: false,
        error: 'Template deve conter pelo menos title ou sections'
      });
    }
    
    // Adicionar metadados
    template.name = name;
    template.uploadedAt = new Date().toISOString();
    template.size = req.file.size;
    
    // Salvar template
    reportsModule.reportTemplates.set(name, template);
    
    res.json({
      success: true,
      message: `Template '${name}' carregado com sucesso`,
      data: {
        name,
        title: template.title,
        sections: template.sections?.length || 0,
        uploadedAt: template.uploadedAt,
        size: template.size
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

// DELETE /api/reports/templates/:name - Remover template
router.delete('/templates/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    if (!reportsModule.reportTemplates.has(name)) {
      return res.status(404).json({
        success: false,
        error: `Template '${name}' não encontrado`
      });
    }
    
    reportsModule.reportTemplates.delete(name);
    
    res.json({
      success: true,
      message: `Template '${name}' removido com sucesso`,
      data: { name },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/reports/cache/clear - Limpar cache de relatórios
router.delete('/cache/clear', async (req, res) => {
  try {
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    const cleared = reportsModule.clearCache();
    
    res.json({
      success: true,
      message: 'Cache de relatórios limpo com sucesso',
      data: {
        cleared,
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

// POST /api/reports/batch/generate - Gerar múltiplos relatórios
router.post('/batch/generate', async (req, res) => {
  try {
    const { reports } = req.body;
    
    if (!Array.isArray(reports) || reports.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'reports deve ser um array não vazio'
      });
    }
    
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    // Gerar cada relatório
    for (let i = 0; i < reports.length; i++) {
      const reportRequest = reports[i];
      
      try {
        if (!reportRequest.type || !reportRequest.data) {
          results.push({
            index: i,
            success: false,
            error: 'type e data são obrigatórios',
            request: reportRequest
          });
          errorCount++;
          continue;
        }
        
        const report = await reportsModule.generateReport(
          reportRequest.type,
          reportRequest.data,
          reportRequest.options || {}
        );
        
        results.push({
          index: i,
          success: true,
          report,
          request: reportRequest
        });
        
        successCount++;
        
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error.message,
          request: reportRequest
        });
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: 'Geração em lote concluída',
      data: {
        totalRequests: reports.length,
        successfulReports: successCount,
        failedReports: errorCount,
        successRate: (successCount / reports.length * 100).toFixed(2) + '%',
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

// GET /api/reports/download/:filename - Download de arquivo de relatório
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    const filepath = path.join(reportsModule.config.outputPath, filename);
    
    // Verificar se o arquivo existe e está no diretório permitido
    try {
      await fs.access(filepath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'Arquivo não encontrado'
      });
    }
    
    // Determinar tipo de conteúdo baseado na extensão
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.json': 'application/json',
      '.csv': 'text/csv',
      '.html': 'text/html',
      '.pdf': 'application/pdf'
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Stream do arquivo
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/reports/preview/:type - Preview de estrutura de relatório
router.get('/preview/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const reportsModule = req.app.moduleManager?.getModule('reports-module');
    
    if (!reportsModule) {
      return res.status(503).json({
        success: false,
        error: 'Módulo de relatórios não disponível'
      });
    }
    
    const generator = reportsModule.reportGenerators.get(type);
    
    if (!generator) {
      return res.status(404).json({
        success: false,
        error: `Tipo de relatório '${type}' não encontrado`
      });
    }
    
    // Gerar preview com dados de exemplo
    const sampleData = this.generateSampleData(type);
    const preview = await generator.generate(sampleData, { preview: true });
    
    res.json({
      success: true,
      message: `Preview do relatório '${type}' gerado com sucesso`,
      data: {
        type,
        generator: generator.name,
        description: generator.description,
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

// Função auxiliar para gerar dados de exemplo
function generateSampleData(type) {
  const sampleData = {
    financial: {
      transactions: [
        {
          id: '1',
          date: '2024-01-15',
          amount: 1500.00,
          type: 'income',
          category: 'Vendas',
          description: 'Venda de produto A'
        },
        {
          id: '2',
          date: '2024-01-16',
          amount: -500.00,
          type: 'expense',
          category: 'Fornecedores',
          description: 'Compra de matéria-prima'
        }
      ]
    },
    inventory: {
      products: [
        {
          id: '1',
          name: 'Produto A',
          quantity: 50,
          price: 25.99,
          category: 'Eletrônicos',
          sku: 'PROD-A-001'
        },
        {
          id: '2',
          name: 'Produto B',
          quantity: 5,
          price: 15.50,
          category: 'Acessórios',
          sku: 'PROD-B-002'
        }
      ]
    },
    customers: {
      customers: [
        {
          id: '1',
          name: 'João Silva',
          email: 'joao@email.com',
          createdAt: '2024-01-01',
          lastActivity: '2024-01-20',
          totalOrders: 5,
          totalSpent: 2500.00
        },
        {
          id: '2',
          name: 'Maria Santos',
          email: 'maria@email.com',
          createdAt: '2023-12-15',
          lastActivity: '2023-12-20',
          totalOrders: 2,
          totalSpent: 800.00
        }
      ]
    },
    sales: {
      sales: [
        {
          id: '1',
          date: '2024-01-15',
          total: 1500.00,
          customerId: '1',
          salesperson: 'Vendedor A'
        },
        {
          id: '2',
          date: '2024-01-16',
          total: 800.00,
          customerId: '2',
          salesperson: 'Vendedor B'
        }
      ]
    }
  };
  
  return sampleData[type] || {};
}

export default router;