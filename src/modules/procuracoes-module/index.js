import path from 'path';
import { promises as fs } from 'fs';
import crypto from 'crypto';
import { EventEmitter } from 'events';

class ProcuracoesModule extends EventEmitter {
    constructor(core) {
        super();
        this.core = core;
        this.name = 'procuracoes-module';
        this.version = '1.0.0';
        this.description = 'Módulo de Controle de Poderes e Representações Legais';
        
        this.logger = core.logger;
        this.database = core.database;
        this.config = {
            numeracao: {
                formato: 'PROC-AAAA-NNNNNN',
                sequencial: true,
                reiniciarAnualmente: true
            },
            validade: {
                alertaVencimento: [30, 15, 7, 1], // dias antes do vencimento
                verificacaoAutomatica: true,
                intervaloVerificacao: '0 9 * * *' // cron: 9h todos os dias
            },
            assinatura: {
                digital: true,
                certificadoICP: true,
                timestamping: true,
                validacaoAutomatica: true
            },
            poderes: {
                categorias: ['Geral', 'Específico', 'Judicial', 'Administrativo', 'Comercial'],
                subcategorias: {
                    'Judicial': ['Cível', 'Criminal', 'Trabalhista', 'Tributário'],
                    'Administrativo': ['Receita Federal', 'INSS', 'Prefeitura', 'Estado'],
                    'Comercial': ['Bancos', 'Contratos', 'Licitações', 'Sociedades']
                }
            },
            documentos: {
                armazenamento: './storage/procuracoes',
                tiposPermitidos: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
                tamanhoMaximo: 50 * 1024 * 1024, // 50MB
                backup: true,
                criptografia: true
            },
            notificacoes: {
                vencimento: true,
                revogacao: true,
                substituicao: true,
                uso: false // notificar quando procuração for usada
            }
        };
        
        this.procuracoes = new Map();
        this.poderes = new Map();
        this.outorgantes = new Map();
        this.outorgados = new Map();
    }
    
    async initialize() {
        try {
            console.log(`[${this.name}] Inicializando módulo Procurações...`);
            
            await this.createDatabaseTables();
            await this.loadConfiguration();
            await this.setupEventHandlers();
            await this.startMonitoringJobs();
            await this.loadPoderesTemplates();
            
            console.log(`[${this.name}] Módulo inicializado com sucesso`);
            
            return {
                success: true,
                message: 'Módulo Procurações inicializado com sucesso'
            };
        } catch (error) {
            console.error(`[${this.name}] Erro na inicialização:`, error);
            throw error;
        }
    }
    
