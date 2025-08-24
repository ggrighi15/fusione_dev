#!/usr/bin/env node
/**
 * Script de Migração do Banco de Dados
 * Cria todas as tabelas e índices necessários para os módulos do Fusione Core System
 * 
 * @author Fusione Core System
 * @version 1.0.0
 */

import { MongoClient } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(rootDir, '.env') });

class FusioneMigration {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fusione';
    this.client = null;
    this.db = null;
    
    this.logger = {
      info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
      success: (msg) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
      warning: (msg) => console.log(`\x1b[33m[WARNING]\x1b[0m ${msg}`),
      error: (msg) => console.log(`\x1b[31m[ERROR]\x1b[0m ${msg}`)
    };
  }

  async connect() {
    try {
      this.client = new MongoClient(this.mongoUri);
      await this.client.connect();
      this.db = this.client.db();
      this.logger.success('Conectado ao MongoDB');
    } catch (error) {
      throw new Error(`Erro ao conectar ao MongoDB: ${error.message}`);
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.logger.info('Desconectado do MongoDB');
    }
  }

  async run() {
    try {
      this.logger.info('🗄️ Iniciando migração do banco de dados...');
      
      await this.connect();
      await this.createCollections();
      await this.createIndexes();
      await this.insertInitialData();
      
      this.logger.success('✅ Migração concluída com sucesso!');
    } catch (error) {
      this.logger.error(`❌ Erro durante a migração: ${error.message}`);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async createCollections() {
    this.logger.info('📋 Criando coleções...');
    
    const collections = [
      // Core System
      'users',
      'refresh_tokens',
      'audit_logs',
      'system_config',
      'modules_config',
      
      // Módulo Pessoas
      'pessoas',
      'enderecos',
      'contatos',
      'documentos_pessoa',
      'pessoas_historico',
      
      // Módulo Segurança
      'usuarios',
      'perfis',
      'permissoes',
      'sessoes',
      'tentativas_login',
      'logs_auditoria',
      'configuracoes_seguranca',
      'seguranca_historico',
      
      // Módulo Contratos
      'contratos',
      'clausulas',
      'assinaturas',
      'anexos_contrato',
      'versionamento_contrato',
      'contratos_historico',
      
      // Módulo Compliance
      'politicas',
      'avaliacoes_risco',
      'incidentes',
      'auditorias',
      'treinamentos',
      'compliance_historico',
      
      // Módulo Contencioso
      'processos',
      'audiencias',
      'prazos_processuais',
      'documentos_processo',
      'custas_processuais',
      'contencioso_historico',
      
      // Módulo Procurações
      'procuracoes',
      'poderes',
      'substabelecimentos',
      'revogacoes',
      'procuracoes_historico',
      
      // Módulo Societário
      'empresas',
      'socios',
      'participacoes',
      'assembleia_reunioes',
      'documentos_societarios',
      'societario_historico',
      
      // Módulo Marcas
      'marcas',
      'patentes',
      'prazos_pi',
      'licencas',
      'monitoramento',
      'custos_pi',
      'marcas_historico',
      
      // Módulo Bolts
      'bolts',
      'workflows',
      'execucoes_workflow',
      'triggers',
      'marketplace_bolts',
      'bolts_logs',
      'bolts_historico'
    ];
    
    for (const collectionName of collections) {
      try {
        const exists = await this.db.listCollections({ name: collectionName }).hasNext();
        if (!exists) {
          await this.db.createCollection(collectionName);
          this.logger.success(`  ✓ ${collectionName}`);
        } else {
          this.logger.info(`  → ${collectionName} (já existe)`);
        }
      } catch (error) {
        this.logger.warning(`  ⚠ Erro ao criar ${collectionName}: ${error.message}`);
      }
    }
  }

  async createIndexes() {
    this.logger.info('🔍 Criando índices...');
    
    const indexes = [
      // Core System
      { collection: 'users', indexes: [
        { key: { email: 1 }, options: { unique: true } },
        { key: { username: 1 }, options: { unique: true } },
        { key: { createdAt: 1 } }
      ]},
      
      // Módulo Pessoas
      { collection: 'pessoas', indexes: [
        { key: { numero_interno: 1 }, options: { unique: true } },
        { key: { cpf_cnpj: 1 }, options: { unique: true, sparse: true } },
        { key: { nome_razao_social: 'text' } },
        { key: { tipo_pessoa: 1 } },
        { key: { status: 1 } },
        { key: { data_criacao: 1 } }
      ]},
      
      // Módulo Segurança
      { collection: 'usuarios', indexes: [
        { key: { numero_interno: 1 }, options: { unique: true } },
        { key: { email: 1 }, options: { unique: true } },
        { key: { username: 1 }, options: { unique: true } },
        { key: { status: 1 } },
        { key: { ultimo_login: 1 } }
      ]},
      
      // Módulo Contratos
      { collection: 'contratos', indexes: [
        { key: { numero_interno: 1 }, options: { unique: true } },
        { key: { numero_contrato: 1 }, options: { unique: true } },
        { key: { titulo: 'text' } },
        { key: { tipo_contrato: 1 } },
        { key: { status: 1 } },
        { key: { data_inicio: 1 } },
        { key: { data_vencimento: 1 } }
      ]},
      
      // Módulo Compliance
      { collection: 'politicas', indexes: [
        { key: { numero_interno: 1 }, options: { unique: true } },
        { key: { titulo: 'text' } },
        { key: { categoria: 1 } },
        { key: { status: 1 } },
        { key: { data_vigencia: 1 } }
      ]},
      
      // Módulo Contencioso
      { collection: 'processos', indexes: [
        { key: { numero_interno: 1 }, options: { unique: true } },
        { key: { numero_processo: 1 }, options: { unique: true } },
        { key: { tribunal: 1 } },
        { key: { tipo_processo: 1 } },
        { key: { status: 1 } },
        { key: { data_distribuicao: 1 } }
      ]},
      
      // Módulo Procurações
      { collection: 'procuracoes', indexes: [
        { key: { numero_interno: 1 }, options: { unique: true } },
        { key: { outorgante: 1 } },
        { key: { outorgado: 1 } },
        { key: { tipo_procuracao: 1 } },
        { key: { status: 1 } },
        { key: { data_outorga: 1 } },
        { key: { data_vencimento: 1 } }
      ]},
      
      // Módulo Societário
      { collection: 'empresas', indexes: [
        { key: { numero_interno: 1 }, options: { unique: true } },
        { key: { cnpj: 1 }, options: { unique: true } },
        { key: { razao_social: 'text' } },
        { key: { nome_fantasia: 'text' } },
        { key: { tipo_empresa: 1 } },
        { key: { status: 1 } }
      ]},
      
      // Módulo Marcas
      { collection: 'marcas', indexes: [
        { key: { numero_interno: 1 }, options: { unique: true } },
        { key: { numero_registro: 1 }, options: { unique: true, sparse: true } },
        { key: { nome_marca: 'text' } },
        { key: { titular: 1 } },
        { key: { status: 1 } },
        { key: { classe_nice: 1 } },
        { key: { data_deposito: 1 } },
        { key: { data_vigencia: 1 } }
      ]},
      
      // Módulo Bolts
      { collection: 'bolts', indexes: [
        { key: { numero_interno: 1 }, options: { unique: true } },
        { key: { nome: 1 } },
        { key: { categoria: 1 } },
        { key: { tipo: 1 } },
        { key: { status: 1 } },
        { key: { versao: 1 } }
      ]}
    ];
    
    for (const { collection, indexes: collectionIndexes } of indexes) {
      try {
        for (const index of collectionIndexes) {
          await this.db.collection(collection).createIndex(index.key, index.options || {});
        }
        this.logger.success(`  ✓ ${collection} (${collectionIndexes.length} índices)`);
      } catch (error) {
        this.logger.warning(`  ⚠ Erro ao criar índices para ${collection}: ${error.message}`);
      }
    }
  }

  async insertInitialData() {
    this.logger.info('📊 Inserindo dados iniciais...');
    
    try {
      // Configurações do sistema
      const systemConfig = {
        _id: 'system_config',
        version: '1.0.0',
        initialized: true,
        modules_enabled: [
          'fusione-ui',
          'pessoas-module',
          'seguranca-module',
          'contratos-module',
          'compliance-module',
          'contencioso-module',
          'procuracoes-module',
          'societario-module',
          'marcas-module',
          'bolts-module'
        ],
        created_at: new Date(),
        updated_at: new Date()
      };
      
      await this.db.collection('system_config').replaceOne(
        { _id: 'system_config' },
        systemConfig,
        { upsert: true }
      );
      
      // Usuário administrador padrão
      const adminUser = {
        username: 'admin',
        email: 'admin@fusione.com',
        password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO.G', // admin123
        role: 'admin',
        status: 'ativo',
        first_login: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const existingAdmin = await this.db.collection('users').findOne({ username: 'admin' });
      if (!existingAdmin) {
        await this.db.collection('users').insertOne(adminUser);
        this.logger.success('  ✓ Usuário administrador criado (admin/admin123)');
      } else {
        this.logger.info('  → Usuário administrador já existe');
      }
      
      this.logger.success('Dados iniciais inseridos');
    } catch (error) {
      this.logger.warning(`Erro ao inserir dados iniciais: ${error.message}`);
    }
  }
}

// Executar migração se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new FusioneMigration();
  migration.run().catch(error => {
    console.error('Erro na migração:', error);
    process.exit(1);
  });
}

export default FusioneMigration;