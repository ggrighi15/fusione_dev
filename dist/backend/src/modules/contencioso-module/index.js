const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const EventEmitter = require('events');

class ContenciosoModule extends EventEmitter {
    constructor(core) {
        super();
        this.core = core;
        this.name = 'contencioso-module';
        this.version = '1.0.0';
        this.description = 'Módulo de Gestão de Processos Judiciais e Administrativos';
        
        this.logger = core.logger;
        this.database = core.database;
        this.config = {
            numeracaoProcessos: {
                formato: 'NNNNNNN-DD.AAAA.J.TR.OOOO',
                sequencial: true,
                reiniciarAnualmente: true
            },
            prazos: {
                alertaAntecedencia: [1, 3, 7, 15], // dias
                verificacaoAutomatica: true,
                intervaloPrazos: '0 8 * * *' // cron: 8h todos os dias
            },
            tribunais: {
                integracaoEsaj: true,
                integracaoPje: true,
                consultaAutomatica: true,
                intervalConsulta: '0 */6 * * *' // cron: a cada 6 horas
            },
            documentos: {
                armazenamento: './storage/contencioso',
                tiposPermitidos: ['.pdf', '.doc', '.docx', '.jpg', '.png'],
                tamanhoMaximo: 50 * 1024 * 1024, // 50MB
                versionamento: true
            },
            custas: {
                moeda: 'BRL',
                calcularAutomaticamente: true,
                integracaoFinanceiro: true
            },
            relatorios: {
                periodicidade: 'mensal',
                destinatarios: [],
                formatosExportacao: ['pdf', 'excel', 'csv']
            }
        };
        
        this.tribunais = new Map();
        this.processos = new Map();
        this.prazos = new Map();
        this.audiencias = new Map();
        this.documentos = new Map();
    }
    
    async initialize() {
        try {
            console.log(`[${this.name}] Inicializando módulo Contencioso...`);
            
            await this.createDatabaseTables();
            await this.loadConfiguration();
            await this.setupEventHandlers();
            await this.startMonitoringJobs();
            
            console.log(`[${this.name}] Módulo inicializado com sucesso`);
            
            return {
                success: true,
                message: 'Módulo Contencioso inicializado com sucesso'
            };
        } catch (error) {
            console.error(`[${this.name}] Erro na inicialização:`, error);
            throw error;
        }
    }
    
