import mongoose from 'mongoose';
const { Schema } = mongoose;

const ingestFileSchema = new Schema({
  filename: {
    type: String,
    required: true,
    index: true
  },
  filepath: {
    type: String,
    required: true
  },
  fileHash: {
    type: String,
    required: true,
    index: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  recordsProcessed: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'error'],
    default: 'pending'
  },
  errorMessage: {
    type: String
  },
  processingStarted: {
    type: Date
  },
  processingCompleted: {
    type: Date
  },
  metadata: {
    xmlType: String,
    reportType: String,
    version: String,
    encoding: String
  }
}, {
  timestamps: true,
  collection: 'ingest_files'
});

// Índices compostos para otimização
ingestFileSchema.index({ filename: 1, fileHash: 1 }, { unique: true });
ingestFileSchema.index({ status: 1, createdAt: -1 });

// Métodos do schema
ingestFileSchema.methods.markAsProcessing = function() {
  this.status = 'processing';
  this.processingStarted = new Date();
  return this.save();
};

ingestFileSchema.methods.markAsCompleted = function(recordsCount) {
  this.status = 'completed';
  this.recordsProcessed = recordsCount || 0;
  this.processingCompleted = new Date();
  return this.save();
};

ingestFileSchema.methods.markAsError = function(errorMessage) {
  this.status = 'error';
  this.errorMessage = errorMessage;
  this.processingCompleted = new Date();
  return this.save();
};

// Métodos estáticos
ingestFileSchema.statics.findByHash = function(hash) {
  return this.findOne({ fileHash: hash });
};

ingestFileSchema.statics.getProcessingStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRecords: { $sum: '$recordsProcessed' }
      }
    }
  ]);
};

const IngestFile = mongoose.model('IngestFile', ingestFileSchema);
export default IngestFile;