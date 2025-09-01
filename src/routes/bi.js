import express from 'express';
import { authenticateToken, requireAdmin, requireOperator } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { body, param, query } from 'express-validator';

const router = express.Router();

// Middleware para verificar se o módulo BI está carregado
const requireBIModule = (req, res, next) => {
  if (!req.biModule) {
    return res.status(503).json({
      success: false,
      error: 'Módulo de Business Intelligence não está disponível'
    });
  }
  next();
};

// Aplicar middleware de autenticação e BI em todas as rotas
router.use(authenticateToken);
router.use(requireBIModule);

// GET /api/bi/dashboards - Listar dashboards
router.get('/dashboards', 
  requireOperator,
  async (req, res) => {
    try {
      const { category, user_id } = req.query;
      const dashboards = await req.biModule.getDashboards({ category, userId: user_id });
      
      res.json({
        success: true,
        data: dashboards,
        total: dashboards.length
      });
    } catch (error) {
      console.error('Erro ao listar dashboards:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /api/bi/dashboards - Criar dashboard
router.post('/dashboards',
  requireOperator,
  [
    body('name').notEmpty().withMessage('Nome é obrigatório'),
    body('type').isIn(['executive', 'legal', 'financial', 'operational', 'custom']).withMessage('Tipo inválido'),
    body('description').optional().isString(),
    body('widgets').optional().isArray()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { name, type, description, widgets } = req.body;
      const userId = req.user.id;
      
      const dashboard = await req.biModule.createDashboard({
        name,
        type,
        description,
        widgets: widgets || [],
        userId,
        createdBy: req.user.name
      });
      
      res.status(201).json({
        success: true,
        data: dashboard,
        message: 'Dashboard criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/bi/dashboards/:id - Obter dashboard específico
router.get('/dashboards/:id',
  requireOperator,
  [
    param('id').isUUID().withMessage('ID inválido')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { include_data = 'true' } = req.query;
      
      const dashboard = await req.biModule.getDashboard(id, {
        includeData: include_data === 'true',
        userId: req.user.id
      });
      
      if (!dashboard) {
        return res.status(404).json({
          success: false,
          error: 'Dashboard não encontrado'
        });
      }
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Erro ao obter dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// PUT /api/bi/dashboards/:id - Atualizar dashboard
router.put('/dashboards/:id',
  requireOperator,
  [
    param('id').isUUID().withMessage('ID inválido'),
    body('name').optional().notEmpty().withMessage('Nome não pode estar vazio'),
    body('description').optional().isString(),
    body('widgets').optional().isArray()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const dashboard = await req.biModule.updateDashboard(id, {
        ...updates,
        updatedBy: req.user.name,
        userId: req.user.id
      });
      
      if (!dashboard) {
        return res.status(404).json({
          success: false,
          error: 'Dashboard não encontrado'
        });
      }
      
      res.json({
        success: true,
        data: dashboard,
        message: 'Dashboard atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// DELETE /api/bi/dashboards/:id - Excluir dashboard
router.delete('/dashboards/:id',
  requireAdmin,
  [
    param('id').isUUID().withMessage('ID inválido')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const success = await req.biModule.deleteDashboard(id, req.user.id);
      
      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Dashboard não encontrado'
        });
      }
      
      res.json({
        success: true,
        message: 'Dashboard excluído com sucesso'
      });
    } catch (error) {
      console.error('Erro ao excluir dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/bi/dashboards/:id/data - Obter dados do dashboard
router.get('/dashboards/:id/data',
  requireOperator,
  [
    param('id').isUUID().withMessage('ID inválido')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { refresh = 'false', filters } = req.query;
      
      const data = await req.biModule.getDashboardData(id, {
        refresh: refresh === 'true',
        filters: filters ? JSON.parse(filters) : {},
        userId: req.user.id
      });
      
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao obter dados do dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /api/bi/dashboards/:id/export - Exportar dashboard
router.post('/dashboards/:id/export',
  requireOperator,
  [
    param('id').isUUID().withMessage('ID inválido'),
    body('format').isIn(['pdf', 'excel', 'png', 'svg']).withMessage('Formato inválido'),
    body('options').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { format, options = {} } = req.body;
      
      const exportResult = await req.biModule.exportDashboard(id, {
        format,
        options,
        userId: req.user.id
      });
      
      res.json({
        success: true,
        data: exportResult,
        message: 'Exportação iniciada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao exportar dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/bi/kpis - Listar KPIs disponíveis
router.get('/kpis',
  requireOperator,
  async (req, res) => {
    try {
      const { category } = req.query;
      const kpis = await req.biModule.getAvailableKPIs({ category });
      
      res.json({
        success: true,
        data: kpis
      });
    } catch (error) {
      console.error('Erro ao listar KPIs:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /api/bi/kpis/calculate - Calcular KPIs
router.post('/kpis/calculate',
  requireOperator,
  [
    body('kpis').isArray().withMessage('KPIs deve ser um array'),
    body('filters').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { kpis, filters = {} } = req.body;
      
      const results = await req.biModule.calculateKPIs(kpis, {
        filters,
        userId: req.user.id
      });
      
      res.json({
        success: true,
        data: results,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao calcular KPIs:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/bi/widgets/types - Listar tipos de widgets
router.get('/widgets/types',
  requireOperator,
  async (req, res) => {
    try {
      const widgetTypes = await req.biModule.getWidgetTypes();
      
      res.json({
        success: true,
        data: widgetTypes
      });
    } catch (error) {
      console.error('Erro ao listar tipos de widgets:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/bi/connectors - Listar conectores de dados
router.get('/connectors',
  requireAdmin,
  async (req, res) => {
    try {
      const connectors = await req.biModule.getDataConnectors();
      
      res.json({
        success: true,
        data: connectors
      });
    } catch (error) {
      console.error('Erro ao listar conectores:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/bi/stats - Estatísticas do módulo
router.get('/stats',
  requireOperator,
  async (req, res) => {
    try {
      const stats = await req.biModule.getModuleStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /api/bi/alerts/configure - Configurar alertas
router.post('/alerts/configure',
  requireOperator,
  [
    body('kpi').notEmpty().withMessage('KPI é obrigatório'),
    body('threshold').isNumeric().withMessage('Threshold deve ser numérico'),
    body('condition').isIn(['>', '<', '>=', '<=', '==', '!=']).withMessage('Condição inválida'),
    body('severity').optional().isIn(['info', 'warning', 'critical']).withMessage('Severidade inválida')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { kpi, threshold, condition, severity = 'warning', description } = req.body;
      
      const alert = await req.biModule.configureAlert({
        kpi,
        threshold,
        condition,
        severity,
        description,
        userId: req.user.id,
        createdBy: req.user.name
      });
      
      res.status(201).json({
        success: true,
        data: alert,
        message: 'Alerta configurado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao configurar alerta:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/bi/alerts - Listar alertas
router.get('/alerts',
  requireOperator,
  async (req, res) => {
    try {
      const { status, severity } = req.query;
      const alerts = await req.biModule.getAlerts({ status, severity, userId: req.user.id });
      
      res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('Erro ao listar alertas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// POST /api/bi/data/refresh - Forçar atualização de dados
router.post('/data/refresh',
  requireAdmin,
  [
    body('connectors').optional().isArray().withMessage('Conectores deve ser um array')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { connectors } = req.body;
      
      const result = await req.biModule.refreshData({ connectors });
      
      res.json({
        success: true,
        data: result,
        message: 'Atualização de dados iniciada'
      });
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
);

// GET /api/bi/health - Health check do módulo
router.get('/health', async (req, res) => {
  try {
    const health = await req.biModule.getHealthStatus();
    
    res.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro no health check:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

export default router;