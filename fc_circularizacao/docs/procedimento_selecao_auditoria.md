# Procedimento de Seleção de Escritórios e Auditoria por Empresa

## Objetivo
Padronizar como definimos:
- quais escritórios serão circularizados;
- qual auditoria se aplica a cada empresa;
- quais e-mails de auditoria devem receber as respostas;
- como registrar dados completos quando não existirem no banco.

## 1) Disparo inicial para Contabilidade (por empresa)
Para cada empresa, enviar um e-mail específico para a contabilidade solicitando:
- **Auditoria aplicável** (ex.: MP, EY, etc.);
- **Período/Data‑base** (ex.: 31/12/2025);
- **Prazo de resposta** (ex.: 31/01/2026);
- **Data de início da auditoria Q1/2026** (ex.: 01/03/2026, quando aplicável);
- **E-mail de retorno das cartas** (destinatário da resposta dos escritórios);
- **E-mails dos auditores envolvidos** (separados por vírgula ou ponto‑e‑vírgula);
- **Lista de escritórios a circularizar** (com nome e e‑mail de contato);
- **Confirmação de que todos os processos ativos/pendentes do período estão na base**.

Se a empresa **não estiver cadastrada** ou os dados estiverem incompletos, o contador deve preencher **tudo** no retorno.

## 2) Cadastro/Atualização no Banco
Após receber o retorno da contabilidade:
- **Criar/atualizar** o cadastro da empresa;
- **Vincular auditoria** correta por empresa;
- **Registrar** o e‑mail de retorno de circularização;
- **Registrar** os e‑mails dos auditores (lista única, separados por vírgula/;);
- **Registrar** lista de escritórios autorizados para circularização;
- **Guardar histórico** se houver alteração (nunca perder).

Campos mínimos recomendados:
- Empresa
- Sigla
- Auditoria
- Data‑base
- Prazo de resposta
- Início auditoria Q1/2026 (se aplicável)
- E‑mail de retorno (circularização)
- E‑mails de auditores (lista)
- Escritórios (lista, com contato)

## 3) Seleção de Escritórios a Circularizar
A seleção deve respeitar:
- **Processos ativos/pendentes** dentro do período informado;
- **Escritórios com atuação no período**;
- **Validação com contabilidade** se houver dúvidas.

Regras:
- Se o escritório **não estiver na base**, cadastrar antes do envio;
- Se o escritório estiver na base, **confirmar e‑mail** e **escopo**;
- Caso haja divergência, registrar e solicitar ajuste ao contador.

## 4) Montagem do Lote de Circularização
Para cada empresa e auditoria:
- Gerar a lista final de destinatários (escritório + e‑mail);
- Vincular modelo de carta correto (MP ou EY);
- Inserir:
  - Data‑base do exercício;
  - Prazo de resposta;
  - E‑mail de retorno;
  - CC interno (quando aplicável);
  - Início da auditoria Q1/2026 (se aplicável).

## 5) Geração de Cartas e E-mails (pré‑envio)
- Gerar cartas com o assunto padrão e corpo correto por auditoria;
- Validar amostra (conteúdo e destinatários);
- Registrar no histórico antes do envio.

## 5.1) Carta de Representação
Quando aplicável, emitir a Carta de Representação usando o modelo padrão:
- `fc_circularizacao/docs/modelo_carta_representacao.md`

Preencher com:
- Empresa
- Data-base
- E-mail de retorno
- CC interno
- Responsável e cargo

## 6) Envio (simulado ou real)
- **Simulado (DRY_RUN):** gerar .eml e revisar;
- **Real:** SMTP/Graph, com cópia/auditoria se necessário.

## 7) Recebimento e Registro das Respostas
- Receber resposta no e‑mail de retorno definido pela contabilidade;
- Anexos devem ser vinculados aos processos;
- Registrar divergências e atualizar histórico;
- Nunca excluir o histórico de respostas.

## 8) Auditoria e Evidências
- Guardar logs de envio;
- Guardar hashes e anexos;
- Manter relatório por ciclo e por empresa.

---

## Checklist rápido (por empresa)
- Auditoria definida?
- Data‑base confirmada?
- Prazo de resposta definido?
- E‑mail de retorno definido?
- Lista de auditores (domínio ou e‑mails) informada?
- Lista de escritórios confirmada?
- Base de processos validada?

