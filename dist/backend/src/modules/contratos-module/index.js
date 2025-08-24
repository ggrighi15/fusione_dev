const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

/**
 * Módulo de Contratos - Gestão completa do ciclo de vida contratual
 * Funcionalidades:
 * - Criação e gestão de contratos
 * - Assinaturas eletrônicas
 * - Versionamento e histórico
 * - Workflow de aprovação
 * - Alertas de vencimento
 * - Integração com DocuSign/Adobe Sign
 * - Análise de riscos contratuais
 * - Relatórios e dashboards
 */
class ContratosModule {
    constructor() {
        this.name = 'contratos-module';
        this.version = '1.0.0';
        this.description = 'Módulo de gestão completa de contratos';
        this.config = {};
        this.database = null;
        this.eventEmitter = null;
        this.cache = null;
        this.logger = null;
        this.initialized = false;
    }

    /**
     * Inicializa o módulo
     */
    async initialize(context) {
        try {
            this.database = context.database;
            this.eventEmitter = context.eventEmitter;
            this.cache = context.cache;
            this.logger = context.logger;
            this.config = context.config;

            // Criar tabelas necessárias
            await this.createTables();

            // Configurar listeners de eventos
            this.setupEventListeners();

            // Inicializar jobs de monitoramento
            this.startMonitoringJobs();

            this.initialized = true;
            this.logger.info('Módulo Contratos inicializado com sucesso');

            return { success: true, message: 'Módulo inicializado' };
        } catch (error) {
            this.logger.error('Erro ao inicializar módulo Contratos:', error);
            throw error;
        }
    }

