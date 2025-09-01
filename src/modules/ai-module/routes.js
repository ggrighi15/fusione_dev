const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Configuração do multer para upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /\.(pdf|doc|docx|txt|rtf)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'), false);
    }
  }
});

/**
 * Middleware de autenticação
 */
const authenticateRequest = (req, res, next) => {
  // Implementação básica de autenticação
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação necessário' });
  }
  
  // Aqui seria validado o token JWT
  // Por enquanto, aceita qualquer token
  next();
};

/**
 * Middleware de validação de entrada
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Dados de entrada inválidos',
        details: error.details.map(d => d.message)
      });
    }
    next();
  };
};

/**
 * Rotas do módulo de IA
 */
module.exports = (aiModule, logger) => {
  
  /**
   * GET /api/ai/status
   * Obtém status do módulo de IA
   */
  router.get('/status', (req, res) => {
    try {
      const info = aiModule.getInfo();
      const stats = aiModule.getModelStatistics();
      
      res.json({
        status: 'success',
        data: {
          module: info,
          statistics: stats,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger?.error('❌ Erro ao obter status do AI Module:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro interno do servidor',
        message: error.message
      });
    }
  });

  /**
   * POST /api/ai/classify/document
   * Classifica documento automaticamente
   */
  router.post('/classify/document', upload.single('document'), async (req, res) => {
    try {
      if (!req.file && !req.body.content) {
        return res.status(400).json({
          status: 'error',
          error: 'Arquivo ou conteúdo do documento necessário'
        });
      }
      
      const documentData = {
        id: req.body.id || `doc_${Date.now()}`,
        filename: req.file?.originalname || req.body.filename,
        content: req.file ? req.file.buffer.toString('utf8') : req.body.content,
        pageCount: req.body.pageCount || 1,
        metadata: req.body.metadata || {}
      };
      
      const result = await aiModule.classifyDocument(documentData);
      
      res.json({
        status: 'success',
        data: result
      });
      
      logger?.info(`🤖 Documento classificado via API: ${result.classification}`);
      
    } catch (error) {
      logger?.error('❌ Erro na classificação de documento via API:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro na classificação do documento',
        message: error.message
      });
    }
  });

  /**
   * POST /api/ai/predict/process
   * Prediz resultado de processo
   */
  router.post('/predict/process', async (req, res) => {
    try {
      const { processData } = req.body;
      
      if (!processData) {
        return res.status(400).json({
          status: 'error',
          error: 'Dados do processo necessários'
        });
      }
      
      const result = await aiModule.predictProcessOutcome(processData);
      
      res.json({
        status: 'success',
        data: result
      });
      
      logger?.info(`🤖 Predição de processo via API: ${result.prediction}`);
      
    } catch (error) {
      logger?.error('❌ Erro na predição de processo via API:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro na predição do processo',
        message: error.message
      });
    }
  });

  /**
   * POST /api/ai/estimate/time
   * Estima tempo de conclusão de processo
   */
  router.post('/estimate/time', async (req, res) => {
    try {
      const { processData } = req.body;
      
      if (!processData) {
        return res.status(400).json({
          status: 'error',
          error: 'Dados do processo necessários'
        });
      }
      
      const result = await aiModule.estimateProcessTime(processData);
      
      res.json({
        status: 'success',
        data: result
      });
      
      logger?.info(`🤖 Estimativa de tempo via API: ${result.estimatedDays} dias`);
      
    } catch (error) {
      logger?.error('❌ Erro na estimativa de tempo via API:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro na estimativa de tempo',
        message: error.message
      });
    }
  });

  /**
   * POST /api/ai/assess/risk
   * Avalia risco de processo
   */
  router.post('/assess/risk', async (req, res) => {
    try {
      const { processData } = req.body;
      
      if (!processData) {
        return res.status(400).json({
          status: 'error',
          error: 'Dados do processo necessários'
        });
      }
      
      const result = await aiModule.assessRisk(processData);
      
      res.json({
        status: 'success',
        data: result
      });
      
      logger?.info(`🤖 Avaliação de risco via API: ${result.riskLevel}`);
      
    } catch (error) {
      logger?.error('❌ Erro na avaliação de risco via API:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro na avaliação de risco',
        message: error.message
      });
    }
  });

  /**
   * POST /api/ai/analyze/complete
   * Análise completa (classificação + predição + estimativa + risco)
   */
  router.post('/analyze/complete', upload.single('document'), async (req, res) => {
    try {
      const { processData } = req.body;
      
      if (!processData) {
        return res.status(400).json({
          status: 'error',
          error: 'Dados do processo necessários'
        });
      }
      
      const results = {
        processId: processData.id,
        timestamp: new Date().toISOString(),
        analysis: {}
      };
      
      // Classificação de documento (se fornecido)
      if (req.file || req.body.documentContent) {
        const documentData = {
          id: `doc_${processData.id}_${Date.now()}`,
          filename: req.file?.originalname || 'document.txt',
          content: req.file ? req.file.buffer.toString('utf8') : req.body.documentContent,
          pageCount: req.body.pageCount || 1
        };
        
        results.analysis.classification = await aiModule.classifyDocument(documentData);
      }
      
      // Predição de resultado
      results.analysis.prediction = await aiModule.predictProcessOutcome(processData);
      
      // Estimativa de tempo
      results.analysis.timeEstimation = await aiModule.estimateProcessTime(processData);
      
      // Avaliação de risco
      results.analysis.riskAssessment = await aiModule.assessRisk(processData);
      
      res.json({
        status: 'success',
        data: results
      });
      
      logger?.info(`🤖 Análise completa via API para processo ${processData.id}`);
      
    } catch (error) {
      logger?.error('❌ Erro na análise completa via API:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro na análise completa',
        message: error.message
      });
    }
  });

  /**
   * POST /api/ai/train/model
   * Treina modelo específico
   */
  router.post('/train/model', authenticateRequest, async (req, res) => {
    try {
      const { modelId, trainingData } = req.body;
      
      if (!modelId) {
        return res.status(400).json({
          status: 'error',
          error: 'ID do modelo necessário'
        });
      }
      
      const result = await aiModule.trainModel(modelId, trainingData);
      
      res.json({
        status: 'success',
        data: {
          modelId: modelId,
          accuracy: result.accuracy,
          lastTrained: result.lastTrained,
          message: 'Modelo treinado com sucesso'
        }
      });
      
      logger?.info(`🤖 Modelo ${modelId} treinado via API`);
      
    } catch (error) {
      logger?.error('❌ Erro no treinamento via API:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro no treinamento do modelo',
        message: error.message
      });
    }
  });

  /**
   * GET /api/ai/models
   * Lista todos os modelos disponíveis
   */
  router.get('/models', (req, res) => {
    try {
      const stats = aiModule.getModelStatistics();
      
      res.json({
        status: 'success',
        data: {
          models: stats.models,
          summary: {
            total: stats.totalModels,
            trained: stats.trainedModels,
            averageAccuracy: stats.averageAccuracy,
            lastTraining: stats.lastTraining
          }
        }
      });
    } catch (error) {
      logger?.error('❌ Erro ao listar modelos via API:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro ao listar modelos',
        message: error.message
      });
    }
  });

  /**
   * GET /api/ai/models/:modelId
   * Obtém informações de modelo específico
   */
  router.get('/models/:modelId', (req, res) => {
    try {
      const { modelId } = req.params;
      const stats = aiModule.getModelStatistics();
      const model = stats.models.find(m => m.id === modelId);
      
      if (!model) {
        return res.status(404).json({
          status: 'error',
          error: 'Modelo não encontrado'
        });
      }
      
      res.json({
        status: 'success',
        data: model
      });
    } catch (error) {
      logger?.error('❌ Erro ao obter modelo via API:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro ao obter informações do modelo',
        message: error.message
      });
    }
  });

  /**
   * POST /api/ai/batch/classify
   * Classificação em lote de documentos
   */
  router.post('/batch/classify', upload.array('documents', 10), async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          status: 'error',
          error: 'Arquivos necessários para classificação em lote'
        });
      }
      
      const results = [];
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        
        try {
          const documentData = {
            id: `batch_doc_${Date.now()}_${i}`,
            filename: file.originalname,
            content: file.buffer.toString('utf8'),
            pageCount: 1
          };
          
          const result = await aiModule.classifyDocument(documentData);
          results.push({
            filename: file.originalname,
            result: result,
            status: 'success'
          });
        } catch (error) {
          results.push({
            filename: file.originalname,
            error: error.message,
            status: 'error'
          });
        }
      }
      
      res.json({
        status: 'success',
        data: {
          totalFiles: req.files.length,
          successCount: results.filter(r => r.status === 'success').length,
          errorCount: results.filter(r => r.status === 'error').length,
          results: results
        }
      });
      
      logger?.info(`🤖 Classificação em lote via API: ${req.files.length} arquivos`);
      
    } catch (error) {
      logger?.error('❌ Erro na classificação em lote via API:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro na classificação em lote',
        message: error.message
      });
    }
  });

  /**
   * GET /api/ai/analytics
   * Obtém analytics e métricas do módulo de IA
   */
  router.get('/analytics', (req, res) => {
    try {
      const stats = aiModule.getModelStatistics();
      const info = aiModule.getInfo();
      
      const analytics = {
        performance: {
          totalModels: stats.totalModels,
          trainedModels: stats.trainedModels,
          averageAccuracy: stats.averageAccuracy,
          cacheSize: stats.cacheSize
        },
        usage: {
          initialized: info.initialized,
          settings: info.settings
        },
        models: stats.models.map(model => ({
          id: model.id,
          type: model.type,
          algorithm: model.algorithm,
          accuracy: model.accuracy,
          lastTrained: model.lastTrained
        })),
        timestamp: new Date().toISOString()
      };
      
      res.json({
        status: 'success',
        data: analytics
      });
    } catch (error) {
      logger?.error('❌ Erro ao obter analytics via API:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro ao obter analytics',
        message: error.message
      });
    }
  });

  /**
   * POST /api/ai/retrain/all
   * Retreina todos os modelos
   */
  router.post('/retrain/all', authenticateRequest, async (req, res) => {
    try {
      await aiModule.performAutoRetraining();
      
      const stats = aiModule.getModelStatistics();
      
      res.json({
        status: 'success',
        data: {
          message: 'Retreinamento de todos os modelos iniciado',
          modelsCount: stats.totalModels,
          timestamp: new Date().toISOString()
        }
      });
      
      logger?.info('🤖 Retreinamento de todos os modelos via API');
      
    } catch (error) {
      logger?.error('❌ Erro no retreinamento via API:', error);
      res.status(500).json({
        status: 'error',
        error: 'Erro no retreinamento dos modelos',
        message: error.message
      });
    }
  });

  /**
   * Middleware de tratamento de erros
   */
  router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          status: 'error',
          error: 'Arquivo muito grande (máximo 10MB)'
        });
      }
    }
    
    logger?.error('❌ Erro nas rotas do AI Module:', error);
    res.status(500).json({
      status: 'error',
      error: 'Erro interno do servidor',
      message: error.message
    });
  });

  return router;
};