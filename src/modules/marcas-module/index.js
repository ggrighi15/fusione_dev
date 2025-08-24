/**
 * Módulo Marcas - Gestão de Marcas e Propriedade Intelectual
 * 
 * Este módulo gerencia o registro, acompanhamento e proteção de marcas,
 * patentes e outros ativos de propriedade intelectual.
 * 
 * Funcionalidades principais:
 * - Registro e acompanhamento de marcas
 * - Gestão de patentes e desenhos industriais
 * - Controle de prazos e renovações
 * - Monitoramento de oposições e nulidades
 * - Gestão de licenciamentos e cessões
 * - Relatórios de propriedade intelectual
 */

const moment = require('moment');
const EventEmitter = require('events');
const crypto = require('crypto');

class MarcasModule extends EventEmitter {
    constructor() {
        super();
        this.name = 'marcas-module';
        this.version = '1.0.0';
        this.description = 'Módulo de Gestão de Marcas e Propriedade Intelectual';
        this.config = {};
        this.db = null;
        this.isInitialized = false;
        this.monitoringJobs = new Map();
    }

    /**
     * Inicializa o módulo
     */
    async initialize(coreSystem) {
        try {
            console.log('Inicializando Módulo Marcas...');
            
            this.core = coreSystem;
            this.db = coreSystem.database;
            this.config = await this.loadConfig();
            
            // Criar tabelas do banco de dados
            await this.createDatabaseTables();
            
            // Configurar event handlers
            this.setupEventHandlers();
            
            // Iniciar jobs de monitoramento
            await this.startMonitoringJobs();
            
            this.isInitialized = true;
            this.emit('module:initialized', { module: this.name });
            
            console.log('Módulo Marcas inicializado com sucesso');
            return true;
            
        } catch (error) {
            console.error('Erro ao inicializar Módulo Marcas:', error);
            throw error;
        }
    }

    /**
     * Carrega configurações do módulo
     */
    async loadConfig() {
        const defaultConfig = {
            numeracao: {
                marca: 'MRC-{YYYY}-{NNNNNN}',
                patente: 'PAT-{YYYY}-{NNNNNN}',
                desenho: 'DES-{YYYY}-{NNNNNN}',
                licenca: 'LIC-{YYYY}-{NNNNNN}'
            },
            prazos: {
                alerta_renovacao_dias: 90,
                alerta_oposicao_dias: 15,
                alerta_manifestacao_dias: 7
            },
            integracao: {
                inpi_api: true,
                wipo_api: false,
                uspto_api: false
            }
        };
        
        return { ...defaultConfig, ...this.config };
    }

