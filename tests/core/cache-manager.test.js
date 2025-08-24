/**
 * Testes para o CacheManager
 * Testa a funcionalidade do gerenciador de cache
 */

const { CacheManager } = require('../../src/core/cache-manager.js');
const { createLogger } = require('../../src/core/logger.js');

describe('CacheManager', () => {
  let cacheManager;
  let logger;

  beforeEach(() => {
    logger = createLogger('test');
    
    const config = {
      host: 'localhost',
      port: 6379,
      database: 0,
      keyPrefix: 'test:',
      defaultTTL: 3600
    };

    cacheManager = new CacheManager(config, logger);
  });

  test('deve criar uma instância do CacheManager', () => {
    expect(cacheManager).toBeInstanceOf(CacheManager);
    expect(typeof cacheManager.connect).toBe('function');
    expect(typeof cacheManager.disconnect).toBe('function');
    expect(typeof cacheManager.get).toBe('function');
    expect(typeof cacheManager.set).toBe('function');
    expect(typeof cacheManager.del).toBe('function');
    expect(typeof cacheManager.exists).toBe('function');
    expect(typeof cacheManager.clear).toBe('function');
  });

  test('deve aplicar configurações padrão', () => {
    const configMinimal = {
      host: 'localhost'
    };
    
    const managerWithDefaults = new CacheManager(configMinimal, logger);
    const stats = managerWithDefaults.getStats();
    
    expect(stats.port).toBe(6379);
    expect(stats.database).toBe(0);
    expect(stats.keyPrefix).toBe('fusione:');
    expect(stats.defaultTTL).toBe(3600);
  });

  test('deve validar configuração corretamente', () => {
    const validConfig = {
      host: 'localhost',
      port: 6379,
      database: 0
    };
    
    expect(() => {
      new CacheManager(validConfig, logger);
    }).not.toThrow();
  });

  test('deve falhar com configuração inválida - sem host', () => {
    const invalidConfig = {
      port: 6379,
      database: 0
    };
    
    expect(() => {
      new CacheManager(invalidConfig, logger);
    }).toThrow('Host é obrigatório');
  });

  test('deve falhar com porta inválida', () => {
    const invalidConfigs = [
      { host: 'localhost', port: 0 },
      { host: 'localhost', port: 65536 },
      { host: 'localhost', port: -1 },
      { host: 'localhost', port: 'invalid' }
    ];
    
    for (const config of invalidConfigs) {
      expect(() => {
        new CacheManager(config, logger);
      }).toThrow('Porta deve ser um número entre 1 e 65535');
    }
  });

  test('deve falhar com database inválido', () => {
    const invalidConfigs = [
      { host: 'localhost', database: -1 },
      { host: 'localhost', database: 16 },
      { host: 'localhost', database: 'invalid' }
    ];
    
    for (const config of invalidConfigs) {
      expect(() => {
        new CacheManager(config, logger);
      }).toThrow('Database deve ser um número entre 0 e 15');
    }
  });

  test('deve validar keyPrefix', () => {
    const invalidConfigs = [
      { host: 'localhost', keyPrefix: '' },
      { host: 'localhost', keyPrefix: ' ' },
      { host: 'localhost', keyPrefix: 123 }
    ];
    
    for (const config of invalidConfigs) {
      expect(() => {
        new CacheManager(config, logger);
      }).toThrow();
    }
  });

  test('deve validar defaultTTL', () => {
    const invalidConfigs = [
      { host: 'localhost', defaultTTL: -1 },
      { host: 'localhost', defaultTTL: 'invalid' },
      { host: 'localhost', defaultTTL: 0 }
    ];
    
    for (const config of invalidConfigs) {
      expect(() => {
        new CacheManager(config, logger);
      }).toThrow('TTL padrão deve ser um número positivo');
    }
  });

  test('deve validar maxRetries', () => {
    const invalidConfigs = [
      { host: 'localhost', maxRetries: -1 },
      { host: 'localhost', maxRetries: 'invalid' },
      { host: 'localhost', maxRetries: 11 }
    ];
    
    for (const config of invalidConfigs) {
      expect(() => {
        new CacheManager(config, logger);
      }).toThrow('Máximo de tentativas deve ser um número entre 0 e 10');
    }
  });

  test('deve validar retryDelay', () => {
    const invalidConfigs = [
      { host: 'localhost', retryDelay: -1 },
      { host: 'localhost', retryDelay: 'invalid' },
      { host: 'localhost', retryDelay: 10001 }
    ];
    
    for (const config of invalidConfigs) {
      expect(() => {
        new CacheManager(config, logger);
      }).toThrow('Atraso entre tentativas deve ser um número entre 0 e 10000ms');
    }
  });

  test('deve formatar chaves corretamente', () => {
    const key = 'user:123';
    const formattedKey = cacheManager.formatKey(key);
    expect(formattedKey).toBe('test:user:123');
  });

  test('deve retornar status de conexão correto', () => {
    expect(cacheManager.isConnected()).toBe(false);
  });

  test('deve retornar estatísticas', () => {
    const stats = cacheManager.getStats();
    
    expect(stats).toHaveProperty('connected');
    expect(stats).toHaveProperty('host');
    expect(stats).toHaveProperty('port');
    expect(stats).toHaveProperty('database');
    expect(stats).toHaveProperty('keyPrefix');
    expect(stats).toHaveProperty('defaultTTL');
    expect(stats).toHaveProperty('totalKeys');
    expect(stats).toHaveProperty('usedMemory');
    expect(stats).toHaveProperty('connectionTime');
    
    expect(stats.connected).toBe(false);
    expect(stats.host).toBe('localhost');
    expect(stats.port).toBe(6379);
    expect(stats.database).toBe(0);
    expect(stats.keyPrefix).toBe('test:');
    expect(stats.defaultTTL).toBe(3600);
    expect(stats.totalKeys).toBe(0);
    expect(stats.usedMemory).toBe('0 B');
    expect(stats.connectionTime).toBeNull();
  });

  test('deve formatar bytes corretamente', () => {
    expect(cacheManager.formatBytes(0)).toBe('0 B');
    expect(cacheManager.formatBytes(1024)).toBe('1.00 KB');
    expect(cacheManager.formatBytes(1048576)).toBe('1.00 MB');
    expect(cacheManager.formatBytes(1073741824)).toBe('1.00 GB');
    expect(cacheManager.formatBytes(1099511627776)).toBe('1.00 TB');
  });

  test('deve serializar dados corretamente', () => {
    const testData = {
      string: 'test',
      number: 123,
      boolean: true,
      array: [1, 2, 3],
      object: { nested: 'value' }
    };
    
    const serialized = cacheManager.serialize(testData);
    expect(typeof serialized).toBe('string');
    
    const deserialized = cacheManager.deserialize(serialized);
    expect(deserialized).toEqual(testData);
  });

  test('deve lidar com dados primitivos na serialização', () => {
    const primitives = ['string', 123, true, null];
    
    for (const primitive of primitives) {
      const serialized = cacheManager.serialize(primitive);
      const deserialized = cacheManager.deserialize(serialized);
      expect(deserialized).toBe(primitive);
    }
  });

  test('deve validar TTL', () => {
    expect(() => {
      cacheManager.validateTTL(-1);
    }).toThrow('TTL deve ser um número positivo');
    
    expect(() => {
      cacheManager.validateTTL('invalid');
    }).toThrow('TTL deve ser um número positivo');
    
    expect(() => {
      cacheManager.validateTTL(0);
    }).toThrow('TTL deve ser um número positivo');
    
    expect(() => {
      cacheManager.validateTTL(3600);
    }).not.toThrow();
  });

  test('deve validar chaves', () => {
    expect(() => {
      cacheManager.validateKey('');
    }).toThrow('Chave não pode estar vazia');
    
    expect(() => {
      cacheManager.validateKey(' ');
    }).toThrow('Chave não pode estar vazia');
    
    expect(() => {
      cacheManager.validateKey(123);
    }).toThrow('Chave deve ser uma string');
    
    expect(() => {
      cacheManager.validateKey('valid-key');
    }).not.toThrow();
  });

  test('deve construir opções de conexão sem senha', () => {
    const configWithoutPassword = {
      host: 'localhost',
      port: 6379,
      database: 0
    };
    
    const managerWithoutPassword = new CacheManager(configWithoutPassword, logger);
    const options = managerWithoutPassword.buildConnectionOptions();
    
    expect(options).toHaveProperty('host', 'localhost');
    expect(options).toHaveProperty('port', 6379);
    expect(options).toHaveProperty('db', 0);
    expect(options).not.toHaveProperty('password');
  });

  test('deve construir opções de conexão com senha', () => {
    const configWithPassword = {
      host: 'localhost',
      port: 6379,
      database: 0,
      password: 'secret'
    };
    
    const managerWithPassword = new CacheManager(configWithPassword, logger);
    const options = managerWithPassword.buildConnectionOptions();
    
    expect(options).toHaveProperty('host', 'localhost');
    expect(options).toHaveProperty('port', 6379);
    expect(options).toHaveProperty('db', 0);
    expect(options).toHaveProperty('password', 'secret');
  });

  test('deve construir opções de conexão com retry', () => {
    const configWithRetry = {
      host: 'localhost',
      port: 6379,
      database: 0,
      maxRetries: 5,
      retryDelay: 1000
    };
    
    const managerWithRetry = new CacheManager(configWithRetry, logger);
    const options = managerWithRetry.buildConnectionOptions();
    
    expect(options).toHaveProperty('retryDelayOnFailover', 1000);
    expect(options).toHaveProperty('maxRetriesPerRequest', 5);
  });

  test('deve aplicar configurações personalizadas', () => {
    const customConfig = {
      host: 'redis-server',
      port: 6380,
      database: 5,
      keyPrefix: 'custom:',
      defaultTTL: 7200,
      maxRetries: 3,
      retryDelay: 500
    };
    
    const customManager = new CacheManager(customConfig, logger);
    const stats = customManager.getStats();
    
    expect(stats.host).toBe('redis-server');
    expect(stats.port).toBe(6380);
    expect(stats.database).toBe(5);
    expect(stats.keyPrefix).toBe('custom:');
    expect(stats.defaultTTL).toBe(7200);
  });
});