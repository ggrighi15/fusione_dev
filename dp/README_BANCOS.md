# Configuracao dos Bancos de Dados Fusione
# Gerado automaticamente em 08/31/2025 05:45:58

## Bancos Criados:
- **fusione_core.db** (0 KB): Banco principal do sistema
- **fusione_pessoas.db** (0 KB): Modulo de pessoas e contatos
- **fusione_contencioso.db** (0 KB): Modulo de processos judiciais
- **fusione_contratos.db** (0 KB): Modulo de contratos
- **fusione_procuracoes.db** (0 KB): Modulo de procuracoes
- **fusione_societario.db** (0 KB): Modulo societario
- **fusione_marcas.db** (0 KB): Modulo de marcas e patentes
- **historico_contencioso.db** (0 KB): Dados historicos de contingencias

## Como Conectar:

### Power BI
1. Obter Dados > Mais > Banco de Dados > SQLite
2. Selecionar o arquivo .db desejado
3. Escolher as tabelas necessarias

### DB Browser for SQLite
1. Arquivo > Abrir Banco de Dados
2. Selecionar o arquivo .db
3. Navegar pelas tabelas na aba "Estrutura do Banco de Dados"

### Aplicacoes
- String de conexao: Data Source=caminho/para/banco.db
- Driver: SQLite

## Estrutura dos Modulos:

- **fusione_core.db**: Usuarios, perfis, sessoes, auditoria
- **fusione_pessoas.db**: Pessoas fisicas/juridicas, enderecos, contatos
- **fusione_contencioso.db**: Processos, audiencias, prazos, custas
- **fusione_contratos.db**: Contratos, clausulas, partes
- **fusione_procuracoes.db**: Procuracoes, substabelecimentos
- **fusione_societario.db**: Empresas, socios, participacoes
- **fusione_marcas.db**: Marcas, patentes, prazos PI
- **historico_contencioso.db**: Dados historicos de contingencias

## Backup e Manutencao:

- Fazer backup regular dos arquivos .db
- Usar VACUUM periodicamente para otimizar
- Monitorar tamanho dos bancos

---
*Fusione Core System - 2025-08-31 05:45:58*