    async createDatabaseTables() {
        const tables = {
            // Tabela principal de procurações
            procuracoes: `
                CREATE TABLE IF NOT EXISTS procuracoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    numero_procuracao VARCHAR(50) UNIQUE NOT NULL,
                    tipo_procuracao VARCHAR(50) NOT NULL, -- publica, particular, ad_judicia
                    categoria VARCHAR(50) NOT NULL,
                    subcategoria VARCHAR(50),
                    outorgante_id INTEGER NOT NULL,
                    outorgado_id INTEGER NOT NULL,
                    data_outorga DATE NOT NULL,
                    data_vencimento DATE,
                    status VARCHAR(50) DEFAULT 'ativa', -- ativa, revogada, vencida, suspensa
                    finalidade TEXT,
                    observacoes TEXT,
                    valor_limite DECIMAL(15,2),
                    territorio_validade VARCHAR(200), -- onde é válida
                    irrevogavel BOOLEAN DEFAULT FALSE,
                    substabelecimento BOOLEAN DEFAULT FALSE,
                    arquivo_original VARCHAR(500),
                    hash_documento VARCHAR(64),
                    assinatura_digital TEXT,
                    certificado_digital TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER,
                    FOREIGN KEY (outorgante_id) REFERENCES pessoas(id),
                    FOREIGN KEY (outorgado_id) REFERENCES pessoas(id),
                    FOREIGN KEY (created_by) REFERENCES pessoas(id)
                )
            `,
            
            // Poderes específicos da procuração
            procuracao_poderes: `
                CREATE TABLE IF NOT EXISTS procuracao_poderes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    procuracao_id INTEGER NOT NULL,
                    codigo_poder VARCHAR(20) NOT NULL,
                    descricao_poder TEXT NOT NULL,
                    categoria_poder VARCHAR(50),
                    limitacoes TEXT,
                    valor_limite DECIMAL(15,2),
                    territorio_limite VARCHAR(200),
                    prazo_limite DATE,
                    ativo BOOLEAN DEFAULT TRUE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (procuracao_id) REFERENCES procuracoes(id) ON DELETE CASCADE
                )
            `,
            
            // Histórico de uso das procurações
            procuracao_usos: `
                CREATE TABLE IF NOT EXISTS procuracao_usos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    procuracao_id INTEGER NOT NULL,
                    data_uso DATETIME NOT NULL,
                    finalidade_uso TEXT NOT NULL,
                    orgao_instituicao VARCHAR(200),
                    documento_gerado VARCHAR(500),
                    valor_operacao DECIMAL(15,2),
                    observacoes TEXT,
                    usuario_registro INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (procuracao_id) REFERENCES procuracoes(id) ON DELETE CASCADE,
                    FOREIGN KEY (usuario_registro) REFERENCES pessoas(id)
                )
            `,
            
            // Substabelecimentos
            procuracao_substabelecimentos: `
                CREATE TABLE IF NOT EXISTS procuracao_substabelecimentos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    procuracao_original_id INTEGER NOT NULL,
                    substabelecido_id INTEGER NOT NULL,
                    data_substabelecimento DATE NOT NULL,
                    data_vencimento DATE,
                    tipo_substabelecimento VARCHAR(50), -- com_reserva, sem_reserva
                    poderes_substabelecidos JSON,
                    limitacoes TEXT,
                    status VARCHAR(50) DEFAULT 'ativo',
                    arquivo_substabelecimento VARCHAR(500),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER,
                    FOREIGN KEY (procuracao_original_id) REFERENCES procuracoes(id) ON DELETE CASCADE,
                    FOREIGN KEY (substabelecido_id) REFERENCES pessoas(id),
                    FOREIGN KEY (created_by) REFERENCES pessoas(id)
                )
            `,
            
            // Revogações
            procuracao_revogacoes: `
                CREATE TABLE IF NOT EXISTS procuracao_revogacoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    procuracao_id INTEGER NOT NULL,
                    data_revogacao DATE NOT NULL,
                    motivo_revogacao TEXT,
                    tipo_revogacao VARCHAR(50), -- total, parcial
                    poderes_revogados JSON,
                    documento_revogacao VARCHAR(500),
                    publicacao_necessaria BOOLEAN DEFAULT FALSE,
                    data_publicacao DATE,
                    veiculo_publicacao VARCHAR(200),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER,
                    FOREIGN KEY (procuracao_id) REFERENCES procuracoes(id) ON DELETE CASCADE,
                    FOREIGN KEY (created_by) REFERENCES pessoas(id)
                )
            `,
            
            // Templates de poderes
            poderes_templates: `
                CREATE TABLE IF NOT EXISTS poderes_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    codigo VARCHAR(20) UNIQUE NOT NULL,
                    nome VARCHAR(100) NOT NULL,
                    categoria VARCHAR(50) NOT NULL,
                    subcategoria VARCHAR(50),
                    descricao_completa TEXT NOT NULL,
                    descricao_resumida VARCHAR(255),
                    limitacoes_padrao TEXT,
                    valor_limite_padrao DECIMAL(15,2),
                    requer_valor_limite BOOLEAN DEFAULT FALSE,
                    requer_territorio BOOLEAN DEFAULT FALSE,
                    requer_prazo BOOLEAN DEFAULT FALSE,
                    ativo BOOLEAN DEFAULT TRUE,
                    ordem_exibicao INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `,
            
            // Alertas e notificações
            procuracao_alertas: `
                CREATE TABLE IF NOT EXISTS procuracao_alertas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    procuracao_id INTEGER NOT NULL,
                    tipo_alerta VARCHAR(50) NOT NULL, -- vencimento, revogacao, uso
                    data_alerta DATE NOT NULL,
                    status VARCHAR(50) DEFAULT 'pendente', -- pendente, enviado, visualizado
                    destinatarios JSON,
                    mensagem TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    sent_at DATETIME,
                    FOREIGN KEY (procuracao_id) REFERENCES procuracoes(id) ON DELETE CASCADE
                )
            `,
            
            // Histórico de alterações
            procuracao_historico: `
                CREATE TABLE IF NOT EXISTS procuracao_historico (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    procuracao_id INTEGER NOT NULL,
                    acao VARCHAR(50) NOT NULL, -- criacao, alteracao, revogacao, uso
                    campo_alterado VARCHAR(100),
                    valor_anterior TEXT,
                    valor_novo TEXT,
                    observacoes TEXT,
                    usuario_id INTEGER,
                    data_acao DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (procuracao_id) REFERENCES procuracoes(id) ON DELETE CASCADE,
                    FOREIGN KEY (usuario_id) REFERENCES pessoas(id)
                )
            `
        };
        
        for (const [tableName, createSQL] of Object.entries(tables)) {
            try {
                await this.database.exec(createSQL);
                console.log(`[${this.name}] Tabela ${tableName} criada/verificada`);
            } catch (error) {
                console.error(`[${this.name}] Erro ao criar tabela ${tableName}:`, error);
                throw error;
            }
        }
    }
    