    /**
     * Cria as tabelas necessárias no banco de dados
     */
    async createTables() {
        const tables = [
            // Tabela principal de contratos
            `CREATE TABLE IF NOT EXISTS contratos (
                id VARCHAR(36) PRIMARY KEY,
                numero_contrato VARCHAR(50) UNIQUE NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                descricao TEXT,
                tipo_contrato ENUM('compra', 'venda', 'prestacao_servico', 'locacao', 'parceria', 'confidencialidade', 'trabalho', 'outro') NOT NULL,
                status ENUM('rascunho', 'em_aprovacao', 'aprovado', 'assinado', 'ativo', 'suspenso', 'encerrado', 'cancelado') DEFAULT 'rascunho',
                valor_total DECIMAL(15,2),
                moeda VARCHAR(3) DEFAULT 'BRL',
                data_inicio DATE,
                data_fim DATE,
                data_vencimento DATE,
                renovacao_automatica BOOLEAN DEFAULT FALSE,
                periodo_renovacao INT,
                contratante_id VARCHAR(36),
                contratado_id VARCHAR(36),
                responsavel_id VARCHAR(36),
                departamento VARCHAR(100),
                centro_custo VARCHAR(50),
                arquivo_original TEXT,
                arquivo_assinado TEXT,
                hash_documento VARCHAR(64),
                template_id VARCHAR(36),
                observacoes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_by VARCHAR(36),
                updated_by VARCHAR(36),
                INDEX idx_numero_contrato (numero_contrato),
                INDEX idx_status (status),
                INDEX idx_tipo (tipo_contrato),
                INDEX idx_data_vencimento (data_vencimento),
                INDEX idx_contratante (contratante_id),
                INDEX idx_responsavel (responsavel_id)
            )`,

            // Tabela de cláusulas contratuais
            `CREATE TABLE IF NOT EXISTS contrato_clausulas (
                id VARCHAR(36) PRIMARY KEY,
                contrato_id VARCHAR(36) NOT NULL,
                numero_clausula VARCHAR(10) NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                conteudo TEXT NOT NULL,
                tipo ENUM('obrigacao', 'direito', 'penalidade', 'rescisao', 'pagamento', 'entrega', 'garantia', 'confidencialidade', 'outro') NOT NULL,
                obrigatoria BOOLEAN DEFAULT FALSE,
                ordem_exibicao INT DEFAULT 0,
                ativa BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE,
                INDEX idx_contrato_clausulas (contrato_id),
                INDEX idx_tipo_clausula (tipo)
            )`,

            // Tabela de assinaturas eletrônicas
            `CREATE TABLE IF NOT EXISTS contrato_assinaturas (
                id VARCHAR(36) PRIMARY KEY,
                contrato_id VARCHAR(36) NOT NULL,
                signatario_id VARCHAR(36) NOT NULL,
                nome_signatario VARCHAR(255) NOT NULL,
                email_signatario VARCHAR(255) NOT NULL,
                tipo_signatario ENUM('contratante', 'contratado', 'testemunha', 'aprovador', 'outro') NOT NULL,
                ordem_assinatura INT DEFAULT 0,
                status ENUM('pendente', 'enviado', 'visualizado', 'assinado', 'rejeitado', 'expirado') DEFAULT 'pendente',
                metodo_assinatura ENUM('digital', 'eletronica', 'fisica', 'docusign', 'adobe_sign') NOT NULL,
                certificado_digital TEXT,
                hash_assinatura VARCHAR(128),
                ip_assinatura VARCHAR(45),
                user_agent TEXT,
                localizacao VARCHAR(255),
                data_envio TIMESTAMP NULL,
                data_visualizacao TIMESTAMP NULL,
                data_assinatura TIMESTAMP NULL,
                data_expiracao TIMESTAMP NULL,
                token_acesso VARCHAR(128),
                observacoes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE,
                INDEX idx_contrato_assinaturas (contrato_id),
                INDEX idx_signatario (signatario_id),
                INDEX idx_status_assinatura (status)
            )`,

            // Tabela de workflow de aprovação
            `CREATE TABLE IF NOT EXISTS contrato_aprovacoes (
                id VARCHAR(36) PRIMARY KEY,
                contrato_id VARCHAR(36) NOT NULL,
                aprovador_id VARCHAR(36) NOT NULL,
                nivel_aprovacao INT NOT NULL,
                status ENUM('pendente', 'aprovado', 'rejeitado', 'delegado') DEFAULT 'pendente',
                data_solicitacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_resposta TIMESTAMP NULL,
                comentarios TEXT,
                delegado_para VARCHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE,
                INDEX idx_contrato_aprovacoes (contrato_id),
                INDEX idx_aprovador (aprovador_id),
                INDEX idx_status_aprovacao (status)
            )`,

            // Tabela de histórico de versões
            `CREATE TABLE IF NOT EXISTS contrato_versoes (
                id VARCHAR(36) PRIMARY KEY,
                contrato_id VARCHAR(36) NOT NULL,
                numero_versao VARCHAR(10) NOT NULL,
                descricao_alteracao TEXT,
                arquivo_versao TEXT,
                hash_versao VARCHAR(64),
                criado_por VARCHAR(36),
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ativa BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE,
                INDEX idx_contrato_versoes (contrato_id),
                INDEX idx_versao_ativa (ativa)
            )`,

            // Tabela de alertas e notificações
            `CREATE TABLE IF NOT EXISTS contrato_alertas (
                id VARCHAR(36) PRIMARY KEY,
                contrato_id VARCHAR(36) NOT NULL,
                tipo_alerta ENUM('vencimento', 'renovacao', 'pagamento', 'entrega', 'aprovacao', 'assinatura', 'outro') NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                descricao TEXT,
                data_alerta DATE NOT NULL,
                dias_antecedencia INT DEFAULT 0,
                status ENUM('ativo', 'enviado', 'cancelado') DEFAULT 'ativo',
                destinatarios JSON,
                enviado_em TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE,
                INDEX idx_contrato_alertas (contrato_id),
                INDEX idx_data_alerta (data_alerta),
                INDEX idx_tipo_alerta (tipo_alerta)
            )`,

            // Tabela de templates de contrato
            `CREATE TABLE IF NOT EXISTS contrato_templates (
                id VARCHAR(36) PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT,
                tipo_contrato VARCHAR(50) NOT NULL,
                conteudo_template LONGTEXT NOT NULL,
                variaveis JSON,
                clausulas_padrao JSON,
                ativo BOOLEAN DEFAULT TRUE,
                categoria VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                created_by VARCHAR(36),
                INDEX idx_tipo_template (tipo_contrato),
                INDEX idx_categoria (categoria)
            )`
        ];

        for (const table of tables) {
            await this.database.query(table);
        }
    }

    /**
     * Configura os listeners de eventos
     */
    setupEventListeners() {
        this.eventEmitter.on('contrato:created', this.handleContratoCreated.bind(this));
        this.eventEmitter.on('contrato:signed', this.handleContratoSigned.bind(this));
        this.eventEmitter.on('contrato:expired', this.handleContratoExpired.bind(this));
        this.eventEmitter.on('user:login', this.handleUserLogin.bind(this));
    }

