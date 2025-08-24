import mongoose from 'mongoose';

// Schema para templates de dados personalizados
const DataTemplateSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['financial', 'inventory', 'customer', 'sales', 'analytics', 'custom']
  },
  fields: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      required: true,
      enum: ['string', 'number', 'date', 'boolean', 'email', 'url', 'phone', 'currency', 'percentage']
    },
    required: {
      type: Boolean,
      default: false
    },
    unique: {
      type: Boolean,
      default: false
    },
    defaultValue: mongoose.Schema.Types.Mixed,
    validation: {
      min: Number,
      max: Number,
      minLength: Number,
      maxLength: Number,
      pattern: String,
      enum: [String]
    },
    format: {
      dateFormat: String,
      currencyCode: String,
      decimalPlaces: Number
    },
    description: String,
    order: {
      type: Number,
      default: 0
    }
  }],
  relationships: [{
    field: String,
    relatedTemplate: String,
    relatedField: String,
    type: {
      type: String,
      enum: ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany']
    }
  }],
  validation: {
    rules: [{
      field: String,
      condition: String,
      value: mongoose.Schema.Types.Mixed,
      message: String
    }],
    customValidation: String // JavaScript code for custom validation
  },
  formatting: {
    displayFields: [String], // Campos a serem exibidos por padrão
    sortBy: {
      field: String,
      order: {
        type: String,
        enum: ['asc', 'desc'],
        default: 'asc'
      }
    },
    groupBy: String,
    filters: [{
      field: String,
      type: {
        type: String,
        enum: ['text', 'select', 'date', 'number', 'boolean']
      },
      options: [String]
    }]
  },
  permissions: {
    read: [String],
    write: [String],
    delete: [String]
  },
  usage: {
    timesUsed: {
      type: Number,
      default: 0
    },
    lastUsed: Date,
    recordCount: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  collection: 'data_templates'
});

// Índices
DataTemplateSchema.index({ userId: 1, name: 1 }, { unique: true });
DataTemplateSchema.index({ category: 1 });
DataTemplateSchema.index({ isPublic: 1 });
DataTemplateSchema.index({ 'usage.timesUsed': -1 });
DataTemplateSchema.index({ createdAt: -1 });

// Métodos do schema
DataTemplateSchema.methods.addField = function(fieldConfig) {
  // Define ordem automática se não especificada
  if (!fieldConfig.order) {
    fieldConfig.order = this.fields.length;
  }
  this.fields.push(fieldConfig);
  return this.save();
};

DataTemplateSchema.methods.removeField = function(fieldName) {
  this.fields = this.fields.filter(field => field.name !== fieldName);
  return this.save();
};

DataTemplateSchema.methods.updateField = function(fieldName, updates) {
  const field = this.fields.find(f => f.name === fieldName);
  if (field) {
    Object.assign(field, updates);
    return this.save();
  }
  throw new Error(`Campo '${fieldName}' não encontrado`);
};

DataTemplateSchema.methods.validateData = function(data) {
  const errors = [];
  
  // Validação básica dos campos
  this.fields.forEach(field => {
    const value = data[field.name];
    
    // Campo obrigatório
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Campo '${field.name}' é obrigatório`);
      return;
    }
    
    if (value !== undefined && value !== null && value !== '') {
      // Validação de tipo
      if (field.type === 'number' && isNaN(value)) {
        errors.push(`Campo '${field.name}' deve ser um número`);
      }
      
      // Validação de comprimento
      if (field.validation) {
        if (field.validation.minLength && value.toString().length < field.validation.minLength) {
          errors.push(`Campo '${field.name}' deve ter pelo menos ${field.validation.minLength} caracteres`);
        }
        if (field.validation.maxLength && value.toString().length > field.validation.maxLength) {
          errors.push(`Campo '${field.name}' deve ter no máximo ${field.validation.maxLength} caracteres`);
        }
        if (field.validation.min && Number(value) < field.validation.min) {
          errors.push(`Campo '${field.name}' deve ser maior ou igual a ${field.validation.min}`);
        }
        if (field.validation.max && Number(value) > field.validation.max) {
          errors.push(`Campo '${field.name}' deve ser menor ou igual a ${field.validation.max}`);
        }
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

DataTemplateSchema.methods.incrementUsage = function() {
  this.usage.timesUsed += 1;
  this.usage.lastUsed = new Date();
  return this.save();
};

DataTemplateSchema.methods.updateVersion = function() {
  this.version += 1;
  return this.save();
};

// Métodos estáticos
DataTemplateSchema.statics.findByUserId = function(userId, options = {}) {
  const query = { userId, isActive: true };
  if (options.category) query.category = options.category;
  
  return this.find(query)
    .sort({ 'usage.timesUsed': -1, createdAt: -1 })
    .limit(options.limit || 50);
};

DataTemplateSchema.statics.findPublicTemplates = function(options = {}) {
  const query = { isPublic: true, isActive: true };
  if (options.category) query.category = options.category;
  
  return this.find(query)
    .sort({ 'usage.timesUsed': -1 })
    .limit(options.limit || 20);
};

DataTemplateSchema.statics.findByName = function(userId, name) {
  return this.findOne({ userId, name, isActive: true });
};

DataTemplateSchema.statics.getCategories = function(userId) {
  return this.distinct('category', { userId, isActive: true });
};

DataTemplateSchema.statics.getPopularTemplates = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'usage.timesUsed': -1 })
    .limit(limit)
    .select('name description category usage.timesUsed userId');
};

export default mongoose.model('DataTemplate', DataTemplateSchema);