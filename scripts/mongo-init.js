// Fusione Core System - MongoDB Initialization Script
// Script executado durante a inicialização do container MongoDB

// Conectar ao banco de dados fusione
db = db.getSiblingDB('fusione');

// Criar usuário da aplicação
db.createUser({
  user: 'fusione_app',
  pwd: 'fusione_app_password',
  roles: [
    {
      role: 'readWrite',
      db: 'fusione'
    }
  ]
});

print('Usuário da aplicação criado com sucesso');

// Criar coleções iniciais
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'name', 'password', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
          description: 'Email deve ser válido'
        },
        name: {
          bsonType: 'string',
          minLength: 2,
          description: 'Nome deve ter pelo menos 2 caracteres'
        },
        password: {
          bsonType: 'string',
          description: 'Hash da senha'
        },
        role: {
          bsonType: 'string',
          enum: ['admin', 'moderator', 'user', 'guest'],
          description: 'Role deve ser um dos valores permitidos'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Status ativo do usuário'
        },
        emailVerified: {
          bsonType: 'bool',
          description: 'Status de verificação do email'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Data de criação'
        },
        updatedAt: {
          bsonType: 'date',
          description: 'Data de atualização'
        }
      }
    }
  }
});

print('Coleção users criada com validação');

// Criar índices para users
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isActive: 1 });
db.users.createIndex({ createdAt: 1 });

print('Índices da coleção users criados');

// Criar coleção de notificações
db.createCollection('notifications', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'message', 'type', 'userId'],
      properties: {
        title: {
          bsonType: 'string',
          minLength: 1,
          description: 'Título da notificação'
        },
        message: {
          bsonType: 'string',
          minLength: 1,
          description: 'Mensagem da notificação'
        },
        type: {
          bsonType: 'string',
          enum: ['info', 'warning', 'error', 'success'],
          description: 'Tipo da notificação'
        },
        userId: {
          bsonType: 'string',
          description: 'ID do usuário destinatário'
        },
        isRead: {
          bsonType: 'bool',
          description: 'Status de leitura'
        },
        priority: {
          bsonType: 'string',
          enum: ['low', 'medium', 'high', 'urgent'],
          description: 'Prioridade da notificação'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Data de criação'
        },
        readAt: {
          bsonType: 'date',
          description: 'Data de leitura'
        }
      }
    }
  }
});

print('Coleção notifications criada com validação');

// Criar índices para notifications
db.notifications.createIndex({ userId: 1 });
db.notifications.createIndex({ isRead: 1 });
db.notifications.createIndex({ type: 1 });
db.notifications.createIndex({ priority: 1 });
db.notifications.createIndex({ createdAt: 1 });
db.notifications.createIndex({ userId: 1, isRead: 1 });

print('Índices da coleção notifications criados');

// Criar coleção de sessões
db.createCollection('sessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['sessionId', 'userId', 'createdAt', 'expiresAt'],
      properties: {
        sessionId: {
          bsonType: 'string',
          description: 'ID único da sessão'
        },
        userId: {
          bsonType: 'string',
          description: 'ID do usuário'
        },
        ipAddress: {
          bsonType: 'string',
          description: 'Endereço IP da sessão'
        },
        userAgent: {
          bsonType: 'string',
          description: 'User agent do navegador'
        },
        createdAt: {
          bsonType: 'date',
          description: 'Data de criação da sessão'
        },
        lastActivity: {
          bsonType: 'date',
          description: 'Última atividade da sessão'
        },
        expiresAt: {
          bsonType: 'date',
          description: 'Data de expiração da sessão'
        },
        isActive: {
          bsonType: 'bool',
          description: 'Status ativo da sessão'
        }
      }
    }
  }
});

print('Coleção sessions criada com validação');

// Criar índices para sessions
db.sessions.createIndex({ sessionId: 1 }, { unique: true });
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
db.sessions.createIndex({ isActive: 1 });
db.sessions.createIndex({ lastActivity: 1 });

