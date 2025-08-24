import mongoose from 'mongoose';
const { Schema } = mongoose;

const contratoMacroSchema = new mongoose.Schema({
  codigoMacro: {
    type: String,
    required: true,
    index: true
  },
  rotuloMacro: {
    type: String,
    required: true
  },
  descricaoMacro: String,
  // Agregações das classificações filhas
  totalContagem: {
    type: Number,
    default: 0,
    min: 0
  },
  totalValor: {
    type: Number,
    default: 0
  },
  percentualTotal: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  quantidadeFilhos: {
    type: Number,
    default: 0,
    min: 0
  },
  // Detalhes das classificações filhas
  classificacoesFilhas: [{
    codigo: String,
    rotulo: String,
    contagem: Number,
    valor: Number,
    percentual: Number,
    nivel: Number
  }],
  // Estatísticas calculadas
  estatisticas: {
    mediaContagem: Number,
    medianaContagem: Number,
    maiorContagem: Number,
    menorContagem: Number,
    desviopadrao: Number,
    coeficienteVariacao: Number
  },
  // Tendências e comparações
  tendencia: {
    crescimento: Number, // Percentual de crescimento
    periodo: String,
    comparacaoAnterior: {
      totalContagem: Number,
      totalValor: Number,
      dataReferencia: Date
    }
  },
  // Metadados
  metadata: {
    fonte: String,
    dataReferencia: Date,
    versao: String,
    observacoes: String,
    algoritmoAgregacao: String
  },
  // Configurações de exibição
  configuracao: {
    cor: String,
    icone: String,
    ordem: Number,
    visivel: {
      type: Boolean,
      default: true
    }
  },
  // Campos para auditoria
  ingestFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IngestFile',
    required: true
  },
  dataProcessamento: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['ativo', 'inativo', 'calculando'],
    default: 'ativo'
  }
}, {
  timestamps: true,
  collection: 'contrato_macro'
});

// Índices para otimização
contratoMacroSchema.index({ codigoMacro: 1, ingestFileId: 1 }, { unique: true });
contratoMacroSchema.index({ totalContagem: -1 });
contratoMacroSchema.index({ totalValor: -1 });
contratoMacroSchema.index({ status: 1, dataProcessamento: -1 });
contratoMacroSchema.index({ 'configuracao.ordem': 1, 'configuracao.visivel': 1 });

// Índice de texto para busca
contratoMacroSchema.index({ 
  rotuloMacro: 'text', 
  descricaoMacro: 'text',
  'metadata.observacoes': 'text'
});

// Métodos do schema
contratoMacroSchema.methods.calcularEstatisticas = function() {
  if (this.classificacoesFilhas.length === 0) {
    this.estatisticas = {
      mediaContagem: 0,
      medianaContagem: 0,
      maiorContagem: 0,
      menorContagem: 0,
      desviopadrao: 0,
      coeficienteVariacao: 0
    };
    return this.estatisticas;
  }

  const contagens = this.classificacoesFilhas.map(c => c.contagem).sort((a, b) => a - b);
  const soma = contagens.reduce((acc, val) => acc + val, 0);
  const media = soma / contagens.length;
  
  // Mediana
  const meio = Math.floor(contagens.length / 2);
  const mediana = contagens.length % 2 === 0 
    ? (contagens[meio - 1] + contagens[meio]) / 2
    : contagens[meio];
  
  // Desvio padrão
  const variancia = contagens.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / contagens.length;
  const desviopadrao = Math.sqrt(variancia);
  
  // Coeficiente de variação
  const coeficienteVariacao = media > 0 ? (desviopadrao / media) * 100 : 0;

  this.estatisticas = {
    mediaContagem: media,
    medianaContagem: mediana,
    maiorContagem: Math.max(...contagens),
    menorContagem: Math.min(...contagens),
    desviopadrao: desviopadrao,
    coeficienteVariacao: coeficienteVariacao
  };

  return this.estatisticas;
};

contratoMacroSchema.methods.adicionarClassificacao = function(classificacao) {
  // Remove classificação existente se houver
  this.classificacoesFilhas = this.classificacoesFilhas.filter(
    c => c.codigo !== classificacao.codigo
  );
  
  // Adiciona nova classificação
  this.classificacoesFilhas.push({
    codigo: classificacao.codigo,
    rotulo: classificacao.rotulo,
    contagem: classificacao.contagem,
    valor: classificacao.valor,
    percentual: classificacao.percentual,
    nivel: classificacao.nivel
  });
  
  // Recalcula totais
  this.recalcularTotais();
};

contratoMacroSchema.methods.recalcularTotais = function() {
  this.totalContagem = this.classificacoesFilhas.reduce((acc, c) => acc + c.contagem, 0);
  this.totalValor = this.classificacoesFilhas.reduce((acc, c) => acc + c.valor, 0);
  this.quantidadeFilhos = this.classificacoesFilhas.length;
  
  // Recalcula estatísticas
  this.calcularEstatisticas();
};

contratoMacroSchema.methods.calcularPercentual = function(totalGeral) {
  if (totalGeral > 0) {
    this.percentualTotal = (this.totalContagem / totalGeral) * 100;
  }
  return this.percentualTotal;
};

// Métodos estáticos
contratoMacroSchema.statics.findByCodigo = function(codigoMacro) {
  return this.findOne({ codigoMacro, status: 'ativo' });
};

contratoMacroSchema.statics.getTopMacros = function(limite = 10) {
  return this.find({ status: 'ativo' })
    .sort({ totalContagem: -1 })
    .limit(limite);
};

contratoMacroSchema.statics.getResumoGeral = function() {
  return this.aggregate([
    { $match: { status: 'ativo' } },
    {
      $group: {
        _id: null,
        totalMacros: { $sum: 1 },
        totalContagem: { $sum: '$totalContagem' },
        totalValor: { $sum: '$totalValor' },
        mediaTotalContagem: { $avg: '$totalContagem' },
        mediaTotalValor: { $avg: '$totalValor' }
      }
    }
  ]);
};

contratoMacroSchema.statics.buscarPorTexto = function(termo) {
  return this.find({
    $text: { $search: termo },
    status: 'ativo'
  }).sort({ score: { $meta: 'textScore' } });
};

contratoMacroSchema.statics.getDistribuicao = function() {
  return this.aggregate([
    { $match: { status: 'ativo' } },
    {
      $bucket: {
        groupBy: '$totalContagem',
        boundaries: [0, 100, 500, 1000, 5000, 10000, Infinity],
        default: 'Outros',
        output: {
          count: { $sum: 1 },
          macros: { $push: { codigo: '$codigoMacro', rotulo: '$rotuloMacro' } }
        }
      }
    }
  ]);
};

const ContratoMacro = mongoose.model('ContratoMacro', contratoMacroSchema);
export default ContratoMacro;