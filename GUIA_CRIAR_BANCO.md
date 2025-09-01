# Guia para Criar Banco de Dados de Contingências

Como o Python não está instalado no sistema, você pode criar o banco de dados manualmente usando o DB Browser for SQLite que já está aberto.

## Passos para Criar o Banco:

### 1. Criar Novo Banco de Dados
1. No DB Browser, clique em **"New Database"** (Novo Banco de Dados)
2. Salve como: `historico_contencioso.db` na pasta `C:\Users\Gustavo_ri\fusione-core-system\`

### 2. Executar Script SQL
1. Vá para a aba **"Execute SQL"** (Executar SQL)
2. Copie e cole o conteúdo do arquivo `create_sample_db.sql`
3. Clique em **"Execute"** (Executar) ou pressione F5

### 3. Verificar Criação
Após executar o script, você deve ver:
- Tabela `fato_contingencias` com 8 registros de exemplo
- Tabela `arquivo_controle` com 8 registros de controle
- Índices criados para performance

## Dados de Exemplo Incluídos:

### Campos na tabela `fato_contingencias`:
- **Identificação**: numero_processo, tipo_acao, status_processo
- **Valores**: valor_causa, valor_deposito, valor_acordo
- **Datas**: data_criacao, data_encerramento, data_acordo, data_atualizacao
- **Metadados**: advogado, tribunal, instancia, fase_processual
- **Controle**: data_processamento, arquivo_origem

### Tipos de Ação Incluídos:
- Ação Trabalhista
- Ação Cível
- Ação Previdenciária
- Ação Tributária
- Ação Ambiental

### Status dos Processos:
- Em Andamento
- Encerrado
- Suspenso
- Arquivado

## Após Criar o Banco:

1. **Salve o projeto** no DB Browser
2. **Feche o DB Browser**
3. **Abra o Power BI** e conecte ao banco `historico_contencioso.db`

## Conectar no Power BI:

1. No Power BI Desktop, clique em **"Obter Dados"**
2. Procure por **"SQLite"** ou vá em **"Banco de dados" > "Banco de dados SQLite"**
3. Navegue até: `C:\Users\Gustavo_ri\fusione-core-system\historico_contencioso.db`
4. Selecione a tabela **`fato_contingencias`**
5. Clique em **"Carregar"**

## Campos Recomendados para Dashboards:

### Métricas Principais:
- Valor Total das Causas
- Valor Total dos Depósitos
- Valor Total dos Acordos
- Quantidade de Processos por Status

### Dimensões para Filtros:
- Tribunal
- Advogado
- Tipo de Ação
- Status do Processo
- Fase Processual
- Ano/Mês (baseado em data_criacao)

### Visualizações Sugeridas:
- Gráfico de barras: Processos por Tribunal
- Gráfico de pizza: Distribuição por Status
- Linha do tempo: Evolução mensal dos processos
- Tabela: Detalhes dos processos em andamento
- Cartões: KPIs principais (total de processos, valores, etc.)

Após seguir estes passos, você terá um banco funcional para testar a integração com o Power BI!