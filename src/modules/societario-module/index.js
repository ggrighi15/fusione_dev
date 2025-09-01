/**
 * Módulo Societário - Gestão da Estrutura Societária do Grupo
 * 
 * Este módulo gerencia toda a estrutura societária do grupo empresarial,
 * incluindo empresas, participações, quotas, alterações contratuais,
 * assembleias, distribuição de resultados e compliance societário.
 * 
 * @author Fusione Core System
 * @version 1.0.0
 */

import fs from 'fs-extra';
import path from 'path';
import moment from 'moment';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

class SocietarioModule extends EventEmitter {
    constructor() {
        super();
        this.config = {};
        this.db = null;
        this.initialized = false;
        this.cronJobs = new Map();
        this.logger = null;
    }

    /**
     * Inicializa o módulo Societário
     */
    async initialize(coreSystem) {
        try {
            this.logger = coreSystem.logger;
            this.db = coreSystem.database;
            
            await this.loadConfig();
            await this.createDatabaseTables();
            await this.setupEventHandlers();
            await this.startMonitoringJobs();
            
            this.initialized = true;
            this.logger.info('Módulo Societário inicializado com sucesso');
            
            this.emit('societario:initialized');
            return true;
        } catch (error) {
            this.logger.error('Erro ao inicializar módulo Societário:', error);
            throw error;
        }
    }

    /**
     * Carrega configurações do módulo
     */
    async loadConfig() {
        const configPath = path.join(__dirname, 'module.json');
        if (await fs.pathExists(configPath)) {
            const moduleConfig = await fs.readJson(configPath);
            this.config = moduleConfig.settings || {};
        }
    }