    async loadConfiguration() {
        try {
            const configPath = path.join(__dirname, 'config', 'procuracoes.json');
            const configExists = await fs.access(configPath).then(() => true).catch(() => false);
            
            if (configExists) {
                const configData = await fs.readFile(configPath, 'utf8');
                this.config = { ...this.config, ...JSON.parse(configData) };
            }
        } catch (error) {
            console.warn(`[${this.name}] Erro ao carregar configuração:`, error.message);
        }
    }
    
    setupEventHandlers() {
        // Eventos de procuração
        this.on('procuracao:criada', this.handleProcuracaoCriada.bind(this));
        this.on('procuracao:revogada', this.handleProcuracaoRevogada.bind(this));
        this.on('procuracao:vencendo', this.handleProcuracaoVencendo.bind(this));
        this.on('procuracao:usada', this.handleProcuracaoUsada.bind(this));
        
        // Eventos externos
        this.core.on('pessoa:criada', this.handlePessoaCriada.bind(this));
        this.core.on('pessoa:atualizada', this.handlePessoaAtualizada.bind(this));
        this.core.on('documento:assinado', this.handleDocumentoAssinado.bind(this));
    }
    
    async startMonitoringJobs() {
        // Verificação de vencimentos
        if (this.config.validade.verificacaoAutomatica) {
            setInterval(() => {
                this.verificarVencimentos();
            }, 60 * 60 * 1000); // A cada hora
        }
        
        // Validação de assinaturas digitais
        if (this.config.assinatura.validacaoAutomatica) {
            setInterval(() => {
                this.validarAssinaturasDigitais();
            }, 24 * 60 * 60 * 1000); // Diariamente
        }
    }
    