    async createDatabaseTables() {
        const tables = {
            // Tabela principal de processos
            processos: `
                CREATE TABLE IF NOT EXISTS processos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    numero_processo VARCHAR(50) UNIQUE NOT NULL,
                    numero_interno VARCHAR(20) UNIQUE,
                    tipo_processo VARCHAR(50) NOT NULL,
                    natureza VARCHAR(100),
                    tribunal VARCHAR(100),
                    vara_origem VARCHAR(100),
                    classe_processual VARCHAR(100),
                    assunto VARCHAR(200),
                    valor_causa DECIMAL(15,2),
                    data_distribuicao DATE,
                    data_citacao DATE,
                    status VARCHAR(50) DEFAULT 'ativo',
                    fase_processual VARCHAR(100),
                    prioridade VARCHAR(20) DEFAULT 'normal',
                    observacoes TEXT,
                    cliente_id INTEGER,
                    advogado_responsavel_id INTEGER,
                    escritorio_origem VARCHAR(100),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (cliente_id) REFERENCES pessoas(id),
                    FOREIGN KEY (advogado_responsavel_id) REFERENCES pessoas(id)
                )
            `,
            
            // Partes do processo
            processo_partes: `
                CREATE TABLE IF NOT EXISTS processo_partes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    processo_id INTEGER NOT NULL,
                    pessoa_id INTEGER NOT NULL,
                    tipo_parte VARCHAR(50) NOT NULL, -- autor, reu, terceiro, etc
                    qualificacao VARCHAR(100),
                    representacao VARCHAR(100), -- advogado, procurador, etc
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE,
                    FOREIGN KEY (pessoa_id) REFERENCES pessoas(id)
                )
            `,
            
            // Movimentações processuais
            processo_movimentacoes: `
                CREATE TABLE IF NOT EXISTS processo_movimentacoes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    processo_id INTEGER NOT NULL,
                    data_movimentacao DATETIME NOT NULL,
                    tipo_movimentacao VARCHAR(100),
                    descricao TEXT NOT NULL,
                    documento_associado VARCHAR(255),
                    responsavel_id INTEGER,
                    origem VARCHAR(50) DEFAULT 'manual', -- manual, tribunal, automatico
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE,
                    FOREIGN KEY (responsavel_id) REFERENCES pessoas(id)
                )
            `,
            
            // Prazos processuais
            processo_prazos: `
                CREATE TABLE IF NOT EXISTS processo_prazos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    processo_id INTEGER NOT NULL,
                    tipo_prazo VARCHAR(100) NOT NULL,
                    descricao TEXT NOT NULL,
                    data_inicio DATE NOT NULL,
                    data_vencimento DATE NOT NULL,
                    dias_prazo INTEGER,
                    status VARCHAR(50) DEFAULT 'pendente', -- pendente, cumprido, perdido
                    prioridade VARCHAR(20) DEFAULT 'normal',
                    responsavel_id INTEGER,
                    observacoes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE,
                    FOREIGN KEY (responsavel_id) REFERENCES pessoas(id)
                )
            `,
            
            // Audiências
            processo_audiencias: `
                CREATE TABLE IF NOT EXISTS processo_audiencias (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    processo_id INTEGER NOT NULL,
                    tipo_audiencia VARCHAR(100) NOT NULL,
                    data_audiencia DATETIME NOT NULL,
                    local_audiencia VARCHAR(200),
                    juiz VARCHAR(100),
                    status VARCHAR(50) DEFAULT 'agendada', -- agendada, realizada, cancelada, adiada
                    resultado TEXT,
                    observacoes TEXT,
                    participantes JSON,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE
                )
            `,
            
            // Documentos do processo
            processo_documentos: `
                CREATE TABLE IF NOT EXISTS processo_documentos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    processo_id INTEGER NOT NULL,
                    nome_documento VARCHAR(255) NOT NULL,
                    tipo_documento VARCHAR(100),
                    categoria VARCHAR(100), -- peticao, contestacao, sentenca, etc
                    arquivo_path VARCHAR(500),
                    arquivo_hash VARCHAR(64),
                    tamanho_arquivo INTEGER,
                    data_documento DATE,
                    data_upload DATETIME DEFAULT CURRENT_TIMESTAMP,
                    uploaded_by INTEGER,
                    versao INTEGER DEFAULT 1,
                    status VARCHAR(50) DEFAULT 'ativo',
                    observacoes TEXT,
                    FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE,
                    FOREIGN KEY (uploaded_by) REFERENCES pessoas(id)
                )
            `,
            
            // Custas e despesas
            processo_custas: `
                CREATE TABLE IF NOT EXISTS processo_custas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    processo_id INTEGER NOT NULL,
                    tipo_custa VARCHAR(100) NOT NULL,
                    descricao VARCHAR(255),
                    valor DECIMAL(15,2) NOT NULL,
                    data_vencimento DATE,
                    data_pagamento DATE,
                    status VARCHAR(50) DEFAULT 'pendente', -- pendente, pago, isento
                    forma_pagamento VARCHAR(50),
                    comprovante_path VARCHAR(500),
                    observacoes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE
                )
            `,
            
            // Histórico de alterações
            processo_historico: `
                CREATE TABLE IF NOT EXISTS processo_historico (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    processo_id INTEGER NOT NULL,
                    campo_alterado VARCHAR(100),
                    valor_anterior TEXT,
                    valor_novo TEXT,
                    usuario_id INTEGER,
                    data_alteracao DATETIME DEFAULT CURRENT_TIMESTAMP,
                    observacoes TEXT,
                    FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE,
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
            const configPath = path.join(__dirname, 'config', 'contencioso.json');
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
        // Eventos de processo
        this.on('processo:criado', this.handleProcessoCriado.bind(this));
        this.on('processo:atualizado', this.handleProcessoAtualizado.bind(this));
        this.on('prazo:vencendo', this.handlePrazoVencendo.bind(this));
        this.on('audiencia:agendada', this.handleAudienciaAgendada.bind(this));
        
        // Eventos externos
        this.core.on('pessoa:criada', this.handlePessoaCriada.bind(this));
        this.core.on('documento:uploaded', this.handleDocumentoUploaded.bind(this));
    }
    
    async startMonitoringJobs() {
        // Verificação de prazos
        if (this.config.prazos.verificacaoAutomatica) {
            setInterval(() => {
                this.verificarPrazosVencendo();
            }, 60 * 60 * 1000); // A cada hora
        }
        
        // Consulta automática aos tribunais
        if (this.config.tribunais.consultaAutomatica) {
            setInterval(() => {
                this.consultarMovimentacoesTribunais();
            }, 6 * 60 * 60 * 1000); // A cada 6 horas
        }
    }
    
    // Métodos principais
    async criarProcesso(dadosProcesso) {
        try {
            const numeroInterno = await this.gerarNumeroInterno();
            
            const processo = {
                numero_interno: numeroInterno,
                ...dadosProcesso,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const result = await this.database.run(
                `INSERT INTO processos (
                    numero_processo, numero_interno, tipo_processo, natureza, tribunal,
                    vara_origem, classe_processual, assunto, valor_causa, data_distribuicao,
                    data_citacao, status, fase_processual, prioridade, observacoes,
                    cliente_id, advogado_responsavel_id, escritorio_origem
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    processo.numero_processo, processo.numero_interno, processo.tipo_processo,
                    processo.natureza, processo.tribunal, processo.vara_origem,
                    processo.classe_processual, processo.assunto, processo.valor_causa,
                    processo.data_distribuicao, processo.data_citacao, processo.status,
                    processo.fase_processual, processo.prioridade, processo.observacoes,
                    processo.cliente_id, processo.advogado_responsavel_id, processo.escritorio_origem
                ]
            );
            
            processo.id = result.lastID;
            
            // Registrar no histórico
            await this.registrarHistorico(processo.id, 'criacao', null, 'Processo criado', dadosProcesso.usuario_id);
            
            this.emit('processo:criado', processo);
            
            return processo;
        } catch (error) {
            console.error(`[${this.name}] Erro ao criar processo:`, error);
            throw error;
        }
    }
    
    async adicionarMovimentacao(processoId, movimentacao) {
        try {
            const result = await this.database.run(
                `INSERT INTO processo_movimentacoes (
                    processo_id, data_movimentacao, tipo_movimentacao, descricao,
                    documento_associado, responsavel_id, origem
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    processoId, movimentacao.data_movimentacao, movimentacao.tipo_movimentacao,
                    movimentacao.descricao, movimentacao.documento_associado,
                    movimentacao.responsavel_id, movimentacao.origem || 'manual'
                ]
            );
            
            movimentacao.id = result.lastID;
            
            // Atualizar status do processo se necessário
            await this.atualizarStatusProcesso(processoId, movimentacao);
            
            return movimentacao;
        } catch (error) {
            console.error(`[${this.name}] Erro ao adicionar movimentação:`, error);
            throw error;
        }
    }
    
    async criarPrazo(processoId, prazo) {
        try {
            const result = await this.database.run(
                `INSERT INTO processo_prazos (
                    processo_id, tipo_prazo, descricao, data_inicio, data_vencimento,
                    dias_prazo, status, prioridade, responsavel_id, observacoes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    processoId, prazo.tipo_prazo, prazo.descricao, prazo.data_inicio,
                    prazo.data_vencimento, prazo.dias_prazo, prazo.status || 'pendente',
                    prazo.prioridade || 'normal', prazo.responsavel_id, prazo.observacoes
                ]
            );
            
            prazo.id = result.lastID;
            prazo.processo_id = processoId;
            
            return prazo;
        } catch (error) {
            console.error(`[${this.name}] Erro ao criar prazo:`, error);
            throw error;
        }
    }
    
    async agendarAudiencia(processoId, audiencia) {
        try {
            const result = await this.database.run(
                `INSERT INTO processo_audiencias (
                    processo_id, tipo_audiencia, data_audiencia, local_audiencia,
                    juiz, status, observacoes, participantes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    processoId, audiencia.tipo_audiencia, audiencia.data_audiencia,
                    audiencia.local_audiencia, audiencia.juiz, audiencia.status || 'agendada',
                    audiencia.observacoes, JSON.stringify(audiencia.participantes || [])
                ]
            );
            
            audiencia.id = result.lastID;
            audiencia.processo_id = processoId;
            
            this.emit('audiencia:agendada', audiencia);
            
            return audiencia;
        } catch (error) {
            console.error(`[${this.name}] Erro ao agendar audiência:`, error);
            throw error;
        }
    }
    
    async obterProcesso(id) {
        try {
            const processo = await this.database.get(
                'SELECT * FROM processos WHERE id = ?',
                [id]
            );
            
            if (processo) {
                // Carregar dados relacionados
                processo.partes = await this.database.all(
                    'SELECT * FROM processo_partes WHERE processo_id = ?',
                    [id]
                );
                
                processo.movimentacoes = await this.database.all(
                    'SELECT * FROM processo_movimentacoes WHERE processo_id = ? ORDER BY data_movimentacao DESC',
                    [id]
                );
                
                processo.prazos = await this.database.all(
                    'SELECT * FROM processo_prazos WHERE processo_id = ? ORDER BY data_vencimento ASC',
                    [id]
                );
                
                processo.audiencias = await this.database.all(
                    'SELECT * FROM processo_audiencias WHERE processo_id = ? ORDER BY data_audiencia ASC',
                    [id]
                );
                
                processo.documentos = await this.database.all(
                    'SELECT * FROM processo_documentos WHERE processo_id = ? ORDER BY data_upload DESC',
                    [id]
                );
                
                processo.custas = await this.database.all(
                    'SELECT * FROM processo_custas WHERE processo_id = ? ORDER BY data_vencimento ASC',
                    [id]
                );
            }
            
            return processo;
        } catch (error) {
            console.error(`[${this.name}] Erro ao obter processo:`, error);
            throw error;
        }
    }
    
    async listarProcessos(filtros = {}) {
        try {
            let query = 'SELECT * FROM processos WHERE 1=1';
            const params = [];
            
            if (filtros.status) {
                query += ' AND status = ?';
                params.push(filtros.status);
            }
            
            if (filtros.tribunal) {
                query += ' AND tribunal LIKE ?';
                params.push(`%${filtros.tribunal}%`);
            }
            
            if (filtros.cliente_id) {
                query += ' AND cliente_id = ?';
                params.push(filtros.cliente_id);
            }
            
            if (filtros.advogado_responsavel_id) {
                query += ' AND advogado_responsavel_id = ?';
                params.push(filtros.advogado_responsavel_id);
            }
            
            query += ' ORDER BY updated_at DESC';
            
            if (filtros.limit) {
                query += ' LIMIT ?';
                params.push(filtros.limit);
            }
            
            const processos = await this.database.all(query, params);
            
            return processos;
        } catch (error) {
            console.error(`[${this.name}] Erro ao listar processos:`, error);
            throw error;
        }
    }
    
    async verificarPrazosVencendo() {
        try {
            const diasAntecedencia = this.config.prazos.alertaAntecedencia;
            
            for (const dias of diasAntecedencia) {
                const dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() + dias);
                
                const prazos = await this.database.all(
                    `SELECT p.*, pr.numero_processo, pr.numero_interno 
                     FROM processo_prazos p 
                     JOIN processos pr ON p.processo_id = pr.id 
                     WHERE p.data_vencimento = ? AND p.status = 'pendente'`,
                    [dataLimite.toISOString().split('T')[0]]
                );
                
                for (const prazo of prazos) {
                    this.emit('prazo:vencendo', { prazo, dias_restantes: dias });
                }
            }
        } catch (error) {
            console.error(`[${this.name}] Erro ao verificar prazos:`, error);
        }
    }
    
    async gerarNumeroInterno() {
        const ano = new Date().getFullYear();
        const prefixo = `CONT-${ano}-`;
        
        const ultimoNumero = await this.database.get(
            'SELECT numero_interno FROM processos WHERE numero_interno LIKE ? ORDER BY id DESC LIMIT 1',
            [`${prefixo}%`]
        );
        
        let proximoNumero = 1;
        if (ultimoNumero) {
            const numeroAtual = parseInt(ultimoNumero.numero_interno.split('-')[2]);
            proximoNumero = numeroAtual + 1;
        }
        
        return `${prefixo}${proximoNumero.toString().padStart(6, '0')}`;
    }
    
    async registrarHistorico(processoId, campo, valorAnterior, valorNovo, usuarioId) {
        try {
            await this.database.run(
                `INSERT INTO processo_historico (
                    processo_id, campo_alterado, valor_anterior, valor_novo, usuario_id
                ) VALUES (?, ?, ?, ?, ?)`,
                [processoId, campo, valorAnterior, valorNovo, usuarioId]
            );
        } catch (error) {
            console.error(`[${this.name}] Erro ao registrar histórico:`, error);
        }
    }
    
    // Event Handlers
    async handleProcessoCriado(processo) {
        console.log(`[${this.name}] Processo criado: ${processo.numero_interno}`);
        
        // Notificar responsáveis
        this.core.emit('notification:send', {
            type: 'processo_criado',
            title: 'Novo Processo Criado',
            message: `Processo ${processo.numero_interno} foi criado`,
            recipients: [processo.advogado_responsavel_id],
            data: processo
        });
    }
    
    async handleProcessoAtualizado(processo) {
        console.log(`[${this.name}] Processo atualizado: ${processo.numero_interno}`);
    }
    
    async handlePrazoVencendo(data) {
        console.log(`[${this.name}] Prazo vencendo em ${data.dias_restantes} dias`);
        
        // Enviar alerta
        this.core.emit('notification:send', {
            type: 'prazo_vencendo',
            title: 'Prazo Vencendo',
            message: `Prazo do processo ${data.prazo.numero_processo} vence em ${data.dias_restantes} dias`,
            priority: 'high',
            recipients: [data.prazo.responsavel_id],
            data: data.prazo
        });
    }
    
    async handleAudienciaAgendada(audiencia) {
        console.log(`[${this.name}] Audiência agendada: ${audiencia.tipo_audiencia}`);
        
        // Notificar participantes
        this.core.emit('notification:send', {
            type: 'audiencia_agendada',
            title: 'Audiência Agendada',
            message: `Audiência de ${audiencia.tipo_audiencia} agendada para ${audiencia.data_audiencia}`,
            recipients: audiencia.participantes || [],
            data: audiencia
        });
    }
    
    async handlePessoaCriada(pessoa) {
        // Verificar se é advogado e adicionar aos responsáveis disponíveis
        if (pessoa.tipo === 'advogado') {
            console.log(`[${this.name}] Novo advogado disponível: ${pessoa.nome}`);
        }
    }
    
    async handleDocumentoUploaded(documento) {
        if (documento.modulo === 'contencioso') {
            console.log(`[${this.name}] Documento adicionado ao processo: ${documento.nome}`);
        }
    }
    
    // Métodos auxiliares
    async atualizarStatusProcesso(processoId, movimentacao) {
        // Lógica para atualizar status baseado na movimentação
        const statusMap = {
            'sentenca': 'sentenciado',
            'acordao': 'julgado',
            'transito_julgado': 'transitado',
            'arquivamento': 'arquivado'
        };
        
        const novoStatus = statusMap[movimentacao.tipo_movimentacao];
        if (novoStatus) {
            await this.database.run(
                'UPDATE processos SET status = ?, updated_at = ? WHERE id = ?',
                [novoStatus, new Date().toISOString(), processoId]
            );
        }
    }
    
    async consultarMovimentacoesTribunais() {
        // Implementar integração com tribunais (E-SAJ, PJe, etc.)
        console.log(`[${this.name}] Consultando movimentações nos tribunais...`);
        
        // Esta seria a implementação da consulta automática
        // Por enquanto, apenas log
    }
    
    async gerarRelatorio(tipo, parametros) {
        try {
            const relatorios = {
                'processos_por_status': this.relatorioProcessosPorStatus.bind(this),
                'prazos_vencendo': this.relatorioPrazosVencendo.bind(this),
                'audiencias_mes': this.relatorioAudienciasMes.bind(this),
                'custas_pendentes': this.relatorioCustasPendentes.bind(this)
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
    
    async relatorioProcessosPorStatus(parametros) {
        const processos = await this.database.all(
            'SELECT status, COUNT(*) as total FROM processos GROUP BY status'
        );
        
        return {
            titulo: 'Processos por Status',
            data: processos,
            gerado_em: new Date().toISOString()
        };
    }
    
    async relatorioPrazosVencendo(parametros) {
        const dias = parametros.dias || 30;
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() + dias);
        
        const prazos = await this.database.all(
            `SELECT p.*, pr.numero_processo, pr.numero_interno 
             FROM processo_prazos p 
             JOIN processos pr ON p.processo_id = pr.id 
             WHERE p.data_vencimento <= ? AND p.status = 'pendente' 
             ORDER BY p.data_vencimento ASC`,
            [dataLimite.toISOString().split('T')[0]]
        );
        
        return {
            titulo: `Prazos Vencendo nos Próximos ${dias} Dias`,
            data: prazos,
            gerado_em: new Date().toISOString()
        };
    }
    
    async relatorioAudienciasMes(parametros) {
        const mes = parametros.mes || new Date().getMonth() + 1;
        const ano = parametros.ano || new Date().getFullYear();
        
        const audiencias = await this.database.all(
            `SELECT a.*, pr.numero_processo, pr.numero_interno 
             FROM processo_audiencias a 
             JOIN processos pr ON a.processo_id = pr.id 
             WHERE strftime('%m', a.data_audiencia) = ? AND strftime('%Y', a.data_audiencia) = ? 
             ORDER BY a.data_audiencia ASC`,
            [mes.toString().padStart(2, '0'), ano.toString()]
        );
        
        return {
            titulo: `Audiências - ${mes}/${ano}`,
            data: audiencias,
            gerado_em: new Date().toISOString()
        };
    }
    
    async relatorioCustasPendentes(parametros) {
        const custas = await this.database.all(
            `SELECT c.*, pr.numero_processo, pr.numero_interno 
             FROM processo_custas c 
             JOIN processos pr ON c.processo_id = pr.id 
             WHERE c.status = 'pendente' 
             ORDER BY c.data_vencimento ASC`
        );
        
        const total = custas.reduce((sum, custa) => sum + parseFloat(custa.valor), 0);
        
        return {
            titulo: 'Custas Pendentes',
            data: custas,
            total_pendente: total,
            gerado_em: new Date().toISOString()
        };
    }
}

module.exports = ContenciosoModule;