/**
 * Testes para o ModuleManager
 * Testa a funcionalidade do gerenciamento de módulos
 */

const { ModuleManager } = require('../../src/core/module-manager.js');
const { EventBus } = require('../../src/core/event-bus.js');
const { createLogger } = require('../../src/core/logger.js');
const fs = require('fs');
const path = require('path');

describe('ModuleManager', () => {
  let moduleManager;
  let eventBus;
  let logger;
  let tempModulesDir;

  beforeEach(() => {
    eventBus = new EventBus();
    logger = createLogger('test');
    
    // Criar diretório temporário para módulos de teste
    tempModulesDir = path.join(process.cwd(), 'temp-modules');
    if (!fs.existsSync(tempModulesDir)) {
      fs.mkdirSync(tempModulesDir, { recursive: true });
    }

    moduleManager = new ModuleManager({
      eventBus,
      logger,
      modulesPath: tempModulesDir
    });
  });

  afterEach(() => {
    // Limpar módulos carregados
    if (moduleManager) {
      try {
        moduleManager.unloadAllModules();
      } catch (error) {
        // Ignorar erros de cleanup
      }
    }
    
    // Remover diretório temporário
    if (fs.existsSync(tempModulesDir)) {
      fs.rmSync(tempModulesDir, { recursive: true, force: true });
    }
  });

  test('deve criar uma instância do ModuleManager', () => {
    expect(moduleManager).toBeInstanceOf(ModuleManager);
    expect(typeof moduleManager.loadModule).toBe('function');
    expect(typeof moduleManager.unloadModule).toBe('function');
    expect(typeof moduleManager.getLoadedModules).toBe('function');
  });

  test('deve descobrir módulos no diretório', async () => {
    // Criar módulo de teste
    const testModuleDir = path.join(tempModulesDir, 'test-module');
    fs.mkdirSync(testModuleDir, { recursive: true });
    
    const moduleConfig = {
      name: 'test-module',
      version: '1.0.0',
      description: 'Módulo de teste'
    };
    
    fs.writeFileSync(
      path.join(testModuleDir, 'module.json'), 
      JSON.stringify(moduleConfig, null, 2)
    );

    const discoveredModules = await moduleManager.discoverModules();
    
    expect(Array.isArray(discoveredModules)).toBe(true);
    expect(discoveredModules).toContain('test-module');
  });

  test('deve validar configuração de módulo', () => {
    const validConfig = {
      name: 'valid-module',
      version: '1.0.0',
      description: 'Módulo válido'
    };
    
    expect(() => {
      moduleManager.validateModuleConfig(validConfig);
    }).not.toThrow();

    // Configurações inválidas
    const invalidConfigs = [
      { version: '1.0.0', description: 'Sem nome' },
      { name: 'test', description: 'Sem versão' },
      { name: 'test', version: '1.0.0' } // Sem descrição
    ];

    for (const config of invalidConfigs) {
      expect(() => {
        moduleManager.validateModuleConfig(config);
      }).toThrow();
    }
  });

  test('deve retornar lista vazia quando não há módulos carregados', () => {
    const loadedModules = moduleManager.getLoadedModules();
    expect(loadedModules).toEqual({});
  });

  test('deve lidar com diretório de módulos inexistente', async () => {
    const nonExistentDir = path.join(process.cwd(), 'non-existent-modules');
    
    const managerWithInvalidDir = new ModuleManager({
      eventBus,
      logger,
      modulesPath: nonExistentDir
    });

    const discoveredModules = await managerWithInvalidDir.discoverModules();
    expect(Array.isArray(discoveredModules)).toBe(true);
    expect(discoveredModules).toHaveLength(0);
  });

  test('deve ignorar diretórios sem module.json', async () => {
    // Criar diretório sem module.json
    const invalidModuleDir = path.join(tempModulesDir, 'invalid-module');
    fs.mkdirSync(invalidModuleDir, { recursive: true });
    fs.writeFileSync(path.join(invalidModuleDir, 'index.js'), 'export default {};');

    const discoveredModules = await moduleManager.discoverModules();
    expect(discoveredModules).not.toContain('invalid-module');
  });

  test('deve ignorar arquivos JSON inválidos', async () => {
    // Criar módulo com JSON inválido
    const invalidJsonDir = path.join(tempModulesDir, 'invalid-json');
    fs.mkdirSync(invalidJsonDir, { recursive: true });
    fs.writeFileSync(path.join(invalidJsonDir, 'module.json'), '{ invalid json }');

    const discoveredModules = await moduleManager.discoverModules();
    expect(discoveredModules).not.toContain('invalid-json');
  });

  test('deve validar versão do módulo', () => {
    const validVersions = ['1.0.0', '2.1.3', '0.0.1'];
    const invalidVersions = ['1.0', 'v1.0.0', '1.0.0-beta', 'invalid'];

    for (const version of validVersions) {
      const config = {
        name: 'test',
        version,
        description: 'Test module'
      };
      
      expect(() => {
        moduleManager.validateModuleConfig(config);
      }).not.toThrow();
    }

    for (const version of invalidVersions) {
      const config = {
        name: 'test',
        version,
        description: 'Test module'
      };
      
      expect(() => {
        moduleManager.validateModuleConfig(config);
      }).toThrow();
    }
  });

  test('deve validar nome do módulo', () => {
    const validNames = ['test-module', 'test_module', 'testmodule', 'test123'];
    const invalidNames = ['', 'test module', 'test@module', '123test'];

    for (const name of validNames) {
      const config = {
        name,
        version: '1.0.0',
        description: 'Test module'
      };
      
      expect(() => {
        moduleManager.validateModuleConfig(config);
      }).not.toThrow();
    }

    for (const name of invalidNames) {
      const config = {
        name,
        version: '1.0.0',
        description: 'Test module'
      };
      
      expect(() => {
        moduleManager.validateModuleConfig(config);
      }).toThrow();
    }
  });

  test('deve retornar estatísticas corretas', () => {
    const stats = moduleManager.getStats();
    
    expect(stats).toHaveProperty('totalModules');
    expect(stats).toHaveProperty('loadedModules');
    expect(stats).toHaveProperty('availableModules');
    expect(typeof stats.totalModules).toBe('number');
    expect(typeof stats.loadedModules).toBe('number');
    expect(typeof stats.availableModules).toBe('number');
  });
});