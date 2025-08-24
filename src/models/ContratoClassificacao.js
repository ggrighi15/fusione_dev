import mongoose from 'mongoose';
const { Schema } = mongoose;

const contratoClassificacaoSchema = new mongoose.Schema({
  codigo: {
    type: String,
    required: true,
    index: true
  },
  rotulo: {
    type: String,
    required: true
  },
  descricao: String,
  nivel: {
    type: Number,
    required: true,
    min: 0
  },
  codigoPai: {
    type: String,
    index: true
  },
  codigosFilhos: [{
    type: String
  }],
  contagem: {
    type: Number,
    default: 0,
    min: 0
  },
  valor: {
    type: Number,
    default: 0
  },
  percentual: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  metadata: {
    fonte: String,
    dataReferencia: Date,
    versao: String,
    observacoes: String
  },
  hierarquia: {
    caminho: String, // Ex: "ROOT > CATEGORIA1 > SUBCATEGORIA1"
    profundidade: Number
  },
  status: {
    type: String,
    enum: ['ativo', 'inativo', 'pendente'],
    default: 'ativo'
  },
  tags: [String],
  // Campos para auditoria
  ingestFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IngestFile',
    required: true
  },
  dataProcessamento: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'contrato_classificacao'
});

// Índices compostos para otimização
contratoClassificacaoSchema.index({ codigo: 1, ingestFileId: 1 }, { unique: true });
contratoClassificacaoSchema.index({ codigoPai: 1, nivel: 1 });
contratoClassificacaoSchema.index({ nivel: 1, contagem: -1 });
contratoClassificacaoSchema.index({ status: 1, dataProcessamento: -1 });
contratoClassificacaoSchema.index({ tags: 1 });

// Índice de texto para busca
contratoClassificacaoSchema.index({ 
  rotulo: 'text', 
  descricao: 'text',
  'metadata.observacoes': 'text'
});

// Métodos do schema
contratoClassificacaoSchema.methods.getFilhos = function() {
  return this.constructor.find({ codigoPai: this.codigo, status: 'ativo' });
};

contratoClassificacaoSchema.methods.getPai = function() {
  if (!this.codigoPai) return null;
  return this.constructor.findOne({ codigo: this.codigoPai, status: 'ativo' });
};

contratoClassificacaoSchema.methods.getHierarquiaCompleta = function() {
  const hierarquia = [];
  let atual = this;
  
  while (atual) {
    hierarquia.unshift({
      codigo: atual.codigo,
      rotulo: atual.rotulo,
      nivel: atual.nivel
    });
    
    if (!atual.codigoPai) break;
    atual = this.constructor.findOne({ codigo: atual.codigoPai });
  }
  
  return hierarquia;
};

contratoClassificacaoSchema.methods.calcularPercentual = function(totalGeral) {
  if (totalGeral > 0) {
    this.percentual = (this.contagem / totalGeral) * 100;
  }
  return this.percentual;
};

// Métodos estáticos
contratoClassificacaoSchema.statics.findByCodigo = function(codigo) {
  return this.findOne({ codigo, status: 'ativo' });
};

contratoClassificacaoSchema.statics.findByNivel = function(nivel) {
  return this.find({ nivel, status: 'ativo' }).sort({ contagem: -1 });
};

contratoClassificacaoSchema.statics.findRaizes = function() {
  return this.find({ 
    $or: [{ codigoPai: null }, { codigoPai: '' }],
    status: 'ativo'
  }).sort({ rotulo: 1 });
};

contratoClassificacaoSchema.statics.findFilhosDe = function(codigoPai) {
  return this.find({ codigoPai, status: 'ativo' }).sort({ rotulo: 1 });
};

contratoClassificacaoSchema.statics.getEstatisticas = function() {
  return this.aggregate([
    { $match: { status: 'ativo' } },
    {
      $group: {
        _id: '$nivel',
        totalItens: { $sum: 1 },
        totalContagem: { $sum: '$contagem' },
        totalValor: { $sum: '$valor' },
        mediaContagem: { $avg: '$contagem' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

contratoClassificacaoSchema.statics.buscarPorTexto = function(termo) {
  return this.find({
    $text: { $search: termo },
    status: 'ativo'
  }).sort({ score: { $meta: 'textScore' } });
};

contratoClassificacaoSchema.statics.getTopClassificacoes = function(limite = 10) {
  return this.find({ status: 'ativo' })
    .sort({ contagem: -1 })
    .limit(limite);
};

const ContratoClassificacao = mongoose.model('ContratoClassificacao', contratoClassificacaoSchema);
export default ContratoClassificacao;