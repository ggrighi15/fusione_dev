/**
 * Módulo de Cadastro de Pessoas
 * Gerencia informações básicas e jurídicas de pessoas físicas e jurídicas
 */

import axios from 'axios';
import crypto from 'crypto';
import { cpf, cnpj } from 'cpf-cnpj-validator';

export default class PessoasModule {
  constructor(core) {
    this.core = core;
    this.name = 'pessoas-module';
    this.version = '1.0.0';
    this.description = 'Módulo para gestão de pessoas físicas e jurídicas';
    this.logger = core.logger;
    this.eventBus = core.eventBus;
    this.cache = core.cache;
    this.database = core.database;
    
    // Configurações do módulo
    this.config = {
      receitaFederalApiUrl: process.env.RECEITA_FEDERAL_API_URL || 'https://www.receitaws.com.br/v1',
      enableReceitaIntegration: process.env.ENABLE_RECEITA_INTEGRATION === 'true',
      documentStoragePath: process.env.DOCUMENT_STORAGE_PATH || './storage/documents',
      maxDocumentSize: 10 * 1024 * 1024, // 10MB
      allowedDocumentTypes: ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'],
      cacheTimeout: 24 * 60 * 60 * 1000, // 24 horas
      auditEnabled: true
    };
    
    // Cache para consultas da Receita Federal
    this.receitaCache = new Map();
  }

  /**
   * Inicializa o módulo
   */
  async initialize() {
    try {
      this.logger.info('Inicializando módulo de Pessoas');
      
      await this.createTables();
      await this.registerEvents();
      await this.loadConfig();
      
      this.logger.info('Módulo de Pessoas inicializado com sucesso');
      return true;
    } catch (error) {
      this.logger.error('Erro ao inicializar módulo de Pessoas:', error);
      throw error;
    }
  }

  /**
   * Cria as tabelas necessárias no banco de dados
   */
  async createTables() {
    const createPessoasTable = `
      CREATE TABLE IF NOT EXISTS pessoas (
        id VARCHAR(36) PRIMARY KEY,
        tipo ENUM('fisica', 'juridica') NOT NULL,
        nome VARCHAR(255) NOT NULL,
        nome_fantasia VARCHAR(255),
        documento VARCHAR(20) UNIQUE NOT NULL,
        email VARCHAR(255),
        telefone VARCHAR(20),
        endereco JSON,
        data_nascimento DATE,
        estado_civil VARCHAR(50),
        profissao VARCHAR(100),
        renda_mensal DECIMAL(15,2),
        situacao_receita VARCHAR(50),
        atividade_principal VARCHAR(255),
        capital_social DECIMAL(15,2),
        porte_empresa VARCHAR(50),
        natureza_juridica VARCHAR(100),
        status ENUM('ativo', 'inativo', 'suspenso') DEFAULT 'ativo',
        observacoes TEXT,
        metadata JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by VARCHAR(36),
        updated_by VARCHAR(36),
        INDEX idx_documento (documento),
        INDEX idx_nome (nome),
        INDEX idx_tipo (tipo),
        INDEX idx_status (status)
      )
    `;

    const createDocumentosTable = `
      CREATE TABLE IF NOT EXISTS pessoa_documentos (
        id VARCHAR(36) PRIMARY KEY,
        pessoa_id VARCHAR(36) NOT NULL,
        tipo_documento VARCHAR(100) NOT NULL,
        nome_arquivo VARCHAR(255) NOT NULL,
        caminho_arquivo VARCHAR(500) NOT NULL,
        tamanho_arquivo INT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        hash_arquivo VARCHAR(64) NOT NULL,
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36),
        FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE,
        INDEX idx_pessoa_id (pessoa_id),
        INDEX idx_tipo_documento (tipo_documento)
      )
    `;

    const createHistoricoTable = `
      CREATE TABLE IF NOT EXISTS pessoa_historico (
        id VARCHAR(36) PRIMARY KEY,
        pessoa_id VARCHAR(36) NOT NULL,
        campo_alterado VARCHAR(100) NOT NULL,
        valor_anterior TEXT,
        valor_novo TEXT,
        motivo VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36),
        FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE,
        INDEX idx_pessoa_id (pessoa_id),
        INDEX idx_campo_alterado (campo_alterado)
      )
    `;

    const createVinculosTable = `
      CREATE TABLE IF NOT EXISTS pessoa_vinculos (
        id VARCHAR(36) PRIMARY KEY,
        pessoa_id VARCHAR(36) NOT NULL,
        modulo VARCHAR(50) NOT NULL,
        entidade_id VARCHAR(36) NOT NULL,
        tipo_vinculo VARCHAR(100) NOT NULL,
        descricao VARCHAR(255),
        ativo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(36),
        FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE,
        INDEX idx_pessoa_id (pessoa_id),
        INDEX idx_modulo (modulo),
        INDEX idx_entidade_id (entidade_id)
      )
    `;

    await this.database.query(createPessoasTable);
    await this.database.query(createDocumentosTable);
    await this.database.query(createHistoricoTable);
    await this.database.query(createVinculosTable);
  }