    /**
     * Cria tabelas do banco de dados
     */
    async createDatabaseTables() {
        const tables = {
            // Empresas do grupo
            empresas: `
                CREATE TABLE IF NOT EXISTS empresas (
                    id VARCHAR(36) PRIMARY KEY,
                    numero_interno VARCHAR(20) UNIQUE NOT NULL,
                    razao_social VARCHAR(255) NOT NULL,
                    nome_fantasia VARCHAR(255),
                    cnpj VARCHAR(18) UNIQUE,
                    inscricao_estadual VARCHAR(50),
                    inscricao_municipal VARCHAR(50),
                    tipo_empresa ENUM('matriz', 'filial', 'subsidiaria', 'controlada', 'coligada') NOT NULL,
                    empresa_mae_id VARCHAR(36),
                    atividade_principal VARCHAR(10),
                    atividades_secundarias JSON,
                    endereco JSON NOT NULL,
                    contatos JSON,
                    capital_social DECIMAL(15,2) DEFAULT 0,
                    capital_integralizado DECIMAL(15,2) DEFAULT 0,
                    data_constituicao DATE,
                    data_registro DATE,
                    situacao ENUM('ativa', 'inativa', 'suspensa', 'baixada') DEFAULT 'ativa',
                    regime_tributario ENUM('simples', 'lucro_presumido', 'lucro_real') DEFAULT 'simples',
                    observacoes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by VARCHAR(36),
                    updated_by VARCHAR(36),
                    FOREIGN KEY (empresa_mae_id) REFERENCES empresas(id),
                    INDEX idx_empresas_cnpj (cnpj),
                    INDEX idx_empresas_tipo (tipo_empresa),
                    INDEX idx_empresas_situacao (situacao)
                )
            `,

            // Sócios e participações
            socios: `
                CREATE TABLE IF NOT EXISTS socios (
                    id VARCHAR(36) PRIMARY KEY,
                    empresa_id VARCHAR(36) NOT NULL,
                    pessoa_id VARCHAR(36) NOT NULL,
                    tipo_socio ENUM('pessoa_fisica', 'pessoa_juridica') NOT NULL,
                    tipo_participacao ENUM('quotista', 'acionista', 'administrador', 'procurador') NOT NULL,
                    percentual_participacao DECIMAL(5,2) NOT NULL DEFAULT 0,
                    valor_participacao DECIMAL(15,2) NOT NULL DEFAULT 0,
                    quotas_quantidade INTEGER DEFAULT 0,
                    quotas_valor_unitario DECIMAL(10,2) DEFAULT 0,
                    data_entrada DATE NOT NULL,
                    data_saida DATE,
                    forma_integralizacao ENUM('dinheiro', 'bens', 'creditos', 'servicos') DEFAULT 'dinheiro',
                    valor_integralizado DECIMAL(15,2) DEFAULT 0,
                    valor_a_integralizar DECIMAL(15,2) DEFAULT 0,
                    prazo_integralizacao DATE,
                    poderes_administracao JSON,
                    restricoes JSON,
                    observacoes TEXT,
                    ativo BOOLEAN DEFAULT true,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by VARCHAR(36),
                    updated_by VARCHAR(36),
                    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
                    INDEX idx_socios_empresa (empresa_id),
                    INDEX idx_socios_pessoa (pessoa_id),
                    INDEX idx_socios_tipo (tipo_participacao),
                    INDEX idx_socios_ativo (ativo)
                )
            `,

            // Alterações contratuais
            alteracoes_contratuais: `
                CREATE TABLE IF NOT EXISTS alteracoes_contratuais (
                    id VARCHAR(36) PRIMARY KEY,
                    numero_interno VARCHAR(20) UNIQUE NOT NULL,
                    empresa_id VARCHAR(36) NOT NULL,
                    tipo_alteracao ENUM('capital', 'socios', 'administracao', 'endereco', 'atividade', 'outros') NOT NULL,
                    descricao TEXT NOT NULL,
                    data_alteracao DATE NOT NULL,
                    data_registro DATE,
                    numero_registro VARCHAR(50),
                    orgao_registro VARCHAR(100),
                    valor_alteracao DECIMAL(15,2),
                    documentos JSON,
                    status ENUM('elaboracao', 'aprovada', 'registrada', 'cancelada') DEFAULT 'elaboracao',
                    aprovada_por VARCHAR(36),
                    data_aprovacao TIMESTAMP,
                    observacoes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by VARCHAR(36),
                    updated_by VARCHAR(36),
                    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
                    INDEX idx_alteracoes_empresa (empresa_id),
                    INDEX idx_alteracoes_tipo (tipo_alteracao),
                    INDEX idx_alteracoes_status (status),
                    INDEX idx_alteracoes_data (data_alteracao)
                )
            `,

            // Assembleias e reuniões
            assembleias: `
                CREATE TABLE IF NOT EXISTS assembleias (
                    id VARCHAR(36) PRIMARY KEY,
                    numero_interno VARCHAR(20) UNIQUE NOT NULL,
                    empresa_id VARCHAR(36) NOT NULL,
                    tipo ENUM('ordinaria', 'extraordinaria', 'reuniao_socios', 'reuniao_diretoria') NOT NULL,
                    data_assembleia DATETIME NOT NULL,
                    local_assembleia VARCHAR(255),
                    convocacao JSON NOT NULL,
                    pauta JSON NOT NULL,
                    quorum_minimo DECIMAL(5,2) DEFAULT 50.00,
                    quorum_presente DECIMAL(5,2),
                    deliberacoes JSON,
                    ata_assembleia TEXT,
                    documentos JSON,
                    status ENUM('convocada', 'realizada', 'cancelada', 'adiada') DEFAULT 'convocada',
                    presidente_mesa VARCHAR(36),
                    secretario_mesa VARCHAR(36),
                    observacoes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by VARCHAR(36),
                    updated_by VARCHAR(36),
                    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
                    INDEX idx_assembleias_empresa (empresa_id),
                    INDEX idx_assembleias_tipo (tipo),
                    INDEX idx_assembleias_data (data_assembleia),
                    INDEX idx_assembleias_status (status)
                )
            `,

            // Participantes das assembleias
            assembleia_participantes: `
                CREATE TABLE IF NOT EXISTS assembleia_participantes (
                    id VARCHAR(36) PRIMARY KEY,
                    assembleia_id VARCHAR(36) NOT NULL,
                    socio_id VARCHAR(36) NOT NULL,
                    presente BOOLEAN DEFAULT false,
                    representado_por VARCHAR(36),
                    procuracao_id VARCHAR(36),
                    percentual_representado DECIMAL(5,2),
                    votos_favor INTEGER DEFAULT 0,
                    votos_contra INTEGER DEFAULT 0,
                    abstencoes INTEGER DEFAULT 0,
                    observacoes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (assembleia_id) REFERENCES assembleias(id),
                    FOREIGN KEY (socio_id) REFERENCES socios(id),
                    INDEX idx_participantes_assembleia (assembleia_id),
                    INDEX idx_participantes_socio (socio_id)
                )
            `,

            // Distribuição de resultados
            distribuicao_resultados: `
                CREATE TABLE IF NOT EXISTS distribuicao_resultados (
                    id VARCHAR(36) PRIMARY KEY,
                    numero_interno VARCHAR(20) UNIQUE NOT NULL,
                    empresa_id VARCHAR(36) NOT NULL,
                    exercicio_ano INTEGER NOT NULL,
                    tipo_distribuicao ENUM('lucros', 'dividendos', 'jcp', 'reservas') NOT NULL,
                    valor_total DECIMAL(15,2) NOT NULL,
                    data_aprovacao DATE NOT NULL,
                    data_pagamento DATE,
                    base_calculo ENUM('lucro_liquido', 'reservas', 'capital', 'outros') NOT NULL,
                    percentual_distribuicao DECIMAL(5,2),
                    assembleia_id VARCHAR(36),
                    status ENUM('aprovada', 'paga', 'cancelada') DEFAULT 'aprovada',
                    observacoes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    created_by VARCHAR(36),
                    updated_by VARCHAR(36),
                    FOREIGN KEY (empresa_id) REFERENCES empresas(id),
                    FOREIGN KEY (assembleia_id) REFERENCES assembleias(id),
                    INDEX idx_distribuicao_empresa (empresa_id),
                    INDEX idx_distribuicao_exercicio (exercicio_ano),
                    INDEX idx_distribuicao_tipo (tipo_distribuicao),
                    INDEX idx_distribuicao_status (status)
                )
            `,

            // Detalhes da distribuição por sócio
            distribuicao_socios: `
                CREATE TABLE IF NOT EXISTS distribuicao_socios (
                    id VARCHAR(36) PRIMARY KEY,
                    distribuicao_id VARCHAR(36) NOT NULL,
                    socio_id VARCHAR(36) NOT NULL,
                    percentual_participacao DECIMAL(5,2) NOT NULL,
                    valor_bruto DECIMAL(15,2) NOT NULL,
                    valor_ir DECIMAL(15,2) DEFAULT 0,
                    valor_liquido DECIMAL(15,2) NOT NULL,
                    data_pagamento DATE,
                    forma_pagamento ENUM('dinheiro', 'transferencia', 'cheque', 'pix') DEFAULT 'transferencia',
                    comprovante_pagamento VARCHAR(255),
                    status ENUM('pendente', 'pago', 'cancelado') DEFAULT 'pendente',
                    observacoes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (distribuicao_id) REFERENCES distribuicao_resultados(id),
                    FOREIGN KEY (socio_id) REFERENCES socios(id),
                    INDEX idx_dist_socios_distribuicao (distribuicao_id),
                    INDEX idx_dist_socios_socio (socio_id),
                    INDEX idx_dist_socios_status (status)
                )
            `,

            // Histórico de alterações
            societario_historico: `
                CREATE TABLE IF NOT EXISTS societario_historico (
                    id VARCHAR(36) PRIMARY KEY,
                    entidade_tipo ENUM('empresa', 'socio', 'alteracao', 'assembleia', 'distribuicao') NOT NULL,
                    entidade_id VARCHAR(36) NOT NULL,
                    acao ENUM('criacao', 'atualizacao', 'exclusao', 'aprovacao', 'cancelamento') NOT NULL,
                    dados_anteriores JSON,
                    dados_novos JSON,
                    observacoes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by VARCHAR(36),
                    INDEX idx_historico_entidade (entidade_tipo, entidade_id),
                    INDEX idx_historico_data (created_at),
                    INDEX idx_historico_usuario (created_by)
                )
            `
        };

        for (const [tableName, sql] of Object.entries(tables)) {
            await this.db.query(sql);
            this.logger.info(`Tabela ${tableName} criada/verificada`);
        }
    }

