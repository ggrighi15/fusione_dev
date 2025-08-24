import mongoose from 'mongoose';

// Schema para configurações personalizadas do usuário
const UserConfigSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'pt-BR'
    },
    timezone: {
      type: String,
      default: 'America/Sao_Paulo'
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    },
    currency: {
      type: String,
      default: 'BRL'
    }
  },
  dataSettings: {
    autoBackup: {
      type: Boolean,
      default: true
    },
    backupFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    maxFileSize: {
      type: Number,
      default: 10485760 // 10MB
    },
    allowedFormats: [{
      type: String,
      enum: ['csv', 'json', 'xlsx', 'xml']
    }],
    dataRetentionDays: {
      type: Number,
      default: 365
    }
  },
  notifications: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      frequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly'],
        default: 'daily'
      }
    },
    push: {
      enabled: {
        type: Boolean,
        default: true
      },
      types: [{
        type: String,
        enum: ['import', 'export', 'backup', 'error', 'system']
      }]
    }
  },
  security: {
    twoFactorAuth: {
      type: Boolean,
      default: false
    },
    sessionTimeout: {
      type: Number,
      default: 3600000 // 1 hora em ms
    },
    allowedIPs: [String],
    encryptData: {
      type: Boolean,
      default: true
    }
  },
  integrations: {
    apis: [{
      name: String,
      endpoint: String,
      apiKey: String,
      enabled: {
        type: Boolean,
        default: false
      },
      lastSync: Date
    }],
    webhooks: [{
      name: String,
      url: String,
      events: [String],
      enabled: {
        type: Boolean,
        default: false
      }
    }]
  },
  customFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'user_configs'
});

// Índices
UserConfigSchema.index({ userId: 1 });
UserConfigSchema.index({ 'integrations.apis.name': 1 });
UserConfigSchema.index({ updatedAt: -1 });

// Métodos do schema
UserConfigSchema.methods.updatePreference = function(key, value) {
  this.preferences[key] = value;
  return this.save();
};

UserConfigSchema.methods.addIntegration = function(type, config) {
  if (type === 'api') {
    this.integrations.apis.push(config);
  } else if (type === 'webhook') {
    this.integrations.webhooks.push(config);
  }
  return this.save();
};

UserConfigSchema.methods.removeIntegration = function(type, name) {
  if (type === 'api') {
    this.integrations.apis = this.integrations.apis.filter(api => api.name !== name);
  } else if (type === 'webhook') {
    this.integrations.webhooks = this.integrations.webhooks.filter(webhook => webhook.name !== name);
  }
  return this.save();
};

UserConfigSchema.methods.setCustomField = function(key, value) {
  this.customFields.set(key, value);
  return this.save();
};

UserConfigSchema.methods.getCustomField = function(key) {
  return this.customFields.get(key);
};

// Métodos estáticos
UserConfigSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId, isActive: true });
};

UserConfigSchema.statics.createDefault = function(userId) {
  return this.create({
    userId,
    preferences: {},
    dataSettings: {},
    notifications: {
      email: { enabled: true, frequency: 'daily' },
      push: { enabled: true, types: ['import', 'export', 'backup', 'error'] }
    },
    security: {},
    integrations: { apis: [], webhooks: [] },
    customFields: new Map()
  });
};

UserConfigSchema.statics.getActiveIntegrations = function(userId) {
  return this.findOne({ userId, isActive: true })
    .then(config => {
      if (!config) return { apis: [], webhooks: [] };
      return {
        apis: config.integrations.apis.filter(api => api.enabled),
        webhooks: config.integrations.webhooks.filter(webhook => webhook.enabled)
      };
    });
};

export default mongoose.model('UserConfig', UserConfigSchema);