    /**
     * Inicia jobs de monitoramento
     */
    startMonitoringJobs() {
        // Verificar vencimentos diariamente
        setInterval(() => {
            this.checkExpiringContracts();
        }, 24 * 60 * 60 * 1000); // 24 horas

        // Verificar assinaturas pendentes a cada hora
        setInterval(() => {
            this.checkPendingSignatures();
        }, 60 * 60 * 1000); // 1 hora
    }

    /**
     * Cria um novo contrato
     */
    async createContrato(contratoData, userId) {
        try {
            const contratoId = crypto.randomUUID();
            const numeroContrato = await this.generateContratoNumber();
            
            const contrato = {
                id: contratoId,
                numero_contrato: numeroContrato,
                titulo: contratoData.titulo,
                descricao: contratoData.descricao,
                tipo_contrato: contratoData.tipo_contrato,
                valor_total: contratoData.valor_total,
                moeda: contratoData.moeda || 'BRL',
                data_inicio: contratoData.data_inicio,
                data_fim: contratoData.data_fim,
                data_vencimento: contratoData.data_vencimento,
                renovacao_automatica: contratoData.renovacao_automatica || false,
                periodo_renovacao: contratoData.periodo_renovacao,
                contratante_id: contratoData.contratante_id,
                contratado_id: contratoData.contratado_id,
                responsavel_id: contratoData.responsavel_id,
                departamento: contratoData.departamento,
                centro_custo: contratoData.centro_custo,
                template_id: contratoData.template_id,
                observacoes: contratoData.observacoes,
                created_by: userId,
                updated_by: userId
            };

            await this.database.query(
                'INSERT INTO contratos SET ?',
                [contrato]
            );

            // Adicionar cláusulas se fornecidas
            if (contratoData.clausulas && contratoData.clausulas.length > 0) {
                await this.addClausulas(contratoId, contratoData.clausulas, userId);
            }

            // Configurar workflow de aprovação
            if (contratoData.aprovadores && contratoData.aprovadores.length > 0) {
                await this.setupApprovalWorkflow(contratoId, contratoData.aprovadores);
            }

            // Configurar alertas
            if (contratoData.alertas && contratoData.alertas.length > 0) {
                await this.setupAlertas(contratoId, contratoData.alertas);
            }

            this.eventEmitter.emit('contrato:created', {
                contratoId,
                numeroContrato,
                userId
            });

            this.logger.info(`Contrato criado: ${numeroContrato}`);

            return {
                success: true,
                data: {
                    id: contratoId,
                    numero_contrato: numeroContrato
                }
            };
        } catch (error) {
            this.logger.error('Erro ao criar contrato:', error);
            throw error;
        }
    }

    /**
     * Gera número sequencial do contrato
     */
    async generateContratoNumber() {
        const year = new Date().getFullYear();
        const prefix = `CT${year}`;
        
        const result = await this.database.query(
            'SELECT numero_contrato FROM contratos WHERE numero_contrato LIKE ? ORDER BY numero_contrato DESC LIMIT 1',
            [`${prefix}%`]
        );

        let nextNumber = 1;
        if (result.length > 0) {
            const lastNumber = result[0].numero_contrato;
            const numberPart = parseInt(lastNumber.replace(prefix, ''));
            nextNumber = numberPart + 1;
        }

        return `${prefix}${nextNumber.toString().padStart(6, '0')}`;
    }

    /**
     * Adiciona cláusulas ao contrato
     */
    async addClausulas(contratoId, clausulas, userId) {
        for (let i = 0; i < clausulas.length; i++) {
            const clausula = clausulas[i];
            await this.database.query(
                'INSERT INTO contrato_clausulas SET ?',
                [{
                    id: crypto.randomUUID(),
                    contrato_id: contratoId,
                    numero_clausula: clausula.numero_clausula || (i + 1).toString(),
                    titulo: clausula.titulo,
                    conteudo: clausula.conteudo,
                    tipo: clausula.tipo,
                    obrigatoria: clausula.obrigatoria || false,
                    ordem_exibicao: clausula.ordem_exibicao || i
                }]
            );
        }
    }

    /**
     * Configura workflow de aprovação
     */
    async setupApprovalWorkflow(contratoId, aprovadores) {
        for (let i = 0; i < aprovadores.length; i++) {
            const aprovador = aprovadores[i];
            await this.database.query(
                'INSERT INTO contrato_aprovacoes SET ?',
                [{
                    id: crypto.randomUUID(),
                    contrato_id: contratoId,
                    aprovador_id: aprovador.id,
                    nivel_aprovacao: i + 1
                }]
            );
        }
    }

