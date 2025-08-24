import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Nome é obrigatório'],
        trim: true,
        minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
        maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
    },
    email: {
        type: String,
        required: [true, 'Email é obrigatório'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido']
    },
    password: {
        type: String,
        required: [true, 'Senha é obrigatória'],
        minlength: [8, 'Senha deve ter pelo menos 8 caracteres'],
        select: false // Por padrão, não incluir a senha nas consultas
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },
    permissions: [{
        type: String,
        enum: [
            'read:users',
            'write:users',
            'delete:users',
            'read:admin',
            'write:admin',
            'read:system',
            'write:system'
        ]
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        select: false
    },
    emailVerificationExpires: {
        type: Date,
        select: false
    },
    passwordResetToken: {
        type: String,
        select: false
    },
    passwordResetExpires: {
        type: Date,
        select: false
    },
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date
    },
    profile: {
        avatar: String,
        bio: {
            type: String,
            maxlength: [500, 'Bio deve ter no máximo 500 caracteres']
        },
        location: String,
        website: String,
        socialLinks: {
            twitter: String,
            linkedin: String,
            github: String
        }
    },
    preferences: {
        language: {
            type: String,
            default: 'pt-BR'
        },
        timezone: {
            type: String,
            default: 'America/Sao_Paulo'
        },
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            push: {
                type: Boolean,
                default: true
            }
        }
    },
    metadata: {
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        tags: [String],
        notes: String
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.emailVerificationToken;
            delete ret.emailVerificationExpires;
            delete ret.passwordResetToken;
            delete ret.passwordResetExpires;
            return ret;
        }
    },
    toObject: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.emailVerificationToken;
            delete ret.emailVerificationExpires;
            delete ret.passwordResetToken;
            delete ret.passwordResetExpires;
            return ret;
        }
    }
});

// Índices
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });

// Virtual para verificar se a conta está bloqueada
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function(next) {
    // Só fazer hash se a senha foi modificada
    if (!this.isModified('password')) return next();
    
    try {
        // Hash da senha
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Middleware para definir permissões baseadas no role
userSchema.pre('save', function(next) {
    if (!this.isModified('role')) return next();
    
    // Definir permissões baseadas no role
    switch (this.role) {
        case 'admin':
            this.permissions = [
                'read:users', 'write:users', 'delete:users',
                'read:admin', 'write:admin',
                'read:system', 'write:system'
            ];
            break;
        case 'moderator':
            this.permissions = [
                'read:users', 'write:users',
                'read:admin'
            ];
            break;
        case 'user':
        default:
            this.permissions = ['read:users'];
            break;
    }
    
    next();
});

// Método para comparar senhas
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) {
        throw new Error('Senha não encontrada');
    }
    return bcrypt.compare(candidatePassword, this.password);
};

// Método para incrementar tentativas de login
userSchema.methods.incLoginAttempts = function() {
    // Se já temos um lockUntil e ainda não expirou, apenas incrementa
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }
    
    const updates = { $inc: { loginAttempts: 1 } };
    
    // Se atingiu o máximo de tentativas e não está bloqueado, bloquear
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = {
            lockUntil: Date.now() + 2 * 60 * 60 * 1000 // 2 horas
        };
    }
    
    return this.updateOne(updates);
};

// Método para resetar tentativas de login
userSchema.methods.resetLoginAttempts = function() {
    return this.updateOne({
        $unset: {
            loginAttempts: 1,
            lockUntil: 1
        },
        $set: {
            lastLogin: new Date()
        }
    });
};

// Método para verificar permissões
userSchema.methods.hasPermission = function(permission) {
    return this.permissions.includes(permission);
};

// Método para adicionar permissão
userSchema.methods.addPermission = function(permission) {
    if (!this.hasPermission(permission)) {
        this.permissions.push(permission);
    }
};

// Método para remover permissão
userSchema.methods.removePermission = function(permission) {
    this.permissions = this.permissions.filter(p => p !== permission);
};

// Método estático para encontrar por email
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

// Método estático para encontrar usuários ativos
userSchema.statics.findActive = function() {
    return this.find({ isActive: true });
};

const User = mongoose.model('User', userSchema);

export { User };