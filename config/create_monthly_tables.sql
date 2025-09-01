-- Script SQL para criar estrutura de tabelas mensais otimizada
-- Sistema de Arquivamento de Contingências

-- =====================================================
-- TABELA PRINCIPAL MENSAL (Campos Críticos)
-- =====================================================

-- Template para tabelas mensais (substituir AAAAMM pelo período)
CREATE TABLE IF NOT EXISTS contingencias_202501 (
    -- Campos Críticos (Monitoramento Obrigatório)
    pasta TEXT PRIMARY KEY,
    situacao TEXT NOT NULL CHECK (situacao IN ('Ativo', 'Encerrado', 'Suspenso', 'Arquivado')),
    risco TEXT NOT NULL CHECK (risco IN ('Alto', 'Médio', 'Baixo', 'Muito Alto', 'Muito Baixo')),
    valor_analisado REAL CHECK (valor_analisado >= 0),
    valor_analisado_atualizado REAL CHECK (valor_analisado_atualizado >= 0),
    competencia TEXT NOT NULL, -- AAAA-MM
    data_criacao TEXT, -- AAAA-MM-DD
    categoria TEXT NOT NULL,
    
    -- Campos Importantes (Monitoramento Mensal)
    polo TEXT CHECK (polo IN ('Ativo', 'Passivo')),
    data_encerramento TEXT, -- AAAA-MM-DD
    data_acordo TEXT, -- AAAA-MM-DD
    tribunal TEXT,
    instancia TEXT,
    fase_processual TEXT,
    
    -- Metadados de Controle
    data_processamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hash_registro TEXT,
    arquivo_origem TEXT,
    
    -- Constraints
    CHECK (data_encerramento IS NULL OR data_encerramento >= data_criacao),
    CHECK (data_acordo IS NULL OR data_acordo >= data_criacao)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contingencias_202501_situacao ON contingencias_202501(situacao);
CREATE INDEX IF NOT EXISTS idx_contingencias_202501_risco ON contingencias_202501(risco);
CREATE INDEX IF NOT EXISTS idx_contingencias_202501_categoria ON contingencias_202501(categoria);
CREATE INDEX IF NOT EXISTS idx_contingencias_202501_competencia ON contingencias_202501(competencia);
CREATE INDEX IF NOT EXISTS idx_contingencias_202501_valor ON contingencias_202501(valor_analisado_atualizado);

-- =====================================================
-- TABELA DE DETALHES TRIMESTRAL (Campos Opcionais)
-- =====================================================

CREATE TABLE IF NOT EXISTS contingencias_detalhes_2025Q1 (
    pasta TEXT PRIMARY KEY,
    objeto TEXT, -- Descrição longa do objeto da ação
    advogado TEXT, -- Advogado responsável
    data_atualizacao TEXT, -- AAAA-MM-DD HH:MM:SS
    observacoes TEXT, -- Observações adicionais
    detalhes_tecnicos TEXT, -- Informações técnicas extras
    
    -- Metadados
    data_inclusao_detalhes TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Chave estrangeira (referência flexível para múltiplas tabelas mensais)
    CONSTRAINT fk_pasta_detalhes CHECK (length(pasta) > 0)
);

-- =====================================================
-- TABELA DE CONTROLE DE ARQUIVOS MENSAL
-- =====================================================

CREATE TABLE IF NOT EXISTS arquivo_controle_mensal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    periodo TEXT NOT NULL, -- AAAA-MM
    arquivo_path TEXT NOT NULL,
    arquivo_nome TEXT NOT NULL,
    data_modificacao TIMESTAMP,
    data_processamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hash_arquivo TEXT,
    linhas_processadas INTEGER DEFAULT 0,
    linhas_validas INTEGER DEFAULT 0,
    linhas_erro INTEGER DEFAULT 0,
    status_processamento TEXT DEFAULT 'Processado' CHECK (status_processamento IN ('Processado', 'Erro', 'Parcial')),
    observacoes_processamento TEXT,
    
    UNIQUE(periodo, arquivo_path)
);

CREATE INDEX IF NOT EXISTS idx_arquivo_controle_periodo ON arquivo_controle_mensal(periodo);
CREATE INDEX IF NOT EXISTS idx_arquivo_controle_status ON arquivo_controle_mensal(status_processamento);

-- =====================================================
-- TABELA DE METADADOS MENSAIS
-- =====================================================

