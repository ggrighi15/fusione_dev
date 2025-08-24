/**
 * Testes para o ConfigManager
 * Testa a funcionalidade do gerenciador de configurações
 */

const { ConfigManager } = require('../../src/core/config-manager.js');
const fs = require('fs');
const path = require('path');

describe('ConfigManager', () => {
  let configManager;
  let tempConfigFile;

  beforeEach(() => {
    // Criar arquivo de configuração temporário
    tempConfigFile = path.join(process.cwd(), 'temp-config.json');
    const initialConfig = {
      app: {
        name: 'test-app',
        version: '1.0.0',
        debug: true
      },
      database: {
        host: 'localhost',
        port: 27017
      }
    };
    
    fs.writeFileSync(tempConfigFile, JSON.stringify(initialConfig, null, 2));
    configManager = new ConfigManager(tempConfigFile);
  });

  afterEach(() => {
    // Limpar arquivo temporário
    if (fs.existsSync(tempConfigFile)) {
      fs.unlinkSync(tempConfigFile);
    }
  });

  test('deve criar uma instância do ConfigManager', () => {
    expect(configManager).toBeInstanceOf(ConfigManager);
    expect(typeof configManager.get).toBe('function');
    expect(typeof configManager.set).toBe('function');
    expect(typeof configManager.has).toBe('function');
    expect(typeof configManager.remove).toBe('function');
  });

  test('deve carregar configuração do arquivo', () => {
    const appName = configManager.get('app.name');
    expect(appName).toBe('test-app');
    
    const dbConfig = configManager.get('database');
    expect(dbConfig).toEqual({
      host: 'localhost',
      port: 27017
    });
  });

  test('deve obter configuração com notação de ponto', () => {
    expect(configManager.get('app.name')).toBe('test-app');
    expect(configManager.get('app.version')).toBe('1.0.0');
    expect(configManager.get('database.host')).toBe('localhost');
    expect(configManager.get('database.port')).toBe(27017);
  });

  test('deve retornar valor padrão quando chave não existe', () => {
    expect(configManager.get('nonexistent', 'default')).toBe('default');
    expect(configManager.get('app.nonexistent', 'fallback')).toBe('fallback');
  });

  test('deve definir configuração com notação de ponto', () => {
    configManager.set('app.environment', 'test');
    expect(configManager.get('app.environment')).toBe('test');
    
    configManager.set('new.nested.value', 'nested-test');
    expect(configManager.get('new.nested.value')).toBe('nested-test');
  });

  test('deve verificar se chave existe', () => {
    expect(configManager.has('app.name')).toBe(true);
    expect(configManager.has('app.nonexistent')).toBe(false);
    expect(configManager.has('database')).toBe(true);
    expect(configManager.has('nonexistent')).toBe(false);
  });

  test('deve remover configuração', () => {
    expect(configManager.has('app.debug')).toBe(true);
    
    configManager.remove('app.debug');
    expect(configManager.has('app.debug')).toBe(false);
    expect(configManager.get('app.debug')).toBeUndefined();
  });

  test('deve retornar todas as configurações', () => {
    const allConfig = configManager.getAll();
    
    expect(allConfig).toHaveProperty('app');
    expect(allConfig).toHaveProperty('database');
    expect(allConfig.app.name).toBe('test-app');
  });

  test('deve mesclar configurações', () => {
    const newConfig = {
      app: {
        environment: 'production',
        debug: false
      },
      cache: {
        enabled: true
      }
    };
    
    configManager.merge(newConfig);
    
    expect(configManager.get('app.name')).toBe('test-app'); // Mantido
    expect(configManager.get('app.environment')).toBe('production'); // Novo
    expect(configManager.get('app.debug')).toBe(false); // Sobrescrito
    expect(configManager.get('cache.enabled')).toBe(true); // Novo
  });

  test('deve validar tipos de dados', () => {
    expect(() => {
      configManager.set('test.string', 'value');
    }).not.toThrow();
    
    expect(() => {
      configManager.set('test.number', 42);
    }).not.toThrow();
    
    expect(() => {
      configManager.set('test.boolean', true);
    }).not.toThrow();
    
    expect(() => {
      configManager.set('test.object', { key: 'value' });
    }).not.toThrow();
  });

  test('deve recarregar configuração do arquivo', () => {
    // Modificar arquivo diretamente
    const newConfig = {
      app: {
        name: 'reloaded-app'
      }
    };
    
    fs.writeFileSync(tempConfigFile, JSON.stringify(newConfig, null, 2));
    
    configManager.reload();
    
    expect(configManager.get('app.name')).toBe('reloaded-app');
    expect(configManager.has('database')).toBe(false);
  });

  test('deve lidar com arquivo de configuração inexistente', () => {
    const nonExistentFile = path.join(process.cwd(), 'non-existent-config.json');
    
    expect(() => {
      new ConfigManager(nonExistentFile);
    }).not.toThrow();
    
    const emptyConfigManager = new ConfigManager(nonExistentFile);
    expect(emptyConfigManager.getAll()).toEqual({});
    
    // Limpar arquivo criado
    if (fs.existsSync(nonExistentFile)) {
      fs.unlinkSync(nonExistentFile);
    }
  });

  test('deve lidar com JSON inválido', () => {
    const invalidJsonFile = path.join(process.cwd(), 'invalid-config.json');
    fs.writeFileSync(invalidJsonFile, '{ invalid json }');
    
    expect(() => {
      new ConfigManager(invalidJsonFile);
    }).toThrow();
    
    // Limpar arquivo
    fs.unlinkSync(invalidJsonFile);
  });

  test('deve salvar configuração no arquivo', () => {
    configManager.set('new.setting', 'test-value');
    configManager.save();
    
    // Criar nova instância para verificar persistência
    const newConfigManager = new ConfigManager(tempConfigFile);
    expect(newConfigManager.get('new.setting')).toBe('test-value');
  });

  test('deve lidar com estruturas aninhadas complexas', () => {
    const complexConfig = {
      level1: {
        level2: {
          level3: {
            value: 'deep-value'
          }
        }
      }
    };
    
    configManager.set('complex', complexConfig);
    
    expect(configManager.get('complex.level1.level2.level3.value')).toBe('deep-value');
    expect(configManager.get('complex.level1.level2')).toEqual({
      level3: { value: 'deep-value' }
    });
  });

  test('deve preservar tipos de dados ao salvar e carregar', () => {
    configManager.set('types.string', 'text');
    configManager.set('types.number', 42);
    configManager.set('types.boolean', true);
    configManager.set('types.array', [1, 2, 3]);
    configManager.set('types.null', null);
    
    configManager.save();
    
    const reloadedManager = new ConfigManager(tempConfigFile);
    
    expect(reloadedManager.get('types.string')).toBe('text');
    expect(reloadedManager.get('types.number')).toBe(42);
    expect(reloadedManager.get('types.boolean')).toBe(true);
    expect(reloadedManager.get('types.array')).toEqual([1, 2, 3]);
    expect(reloadedManager.get('types.null')).toBeNull();
  });
});