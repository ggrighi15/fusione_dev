# FusioneCore - Automação Mestre de Desenvolvimento

Versão: 2.0  
Data: 2026-02-17

## Visão Geral

Este documento consolida automações de desenvolvimento para:
- Git workflow padronizado
- CI consolidado
- Execução local guiada por CLI
- Apoio com assistentes de IA

## Componentes principais

1. CLI unificada:
- `scripts/fusionecore-dev.ps1`

2. Scripts Git:
- `scripts/new-feature.ps1`
- `scripts/new-hotfix.ps1`
- `scripts/new-release.ps1`
- `scripts/finish-feature.ps1`

3. Workflows GitHub:
- `.github/workflows/ci.yml`
- `.github/workflows/fusione_git_workflow.yml`

4. Guias:
- `docs/git-workflow-automation-script.md`
- `docs/branch_protection_checklist.md`
- `docs/fusionecore-standards.md`

## Comandos rápidos (CLI unificada)

```powershell
# ajuda
.\scripts\fusionecore-dev.ps1 help

# criar feature (dry-run)
.\scripts\fusionecore-dev.ps1 feature create dashboard-analytics "Dashboard de métricas"

# criar feature (execução real)
.\scripts\fusionecore-dev.ps1 feature create dashboard-analytics "Dashboard de métricas" -Apply

# hotfix/release
.\scripts\fusionecore-dev.ps1 feature hotfix auth-login "Correção urgente" -Apply
.\scripts\fusionecore-dev.ps1 feature release v1.2.3 "Janela de release" -Apply

# commit padronizado
.\scripts\fusionecore-dev.ps1 commit "ajustar validação de ticket" --type fix -Apply

# testes e lint
.\scripts\fusionecore-dev.ps1 test all
.\scripts\fusionecore-dev.ps1 lint
```

## Modo seguro

- Comandos mutantes da CLI usam preview sem `-Apply`.
- `-Apply` é obrigatório para efetivar ações de escrita.

## Fluxo recomendado

1. Criar branch com `feature create` / `feature hotfix` / `feature release`.
2. Implementar incrementalmente.
3. Rodar testes.
4. Commit/push.
5. Abrir/atualizar PR.
6. Merge após checks e review.

## Integração com IA

Use o prompt em:
- `docs/fusionecore-context-script.md`

E aplique os padrões em:
- `docs/fusionecore-standards.md`
