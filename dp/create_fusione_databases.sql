-- Script SQL para criar bancos de dados do Fusione Core System
-- Execute este script para criar todas as tabelas necessárias

-- =====================================================
-- BANCO DE DADOS PRINCIPAL - FUSIONE CORE
-- =====================================================

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha_hash TEXT NOT NULL,
    ativo BOOLEAN DEFAULT 1,
    perfil_id INTEGER,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP,
    tentativas_login INTEGER DEFAULT 0,
    bloqueado BOOLEAN DEFAULT 0
);

-- Tabela de Perfis
CREATE TABLE IF NOT EXISTS perfis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    permissoes TEXT, -- JSON com permissões
    ativo BOOLEAN DEFAULT 1,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Sessões
CREATE TABLE IF NOT EXISTS sessoes (
    id TEXT PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    token_refresh TEXT,
    ip_address TEXT,
    user_agent TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_expiracao TIMESTAMP,
    ativo BOOLEAN DEFAULT 1,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS logs_auditoria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER,
    acao TEXT NOT NULL,
    modulo TEXT NOT NULL,
    recurso TEXT,
    detalhes TEXT, -- JSON com detalhes da ação
    ip_address TEXT,
    user_agent TEXT,
    data_acao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- =====================================================
-- MÓDULO PESSOAS
-- =====================================================

-- Tabela de Pessoas
CREATE TABLE IF NOT EXISTS pessoas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipo_pessoa TEXT CHECK(tipo_pessoa IN ('fisica', 'juridica')) NOT NULL,
    cpf_cnpj TEXT UNIQUE,
    rg_ie TEXT,
    data_nascimento DATE,
    estado_civil TEXT,
    profissao TEXT,
    nacionalidade TEXT DEFAULT 'Brasileira',
    observacoes TEXT,
    ativo BOOLEAN DEFAULT 1,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Endereços
CREATE TABLE IF NOT EXISTS enderecos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pessoa_id INTEGER NOT NULL,
    tipo_endereco TEXT DEFAULT 'residencial',
    logradouro TEXT NOT NULL,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    cep TEXT,
    pais TEXT DEFAULT 'Brasil',
    principal BOOLEAN DEFAULT 0,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);

-- Tabela de Contatos
CREATE TABLE IF NOT EXISTS contatos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pessoa_id INTEGER NOT NULL,
    tipo_contato TEXT CHECK(tipo_contato IN ('telefone', 'email', 'whatsapp', 'telegram')) NOT NULL,
    valor TEXT NOT NULL,
    principal BOOLEAN DEFAULT 0,
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);

-- =====================================================
-- MÓDULO CONTENCIOSO
-- =====================================================

-- Tabela de Processos
CREATE TABLE IF NOT EXISTS processos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_processo TEXT UNIQUE NOT NULL,
    numero_interno TEXT,
    tipo_processo TEXT NOT NULL,
    status_processo TEXT NOT NULL,
    fase_processual TEXT,
    tribunal TEXT,
    instancia TEXT,
    vara TEXT,
    comarca TEXT,
    valor_causa DECIMAL(15,2),
    valor_deposito DECIMAL(15,2),
    valor_acordo DECIMAL(15,2),
    risco_perda TEXT CHECK(risco_perda IN ('baixo', 'medio', 'alto', 'remoto', 'provavel', 'possivel')),
    objeto TEXT,
    observacoes TEXT,
    advogado_responsavel TEXT,
    cliente_id INTEGER,
    data_distribuicao DATE,
    data_citacao DATE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_encerramento DATE,
    ativo BOOLEAN DEFAULT 1,
    FOREIGN KEY (cliente_id) REFERENCES pessoas(id)
);

-- Tabela de Movimentações Processuais
CREATE TABLE IF NOT EXISTS movimentacoes_processuais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processo_id INTEGER NOT NULL,
    data_movimentacao DATE NOT NULL,
    tipo_movimentacao TEXT NOT NULL,
    descricao TEXT NOT NULL,
    observacoes TEXT,
    usuario_id INTEGER,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabela de Prazos Processuais
