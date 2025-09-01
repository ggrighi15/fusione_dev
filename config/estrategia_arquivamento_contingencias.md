# Estratégia de Arquivamento Otimizada - Dados de Contingências

## Análise da Estrutura Atual

Baseado na análise do sistema atual (`load_contingencias.py`), identificamos 16 campos principais:

### Campos Críticos (Monitoramento Obrigatório)
Estes campos são essenciais para análises jurídicas e financeiras:

1. **pasta** - Identificador único do processo
2. **situacao** - Status atual (Ativo, Encerrado, Suspenso, etc.)
3. **risco** - Classificação de risco (Alto, Médio, Baixo)
4. **valor_analisado** - Valor original da contingência
5. **valor_analisado_atualizado** - Valor atualizado monetariamente
6. **competencia** - Período de referência (AAAA-MM)
7. **data_criacao** - Data de início do processo
8. **categoria** - Tipo de ação (Trabalhista, Cível, Tributária, etc.)

### Campos Importantes (Monitoramento Mensal)
Campos relevantes mas que podem ter verificação menos frequente:

9. **polo** - Polo ativo/passivo
10. **data_encerramento** - Data de finalização
11. **data_acordo** - Data de acordo (se houver)
12. **tribunal** - Tribunal responsável
13. **instancia** - Instância processual
14. **fase_processual** - Fase atual do processo

### Campos Opcionais (Verificação Trimestral)
Campos informativos que não impactam análises críticas:

15. **objeto** - Descrição do objeto da ação
16. **advogado** - Advogado responsável
17. **data_atualizacao** - Última atualização do registro

## Estratégia de Arquivamento Mensal

### 1. Estrutura de Tabelas Mensais

#### Tabela Principal Mensal: `contingencias_AAAAMM`
```sql
CREATE TABLE contingencias_202501 (
    pasta TEXT PRIMARY KEY,
    situacao TEXT NOT NULL,
    risco TEXT NOT NULL,
    valor_analisado REAL,
    valor_analisado_atualizado REAL,
    competencia TEXT NOT NULL,
    data_criacao TEXT,
    categoria TEXT,
    -- Campos importantes
    polo TEXT,
    data_encerramento TEXT,
    data_acordo TEXT,
    tribunal TEXT,
    instancia TEXT,
    fase_processual TEXT,
    -- Metadados de controle
    data_processamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hash_registro TEXT
);
```

#### Tabela de Detalhes (Trimestral): `contingencias_detalhes_AAAAQQ`
```sql
CREATE TABLE contingencias_detalhes_2025Q1 (
    pasta TEXT PRIMARY KEY,
    objeto TEXT,
    advogado TEXT,
    data_atualizacao TEXT,
    observacoes TEXT,
    FOREIGN KEY (pasta) REFERENCES contingencias_202501(pasta)
);
```

### 2. Arquivos de Backup Mensais

#### Estrutura de Diretórios:
```
backup/
├── 2025/
│   ├── 01/
│   │   ├── contingencias_criticos_202501.csv
│   │   ├── contingencias_completo_202501.csv
│   │   └── metadados_202501.json
│   ├── 02/
│   └── ...
└── 2024/
    ├── 12/
    └── ...
```

#### Arquivo Crítico Mensal (contingencias_criticos_AAAAMM.csv):
```csv
pasta,situacao,risco,valor_analisado,valor_analisado_atualizado,competencia,data_criacao,categoria
```

#### Arquivo Completo Mensal (contingencias_completo_AAAAMM.csv):
Todos os 16 campos para backup completo.

#### Metadados (metadados_AAAAMM.json):
```json
{
    "periodo": "2025-01",
    "data_processamento": "2025-01-31T23:59:59",
    "total_registros": 1250,
    "registros_ativos": 980,
    "registros_encerrados": 270,
    "valor_total": 15750000.00,
    "hash_arquivo_criticos": "abc123...",
    "hash_arquivo_completo": "def456...",
    "arquivos_origem": ["01-2025.xlsx", "jan-2025.xlsx"]
}
```

### 3. Estratégia de Verificação

#### Verificação Mensal (Automática)
- Processar arquivos mm-aaaa do mês
- Validar campos críticos
- Gerar arquivo de backup crítico
- Atualizar tabela mensal
- Gerar relatório de inconsistências

#### Verificação Trimestral (Semi-automática)
- Consolidar dados de detalhes
- Verificar integridade referencial
- Gerar relatórios de tendências
- Backup completo trimestral

#### Verificação Anual (Manual)
- Auditoria completa dos dados
- Migração de dados antigos para arquivo
- Limpeza de registros obsoletos

### 4. Campos Dispensáveis para Monitoramento Contínuo

Para otimizar performance e reduzir overhead:

1. **objeto** - Texto longo, raramente usado em análises quantitativas
2. **advogado** - Informação administrativa, não crítica para análises financeiras
3. **data_atualizacao** - Metadado técnico, não impacta análises de negócio

### 5. Benefícios da Estratégia

1. **Performance**: Tabelas mensais menores e mais rápidas
2. **Manutenibilidade**: Separação clara entre dados críticos e opcionais
3. **Backup Eficiente**: Arquivos críticos leves para backup frequente
4. **Escalabilidade**: Estrutura preparada para crescimento dos dados
5. **Compliance**: Rastreabilidade completa com metadados
6. **Flexibilidade**: Verificação adaptável conforme necessidade do negócio

### 6. Implementação Recomendada

1. **Fase 1**: Implementar tabelas mensais para dados críticos
2. **Fase 2**: Criar sistema de backup automatizado
3. **Fase 3**: Implementar verificações automáticas
4. **Fase 4**: Otimizar com base em métricas de uso

### 7. Métricas de Monitoramento

- Tempo de processamento mensal
- Taxa de inconsistências detectadas
- Volume de dados por período
- Performance das consultas
- Utilização de espaço em disco

Esta estratégia garante eficiência operacional mantendo a integridade e disponibilidade dos dados críticos para análises de contingências.