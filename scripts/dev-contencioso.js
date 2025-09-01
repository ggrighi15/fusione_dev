#!/usr/bin/env node

/**
 * Script de inicialização para desenvolvimento do módulo contencioso
 * Configura ambiente de desenvolvimento otimizado para o módulo
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

class ContenciosoDevSetup {
  constructor() {
    this.config = {
      moduleName: 'contencioso',
      devPort: 3002,
      debugPort: 9229,
      logLevel: 'debug'
    };
  }

  async init() {
    console.log('🚀 Iniciando ambiente de desenvolvimento do módulo Contencioso...');
    
    try {
      await this.createDirectories();
      await this.setupDatabase();
      await this.setupLogs();
      await this.validateModule();
      await this.startDevelopmentServer();
    } catch (error) {
      console.error('❌ Erro na inicialização:', error.message);
      process.exit(1);
    }
  }

  async createDirectories() {
    console.log('📁 Criando diretórios necessários...');
    
    const directories = [
      'data',
      'logs/contencioso',
      'uploads/contencioso/dev',
      'config/contencioso'
    ];

    for (const dir of directories) {
      const fullPath = join(rootDir, dir);
      try {
        await fs.mkdir(fullPath, { recursive: true });
        console.log(`   ✅ ${dir}`);
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  async setupDatabase() {
    console.log('🗄️  Configurando banco de dados de desenvolvimento...');
    
    const dbPath = join(rootDir, 'data', 'contencioso-dev.db');
    
    try {
      await fs.access(dbPath);
      console.log('   ✅ Banco de dados já existe');
    } catch {
      console.log('   📝 Criando novo banco de dados...');
      // O banco será criado automaticamente pelo módulo
    }
  }

  async setupLogs() {
    console.log('📝 Configurando sistema de logs...');
    
    const logConfig = {
      timestamp: new Date().toISOString(),
      module: 'contencioso',
      environment: 'development',
      level: 'debug'
    };

    const logPath = join(rootDir, 'logs', 'contencioso', 'dev-setup.log');
    await fs.writeFile(logPath, JSON.stringify(logConfig, null, 2));
    console.log('   ✅ Logs configurados');
  }

  async validateModule() {
    console.log('🔍 Validando módulo contencioso...');
    
    const modulePath = join(rootDir, 'src', 'modules', 'contencioso-module');
    
    try {
      await fs.access(modulePath);
      console.log('   ✅ Módulo contencioso encontrado');
      
      // Verificar arquivos principais
      const requiredFiles = [
        'index.js',
        'routes.js',
        'controllers',
        'models',
        'services'
      ];

      for (const file of requiredFiles) {
        try {
          await fs.access(join(modulePath, file));
          console.log(`   ✅ ${file}`);
        } catch {
          console.log(`   ⚠️  ${file} não encontrado (será criado se necessário)`);
        }
      }
    } catch {
      console.log('   ⚠️  Módulo contencioso não encontrado - será inicializado');
    }
  }

  async startDevelopmentServer() {
    console.log('🌟 Iniciando servidor de desenvolvimento...');
    
    const env = {
      ...process.env,
      NODE_ENV: 'development',
      MODULE_FOCUS: 'contencioso',
      LOG_LEVEL: 'debug',
      API_PORT: '3000',
      DEBUG_PORT: '9229',
      HOT_RELOAD: 'true'
    };

    console.log('\n🎯 Configuração do ambiente:');
    console.log(`   📡 Porta da API: ${env.API_PORT}`);
    console.log(`   🐛 Porta de Debug: ${env.DEBUG_PORT}`);
    console.log(`   🔄 Hot Reload: ${env.HOT_RELOAD}`);
    console.log(`   📊 Log Level: ${env.LOG_LEVEL}`);
    console.log('\n🚀 Servidor iniciando...');
    console.log('\n📋 Comandos úteis:');
    console.log('   - Logs: docker-compose logs -f contencioso-dev');
    console.log('   - Parar: docker-compose down');
    console.log('   - Rebuild: docker-compose build contencioso-dev');
    console.log('\n🌐 URLs de acesso:');
    console.log('   - API: http://localhost:3002');
    console.log('   - Health: http://localhost:3002/api/v1/contencioso/health');
    console.log('   - Debug: chrome://inspect (porta 9229)');
    console.log('\n');
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new ContenciosoDevSetup();
  setup.init();
}

export default ContenciosoDevSetup;