CREATE TABLE IF NOT EXISTS prazos_processuais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processo_id INTEGER NOT NULL,
    tipo_prazo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    data_prazo DATE NOT NULL,
    data_cumprimento DATE,
    prioridade TEXT CHECK(prioridade IN ('baixa', 'normal', 'alta', 'critica')) DEFAULT 'normal',
    status_prazo TEXT CHECK(status_prazo IN ('pendente', 'cumprido', 'vencido')) DEFAULT 'pendente',
    observacoes TEXT,
    responsavel TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE
);

-- Tabela de Audiências
CREATE TABLE IF NOT EXISTS audiencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processo_id INTEGER NOT NULL,
    tipo_audiencia TEXT NOT NULL,
    data_audiencia DATETIME NOT NULL,
    local_audiencia TEXT,
    status_audiencia TEXT CHECK(status_audiencia IN ('agendada', 'realizada', 'cancelada', 'adiada')) DEFAULT 'agendada',
    resultado TEXT,
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE
);

-- Tabela de Custas Processuais
CREATE TABLE IF NOT EXISTS custas_processuais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    processo_id INTEGER NOT NULL,
    tipo_custa TEXT NOT NULL,
    descricao TEXT NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    data_vencimento DATE,
    data_pagamento DATE,
    status_pagamento TEXT CHECK(status_pagamento IN ('pendente', 'pago', 'vencido')) DEFAULT 'pendente',
    forma_pagamento TEXT,
    comprovante_path TEXT,
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (processo_id) REFERENCES processos(id) ON DELETE CASCADE
);

-- =====================================================
-- MÓDULO CONTRATOS
-- =====================================================

-- Tabela de Contratos
CREATE TABLE IF NOT EXISTS contratos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_contrato TEXT UNIQUE NOT NULL,
    titulo TEXT NOT NULL,
    tipo_contrato TEXT NOT NULL,
    status_contrato TEXT CHECK(status_contrato IN ('rascunho', 'ativo', 'suspenso', 'encerrado', 'cancelado')) DEFAULT 'rascunho',
    valor_contrato DECIMAL(15,2),
    moeda TEXT DEFAULT 'BRL',
    data_inicio DATE,
    data_fim DATE,
    data_assinatura DATE,
    renovacao_automatica BOOLEAN DEFAULT 0,
    observacoes TEXT,
    arquivo_path TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT 1
);

-- Tabela de Partes do Contrato
CREATE TABLE IF NOT EXISTS partes_contrato (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contrato_id INTEGER NOT NULL,
    pessoa_id INTEGER NOT NULL,
    tipo_parte TEXT CHECK(tipo_parte IN ('contratante', 'contratado', 'interveniente', 'testemunha')) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE,
    FOREIGN KEY (pessoa_id) REFERENCES pessoas(id)
);

-- Tabela de Cláusulas
CREATE TABLE IF NOT EXISTS clausulas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contrato_id INTEGER NOT NULL,
    numero_clausula TEXT NOT NULL,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    tipo_clausula TEXT,
    obrigatoria BOOLEAN DEFAULT 0,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE
);

-- =====================================================
-- MÓDULO PROCURAÇÕES
-- =====================================================

-- Tabela de Procurações
CREATE TABLE IF NOT EXISTS procuracoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_procuracao TEXT UNIQUE NOT NULL,
    outorgante_id INTEGER NOT NULL,
    outorgado_id INTEGER NOT NULL,
    tipo_procuracao TEXT CHECK(tipo_procuracao IN ('publica', 'particular', 'judicial', 'administrativa')) NOT NULL,
    finalidade TEXT NOT NULL,
    poderes TEXT NOT NULL, -- JSON com lista de poderes
    data_outorga DATE NOT NULL,
    data_vencimento DATE,
    revogada BOOLEAN DEFAULT 0,
    data_revogacao DATE,
    observacoes TEXT,
    arquivo_path TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT 1,
    FOREIGN KEY (outorgante_id) REFERENCES pessoas(id),
    FOREIGN KEY (outorgado_id) REFERENCES pessoas(id)
);

