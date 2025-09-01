# 📊 Instruções para Importar Dados de Contingências no Power BI

## 🎯 Arquivos Disponíveis

### 1. **Banco de Dados SQLite**
- **Localização**: `G:\Meu Drive\fusione\historico_contencioso.db`
- **Tabelas Principais**:
  - `fato_contingencias` - Dados principais (18 campos)
  - `vw_contingencias_ativo` - View de contingências ativas
  - `vw_contingencias_ano` - View agrupada por ano
  - `arquivo_controle` - Controle de processamento

### 2. **Arquivo de Conexão Power Query**
- **Localização**: `config\PowerBI_Contingencias_Connection.pq`
- **Uso**: Script pronto para importação otimizada

## 🚀 Método 1: Importação Direta (Recomendado)

### Passo a Passo:

1. **Abra o Power BI Desktop**

2. **Obter Dados**:
   - Clique em "Obter Dados" → "Mais"
   - Procure por "SQLite" na lista de conectores
   - Selecione "Banco de dados SQLite"

3. **Conectar ao Banco**:
   - Navegue até: `G:\Meu Drive\fusione\historico_contencioso.db`
   - Clique em "Abrir"

4. **Selecionar Tabelas**:
   - Marque `fato_contingencias` (tabela principal)
   - Opcionalmente: `vw_contingencias_ativo`, `vw_contingencias_ano`
   - Clique em "Transformar Dados" para ajustes

5. **Configurar Tipos de Dados** (no Editor do Power Query):
   ```
   pasta: Texto
   situacao: Texto
   categoria: Texto
   polo: Texto
   risco: Texto
   valor_analisado: Número Decimal
   valor_analisado_atualizado: Número Decimal
   competencia: Texto (formato YYYY-MM)
   objeto: Texto
   data_criacao: Data
   data_encerramento: Data
   data_acordo: Data
   data_atualizacao: Data
   advogado: Texto
   tribunal: Texto
   instancia: Texto
   fase_processual: Texto
   ```

6. **Fechar e Aplicar**

## 🔧 Método 2: Usando Script Power Query

### Passo a Passo:

1. **Abra o Power BI Desktop**

2. **Editor do Power Query**:
   - "Obter Dados" → "Consulta em Branco"
   - No Editor do Power Query, clique em "Editor Avançado"

3. **Copiar Script**:
   - Abra o arquivo `PowerBI_Contingencias_Connection.pq`
   - Copie todo o conteúdo
   - Cole no Editor Avançado do Power BI
   - Clique em "Concluído"

4. **Verificar Conexão**:
   - Certifique-se que o caminho do banco está correto
   - Ajuste se necessário: `G:\Meu Drive\fusione\historico_contencioso.db`

5. **Fechar e Aplicar**

## 📈 Campos Disponíveis para Análise

### 🔍 **Dimensões**:
- **pasta** - Identificador único do processo
- **categoria** - Tipo de contingência
- **polo** - Ativo/Passivo
- **situacao** - Status atual
- **risco** - Nível de risco (Provável, Possível, Remoto)
- **advogado** - Responsável pelo caso
- **tribunal** - Instância judicial
- **instancia** - Grau da instância
- **fase_processual** - Fase atual do processo

### 📊 **Métricas**:
- **valor_analisado** - Valor original
- **valor_analisado_atualizado** - Valor atualizado

### 📅 **Dimensões Temporais**:
- **competencia** - Período de referência (YYYY-MM)
- **data_criacao** - Data de criação do processo
- **data_encerramento** - Data de encerramento
- **data_acordo** - Data do acordo
- **data_atualizacao** - Última atualização

## 🎨 Sugestões de Visualizações

### 📊 **Dashboards Recomendados**:

1. **Visão Executiva**:
   - Cartões: Total de processos, Valor total, Processos ativos
   - Gráfico de linha: Evolução mensal por competência
   - Gráfico de pizza: Distribuição por categoria

2. **Análise de Risco**:
   - Matriz: Risco vs Categoria
   - Gráfico de barras: Valor por nível de risco
   - Tabela: Top 10 processos por valor

3. **Acompanhamento Temporal**:
   - Gráfico de linha: Criação vs Encerramento por mês
   - Funil: Processos por fase processual
   - Heatmap: Atividade por advogado/mês

### 🔧 **Medidas DAX Sugeridas**:

```dax
// Valor Total Atualizado
Valor Total = SUM(fato_contingencias[valor_analisado_atualizado])

// Processos Ativos
Processos Ativos = CALCULATE(COUNT(fato_contingencias[pasta]), fato_contingencias[situacao] <> "Encerrado")

// Variação de Valor
Variação Valor = SUM(fato_contingencias[valor_analisado_atualizado]) - SUM(fato_contingencias[valor_analisado])

// Processos por Risco
Processos Alto Risco = CALCULATE(COUNT(fato_contingencias[pasta]), fato_contingencias[risco] = "Provável")
```

## ⚡ Dicas de Performance

1. **Filtros de Data**: Use sempre filtros de competência para limitar o volume de dados
2. **Relacionamentos**: Crie tabelas de dimensão se necessário
3. **Atualização**: Configure atualização automática para sincronizar com o script Python
4. **Índices**: O banco já possui índices otimizados para consultas rápidas

## 🔄 Atualização de Dados

O script Python otimizado processa apenas:
- ✅ Arquivos com padrão mm-aaaa
- ✅ Arquivos modificados (carregamento incremental)
- ✅ 18 campos mapeados automaticamente

Para atualizar no Power BI:
1. Execute o script Python: `python config\load_contingencias.py`
2. No Power BI: "Página Inicial" → "Atualizar"

---

**📁 Localização dos Arquivos:**
- Banco: `G:\Meu Drive\fusione\historico_contencioso.db`
- Script: `config\load_contingencias.py`
- Conexão: `config\PowerBI_Contingencias_Connection.pq`