    /**
     * Configura manipuladores de eventos
     */
    async setupEventHandlers() {
        // Eventos internos
        this.on('empresa:criada', this.handleEmpresaCriada.bind(this));
        this.on('socio:adicionado', this.handleSocioAdicionado.bind(this));
        this.on('alteracao:aprovada', this.handleAlteracaoAprovada.bind(this));
        this.on('assembleia:realizada', this.handleAssembleiaRealizada.bind(this));
        this.on('distribuicao:aprovada', this.handleDistribuicaoAprovada.bind(this));

        // Eventos externos
        this.on('pessoa:criada', this.handlePessoaCriada.bind(this));
        this.on('pessoa:atualizada', this.handlePessoaAtualizada.bind(this));
        this.on('documento:assinado', this.handleDocumentoAssinado.bind(this));
    }

    /**
     * Inicia jobs de monitoramento
     */
    async startMonitoringJobs() {
        // Verificação de prazos de integralização
        const integralizacaoJob = cron.schedule('0 9 * * *', async () => {
            await this.verificarPrazosIntegralizacao();
        }, { scheduled: false });
        
        // Verificação de assembleias obrigatórias
        const assembleiasJob = cron.schedule('0 8 1 * *', async () => {
            await this.verificarAssembleiasObrigatorias();
        }, { scheduled: false });
        
        // Relatórios mensais
        const relatoriosJob = cron.schedule('0 7 1 * *', async () => {
            await this.gerarRelatoriosMensais();
        }, { scheduled: false });

        this.cronJobs.set('integralizacao', integralizacaoJob);
        this.cronJobs.set('assembleias', assembleiasJob);
        this.cronJobs.set('relatorios', relatoriosJob);

        // Inicia os jobs
        integralizacaoJob.start();
        assembleiasJob.start();
        relatoriosJob.start();
    }

