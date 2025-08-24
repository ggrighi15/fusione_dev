import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    userAgent: {
        type: String,
        default: ''
    },
    ipAddress: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // TTL index para remoção automática
    },
    lastUsed: {
        type: Date,
        default: Date.now
    },
    deviceInfo: {
        browser: String,
        os: String,
        device: String,
        isMobile: {
            type: Boolean,
            default: false
        }
    },
    location: {
        country: String,
        city: String,
        region: String,
        timezone: String
    },
    metadata: {
        createdBy: String,
        source: {
            type: String,
            enum: ['web', 'mobile', 'api', 'desktop'],
            default: 'web'
        },
        sessionId: String,
        fingerprint: String
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            // Não expor o token completo em JSON
            if (ret.token) {
                ret.tokenPreview = ret.token.substring(0, 8) + '...';
                delete ret.token;
            }
            return ret;
        }
    }
});

// Índices compostos para otimização
refreshTokenSchema.index({ userId: 1, isActive: 1 });
refreshTokenSchema.index({ userId: 1, expiresAt: 1 });
refreshTokenSchema.index({ createdAt: -1 });
refreshTokenSchema.index({ lastUsed: -1 });

// Virtual para verificar se o token está expirado
refreshTokenSchema.virtual('isExpired').get(function() {
    return this.expiresAt < new Date();
});

// Virtual para verificar se o token é válido
refreshTokenSchema.virtual('isValid').get(function() {
    return this.isActive && !this.isExpired;
});

// Middleware para atualizar lastUsed quando o token é usado
refreshTokenSchema.pre('findOneAndUpdate', function() {
    this.set({ lastUsed: new Date() });
});

// Método para marcar token como usado
refreshTokenSchema.methods.markAsUsed = function() {
    this.lastUsed = new Date();
    return this.save();
};

// Método para revogar token
refreshTokenSchema.methods.revoke = function() {
    this.isActive = false;
    return this.save();
};

// Método estático para encontrar token válido
refreshTokenSchema.statics.findValidToken = function(token) {
    return this.findOne({
        token,
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).populate('userId', 'name email role permissions isActive');
};

// Método estático para revogar todos os tokens de um usuário
refreshTokenSchema.statics.revokeAllUserTokens = function(userId) {
    return this.updateMany(
        { userId, isActive: true },
        { isActive: false }
    );
};

// Método estático para limpar tokens expirados
refreshTokenSchema.statics.cleanupExpired = function() {
    return this.deleteMany({
        $or: [
            { expiresAt: { $lt: new Date() } },
            { isActive: false, createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Remove tokens inativos após 7 dias
        ]
    });
};

// Método estático para obter estatísticas de tokens
refreshTokenSchema.statics.getStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                active: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$isActive', true] },
                                    { $gt: ['$expiresAt', new Date()] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                },
                expired: {
                    $sum: {
                        $cond: [
                            { $lt: ['$expiresAt', new Date()] },
                            1,
                            0
                        ]
                    }
                },
                revoked: {
                    $sum: {
                        $cond: [
                            { $eq: ['$isActive', false] },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);
    
    return stats[0] || {
        total: 0,
        active: 0,
        expired: 0,
        revoked: 0
    };
};

// Método estático para obter tokens ativos por usuário
refreshTokenSchema.statics.getActiveTokensByUser = function(userId) {
    return this.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).sort({ lastUsed: -1 });
};

// Método estático para limitar tokens por usuário
refreshTokenSchema.statics.limitTokensPerUser = async function(userId, maxTokens = 5) {
    const tokens = await this.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
    }).sort({ lastUsed: -1 });
    
    if (tokens.length > maxTokens) {
        const tokensToRevoke = tokens.slice(maxTokens);
        const tokenIds = tokensToRevoke.map(token => token._id);
        
        await this.updateMany(
            { _id: { $in: tokenIds } },
            { isActive: false }
        );
        
        return tokensToRevoke.length;
    }
    
    return 0;
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export { RefreshToken };