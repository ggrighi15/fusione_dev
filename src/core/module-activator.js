import { EventEmitter } from 'events';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ativador de Módulos do Sistema Fusione Core
 * Responsável por carregar, inicializar e gerenciar todos os módulos
 */
class ModuleActivator extends EventEmitter {
  constructor(core) {
    super();
    this.core = core;
    this.logger = core.logger;
    this.modules = new Map();
    this.moduleConfigs = new Map();
    this.loadOrder = [];
    this.isInitialized = false;
    
    this.modulesPath = path.join(__dirname, '../modules');
  }

  /**
   * Descobre todos os módulos disponíveis
   */
  async discoverModules() {
    try {
      this.logger.info('🔍 Descobrindo módulos disponíveis...');
      
      const moduleDirectories = await fs.readdir(this.modulesPath, { withFileTypes: true });
      const modules = [];
      
      for (const dir of moduleDirectories) {
        if (dir.isDirectory()) {
          const modulePath = path.join(this.modulesPath, dir.name);
          const configPath = path.join(modulePath, 'module.json');
          const indexPath = path.join(modulePath, 'index.js');
          
          // Verifica se o módulo tem os arquivos necessários
          try {
            await fs.access(configPath);
            await fs.access(indexPath);
            
            // Carrega configuração do módulo
            const configData = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configData);
            
            if (config.enabled !== false) {
              config.path = modulePath;
              config.indexPath = indexPath;
              this.moduleConfigs.set(config.name, config);
              modules.push(config);
              
              this.logger.info(`📦 Módulo descoberto: ${config.name} v${config.version}`);
            } else {
              this.logger.warn(`⚠️ Módulo desabilitado: ${config.name}`);
            }
          } catch (error) {
            this.logger.warn(`⚠️ Módulo inválido em ${dir.name}: ${error.message}`);
          }
        }
      }
      
      // Ordena módulos por prioridade
      modules.sort((a, b) => (a.priority || 10) - (b.priority || 10));
      this.loadOrder = modules.map(m => m.name);
      
      this.logger.info(`✅ ${modules.length} módulos descobertos`);
      return modules;
    } catch (error) {
      this.logger.error('❌ Erro ao descobrir módulos:', error);
      throw error;
    }
  }

  /**
   * Carrega um módulo específico
   */
  async loadModule(moduleName) {
    try {
      const config = this.moduleConfigs.get(moduleName);
      if (!config) {
        throw new Error(`Configuração do módulo ${moduleName} não encontrada`);
      }
      
      this.logger.info(`🔄 Carregando módulo: ${moduleName}`);
      
      // Importa o módulo dinamicamente
      const moduleUrl = `file://${config.indexPath}`;
      const moduleExport = await import(moduleUrl);
      
      // Instancia o módulo
      let moduleInstance;
      if (moduleExport.default) {
        moduleInstance = new moduleExport.default(this.core);
      } else {
        // Tenta encontrar a classe principal
        const ModuleClass = Object.values(moduleExport).find(exp => 
          typeof exp === 'function' && exp.prototype
        );
        if (ModuleClass) {
          moduleInstance = new ModuleClass(this.core);
        } else {
          throw new Error(`Classe principal não encontrada no módulo ${moduleName}`);
        }
      }
      
      // Configura propriedades básicas
      moduleInstance.name = moduleName;
      moduleInstance.config = config;
      moduleInstance.logger = this.logger;
      
      this.modules.set(moduleName, moduleInstance);
      
      this.logger.info(`✅ Módulo carregado: ${moduleName}`);
      return moduleInstance;
    } catch (error) {
      this.logger.error(`❌ Erro ao carregar módulo ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Inicializa um módulo específico
   */
  async initializeModule(moduleName) {
    try {
      const module = this.modules.get(moduleName);
      if (!module) {
        throw new Error(`Módulo ${moduleName} não foi carregado`);
      }
      
      this.logger.info(`🚀 Inicializando módulo: ${moduleName}`);
      
      // Prepara dependências
      const dependencies = {
        logger: this.logger,
        eventBus: this.core.eventBus,
        database: this.core.database,
        cacheManager: this.core.cacheManager,
        configManager: this.core.configManager,
        core: this.core
      };
      
      // Inicializa o módulo
      if (typeof module.initialize === 'function') {
        await module.initialize(dependencies);
      }
      
      // Registra eventos
      this.registerModuleEvents(module);
      
      // Marca como inicializado
      module.isInitialized = true;
      
      this.logger.info(`✅ Módulo inicializado: ${moduleName}`);
      this.emit('module:initialized', { name: moduleName, module });
      
      return module;
    } catch (error) {
      this.logger.error(`❌ Erro ao inicializar módulo ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Registra eventos do módulo
   */
  registerModuleEvents(module) {
    const config = module.config;
    
    if (config.events && config.events.listen) {
      for (const eventName of config.events.listen) {
        if (typeof module.handleEvent === 'function') {
          this.core.eventBus.on(eventName, (data) => {
            module.handleEvent(eventName, data);
          });
        }
      }
    }
  }

  /**
   * Ativa todos os módulos
   */
  async activateAllModules() {
    try {
      this.logger.info('🚀 Iniciando ativação de todos os módulos...');
      
      // Descobre módulos
      await this.discoverModules();
      
      // Carrega módulos na ordem de prioridade
      for (const moduleName of this.loadOrder) {
        try {
          await this.loadModule(moduleName);
        } catch (error) {
          this.logger.error(`❌ Falha ao carregar ${moduleName}:`, error.message);
        }
      }
      
      // Inicializa módulos na ordem de prioridade
      for (const moduleName of this.loadOrder) {
        try {
          if (this.modules.has(moduleName)) {
            await this.initializeModule(moduleName);
          }
        } catch (error) {
          this.logger.error(`❌ Falha ao inicializar ${moduleName}:`, error.message);
        }
      }
      
      this.isInitialized = true;
      
      const activeModules = Array.from(this.modules.keys());
      this.logger.info(`🎉 Ativação concluída! ${activeModules.length} módulos ativos:`);
      activeModules.forEach(name => {
        const config = this.moduleConfigs.get(name);
        this.logger.info(`   ✅ ${name} v${config.version} - ${config.description}`);
      });
      
      this.emit('modules:activated', { modules: activeModules });
      
      return activeModules;
    } catch (error) {
      this.logger.error('❌ Erro na ativação de módulos:', error);
      throw error;
    }
  }

  /**
   * Desativa um módulo específico
   */
  async deactivateModule(moduleName) {
    try {
      const module = this.modules.get(moduleName);
      if (!module) {
        throw new Error(`Módulo ${moduleName} não está ativo`);
      }
      
      this.logger.info(`🛑 Desativando módulo: ${moduleName}`);
      
      // Chama método de cleanup se existir
      if (typeof module.cleanup === 'function') {
        await module.cleanup();
      }
      
      // Remove da lista de módulos ativos
      this.modules.delete(moduleName);
      
      this.logger.info(`✅ Módulo desativado: ${moduleName}`);
      this.emit('module:deactivated', { name: moduleName });
      
    } catch (error) {
      this.logger.error(`❌ Erro ao desativar módulo ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Reinicia um módulo específico
   */
  async restartModule(moduleName) {
    try {
      this.logger.info(`🔄 Reiniciando módulo: ${moduleName}`);
      
      await this.deactivateModule(moduleName);
      await this.loadModule(moduleName);
      await this.initializeModule(moduleName);
      
      this.logger.info(`✅ Módulo reiniciado: ${moduleName}`);
      this.emit('module:restarted', { name: moduleName });
      
    } catch (error) {
      this.logger.error(`❌ Erro ao reiniciar módulo ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Obtém status de todos os módulos
   */
  getModulesStatus() {
    const status = {
      total: this.moduleConfigs.size,
      active: this.modules.size,
      modules: []
    };
    
    for (const [name, config] of this.moduleConfigs) {
      const module = this.modules.get(name);
      status.modules.push({
        name,
        version: config.version,
        description: config.description,
        enabled: config.enabled !== false,
        active: !!module,
        initialized: module?.isInitialized || false,
        priority: config.priority || 10
      });
    }
    
    return status;
  }

  /**
   * Obtém um módulo específico
   */
  getModule(moduleName) {
    return this.modules.get(moduleName);
  }

  /**
   * Lista todos os módulos ativos
   */
  getActiveModules() {
    return Array.from(this.modules.keys());
  }
}

export { ModuleActivator };