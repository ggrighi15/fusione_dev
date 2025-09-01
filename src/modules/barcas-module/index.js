/**
 * Módulo Barcas - Gestão de Frota Náutica e Mobilidade
 * 
 * Este módulo gerencia toda a frota náutica do grupo, incluindo:
 * - Cadastro e controle de embarcações
 * - Gestão de tripulação e certificações
 * - Manutenção preventiva e corretiva
 * - Operações e rotas marítimas
 * - Combustível e custos operacionais
 * - Compliance marítimo e segurança
 * 
 * @author Fusione Core System
 * @version 1.0.0
 */

import moment from 'moment';
import cron from 'node-cron';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';

class BarcasModule {
  constructor(coreSystem) {
    this.coreSystem = coreSystem;
    this.config = {};
    this.db = null;
    this.logger = null;
    this.eventBus = null;
    this.isInitialized = false;
    
    // Jobs de monitoramento
    this.monitoringJobs = new Map();
    
    // Cache para otimização
    this.cache = {
      embarcacoes: new Map(),
      tripulacao: new Map(),
      manutencoes: new Map()
    };
  }

  /**
   * Inicializa o módulo Barcas
   */
  async initialize() {
    try {
      this.logger = this.coreSystem.logger;
      this.db = this.coreSystem.database;
      this.eventBus = this.coreSystem.eventBus;
      
      this.logger.info('Inicializando módulo Barcas...');
      
      // Carregar configurações
      await this.loadConfig();
      
      // Criar estrutura do banco de dados
      await this.createDatabaseTables();
      
      // Configurar event handlers
      this.setupEventHandlers();
      
      // Iniciar jobs de monitoramento
      this.startMonitoringJobs();
      
      this.isInitialized = true;
      this.logger.info('Módulo Barcas inicializado com sucesso');
      
      // Emitir evento de inicialização
      this.eventBus.emit('barcas:initialized', {
        module: 'barcas-module',
        timestamp: new Date(),
        version: '1.0.0'
      });
      
    } catch (error) {
      this.logger.error('Erro ao inicializar módulo Barcas:', error);
      throw error;
    }
  }

  /**
   * Carrega as configurações do módulo
   */
  async loadConfig() {
    try {
      const configPath = path.join(__dirname, 'module.json');
      if (await fs.pathExists(configPath)) {
        const configData = await fs.readJson(configPath);
        this.config = configData.settings || {};
      }
      
      // Configurações padrão
      this.config = {
        numeracao: {
          embarcacao: {
            formato: 'EMB-AAAA-NNNNNN',
            sequencial: true,
            reiniciar_anualmente: true
          },
          manutencao: {
            formato: 'MAN-AAAA-NNNNNN',
            sequencial: true,
            reiniciar_anualmente: true
          },
          operacao: {
            formato: 'OP-AAAA-NNNNNN',
            sequencial: true,
            reiniciar_anualmente: true
          }
        },
        manutencao: {
          preventiva: {
            intervalo_horas: 500,
            antecedencia_alerta: 50,
            tipos_obrigatorias: ['motor', 'casco', 'equipamentos_seguranca']
          },
          corretiva: {
            prazo_maximo_dias: 30,
            prioridade_critica: ['motor', 'navegacao', 'seguranca']
          }
        },
        combustivel: {
          tipos_permitidos: ['diesel', 'gasolina', 'gnv'],
          alerta_nivel_baixo: 20,
          consumo_medio_litros_hora: 15
        },
        tripulacao: {
          certificacoes_obrigatorias: ['arrais', 'motonauta', 'mestre'],
          renovacao_alerta_dias: 30,
          capacitacao_anual: true
        },
        ...this.config
      };
      
    } catch (error) {
      this.logger.error('Erro ao carregar configurações do módulo Barcas:', error);
      throw error;
    }
  }

