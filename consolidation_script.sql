-- Criar tabela consolidada para dados historicos 2021-2024
CREATE TABLE IF NOT EXISTS fato_contingencias_consolidado (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pasta TEXT NOT NULL,
    situacao TEXT,
    categoria TEXT,
    polo TEXT,
    risco TEXT,
    valor_analisado REAL,
    valor_analisado_atualizado REAL,
    competencia TEXT NOT NULL,
    objeto TEXT,
    tabela_origem TEXT NOT NULL,
    data_consolidacao DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(pasta, competencia)
);

-- Criar indices para performance
CREATE INDEX IF NOT EXISTS idx_consolidado_competencia ON fato_contingencias_consolidado(competencia);
CREATE INDEX IF NOT EXISTS idx_consolidado_pasta ON fato_contingencias_consolidado(pasta);
CREATE INDEX IF NOT EXISTS idx_consolidado_tabela_origem ON fato_contingencias_consolidado(tabela_origem);
CREATE INDEX IF NOT EXISTS idx_consolidado_situacao ON fato_contingencias_consolidado(situacao);

-- Consolidar dados da tabela 01_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-01' as competencia,
    TRIM(objeto) as objeto,
    '01_2021' as tabela_origem
FROM [01_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 02_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-02' as competencia,
    TRIM(objeto) as objeto,
    '02_2021' as tabela_origem
FROM [02_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 03_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-03' as competencia,
    TRIM(objeto) as objeto,
    '03_2021' as tabela_origem
FROM [03_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 04_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-04' as competencia,
    TRIM(objeto) as objeto,
    '04_2021' as tabela_origem
FROM [04_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 05_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-05' as competencia,
    TRIM(objeto) as objeto,
    '05_2021' as tabela_origem
FROM [05_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 06_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-06' as competencia,
    TRIM(objeto) as objeto,
    '06_2021' as tabela_origem
FROM [06_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 07_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-07' as competencia,
    TRIM(objeto) as objeto,
    '07_2021' as tabela_origem
FROM [07_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 08_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-08' as competencia,
    TRIM(objeto) as objeto,
    '08_2021' as tabela_origem
FROM [08_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 09_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-09' as competencia,
    TRIM(objeto) as objeto,
    '09_2021' as tabela_origem
FROM [09_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 10_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-10' as competencia,
    TRIM(objeto) as objeto,
    '10_2021' as tabela_origem
FROM [10_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 11_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-11' as competencia,
    TRIM(objeto) as objeto,
    '11_2021' as tabela_origem
FROM [11_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 12_2021
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2021-12' as competencia,
    TRIM(objeto) as objeto,
    '12_2021' as tabela_origem
FROM [12_2021]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 01_2022
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2022-01' as competencia,
    TRIM(objeto) as objeto,
    '01_2022' as tabela_origem
FROM [01_2022]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 02_2022
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2022-02' as competencia,
    TRIM(objeto) as objeto,
    '02_2022' as tabela_origem
FROM [02_2022]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 03_2022
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2022-03' as competencia,
    TRIM(objeto) as objeto,
    '03_2022' as tabela_origem
FROM [03_2022]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 04_2022
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2022-04' as competencia,
    TRIM(objeto) as objeto,
    '04_2022' as tabela_origem
FROM [04_2022]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 05_2022
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2022-05' as competencia,
    TRIM(objeto) as objeto,
    '05_2022' as tabela_origem
FROM [05_2022]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 06_2022
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2022-06' as competencia,
    TRIM(objeto) as objeto,
    '06_2022' as tabela_origem
FROM [06_2022]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 07_2022
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2022-07' as competencia,
    TRIM(objeto) as objeto,
    '07_2022' as tabela_origem
FROM [07_2022]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 08_2022
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2022-08' as competencia,
    TRIM(objeto) as objeto,
    '08_2022' as tabela_origem
FROM [08_2022]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 09_2022
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2022-09' as competencia,
    TRIM(objeto) as objeto,
    '09_2022' as tabela_origem
FROM [09_2022]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 10_2022
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2022-10' as competencia,
    TRIM(objeto) as objeto,
    '10_2022' as tabela_origem
FROM [10_2022]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 12_2022
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2022-12' as competencia,
    TRIM(objeto) as objeto,
    '12_2022' as tabela_origem
FROM [12_2022]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 01_2023
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2023-01' as competencia,
    TRIM(objeto) as objeto,
    '01_2023' as tabela_origem
FROM [01_2023]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 03_2023
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2023-03' as competencia,
    TRIM(objeto) as objeto,
    '03_2023' as tabela_origem
FROM [03_2023]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 04_2023
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2023-04' as competencia,
    TRIM(objeto) as objeto,
    '04_2023' as tabela_origem
FROM [04_2023]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 05_2023
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2023-05' as competencia,
    TRIM(objeto) as objeto,
    '05_2023' as tabela_origem
FROM [05_2023]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 06_2023
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2023-06' as competencia,
    TRIM(objeto) as objeto,
    '06_2023' as tabela_origem
FROM [06_2023]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 07_2023
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2023-07' as competencia,
    TRIM(objeto) as objeto,
    '07_2023' as tabela_origem
FROM [07_2023]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 08_2023
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2023-08' as competencia,
    TRIM(objeto) as objeto,
    '08_2023' as tabela_origem
FROM [08_2023]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 09_2023
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2023-09' as competencia,
    TRIM(objeto) as objeto,
    '09_2023' as tabela_origem
FROM [09_2023]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 10_2023
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2023-10' as competencia,
    TRIM(objeto) as objeto,
    '10_2023' as tabela_origem
FROM [10_2023]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 11_2023
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2023-11' as competencia,
    TRIM(objeto) as objeto,
    '11_2023' as tabela_origem
FROM [11_2023]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 12_2023
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2023-12' as competencia,
    TRIM(objeto) as objeto,
    '12_2023' as tabela_origem
FROM [12_2023]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 01_2024
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2024-01' as competencia,
    TRIM(objeto) as objeto,
    '01_2024' as tabela_origem
FROM [01_2024]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 02_2024
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2024-02' as competencia,
    TRIM(objeto) as objeto,
    '02_2024' as tabela_origem
FROM [02_2024]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 05_2024
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2024-05' as competencia,
    TRIM(objeto) as objeto,
    '05_2024' as tabela_origem
FROM [05_2024]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 06_2024
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2024-06' as competencia,
    TRIM(objeto) as objeto,
    '06_2024' as tabela_origem
FROM [06_2024]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 07_2024
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2024-07' as competencia,
    TRIM(objeto) as objeto,
    '07_2024' as tabela_origem
FROM [07_2024]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 08_2024
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2024-08' as competencia,
    TRIM(objeto) as objeto,
    '08_2024' as tabela_origem
FROM [08_2024]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 09_2024
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2024-09' as competencia,
    TRIM(objeto) as objeto,
    '09_2024' as tabela_origem
FROM [09_2024]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 10_2024
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2024-10' as competencia,
    TRIM(objeto) as objeto,
    '10_2024' as tabela_origem
FROM [10_2024]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 11_2024
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2024-11' as competencia,
    TRIM(objeto) as objeto,
    '11_2024' as tabela_origem
FROM [11_2024]
WHERE pasta IS NOT NULL AND pasta != '';

-- Consolidar dados da tabela 12_2024
INSERT OR REPLACE INTO fato_contingencias_consolidado (
    pasta, situacao, categoria, polo, risco, 
    valor_analisado, valor_analisado_atualizado, 
    competencia, objeto, tabela_origem
)
SELECT 
    TRIM(pasta) as pasta,
    TRIM(situacao) as situacao,
    TRIM(categoria) as categoria,
    TRIM(polo) as polo,
    TRIM(risco) as risco,
    CAST(REPLACE(REPLACE(valor_analisado, ',', '.'), ' ', '') AS REAL) as valor_analisado,
    CAST(REPLACE(REPLACE(valor_analisado_atualizado, ',', '.'), ' ', '') AS REAL) as valor_analisado_atualizado,
    '2024-12' as competencia,
    TRIM(objeto) as objeto,
    '12_2024' as tabela_origem
FROM [12_2024]
WHERE pasta IS NOT NULL AND pasta != '';

-- Criar tabela de resumo por competencia
CREATE TABLE IF NOT EXISTS resumo_competencias AS
SELECT 
    competencia,
    tabela_origem,
    COUNT(*) as total_registros,
    COUNT(DISTINCT pasta) as pastas_unicas,
    SUM(valor_analisado) as valor_total,
    SUM(valor_analisado_atualizado) as valor_atualizado_total,
    MIN(data_consolidacao) as data_consolidacao
FROM fato_contingencias_consolidado
GROUP BY competencia, tabela_origem
ORDER BY competencia;

-- Criar tabela de lacunas identificadas
CREATE TABLE IF NOT EXISTS lacunas_temporais (
    competencia TEXT PRIMARY KEY,
    tabela_esperada TEXT,
    status TEXT DEFAULT 'FALTANTE',
    observacoes TEXT
);

INSERT OR REPLACE INTO lacunas_temporais (competencia, tabela_esperada, observacoes)
VALUES ('2022-11', '11_2022', 'Tabela nao encontrada no banco original');

INSERT OR REPLACE INTO lacunas_temporais (competencia, tabela_esperada, observacoes)
VALUES ('2023-02', '02_2023', 'Tabela nao encontrada no banco original');

INSERT OR REPLACE INTO lacunas_temporais (competencia, tabela_esperada, observacoes)
VALUES ('2024-03', '03_2024', 'Tabela nao encontrada no banco original');

INSERT OR REPLACE INTO lacunas_temporais (competencia, tabela_esperada, observacoes)
VALUES ('2024-04', '04_2024', 'Tabela nao encontrada no banco original');

