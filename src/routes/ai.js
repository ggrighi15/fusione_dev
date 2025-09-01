/**
 * Rotas da API para o Módulo de IA
 * Endpoints para análise preditiva e classificação automática de documentos
 */

import express from 'express';
import multer from 'multer';
import { createLogger } from '../core/logger.js';

const router = express.Router();
const logger = createLogger('AI-API');

// Configuração do multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/json'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'), false);
    }
  }
});

// Middleware para obter instância do módulo de IA
const getAIModule = (req, res, next) => {
  const moduleManager = req.app.get('moduleManager');
  if (!moduleManager) {
    return res.apiError('Module Manager não disponível', 503);
  }
  
  const aiModule = moduleManager.getModule('ai-module');
  if (!aiModule) {
    return res.apiError('Módulo de IA não está carregado', 503);
  }
  
  req.aiModule = aiModule;
  next();
};

// Middleware de autenticação (se necessário)
const requireAuth = (req, res, next) => {
  const authManager = req.app.get('authManager');
  if (authManager && authManager.isEnabled()) {
    return authManager.authenticate(req, res, next);
  }
  next();
};

// Aplicar middlewares
router.use(getAIModule);
router.use(requireAuth);

// Middleware para logging
router.use((req, res, next) => {
  logger.debug(`AI API Request: ${req.method} ${req.path}`, {
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

// === ROTAS DE STATUS E INFORMAÇÕES ===

// GET /api/ai/status - Status do módulo de IA
router.get('/status', async (req, res) => {
  try {
    const status = await req.aiModule.getStatus();
    res.apiResponse(status, 'Status do módulo de IA obtido com sucesso');
  } catch (error) {
    logger.error('Erro ao obter status do módulo de IA:', error);
    res.apiError('Erro ao obter status', 500, error.message);
  }
});

// GET /api/ai/models - Lista de modelos disponíveis
router.get('/models', async (req, res) => {
  try {
    const models = await req.aiModule.getAvailableModels();
    res.apiResponse(models, 'Lista de modelos obtida com sucesso');
  } catch (error) {
    logger.error('Erro ao obter lista de modelos:', error);
    res.apiError('Erro ao obter modelos', 500, error.message);
  }
});

// GET /api/ai/models/:modelId - Informações de um modelo específico
router.get('/models/:modelId', async (req, res) => {
  try {
    const { modelId } = req.params;
    const modelInfo = await req.aiModule.getModelInfo(modelId);
    
    if (!modelInfo) {
      return res.apiError(`Modelo '${modelId}' não encontrado`, 404);
    }
    
    res.apiResponse(modelInfo, `Informações do modelo '${modelId}' obtidas com sucesso`);
  } catch (error) {
    logger.error(`Erro ao obter informações do modelo ${req.params.modelId}:`, error);
    res.apiError('Erro ao obter informações do modelo', 500, error.message);
  }
});

// === ROTAS DE CLASSIFICAÇÃO DE DOCUMENTOS ===

// POST /api/ai/classify - Classificar documento
router.post('/classify', upload.single('document'), async (req, res) => {
  try {
    if (!req.file && !req.body.text) {
      return res.apiError('Documento ou texto é obrigatório', 400);
    }
    
    let documentData;
    if (req.file) {
      documentData = {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname
      };
    } else {
      documentData = {
        text: req.body.text,
        metadata: req.body.metadata || {}
      };
    }
    
    const classification = await req.aiModule.classifyDocument(documentData);
    res.apiResponse(classification, 'Documento classificado com sucesso');
    
  } catch (error) {
    logger.error('Erro ao classificar documento:', error);
    res.apiError('Erro ao classificar documento', 500, error.message);
  }
});

// POST /api/ai/classify/batch - Classificação em lote
router.post('/classify/batch', upload.array('documents', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.apiError('Pelo menos um documento é obrigatório', 400);
    }
    
    const documents = req.files.map(file => ({
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname
    }));
    
    const classifications = await req.aiModule.classifyDocumentsBatch(documents);
    res.apiResponse(classifications, `${documents.length} documentos classificados com sucesso`);
    
  } catch (error) {
    logger.error('Erro ao classificar documentos em lote:', error);
    res.apiError('Erro ao classificar documentos', 500, error.message);
  }
});

// === ROTAS DE ANÁLISE PREDITIVA ===

// POST /api/ai/predict/outcome - Prever resultado de processo
router.post('/predict/outcome', async (req, res) => {
  try {
    const { processData } = req.body;
    
    if (!processData) {
      return res.apiError('Dados do processo são obrigatórios', 400);
    }
    
    const prediction = await req.aiModule.predictProcessOutcome(processData);
    res.apiResponse(prediction, 'Predição de resultado realizada com sucesso');
    
  } catch (error) {
    logger.error('Erro ao prever resultado do processo:', error);
    res.apiError('Erro ao prever resultado', 500, error.message);
  }
});

// POST /api/ai/predict/time - Estimar tempo de processo
router.post('/predict/time', async (req, res) => {
  try {
    const { processData } = req.body;
    
    if (!processData) {
      return res.apiError('Dados do processo são obrigatórios', 400);
    }
    
    const timeEstimate = await req.aiModule.estimateProcessTime(processData);
    res.apiResponse(timeEstimate, 'Estimativa de tempo realizada com sucesso');
    
  } catch (error) {
    logger.error('Erro ao estimar tempo do processo:', error);
    res.apiError('Erro ao estimar tempo', 500, error.message);
  }
});

// POST /api/ai/predict/risk - Avaliar risco de processo
router.post('/predict/risk', async (req, res) => {
  try {
    const { processData } = req.body;
    
    if (!processData) {
      return res.apiError('Dados do processo são obrigatórios', 400);
    }
    
    const riskAssessment = await req.aiModule.assessProcessRisk(processData);
    res.apiResponse(riskAssessment, 'Avaliação de risco realizada com sucesso');
    
  } catch (error) {
    logger.error('Erro ao avaliar risco do processo:', error);
    res.apiError('Erro ao avaliar risco', 500, error.message);
  }
});

// POST /api/ai/analyze - Análise completa (classificação + predição)
router.post('/analyze', upload.single('document'), async (req, res) => {
  try {
    const { processData } = req.body;
    
    if (!req.file && !processData) {
      return res.apiError('Documento ou dados do processo são obrigatórios', 400);
    }
    
    let analysis = {};
    
    // Classificar documento se fornecido
    if (req.file) {
      const documentData = {
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        originalname: req.file.originalname
      };
      analysis.classification = await req.aiModule.classifyDocument(documentData);
    }
    
    // Análise preditiva se dados do processo fornecidos
    if (processData) {
      const [outcome, time, risk] = await Promise.all([
        req.aiModule.predictProcessOutcome(processData),
        req.aiModule.estimateProcessTime(processData),
        req.aiModule.assessProcessRisk(processData)
      ]);
      
      analysis.prediction = {
        outcome,
        time,
        risk
      };
    }
    
    res.apiResponse(analysis, 'Análise completa realizada com sucesso');
    
  } catch (error) {
    logger.error('Erro ao realizar análise completa:', error);
    res.apiError('Erro ao realizar análise', 500, error.message);
  }
});

// === ROTAS DE TREINAMENTO ===

// POST /api/ai/train/:modelType - Treinar modelo específico
router.post('/train/:modelType', async (req, res) => {
  try {
    const { modelType } = req.params;
    const { trainingData, options } = req.body;
    
    if (!trainingData) {
      return res.apiError('Dados de treinamento são obrigatórios', 400);
    }
    
    const result = await req.aiModule.trainModel(modelType, trainingData, options);
    res.apiResponse(result, `Treinamento do modelo '${modelType}' iniciado com sucesso`);
    
  } catch (error) {
    logger.error(`Erro ao treinar modelo ${req.params.modelType}:`, error);
    res.apiError('Erro ao treinar modelo', 500, error.message);
  }
});

// POST /api/ai/retrain - Retreinar todos os modelos
router.post('/retrain', async (req, res) => {
  try {
    const { force } = req.body;
    const result = await req.aiModule.retrainModels(force);
    res.apiResponse(result, 'Retreinamento de modelos iniciado com sucesso');
    
  } catch (error) {
    logger.error('Erro ao retreinar modelos:', error);
    res.apiError('Erro ao retreinar modelos', 500, error.message);
  }
});

// === ROTAS DE MÉTRICAS E ANÁLISES ===

// GET /api/ai/metrics - Métricas de performance dos modelos
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await req.aiModule.getMetrics();
    res.apiResponse(metrics, 'Métricas obtidas com sucesso');
  } catch (error) {
    logger.error('Erro ao obter métricas:', error);
    res.apiError('Erro ao obter métricas', 500, error.message);
  }
});

// GET /api/ai/analytics - Análises e estatísticas
router.get('/analytics', async (req, res) => {
  try {
    const { period, type } = req.query;
    const analytics = await req.aiModule.getAnalytics(period, type);
    res.apiResponse(analytics, 'Análises obtidas com sucesso');
  } catch (error) {
    logger.error('Erro ao obter análises:', error);
    res.apiError('Erro ao obter análises', 500, error.message);
  }
});

// === TRATAMENTO DE ERROS ===

// Middleware de tratamento de erros do multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.apiError('Arquivo muito grande. Tamanho máximo: 10MB', 400);
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.apiError('Muitos arquivos. Máximo: 5 arquivos', 400);
    }
    return res.apiError('Erro no upload do arquivo', 400, error.message);
  }
  
  if (error.message === 'Tipo de arquivo não suportado') {
    return res.apiError('Tipo de arquivo não suportado', 400);
  }
  
  logger.error('Erro na API de IA:', error);
  res.apiError('Erro interno do servidor', 500, error.message);
});

export default router;