  /**
   * Registra os eventos do módulo
   */
  async registerEvents() {
    this.eventBus.on('pessoa:created', this.handlePessoaCreated.bind(this));
    this.eventBus.on('pessoa:updated', this.handlePessoaUpdated.bind(this));
    this.eventBus.on('pessoa:deleted', this.handlePessoaDeleted.bind(this));
    this.eventBus.on('documento:uploaded', this.handleDocumentoUploaded.bind(this));
  }

  /**
   * Carrega configurações do módulo
   */
  async loadConfig() {
    try {
      const config = await this.core.config.get('pessoas-module');
      if (config) {
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      this.logger.warn('Erro ao carregar configurações do módulo Pessoas:', error);
    }
  }

  /**
   * Cadastra uma nova pessoa
   */
  async cadastrarPessoa(dadosPessoa, userId) {
    try {
      // Validação dos dados
      this.validarDadosPessoa(dadosPessoa);
      
      // Verifica se já existe pessoa com o mesmo documento
      const pessoaExistente = await this.buscarPorDocumento(dadosPessoa.documento);
      if (pessoaExistente) {
        throw new Error('Já existe uma pessoa cadastrada com este documento');
      }

      // Consulta dados na Receita Federal se habilitado
      let dadosReceita = null;
      if (this.config.enableReceitaIntegration) {
        dadosReceita = await this.consultarReceitaFederal(dadosPessoa.documento, dadosPessoa.tipo);
      }

      // Mescla dados da Receita Federal com dados informados
      const dadosCompletos = this.mesclarDadosReceita(dadosPessoa, dadosReceita);
      
      // Gera ID único
      const pessoaId = this.generateId();
      dadosCompletos.id = pessoaId;
      dadosCompletos.created_by = userId;
      dadosCompletos.updated_by = userId;

      // Salva no banco de dados
      await this.salvarPessoa(dadosCompletos);

      // Registra no histórico
      await this.registrarHistorico(pessoaId, 'criacao', null, 'Pessoa criada', 'Cadastro inicial', userId);

      // Emite evento
      this.eventBus.emit('pessoa:created', {
        pessoaId,
        dados: dadosCompletos,
        userId
      });

      this.logger.info(`Pessoa cadastrada com sucesso: ${pessoaId}`);
      return { id: pessoaId, ...dadosCompletos };
    } catch (error) {
      this.logger.error('Erro ao cadastrar pessoa:', error);
      throw error;
    }
  }

  /**
   * Atualiza dados de uma pessoa
   */
  async atualizarPessoa(pessoaId, dadosAtualizacao, userId) {
    try {
      // Busca pessoa atual
      const pessoaAtual = await this.buscarPorId(pessoaId);
      if (!pessoaAtual) {
        throw new Error('Pessoa não encontrada');
      }

      // Valida dados de atualização
      this.validarDadosAtualizacao(dadosAtualizacao);

      // Verifica mudanças e registra histórico
      const mudancas = this.detectarMudancas(pessoaAtual, dadosAtualizacao);
      
      // Atualiza dados
      const dadosAtualizados = {
        ...pessoaAtual,
        ...dadosAtualizacao,
        updated_by: userId,
        updated_at: new Date()
      };

      await this.salvarPessoa(dadosAtualizados);

      // Registra mudanças no histórico
      for (const mudanca of mudancas) {
        await this.registrarHistorico(
          pessoaId,
          mudanca.campo,
          mudanca.valorAnterior,
          mudanca.valorNovo,
          dadosAtualizacao.motivo || 'Atualização de dados',
          userId
        );
      }

      // Emite evento
      this.eventBus.emit('pessoa:updated', {
        pessoaId,
        dadosAnteriores: pessoaAtual,
        dadosNovos: dadosAtualizados,
        mudancas,
        userId
      });

      this.logger.info(`Pessoa atualizada com sucesso: ${pessoaId}`);
      return dadosAtualizados;
    } catch (error) {
      this.logger.error('Erro ao atualizar pessoa:', error);
      throw error;
    }
  }

  /**
   * Busca pessoa por ID
   */
  async buscarPorId(pessoaId) {
    try {
      const query = 'SELECT * FROM pessoas WHERE id = ?';
      const result = await this.database.query(query, [pessoaId]);
      return result[0] || null;
    } catch (error) {
      this.logger.error('Erro ao buscar pessoa por ID:', error);
      throw error;
    }
  }

  /**
   * Busca pessoa por documento
   */
  async buscarPorDocumento(documento) {
    try {
      const query = 'SELECT * FROM pessoas WHERE documento = ?';
      const result = await this.database.query(query, [documento]);
      return result[0] || null;
    } catch (error) {
      this.logger.error('Erro ao buscar pessoa por documento:', error);
      throw error;
    }
  }

  /**
   * Lista pessoas com filtros e paginação
   */
  async listarPessoas(filtros = {}, paginacao = {}) {
    try {
      const { page = 1, limit = 50, orderBy = 'nome', orderDirection = 'ASC' } = paginacao;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params = [];

      // Aplicar filtros
      if (filtros.tipo) {
        whereClause += ' AND tipo = ?';
        params.push(filtros.tipo);
      }

      if (filtros.nome) {
        whereClause += ' AND nome LIKE ?';
        params.push(`%${filtros.nome}%`);
      }

      if (filtros.documento) {
        whereClause += ' AND documento LIKE ?';
        params.push(`%${filtros.documento}%`);
      }

      if (filtros.status) {
        whereClause += ' AND status = ?';
        params.push(filtros.status);
      }

      // Query principal
      const query = `
        SELECT * FROM pessoas 
        ${whereClause}
        ORDER BY ${orderBy} ${orderDirection}
        LIMIT ? OFFSET ?
      `;
      params.push(limit, offset);

      // Query para contar total
      const countQuery = `SELECT COUNT(*) as total FROM pessoas ${whereClause}`;
      const countParams = params.slice(0, -2); // Remove limit e offset

      const [pessoas, countResult] = await Promise.all([
        this.database.query(query, params),
        this.database.query(countQuery, countParams)
      ]);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      return {
        pessoas,
        paginacao: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      this.logger.error('Erro ao listar pessoas:', error);
      throw error;
    }
  }

  /**
   * Consulta dados na Receita Federal
   */
  async consultarReceitaFederal(documento, tipo) {
    try {
      // Verifica cache primeiro
      const cacheKey = `receita_${documento}`;
      if (this.receitaCache.has(cacheKey)) {
        const cached = this.receitaCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
          return cached.data;
        }
      }

      let url;
      if (tipo === 'fisica') {
        if (!cpf.isValid(documento)) {
          throw new Error('CPF inválido');
        }
        url = `${this.config.receitaFederalApiUrl}/cpf/${documento}`;
      } else {
        if (!cnpj.isValid(documento)) {
          throw new Error('CNPJ inválido');
        }
        url = `${this.config.receitaFederalApiUrl}/cnpj/${documento}`;
      }

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Fusione-Core-System/1.0'
        }
      });

