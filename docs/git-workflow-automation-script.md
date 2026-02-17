# Git Workflow Automation (FusioneCore)

Data: 2026-02-17  
Escopo: automacao de branches e PR com seguranca operacional.

## Arquivos

- `scripts/new-feature.ps1`
- `scripts/new-hotfix.ps1`
- `scripts/new-release.ps1`
- `scripts/finish-feature.ps1`
- `.github/workflows/fusione_git_workflow.yml`
- `.github/workflows/ci.yml`

## Principios adotados

- Operacao segura por padrao (`dry-run`).
- Execucao real somente com `-Apply`.
- Sem `git push --force`.
- Sem comandos destrutivos implicitos.

## 1) Criar nova feature

Exemplo com execucao real:

```powershell
cd c:\fusionecore-suite
.\scripts\new-feature.ps1 `
  -FeatureName "dashboard-analytics" `
  -Description "Adicionar dashboard com metricas em tempo real" `
  -Type feature `
  -BaseBranch develop `
  -Apply `
  -CreatePr `
  -DraftPr
```

O script:

1. valida repo/git;
2. atualiza `develop`;
3. cria branch `feature/dashboard-analytics`;
4. cria documento `docs/features/dashboard-analytics.md`;
5. faz push da branch;
6. opcionalmente cria PR via `gh`.

## 2) Criar hotfix e release

Hotfix (base `main`):

```powershell
cd c:\fusionecore-suite
.\scripts\new-hotfix.ps1 `
  -HotfixName "auth-login" `
  -Description "Correcao urgente de login" `
  -Apply `
  -CreatePr `
  -DraftPr
```

Release (base `develop`):

```powershell
cd c:\fusionecore-suite
.\scripts\new-release.ps1 `
  -Version "v1.2.3" `
  -Description "Janela de release da sprint" `
  -Apply `
  -CreatePr `
  -DraftPr
```

## 3) Finalizar feature (merge em develop)

```powershell
cd c:\fusionecore-suite
.\scripts\finish-feature.ps1 `
  -FeatureName "feature/dashboard-analytics" `
  -BaseBranch develop `
  -Apply `
  -ReadyPr
```

Opcoes adicionais:

- `-DeleteLocalBranch`
- `-DeleteRemoteBranch`

## 4) Workflow manual no GitHub Actions

Workflow: `.github/workflows/fusione_git_workflow.yml`

Inputs:

- `tipo`: `feature | hotfix | release`
- `nome`: nome sem prefixo
- `descricao`: resumo
- `apply`: `false` por default (dry-run)
- `create_pr`: `true` por default
- `draft_pr`: `true` por default

Outputs:

- `branch_name`
- `pr_url` (vazio quando nao houver PR)

## 5) Modo dry-run (recomendado antes)

```powershell
.\scripts\new-feature.ps1 -FeatureName "exemplo"
.\scripts\new-hotfix.ps1 -HotfixName "auth-login"
.\scripts\new-release.ps1 -Version "v1.2.3"
.\scripts\finish-feature.ps1 -FeatureName "feature/exemplo"
```

## 6) Conventional Commits (referencia)

- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `test:`
- `chore:`

Exemplos:

```text
feat(dashboard): adicionar grafico de analytics em tempo real
fix(realtime): corrigir reconexao SSE apos ticket expirado
docs(git): adicionar guia de automacao de workflow
```

## 7) Prompt para ChatGPT/Gemini/Copilot

Use este prompt-base para gerar comandos consistentes:

```text
Voce e assistente de Git Workflow do FusioneCore.
Sempre responda com:
1) nome de branch sugerido
2) comandos git completos
3) mensagem de commit em Conventional Commits
4) checklist rapido de validacao

Contexto:
- Repo local: c:\\fusionecore-suite
- Fluxo: feature/* -> develop -> main
- Nunca usar push --force sem autorizacao explicita
- Priorizar comandos seguros e reversiveis
```

## 8) Branch protection (checklist pronto)

Branch `main`:

- Require a pull request before merging
- Required approvals: 1
- Dismiss stale pull request approvals
- Require conversation resolution before merge
- Require pull request reviews.
- Require status checks to pass:
  - `FusionCore CI / guardrails`
  - `FusionCore CI / python-tests`
  - `FusionCore CI / ui-react-tests`
- Require branches to be up to date.
- Restrict force pushes.
- Restrict deletions.
- Include administrators.

Branch `develop`:

- Mesmas regras de PR/review de `main`
- Required approvals: 1
- Mesmos status checks do `FusionCore CI`
- Require branches to be up to date
- Restrict force pushes/deletions
- Include administrators

## 9) CI canônico

Workflow oficial para PR/push:

- `.github/workflows/ci.yml`

Checks esperados:

- `guardrails`
- `python-tests`
- `ui-react-tests`
