import mongoose from 'mongoose';

// Schema para dados personalizados do usuário
const UserDataSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  dataType: {
    type: String,
    required: true,
    enum: ['csv', 'json', 'custom', 'imported', 'generated']
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
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  metadata: {
    source: String,
    originalFileName: String,
    fileSize: Number,
    recordCount: Number,
    columns: [String],
    importDate: Date,
    lastModified: Date,
    version: {
      type: Number,
      default: 1
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: {
    read: [String],
    write: [String],
    delete: [String]
  },
  backup: {
    enabled: {
      type: Boolean,
      default: true
    },
    lastBackup: Date,
    backupCount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  collection: 'user_data'
});

// Índices para otimização
UserDataSchema.index({ userId: 1, dataType: 1 });
UserDataSchema.index({ userId: 1, name: 1 });
UserDataSchema.index({ tags: 1 });
UserDataSchema.index({ 'metadata.importDate': -1 });
UserDataSchema.index({ createdAt: -1 });

// Métodos do schema
UserDataSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  // Remove dados sensíveis se necessário
  return obj;
};

UserDataSchema.methods.createBackup = function() {
  this.backup.lastBackup = new Date();
  this.backup.backupCount += 1;
  return this.save();
};

UserDataSchema.methods.updateVersion = function() {
  this.metadata.version += 1;
  this.metadata.lastModified = new Date();
  return this.save();
};

// Métodos estáticos
UserDataSchema.statics.findByUserId = function(userId, options = {}) {
  const query = { userId, isActive: true };
  if (options.dataType) query.dataType = options.dataType;
  if (options.tags) query.tags = { $in: options.tags };
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 100);
};

UserDataSchema.statics.findByName = function(userId, name) {
  return this.findOne({ userId, name, isActive: true });
};

UserDataSchema.statics.getDataTypes = function(userId) {
  return this.distinct('dataType', { userId, isActive: true });
};

UserDataSchema.statics.getStatistics = function(userId) {
  return this.aggregate([
    { $match: { userId, isActive: true } },
    {
      $group: {
        _id: '$dataType',
        count: { $sum: 1 },
        totalSize: { $sum: '$metadata.fileSize' },
        totalRecords: { $sum: '$metadata.recordCount' }
      }
    }
  ]);
};

export default mongoose.model('UserData', UserDataSchema);