      if (response.data.status === 'ERROR') {
        throw new Error(response.data.message || 'Erro na consulta à Receita Federal');
      }

      // Armazena no cache
      this.receitaCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });

      return response.data;
    } catch (error) {
      this.logger.warn('Erro ao consultar Receita Federal:', error.message);
      return null; // Retorna null em caso de erro para não bloquear o cadastro
    }
  }

  /**
   * Mescla dados da Receita Federal com dados informados
   */
  mesclarDadosReceita(dadosInformados, dadosReceita) {
    if (!dadosReceita) {
      return dadosInformados;
    }

    const dadosMesclados = { ...dadosInformados };

    if (dadosInformados.tipo === 'fisica') {
      // Para pessoa física
      if (dadosReceita.nome && !dadosInformados.nome) {
        dadosMesclados.nome = dadosReceita.nome;
      }
      if (dadosReceita.situacao) {
        dadosMesclados.situacao_receita = dadosReceita.situacao;
      }
    } else {
      // Para pessoa jurídica
      if (dadosReceita.nome && !dadosInformados.nome) {
        dadosMesclados.nome = dadosReceita.nome;
      }
      if (dadosReceita.fantasia && !dadosInformados.nome_fantasia) {
        dadosMesclados.nome_fantasia = dadosReceita.fantasia;
      }
      if (dadosReceita.situacao) {
        dadosMesclados.situacao_receita = dadosReceita.situacao;
      }
      if (dadosReceita.atividade_principal) {
        dadosMesclados.atividade_principal = dadosReceita.atividade_principal[0]?.text;
      }
      if (dadosReceita.capital_social) {
        dadosMesclados.capital_social = parseFloat(dadosReceita.capital_social);
      }
      if (dadosReceita.porte) {
        dadosMesclados.porte_empresa = dadosReceita.porte;
      }
      if (dadosReceita.natureza_juridica) {
        dadosMesclados.natureza_juridica = dadosReceita.natureza_juridica;
      }
    }

    return dadosMesclados;
  }

  /**
   * Valida dados da pessoa
   */
  validarDadosPessoa(dados) {
    if (!dados.tipo || !['fisica', 'juridica'].includes(dados.tipo)) {
      throw new Error('Tipo de pessoa deve ser "fisica" ou "juridica"');
    }

    if (!dados.nome || dados.nome.trim().length < 2) {
      throw new Error('Nome é obrigatório e deve ter pelo menos 2 caracteres');
    }

    if (!dados.documento) {
      throw new Error('Documento é obrigatório');
    }

    // Validação específica por tipo
    if (dados.tipo === 'fisica') {
      if (!cpf.isValid(dados.documento)) {
        throw new Error('CPF inválido');
      }
    } else {
      if (!cnpj.isValid(dados.documento)) {
        throw new Error('CNPJ inválido');
      }
    }

    // Validação de email
    if (dados.email && !this.isValidEmail(dados.email)) {
      throw new Error('Email inválido');
    }

    return true;
  }

  /**
   * Valida dados de atualização
   */
  validarDadosAtualizacao(dados) {
    if (dados.nome && dados.nome.trim().length < 2) {
      throw new Error('Nome deve ter pelo menos 2 caracteres');
    }

    if (dados.email && !this.isValidEmail(dados.email)) {
      throw new Error('Email inválido');
    }

    if (dados.documento) {
      throw new Error('Documento não pode ser alterado após o cadastro');
    }

    if (dados.tipo) {
      throw new Error('Tipo de pessoa não pode ser alterado após o cadastro');
    }

    return true;
  }

  /**
   * Detecta mudanças entre dados atuais e novos
   */
  detectarMudancas(dadosAtuais, dadosNovos) {
    const mudancas = [];
    const camposIgnorados = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by'];

    for (const campo in dadosNovos) {
      if (camposIgnorados.includes(campo)) continue;
      
      const valorAtual = dadosAtuais[campo];
      const valorNovo = dadosNovos[campo];
      
      if (valorAtual !== valorNovo) {
        mudancas.push({
          campo,
          valorAnterior: valorAtual,
          valorNovo
        });
      }
    }

    return mudancas;
  }

  /**
   * Registra histórico de alterações
   */
  async registrarHistorico(pessoaId, campo, valorAnterior, valorNovo, motivo, userId) {
    try {
      const historicoId = this.generateId();
      const query = `
        INSERT INTO pessoa_historico 
        (id, pessoa_id, campo_alterado, valor_anterior, valor_novo, motivo, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.database.query(query, [
        historicoId,
        pessoaId,
        campo,
        JSON.stringify(valorAnterior),
        JSON.stringify(valorNovo),
        motivo,
        userId
      ]);
    } catch (error) {
      this.logger.error('Erro ao registrar histórico:', error);
    }
  }

  /**
   * Busca histórico de uma pessoa
   */
  async buscarHistorico(pessoaId, filtros = {}) {
    try {
      let whereClause = 'WHERE pessoa_id = ?';
      const params = [pessoaId];

      if (filtros.campo) {
        whereClause += ' AND campo_alterado = ?';
        params.push(filtros.campo);
      }

      if (filtros.dataInicio) {
        whereClause += ' AND created_at >= ?';
        params.push(filtros.dataInicio);
      }

      if (filtros.dataFim) {
        whereClause += ' AND created_at <= ?';
        params.push(filtros.dataFim);
      }

      const query = `
        SELECT h.*, u.nome as usuario_nome
        FROM pessoa_historico h
        LEFT JOIN usuarios u ON h.created_by = u.id
        ${whereClause}
        ORDER BY h.created_at DESC
      `;

      const historico = await this.database.query(query, params);
      
      // Parse dos valores JSON
      return historico.map(item => ({
        ...item,
        valor_anterior: this.safeJsonParse(item.valor_anterior),
        valor_novo: this.safeJsonParse(item.valor_novo)
      }));
    } catch (error) {
      this.logger.error('Erro ao buscar histórico:', error);
      throw error;
    }
  }

  /**
   * Cria vínculo entre pessoa e outra entidade
   */
  async criarVinculo(pessoaId, modulo, entidadeId, tipoVinculo, descricao, userId) {
    try {
      const vinculoId = this.generateId();
      const query = `
        INSERT INTO pessoa_vinculos 
        (id, pessoa_id, modulo, entidade_id, tipo_vinculo, descricao, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.database.query(query, [
        vinculoId,
        pessoaId,
        modulo,
        entidadeId,
        tipoVinculo,
        descricao,
        userId
      ]);

      this.logger.info(`Vínculo criado: ${vinculoId}`);
      return vinculoId;
    } catch (error) {
      this.logger.error('Erro ao criar vínculo:', error);
      throw error;
    }
  }

  /**
   * Lista vínculos de uma pessoa
   */
  async listarVinculos(pessoaId, modulo = null) {
    try {
      let whereClause = 'WHERE pessoa_id = ? AND ativo = true';
      const params = [pessoaId];

      if (modulo) {
        whereClause += ' AND modulo = ?';
        params.push(modulo);
      }

      const query = `
        SELECT * FROM pessoa_vinculos 
        ${whereClause}
        ORDER BY created_at DESC
      `;

      return await this.database.query(query, params);
    } catch (error) {
      this.logger.error('Erro ao listar vínculos:', error);
      throw error;
    }
  }

  /**
   * Upload de documento
   */
  async uploadDocumento(pessoaId, arquivo, tipoDocumento, observacoes, userId) {
    try {
      // Validações do arquivo
      this.validarArquivo(arquivo);

      // Gera hash do arquivo
      const hashArquivo = crypto.createHash('sha256').update(arquivo.buffer).digest('hex');

      // Verifica se arquivo já existe
      const arquivoExistente = await this.buscarDocumentoPorHash(hashArquivo);
      if (arquivoExistente) {
        throw new Error('Este arquivo já foi enviado anteriormente');
      }

      // Salva arquivo no sistema de arquivos
      const caminhoArquivo = await this.salvarArquivo(arquivo, pessoaId);

      // Registra no banco de dados
      const documentoId = this.generateId();
      const query = `
        INSERT INTO pessoa_documentos 
        (id, pessoa_id, tipo_documento, nome_arquivo, caminho_arquivo, 
         tamanho_arquivo, mime_type, hash_arquivo, observacoes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await this.database.query(query, [
        documentoId,
        pessoaId,
        tipoDocumento,
        arquivo.originalname,
        caminhoArquivo,
        arquivo.size,
        arquivo.mimetype,
        hashArquivo,
        observacoes,
        userId
      ]);

      // Emite evento
      this.eventBus.emit('documento:uploaded', {
        documentoId,
        pessoaId,
        tipoDocumento,
        nomeArquivo: arquivo.originalname,
        userId
      });

      this.logger.info(`Documento enviado com sucesso: ${documentoId}`);
      return documentoId;
    } catch (error) {
      this.logger.error('Erro ao fazer upload de documento:', error);
      throw error;
    }
  }

  /**
   * Lista documentos de uma pessoa
   */
  async listarDocumentos(pessoaId, tipoDocumento = null) {
    try {
      let whereClause = 'WHERE pessoa_id = ?';
      const params = [pessoaId];

      if (tipoDocumento) {
        whereClause += ' AND tipo_documento = ?';
        params.push(tipoDocumento);
      }

      const query = `
        SELECT id, tipo_documento, nome_arquivo, tamanho_arquivo, 
               mime_type, observacoes, created_at, created_by
        FROM pessoa_documentos 
        ${whereClause}
        ORDER BY created_at DESC
      `;

      return await this.database.query(query, params);
    } catch (error) {
      this.logger.error('Erro ao listar documentos:', error);
      throw error;
    }
  }

  /**
   * Valida arquivo para upload
   */
  validarArquivo(arquivo) {
    if (!arquivo) {
      throw new Error('Arquivo é obrigatório');
    }

    if (arquivo.size > this.config.maxDocumentSize) {
      throw new Error(`Arquivo muito grande. Tamanho máximo: ${this.config.maxDocumentSize / 1024 / 1024}MB`);
    }

    const extensao = arquivo.originalname.toLowerCase().substring(arquivo.originalname.lastIndexOf('.'));
    if (!this.config.allowedDocumentTypes.includes(extensao)) {
      throw new Error(`Tipo de arquivo não permitido. Tipos aceitos: ${this.config.allowedDocumentTypes.join(', ')}`);
    }

    return true;
  }

  /**
   * Salva arquivo no sistema de arquivos
   */
  async salvarArquivo(arquivo, pessoaId) {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Cria diretório se não existir
    const diretorioPessoa = path.join(this.config.documentStoragePath, pessoaId);
    await fs.mkdir(diretorioPessoa, { recursive: true });
    
    // Gera nome único para o arquivo
    const timestamp = Date.now();
    const extensao = arquivo.originalname.substring(arquivo.originalname.lastIndexOf('.'));
    const nomeArquivo = `${timestamp}_${crypto.randomBytes(8).toString('hex')}${extensao}`;
    
    const caminhoCompleto = path.join(diretorioPessoa, nomeArquivo);
    
    // Salva o arquivo
    await fs.writeFile(caminhoCompleto, arquivo.buffer);
    
    return caminhoCompleto;
  }

  /**
   * Busca documento por hash
   */
  async buscarDocumentoPorHash(hash) {
    try {
      const query = 'SELECT * FROM pessoa_documentos WHERE hash_arquivo = ?';
      const result = await this.database.query(query, [hash]);
      return result[0] || null;
    } catch (error) {
      this.logger.error('Erro ao buscar documento por hash:', error);
      throw error;
    }
  }

  /**
   * Salva pessoa no banco de dados
   */
  async salvarPessoa(dados) {
    try {
      const campos = Object.keys(dados).filter(campo => campo !== 'id');
      const valores = campos.map(campo => dados[campo]);
      
      const query = `
        INSERT INTO pessoas (id, ${campos.join(', ')})
        VALUES (?, ${campos.map(() => '?').join(', ')})
        ON DUPLICATE KEY UPDATE
        ${campos.map(campo => `${campo} = VALUES(${campo})`).join(', ')}
      `;
      
      await this.database.query(query, [dados.id, ...valores]);
    } catch (error) {
      this.logger.error('Erro ao salvar pessoa:', error);
      throw error;
    }
  }

  /**
   * Utilitários
   */
  generateId() {
    return crypto.randomUUID();
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  safeJsonParse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch {
      return jsonString;
    }
  }

  /**
   * Handlers de eventos
   */
  handlePessoaCreated(data) {
    this.logger.info(`Pessoa criada: ${data.pessoaId}`);
  }

  handlePessoaUpdated(data) {
    this.logger.info(`Pessoa atualizada: ${data.pessoaId}`);
  }

  handlePessoaDeleted(data) {
    this.logger.info(`Pessoa excluída: ${data.pessoaId}`);
  }

  handleDocumentoUploaded(data) {
    this.logger.info(`Documento enviado para pessoa ${data.pessoaId}: ${data.documentoId}`);
  }

  /**
   * Estatísticas do módulo
   */
  async getStats() {
    try {
      const queries = {
        totalPessoas: 'SELECT COUNT(*) as count FROM pessoas',
        pessoasFisicas: 'SELECT COUNT(*) as count FROM pessoas WHERE tipo = "fisica"',
        pessoasJuridicas: 'SELECT COUNT(*) as count FROM pessoas WHERE tipo = "juridica"',
        pessoasAtivas: 'SELECT COUNT(*) as count FROM pessoas WHERE status = "ativo"',
        totalDocumentos: 'SELECT COUNT(*) as count FROM pessoa_documentos',
        totalVinculos: 'SELECT COUNT(*) as count FROM pessoa_vinculos WHERE ativo = true'
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        const result = await this.database.query(query);
        results[key] = result[0].count;
      }

      return results;
    } catch (error) {
      this.logger.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Finaliza o módulo
   */
  async shutdown() {
    try {
      this.logger.info('Finalizando módulo de Pessoas');
      
      // Limpa cache
      this.receitaCache.clear();
      
      this.logger.info('Módulo de Pessoas finalizado');
    } catch (error) {
      this.logger.error('Erro ao finalizar módulo de Pessoas:', error);
    }
  }
}