    /**
     * Configura alertas do contrato
     */
    async setupAlertas(contratoId, alertas) {
        for (const alerta of alertas) {
            await this.database.query(
                'INSERT INTO contrato_alertas SET ?',
                [{
                    id: crypto.randomUUID(),
                    contrato_id: contratoId,
                    tipo_alerta: alerta.tipo,
                    titulo: alerta.titulo,
                    descricao: alerta.descricao,
                    data_alerta: alerta.data_alerta,
                    dias_antecedencia: alerta.dias_antecedencia || 0,
                    destinatarios: JSON.stringify(alerta.destinatarios || [])
                }]
            );
        }
    }

    /**
     * Inicia processo de assinatura eletrônica
     */
    async initiateSignature(contratoId, signatarios, userId) {
        try {
            // Verificar se contrato existe e está aprovado
            const contrato = await this.getContratoById(contratoId);
            if (!contrato) {
                throw new Error('Contrato não encontrado');
            }

            if (contrato.status !== 'aprovado') {
                throw new Error('Contrato deve estar aprovado para iniciar assinatura');
            }

            // Adicionar signatários
            for (let i = 0; i < signatarios.length; i++) {
                const signatario = signatarios[i];
                const tokenAcesso = crypto.randomBytes(32).toString('hex');
                
                await this.database.query(
                    'INSERT INTO contrato_assinaturas SET ?',
                    [{
                        id: crypto.randomUUID(),
                        contrato_id: contratoId,
                        signatario_id: signatario.id,
                        nome_signatario: signatario.nome,
                        email_signatario: signatario.email,
                        tipo_signatario: signatario.tipo,
                        ordem_assinatura: i + 1,
                        metodo_assinatura: signatario.metodo || 'eletronica',
                        token_acesso: tokenAcesso,
                        data_expiracao: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
                    }]
                );

                // Enviar email de solicitação de assinatura
                this.eventEmitter.emit('notification:send', {
                    type: 'email',
                    to: signatario.email,
                    subject: `Solicitação de Assinatura - Contrato ${contrato.numero_contrato}`,
                    template: 'signature_request',
                    data: {
                        contratoNumero: contrato.numero_contrato,
                        contratoTitulo: contrato.titulo,
                        signatarioNome: signatario.nome,
                        tokenAcesso: tokenAcesso,
                        linkAssinatura: `${this.config.baseUrl}/contratos/assinar/${tokenAcesso}`
                    }
                });
            }

            // Atualizar status do contrato
            await this.database.query(
                'UPDATE contratos SET status = ? WHERE id = ?',
                ['em_assinatura', contratoId]
            );

            this.logger.info(`Processo de assinatura iniciado para contrato ${contrato.numero_contrato}`);

            return { success: true, message: 'Processo de assinatura iniciado' };
        } catch (error) {
            this.logger.error('Erro ao iniciar assinatura:', error);
            throw error;
        }
    }

    /**
     * Processa assinatura eletrônica
     */
    async processSignature(token, assinaturaData, ipAddress, userAgent) {
        try {
            // Buscar assinatura pelo token
            const assinatura = await this.database.query(
                'SELECT * FROM contrato_assinaturas WHERE token_acesso = ? AND status = "pendente"',
                [token]
            );

            if (assinatura.length === 0) {
                throw new Error('Token de assinatura inválido ou expirado');
            }

            const assinaturaInfo = assinatura[0];

            // Verificar expiração
            if (new Date() > new Date(assinaturaInfo.data_expiracao)) {
                await this.database.query(
                    'UPDATE contrato_assinaturas SET status = "expirado" WHERE id = ?',
                    [assinaturaInfo.id]
                );
                throw new Error('Token de assinatura expirado');
            }

            // Gerar hash da assinatura
            const hashAssinatura = crypto.createHash('sha256')
                .update(`${assinaturaInfo.contrato_id}${assinaturaInfo.signatario_id}${Date.now()}`)
                .digest('hex');

            // Atualizar assinatura
            await this.database.query(
                'UPDATE contrato_assinaturas SET status = "assinado", hash_assinatura = ?, ip_assinatura = ?, user_agent = ?, data_assinatura = NOW() WHERE id = ?',
                [hashAssinatura, ipAddress, userAgent, assinaturaInfo.id]
            );

            // Verificar se todas as assinaturas foram concluídas
            const assinaturasPendentes = await this.database.query(
                'SELECT COUNT(*) as pendentes FROM contrato_assinaturas WHERE contrato_id = ? AND status != "assinado"',
                [assinaturaInfo.contrato_id]
            );

            if (assinaturasPendentes[0].pendentes === 0) {
                // Todas as assinaturas concluídas - ativar contrato
                await this.database.query(
                    'UPDATE contratos SET status = "ativo" WHERE id = ?',
                    [assinaturaInfo.contrato_id]
                );

                this.eventEmitter.emit('contrato:signed', {
                    contratoId: assinaturaInfo.contrato_id
                });
            }

            this.logger.info(`Assinatura processada para contrato ${assinaturaInfo.contrato_id}`);

            return { success: true, message: 'Assinatura processada com sucesso' };
        } catch (error) {
            this.logger.error('Erro ao processar assinatura:', error);
            throw error;
        }
    }

