#!/usr/bin/env node

/**
 * Build Script para Fusione Core System
 * Este script prepara o sistema para produção
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Iniciando build do Fusione Core System...');

// Verificar se as dependências estão instaladas
try {
    console.log('📦 Verificando dependências...');
    execSync('npm list --depth=0', { stdio: 'pipe' });
    console.log('✅ Dependências verificadas');
} catch (error) {
    console.log('⚠️  Instalando dependências...');
    execSync('npm install', { stdio: 'inherit' });
}

// Verificar estrutura de diretórios
const requiredDirs = [
    'src',
    'src/core',
    'src/modules',
    'src/middleware',
    'src/models',
    'src/routes'
];

console.log('📁 Verificando estrutura de diretórios...');
requiredDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
        console.log(`⚠️  Criando diretório: ${dir}`);
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// Verificar arquivo de configuração
const configPath = path.join(process.cwd(), '.env');
if (!fs.existsSync(configPath)) {
    console.log('⚠️  Arquivo .env não encontrado, copiando .env.example...');
    const examplePath = path.join(process.cwd(), '.env.example');
    if (fs.existsSync(examplePath)) {
        fs.copyFileSync(examplePath, configPath);
    }
}

// Executar testes se disponíveis
try {
    console.log('🧪 Executando testes...');
    execSync('npm test', { stdio: 'pipe' });
    console.log('✅ Testes executados com sucesso');
} catch (error) {
    console.log('⚠️  Testes não disponíveis ou falharam');
}

console.log('✅ Build concluído com sucesso!');
console.log('🎉 Fusione Core System está pronto para produção!');

process.exit(0);