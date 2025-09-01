#!/usr/bin/env node
/**
 * Script de Configuração Inicial do Fusione Core System
 * Instala dependências, configura banco de dados e inicializa módulos
 * 
 * @author Fusione Core System
 * @version 1.0.0
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

class FusioneSetup {
  constructor() {
    this.logger = {
      info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
      success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
      warning: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
      error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`)
    };
  }

  async run() {
    try {
      this.logger.info('🚀 Iniciando configuração do Fusione Core System...');
      
      await this.checkPrerequisites();
      await this.setupEnvironment();
      await this.installDependencies();
      await this.setupDatabase();
      await this.initializeModules();
      await this.runTests();
      
      this.logger.success('✅ Configuração concluída com sucesso!');
      this.printNextSteps();
    } catch (error) {
      this.logger.error(`❌ Erro durante a configuração: ${error.message}`);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    this.logger.info('🔍 Verificando pré-requisitos...');
    
    // Verificar Node.js
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
      
      if (majorVersion < 18) {
        throw new Error(`Node.js 18+ é necessário. Versão atual: ${nodeVersion}`);
      }
      
      this.logger.success(`Node.js ${nodeVersion} ✓`);
    } catch (error) {
      throw new Error('Node.js não encontrado. Instale Node.js 18+ antes de continuar.');
    }

    // Verificar npm
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      this.logger.success(`npm ${npmVersion} ✓`);
    } catch (error) {
      throw new Error('npm não encontrado.');
    }

    // Verificar Docker (opcional)
    try {
      const dockerVersion = execSync('docker --version', { encoding: 'utf8' }).trim();
      this.logger.success(`${dockerVersion} ✓`);
    } catch (error) {
      this.logger.warning('Docker não encontrado (opcional para desenvolvimento local)');
    }
  }

  async setupEnvironment() {
    this.logger.info('⚙️ Configurando ambiente...');
    
    const envExamplePath = path.join(rootDir, '.env.example');
    const envPath = path.join(rootDir, '.env');
    
    if (!fs.existsSync(envPath)) {
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        this.logger.success('Arquivo .env criado a partir do .env.example');
        this.logger.warning('⚠️ Configure as variáveis de ambiente no arquivo .env antes de continuar');
      } else {
        // Criar .env básico
        const defaultEnv = `# Fusione Core System - Configurações de Ambiente

# Aplicação
NODE_ENV=development
API_PORT=3000
API_HOST=localhost
LOG_LEVEL=debug

# Segurança
JWT_SECRET=fusione-jwt-secret-change-in-production
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Banco de Dados
# Database configuration removed - MongoDB and Redis no longer used

# Email (opcional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# Uploads
UPLOAD_MAX_SIZE=50MB
UPLOAD_PATH=./uploads

# Módulos
MODULES_AUTO_LOAD=true
MODULES_PATH=./src/modules

# Monitoramento
HEALTH_CHECK_INTERVAL=30000
METRICS_ENABLED=true
`;
        fs.writeFileSync(envPath, defaultEnv);
        this.logger.success('Arquivo .env criado com configurações padrão');
      }
    } else {
      this.logger.success('Arquivo .env já existe');
    }
  }

  async installDependencies() {
    this.logger.info('📦 Instalando dependências...');
    
    try {
      // Instalar dependências do backend
      execSync('npm install', { 
        cwd: rootDir, 
        stdio: 'inherit' 
      });
      
      // Instalar dependências do frontend se existir
      const frontendPath = path.join(rootDir, 'frontend');
      if (fs.existsSync(frontendPath) && fs.existsSync(path.join(frontendPath, 'package.json'))) {
        this.logger.info('📦 Instalando dependências do frontend...');
        execSync('npm install', { 
          cwd: frontendPath, 
          stdio: 'inherit' 
        });
      }
      
      this.logger.success('Dependências instaladas com sucesso');
    } catch (error) {
      throw new Error(`Erro ao instalar dependências: ${error.message}`);
    }
  }

  async setupDatabase() {
    this.logger.info('🗄️ Configurando banco de dados...');
    
    try {
      // Database services no longer required
    this.logger.info('MongoDB and Redis dependencies have been removed');
    this.logger.success('System now operates without external database dependencies');
    } catch (error) {
      this.logger.warning(`Aviso na configuração do banco: ${error.message}`);
    }
  }

  async initializeModules() {
    this.logger.info('🔧 Inicializando módulos...');
    
    const modulesPath = path.join(rootDir, 'src', 'modules');
    
    if (!fs.existsSync(modulesPath)) {
      throw new Error('Diretório de módulos não encontrado');
    }
    
    const modules = fs.readdirSync(modulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    this.logger.info(`Encontrados ${modules.length} módulos:`);
    modules.forEach(module => {
      const moduleJsonPath = path.join(modulesPath, module, 'module.json');
      const indexJsPath = path.join(modulesPath, module, 'index.js');
      
      if (fs.existsSync(moduleJsonPath) && fs.existsSync(indexJsPath)) {
        this.logger.success(`  ✓ ${module}`);
      } else {
        this.logger.warning(`  ⚠ ${module} (arquivos incompletos)`);
      }
    });
  }

  async runTests() {
    this.logger.info('🧪 Executando testes...');
    
    try {
      execSync('npm test', { 
        cwd: rootDir, 
        stdio: 'inherit' 
      });
      this.logger.success('Todos os testes passaram');
    } catch (error) {
      this.logger.warning('Alguns testes falharam. Verifique a saída acima.');
    }
  }

  printNextSteps() {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 FUSIONE CORE SYSTEM CONFIGURADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('\n1. Configure as variáveis de ambiente:');
    console.log('   📝 Edite o arquivo .env com suas configurações');
    console.log('\n2. Inicie os serviços de banco de dados:');
    console.log('   🐳 Docker: docker-compose up -d');
    console.log('   🔧 Local: sistema não requer bancos externos');
    console.log('\n3. Inicie a aplicação:');
    console.log('   🚀 Desenvolvimento: npm run dev');
    console.log('   🏭 Produção: npm start');
    console.log('\n4. Acesse a aplicação:');
    console.log('   🌐 http://localhost:3000');
    console.log('   📊 Health Check: http://localhost:3000/api/v1/health');
    console.log('\n5. Documentação da API:');
    console.log('   📚 Consulte API-DOCUMENTATION.md');
    console.log('\n' + '='.repeat(60));
    console.log('\n🆘 SUPORTE:');
    console.log('   📧 Email: gustavorighi@gmail.com');
    console.log('   📖 Documentação: ./docs/');
    console.log('   🐛 Issues: GitHub Issues');
    console.log('\n' + '='.repeat(60));
  }
}

// Executar setup se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new FusioneSetup();
  setup.run().catch(console.error);
}

export default FusioneSetup;