    // ==================== MÉTODOS PRINCIPAIS ====================

    /**
     * Cria uma nova empresa
     */
    async criarEmpresa(dadosEmpresa, userId) {
        try {
            const empresaId = uuidv4();
            const numeroInterno = await this.gerarNumeroInterno('empresa');

            const empresa = {
                id: empresaId,
                numero_interno: numeroInterno,
                razao_social: dadosEmpresa.razao_social,
                nome_fantasia: dadosEmpresa.nome_fantasia,
                cnpj: dadosEmpresa.cnpj,
                inscricao_estadual: dadosEmpresa.inscricao_estadual,
                inscricao_municipal: dadosEmpresa.inscricao_municipal,
                tipo_empresa: dadosEmpresa.tipo_empresa,
                empresa_mae_id: dadosEmpresa.empresa_mae_id,
                atividade_principal: dadosEmpresa.atividade_principal,
                atividades_secundarias: JSON.stringify(dadosEmpresa.atividades_secundarias || []),
                endereco: JSON.stringify(dadosEmpresa.endereco),
                contatos: JSON.stringify(dadosEmpresa.contatos || {}),
                capital_social: dadosEmpresa.capital_social || 0,
                capital_integralizado: dadosEmpresa.capital_integralizado || 0,
                data_constituicao: dadosEmpresa.data_constituicao,
                data_registro: dadosEmpresa.data_registro,
                situacao: dadosEmpresa.situacao || 'ativa',
                regime_tributario: dadosEmpresa.regime_tributario || 'simples',
                observacoes: dadosEmpresa.observacoes,
                created_by: userId,
                updated_by: userId
            };

            await this.db.query(
                'INSERT INTO empresas SET ?',
                [empresa]
            );

            await this.registrarHistorico('empresa', empresaId, 'criacao', null, empresa, userId);
            
            this.emit('empresa:criada', { empresa, userId });
            
            return { success: true, empresaId, numeroInterno };
        } catch (error) {
            this.logger.error('Erro ao criar empresa:', error);
            throw error;
        }
    }