  /**
   * Cria as tabelas necessárias no banco de dados
   */
  async createDatabaseTables() {
    try {
      // Tabela principal de embarcações
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS embarcacoes (
          id VARCHAR(36) PRIMARY KEY,
          numero_interno VARCHAR(50) UNIQUE NOT NULL,
          nome VARCHAR(200) NOT NULL,
          tipo ENUM('lancha', 'barco', 'iate', 'jet_ski', 'veleiro', 'catamara', 'outro') NOT NULL,
          categoria ENUM('recreio', 'comercial', 'pesca', 'turismo', 'transporte') NOT NULL,
          registro_capitania VARCHAR(50),
          inscricao_municipal VARCHAR(50),
          comprimento DECIMAL(8,2),
          largura DECIMAL(8,2),
          calado DECIMAL(8,2),
          arqueacao_bruta DECIMAL(10,2),
          ano_fabricacao YEAR,
          fabricante VARCHAR(100),
          modelo VARCHAR(100),
          material_casco ENUM('fibra', 'aluminio', 'aco', 'madeira', 'outro'),
          cor_casco VARCHAR(50),
          motor_principal JSON,
          motores_auxiliares JSON,
          equipamentos_seguranca JSON,
          equipamentos_navegacao JSON,
          capacidade_passageiros INT,
          capacidade_combustivel DECIMAL(10,2),
          valor_aquisicao DECIMAL(15,2),
          data_aquisicao DATE,
          situacao ENUM('ativa', 'manutencao', 'inativa', 'vendida') DEFAULT 'ativa',
          localizacao_atual VARCHAR(200),
          marina_base VARCHAR(200),
          observacoes TEXT,
          documentos JSON,
          seguros JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_by VARCHAR(36),
          updated_by VARCHAR(36),
          INDEX idx_embarcacoes_numero (numero_interno),
          INDEX idx_embarcacoes_tipo (tipo),
          INDEX idx_embarcacoes_situacao (situacao),
          INDEX idx_embarcacoes_registro (registro_capitania)
        )
      `);

      // Tabela de tripulação
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS tripulacao (
          id VARCHAR(36) PRIMARY KEY,
          pessoa_id VARCHAR(36) NOT NULL,
          funcao ENUM('comandante', 'imediato', 'marinheiro', 'maquinista', 'cozinheiro', 'outro') NOT NULL,
          certificacoes JSON,
          experiencia_anos INT,
          data_admissao DATE,
          data_demissao DATE,
          salario_base DECIMAL(10,2),
          situacao ENUM('ativo', 'inativo', 'licenca', 'ferias') DEFAULT 'ativo',
          embarcacoes_autorizadas JSON,
          cursos_realizados JSON,
          avaliacoes JSON,
          observacoes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_tripulacao_pessoa (pessoa_id),
          INDEX idx_tripulacao_funcao (funcao),
          INDEX idx_tripulacao_situacao (situacao)
        )
      `);

      // Tabela de manutenções
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS manutencoes (
          id VARCHAR(36) PRIMARY KEY,
          numero_interno VARCHAR(50) UNIQUE NOT NULL,
          embarcacao_id VARCHAR(36) NOT NULL,
          tipo ENUM('preventiva', 'corretiva', 'emergencial', 'revisao') NOT NULL,
          categoria ENUM('motor', 'casco', 'eletrica', 'hidraulica', 'navegacao', 'seguranca', 'outro') NOT NULL,
          descricao TEXT NOT NULL,
          data_programada DATE,
          data_inicio DATE,
          data_conclusao DATE,
          horas_embarcacao INT,
          status ENUM('agendada', 'em_andamento', 'concluida', 'cancelada') DEFAULT 'agendada',
          prioridade ENUM('baixa', 'media', 'alta', 'critica') DEFAULT 'media',
          fornecedor_id VARCHAR(36),
          responsavel_tecnico VARCHAR(200),
          pecas_utilizadas JSON,
          servicos_realizados JSON,
          custo_total DECIMAL(12,2),
          custo_pecas DECIMAL(12,2),
          custo_mao_obra DECIMAL(12,2),
          garantia_dias INT,
          observacoes TEXT,
          fotos JSON,
          documentos JSON,
          proxima_manutencao DATE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_by VARCHAR(36),
          updated_by VARCHAR(36),
          FOREIGN KEY (embarcacao_id) REFERENCES embarcacoes(id),
          INDEX idx_manutencoes_embarcacao (embarcacao_id),
          INDEX idx_manutencoes_tipo (tipo),
          INDEX idx_manutencoes_status (status),
          INDEX idx_manutencoes_data (data_programada),
          INDEX idx_manutencoes_prioridade (prioridade)
        )
      `);

      // Tabela de operações/viagens
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS operacoes (
          id VARCHAR(36) PRIMARY KEY,
          numero_interno VARCHAR(50) UNIQUE NOT NULL,
          embarcacao_id VARCHAR(36) NOT NULL,
          comandante_id VARCHAR(36) NOT NULL,
          tripulacao JSON,
          tipo ENUM('recreio', 'comercial', 'turismo', 'transporte', 'manutencao', 'outro') NOT NULL,
          origem VARCHAR(200) NOT NULL,
          destino VARCHAR(200) NOT NULL,
          rota JSON,
          data_saida DATETIME,
          data_chegada_prevista DATETIME,
          data_chegada_real DATETIME,
          passageiros INT DEFAULT 0,
          carga JSON,
          combustivel_inicial DECIMAL(10,2),
          combustivel_final DECIMAL(10,2),
          combustivel_consumido DECIMAL(10,2),
          horas_navegacao DECIMAL(8,2),
          distancia_percorrida DECIMAL(10,2),
          condicoes_mar ENUM('calmo', 'moderado', 'agitado', 'muito_agitado'),
          condicoes_tempo VARCHAR(200),
          status ENUM('planejada', 'em_andamento', 'concluida', 'cancelada') DEFAULT 'planejada',
          custo_total DECIMAL(12,2),
          receita_total DECIMAL(12,2),
          observacoes TEXT,
          incidentes JSON,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_by VARCHAR(36),
          updated_by VARCHAR(36),
          FOREIGN KEY (embarcacao_id) REFERENCES embarcacoes(id),
          FOREIGN KEY (comandante_id) REFERENCES tripulacao(id),
          INDEX idx_operacoes_embarcacao (embarcacao_id),
          INDEX idx_operacoes_comandante (comandante_id),
          INDEX idx_operacoes_tipo (tipo),
          INDEX idx_operacoes_status (status),
          INDEX idx_operacoes_data (data_saida)
        )
      `);

