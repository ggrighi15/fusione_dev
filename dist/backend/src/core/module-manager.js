/**
 * Gerenciador de Módulos do Fusione Core System
 * Responsável por carregar, gerenciar e descarregar módulos dinamicamente
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ModuleManager {
  constructor(eventBus, logger, configManager, core) {
    this.eventBus = eventBus;
    this.logger = logger;
    this.configManager = configManager;
    this.core = core;
    this.modules = new Map();
    this.moduleConfigs = new Map();
    this.moduleOrder = [];
    this.modulesPath = path.join(process.cwd(), 'src', 'modules');
  }

  /**
   * Carrega todos os módulos disponíveis
   */
  async loadModules() {
    try {
      this.logger.info('Iniciando carregamento de módulos...');
      
      // Verificar se o diretório de módulos existe
      try {
        await fs.access(this.modulesPath);
      } catch {
        this.logger.warn(`Diretório de módulos não encontrado: ${this.modulesPath}`);
        await fs.mkdir(this.modulesPath, { recursive: true });
        this.logger.info('Diretório de módulos criado');
        return;
      }

      // Listar diretórios de módulos
      const moduleDirectories = await this.getModuleDirectories();
      this.logger.info(`Módulos encontrados: [${moduleDirectories.join(', ')}]`);
      
      if (moduleDirectories.length === 0) {
        this.logger.info('Nenhum módulo encontrado para carregar');
        return;
      }

      // Carregar cada módulo
      for (const moduleDir of moduleDirectories) {
        try {
          this.logger.info(`Tentando carregar módulo: ${moduleDir}`);
          await this.loadModule(moduleDir);
          this.logger.info(`Módulo ${moduleDir} carregado com sucesso`);
        } catch (error) {
          this.logger.error(`Erro ao carregar módulo ${moduleDir}:`, error);
          // Continuar carregando outros módulos mesmo se um falhar
        }
      }

      this.logger.info(`Carregamento de módulos concluído. Módulos carregados: ${this.modules.size}`);
      this.eventBus.emit('modules:loaded', {
        count: this.modules.size,
        modules: Array.from(this.modules.keys())
      });
      
    } catch (error) {
      this.logger.error('Erro ao carregar módulos:', error);
      throw error;
    }
  }

  /**
   * Carrega um módulo específico
   * @param {string} moduleName - Nome do módulo
   */
  async loadModule(moduleName) {
    try {
      this.logger.info(`Carregando módulo: ${moduleName}`);
      
      const modulePath = path.join(this.modulesPath, moduleName);
      const configPath = path.join(modulePath, 'module.json');
      const indexPath = path.join(modulePath, 'index.js');

      // Verificar se os arquivos necessários existem
      try {
        await fs.access(configPath);
        await fs.access(indexPath);
      } catch (error) {
        this.logger.error(`Arquivos necessários não encontrados para o módulo ${moduleName}:`, error);
        throw new Error(`Arquivos necessários não encontrados para o módulo ${moduleName}`);
      }

      // Carregar configuração do módulo
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      
      // Validar configuração
      this.validateModuleConfig(config);
      
      // Importar módulo
      const moduleUrl = `file://${indexPath}`;
      this.logger.info(`Importando módulo ${moduleName} de: ${moduleUrl}`);
      
      let moduleExports;
      try {
        moduleExports = await import(moduleUrl);
      } catch (importError) {
        this.logger.error(`Erro ao importar módulo ${moduleName}:`, importError);
        throw new Error(`Erro ao importar módulo ${moduleName}: ${importError.message}`);
      }
      
      if (!moduleExports.default) {
        this.logger.error(`Módulo ${moduleName} não exporta uma classe padrão`);
        throw new Error(`Módulo ${moduleName} deve exportar uma classe padrão`);
      }

      // Instanciar módulo
      const ModuleClass = moduleExports.default;
      let moduleInstance;
      try {
        moduleInstance = new ModuleClass(this.core);
      } catch (instanceError) {
        this.logger.error(`Erro ao instanciar módulo ${moduleName}:`, instanceError);
        throw new Error(`Erro ao instanciar módulo ${moduleName}: ${instanceError.message}`);
      }

      // Verificar se o módulo implementa a interface necessária
      if (typeof moduleInstance.initialize !== 'function') {
        this.logger.error(`Módulo ${moduleName} deve implementar o método initialize()`);
        throw new Error(`Módulo ${moduleName} deve implementar o método initialize()`);
      }

      // Registrar módulo antes da verificação de dependências
      this.modules.set(moduleName, moduleInstance);
      this.moduleConfigs.set(moduleName, config);
      
      this.logger.info(`Módulo ${moduleName} registrado. Módulos carregados: [${Array.from(this.modules.keys()).join(', ')}]`);
      
      // Verificar dependências
      if (config.dependencies) {
        this.logger.info(`Verificando dependências para ${moduleName}: [${config.dependencies.join(', ')}]`);
        await this.checkDependencies(config.dependencies, moduleName);
      }

      // Inicializar módulo
      await moduleInstance.initialize();

      this.logger.info(`Módulo ${moduleName} carregado com sucesso`, {
        version: config.version,
        description: config.description
      });

      this.eventBus.emit('module:loaded', {
        name: moduleName,
        config
      });

    } catch (error) {
      this.logger.error(`Erro ao carregar módulo ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Descarrega um módulo específico
   * @param {string} moduleName - Nome do módulo
   */
  async unloadModule(moduleName) {
    try {
      const moduleInstance = this.modules.get(moduleName);
      
      if (!moduleInstance) {
        this.logger.warn(`Módulo ${moduleName} não está carregado`);
        return;
      }

      // Chamar método de cleanup se existir
      if (typeof moduleInstance.cleanup === 'function') {
        await moduleInstance.cleanup();
      }

      // Remover módulo
      this.modules.delete(moduleName);
      this.moduleConfigs.delete(moduleName);

      this.logger.info(`Módulo ${moduleName} descarregado com sucesso`);
      
      this.eventBus.emit('module:unloaded', {
        name: moduleName
      });

    } catch (error) {
      this.logger.error(`Erro ao descarregar módulo ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Descarrega todos os módulos
   */
  async unloadModules() {
    this.logger.info('Descarregando todos os módulos...');
    
    const moduleNames = Array.from(this.modules.keys());
    
    for (const moduleName of moduleNames) {
      await this.unloadModule(moduleName);
    }
    
    this.logger.info('Todos os módulos foram descarregados');
  }

  /**
   * Recarrega um módulo específico
   * @param {string} moduleName - Nome do módulo
   */
  async reloadModule(moduleName) {
    this.logger.info(`Recarregando módulo ${moduleName}...`);
    
    await this.unloadModule(moduleName);
    await this.loadModule(moduleName);
    
    this.logger.info(`Módulo ${moduleName} recarregado com sucesso`);
  }

  /**
   * Obtém informações sobre os módulos carregados
   * @returns {Array} Lista de módulos carregados
   */
  getLoadedModules() {
    return Array.from(this.modules.entries()).map(([name, instance]) => {
      const config = this.moduleConfigs.get(name);
      return {
        name,
        version: config?.version,
        description: config?.description,
        status: 'loaded'
      };
    });
  }

  /**
   * Obtém uma instância de módulo específica
   * @param {string} moduleName - Nome do módulo
   * @returns {Object|null} Instância do módulo
   */
  getModule(moduleName) {
    return this.modules.get(moduleName) || null;
  }

  /**
   * Obtém diretórios de módulos disponíveis ordenados por prioridade
   * @returns {Array} Lista de nomes de módulos ordenados por prioridade
   */
  async getModuleDirectories() {
    const items = await fs.readdir(this.modulesPath, { withFileTypes: true });
    const moduleNames = items
      .filter(item => item.isDirectory())
      .map(item => item.name)
      .filter(name => !name.startsWith('.'));
    
    // Carregar configurações para ordenar por prioridade
    const modulesWithPriority = [];
    
    for (const moduleName of moduleNames) {
      try {
        const configPath = path.join(this.modulesPath, moduleName, 'module.json');
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        
        if (config.enabled !== false) {
          modulesWithPriority.push({
            name: moduleName,
            priority: config.priority || 999
          });
        }
      } catch (error) {
        this.logger.warn(`Erro ao ler configuração do módulo ${moduleName}:`, error);
      }
    }
    
    // Ordenar por prioridade (menor número = maior prioridade)
    modulesWithPriority.sort((a, b) => a.priority - b.priority);
    
    return modulesWithPriority.map(m => m.name);
  }

  /**
   * Valida a configuração de um módulo
   * @param {Object} config - Configuração do módulo
   */
  validateModuleConfig(config) {
    const required = ['name', 'version', 'description'];
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Campo obrigatório '${field}' não encontrado na configuração do módulo`);
      }
    }

    if (config.version && !/^\d+\.\d+\.\d+/.test(config.version)) {
      throw new Error('Versão do módulo deve seguir o formato semver (x.y.z)');
    }
  }

  /**
   * Verifica dependências de um módulo
   * @param {Array} dependencies - Lista de dependências
   * @param {string} moduleName - Nome do módulo
   */
  async checkDependencies(dependencies, moduleName) {
    if (!dependencies || !Array.isArray(dependencies) || dependencies.length === 0) {
      return; // Sem dependências para verificar
    }
    
    for (const dependency of dependencies) {
      if (!this.modules.has(dependency)) {
        throw new Error(`Módulo ${moduleName} depende de ${dependency}, mas este não está carregado`);
      }
    }
  }
}