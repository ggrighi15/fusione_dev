import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { query, param } from 'express-validator';
import ContratoClassificacao from '../models/ContratoClassificacao.js';
import ContratoMacro from '../models/ContratoMacro.js';
import { createLogger } from '../core/logger.js';

const router = express.Router();
const logger = createLogger('Contratos');

/**
 * @route GET /api/contratos/classificacoes
 * @desc Lista classificações de contratos com filtros e paginação
 * @access Private
 */
router.get('/classificacoes',
  authenticateToken,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página deve ser um número inteiro positivo'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite deve ser entre 1 e 100'),
    query('nivel')
      .optional()
      .isIn(['0', '1', 'pai', 'filho'])
      .withMessage('Nível deve ser 0, 1, pai ou filho'),
    query('status')
      .optional()
      .isIn(['ativo', 'inativo'])
      .withMessage('Status deve ser ativo ou inativo'),
    query('search')
      .optional()
      .isString()
      .isLength({ min: 2, max: 100 })
      .withMessage('Busca deve ter entre 2 e 100 caracteres'),
    query('codigoPai')
      .optional()
      .isString()
      .withMessage('Código pai deve ser uma string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const { nivel, status, search, codigoPai } = req.query;
      
      // Construir filtros
      const filter = {};
      
      if (nivel) {
        if (nivel === 'pai' || nivel === '0') {
          filter.nivel = 0;
        } else if (nivel === 'filho' || nivel === '1') {
          filter.nivel = 1;
        }
      }
      
      if (status) {
        filter.status = status;
      }
      
      if (codigoPai) {
        filter.codigoPai = codigoPai;
      }
      
      if (search) {
        filter.$or = [
          { codigo: { $regex: search, $options: 'i' } },
          { rotulo: { $regex: search, $options: 'i' } }
        ];
      }
      
      const skip = (page - 1) * limit;
      
      const [classificacoes, total] = await Promise.all([
        ContratoClassificacao.find(filter)
          .sort({ codigo: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ContratoClassificacao.countDocuments(filter)
      ]);
      
      res.json({
        success: true,
        data: {
          classificacoes,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao listar classificações:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar classificações',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/contratos/classificacoes/:id
 * @desc Obtém detalhes de uma classificação específica
 * @access Private
 */
router.get('/classificacoes/:id',
  authenticateToken,
  [
    param('id')
      .isMongoId()
      .withMessage('ID inválido')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const classificacao = await ContratoClassificacao.findById(id).lean();
      
      if (!classificacao) {
        return res.status(404).json({
          success: false,
          message: 'Classificação não encontrada'
        });
      }
      
      // Buscar filhos se for pai
      let filhos = [];
      if (classificacao.nivel === 0) {
        filhos = await ContratoClassificacao.find({
          codigoPai: classificacao.codigo,
          status: 'ativo'
        }).sort({ codigo: 1 }).lean();
      }
      
      res.json({
        success: true,
        data: {
          ...classificacao,
          filhos
        }
      });
    } catch (error) {
      logger.error('Erro ao obter classificação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter classificação',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/contratos/classificacoes/hierarquia
 * @desc Obtém hierarquia completa de classificações
 * @access Private
 */
router.get('/classificacoes/hierarquia',
  authenticateToken,
  async (req, res) => {
    try {
      const hierarquia = await ContratoClassificacao.obterHierarquia();
      
      res.json({
        success: true,
        data: hierarquia
      });
    } catch (error) {
      logger.error('Erro ao obter hierarquia:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter hierarquia',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/contratos/classificacoes/estatisticas
 * @desc Obtém estatísticas das classificações
 * @access Private
 */
router.get('/classificacoes/estatisticas',
  authenticateToken,
  async (req, res) => {
    try {
      const estatisticas = await ContratoClassificacao.getEstatisticas();
      
      res.json({
        success: true,
        data: estatisticas
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/contratos/macros
 * @desc Lista macros de contratos com filtros e paginação
 * @access Private
 */
router.get('/macros',
  authenticateToken,
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página deve ser um número inteiro positivo'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limite deve ser entre 1 e 100'),
    query('status')
      .optional()
      .isIn(['ativo', 'inativo'])
      .withMessage('Status deve ser ativo ou inativo'),
    query('search')
      .optional()
      .isString()
      .isLength({ min: 2, max: 100 })
      .withMessage('Busca deve ter entre 2 e 100 caracteres'),
    query('minContagem')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Contagem mínima deve ser um número inteiro positivo')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const { status, search, minContagem } = req.query;
      
      // Construir filtros
      const filter = {};
      
      if (status) {
        filter.status = status;
      }
      
      if (search) {
        filter.$or = [
          { codigoMacro: { $regex: search, $options: 'i' } },
          { rotuloMacro: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (minContagem) {
        filter.totalContagem = { $gte: parseInt(minContagem) };
      }
      
      const skip = (page - 1) * limit;
      
      const [macros, total] = await Promise.all([
        ContratoMacro.find(filter)
          .sort({ totalContagem: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ContratoMacro.countDocuments(filter)
      ]);
      
      res.json({
        success: true,
        data: {
          macros,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao listar macros:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar macros',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/contratos/macros/:id
 * @desc Obtém detalhes de uma macro específica
 * @access Private
 */
router.get('/macros/:id',
  authenticateToken,
  [
    param('id')
      .isMongoId()
      .withMessage('ID inválido')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const macro = await ContratoMacro.findById(id).lean();
      
      if (!macro) {
        return res.status(404).json({
          success: false,
          message: 'Macro não encontrada'
        });
      }
      
      // Buscar classificações relacionadas
      const classificacoes = await ContratoClassificacao.find({
        codigoPai: macro.codigoMacro,
        status: 'ativo'
      }).sort({ contagem: -1 }).lean();
      
      res.json({
        success: true,
        data: {
          ...macro,
          classificacoes
        }
      });
    } catch (error) {
      logger.error('Erro ao obter macro:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter macro',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/contratos/macros/resumo
 * @desc Obtém resumo geral das macros
 * @access Private
 */
router.get('/macros/resumo',
  authenticateToken,
  async (req, res) => {
    try {
      const resumo = await ContratoMacro.getResumoGeral();
      
      res.json({
        success: true,
        data: resumo
      });
    } catch (error) {
      logger.error('Erro ao obter resumo de macros:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter resumo de macros',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/contratos/dashboard
 * @desc Obtém dados para dashboard de contratos
 * @access Private
 */
router.get('/dashboard',
  authenticateToken,
  async (req, res) => {
    try {
      const [estatisticasClassificacao, resumoMacros] = await Promise.all([
        ContratoClassificacao.getEstatisticas(),
        ContratoMacro.getResumoGeral()
      ]);
      
      // Top 10 classificações por contagem
      const topClassificacoes = await ContratoClassificacao.find({
        status: 'ativo'
      })
        .sort({ contagem: -1 })
        .limit(10)
        .lean();
      
      // Top 10 macros por contagem
      const topMacros = await ContratoMacro.find({
        status: 'ativo'
      })
        .sort({ totalContagem: -1 })
        .limit(10)
        .lean();
      
      res.json({
        success: true,
        data: {
          estatisticas: {
            classificacoes: estatisticasClassificacao,
            macros: resumoMacros
          },
          rankings: {
            topClassificacoes,
            topMacros
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao obter dados do dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter dados do dashboard',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/contratos/export
 * @desc Exporta dados de contratos em formato CSV
 * @access Private
 */
router.get('/export',
  authenticateToken,
  [
    query('type')
      .isIn(['classificacoes', 'macros'])
      .withMessage('Tipo deve ser classificacoes ou macros'),
    query('format')
      .optional()
      .isIn(['csv', 'json'])
      .withMessage('Formato deve ser csv ou json')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { type, format = 'csv' } = req.query;
      
      let data;
      let filename;
      
      if (type === 'classificacoes') {
        data = await ContratoClassificacao.find({ status: 'ativo' })
          .sort({ codigo: 1 })
          .lean();
        filename = `classificacoes_${new Date().toISOString().split('T')[0]}`;
      } else {
        data = await ContratoMacro.find({ status: 'ativo' })
          .sort({ totalContagem: -1 })
          .lean();
        filename = `macros_${new Date().toISOString().split('T')[0]}`;
      }
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
        res.json(data);
      } else {
        // Converter para CSV
        const csv = convertToCSV(data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
        res.send(csv);
      }
    } catch (error) {
      logger.error('Erro ao exportar dados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao exportar dados',
        error: error.message
      });
    }
  }
);

/**
 * Converte array de objetos para CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }
  
  const headers = Object.keys(data[0]).filter(key => 
    !key.startsWith('_') && key !== '__v' && typeof data[0][key] !== 'object'
  );
  
  const csvHeaders = headers.join(',');
  const csvRows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value || '';
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

export default router;