    /**
     * Cria tabelas do banco de dados
     */
    async createDatabaseTables() {
        const tables = [
            // Tabela principal de marcas
            `CREATE TABLE IF NOT EXISTS marcas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero_interno VARCHAR(50) UNIQUE NOT NULL,
                numero_registro VARCHAR(50),
                numero_processo VARCHAR(50),
                nome_marca VARCHAR(255) NOT NULL,
                tipo_marca VARCHAR(50) NOT NULL, -- nominativa, figurativa, mista, tridimensional
                classe_nice TEXT, -- classes de Nice (JSON array)
                especificacao TEXT,
                titular_id INTEGER,
                representante_id INTEGER,
                status VARCHAR(50) NOT NULL, -- depositada, deferida, indeferida, registrada, extinta
                data_deposito DATE,
                data_concessao DATE,
                data_vigencia DATE,
                data_renovacao DATE,
                pais VARCHAR(10) DEFAULT 'BR',
                prioridade_unionista TEXT, -- JSON com dados de prioridade
                observacoes TEXT,
                valor_taxas DECIMAL(15,2),
                arquivo_imagem VARCHAR(500),
                arquivo_certificado VARCHAR(500),
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                criado_por INTEGER,
                ativo BOOLEAN DEFAULT 1
            )`,
            
            // Tabela de patentes
            `CREATE TABLE IF NOT EXISTS patentes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero_interno VARCHAR(50) UNIQUE NOT NULL,
                numero_patente VARCHAR(50),
                numero_processo VARCHAR(50),
                titulo VARCHAR(500) NOT NULL,
                tipo_patente VARCHAR(50) NOT NULL, -- invencao, modelo_utilidade, desenho_industrial
                resumo TEXT,
                reivindicacoes TEXT,
                inventor_principal VARCHAR(255),
                inventores TEXT, -- JSON array
                titular_id INTEGER,
                representante_id INTEGER,
                status VARCHAR(50) NOT NULL, -- depositada, publicada, deferida, indeferida, concedida, extinta
                data_deposito DATE,
                data_publicacao DATE,
                data_concessao DATE,
                data_vigencia DATE,
                pais VARCHAR(10) DEFAULT 'BR',
                prioridade_unionista TEXT, -- JSON
                classificacao_ipc VARCHAR(255), -- Classificação Internacional de Patentes
                observacoes TEXT,
                valor_taxas DECIMAL(15,2),
                arquivo_relatorio VARCHAR(500),
                arquivo_desenhos VARCHAR(500),
                arquivo_certificado VARCHAR(500),
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                criado_por INTEGER,
                ativo BOOLEAN DEFAULT 1
            )`,
            
            // Tabela de acompanhamento de prazos
            `CREATE TABLE IF NOT EXISTS prazos_pi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_ativo VARCHAR(50) NOT NULL, -- marca, patente, desenho
                ativo_id INTEGER NOT NULL,
                tipo_prazo VARCHAR(100) NOT NULL, -- renovacao, oposicao, manifestacao, recurso
                descricao VARCHAR(500),
                data_prazo DATE NOT NULL,
                data_alerta DATE,
                status VARCHAR(50) DEFAULT 'pendente', -- pendente, cumprido, vencido
                responsavel_id INTEGER,
                observacoes TEXT,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Tabela de licenciamentos e cessões
            `CREATE TABLE IF NOT EXISTS licencas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                numero_interno VARCHAR(50) UNIQUE NOT NULL,
                tipo_operacao VARCHAR(50) NOT NULL, -- licenca, cessao, franquia
                tipo_ativo VARCHAR(50) NOT NULL, -- marca, patente, desenho
                ativo_id INTEGER NOT NULL,
                licenciante_id INTEGER NOT NULL,
                licenciado_id INTEGER NOT NULL,
                territorio TEXT, -- JSON com países/regiões
                exclusividade BOOLEAN DEFAULT 0,
                data_inicio DATE,
                data_fim DATE,
                valor_inicial DECIMAL(15,2),
                royalty_percentual DECIMAL(5,2),
                royalty_minimo DECIMAL(15,2),
                condicoes_especiais TEXT,
                status VARCHAR(50) DEFAULT 'ativo', -- ativo, suspenso, rescindido, expirado
                arquivo_contrato VARCHAR(500),
                observacoes TEXT,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                criado_por INTEGER,
                ativo BOOLEAN DEFAULT 1
            )`,
            
            // Tabela de monitoramento de terceiros
            `CREATE TABLE IF NOT EXISTS monitoramento (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_ativo VARCHAR(50) NOT NULL, -- marca, patente
                ativo_id INTEGER NOT NULL,
                tipo_monitoramento VARCHAR(50) NOT NULL, -- oposicao, nulidade, contrafacao
                terceiro_nome VARCHAR(255),
                terceiro_documento VARCHAR(50),
                numero_processo_terceiro VARCHAR(50),
                descricao TEXT,
                risco_nivel VARCHAR(20) DEFAULT 'baixo', -- baixo, medio, alto, critico
                status VARCHAR(50) DEFAULT 'monitorando', -- monitorando, acao_necessaria, resolvido
                data_identificacao DATE,
                data_prazo_acao DATE,
                acao_tomada TEXT,
                responsavel_id INTEGER,
                observacoes TEXT,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Tabela de custos e taxas
            `CREATE TABLE IF NOT EXISTS custos_pi (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo_ativo VARCHAR(50) NOT NULL,
                ativo_id INTEGER NOT NULL,
                tipo_custo VARCHAR(100) NOT NULL, -- deposito, exame, concessao, renovacao, oposicao
                descricao VARCHAR(255),
                valor DECIMAL(15,2) NOT NULL,
                moeda VARCHAR(10) DEFAULT 'BRL',
                data_vencimento DATE,
                data_pagamento DATE,
                status VARCHAR(50) DEFAULT 'pendente', -- pendente, pago, vencido
                numero_gru VARCHAR(50), -- Guia de Recolhimento da União
                observacoes TEXT,
                criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
                atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            
            // Tabela de histórico de alterações
            `CREATE TABLE IF NOT EXISTS marcas_historico (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entidade_tipo VARCHAR(50) NOT NULL,
                entidade_id INTEGER NOT NULL,
                acao VARCHAR(100) NOT NULL,
                dados_anteriores TEXT,
                dados_novos TEXT,
                usuario_id INTEGER,
                ip_address VARCHAR(45),
                user_agent TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`
        ];

        for (const table of tables) {
            await this.db.exec(table);
        }

        console.log('Tabelas do módulo Marcas criadas com sucesso');
    }

    /**
     * Configura manipuladores de eventos
     */
    setupEventHandlers() {
        // Eventos internos
        this.on('marca:criada', this.handleMarcaCriada.bind(this));
        this.on('patente:criada', this.handlePatenteCriada.bind(this));
        this.on('prazo:vencendo', this.handlePrazoVencendo.bind(this));
        this.on('renovacao:necessaria', this.handleRenovacaoNecessaria.bind(this));
        this.on('monitoramento:alerta', this.handleMonitoramentoAlerta.bind(this));
        
        // Eventos externos
        if (this.core && this.core.eventBus) {
            this.core.eventBus.on('pessoa:criada', this.handlePessoaCriada.bind(this));
            this.core.eventBus.on('pessoa:atualizada', this.handlePessoaAtualizada.bind(this));
            this.core.eventBus.on('documento:assinado', this.handleDocumentoAssinado.bind(this));
        }
    }

    /**
     * Inicia jobs de monitoramento
     */
    async startMonitoringJobs() {
        const cron = require('node-cron');
        
        // Job diário para verificar prazos
        const prazoJob = cron.schedule('0 8 * * *', async () => {
            await this.verificarPrazos();
        }, { scheduled: false });
        
        // Job semanal para verificar renovações
        const renovacaoJob = cron.schedule('0 9 * * 1', async () => {
            await this.verificarRenovacoes();
        }, { scheduled: false });
        
        // Job mensal para relatórios
        const relatorioJob = cron.schedule('0 10 1 * *', async () => {
            await this.gerarRelatorioMensal();
        }, { scheduled: false });
        
        this.monitoringJobs.set('prazos', prazoJob);
        this.monitoringJobs.set('renovacoes', renovacaoJob);
        this.monitoringJobs.set('relatorios', relatorioJob);
        
        // Iniciar jobs
        prazoJob.start();
        renovacaoJob.start();
        relatorioJob.start();
        
        console.log('Jobs de monitoramento do módulo Marcas iniciados');
    }

    /**
     * Cria uma nova marca
     */
    async criarMarca(dadosMarca) {
        try {
            const numeroInterno = await this.gerarNumeroInterno('marca');
            
            const marca = {
                numero_interno: numeroInterno,
                nome_marca: dadosMarca.nome_marca,
                tipo_marca: dadosMarca.tipo_marca,
                classe_nice: JSON.stringify(dadosMarca.classe_nice || []),
                especificacao: dadosMarca.especificacao,
                titular_id: dadosMarca.titular_id,
                representante_id: dadosMarca.representante_id,
                status: 'depositada',
                data_deposito: dadosMarca.data_deposito || moment().format('YYYY-MM-DD'),
                pais: dadosMarca.pais || 'BR',
                prioridade_unionista: JSON.stringify(dadosMarca.prioridade_unionista || {}),
                observacoes: dadosMarca.observacoes,
                valor_taxas: dadosMarca.valor_taxas || 0,
                criado_por: dadosMarca.criado_por
            };
            
            const result = await this.db.run(
                `INSERT INTO marcas (${Object.keys(marca).join(', ')}) 
                 VALUES (${Object.keys(marca).map(() => '?').join(', ')})`,
                Object.values(marca)
            );
            
            marca.id = result.lastID;
            
            // Registrar histórico
            await this.registrarHistorico('marca', marca.id, 'criada', null, marca, dadosMarca.criado_por);
            
            // Emitir evento
            this.emit('marca:criada', marca);
            
            return marca;
            
        } catch (error) {
            console.error('Erro ao criar marca:', error);
            throw error;
        }
    }

    /**
     * Cria uma nova patente
     */
    async criarPatente(dadosPatente) {
        try {
            const numeroInterno = await this.gerarNumeroInterno('patente');
            
            const patente = {
                numero_interno: numeroInterno,
                titulo: dadosPatente.titulo,
                tipo_patente: dadosPatente.tipo_patente,
                resumo: dadosPatente.resumo,
                reivindicacoes: dadosPatente.reivindicacoes,
                inventor_principal: dadosPatente.inventor_principal,
                inventores: JSON.stringify(dadosPatente.inventores || []),
                titular_id: dadosPatente.titular_id,
                representante_id: dadosPatente.representante_id,
                status: 'depositada',
                data_deposito: dadosPatente.data_deposito || moment().format('YYYY-MM-DD'),
                pais: dadosPatente.pais || 'BR',
                prioridade_unionista: JSON.stringify(dadosPatente.prioridade_unionista || {}),
                classificacao_ipc: dadosPatente.classificacao_ipc,
                observacoes: dadosPatente.observacoes,
                valor_taxas: dadosPatente.valor_taxas || 0,
                criado_por: dadosPatente.criado_por
            };
            
            const result = await this.db.run(
                `INSERT INTO patentes (${Object.keys(patente).join(', ')}) 
                 VALUES (${Object.keys(patente).map(() => '?').join(', ')})`,
                Object.values(patente)
            );
            
            patente.id = result.lastID;
            
            // Registrar histórico
            await this.registrarHistorico('patente', patente.id, 'criada', null, patente, dadosPatente.criado_por);
            
            // Emitir evento
            this.emit('patente:criada', patente);
            
            return patente;
            
        } catch (error) {
            console.error('Erro ao criar patente:', error);
            throw error;
        }
    }

    /**
     * Agenda um prazo
     */
    async agendarPrazo(dadosPrazo) {
        try {
            const prazo = {
                tipo_ativo: dadosPrazo.tipo_ativo,
                ativo_id: dadosPrazo.ativo_id,
                tipo_prazo: dadosPrazo.tipo_prazo,
                descricao: dadosPrazo.descricao,
                data_prazo: dadosPrazo.data_prazo,
                data_alerta: dadosPrazo.data_alerta || moment(dadosPrazo.data_prazo).subtract(this.config.prazos.alerta_renovacao_dias, 'days').format('YYYY-MM-DD'),
                responsavel_id: dadosPrazo.responsavel_id,
                observacoes: dadosPrazo.observacoes
            };
            
            const result = await this.db.run(
                `INSERT INTO prazos_pi (${Object.keys(prazo).join(', ')}) 
                 VALUES (${Object.keys(prazo).map(() => '?').join(', ')})`,
                Object.values(prazo)
            );
            
            prazo.id = result.lastID;
            
            return prazo;
            
        } catch (error) {
            console.error('Erro ao agendar prazo:', error);
            throw error;
        }
    }

    /**
     * Cria licenciamento
     */
    async criarLicenciamento(dadosLicenca) {
        try {
            const numeroInterno = await this.gerarNumeroInterno('licenca');
            
            const licenca = {
                numero_interno: numeroInterno,
                tipo_operacao: dadosLicenca.tipo_operacao,
                tipo_ativo: dadosLicenca.tipo_ativo,
                ativo_id: dadosLicenca.ativo_id,
                licenciante_id: dadosLicenca.licenciante_id,
                licenciado_id: dadosLicenca.licenciado_id,
                territorio: JSON.stringify(dadosLicenca.territorio || ['BR']),
                exclusividade: dadosLicenca.exclusividade || 0,
                data_inicio: dadosLicenca.data_inicio,
                data_fim: dadosLicenca.data_fim,
                valor_inicial: dadosLicenca.valor_inicial || 0,
                royalty_percentual: dadosLicenca.royalty_percentual || 0,
                royalty_minimo: dadosLicenca.royalty_minimo || 0,
                condicoes_especiais: dadosLicenca.condicoes_especiais,
                observacoes: dadosLicenca.observacoes,
                criado_por: dadosLicenca.criado_por
            };
            
            const result = await this.db.run(
                `INSERT INTO licencas (${Object.keys(licenca).join(', ')}) 
                 VALUES (${Object.keys(licenca).map(() => '?').join(', ')})`,
                Object.values(licenca)
            );
            
            licenca.id = result.lastID;
            
            // Registrar histórico
            await this.registrarHistorico('licenca', licenca.id, 'criada', null, licenca, dadosLicenca.criado_por);
            
            return licenca;
            
        } catch (error) {
            console.error('Erro ao criar licenciamento:', error);
            throw error;
        }
    }

    /**
     * Métodos auxiliares
     */
    async gerarNumeroInterno(tipo) {
        const ano = moment().format('YYYY');
        const formato = this.config.numeracao[tipo];
        
        // Buscar último número do ano
        const ultimoNumero = await this.db.get(
            `SELECT numero_interno FROM ${tipo === 'licenca' ? 'licencas' : tipo === 'patente' ? 'patentes' : 'marcas'} 
             WHERE numero_interno LIKE ? ORDER BY id DESC LIMIT 1`,
            [`%${ano}%`]
        );
        
        let proximoSequencial = 1;
        if (ultimoNumero) {
            const match = ultimoNumero.numero_interno.match(/-\d{4}-(\d+)$/);
            if (match) {
                proximoSequencial = parseInt(match[1]) + 1;
            }
        }
        
        return formato
            .replace('{YYYY}', ano)
            .replace('{NNNNNN}', proximoSequencial.toString().padStart(6, '0'));
    }

    async registrarHistorico(entidadeTipo, entidadeId, acao, dadosAnteriores, dadosNovos, usuarioId) {
        try {
            await this.db.run(
                `INSERT INTO marcas_historico (entidade_tipo, entidade_id, acao, dados_anteriores, dados_novos, usuario_id, timestamp) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    entidadeTipo,
                    entidadeId,
                    acao,
                    dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
                    JSON.stringify(dadosNovos),
                    usuarioId,
                    moment().format('YYYY-MM-DD HH:mm:ss')
                ]
            );
        } catch (error) {
            console.error('Erro ao registrar histórico:', error);
        }
    }

    /**
     * Event handlers
     */
    async handleMarcaCriada(marca) {
        console.log(`Nova marca criada: ${marca.nome_marca} (${marca.numero_interno})`);
        
        // Agendar prazo de renovação (10 anos para marcas no Brasil)
        if (marca.data_deposito) {
            const dataRenovacao = moment(marca.data_deposito).add(10, 'years').format('YYYY-MM-DD');
            await this.agendarPrazo({
                tipo_ativo: 'marca',
                ativo_id: marca.id,
                tipo_prazo: 'renovacao',
                descricao: `Renovação da marca ${marca.nome_marca}`,
                data_prazo: dataRenovacao,
                responsavel_id: marca.criado_por
            });
        }
    }

    async handlePatenteCriada(patente) {
        console.log(`Nova patente criada: ${patente.titulo} (${patente.numero_interno})`);
        
        // Agendar prazo de vigência (20 anos para patentes de invenção, 15 para modelo de utilidade)
        if (patente.data_deposito) {
            const anosVigencia = patente.tipo_patente === 'modelo_utilidade' ? 15 : 20;
            const dataVigencia = moment(patente.data_deposito).add(anosVigencia, 'years').format('YYYY-MM-DD');
            await this.agendarPrazo({
                tipo_ativo: 'patente',
                ativo_id: patente.id,
                tipo_prazo: 'vigencia',
                descricao: `Fim da vigência da patente ${patente.titulo}`,
                data_prazo: dataVigencia,
                responsavel_id: patente.criado_por
            });
        }
    }

    async handlePrazoVencendo(prazo) {
        console.log(`Prazo vencendo: ${prazo.descricao}`);
        // Enviar notificação
        if (this.core && this.core.eventBus) {
            this.core.eventBus.emit('notificacao:enviar', {
                tipo: 'prazo_vencendo',
                destinatario_id: prazo.responsavel_id,
                titulo: 'Prazo de Propriedade Intelectual Vencendo',
                mensagem: `O prazo "${prazo.descricao}" vence em ${moment(prazo.data_prazo).format('DD/MM/YYYY')}`,
                dados: prazo
            });
        }
    }

    async handleRenovacaoNecessaria(ativo) {
        console.log(`Renovação necessária para: ${ativo.nome || ativo.titulo}`);
    }

    async handleMonitoramentoAlerta(alerta) {
        console.log(`Alerta de monitoramento: ${alerta.descricao}`);
    }

    async handlePessoaCriada(pessoa) {
        // Pode ser usado para atualizar titulares/representantes
    }

    async handlePessoaAtualizada(pessoa) {
        // Atualizar dados relacionados
    }

    async handleDocumentoAssinado(documento) {
        // Processar documentos de PI assinados
    }

    /**
     * Jobs de monitoramento
     */
    async verificarPrazos() {
        try {
            const hoje = moment().format('YYYY-MM-DD');
            const prazosVencendo = await this.db.all(
                `SELECT * FROM prazos_pi 
                 WHERE data_alerta <= ? AND status = 'pendente'`,
                [hoje]
            );
            
            for (const prazo of prazosVencendo) {
                this.emit('prazo:vencendo', prazo);
            }
            
        } catch (error) {
            console.error('Erro ao verificar prazos:', error);
        }
    }

    async verificarRenovacoes() {
        try {
            const dataLimite = moment().add(this.config.prazos.alerta_renovacao_dias, 'days').format('YYYY-MM-DD');
            
            // Verificar marcas para renovação
            const marcasRenovacao = await this.db.all(
                `SELECT * FROM marcas 
                 WHERE data_renovacao <= ? AND status = 'registrada'`,
                [dataLimite]
            );
            
            for (const marca of marcasRenovacao) {
                this.emit('renovacao:necessaria', { tipo: 'marca', ...marca });
            }
            
        } catch (error) {
            console.error('Erro ao verificar renovações:', error);
        }
    }

    async gerarRelatorioMensal() {
        try {
            const mesAnterior = moment().subtract(1, 'month');
            const inicioMes = mesAnterior.startOf('month').format('YYYY-MM-DD');
            const fimMes = mesAnterior.endOf('month').format('YYYY-MM-DD');
            
            const relatorio = {
                periodo: `${inicioMes} a ${fimMes}`,
                marcas_criadas: await this.db.get(
                    'SELECT COUNT(*) as total FROM marcas WHERE criado_em BETWEEN ? AND ?',
                    [inicioMes, fimMes]
                ),
                patentes_criadas: await this.db.get(
                    'SELECT COUNT(*) as total FROM patentes WHERE criado_em BETWEEN ? AND ?',
                    [inicioMes, fimMes]
                ),
                prazos_vencidos: await this.db.get(
                    'SELECT COUNT(*) as total FROM prazos_pi WHERE data_prazo BETWEEN ? AND ? AND status = "vencido"',
                    [inicioMes, fimMes]
                )
            };
            
            console.log('Relatório mensal de PI gerado:', relatorio);
            
            if (this.core && this.core.eventBus) {
                this.core.eventBus.emit('relatorio:gerado', {
                    tipo: 'propriedade_intelectual_mensal',
                    dados: relatorio
                });
            }
            
        } catch (error) {
            console.error('Erro ao gerar relatório mensal:', error);
        }
    }

    /**
     * Finaliza o módulo
     */
    async shutdown() {
        try {
            console.log('Finalizando Módulo Marcas...');
            
            // Parar jobs de monitoramento
            for (const [name, job] of this.monitoringJobs) {
                job.destroy();
                console.log(`Job ${name} finalizado`);
            }
            
            this.isInitialized = false;
            this.emit('module:shutdown', { module: this.name });
            
            console.log('Módulo Marcas finalizado com sucesso');
            
        } catch (error) {
            console.error('Erro ao finalizar Módulo Marcas:', error);
            throw error;
        }
    }
}

module.exports = MarcasModule;