    async loadPoderesTemplates() {
        const templates = [
            {
                codigo: 'ADM001',
                nome: 'Representação Geral',
                categoria: 'Geral',
                descricao_completa: 'Poderes gerais para representar o outorgante em todos os atos da vida civil e comercial',
                descricao_resumida: 'Representação geral'
            },
            {
                codigo: 'JUD001',
                nome: 'Foro em Geral',
                categoria: 'Judicial',
                subcategoria: 'Cível',
                descricao_completa: 'Poderes para representar em juízo, propor e acompanhar ações, fazer acordos',
                descricao_resumida: 'Representação judicial geral'
            },
            {
                codigo: 'BAN001',
                nome: 'Operações Bancárias',
                categoria: 'Comercial',
                subcategoria: 'Bancos',
                descricao_completa: 'Poderes para movimentar contas bancárias, fazer transferências, contrair empréstimos',
                descricao_resumida: 'Operações bancárias',
                requer_valor_limite: true
            },
            {
                codigo: 'REC001',
                nome: 'Receita Federal',
                categoria: 'Administrativo',
                subcategoria: 'Receita Federal',
                descricao_completa: 'Poderes para representar perante a Receita Federal, entregar declarações, fazer parcelamentos',
                descricao_resumida: 'Representação na Receita Federal'
            }
        ];
        
        for (const template of templates) {
            try {
                await this.database.run(
                    `INSERT OR IGNORE INTO poderes_templates (
                        codigo, nome, categoria, subcategoria, descricao_completa, 
                        descricao_resumida, requer_valor_limite
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        template.codigo, template.nome, template.categoria,
                        template.subcategoria, template.descricao_completa,
                        template.descricao_resumida, template.requer_valor_limite || false
                    ]
                );
            } catch (error) {
                console.warn(`[${this.name}] Erro ao carregar template ${template.codigo}:`, error.message);
            }
        }
    }
    
    // Métodos principais
    async criarProcuracao(dadosProcuracao) {
        try {
            const numeroProcuracao = await this.gerarNumeroProcuracao();
            
            const procuracao = {
                numero_procuracao: numeroProcuracao,
                ...dadosProcuracao,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Validar dados
            await this.validarDadosProcuracao(procuracao);
            
            const result = await this.database.run(
                `INSERT INTO procuracoes (
                    numero_procuracao, tipo_procuracao, categoria, subcategoria,
                    outorgante_id, outorgado_id, data_outorga, data_vencimento,
                    status, finalidade, observacoes, valor_limite, territorio_validade,
                    irrevogavel, substabelecimento, arquivo_original, hash_documento,
                    created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    procuracao.numero_procuracao, procuracao.tipo_procuracao,
                    procuracao.categoria, procuracao.subcategoria,
                    procuracao.outorgante_id, procuracao.outorgado_id,
                    procuracao.data_outorga, procuracao.data_vencimento,
                    procuracao.status || 'ativa', procuracao.finalidade,
                    procuracao.observacoes, procuracao.valor_limite,
                    procuracao.territorio_validade, procuracao.irrevogavel || false,
                    procuracao.substabelecimento || false, procuracao.arquivo_original,
                    procuracao.hash_documento, procuracao.created_by
                ]
            );
            
            procuracao.id = result.lastID;
            
            // Adicionar poderes
            if (procuracao.poderes && procuracao.poderes.length > 0) {
                await this.adicionarPoderes(procuracao.id, procuracao.poderes);
            }
            
            // Registrar no histórico
            await this.registrarHistorico(procuracao.id, 'criacao', null, 'Procuração criada', procuracao.created_by);
            
            // Criar alertas de vencimento se necessário
            if (procuracao.data_vencimento) {
                await this.criarAlertasVencimento(procuracao.id, procuracao.data_vencimento);
            }
            
            this.emit('procuracao:criada', procuracao);
            
            return procuracao;
        } catch (error) {
            console.error(`[${this.name}] Erro ao criar procuração:`, error);
            throw error;
        }
    }
    
    async revogarProcuracao(procuracaoId, dadosRevogacao) {
        try {
            const procuracao = await this.obterProcuracao(procuracaoId);
            if (!procuracao) {
                throw new Error('Procuração não encontrada');
            }
            
            if (procuracao.status !== 'ativa') {
                throw new Error('Procuração não está ativa');
            }
            
            if (procuracao.irrevogavel) {
                throw new Error('Procuração é irrevogável');
            }
            
            // Registrar revogação
            const result = await this.database.run(
                `INSERT INTO procuracao_revogacoes (
                    procuracao_id, data_revogacao, motivo_revogacao, tipo_revogacao,
                    poderes_revogados, documento_revogacao, publicacao_necessaria,
                    created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    procuracaoId, dadosRevogacao.data_revogacao,
                    dadosRevogacao.motivo_revogacao, dadosRevogacao.tipo_revogacao || 'total',
                    JSON.stringify(dadosRevogacao.poderes_revogados || []),
                    dadosRevogacao.documento_revogacao,
                    dadosRevogacao.publicacao_necessaria || false,
                    dadosRevogacao.created_by
                ]
            );
            
            // Atualizar status da procuração
            await this.database.run(
                'UPDATE procuracoes SET status = ?, updated_at = ? WHERE id = ?',
                ['revogada', new Date().toISOString(), procuracaoId]
            );
            
            // Registrar no histórico
            await this.registrarHistorico(
                procuracaoId, 'revogacao', 'ativa', 'revogada', dadosRevogacao.created_by
            );
            
            this.emit('procuracao:revogada', { procuracao, revogacao: dadosRevogacao });
            
            return result.lastID;
        } catch (error) {
            console.error(`[${this.name}] Erro ao revogar procuração:`, error);
            throw error;
        }
    }
    
    async substabelecer(procuracaoId, dadosSubstabelecimento) {
        try {
            const procuracao = await this.obterProcuracao(procuracaoId);
            if (!procuracao) {
                throw new Error('Procuração não encontrada');
            }
            
            if (procuracao.status !== 'ativa') {
                throw new Error('Procuração não está ativa');
            }
            
            if (!procuracao.substabelecimento) {
                throw new Error('Procuração não permite substabelecimento');
            }
            
            const result = await this.database.run(
                `INSERT INTO procuracao_substabelecimentos (
                    procuracao_original_id, substabelecido_id, data_substabelecimento,
                    data_vencimento, tipo_substabelecimento, poderes_substabelecidos,
                    limitacoes, arquivo_substabelecimento, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    procuracaoId, dadosSubstabelecimento.substabelecido_id,
                    dadosSubstabelecimento.data_substabelecimento,
                    dadosSubstabelecimento.data_vencimento,
                    dadosSubstabelecimento.tipo_substabelecimento || 'com_reserva',
                    JSON.stringify(dadosSubstabelecimento.poderes_substabelecidos || []),
                    dadosSubstabelecimento.limitacoes,
                    dadosSubstabelecimento.arquivo_substabelecimento,
                    dadosSubstabelecimento.created_by
                ]
            );
            
            // Registrar no histórico
            await this.registrarHistorico(
                procuracaoId, 'substabelecimento', null, 
                `Substabelecida para pessoa ID ${dadosSubstabelecimento.substabelecido_id}`,
                dadosSubstabelecimento.created_by
            );
            
            return result.lastID;
        } catch (error) {
            console.error(`[${this.name}] Erro ao substabelecer procuração:`, error);
            throw error;
        }
    }
    
    async registrarUso(procuracaoId, dadosUso) {
        try {
            const procuracao = await this.obterProcuracao(procuracaoId);
            if (!procuracao) {
                throw new Error('Procuração não encontrada');
            }
            
            if (procuracao.status !== 'ativa') {
                throw new Error('Procuração não está ativa');
            }
            
            // Verificar se ainda está dentro da validade
            if (procuracao.data_vencimento) {
                const hoje = new Date();
                const vencimento = new Date(procuracao.data_vencimento);
                if (hoje > vencimento) {
                    throw new Error('Procuração vencida');
                }
            }
            
            const result = await this.database.run(
                `INSERT INTO procuracao_usos (
                    procuracao_id, data_uso, finalidade_uso, orgao_instituicao,
                    documento_gerado, valor_operacao, observacoes, usuario_registro
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    procuracaoId, dadosUso.data_uso || new Date().toISOString(),
                    dadosUso.finalidade_uso, dadosUso.orgao_instituicao,
                    dadosUso.documento_gerado, dadosUso.valor_operacao,
                    dadosUso.observacoes, dadosUso.usuario_registro
                ]
            );
            
            // Registrar no histórico
            await this.registrarHistorico(
                procuracaoId, 'uso', null, dadosUso.finalidade_uso, dadosUso.usuario_registro
            );
            
            this.emit('procuracao:usada', { procuracao, uso: dadosUso });
            
            return result.lastID;
        } catch (error) {
            console.error(`[${this.name}] Erro ao registrar uso:`, error);
            throw error;
        }
    }
    
    async obterProcuracao(id) {
        try {
            const procuracao = await this.database.get(
                'SELECT * FROM procuracoes WHERE id = ?',
                [id]
            );
            
            if (procuracao) {
                // Carregar dados relacionados
                procuracao.poderes = await this.database.all(
                    'SELECT * FROM procuracao_poderes WHERE procuracao_id = ? AND ativo = TRUE',
                    [id]
                );
                
                procuracao.usos = await this.database.all(
                    'SELECT * FROM procuracao_usos WHERE procuracao_id = ? ORDER BY data_uso DESC',
                    [id]
                );
                
                procuracao.substabelecimentos = await this.database.all(
                    'SELECT * FROM procuracao_substabelecimentos WHERE procuracao_original_id = ? ORDER BY data_substabelecimento DESC',
                    [id]
                );
                
                procuracao.revogacoes = await this.database.all(
                    'SELECT * FROM procuracao_revogacoes WHERE procuracao_id = ? ORDER BY data_revogacao DESC',
                    [id]
                );
                
                // Carregar dados do outorgante e outorgado
                procuracao.outorgante = await this.database.get(
                    'SELECT id, nome, tipo_pessoa, cpf_cnpj FROM pessoas WHERE id = ?',
                    [procuracao.outorgante_id]
                );
                
                procuracao.outorgado = await this.database.get(
                    'SELECT id, nome, tipo_pessoa, cpf_cnpj FROM pessoas WHERE id = ?',
                    [procuracao.outorgado_id]
                );
            }
            
            return procuracao;
        } catch (error) {
            console.error(`[${this.name}] Erro ao obter procuração:`, error);
            throw error;
        }
    }
    
    async listarProcuracoes(filtros = {}) {
        try {
            let query = `
                SELECT p.*, 
                       o1.nome as outorgante_nome, o1.cpf_cnpj as outorgante_documento,
                       o2.nome as outorgado_nome, o2.cpf_cnpj as outorgado_documento
                FROM procuracoes p
                LEFT JOIN pessoas o1 ON p.outorgante_id = o1.id
                LEFT JOIN pessoas o2 ON p.outorgado_id = o2.id
                WHERE 1=1
            `;
            const params = [];
            
            if (filtros.status) {
                query += ' AND p.status = ?';
                params.push(filtros.status);
            }
            
            if (filtros.categoria) {
                query += ' AND p.categoria = ?';
                params.push(filtros.categoria);
            }
            
            if (filtros.outorgante_id) {
                query += ' AND p.outorgante_id = ?';
                params.push(filtros.outorgante_id);
            }
            
            if (filtros.outorgado_id) {
                query += ' AND p.outorgado_id = ?';
                params.push(filtros.outorgado_id);
            }
            
            if (filtros.vencendo_em_dias) {
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() + parseInt(filtros.vencendo_em_dias));
                query += ' AND p.data_vencimento <= ? AND p.data_vencimento >= ?';
                params.push(dataLimite.toISOString().split('T')[0]);
                params.push(new Date().toISOString().split('T')[0]);
            }
            
            query += ' ORDER BY p.updated_at DESC';
            
            if (filtros.limit) {
                query += ' LIMIT ?';
                params.push(filtros.limit);
            }
            
            const procuracoes = await this.database.all(query, params);
            
            return procuracoes;
        } catch (error) {
            console.error(`[${this.name}] Erro ao listar procurações:`, error);
            throw error;
        }
    }
    
    async verificarVencimentos() {
        try {
            const diasAntecedencia = this.config.validade.alertaVencimento;
            
            for (const dias of diasAntecedencia) {
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() + dias);
                
                const procuracoes = await this.database.all(
                    `SELECT * FROM procuracoes 
                     WHERE data_vencimento = ? AND status = 'ativa'`,
                    [dataLimite.toISOString().split('T')[0]]
                );
                
                for (const procuracao of procuracoes) {
                    this.emit('procuracao:vencendo', { procuracao, dias_restantes: dias });
                }
            }
            
            // Marcar como vencidas as procurações que já passaram da data
            const hoje = new Date().toISOString().split('T')[0];
            await this.database.run(
                `UPDATE procuracoes SET status = 'vencida', updated_at = ? 
                 WHERE data_vencimento < ? AND status = 'ativa'`,
                [new Date().toISOString(), hoje]
            );
        } catch (error) {
            console.error(`[${this.name}] Erro ao verificar vencimentos:`, error);
        }
    }
    
    async gerarNumeroProcuracao() {
        const ano = new Date().getFullYear();
        const prefixo = `PROC-${ano}-`;
        
        const ultimoNumero = await this.database.get(
            'SELECT numero_procuracao FROM procuracoes WHERE numero_procuracao LIKE ? ORDER BY id DESC LIMIT 1',
            [`${prefixo}%`]
        );
        
        let proximoNumero = 1;
        if (ultimoNumero) {
            const numeroAtual = parseInt(ultimoNumero.numero_procuracao.split('-')[2]);
            proximoNumero = numeroAtual + 1;
        }
        
        return `${prefixo}${proximoNumero.toString().padStart(6, '0')}`;
    }
    
    async validarDadosProcuracao(procuracao) {
        // Validações básicas
        if (!procuracao.outorgante_id || !procuracao.outorgado_id) {
            throw new Error('Outorgante e outorgado são obrigatórios');
        }
        
        if (procuracao.outorgante_id === procuracao.outorgado_id) {
            throw new Error('Outorgante e outorgado não podem ser a mesma pessoa');
        }
        
        if (!procuracao.data_outorga) {
            throw new Error('Data de outorga é obrigatória');
        }
        
        // Verificar se as pessoas existem
        const outorgante = await this.database.get('SELECT id FROM pessoas WHERE id = ?', [procuracao.outorgante_id]);
        const outorgado = await this.database.get('SELECT id FROM pessoas WHERE id = ?', [procuracao.outorgado_id]);
        
        if (!outorgante) {
            throw new Error('Outorgante não encontrado');
        }
        
        if (!outorgado) {
            throw new Error('Outorgado não encontrado');
        }
    }
    
    async adicionarPoderes(procuracaoId, poderes) {
        for (const poder of poderes) {
            await this.database.run(
                `INSERT INTO procuracao_poderes (
                    procuracao_id, codigo_poder, descricao_poder, categoria_poder,
                    limitacoes, valor_limite, territorio_limite, prazo_limite
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    procuracaoId, poder.codigo_poder, poder.descricao_poder,
                    poder.categoria_poder, poder.limitacoes, poder.valor_limite,
                    poder.territorio_limite, poder.prazo_limite
                ]
            );
        }
    }
    
    async criarAlertasVencimento(procuracaoId, dataVencimento) {
        const diasAntecedencia = this.config.validade.alertaVencimento;
        
        for (const dias of diasAntecedencia) {
            const dataAlerta = new Date(dataVencimento);
            dataAlerta.setDate(dataAlerta.getDate() - dias);
            
            await this.database.run(
                `INSERT INTO procuracao_alertas (
                    procuracao_id, tipo_alerta, data_alerta, mensagem
                ) VALUES (?, ?, ?, ?)`,
                [
                    procuracaoId, 'vencimento', dataAlerta.toISOString().split('T')[0],
                    `Procuração vence em ${dias} dias`
                ]
            );
        }
    }
    
    async registrarHistorico(procuracaoId, acao, valorAnterior, valorNovo, usuarioId) {
        try {
            await this.database.run(
                `INSERT INTO procuracao_historico (
                    procuracao_id, acao, valor_anterior, valor_novo, usuario_id
                ) VALUES (?, ?, ?, ?, ?)`,
                [procuracaoId, acao, valorAnterior, valorNovo, usuarioId]
            );
        } catch (error) {
            console.error(`[${this.name}] Erro ao registrar histórico:`, error);
        }
    }
    
    // Event Handlers
    async handleProcuracaoCriada(procuracao) {
        console.log(`[${this.name}] Procuração criada: ${procuracao.numero_procuracao}`);
        
        // Notificar outorgado
        this.core.emit('notification:send', {
            type: 'procuracao_criada',
            title: 'Nova Procuração Recebida',
            message: `Você recebeu uma nova procuração: ${procuracao.numero_procuracao}`,
            recipients: [procuracao.outorgado_id],
            data: procuracao
        });
    }
    
    async handleProcuracaoRevogada(data) {
        console.log(`[${this.name}] Procuração revogada: ${data.procuracao.numero_procuracao}`);
        
        // Notificar outorgado
        this.core.emit('notification:send', {
            type: 'procuracao_revogada',
            title: 'Procuração Revogada',
            message: `A procuração ${data.procuracao.numero_procuracao} foi revogada`,
            recipients: [data.procuracao.outorgado_id],
            data: data
        });
    }
    
    async handleProcuracaoVencendo(data) {
        console.log(`[${this.name}] Procuração vencendo em ${data.dias_restantes} dias`);
        
        // Notificar outorgante e outorgado
        this.core.emit('notification:send', {
            type: 'procuracao_vencendo',
            title: 'Procuração Vencendo',
            message: `A procuração ${data.procuracao.numero_procuracao} vence em ${data.dias_restantes} dias`,
            priority: 'high',
            recipients: [data.procuracao.outorgante_id, data.procuracao.outorgado_id],
            data: data.procuracao
        });
    }
    
    async handleProcuracaoUsada(data) {
        console.log(`[${this.name}] Procuração usada: ${data.procuracao.numero_procuracao}`);
        
        if (this.config.notificacoes.uso) {
            // Notificar outorgante sobre o uso
            this.core.emit('notification:send', {
                type: 'procuracao_usada',
                title: 'Procuração Utilizada',
                message: `Sua procuração ${data.procuracao.numero_procuracao} foi utilizada: ${data.uso.finalidade_uso}`,
                recipients: [data.procuracao.outorgante_id],
                data: data
            });
        }
    }
    
    async handlePessoaCriada(pessoa) {
        console.log(`[${this.name}] Nova pessoa disponível para procurações: ${pessoa.nome}`);
    }
    
    async handlePessoaAtualizada(pessoa) {
        // Verificar se há procurações que precisam ser atualizadas
        const procuracoes = await this.database.all(
            'SELECT id FROM procuracoes WHERE outorgante_id = ? OR outorgado_id = ?',
            [pessoa.id, pessoa.id]
        );
        
        if (procuracoes.length > 0) {
            console.log(`[${this.name}] Pessoa atualizada afeta ${procuracoes.length} procurações`);
        }
    }
    
    async handleDocumentoAssinado(documento) {
        if (documento.tipo === 'procuracao') {
            console.log(`[${this.name}] Documento de procuração assinado: ${documento.nome}`);
            
            // Atualizar procuração com dados da assinatura
            if (documento.procuracao_id) {
                await this.database.run(
                    'UPDATE procuracoes SET assinatura_digital = ?, certificado_digital = ? WHERE id = ?',
                    [documento.assinatura, documento.certificado, documento.procuracao_id]
                );
            }
        }
    }
    
    // Métodos auxiliares
    async validarAssinaturasDigitais() {
        console.log(`[${this.name}] Validando assinaturas digitais...`);
        
        // Implementar validação de certificados digitais
        // Por enquanto, apenas log
    }
    
    async gerarRelatorio(tipo, parametros) {
        try {
            const relatorios = {
                'procuracoes_por_status': this.relatorioProcuracoesPorStatus.bind(this),
                'vencimentos_proximos': this.relatorioVencimentosProximos.bind(this),
                'uso_procuracoes': this.relatorioUsoProcuracoes.bind(this),
                'outorgados_mais_ativos': this.relatorioOutorgadosAtivos.bind(this)
            };
            
            const gerador = relatorios[tipo];
            if (!gerador) {
                throw new Error(`Tipo de relatório não encontrado: ${tipo}`);
            }
            
            return await gerador(parametros);
        } catch (error) {
            console.error(`[${this.name}] Erro ao gerar relatório:`, error);
            throw error;
        }
    }
    
    async relatorioProcuracoesPorStatus(parametros) {
        const procuracoes = await this.database.all(
            'SELECT status, COUNT(*) as total FROM procuracoes GROUP BY status'
        );
        
        return {
            titulo: 'Procurações por Status',
            data: procuracoes,
            gerado_em: new Date().toISOString()
        };
    }
    
    async relatorioVencimentosProximos(parametros) {
        const dias = parametros.dias || 30;
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() + dias);
        
        const procuracoes = await this.database.all(
            `SELECT p.*, o1.nome as outorgante_nome, o2.nome as outorgado_nome
             FROM procuracoes p
             LEFT JOIN pessoas o1 ON p.outorgante_id = o1.id
             LEFT JOIN pessoas o2 ON p.outorgado_id = o2.id
             WHERE p.data_vencimento <= ? AND p.status = 'ativa'
             ORDER BY p.data_vencimento ASC`,
            [dataLimite.toISOString().split('T')[0]]
        );
        
        return {
            titulo: `Procurações Vencendo nos Próximos ${dias} Dias`,
            data: procuracoes,
            gerado_em: new Date().toISOString()
        };
    }
    
