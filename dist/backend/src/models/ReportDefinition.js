import mongoose from 'mongoose';
const { Schema } = mongoose;

const fieldDefinitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['string', 'number', 'date', 'boolean', 'object', 'array'],
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  description: String,
  format: String, // Para datas, números, etc.
  validation: {
    minLength: Number,
    maxLength: Number,
    min: Number,
    max: Number,
    pattern: String
  },
  defaultValue: mongoose.Schema.Types.Mixed
}, { _id: false });

const reportDefinitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  description: String,
  version: {
    type: String,
    default: '1.0.0'
  },
  category: {
    type: String,
    enum: ['contratos', 'financeiro', 'operacional', 'analytics', 'custom'],
    default: 'custom'
  },
  interface: {
    type: String,
    required: true // XML interface/schema definition
  },
  headerFields: [fieldDefinitionSchema],
  dataFields: [fieldDefinitionSchema],
  xmlStructure: {
    rootElement: String,
    dataElement: String,
    headerElement: String,
    namespaces: [{
      prefix: String,
      uri: String
    }]
  },
  processingRules: {
    skipEmptyRecords: {
      type: Boolean,
      default: true
    },
    validateSchema: {
      type: Boolean,
      default: true
    },
    transformations: [{
      field: String,
      operation: String, // 'uppercase', 'lowercase', 'trim', 'format_date', etc.
      parameters: mongoose.Schema.Types.Mixed
    }]
  },
  outputTables: [{
    tableName: String,
    mapping: mongoose.Schema.Types.Mixed // Field mapping configuration
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  collection: 'report_definitions'
});

// Índices para otimização
reportDefinitionSchema.index({ category: 1, isActive: 1 });
reportDefinitionSchema.index({ name: 'text', description: 'text' });

// Métodos do schema
reportDefinitionSchema.methods.validateXmlStructure = function(xmlData) {
  // Implementar validação da estrutura XML
  return true;
};

reportDefinitionSchema.methods.getFieldByName = function(fieldName) {
  return [...this.headerFields, ...this.dataFields].find(field => field.name === fieldName);
};

// Métodos estáticos
reportDefinitionSchema.statics.findByCode = function(code) {
  return this.findOne({ code, isActive: true });
};

reportDefinitionSchema.statics.findByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ name: 1 });
};

reportDefinitionSchema.statics.searchByName = function(searchTerm) {
  return this.find({
    $text: { $search: searchTerm },
    isActive: true
  }).sort({ score: { $meta: 'textScore' } });
};

const ReportDefinition = mongoose.model('ReportDefinition', reportDefinitionSchema);
export default ReportDefinition;