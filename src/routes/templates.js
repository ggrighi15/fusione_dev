import express from 'express';
import DataTemplate from '../models/DataTemplate.js';
import UserData from '../models/UserData.js';

const router = express.Router();

// Middleware de autenticação (simulado)
const authenticate = (req, res, next) => {
  req.userId = req.headers['user-id'] || 'default-user';
  next();
};

// Aplicar autenticação a todas as rotas
router.use(authenticate);

// GET /api/templates - Listar templates do usuário
router.get('/', async (req, res) => {
  try {
    const { category, limit = 50, page = 1, includePublic = false } = req.query;
    const options = { limit: parseInt(limit) };
    
    if (category) options.category = category;
    
    let templates;
    if (includePublic === 'true') {
      // Buscar templates do usuário e públicos
      const userTemplates = await DataTemplate.findByUserId(req.userId, options);
      const publicTemplates = await DataTemplate.findPublicTemplates(options);
      
      // Combinar e remover duplicatas
      const allTemplates = [...userTemplates, ...publicTemplates];
      const uniqueTemplates = allTemplates.filter((template, index, self) => 
        index === self.findIndex(t => t._id.toString() === template._id.toString())
      );
      
      templates = uniqueTemplates.slice((page - 1) * options.limit, page * options.limit);
    } else {
      templates = await DataTemplate.findByUserId(req.userId, options)
        .skip((page - 1) * options.limit);
    }
    
    const total = await DataTemplate.countDocuments({
      userId: req.userId,
      isActive: true,
      ...(category && { category })
    });
    
    res.json({
      success: true,
      templates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / options.limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/templates/categories - Listar categorias disponíveis
router.get('/categories', async (req, res) => {
  try {
    const userCategories = await DataTemplate.getCategories(req.userId);
    const allCategories = ['financial', 'inventory', 'customer', 'sales', 'analytics', 'custom'];
    
    res.json({
      success: true,
      categories: {
        user: userCategories,
        available: allCategories
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/templates/popular - Listar templates populares
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const popularTemplates = await DataTemplate.getPopularTemplates(parseInt(limit));
    
    res.json({
      success: true,
      templates: popularTemplates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/templates/:id - Obter template específico
router.get('/:id', async (req, res) => {
  try {
    const template = await DataTemplate.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.userId },
        { isPublic: true }
      ],
      isActive: true
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    res.json({
      success: true,
      template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/templates - Criar novo template
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      fields,
      relationships,
      validation,
      formatting,
      isPublic = false
    } = req.body;
    
    // Verificar se já existe um template com o mesmo nome
    const existingTemplate = await DataTemplate.findByName(req.userId, name);
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        error: 'Já existe um template com este nome'
      });
    }
    
    // Validar campos obrigatórios
    if (!name || !category || !fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nome, categoria e campos são obrigatórios'
      });
    }
    
    // Validar estrutura dos campos
    for (const field of fields) {
      if (!field.name || !field.type) {
        return res.status(400).json({
          success: false,
          error: 'Cada campo deve ter nome e tipo'
        });
      }
    }
    
    const template = new DataTemplate({
      userId: req.userId,
      name,
      description,
      category,
      fields: fields.map((field, index) => ({
        ...field,
        order: field.order !== undefined ? field.order : index
      })),
      relationships: relationships || [],
      validation: validation || { rules: [] },
      formatting: formatting || {},
      isPublic
    });
    
    await template.save();
    
    res.status(201).json({
      success: true,
      message: 'Template criado com sucesso',
      template
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PUT /api/templates/:id - Atualizar template
router.put('/:id', async (req, res) => {
  try {
    const template = await DataTemplate.findOne({
      _id: req.params.id,
      userId: req.userId,
      isActive: true
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    const {
      name,
      description,
      category,
      fields,
      relationships,
      validation,
      formatting,
      isPublic
    } = req.body;
    
    // Verificar se o novo nome já existe (se foi alterado)
    if (name && name !== template.name) {
      const existingTemplate = await DataTemplate.findByName(req.userId, name);
      if (existingTemplate) {
        return res.status(400).json({
          success: false,
          error: 'Já existe um template com este nome'
        });
      }
    }
    
    // Atualizar campos
    if (name) template.name = name;
    if (description !== undefined) template.description = description;
    if (category) template.category = category;
    if (fields) {
      template.fields = fields.map((field, index) => ({
        ...field,
        order: field.order !== undefined ? field.order : index
      }));
    }
    if (relationships) template.relationships = relationships;
    if (validation) template.validation = validation;
    if (formatting) template.formatting = formatting;
    if (isPublic !== undefined) template.isPublic = isPublic;
    
    await template.updateVersion();
    
    res.json({
      success: true,
      message: 'Template atualizado com sucesso',
      template
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/templates/:id/fields - Adicionar campo ao template
router.post('/:id/fields', async (req, res) => {
  try {
    const template = await DataTemplate.findOne({
      _id: req.params.id,
      userId: req.userId,
      isActive: true
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    const fieldConfig = req.body;
    
    if (!fieldConfig.name || !fieldConfig.type) {
      return res.status(400).json({
        success: false,
        error: 'Nome e tipo do campo são obrigatórios'
      });
    }
    
    // Verificar se o campo já existe
    if (template.fields.some(field => field.name === fieldConfig.name)) {
      return res.status(400).json({
        success: false,
        error: 'Campo com este nome já existe'
      });
    }
    
    await template.addField(fieldConfig);
    await template.updateVersion();
    
    res.json({
      success: true,
      message: 'Campo adicionado com sucesso',
      template
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/templates/:id/fields/:fieldName - Remover campo do template
router.delete('/:id/fields/:fieldName', async (req, res) => {
  try {
    const template = await DataTemplate.findOne({
      _id: req.params.id,
      userId: req.userId,
      isActive: true
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    await template.removeField(req.params.fieldName);
    await template.updateVersion();
    
    res.json({
      success: true,
      message: 'Campo removido com sucesso',
      template
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/templates/:id/validate - Validar dados contra template
router.post('/:id/validate', async (req, res) => {
  try {
    const template = await DataTemplate.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.userId },
        { isPublic: true }
      ],
      isActive: true
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Dados para validação são obrigatórios'
      });
    }
    
    let validationResults;
    
    if (Array.isArray(data)) {
      // Validar array de dados
      validationResults = data.map((item, index) => ({
        index,
        ...template.validateData(item)
      }));
    } else {
      // Validar item único
      validationResults = template.validateData(data);
    }
    
    res.json({
      success: true,
      validation: validationResults
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/templates/:id/clone - Clonar template
router.post('/:id/clone', async (req, res) => {
  try {
    const originalTemplate = await DataTemplate.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.userId },
        { isPublic: true }
      ],
      isActive: true
    });
    
    if (!originalTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    const { name } = req.body;
    const newName = name || `${originalTemplate.name} (Cópia)`;
    
    // Verificar se já existe um template com o novo nome
    const existingTemplate = await DataTemplate.findByName(req.userId, newName);
    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        error: 'Já existe um template com este nome'
      });
    }
    
    const clonedTemplate = new DataTemplate({
      userId: req.userId,
      name: newName,
      description: originalTemplate.description,
      category: originalTemplate.category,
      fields: originalTemplate.fields,
      relationships: originalTemplate.relationships,
      validation: originalTemplate.validation,
      formatting: originalTemplate.formatting,
      isPublic: false // Clones são sempre privados inicialmente
    });
    
    await clonedTemplate.save();
    
    res.status(201).json({
      success: true,
      message: 'Template clonado com sucesso',
      template: clonedTemplate
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/templates/:id/usage - Obter estatísticas de uso do template
router.get('/:id/usage', async (req, res) => {
  try {
    const template = await DataTemplate.findOne({
      _id: req.params.id,
      userId: req.userId,
      isActive: true
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    // Buscar dados que usam este template
    const dataUsingTemplate = await UserData.find({
      userId: req.userId,
      'metadata.templateId': req.params.id,
      isActive: true
    }).select('name createdAt metadata.recordCount');
    
    res.json({
      success: true,
      usage: {
        timesUsed: template.usage.timesUsed,
        lastUsed: template.usage.lastUsed,
        recordCount: template.usage.recordCount,
        dataInstances: dataUsingTemplate
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DELETE /api/templates/:id - Excluir template
router.delete('/:id', async (req, res) => {
  try {
    const template = await DataTemplate.findOne({
      _id: req.params.id,
      userId: req.userId,
      isActive: true
    });
    
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template não encontrado'
      });
    }
    
    // Verificar se existem dados usando este template
    const dataUsingTemplate = await UserData.countDocuments({
      userId: req.userId,
      'metadata.templateId': req.params.id,
      isActive: true
    });
    
    if (dataUsingTemplate > 0) {
      return res.status(400).json({
        success: false,
        error: `Não é possível excluir o template. Existem ${dataUsingTemplate} conjunto(s) de dados usando este template.`
      });
    }
    
    template.isActive = false;
    await template.save();
    
    res.json({
      success: true,
      message: 'Template excluído com sucesso'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;