      // Tabela de abastecimentos
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS abastecimentos (
          id VARCHAR(36) PRIMARY KEY,
          embarcacao_id VARCHAR(36) NOT NULL,
          operacao_id VARCHAR(36),
          data_abastecimento DATETIME NOT NULL,
          local_abastecimento VARCHAR(200),
          fornecedor VARCHAR(200),
          tipo_combustivel ENUM('diesel', 'gasolina', 'gnv', 'outro') NOT NULL,
          quantidade_litros DECIMAL(10,2) NOT NULL,
          preco_litro DECIMAL(8,4),
          valor_total DECIMAL(12,2),
          hodometro_horas INT,
          nivel_antes DECIMAL(5,2),
          nivel_depois DECIMAL(5,2),
          responsavel VARCHAR(200),
          nota_fiscal VARCHAR(100),
          observacoes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(36),
          FOREIGN KEY (embarcacao_id) REFERENCES embarcacoes(id),
          FOREIGN KEY (operacao_id) REFERENCES operacoes(id),
          INDEX idx_abastecimentos_embarcacao (embarcacao_id),
          INDEX idx_abastecimentos_data (data_abastecimento),
          INDEX idx_abastecimentos_tipo (tipo_combustivel)
        )
      `);

      // Tabela de custos operacionais
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS custos_operacionais (
          id VARCHAR(36) PRIMARY KEY,
          embarcacao_id VARCHAR(36) NOT NULL,
          operacao_id VARCHAR(36),
          tipo ENUM('combustivel', 'manutencao', 'seguro', 'taxa_porto', 'tripulacao', 'outro') NOT NULL,
          categoria VARCHAR(100),
          descricao TEXT NOT NULL,
          data_custo DATE NOT NULL,
          valor DECIMAL(12,2) NOT NULL,
          moeda VARCHAR(3) DEFAULT 'BRL',
          fornecedor VARCHAR(200),
          documento_fiscal VARCHAR(100),
          centro_custo VARCHAR(100),
          observacoes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(36),
          FOREIGN KEY (embarcacao_id) REFERENCES embarcacoes(id),
          FOREIGN KEY (operacao_id) REFERENCES operacoes(id),
          INDEX idx_custos_embarcacao (embarcacao_id),
          INDEX idx_custos_tipo (tipo),
          INDEX idx_custos_data (data_custo)
        )
      `);

      // Tabela de histórico
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS barcas_historico (
          id VARCHAR(36) PRIMARY KEY,
          entidade_tipo ENUM('embarcacao', 'tripulacao', 'manutencao', 'operacao', 'abastecimento', 'custo') NOT NULL,
          entidade_id VARCHAR(36) NOT NULL,
          acao ENUM('criacao', 'atualizacao', 'exclusao', 'status_change') NOT NULL,
          dados_anteriores JSON,
          dados_novos JSON,
          usuario_id VARCHAR(36),
          ip_address VARCHAR(45),
          user_agent TEXT,
          observacoes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_historico_entidade (entidade_tipo, entidade_id),
          INDEX idx_historico_data (created_at),
          INDEX idx_historico_usuario (usuario_id)
        )
      `);

      this.logger.info('Tabelas do módulo Barcas criadas com sucesso');
      
    } catch (error) {
      this.logger.error('Erro ao criar tabelas do módulo Barcas:', error);
      throw error;
    }
  }

  /**
   * Configura os manipuladores de eventos
   */
  setupEventHandlers() {
    // Eventos internos do módulo
    this.eventBus.on('embarcacao:criada', this.handleEmbarcacaoCriada.bind(this));
    this.eventBus.on('embarcacao:atualizada', this.handleEmbarcacaoAtualizada.bind(this));
    this.eventBus.on('manutencao:agendada', this.handleManutencaoAgendada.bind(this));
    this.eventBus.on('manutencao:concluida', this.handleManutencaoConcluida.bind(this));
    this.eventBus.on('operacao:iniciada', this.handleOperacaoIniciada.bind(this));
    this.eventBus.on('operacao:concluida', this.handleOperacaoConcluida.bind(this));
    this.eventBus.on('combustivel:baixo', this.handleCombustivelBaixo.bind(this));
    this.eventBus.on('certificacao:vencendo', this.handleCertificacaoVencendo.bind(this));
    
    // Eventos externos
    this.eventBus.on('pessoa:criada', this.handlePessoaCriada.bind(this));
    this.eventBus.on('pessoa:atualizada', this.handlePessoaAtualizada.bind(this));
    this.eventBus.on('documento:uploaded', this.handleDocumentoUploaded.bind(this));
  }

  /**
   * Inicia os jobs de monitoramento
   */
  startMonitoringJobs() {
    // Job para verificar manutenções vencendo (diário às 08:00)
    const manutencaoJob = cron.schedule('0 8 * * *', async () => {
      await this.verificarManutencoesPendentes();
    }, { scheduled: false });
    
    // Job para verificar certificações vencendo (semanal)
    const certificacaoJob = cron.schedule('0 9 * * 1', async () => {
      await this.verificarCertificacoesVencendo();
    }, { scheduled: false });
    
    // Job para verificar níveis de combustível (diário às 07:00)
    const combustivelJob = cron.schedule('0 7 * * *', async () => {
      await this.verificarNiveisCombustivel();
    }, { scheduled: false });
    
    // Job para gerar relatórios mensais (primeiro dia do mês às 10:00)
    const relatorioJob = cron.schedule('0 10 1 * *', async () => {
      await this.gerarRelatorioMensal();
    }, { scheduled: false });
    
    // Iniciar jobs
    manutencaoJob.start();
    certificacaoJob.start();
    combustivelJob.start();
    relatorioJob.start();
    
    // Armazenar referências
    this.monitoringJobs.set('manutencao', manutencaoJob);
    this.monitoringJobs.set('certificacao', certificacaoJob);
    this.monitoringJobs.set('combustivel', combustivelJob);
    this.monitoringJobs.set('relatorio', relatorioJob);
    
    this.logger.info('Jobs de monitoramento do módulo Barcas iniciados');
  }

  // ==================== FUNCIONALIDADES PRINCIPAIS ====================

  /**
   * Cria uma nova embarcação
   */
  async criarEmbarcacao(dadosEmbarcacao, usuarioId) {
    try {
      const id = uuidv4();
      const numeroInterno = await this.gerarNumeroInterno('embarcacao');
      
      const embarcacao = {
        id,
        numero_interno: numeroInterno,
        nome: dadosEmbarcacao.nome,
        tipo: dadosEmbarcacao.tipo,
        categoria: dadosEmbarcacao.categoria,
        registro_capitania: dadosEmbarcacao.registro_capitania,
        inscricao_municipal: dadosEmbarcacao.inscricao_municipal,
        comprimento: dadosEmbarcacao.comprimento,
        largura: dadosEmbarcacao.largura,
        calado: dadosEmbarcacao.calado,
        arqueacao_bruta: dadosEmbarcacao.arqueacao_bruta,
        ano_fabricacao: dadosEmbarcacao.ano_fabricacao,
        fabricante: dadosEmbarcacao.fabricante,
        modelo: dadosEmbarcacao.modelo,
        material_casco: dadosEmbarcacao.material_casco,
        cor_casco: dadosEmbarcacao.cor_casco,
        motor_principal: JSON.stringify(dadosEmbarcacao.motor_principal || {}),
        motores_auxiliares: JSON.stringify(dadosEmbarcacao.motores_auxiliares || []),
        equipamentos_seguranca: JSON.stringify(dadosEmbarcacao.equipamentos_seguranca || []),
        equipamentos_navegacao: JSON.stringify(dadosEmbarcacao.equipamentos_navegacao || []),
        capacidade_passageiros: dadosEmbarcacao.capacidade_passageiros,
        capacidade_combustivel: dadosEmbarcacao.capacidade_combustivel,
        valor_aquisicao: dadosEmbarcacao.valor_aquisicao,
        data_aquisicao: dadosEmbarcacao.data_aquisicao,
        situacao: dadosEmbarcacao.situacao || 'ativa',
        localizacao_atual: dadosEmbarcacao.localizacao_atual,
        marina_base: dadosEmbarcacao.marina_base,
        observacoes: dadosEmbarcacao.observacoes,
        documentos: JSON.stringify(dadosEmbarcacao.documentos || []),
        seguros: JSON.stringify(dadosEmbarcacao.seguros || []),
        created_by: usuarioId,
        updated_by: usuarioId
      };
      
      await this.db.query('INSERT INTO embarcacoes SET ?', embarcacao);
      
      // Registrar no histórico
      await this.registrarHistorico('embarcacao', id, 'criacao', null, embarcacao, usuarioId);
      
      // Emitir evento
      this.eventBus.emit('embarcacao:criada', {
        embarcacao_id: id,
        numero_interno: numeroInterno,
        nome: dadosEmbarcacao.nome,
        tipo: dadosEmbarcacao.tipo,
        usuario_id: usuarioId,
        timestamp: new Date()
      });
      
      this.logger.info(`Embarcação criada: ${numeroInterno} - ${dadosEmbarcacao.nome}`);
      
      return { id, numero_interno: numeroInterno };
      
    } catch (error) {
      this.logger.error('Erro ao criar embarcação:', error);
      throw error;
    }
  }

  /**
   * Agenda uma manutenção
   */
  async agendarManutencao(dadosManutencao, usuarioId) {
    try {
      const id = uuidv4();
      const numeroInterno = await this.gerarNumeroInterno('manutencao');
      
      const manutencao = {
        id,
        numero_interno: numeroInterno,
        embarcacao_id: dadosManutencao.embarcacao_id,
        tipo: dadosManutencao.tipo,
        categoria: dadosManutencao.categoria,
        descricao: dadosManutencao.descricao,
        data_programada: dadosManutencao.data_programada,
        horas_embarcacao: dadosManutencao.horas_embarcacao,
        prioridade: dadosManutencao.prioridade || 'media',
        fornecedor_id: dadosManutencao.fornecedor_id,
        responsavel_tecnico: dadosManutencao.responsavel_tecnico,
        observacoes: dadosManutencao.observacoes,
        created_by: usuarioId,
        updated_by: usuarioId
      };
      
      await this.db.query('INSERT INTO manutencoes SET ?', manutencao);
      
      // Registrar no histórico
      await this.registrarHistorico('manutencao', id, 'criacao', null, manutencao, usuarioId);
      
      // Emitir evento
      this.eventBus.emit('manutencao:agendada', {
        manutencao_id: id,
        numero_interno: numeroInterno,
        embarcacao_id: dadosManutencao.embarcacao_id,
        tipo: dadosManutencao.tipo,
        data_programada: dadosManutencao.data_programada,
        usuario_id: usuarioId,
        timestamp: new Date()
      });
      
      this.logger.info(`Manutenção agendada: ${numeroInterno}`);
      
      return { id, numero_interno: numeroInterno };
      
    } catch (error) {
      this.logger.error('Erro ao agendar manutenção:', error);
      throw error;
    }
  }

  /**
   * Inicia uma operação/viagem
   */
  async iniciarOperacao(dadosOperacao, usuarioId) {
    try {
      const id = uuidv4();
      const numeroInterno = await this.gerarNumeroInterno('operacao');
      
      const operacao = {
        id,
        numero_interno: numeroInterno,
        embarcacao_id: dadosOperacao.embarcacao_id,
        comandante_id: dadosOperacao.comandante_id,
        tripulacao: JSON.stringify(dadosOperacao.tripulacao || []),
        tipo: dadosOperacao.tipo,
        origem: dadosOperacao.origem,
        destino: dadosOperacao.destino,
        rota: JSON.stringify(dadosOperacao.rota || []),
        data_saida: dadosOperacao.data_saida || new Date(),
        data_chegada_prevista: dadosOperacao.data_chegada_prevista,
        passageiros: dadosOperacao.passageiros || 0,
        carga: JSON.stringify(dadosOperacao.carga || []),
        combustivel_inicial: dadosOperacao.combustivel_inicial,
        status: 'em_andamento',
        observacoes: dadosOperacao.observacoes,
        created_by: usuarioId,
        updated_by: usuarioId
      };
      
      await this.db.query('INSERT INTO operacoes SET ?', operacao);
      
      // Atualizar status da embarcação
      await this.db.query(
        'UPDATE embarcacoes SET situacao = "operacao" WHERE id = ?',
        [dadosOperacao.embarcacao_id]
      );
      
      // Registrar no histórico
      await this.registrarHistorico('operacao', id, 'criacao', null, operacao, usuarioId);
      
      // Emitir evento
      this.eventBus.emit('operacao:iniciada', {
        operacao_id: id,
        numero_interno: numeroInterno,
        embarcacao_id: dadosOperacao.embarcacao_id,
        comandante_id: dadosOperacao.comandante_id,
        origem: dadosOperacao.origem,
        destino: dadosOperacao.destino,
        usuario_id: usuarioId,
        timestamp: new Date()
      });
      
      this.logger.info(`Operação iniciada: ${numeroInterno}`);
      
      return { id, numero_interno: numeroInterno };
      
    } catch (error) {
      this.logger.error('Erro ao iniciar operação:', error);
      throw error;
    }
  }

  /**
   * Registra um abastecimento
   */
  async registrarAbastecimento(dadosAbastecimento, usuarioId) {
    try {
      const id = uuidv4();
      
      const abastecimento = {
        id,
        embarcacao_id: dadosAbastecimento.embarcacao_id,
        operacao_id: dadosAbastecimento.operacao_id,
        data_abastecimento: dadosAbastecimento.data_abastecimento || new Date(),
        local_abastecimento: dadosAbastecimento.local_abastecimento,
        fornecedor: dadosAbastecimento.fornecedor,
        tipo_combustivel: dadosAbastecimento.tipo_combustivel,
        quantidade_litros: dadosAbastecimento.quantidade_litros,
        preco_litro: dadosAbastecimento.preco_litro,
        valor_total: dadosAbastecimento.valor_total,
        hodometro_horas: dadosAbastecimento.hodometro_horas,
        nivel_antes: dadosAbastecimento.nivel_antes,
        nivel_depois: dadosAbastecimento.nivel_depois,
        responsavel: dadosAbastecimento.responsavel,
        nota_fiscal: dadosAbastecimento.nota_fiscal,
        observacoes: dadosAbastecimento.observacoes,
        created_by: usuarioId
      };
      
      await this.db.query('INSERT INTO abastecimentos SET ?', abastecimento);
      
      // Registrar como custo operacional
      await this.registrarCustoOperacional({
        embarcacao_id: dadosAbastecimento.embarcacao_id,
        operacao_id: dadosAbastecimento.operacao_id,
        tipo: 'combustivel',
        categoria: dadosAbastecimento.tipo_combustivel,
        descricao: `Abastecimento - ${dadosAbastecimento.quantidade_litros}L`,
        data_custo: dadosAbastecimento.data_abastecimento,
        valor: dadosAbastecimento.valor_total,
        fornecedor: dadosAbastecimento.fornecedor,
        documento_fiscal: dadosAbastecimento.nota_fiscal
      }, usuarioId);
      
      this.logger.info(`Abastecimento registrado para embarcação ${dadosAbastecimento.embarcacao_id}`);
      
      return { id };
      
    } catch (error) {
      this.logger.error('Erro ao registrar abastecimento:', error);
      throw error;
    }
  }

  /**
   * Registra um custo operacional
   */
  async registrarCustoOperacional(dadosCusto, usuarioId) {
    try {
      const id = uuidv4();
      
      const custo = {
        id,
        embarcacao_id: dadosCusto.embarcacao_id,
        operacao_id: dadosCusto.operacao_id,
        tipo: dadosCusto.tipo,
        categoria: dadosCusto.categoria,
        descricao: dadosCusto.descricao,
        data_custo: dadosCusto.data_custo || new Date(),
        valor: dadosCusto.valor,
        moeda: dadosCusto.moeda || 'BRL',
        fornecedor: dadosCusto.fornecedor,
        documento_fiscal: dadosCusto.documento_fiscal,
        centro_custo: dadosCusto.centro_custo,
        observacoes: dadosCusto.observacoes,
        created_by: usuarioId
      };
      
      await this.db.query('INSERT INTO custos_operacionais SET ?', custo);
      
      this.logger.info(`Custo operacional registrado: ${dadosCusto.tipo} - R$ ${dadosCusto.valor}`);
      
      return { id };
      
    } catch (error) {
      this.logger.error('Erro ao registrar custo operacional:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE CONSULTA ====================

  /**
   * Obtém uma embarcação por ID
   */
  async obterEmbarcacao(embarcacaoId) {
    try {
      const [rows] = await this.db.query(
        'SELECT * FROM embarcacoes WHERE id = ?',
        [embarcacaoId]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const embarcacao = rows[0];
      
      // Parse JSON fields
      embarcacao.motor_principal = JSON.parse(embarcacao.motor_principal || '{}');
      embarcacao.motores_auxiliares = JSON.parse(embarcacao.motores_auxiliares || '[]');
      embarcacao.equipamentos_seguranca = JSON.parse(embarcacao.equipamentos_seguranca || '[]');
      embarcacao.equipamentos_navegacao = JSON.parse(embarcacao.equipamentos_navegacao || '[]');
      embarcacao.documentos = JSON.parse(embarcacao.documentos || '[]');
      embarcacao.seguros = JSON.parse(embarcacao.seguros || '[]');
      
      return embarcacao;
      
    } catch (error) {
      this.logger.error('Erro ao obter embarcação:', error);
      throw error;
    }
  }

  /**
   * Lista embarcações com filtros
   */
  async listarEmbarcacoes(filtros = {}) {
    try {
      let query = 'SELECT * FROM embarcacoes WHERE 1=1';
      const params = [];
      
      if (filtros.tipo) {
        query += ' AND tipo = ?';
        params.push(filtros.tipo);
      }
      
      if (filtros.situacao) {
        query += ' AND situacao = ?';
        params.push(filtros.situacao);
      }
      
      if (filtros.categoria) {
        query += ' AND categoria = ?';
        params.push(filtros.categoria);
      }
      
      query += ' ORDER BY nome';
      
      if (filtros.limit) {
        query += ' LIMIT ?';
        params.push(parseInt(filtros.limit));
      }
      
      const [rows] = await this.db.query(query, params);
      
      return rows.map(embarcacao => {
        embarcacao.motor_principal = JSON.parse(embarcacao.motor_principal || '{}');
        embarcacao.motores_auxiliares = JSON.parse(embarcacao.motores_auxiliares || '[]');
        embarcacao.equipamentos_seguranca = JSON.parse(embarcacao.equipamentos_seguranca || '[]');
        embarcacao.equipamentos_navegacao = JSON.parse(embarcacao.equipamentos_navegacao || '[]');
        embarcacao.documentos = JSON.parse(embarcacao.documentos || '[]');
        embarcacao.seguros = JSON.parse(embarcacao.seguros || '[]');
        return embarcacao;
      });
      
    } catch (error) {
      this.logger.error('Erro ao listar embarcações:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE MONITORAMENTO ====================

  /**
   * Verifica manutenções pendentes
   */
  async verificarManutencoesPendentes() {
    try {
      const dataLimite = moment().add(this.config.manutencao.preventiva.antecedencia_alerta, 'days').format('YYYY-MM-DD');
      
      const [rows] = await this.db.query(`
        SELECT m.*, e.nome as embarcacao_nome, e.numero_interno as embarcacao_numero
        FROM manutencoes m
        JOIN embarcacoes e ON m.embarcacao_id = e.id
        WHERE m.status = 'agendada' 
        AND m.data_programada <= ?
        ORDER BY m.data_programada
      `, [dataLimite]);
      
      for (const manutencao of rows) {
        this.eventBus.emit('manutencao:vencendo', {
          manutencao_id: manutencao.id,
          numero_interno: manutencao.numero_interno,
          embarcacao_id: manutencao.embarcacao_id,
          embarcacao_nome: manutencao.embarcacao_nome,
          tipo: manutencao.tipo,
          data_programada: manutencao.data_programada,
          prioridade: manutencao.prioridade,
          timestamp: new Date()
        });
      }
      
      this.logger.info(`Verificação de manutenções: ${rows.length} manutenções vencendo`);
      
    } catch (error) {
      this.logger.error('Erro ao verificar manutenções pendentes:', error);
    }
  }

  /**
   * Verifica certificações vencendo
   */
  async verificarCertificacoesVencendo() {
    try {
      const dataLimite = moment().add(this.config.tripulacao.renovacao_alerta_dias, 'days').format('YYYY-MM-DD');
      
      const [rows] = await this.db.query(`
        SELECT t.*, p.nome as pessoa_nome
        FROM tripulacao t
        JOIN pessoas p ON t.pessoa_id = p.id
        WHERE t.situacao = 'ativo'
      `);
      
      for (const tripulante of rows) {
        const certificacoes = JSON.parse(tripulante.certificacoes || '[]');
        
        for (const cert of certificacoes) {
          if (cert.data_vencimento && moment(cert.data_vencimento).isBefore(dataLimite)) {
            this.eventBus.emit('certificacao:vencendo', {
              tripulacao_id: tripulante.id,
              pessoa_id: tripulante.pessoa_id,
              pessoa_nome: tripulante.pessoa_nome,
              certificacao: cert.tipo,
              data_vencimento: cert.data_vencimento,
              timestamp: new Date()
            });
          }
        }
      }
      
    } catch (error) {
      this.logger.error('Erro ao verificar certificações vencendo:', error);
    }
  }

  /**
   * Verifica níveis de combustível
   */
  async verificarNiveisCombustivel() {
    try {
      const [rows] = await this.db.query(`
        SELECT e.*, 
               COALESCE((
                 SELECT nivel_depois 
                 FROM abastecimentos a 
                 WHERE a.embarcacao_id = e.id 
                 ORDER BY a.data_abastecimento DESC 
                 LIMIT 1
               ), 0) as nivel_atual
        FROM embarcacoes e
        WHERE e.situacao IN ('ativa', 'operacao')
      `);
      
      for (const embarcacao of rows) {
        if (embarcacao.nivel_atual <= this.config.combustivel.alerta_nivel_baixo) {
          this.eventBus.emit('combustivel:baixo', {
            embarcacao_id: embarcacao.id,
            numero_interno: embarcacao.numero_interno,
            nome: embarcacao.nome,
            nivel_atual: embarcacao.nivel_atual,
            nivel_alerta: this.config.combustivel.alerta_nivel_baixo,
            timestamp: new Date()
          });
        }
      }
      
    } catch (error) {
      this.logger.error('Erro ao verificar níveis de combustível:', error);
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Gera número interno sequencial
   */
  async gerarNumeroInterno(tipo) {
    try {
      const config = this.config.numeracao[tipo];
      const ano = new Date().getFullYear();
      const formato = config.formato;
      
      // Buscar último número do ano
      const [rows] = await this.db.query(`
        SELECT numero_interno 
        FROM ${tipo === 'embarcacao' ? 'embarcacoes' : tipo === 'manutencao' ? 'manutencoes' : 'operacoes'}
        WHERE numero_interno LIKE ? 
        ORDER BY numero_interno DESC 
        LIMIT 1
      `, [`%-${ano}-%`]);
      
      let proximoNumero = 1;
      if (rows.length > 0) {
        const ultimoNumero = rows[0].numero_interno;
        const partes = ultimoNumero.split('-');
        proximoNumero = parseInt(partes[partes.length - 1]) + 1;
      }
      
      return formato
        .replace('AAAA', ano.toString())
        .replace('NNNNNN', proximoNumero.toString().padStart(6, '0'));
        
    } catch (error) {
      this.logger.error('Erro ao gerar número interno:', error);
      throw error;
    }
  }

  /**
   * Registra alteração no histórico
   */
  async registrarHistorico(entidadeTipo, entidadeId, acao, dadosAnteriores, dadosNovos, usuarioId, observacoes = null) {
    try {
      const historico = {
        id: uuidv4(),
        entidade_tipo: entidadeTipo,
        entidade_id: entidadeId,
        acao: acao,
        dados_anteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
        dados_novos: dadosNovos ? JSON.stringify(dadosNovos) : null,
        usuario_id: usuarioId,
        observacoes: observacoes
      };
      
      await this.db.query('INSERT INTO barcas_historico SET ?', historico);
      
    } catch (error) {
      this.logger.error('Erro ao registrar histórico:', error);
    }
  }

  // ==================== EVENT HANDLERS ====================

  async handleEmbarcacaoCriada(data) {
    this.logger.info(`Embarcação criada: ${data.numero_interno}`);
  }

  async handleEmbarcacaoAtualizada(data) {
    this.logger.info(`Embarcação atualizada: ${data.numero_interno}`);
  }

  async handleManutencaoAgendada(data) {
    this.logger.info(`Manutenção agendada: ${data.numero_interno}`);
  }

  async handleManutencaoConcluida(data) {
    this.logger.info(`Manutenção concluída: ${data.numero_interno}`);
  }

  async handleOperacaoIniciada(data) {
    this.logger.info(`Operação iniciada: ${data.numero_interno}`);
  }

  async handleOperacaoConcluida(data) {
    this.logger.info(`Operação concluída: ${data.numero_interno}`);
  }

  async handleCombustivelBaixo(data) {
    this.logger.warn(`Combustível baixo na embarcação ${data.nome}: ${data.nivel_atual}%`);
  }

  async handleCertificacaoVencendo(data) {
    this.logger.warn(`Certificação vencendo: ${data.pessoa_nome} - ${data.certificacao}`);
  }

  async handlePessoaCriada(data) {
    // Verificar se a pessoa pode ser adicionada à tripulação
  }

  async handlePessoaAtualizada(data) {
    // Atualizar dados da tripulação se necessário
  }

  async handleDocumentoUploaded(data) {
    // Processar documentos relacionados às embarcações
  }

  // ==================== MÉTODOS DE RELATÓRIOS ====================

  /**
   * Gera relatório mensal
   */
  async gerarRelatorioMensal() {
    try {
      const mesAnterior = moment().subtract(1, 'month');
      const inicioMes = mesAnterior.startOf('month').format('YYYY-MM-DD');
      const fimMes = mesAnterior.endOf('month').format('YYYY-MM-DD');
      
      // Relatório de operações
      const [operacoes] = await this.db.query(`
        SELECT COUNT(*) as total_operacoes,
               SUM(horas_navegacao) as total_horas,
               SUM(distancia_percorrida) as total_distancia,
               SUM(combustivel_consumido) as total_combustivel,
               SUM(custo_total) as total_custos,
               SUM(receita_total) as total_receitas
        FROM operacoes
        WHERE data_saida BETWEEN ? AND ?
        AND status = 'concluida'
      `, [inicioMes, fimMes]);
      
      // Relatório de manutenções
      const [manutencoes] = await this.db.query(`
        SELECT COUNT(*) as total_manutencoes,
               SUM(custo_total) as total_custos_manutencao
        FROM manutencoes
        WHERE data_conclusao BETWEEN ? AND ?
        AND status = 'concluida'
      `, [inicioMes, fimMes]);
      
      const relatorio = {
        periodo: `${inicioMes} a ${fimMes}`,
        operacoes: operacoes[0],
        manutencoes: manutencoes[0],
        gerado_em: new Date()
      };
      
      this.eventBus.emit('relatorio:gerado', {
        tipo: 'mensal',
        periodo: relatorio.periodo,
        dados: relatorio,
        timestamp: new Date()
      });
      
      this.logger.info(`Relatório mensal gerado para ${relatorio.periodo}`);
      
      return relatorio;
      
    } catch (error) {
      this.logger.error('Erro ao gerar relatório mensal:', error);
      throw error;
    }
  }

  /**
   * Finaliza o módulo
   */
  async shutdown() {
    try {
      // Parar jobs de monitoramento
      for (const [name, job] of this.monitoringJobs) {
        job.stop();
        this.logger.info(`Job ${name} parado`);
      }
      
      this.isInitialized = false;
      this.logger.info('Módulo Barcas finalizado');
      
    } catch (error) {
      this.logger.error('Erro ao finalizar módulo Barcas:', error);
      throw error;
    }
  }
}

export default BarcasModule;