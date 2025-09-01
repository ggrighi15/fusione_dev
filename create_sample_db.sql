-- Script SQL para criar banco de dados de exemplo para contingências
-- Execute este script em um cliente SQLite para criar o banco

-- Criar tabela principal de contingências
CREATE TABLE IF NOT EXISTS fato_contingencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_processo TEXT NOT NULL,
    tipo_acao TEXT,
    status_processo TEXT,
    valor_causa REAL,
    valor_deposito REAL,
    valor_acordo REAL,
    data_criacao DATE,
    data_encerramento DATE,
    data_acordo DATE,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    advogado TEXT,
    tribunal TEXT,
    instancia TEXT,
    fase_processual TEXT,
    data_processamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    arquivo_origem TEXT
);

-- Criar tabela de controle de arquivos
CREATE TABLE IF NOT EXISTS arquivo_controle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    arquivo_path TEXT NOT NULL UNIQUE,
    arquivo_nome TEXT NOT NULL,
    data_modificacao TIMESTAMP,
    data_processamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hash_arquivo TEXT,
    linhas_processadas INTEGER DEFAULT 0
);

-- Inserir dados de exemplo
INSERT INTO fato_contingencias (
    numero_processo, tipo_acao, status_processo, valor_causa, valor_deposito, valor_acordo,
    data_criacao, data_encerramento, data_acordo, advogado, tribunal, instancia, fase_processual, arquivo_origem
) VALUES 
('0001234-56.2023.8.26.0100', 'Ação Trabalhista', 'Em Andamento', 150000.00, 15000.00, NULL, '2023-01-15', NULL, NULL, 'Dr. João Silva', 'TRT 2ª Região', '1ª Instância', 'Instrução', '01-2023.xlsx'),
('0002345-67.2023.8.26.0200', 'Ação Cível', 'Encerrado', 250000.00, 25000.00, 180000.00, '2023-02-20', '2023-11-15', '2023-10-30', 'Dra. Maria Santos', 'TJSP', '1ª Instância', 'Acordo', '02-2023.xlsx'),
('0003456-78.2023.8.26.0300', 'Ação Previdenciária', 'Em Andamento', 80000.00, 8000.00, NULL, '2023-03-10', NULL, NULL, 'Dr. Carlos Oliveira', 'TRF 3ª Região', '1ª Instância', 'Perícia', '03-2023.xlsx'),
('0004567-89.2023.8.26.0400', 'Ação Tributária', 'Suspenso', 500000.00, 50000.00, NULL, '2023-04-05', NULL, NULL, 'Dra. Ana Costa', 'TRF 3ª Região', '2ª Instância', 'Recurso', '04-2023.xlsx'),
('0005678-90.2023.8.26.0500', 'Ação Trabalhista', 'Encerrado', 120000.00, 12000.00, 95000.00, '2023-05-12', '2023-12-20', '2023-12-01', 'Dr. Pedro Lima', 'TRT 2ª Região', '1ª Instância', 'Acordo', '05-2023.xlsx'),
('0006789-01.2024.8.26.0600', 'Ação Cível', 'Em Andamento', 300000.00, 30000.00, NULL, '2024-01-08', NULL, NULL, 'Dra. Lucia Ferreira', 'TJSP', '1ª Instância', 'Contestação', '01-2024.xlsx'),
('0007890-12.2024.8.26.0700', 'Ação Ambiental', 'Em Andamento', 750000.00, 75000.00, NULL, '2024-02-14', NULL, NULL, 'Dr. Roberto Alves', 'TRF 3ª Região', '1ª Instância', 'Instrução', '02-2024.xlsx'),
('0008901-23.2024.8.26.0800', 'Ação Trabalhista', 'Arquivado', 90000.00, 9000.00, NULL, '2024-03-20', '2024-06-15', NULL, 'Dra. Fernanda Rocha', 'TRT 2ª Região', '1ª Instância', 'Arquivado', '03-2024.xlsx');

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_numero_processo ON fato_contingencias(numero_processo);
CREATE INDEX IF NOT EXISTS idx_status_processo ON fato_contingencias(status_processo);
CREATE INDEX IF NOT EXISTS idx_data_criacao ON fato_contingencias(data_criacao);
CREATE INDEX IF NOT EXISTS idx_tribunal ON fato_contingencias(tribunal);
CREATE INDEX IF NOT EXISTS idx_advogado ON fato_contingencias(advogado);

-- Inserir registros de controle de arquivos
INSERT INTO arquivo_controle (arquivo_path, arquivo_nome, data_modificacao, hash_arquivo, linhas_processadas) VALUES 
('C:\\dados\\contingencias\\01-2023.xlsx', '01-2023.xlsx', '2023-01-31 10:30:00', 'abc123def456', 1),
('C:\\dados\\contingencias\\02-2023.xlsx', '02-2023.xlsx', '2023-02-28 11:45:00', 'def456ghi789', 1),
('C:\\dados\\contingencias\\03-2023.xlsx', '03-2023.xlsx', '2023-03-31 09:15:00', 'ghi789jkl012', 1),
('C:\\dados\\contingencias\\04-2023.xlsx', '04-2023.xlsx', '2023-04-30 14:20:00', 'jkl012mno345', 1),
('C:\\dados\\contingencias\\05-2023.xlsx', '05-2023.xlsx', '2023-05-31 16:30:00', 'mno345pqr678', 1),
('C:\\dados\\contingencias\\01-2024.xlsx', '01-2024.xlsx', '2024-01-31 08:45:00', 'pqr678stu901', 1),
('C:\\dados\\contingencias\\02-2024.xlsx', '02-2024.xlsx', '2024-02-29 12:00:00', 'stu901vwx234', 1),
('C:\\dados\\contingencias\\03-2024.xlsx', '03-2024.xlsx', '2024-03-31 15:30:00', 'vwx234yz567', 1);

-- Verificar dados inseridos
SELECT 'Registros em fato_contingencias:' as info, COUNT(*) as total FROM fato_contingencias
UNION ALL
SELECT 'Registros em arquivo_controle:' as info, COUNT(*) as total FROM arquivo_controle;