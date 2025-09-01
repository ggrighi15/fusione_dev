#!/usr/bin/env node

import { CoreSystem } from './src/core/core-system.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Script de Ativação de Módulos do Fusione Core System
 * 
 * Este script inicializa o sistema core e ativa todos os módulos disponíveis
 */

class ModuleActivationScript {
  constructor() {
    this.coreSystem = null;
    this.isRunning = false;
  }

  /**
   * Cria diretório de logs se não existir
   */
  async ensureLogsDirectory() {
    const logsDir = path.join(process.cwd(), 'logs');
    try {
      await fs.access(logsDir);
    } catch {
      await fs.mkdir(logsDir, { recursive: true });
      console.log('📁 Diretório de logs criado:', logsDir);
    }
  }

  /**
   * Exibe banner de inicialização
   */
  showBanner() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 FUSIONE CORE SYSTEM - ATIVAÇÃO DE MÓDULOS');
    console.log('='.repeat(60));
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));
    console.log('📂 Diretório:', process.cwd());
    console.log('🔧 Node.js:', process.version);
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Configura manipuladores de sinais do sistema
   */
  setupSignalHandlers() {
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Recebido sinal ${signal}. Iniciando shutdown graceful...`);
      
      if (this.coreSystem && this.isRunning) {
        try {
          await this.coreSystem.shutdown();
          console.log('✅ Shutdown concluído com sucesso');
        } catch (error) {
          console.error('❌ Erro durante shutdown:', error.message);
        }
      }
      
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    
    // Tratamento de erros não capturados
    process.on('uncaughtException', (error) => {
      console.error('❌ Erro não capturado:', error);
      if (this.coreSystem) {
        this.coreSystem.logger.error('Uncaught Exception:', error);
      }
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Promise rejeitada não tratada:', reason);
      if (this.coreSystem) {
        this.coreSystem.logger.error('Unhandled Rejection:', { reason, promise });
      }
    });
  }

  /**
   * Monitora status do sistema
   */
  startSystemMonitoring() {
    if (!this.coreSystem) return;

    // Monitora eventos do sistema
    this.coreSystem.eventBus.on('system:ready', () => {
      console.log('🎉 Sistema pronto! Todos os módulos foram ativados.');
      this.showSystemStatus();
    });

    this.coreSystem.eventBus.on('module:ready', (data) => {
      console.log(`✅ Módulo pronto: ${data.name}`);
    });

    this.coreSystem.eventBus.on('system:memory', (memInfo) => {
      // Log de memória apenas se uso for alto
      const heapUsed = parseInt(memInfo.heapUsed);
      if (heapUsed > 100) { // Mais de 100MB
        console.log(`📊 Uso de memória: ${memInfo.heapUsed} (RSS: ${memInfo.rss})`);
      }
    });

    // Status periódico
    setInterval(() => {
      if (this.isRunning) {
        const status = this.coreSystem.getSystemStatus();
        console.log(`\n📈 Status do Sistema [${new Date().toLocaleTimeString('pt-BR')}]:`);
        console.log(`   ⏱️  Uptime: ${status.system.uptimeFormatted}`);
        console.log(`   🧠 Memória: ${status.resources.memory.heapUsed}`);
        console.log(`   📦 Módulos ativos: ${status.modules.active}/${status.modules.total}`);
        console.log(`   💾 Cache: ${status.resources.cache.size} itens`);
      }
    }, 300000); // A cada 5 minutos
  }

  /**
   * Exibe status detalhado do sistema
   */
  showSystemStatus() {
    if (!this.coreSystem) return;

    const status = this.coreSystem.getSystemStatus();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 STATUS DO SISTEMA');
    console.log('='.repeat(60));
    
    console.log('🖥️  Sistema:');
    console.log(`   Nome: ${status.system.name}`);
    console.log(`   Versão: ${status.system.version}`);
    console.log(`   Ambiente: ${status.system.environment}`);
    console.log(`   Uptime: ${status.system.uptimeFormatted}`);
    
    console.log('\n🧠 Recursos:');
    console.log(`   Memória RSS: ${status.resources.memory.rss}`);
    console.log(`   Heap Total: ${status.resources.memory.heapTotal}`);
    console.log(`   Heap Usado: ${status.resources.memory.heapUsed}`);
    console.log(`   Cache: ${status.resources.cache.size} itens`);
    
    console.log('\n📦 Módulos:');
    console.log(`   Total: ${status.modules.total}`);
    console.log(`   Ativos: ${status.modules.active}`);
    
    if (status.modules.modules.length > 0) {
      console.log('\n📋 Lista de Módulos:');
      status.modules.modules.forEach(module => {
        const statusIcon = module.active ? '✅' : (module.enabled ? '⏸️' : '❌');
        console.log(`   ${statusIcon} ${module.name} v${module.version}`);
        console.log(`      ${module.description}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Executa a ativação dos módulos
   */
  async run() {
    try {
      // Preparação
      this.showBanner();
      await this.ensureLogsDirectory();
      this.setupSignalHandlers();
      
      // Inicialização do sistema core
      console.log('🔧 Inicializando Fusione Core System...');
      this.coreSystem = new CoreSystem();
      
      // Configura monitoramento
      this.startSystemMonitoring();
      
      // Inicializa o sistema
      await this.coreSystem.initialize();
      console.log('✅ Sistema core inicializado com sucesso!');
      
      // Ativa todos os módulos
      console.log('\n🚀 Iniciando ativação de módulos...');
      const activeModules = await this.coreSystem.activateModules();
      
      this.isRunning = true;
      
      console.log('\n🎉 ATIVAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log(`📦 ${activeModules.length} módulos foram ativados:`);
      activeModules.forEach(name => {
        console.log(`   ✅ ${name}`);
      });
      
      // Exibe status inicial
      setTimeout(() => {
        this.showSystemStatus();
      }, 2000);
      
      // Mantém o processo ativo
      console.log('\n🔄 Sistema em execução. Pressione Ctrl+C para parar.');
      console.log('📊 Status será exibido a cada 5 minutos.\n');
      
      // Mantém o processo vivo
      setInterval(() => {
        // Heartbeat silencioso
      }, 1000);
      
    } catch (error) {
      console.error('\n❌ ERRO CRÍTICO na ativação de módulos:');
      console.error('   Mensagem:', error.message);
      if (error.stack) {
        console.error('   Stack:', error.stack);
      }
      
      if (this.coreSystem && this.coreSystem.logger) {
        this.coreSystem.logger.error('Erro crítico na ativação:', error);
      }
      
      process.exit(1);
    }
  }
}

// Executa o script se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith('activate-modules.js')) {
  console.log('🚀 Iniciando script de ativação de módulos...');
  const activationScript = new ModuleActivationScript();
  activationScript.run().catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

export { ModuleActivationScript };
export default ModuleActivationScript;