    /**
     * Adiciona um sócio à empresa
     */
    async adicionarSocio(dadosSocio, userId) {
        try {
            const socioId = uuidv4();

            const socio = {
                id: socioId,
                empresa_id: dadosSocio.empresa_id,
                pessoa_id: dadosSocio.pessoa_id,
                tipo_socio: dadosSocio.tipo_socio,
                tipo_participacao: dadosSocio.tipo_participacao,
                percentual_participacao: dadosSocio.percentual_participacao,
                valor_participacao: dadosSocio.valor_participacao,
                quotas_quantidade: dadosSocio.quotas_quantidade || 0,
                quotas_valor_unitario: dadosSocio.quotas_valor_unitario || 0,
                data_entrada: dadosSocio.data_entrada,
                forma_integralizacao: dadosSocio.forma_integralizacao || 'dinheiro',
                valor_integralizado: dadosSocio.valor_integralizado || 0,
                valor_a_integralizar: dadosSocio.valor_a_integralizar || 0,
                prazo_integralizacao: dadosSocio.prazo_integralizacao,
                poderes_administracao: JSON.stringify(dadosSocio.poderes_administracao || {}),
                restricoes: JSON.stringify(dadosSocio.restricoes || {}),
                observacoes: dadosSocio.observacoes,
                created_by: userId,
                updated_by: userId
            };

            await this.db.query(
                'INSERT INTO socios SET ?',
                [socio]
            );

            await this.registrarHistorico('socio', socioId, 'criacao', null, socio, userId);
            
            this.emit('socio:adicionado', { socio, userId });
            
            return { success: true, socioId };
        } catch (error) {
            this.logger.error('Erro ao adicionar sócio:', error);
            throw error;
        }
    }

    /**
     * Cria uma alteração contratual
     */
    async criarAlteracaoContratual(dadosAlteracao, userId) {
        try {
            const alteracaoId = uuidv4();
            const numeroInterno = await this.gerarNumeroInterno('alteracao');

            const alteracao = {
                id: alteracaoId,
                numero_interno: numeroInterno,
                empresa_id: dadosAlteracao.empresa_id,
                tipo_alteracao: dadosAlteracao.tipo_alteracao,
                descricao: dadosAlteracao.descricao,
                data_alteracao: dadosAlteracao.data_alteracao,
                data_registro: dadosAlteracao.data_registro,
                numero_registro: dadosAlteracao.numero_registro,
                orgao_registro: dadosAlteracao.orgao_registro,
                valor_alteracao: dadosAlteracao.valor_alteracao,
                documentos: JSON.stringify(dadosAlteracao.documentos || []),
                observacoes: dadosAlteracao.observacoes,
                created_by: userId,
                updated_by: userId
            };

            await this.db.query(
                'INSERT INTO alteracoes_contratuais SET ?',
                [alteracao]
            );

            await this.registrarHistorico('alteracao', alteracaoId, 'criacao', null, alteracao, userId);
            
            this.emit('alteracao:criada', { alteracao, userId });
            
            return { success: true, alteracaoId, numeroInterno };
        } catch (error) {
            this.logger.error('Erro ao criar alteração contratual:', error);
            throw error;
        }
    }

    /**
     * Convoca uma assembleia
     */
    async convocarAssembleia(dadosAssembleia, userId) {
        try {
            const assembleiaId = uuidv4();
            const numeroInterno = await this.gerarNumeroInterno('assembleia');

            const assembleia = {
                id: assembleiaId,
                numero_interno: numeroInterno,
                empresa_id: dadosAssembleia.empresa_id,
                tipo: dadosAssembleia.tipo,
                data_assembleia: dadosAssembleia.data_assembleia,
                local_assembleia: dadosAssembleia.local_assembleia,
                convocacao: JSON.stringify(dadosAssembleia.convocacao),
                pauta: JSON.stringify(dadosAssembleia.pauta),
                quorum_minimo: dadosAssembleia.quorum_minimo || 50.00,
                presidente_mesa: dadosAssembleia.presidente_mesa,
                secretario_mesa: dadosAssembleia.secretario_mesa,
                observacoes: dadosAssembleia.observacoes,
                created_by: userId,
                updated_by: userId
            };

            await this.db.query(
                'INSERT INTO assembleias SET ?',
                [assembleia]
            );

            await this.registrarHistorico('assembleia', assembleiaId, 'criacao', null, assembleia, userId);
            
            this.emit('assembleia:convocada', { assembleia, userId });
            
            return { success: true, assembleiaId, numeroInterno };
        } catch (error) {
            this.logger.error('Erro ao convocar assembleia:', error);
            throw error;
        }
    }