CREATE TABLE IF NOT EXISTS metadados_mensais (
    periodo TEXT PRIMARY KEY, -- AAAA-MM
    data_processamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_registros INTEGER DEFAULT 0,
    registros_ativos INTEGER DEFAULT 0,
    registros_encerrados INTEGER DEFAULT 0,
    registros_suspensos INTEGER DEFAULT 0,
    registros_arquivados INTEGER DEFAULT 0,
    
    -- Valores financeiros
    valor_total REAL DEFAULT 0,
    valor_total_atualizado REAL DEFAULT 0,
    valor_medio_processo REAL DEFAULT 0,
    
    -- Distribuição por risco
    processos_risco_alto INTEGER DEFAULT 0,
    processos_risco_medio INTEGER DEFAULT 0,
    processos_risco_baixo INTEGER DEFAULT 0,
    
    -- Distribuição por categoria
    processos_trabalhista INTEGER DEFAULT 0,
    processos_civil INTEGER DEFAULT 0,
    processos_tributario INTEGER DEFAULT 0,
    processos_outros INTEGER DEFAULT 0,
    
    -- Hashes para integridade
    hash_arquivo_criticos TEXT,
    hash_arquivo_completo TEXT,
    
    -- Status do período
    status_periodo TEXT DEFAULT 'Aberto' CHECK (status_periodo IN ('Aberto', 'Fechado', 'Auditado')),
    data_fechamento TIMESTAMP,
    responsavel_fechamento TEXT
);

-- =====================================================
-- VIEWS PARA CONSULTAS OTIMIZADAS
-- =====================================================

-- View para dados críticos do mês atual
CREATE VIEW IF NOT EXISTS vw_contingencias_criticas_atual AS
SELECT 
    pasta,
    situacao,
    risco,
    valor_analisado,
    valor_analisado_atualizado,
    competencia,
    categoria,
    data_criacao,
    data_processamento
FROM contingencias_202501
WHERE situacao = 'Ativo'
ORDER BY valor_analisado_atualizado DESC;

-- View para resumo por categoria
CREATE VIEW IF NOT EXISTS vw_resumo_categoria_atual AS
SELECT 
    categoria,
    COUNT(*) as total_processos,
    COUNT(CASE WHEN situacao = 'Ativo' THEN 1 END) as processos_ativos,
    SUM(valor_analisado_atualizado) as valor_total,
    AVG(valor_analisado_atualizado) as valor_medio,
    MAX(valor_analisado_atualizado) as maior_valor,
    MIN(valor_analisado_atualizado) as menor_valor
FROM contingencias_202501
GROUP BY categoria
ORDER BY valor_total DESC;

-- View para processos de alto risco
CREATE VIEW IF NOT EXISTS vw_alto_risco_atual AS
SELECT 
    pasta,
    categoria,
    valor_analisado_atualizado,
    tribunal,
    fase_processual,
    data_criacao
FROM contingencias_202501
WHERE risco IN ('Alto', 'Muito Alto')
  AND situacao = 'Ativo'
ORDER BY valor_analisado_atualizado DESC;

-- =====================================================
-- TRIGGERS PARA MANUTENÇÃO AUTOMÁTICA
-- =====================================================

-- Trigger para atualizar metadados após inserção
CREATE TRIGGER IF NOT EXISTS trg_update_metadados_insert
AFTER INSERT ON contingencias_202501
BEGIN
    INSERT OR REPLACE INTO metadados_mensais (
        periodo,
        total_registros,
        registros_ativos,
        registros_encerrados,
        registros_suspensos,
        registros_arquivados,
        valor_total_atualizado
    )
    SELECT 
        '2025-01',
        COUNT(*),
        COUNT(CASE WHEN situacao = 'Ativo' THEN 1 END),
        COUNT(CASE WHEN situacao = 'Encerrado' THEN 1 END),
        COUNT(CASE WHEN situacao = 'Suspenso' THEN 1 END),
        COUNT(CASE WHEN situacao = 'Arquivado' THEN 1 END),
        COALESCE(SUM(valor_analisado_atualizado), 0)
    FROM contingencias_202501;
END;

-- =====================================================
-- PROCEDIMENTOS DE MANUTENÇÃO
-- =====================================================

-- Para criar nova tabela mensal (executar mensalmente)
/*
EXAMPLE: Para criar tabela de fevereiro 2025:

CREATE TABLE contingencias_202502 AS SELECT * FROM contingencias_202501 WHERE 1=0;
-- (Copia estrutura sem dados)

-- Ou usar o template completo substituindo 202501 por 202502
*/

-- Para arquivar dados antigos (executar anualmente)
/*
EXAMPLE: Para arquivar dados de 2024:

CREATE TABLE arquivo_contingencias_2024 AS 
SELECT * FROM contingencias_202401 
UNION ALL SELECT * FROM contingencias_202402
-- ... continuar para todos os meses de 2024

-- Depois remover tabelas mensais antigas se necessário
*/

-- =====================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

/*
ESTRATÉGIA DE USO:

1. MENSAL:
   - Criar nova tabela contingencias_AAAAMM
   - Processar arquivos mm-aaaa do período
   - Atualizar metadados_mensais
   - Gerar backup dos campos críticos

2. TRIMESTRAL:
   - Atualizar contingencias_detalhes_AAAAQQQ
   - Consolidar dados opcionais
   - Verificar integridade referencial

3. ANUAL:
   - Arquivar dados antigos
   - Auditoria completa
   - Limpeza de registros obsoletos

CAMPOS CRÍTICOS (Backup Diário):
- pasta, situacao, risco, valores, competencia, categoria

CAMPOS IMPORTANTES (Backup Semanal):
- polo, datas, tribunal, instancia, fase_processual

CAMPOS OPCIONAIS (Backup Mensal):
- objeto, advogado, observacoes
*/