    async relatorioUsoProcuracoes(parametros) {
        const dataInicio = parametros.data_inicio || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
        const dataFim = parametros.data_fim || new Date().toISOString().split('T')[0];
        
        const usos = await this.database.all(
            `SELECT u.*, p.numero_procuracao, o1.nome as outorgante_nome, o2.nome as outorgado_nome
             FROM procuracao_usos u
             JOIN procuracoes p ON u.procuracao_id = p.id
             LEFT JOIN pessoas o1 ON p.outorgante_id = o1.id
             LEFT JOIN pessoas o2 ON p.outorgado_id = o2.id
             WHERE DATE(u.data_uso) BETWEEN ? AND ?
             ORDER BY u.data_uso DESC`,
            [dataInicio, dataFim]
        );
        
        return {
            titulo: `Uso de Procurações - ${dataInicio} a ${dataFim}`,
            data: usos,
            gerado_em: new Date().toISOString()
        };
    }
    
    async relatorioOutorgadosAtivos(parametros) {
        const outorgados = await this.database.all(
            `SELECT o.nome, o.cpf_cnpj, COUNT(p.id) as total_procuracoes,
                    COUNT(CASE WHEN p.status = 'ativa' THEN 1 END) as procuracoes_ativas
             FROM pessoas o
             JOIN procuracoes p ON o.id = p.outorgado_id
             GROUP BY o.id, o.nome, o.cpf_cnpj
             ORDER BY procuracoes_ativas DESC, total_procuracoes DESC`
        );
        
        return {
            titulo: 'Outorgados Mais Ativos',
            data: outorgados,
            gerado_em: new Date().toISOString()
        };
    }
}

export default ProcuracoesModule;