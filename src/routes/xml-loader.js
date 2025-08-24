import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import FusioneXMLLoader from '../modules/xml-loader-module/index.js';
import { createLogger } from '../core/logger.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validation.js';
import { body, param, query } from 'express-validator';

const router = express.Router();
const logger = createLogger('XMLLoader');
const xmlLoader = new FusioneXMLLoader();

// Configuração do multer para upload de arquivos XML
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'xml');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Mantém nome original com timestamp para evitar conflitos
    const timestamp = Date.now();
    const originalName = file.originalname;
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/xml' || file.originalname.toLowerCase().endsWith('.xml')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos XML são permitidos'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

/**
 * @route POST /api/xml-loader/ingest/file
 * @desc Ingere um arquivo XML específico
 * @access Private (Admin/Operator)
 */
router.post('/ingest/file',
  authenticateToken,
  requireRole(['admin', 'operator']),
  upload.single('xmlFile'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum arquivo XML fornecido'
        });
      }

      const result = await xmlLoader.ingestFile(req.file.path);
      
      // Remove arquivo temporário após processamento
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        message: 'Arquivo XML processado com sucesso',
        data: {
          filename: req.file.originalname,
          ...result
        }
      });
    } catch (error) {
      logger.error('Erro na ingestão de arquivo XML:', error);
      
      // Remove arquivo temporário em caso de erro
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({
        success: false,
        message: 'Erro ao processar arquivo XML',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/xml-loader/ingest/directory
 * @desc Ingere todos os XMLs de um diretório
 * @access Private (Admin)
 */
router.post('/ingest/directory',
  authenticateToken,
  requireRole(['admin']),
  [
    body('directoryPath')
      .notEmpty()
      .withMessage('Caminho do diretório é obrigatório')
      .isString()
      .withMessage('Caminho deve ser uma string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { directoryPath } = req.body;
      
      // Validação de segurança - apenas diretórios permitidos
      const allowedPaths = [
        path.join(process.cwd(), 'data'),
        path.join(process.cwd(), 'uploads'),
        'C:\\XMLs',
        'D:\\XMLs'
      ];
      
      const isAllowed = allowedPaths.some(allowedPath => 
        path.resolve(directoryPath).startsWith(path.resolve(allowedPath))
      );
      
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Diretório não permitido por questões de segurança'
        });
      }

      const result = await xmlLoader.ingestDirectory(directoryPath);

      res.json({
        success: true,
        message: `Ingestão concluída: ${result.files} arquivos processados`,
        data: result
      });
    } catch (error) {
      logger.error('Erro na ingestão de diretório:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao processar diretório',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/xml-loader/ingest/batch
 * @desc Ingere múltiplos arquivos XML
 * @access Private (Admin/Operator)
 */
router.post('/ingest/batch',
  authenticateToken,
  requireRole(['admin', 'operator']),
  upload.array('xmlFiles', 20), // Máximo 20 arquivos
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Nenhum arquivo XML fornecido'
        });
      }

      const results = [];
      const errors = [];

      for (const file of req.files) {
        try {
          const result = await xmlLoader.ingestFile(file.path);
          results.push({
            filename: file.originalname,
            ...result
          });
          
          // Remove arquivo temporário
          fs.unlinkSync(file.path);
        } catch (error) {
          errors.push({
            filename: file.originalname,
            error: error.message
          });
          
          // Remove arquivo temporário em caso de erro
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      res.json({
        success: true,
        message: `Processamento em lote concluído: ${results.length} sucessos, ${errors.length} erros`,
        data: {
          successful: results,
          errors: errors,
          summary: {
            total: req.files.length,
            successful: results.length,
            failed: errors.length
          }
        }
      });
    } catch (error) {
      logger.error('Erro no processamento em lote:', error);
      
      // Limpa arquivos temporários
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Erro no processamento em lote',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/xml-loader/stats
 * @desc Obtém estatísticas de ingestão
 * @access Private (All authenticated users)
 */
router.get('/stats',
  authenticateToken,
  async (req, res) => {
    try {
      const stats = await xmlLoader.getIngestStats();
      
      res.json({
        success: true,
        data: stats
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
 * @route GET /api/xml-loader/files
 * @desc Lista arquivos ingeridos com paginação
 * @access Private (All authenticated users)
 */
router.get('/files',
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
      .isIn(['pending', 'processing', 'completed', 'failed'])
      .withMessage('Status inválido')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const status = req.query.status;
      
      const { IngestFile } = await import('../models/IngestFile.js');
      
      const filter = {};
      if (status) {
        filter.status = status;
      }
      
      const skip = (page - 1) * limit;
      
      const [files, total] = await Promise.all([
        IngestFile.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        IngestFile.countDocuments(filter)
      ]);
      
      res.json({
        success: true,
        data: {
          files,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Erro ao listar arquivos:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar arquivos',
        error: error.message
      });
    }
  }
);

/**
 * @route GET /api/xml-loader/reports
 * @desc Lista definições de relatórios
 * @access Private (All authenticated users)
 */
router.get('/reports',
  authenticateToken,
  [
    query('category')
      .optional()
      .isIn(['contratos', 'financeiro', 'operacional', 'analytics', 'custom'])
      .withMessage('Categoria inválida')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { category } = req.query;
      
      const { ReportDefinition } = await import('../models/ReportDefinition.js');
      
      const filter = { isActive: true };
      if (category) {
        filter.category = category;
      }
      
      const reports = await ReportDefinition.find(filter)
        .sort({ name: 1 })
        .lean();
      
      res.json({
        success: true,
        data: reports
      });
    } catch (error) {
      logger.error('Erro ao listar relatórios:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao listar relatórios',
        error: error.message
      });
    }
  }
);

/**
 * @route DELETE /api/xml-loader/files/:id
 * @desc Remove registro de arquivo ingerido
 * @access Private (Admin)
 */
router.delete('/files/:id',
  authenticateToken,
  requireRole(['admin']),
  [
    param('id')
      .isMongoId()
      .withMessage('ID inválido')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const { IngestFile } = await import('../models/IngestFile.js');
      const file = await IngestFile.findByIdAndDelete(id);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado'
        });
      }
      
      res.json({
        success: true,
        message: 'Arquivo removido com sucesso'
      });
    } catch (error) {
      logger.error('Erro ao remover arquivo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao remover arquivo',
        error: error.message
      });
    }
  }
);

/**
 * @route POST /api/xml-loader/reprocess/:id
 * @desc Reprocessa um arquivo específico
 * @access Private (Admin/Operator)
 */
router.post('/reprocess/:id',
  authenticateToken,
  requireRole(['admin', 'operator']),
  [
    param('id')
      .isMongoId()
      .withMessage('ID inválido')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const { IngestFile } = await import('../models/IngestFile.js');
      const file = await IngestFile.findById(id);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'Arquivo não encontrado'
        });
      }
      
      if (!fs.existsSync(file.filepath)) {
        return res.status(400).json({
          success: false,
          message: 'Arquivo físico não encontrado'
        });
      }
      
      const result = await xmlLoader.ingestFile(file.filepath);
      
      res.json({
        success: true,
        message: 'Arquivo reprocessado com sucesso',
        data: result
      });
    } catch (error) {
      logger.error('Erro ao reprocessar arquivo:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao reprocessar arquivo',
        error: error.message
      });
    }
  }
);

export default router;