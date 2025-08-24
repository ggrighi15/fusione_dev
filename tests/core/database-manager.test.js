/**
 * Testes para o DatabaseManager
 * Testa a funcionalidade do gerenciador de banco de dados
 */

const { DatabaseManager } = require('../../src/core/database-manager.js');
const { createLogger } = require('../../src/core/logger.js');

describe('DatabaseManager', () => {
  let databaseManager;
  let logger;

  beforeEach(() => {
    logger = createLogger('test');
    
    const config = {
      host: 'localhost',
      port: 27017,
      database: 'test_db',
      username: 'testuser',
      password: 'testpass'
    };

    databaseManager = new DatabaseManager(config, logger);
  });

  test('deve criar uma instância do DatabaseManager', () => {
    expect(databaseManager).toBeInstanceOf(DatabaseManager);
    expect(typeof databaseManager.connect).toBe('function');
    expect(typeof databaseManager.disconnect).toBe('function');
    expect(typeof databaseManager.getConnection).toBe('function');
    expect(typeof databaseManager.isConnected).toBe('function');
  });

  test('deve construir URI de conexão corretamente', () => {
    const uri = databaseManager.buildConnectionUri();
    expect(uri).toBe('mongodb://testuser:testpass@localhost:27017/test_db');
  });

  test('deve construir URI sem autenticação', () => {
    const configWithoutAuth = {
      host: 'localhost',
      port: 27017,
      database: 'test_db'
    };
    
    const managerWithoutAuth = new DatabaseManager(configWithoutAuth, logger);
    const uri = managerWithoutAuth.buildConnectionUri();
    expect(uri).toBe('mongodb://localhost:27017/test_db');
  });

  test('deve construir URI com parâmetros de consulta', () => {
    const configWithOptions = {
      host: 'localhost',
      port: 27017,
      database: 'test_db',
      options: {
        retryWrites: true,
        w: 'majority'
      }
    };
    
    const managerWithOptions = new DatabaseManager(configWithOptions, logger);
    const uri = managerWithOptions.buildConnectionUri();
    expect(uri).toContain('retryWrites=true');
    expect(uri).toContain('w=majority');
  });

  test('deve escapar caracteres especiais na senha', () => {
    const configWithSpecialChars = {
      host: 'localhost',
      port: 27017,
      database: 'test_db',
      username: 'user@domain',
      password: 'pass@word:123'
    };
    
    const managerWithSpecialChars = new DatabaseManager(configWithSpecialChars, logger);
    const uri = managerWithSpecialChars.buildConnectionUri();
    expect(uri).toContain('user%40domain');
    expect(uri).toContain('pass%40word%3A123');
  });

  test('deve validar configuração corretamente', () => {
    const validConfig = {
      host: 'localhost',
      port: 27017,
      database: 'test_db'
    };
    
    expect(() => {
      new DatabaseManager(validConfig, logger);
    }).not.toThrow();
  });

  test('deve falhar com configuração inválida - sem host', () => {
    const invalidConfig = {
      port: 27017,
      database: 'test_db'
    };
    
    expect(() => {
      new DatabaseManager(invalidConfig, logger);
    }).toThrow('Host é obrigatório');
  });

  test('deve falhar com configuração inválida - sem database', () => {
    const invalidConfig = {
      host: 'localhost',
      port: 27017
    };
    
    expect(() => {
      new DatabaseManager(invalidConfig, logger);
    }).toThrow('Database é obrigatório');
  });

  test('deve falhar com porta inválida', () => {
    const invalidConfigs = [
      { host: 'localhost', port: 0, database: 'test_db' },
      { host: 'localhost', port: 65536, database: 'test_db' },
      { host: 'localhost', port: -1, database: 'test_db' },
      { host: 'localhost', port: 'invalid', database: 'test_db' }
    ];
    
    for (const config of invalidConfigs) {
      expect(() => {
        new DatabaseManager(config, logger);
      }).toThrow('Porta deve ser um número entre 1 e 65535');
    }
  });

  test('deve validar tipos de configuração', () => {
    const invalidConfigs = [
      { host: 123, port: 27017, database: 'test_db' },
      { host: 'localhost', port: 27017, database: 123 },
      { host: 'localhost', port: 27017, database: 'test_db', username: 123 },
      { host: 'localhost', port: 27017, database: 'test_db', password: 123 }
    ];
    
    for (const config of invalidConfigs) {
      expect(() => {
        new DatabaseManager(config, logger);
      }).toThrow();
    }
  });

  test('deve retornar status de conexão correto', () => {
    expect(databaseManager.isConnected()).toBe(false);
  });

  test('deve retornar estatísticas', () => {
    const stats = databaseManager.getStats();
    
    expect(stats).toHaveProperty('connected');
    expect(stats).toHaveProperty('host');
    expect(stats).toHaveProperty('port');
    expect(stats).toHaveProperty('database');
    expect(stats).toHaveProperty('connectionTime');
    
    expect(stats.connected).toBe(false);
    expect(stats.host).toBe('localhost');
    expect(stats.port).toBe(27017);
    expect(stats.database).toBe('test_db');
    expect(stats.connectionTime).toBeNull();
  });

  test('deve aplicar opções padrão', () => {
    const configMinimal = {
      host: 'localhost',
      database: 'test_db'
    };
    
    const managerWithDefaults = new DatabaseManager(configMinimal, logger);
    const stats = managerWithDefaults.getStats();
    
    expect(stats.port).toBe(27017); // Porta padrão
  });

  test('deve aplicar opções personalizadas', () => {
    const configCustom = {
      host: 'custom-host',
      port: 27018,
      database: 'custom_db',
      options: {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 10000
      }
    };
    
    const managerCustom = new DatabaseManager(configCustom, logger);
    const stats = managerCustom.getStats();
    
    expect(stats.host).toBe('custom-host');
    expect(stats.port).toBe(27018);
    expect(stats.database).toBe('custom_db');
  });

  test('deve retornar conexão nula quando desconectado', () => {
    const connection = databaseManager.getConnection();
    expect(connection).toBeNull();
  });

  test('deve validar nome do banco de dados', () => {
    const invalidDatabaseNames = ['', ' ', 'db with spaces', 'db/with/slashes'];
    
    for (const dbName of invalidDatabaseNames) {
      const config = {
        host: 'localhost',
        port: 27017,
        database: dbName
      };
      
      expect(() => {
        new DatabaseManager(config, logger);
      }).toThrow();
    }
  });

  test('deve validar nome do host', () => {
    const invalidHosts = ['', ' ', 'host with spaces'];
    
    for (const host of invalidHosts) {
      const config = {
        host,
        port: 27017,
        database: 'test_db'
      };
      
      expect(() => {
        new DatabaseManager(config, logger);
      }).toThrow();
    }
  });
});