    /**
     * Busca contrato por ID
     */
    async getContratoById(contratoId) {
        const result = await this.database.query(
            'SELECT * FROM contratos WHERE id = ?',
            [contratoId]
        );
        return result.length > 0 ? result[0] : null;
    }

    /**
     * Lista contratos com filtros
     */
    async listContratos(filters = {}, pagination = {}) {
        try {
            let query = 'SELECT * FROM contratos WHERE 1=1';
            const params = [];

            // Aplicar filtros
            if (filters.status) {
                query += ' AND status = ?';
                params.push(filters.status);
            }

            if (filters.tipo_contrato) {
                query += ' AND tipo_contrato = ?';
                params.push(filters.tipo_contrato);
            }

            if (filters.responsavel_id) {
                query += ' AND responsavel_id = ?';
                params.push(filters.responsavel_id);
            }

            if (filters.data_inicio) {
                query += ' AND data_inicio >= ?';
                params.push(filters.data_inicio);
            }

            if (filters.data_fim) {
                query += ' AND data_fim <= ?';
                params.push(filters.data_fim);
            }

            // Ordenação
            query += ' ORDER BY created_at DESC';

            // Paginação
            if (pagination.limit) {
                query += ' LIMIT ?';
                params.push(parseInt(pagination.limit));

                if (pagination.offset) {
                    query += ' OFFSET ?';
                    params.push(parseInt(pagination.offset));
                }
            }

            const contratos = await this.database.query(query, params);

            return {
                success: true,
                data: contratos,
                total: contratos.length
            };
        } catch (error) {
            this.logger.error('Erro ao listar contratos:', error);
            throw error;
        }
    }

    /**
     * Verifica contratos próximos do vencimento
     */
    async checkExpiringContracts() {
        try {
            const alertas = await this.database.query(`
                SELECT ca.*, c.numero_contrato, c.titulo 
                FROM contrato_alertas ca
                JOIN contratos c ON ca.contrato_id = c.id
                WHERE ca.status = 'ativo' 
                AND DATE_SUB(ca.data_alerta, INTERVAL ca.dias_antecedencia DAY) <= CURDATE()
            `);

            for (const alerta of alertas) {
                // Enviar notificação
                this.eventEmitter.emit('notification:send', {
                    type: 'email',
                    to: JSON.parse(alerta.destinatarios),
                    subject: `Alerta: ${alerta.titulo}`,
                    template: 'contract_alert',
                    data: {
                        contratoNumero: alerta.numero_contrato,
                        contratoTitulo: alerta.titulo,
                        tipoAlerta: alerta.tipo_alerta,
                        dataAlerta: alerta.data_alerta,
                        descricao: alerta.descricao
                    }
                });

                // Marcar alerta como enviado
                await this.database.query(
                    'UPDATE contrato_alertas SET status = "enviado", enviado_em = NOW() WHERE id = ?',
                    [alerta.id]
                );
            }

            this.logger.info(`Verificados ${alertas.length} alertas de contrato`);
        } catch (error) {
            this.logger.error('Erro ao verificar contratos vencendo:', error);
        }
    }