    /**
     * Aprova distribuição de resultados
     */
    async aprovarDistribuicaoResultados(dadosDistribuicao, userId) {
        try {
            const distribuicaoId = uuidv4();
            const numeroInterno = await this.gerarNumeroInterno('distribuicao');

            const distribuicao = {
                id: distribuicaoId,
                numero_interno: numeroInterno,
                empresa_id: dadosDistribuicao.empresa_id,
                exercicio_ano: dadosDistribuicao.exercicio_ano,
                tipo_distribuicao: dadosDistribuicao.tipo_distribuicao,
                valor_total: dadosDistribuicao.valor_total,
                data_aprovacao: dadosDistribuicao.data_aprovacao,
                data_pagamento: dadosDistribuicao.data_pagamento,
                base_calculo: dadosDistribuicao.base_calculo,
                percentual_distribuicao: dadosDistribuicao.percentual_distribuicao,
                assembleia_id: dadosDistribuicao.assembleia_id,
                observacoes: dadosDistribuicao.observacoes,
                created_by: userId,
                updated_by: userId
            };

            await this.db.query(
                'INSERT INTO distribuicao_resultados SET ?',
                [distribuicao]
            );

            // Calcula e cria distribuição para cada sócio
            await this.calcularDistribuicaoSocios(distribuicaoId, dadosDistribuicao.empresa_id, userId);

            await this.registrarHistorico('distribuicao', distribuicaoId, 'criacao', null, distribuicao, userId);
            
            this.emit('distribuicao:aprovada', { distribuicao, userId });
            
            return { success: true, distribuicaoId, numeroInterno };
        } catch (error) {
            this.logger.error('Erro ao aprovar distribuição de resultados:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS DE CONSULTA ====================

    /**
     * Obtém empresa por ID
     */
    async obterEmpresa(empresaId) {
        try {
            const [rows] = await this.db.query(
                'SELECT * FROM empresas WHERE id = ?',
                [empresaId]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            const empresa = rows[0];
            empresa.endereco = JSON.parse(empresa.endereco || '{}');
            empresa.contatos = JSON.parse(empresa.contatos || '{}');
            empresa.atividades_secundarias = JSON.parse(empresa.atividades_secundarias || '[]');
            
            return empresa;
        } catch (error) {
            this.logger.error('Erro ao obter empresa:', error);
            throw error;
        }
    }

    /**
     * Lista empresas com filtros
     */
    async listarEmpresas(filtros = {}) {
        try {
            let query = 'SELECT * FROM empresas WHERE 1=1';
            const params = [];
            
            if (filtros.tipo_empresa) {
                query += ' AND tipo_empresa = ?';
                params.push(filtros.tipo_empresa);
            }
            
            if (filtros.situacao) {
                query += ' AND situacao = ?';
                params.push(filtros.situacao);
            }
            
            if (filtros.empresa_mae_id) {
                query += ' AND empresa_mae_id = ?';
                params.push(filtros.empresa_mae_id);
            }
            
            query += ' ORDER BY razao_social';
            
            const [rows] = await this.db.query(query, params);
            
            return rows.map(empresa => {
                empresa.endereco = JSON.parse(empresa.endereco || '{}');
                empresa.contatos = JSON.parse(empresa.contatos || '{}');
                empresa.atividades_secundarias = JSON.parse(empresa.atividades_secundarias || '[]');
                return empresa;
            });
        } catch (error) {
            this.logger.error('Erro ao listar empresas:', error);
            throw error;
        }
    }

    /**
     * Lista sócios de uma empresa
     */
    async listarSocios(empresaId, filtros = {}) {
        try {
            let query = `
                SELECT s.*, p.nome, p.cpf_cnpj, p.tipo_pessoa
                FROM socios s
                LEFT JOIN pessoas p ON s.pessoa_id = p.id
                WHERE s.empresa_id = ? AND s.ativo = true
            `;
            const params = [empresaId];
            
            if (filtros.tipo_participacao) {
                query += ' AND s.tipo_participacao = ?';
                params.push(filtros.tipo_participacao);
            }
            
            query += ' ORDER BY s.percentual_participacao DESC';
            
            const [rows] = await this.db.query(query, params);
            
            return rows.map(socio => {
                socio.poderes_administracao = JSON.parse(socio.poderes_administracao || '{}');
                socio.restricoes = JSON.parse(socio.restricoes || '{}');
                return socio;
            });
        } catch (error) {
            this.logger.error('Erro ao listar sócios:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS AUXILIARES ====================

    /**
     * Gera número interno sequencial
     */
    async gerarNumeroInterno(tipo) {
        const ano = moment().format('YYYY');
        const prefixos = {
            empresa: 'EMP',
            alteracao: 'ALT',
            assembleia: 'ASS',
            distribuicao: 'DIST'
        };
        
        const prefixo = prefixos[tipo] || 'SOC';
        
        // Busca último número do ano
        const [rows] = await this.db.query(
            `SELECT numero_interno FROM ${
                tipo === 'empresa' ? 'empresas' :
                tipo === 'alteracao' ? 'alteracoes_contratuais' :
                tipo === 'assembleia' ? 'assembleias' :
                'distribuicao_resultados'
            } WHERE numero_interno LIKE ? ORDER BY numero_interno DESC LIMIT 1`,
            [`${prefixo}-${ano}-%`]
        );
        
        let proximoNumero = 1;
        if (rows.length > 0) {
            const ultimoNumero = rows[0].numero_interno;
            const partes = ultimoNumero.split('-');
            proximoNumero = parseInt(partes[2]) + 1;
        }
        
        return `${prefixo}-${ano}-${proximoNumero.toString().padStart(6, '0')}`;
    }

    /**
     * Calcula distribuição para cada sócio
     */
    async calcularDistribuicaoSocios(distribuicaoId, empresaId, userId) {
        try {
            const [distribuicao] = await this.db.query(
                'SELECT * FROM distribuicao_resultados WHERE id = ?',
                [distribuicaoId]
            );
            
            const socios = await this.listarSocios(empresaId, { tipo_participacao: 'quotista' });
            
            for (const socio of socios) {
                const valorBruto = (distribuicao[0].valor_total * socio.percentual_participacao) / 100;
                const valorIR = this.calcularIR(valorBruto, distribuicao[0].tipo_distribuicao);
                const valorLiquido = valorBruto - valorIR;
                
                const distribuicaoSocio = {
                    id: uuidv4(),
                    distribuicao_id: distribuicaoId,
                    socio_id: socio.id,
                    percentual_participacao: socio.percentual_participacao,
                    valor_bruto: valorBruto,
                    valor_ir: valorIR,
                    valor_liquido: valorLiquido
                };
                
                await this.db.query(
                    'INSERT INTO distribuicao_socios SET ?',
                    [distribuicaoSocio]
                );
            }
        } catch (error) {
            this.logger.error('Erro ao calcular distribuição para sócios:', error);
            throw error;
        }
    }

    /**
     * Calcula IR sobre distribuição
     */
    calcularIR(valor, tipoDistribuicao) {
        // Simplificado - implementar tabela real do IR
        const aliquotas = {
            'lucros': 0,
            'dividendos': 0,
            'jcp': 0.15,
            'reservas': 0
        };
        
        return valor * (aliquotas[tipoDistribuicao] || 0);
    }

    /**
     * Registra histórico de alterações
     */
    async registrarHistorico(entidadeTipo, entidadeId, acao, dadosAnteriores, dadosNovos, userId) {
        try {
            const historico = {
                id: uuidv4(),
                entidade_tipo: entidadeTipo,
                entidade_id: entidadeId,
                acao: acao,
                dados_anteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
                dados_novos: JSON.stringify(dadosNovos),
                created_by: userId
            };
            
            await this.db.query(
                'INSERT INTO societario_historico SET ?',
                [historico]
            );
        } catch (error) {
            this.logger.error('Erro ao registrar histórico:', error);
        }
    }

    /**
     * Verifica prazos de integralização
     */
    async verificarPrazosIntegralizacao() {
        try {
            const dataLimite = moment().add(30, 'days').format('YYYY-MM-DD');
            
            const [rows] = await this.db.query(`
                SELECT s.*, e.razao_social, p.nome
                FROM socios s
                JOIN empresas e ON s.empresa_id = e.id
                JOIN pessoas p ON s.pessoa_id = p.id
                WHERE s.prazo_integralizacao <= ? 
                AND s.valor_a_integralizar > 0
                AND s.ativo = true
            `, [dataLimite]);
            
            for (const socio of rows) {
                this.emit('integralizacao:vencendo', {
                    socio,
                    diasRestantes: moment(socio.prazo_integralizacao).diff(moment(), 'days')
                });
            }
        } catch (error) {
            this.logger.error('Erro ao verificar prazos de integralização:', error);
        }
    }

    /**
     * Verifica assembleias obrigatórias
     */
    async verificarAssembleiasObrigatorias() {
        try {
            const anoAtual = moment().year();
            
            const [empresas] = await this.db.query(
                'SELECT * FROM empresas WHERE situacao = "ativa"'
            );
            
            for (const empresa of empresas) {
                const [assembleias] = await this.db.query(`
                    SELECT COUNT(*) as total
                    FROM assembleias
                    WHERE empresa_id = ? 
                    AND tipo = 'ordinaria'
                    AND YEAR(data_assembleia) = ?
                    AND status = 'realizada'
                `, [empresa.id, anoAtual]);
                
                if (assembleias[0].total === 0) {
                    this.emit('assembleia:obrigatoria_pendente', {
                        empresa,
                        ano: anoAtual
                    });
                }
            }
        } catch (error) {
            this.logger.error('Erro ao verificar assembleias obrigatórias:', error);
        }
    }

    /**
     * Gera relatórios mensais
     */
    async gerarRelatoriosMensais() {
        try {
            const mesAtual = moment().format('YYYY-MM');
            
            // Relatório de empresas ativas
            const relatorioEmpresas = await this.gerarRelatorioEmpresas();
            
            // Relatório de distribuições
            const relatorioDistribuicoes = await this.gerarRelatorioDistribuicoes(mesAtual);
            
            // Relatório de assembleias
            const relatorioAssembleias = await this.gerarRelatorioAssembleias(mesAtual);
            
            this.emit('relatorios:gerados', {
                mes: mesAtual,
                relatorios: {
                    empresas: relatorioEmpresas,
                    distribuicoes: relatorioDistribuicoes,
                    assembleias: relatorioAssembleias
                }
            });
        } catch (error) {
            this.logger.error('Erro ao gerar relatórios mensais:', error);
        }
    }

    // ==================== MANIPULADORES DE EVENTOS ====================

    async handleEmpresaCriada(data) {
        this.logger.info(`Nova empresa criada: ${data.empresa.razao_social}`);
    }

    async handleSocioAdicionado(data) {
        this.logger.info(`Novo sócio adicionado à empresa ${data.socio.empresa_id}`);
    }

    async handleAlteracaoAprovada(data) {
        this.logger.info(`Alteração contratual aprovada: ${data.alteracao.numero_interno}`);
    }

    async handleAssembleiaRealizada(data) {
        this.logger.info(`Assembleia realizada: ${data.assembleia.numero_interno}`);
    }

    async handleDistribuicaoAprovada(data) {
        this.logger.info(`Distribuição de resultados aprovada: ${data.distribuicao.numero_interno}`);
    }

    async handlePessoaCriada(data) {
        // Lógica para quando uma nova pessoa é criada
    }

    async handlePessoaAtualizada(data) {
        // Atualiza dados do sócio se necessário
    }

    async handleDocumentoAssinado(data) {
        // Processa documentos societários assinados
    }

    // ==================== MÉTODOS DE RELATÓRIOS ====================

    async gerarRelatorioEmpresas() {
        const [rows] = await this.db.query(`
            SELECT 
                situacao,
                COUNT(*) as total,
                SUM(capital_social) as capital_total
            FROM empresas
            GROUP BY situacao
        `);
        
        return rows;
    }

    async gerarRelatorioDistribuicoes(periodo) {
        const [rows] = await this.db.query(`
            SELECT 
                tipo_distribuicao,
                COUNT(*) as total_distribuicoes,
                SUM(valor_total) as valor_total
            FROM distribuicao_resultados
            WHERE DATE_FORMAT(data_aprovacao, '%Y-%m') = ?
            GROUP BY tipo_distribuicao
        `, [periodo]);
        
        return rows;
    }

    async gerarRelatorioAssembleias(periodo) {
        const [rows] = await this.db.query(`
            SELECT 
                tipo,
                status,
                COUNT(*) as total
            FROM assembleias
            WHERE DATE_FORMAT(data_assembleia, '%Y-%m') = ?
            GROUP BY tipo, status
        `, [periodo]);
        
        return rows;
    }
}

export default SocietarioModule;