print('Índices da coleção sessions criados');

// Criar coleção de logs
db.createCollection('logs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['level', 'message', 'timestamp'],
      properties: {
        level: {
          bsonType: 'string',
          enum: ['error', 'warn', 'info', 'debug'],
          description: 'Nível do log'
        },
        message: {
          bsonType: 'string',
          description: 'Mensagem do log'
        },
        timestamp: {
          bsonType: 'date',
          description: 'Timestamp do log'
        },
        module: {
          bsonType: 'string',
          description: 'Módulo que gerou o log'
        },
        userId: {
          bsonType: 'string',
          description: 'ID do usuário relacionado'
        },
        requestId: {
          bsonType: 'string',
          description: 'ID da requisição relacionada'
        },
        metadata: {
          bsonType: 'object',
          description: 'Metadados adicionais'
        }
      }
    }
  }
});

print('Coleção logs criada com validação');

// Criar índices para logs
db.logs.createIndex({ level: 1 });
db.logs.createIndex({ timestamp: 1 });
db.logs.createIndex({ module: 1 });
db.logs.createIndex({ userId: 1 });
db.logs.createIndex({ requestId: 1 });
db.logs.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // TTL: 30 dias

print('Índices da coleção logs criados');

// Criar coleção de métricas
db.createCollection('metrics', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['type', 'timestamp', 'data'],
      properties: {
        type: {
          bsonType: 'string',
          enum: ['request', 'user_event', 'error', 'performance', 'system'],
          description: 'Tipo da métrica'
        },
        timestamp: {
          bsonType: 'date',
          description: 'Timestamp da métrica'
        },
        data: {
          bsonType: 'object',
          description: 'Dados da métrica'
        },
        tags: {
          bsonType: 'object',
          description: 'Tags para categorização'
        }
      }
    }
  }
});

print('Coleção metrics criada com validação');

// Criar índices para metrics
db.metrics.createIndex({ type: 1 });
db.metrics.createIndex({ timestamp: 1 });
db.metrics.createIndex({ type: 1, timestamp: 1 });
db.metrics.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // TTL: 30 dias

print('Índices da coleção metrics criados');

// Criar usuário administrador padrão
const adminUser = {
  email: 'admin@fusione.local',
  name: 'Administrador',
  password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', // password: admin123
  role: 'admin',
  isActive: true,
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

try {
  db.users.insertOne(adminUser);
  print('Usuário administrador padrão criado');
} catch (error) {
  print('Erro ao criar usuário administrador: ' + error.message);
}

// Criar configurações do sistema
db.createCollection('system_config');

const systemConfig = {
  _id: 'default',
  app: {
    name: 'Fusione Core System',
    version: '1.0.0',
    environment: 'production'
  },
  features: {
    registration: true,
    emailVerification: false,
    twoFactorAuth: false,
    analytics: true,
    notifications: true
  },
  limits: {
    maxUsersPerOrg: 1000,
    maxNotificationsPerUser: 100,
    maxSessionsPerUser: 5
  },
  security: {
    passwordMinLength: 8,
    passwordRequireSpecialChars: true,
    sessionTimeout: 1800000, // 30 minutos
    maxLoginAttempts: 5,
    lockoutDuration: 900000 // 15 minutos
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

try {
  db.system_config.insertOne(systemConfig);
  print('Configurações do sistema criadas');
} catch (error) {
  print('Erro ao criar configurações do sistema: ' + error.message);
}

// Criar índices para system_config
db.system_config.createIndex({ _id: 1 }, { unique: true });

print('Inicialização do MongoDB concluída com sucesso!');
print('Banco de dados: fusione');
print('Usuário da aplicação: fusione_app');
print('Usuário administrador: admin@fusione.local (senha: admin123)');
print('Coleções criadas: users, notifications, sessions, logs, metrics, system_config');