    /**
     * Verifica assinaturas pendentes
     */
    async checkPendingSignatures() {
        try {
            const assinaturasPendentes = await this.database.query(`
                SELECT ca.*, c.numero_contrato, c.titulo
                FROM contrato_assinaturas ca
                JOIN contratos c ON ca.contrato_id = c.id
                WHERE ca.status = 'pendente'
                AND ca.data_expiracao < NOW()
            `);

            for (const assinatura of assinaturasPendentes) {
                // Marcar como expirada
                await this.database.query(
                    'UPDATE contrato_assinaturas SET status = "expirado" WHERE id = ?',
                    [assinatura.id]
                );

                // Notificar responsável
                this.eventEmitter.emit('notification:send', {
                    type: 'email',
                    subject: `Assinatura Expirada - Contrato ${assinatura.numero_contrato}`,
                    template: 'signature_expired',
                    data: {
                        contratoNumero: assinatura.numero_contrato,
                        contratoTitulo: assinatura.titulo,
                        signatarioNome: assinatura.nome_signatario
                    }
                });
            }

            this.logger.info(`Verificadas ${assinaturasPendentes.length} assinaturas pendentes`);
        } catch (error) {
            this.logger.error('Erro ao verificar assinaturas pendentes:', error);
        }
    }

    /**
     * Gera relatório de contratos
     */
    async generateReport(tipo, filtros = {}) {
        try {
            let query = '';
            let params = [];

            switch (tipo) {
                case 'vencimentos':
                    query = `
                        SELECT numero_contrato, titulo, data_vencimento, status, valor_total
                        FROM contratos 
                        WHERE data_vencimento BETWEEN ? AND ?
                        ORDER BY data_vencimento ASC
                    `;
                    params = [filtros.data_inicio, filtros.data_fim];
                    break;

                case 'por_status':
                    query = `
                        SELECT status, COUNT(*) as quantidade, SUM(valor_total) as valor_total
                        FROM contratos 
                        GROUP BY status
                        ORDER BY quantidade DESC
                    `;
                    break;

                case 'por_tipo':
                    query = `
                        SELECT tipo_contrato, COUNT(*) as quantidade, SUM(valor_total) as valor_total
                        FROM contratos 
                        GROUP BY tipo_contrato
                        ORDER BY quantidade DESC
                    `;
                    break;

                default:
                    throw new Error('Tipo de relatório não suportado');
            }

            const dados = await this.database.query(query, params);

            return {
                success: true,
                data: {
                    tipo,
                    dados,
                    gerado_em: new Date().toISOString()
                }
            };
        } catch (error) {
            this.logger.error('Erro ao gerar relatório:', error);
            throw error;
        }
    }

    /**
     * Obtém estatísticas do módulo
     */
    async getStats() {
        try {
            const stats = await Promise.all([
                this.database.query('SELECT COUNT(*) as total FROM contratos'),
                this.database.query('SELECT COUNT(*) as ativos FROM contratos WHERE status = "ativo"'),
                this.database.query('SELECT COUNT(*) as pendentes FROM contratos WHERE status IN ("rascunho", "em_aprovacao")'),
                this.database.query('SELECT COUNT(*) as vencendo FROM contratos WHERE data_vencimento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)'),
                this.database.query('SELECT SUM(valor_total) as valor_total FROM contratos WHERE status = "ativo"')
            ]);

            return {
                success: true,
                data: {
                    total_contratos: stats[0][0].total,
                    contratos_ativos: stats[1][0].ativos,
                    contratos_pendentes: stats[2][0].pendentes,
                    contratos_vencendo: stats[3][0].vencendo,
                    valor_total_ativo: stats[4][0].valor_total || 0
                }
            };
        } catch (error) {
            this.logger.error('Erro ao obter estatísticas:', error);
            throw error;
        }
    }

    // Event handlers
    async handleContratoCreated(data) {
        this.logger.info(`Contrato criado: ${data.numeroContrato}`);
    }

    async handleContratoSigned(data) {
        this.logger.info(`Contrato assinado: ${data.contratoId}`);
    }

    async handleContratoExpired(data) {
        this.logger.info(`Contrato expirado: ${data.contratoId}`);
    }

    async handleUserLogin(data) {
        // Verificar se usuário tem contratos pendentes de assinatura
        const assinaturasPendentes = await this.database.query(
            'SELECT COUNT(*) as pendentes FROM contrato_assinaturas WHERE signatario_id = ? AND status = "pendente"',
            [data.userId]
        );

        if (assinaturasPendentes[0].pendentes > 0) {
            this.eventEmitter.emit('notification:send', {
                type: 'system',
                userId: data.userId,
                message: `Você possui ${assinaturasPendentes[0].pendentes} contrato(s) pendente(s) de assinatura.`
            });
        }
    }

    /**
     * Finaliza o módulo
     */
    async shutdown() {
        this.logger.info('Módulo Contratos finalizado');
        return { success: true };
    }
}

module.exports = ContratosModule;