-- Tabela de Substabelecimentos
CREATE TABLE IF NOT EXISTS substabelecimentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    procuracao_id INTEGER NOT NULL,
    substabelecente_id INTEGER NOT NULL,
    substabelecido_id INTEGER NOT NULL,
    tipo_substabelecimento TEXT CHECK(tipo_substabelecimento IN ('com_reserva', 'sem_reserva')) NOT NULL,
    poderes_substabelecidos TEXT NOT NULL, -- JSON
    data_substabelecimento DATE NOT NULL,
    observacoes TEXT,
    arquivo_path TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT 1,
    FOREIGN KEY (procuracao_id) REFERENCES procuracoes(id),
    FOREIGN KEY (substabelecente_id) REFERENCES pessoas(id),
    FOREIGN KEY (substabelecido_id) REFERENCES pessoas(id)
);

-- =====================================================
-- MÓDULO SOCIETÁRIO
-- =====================================================

-- Tabela de Empresas
CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT UNIQUE NOT NULL,
    inscricao_estadual TEXT,
    inscricao_municipal TEXT,
    tipo_empresa TEXT NOT NULL,
    porte_empresa TEXT,
    regime_tributario TEXT,
    atividade_principal TEXT,
    atividades_secundarias TEXT, -- JSON
    capital_social DECIMAL(15,2),
    data_constituicao DATE,
    situacao TEXT DEFAULT 'ativa',
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT 1
);

-- Tabela de Sócios
CREATE TABLE IF NOT EXISTS socios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empresa_id INTEGER NOT NULL,
    pessoa_id INTEGER NOT NULL,
    tipo_socio TEXT CHECK(tipo_socio IN ('administrador', 'quotista', 'acionista', 'diretor')) NOT NULL,
    participacao_percentual DECIMAL(5,2),
    valor_participacao DECIMAL(15,2),
    data_entrada DATE NOT NULL,
    data_saida DATE,
    ativo BOOLEAN DEFAULT 1,
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (pessoa_id) REFERENCES pessoas(id)
);

-- =====================================================
-- MÓDULO MARCAS E PATENTES
-- =====================================================

-- Tabela de Marcas
CREATE TABLE IF NOT EXISTS marcas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_processo TEXT UNIQUE NOT NULL,
    nome_marca TEXT NOT NULL,
    tipo_marca TEXT CHECK(tipo_marca IN ('nominativa', 'figurativa', 'mista', 'tridimensional')) NOT NULL,
    classe_nice TEXT NOT NULL,
    especificacao TEXT NOT NULL,
    titular_id INTEGER NOT NULL,
    status_marca TEXT NOT NULL,
    data_deposito DATE NOT NULL,
    data_concessao DATE,
    data_vencimento DATE,
    observacoes TEXT,
    arquivo_path TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT 1,
    FOREIGN KEY (titular_id) REFERENCES pessoas(id)
);

-- Tabela de Prazos PI (Propriedade Intelectual)
CREATE TABLE IF NOT EXISTS prazos_pi (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    marca_id INTEGER,
    tipo_prazo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    data_prazo DATE NOT NULL,
    data_cumprimento DATE,
    status_prazo TEXT CHECK(status_prazo IN ('pendente', 'cumprido', 'vencido')) DEFAULT 'pendente',
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (marca_id) REFERENCES marcas(id) ON DELETE CASCADE
);

-- =====================================================
-- TABELA DE CONTINGÊNCIAS (DADOS HISTÓRICOS)
-- =====================================================

-- Tabela principal de contingências (baseada no arquivo existente)
CREATE TABLE IF NOT EXISTS fato_contingencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pasta TEXT,
    situacao TEXT,
    categoria TEXT,
    polo TEXT,
    risco TEXT,
    valor_analisado DECIMAL(15,2),
    valor_analisado_atualizado DECIMAL(15,2),
    competencia TEXT,
    objeto TEXT,
    data_criacao DATE,
    data_encerramento DATE,
    data_acordo DATE,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    advogado TEXT,
    tribunal TEXT,
    instancia TEXT,
    fase_processual TEXT,
    data_processamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    arquivo_origem TEXT,
    processo_id INTEGER, -- Referência para tabela processos
    FOREIGN KEY (processo_id) REFERENCES processos(id)
);

