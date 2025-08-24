import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Importar modelos
import UserData from '../models/UserData.js';
import UserConfig from '../models/UserConfig.js';
import DataTemplate from '../models/DataTemplate.js';

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'data');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.json', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'));
    }
  }
});

// Middleware de autenticação (simulado)
const authenticate = (req, res, next) => {
  // Em um sistema real, verificaria o token JWT
  req.userId = req.headers['user-id'] || 'default-user';
  next();
};

// Aplicar autenticação a todas as rotas
router.use(authenticate);

// GET /api/data - Listar todos os dados do usuário
router.get('/', async (req, res) => {
  try {
    const { dataType, tags, limit = 50, page = 1 } = req.query;
    const options = { limit: parseInt(limit) };
    
    if (dataType) options.dataType = dataType;
    if (tags) options.tags = tags.split(',');
    
    const data = await UserData.findByUserId(req.userId, options)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await UserData.countDocuments({ 
      userId: req.userId, 
      isActive: true,
      ...(dataType && { dataType }),
      ...(tags && { tags: { $in: tags.split(',') } })
    });
    
    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/data/:id - Obter dados específicos
router.get('/:id', async (req, res) => {
  try {
    const data = await UserData.findOne({
      _id: req.params.id,
      userId: req.userId,
      isActive: true
    });
    
    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Dados não encontrados'
      });
    }
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/data/import - Importar dados CSV
router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo enviado'
      });
    }
    
    const { name, description, tags, templateId } = req.body;
    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    let data = [];
    let columns = [];
    
    if (ext === '.csv') {
      // Processar CSV
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('headers', (headers) => {
            columns = headers;
          })
          .on('data', (row) => {
            data.push(row);
          })
          .on('end', resolve)
          .on('error', reject);
      });
    } else if (ext === '.json') {
      // Processar JSON
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(jsonData)) {
        data = jsonData;
        if (data.length > 0) {
          columns = Object.keys(data[0]);
        }
      } else {
        data = [jsonData];
        columns = Object.keys(jsonData);
      }
    }
    
    // Validar dados com template se fornecido
    if (templateId) {
      const template = await DataTemplate.findOne({
        _id: templateId,
        userId: req.userId,
        isActive: true
      });
      
      if (template) {
        const validationResults = data.map(row => template.validateData(row));
        const hasErrors = validationResults.some(result => !result.isValid);
        
        if (hasErrors) {
          // Limpar arquivo temporário
          fs.unlinkSync(filePath);
          
          return res.status(400).json({
            success: false,
            error: 'Dados não passaram na validação do template',
            validationErrors: validationResults.filter(r => !r.isValid)
          });
        }
        
        // Incrementar uso do template
        await template.incrementUsage();
      }
    }
    
    // Salvar dados no banco
    const userData = new UserData({
      userId: req.userId,
      dataType: 'imported',
      name: name || req.file.originalname,
      description,
      data,
      metadata: {
        source: 'file_upload',
        originalFileName: req.file.originalname,
        fileSize: req.file.size,
        recordCount: data.length,
        columns,
        importDate: new Date()
      },
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    });
    
    await userData.save();
    
    // Limpar arquivo temporário
    fs.unlinkSync(filePath);
    
    res.json({
      success: true,
      message: 'Dados importados com sucesso',
      data: {
        id: userData._id,
        recordCount: data.length,
        columns
      }
    });
    
  } catch (error) {
    // Limpar arquivo temporário em caso de erro
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/data/export/:id? - Exportar dados
router.get('/export/:id?', async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    let data;
    
    if (req.params.id) {
      // Exportar dados específicos
      const userData = await UserData.findOne({
        _id: req.params.id,
        userId: req.userId,
        isActive: true
      });
      
      if (!userData) {
        return res.status(404).json({
          success: false,
          error: 'Dados não encontrados'
        });
      }
      
      data = userData.data;
    } else {
      // Exportar todos os dados
      const allData = await UserData.find({
        userId: req.userId,
        isActive: true
      }).lean();
      
      data = allData.map(item => ({
        id: item._id,
        name: item.name,
        dataType: item.dataType,
        data: item.data,
        metadata: item.metadata,
        createdAt: item.createdAt
      }));
    }
    
    if (format === 'csv' && Array.isArray(data) && data.length > 0) {
      // Exportar como CSV
      const fields = Object.keys(data[0]);
      const csv = [fields.join(',')];
      
      data.forEach(row => {
        const values = fields.map(field => {
          const value = row[field];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        });
        csv.push(values.join(','));
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=export.csv');
      res.send(csv.join('\n'));
    } else {
      // Exportar como JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=export.json');
      res.json(data);
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/data/backup - Criar backup manual
router.post('/backup', async (req, res) => {
  try {
    const allData = await UserData.find({
      userId: req.userId,
      isActive: true
    }).lean();
    
    const backupData = {
      userId: req.userId,
      timestamp: new Date(),
      dataCount: allData.length,
      data: allData
    };
    
    // Salvar backup (em um sistema real, salvaria em storage externo)
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `backup-${req.userId}-${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    
    // Atualizar contadores de backup
    await UserData.updateMany(
      { userId: req.userId, isActive: true },
      { $inc: { 'backup.backupCount': 1 }, $set: { 'backup.lastBackup': new Date() } }
    );
    
    res.json({
      success: true,
      message: 'Backup criado com sucesso',
      backup: {
        file: path.basename(backupFile),
        dataCount: allData.length,
        timestamp: backupData.timestamp
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/data/statistics - Obter estatísticas dos dados
router.get('/statistics', async (req, res) => {
  try {
    const stats = await UserData.getStatistics(req.userId);
    const totalRecords = await UserData.countDocuments({
      userId: req.userId,
      isActive: true
    });
    
    res.json({
      success: true,
      statistics: {
        totalRecords,
        byType: stats,
        lastImport: await UserData.findOne(
          { userId: req.userId, isActive: true },
          {},
          { sort: { 'metadata.importDate': -1 } }
        ).select('metadata.importDate name')
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/data/:id - Excluir dados
router.delete('/:id', async (req, res) => {
  try {
    const result = await UserData.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId,
        isActive: true
      },
      { isActive: false },
      { new: true }
    );
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Dados não encontrados'
      });
    }
    
    res.json({
      success: true,
      message: 'Dados excluídos com sucesso'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;