-- Tabela de controle de arquivos
CREATE TABLE IF NOT EXISTS arquivo_controle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arquivo_path TEXT NOT NULL UNIQUE,
    arquivo_nome TEXT NOT NULL,
    data_modificacao TIMESTAMP,
    data_processamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hash_arquivo TEXT,
    linhas_processadas INTEGER DEFAULT 0,
    status_processamento TEXT DEFAULT 'processado'
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para Usuários
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_ativo ON usuarios(ativo);

-- Índices para Pessoas
CREATE INDEX IF NOT EXISTS idx_pessoas_cpf_cnpj ON pessoas(cpf_cnpj);
CREATE INDEX IF NOT EXISTS idx_pessoas_nome ON pessoas(nome);
CREATE INDEX IF NOT EXISTS idx_pessoas_tipo ON pessoas(tipo_pessoa);

-- Índices para Processos
CREATE INDEX IF NOT EXISTS idx_processos_numero ON processos(numero_processo);
CREATE INDEX IF NOT EXISTS idx_processos_status ON processos(status_processo);
CREATE INDEX IF NOT EXISTS idx_processos_tribunal ON processos(tribunal);
CREATE INDEX IF NOT EXISTS idx_processos_cliente ON processos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_processos_data_criacao ON processos(data_criacao);

-- Índices para Prazos
CREATE INDEX IF NOT EXISTS idx_prazos_data_prazo ON prazos_processuais(data_prazo);
CREATE INDEX IF NOT EXISTS idx_prazos_status ON prazos_processuais(status_prazo);
CREATE INDEX IF NOT EXISTS idx_prazos_processo ON prazos_processuais(processo_id);

-- Índices para Contingências
CREATE INDEX IF NOT EXISTS idx_contingencias_competencia ON fato_contingencias(competencia);
CREATE INDEX IF NOT EXISTS idx_contingencias_situacao ON fato_contingencias(situacao);
CREATE INDEX IF NOT EXISTS idx_contingencias_risco ON fato_contingencias(risco);
CREATE INDEX IF NOT EXISTS idx_contingencias_data_criacao ON fato_contingencias(data_criacao);
CREATE INDEX IF NOT EXISTS idx_contingencias_processo ON fato_contingencias(processo_id);

-- Índices para Contratos
CREATE INDEX IF NOT EXISTS idx_contratos_numero ON contratos(numero_contrato);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(status_contrato);
CREATE INDEX IF NOT EXISTS idx_contratos_data_inicio ON contratos(data_inicio);

-- Índices para Empresas
CREATE INDEX IF NOT EXISTS idx_empresas_cnpj ON empresas(cnpj);
CREATE INDEX IF NOT EXISTS idx_empresas_razao_social ON empresas(razao_social);

-- Índices para Marcas
CREATE INDEX IF NOT EXISTS idx_marcas_numero_processo ON marcas(numero_processo);
CREATE INDEX IF NOT EXISTS idx_marcas_nome ON marcas(nome_marca);
CREATE INDEX IF NOT EXISTS idx_marcas_titular ON marcas(titular_id);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Inserir perfis padrão
INSERT OR IGNORE INTO perfis (nome, descricao, permissoes) VALUES 
('Administrador', 'Acesso total ao sistema', '{"admin": true, "all_modules": true}'),
('Advogado', 'Acesso aos módulos jurídicos', '{"contencioso": true, "contratos": true, "procuracoes": true}'),
('Assistente', 'Acesso limitado para assistentes', '{"contencioso": "read", "contratos": "read"}'),
('Cliente', 'Acesso apenas aos próprios processos', '{"contencioso": "own_only"}');

-- Inserir usuário administrador padrão
INSERT OR IGNORE INTO usuarios (nome, email, senha_hash, perfil_id) VALUES 
('Administrador', 'admin@fusione.com', '$2b$10$example_hash_here', 1);

PRAGMA foreign_keys = ON;

-- Fim do script