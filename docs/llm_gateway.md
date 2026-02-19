# FusioneCore LLM Gateway (API interna)

## Endpoint

- `POST /llm/chat`

## O que o gateway faz

- Loga todas as chamadas em `llm_gateway_logs`:
  - `user_id`, `team_id`, `case_id`, `process_id`
  - `prompt_masked`, `response_text`
  - `request_hash`, `created_at`
  - `estimated_input_tokens`, `estimated_output_tokens`, `estimated_cost_usd`
  - `provider`, `model`, `route_reason`, `latency_ms`, `status`, `error_message`
- Aplica politica:
  - limites por usuario e por time (janela de 1h)
  - mascaramento de dados sensiveis no prompt
  - retencao automatica dos logs (dias configuraveis)
- Roteia provedor por regra:
  - confidencialidade, urgencia, custo, override explicito

## Migracao obrigatoria (DDL)

As migrations SQL ficam em:

- `fc_core/db/migrations/postgresql`
- `fc_core/db/migrations/mysql`
- `fc_core/db/migrations/sqlite`

Aplicar migrations:

```bash
python scripts/apply_db_migrations.py
```

Opcional com URL explicita:

```bash
python scripts/apply_db_migrations.py --database-url "sqlite:///./fusionecore.db"
```

Subida da API (sem `create_all` implicito):

```bash
python -m uvicorn fc_core.api.main:app --host 0.0.0.0 --port 8000
```

## Payload minimo

```json
{
  "user_id": "gustavo",
  "team_id": "juridico",
  "case_id": "CASE-2026-001",
  "process_id": "5001234-12.2025.8.21.0001",
  "prompt": "Resuma os principais riscos do processo e sugestao de proximo passo.",
  "confidentiality": "high",
  "urgency": "normal",
  "prefer_low_cost": false
}
```

## cURL

```bash
curl -X POST "http://127.0.0.1:8000/llm/chat" \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"Explique o status do caso\"}"
```

## Identidade confiavel (rate limit real)

Padrao:

- JWT via `Authorization: Bearer <token>` (claim `sub` vira `user_id`).

Fallback opcional para integracao interna:

- `X-User-Id`
- `X-Team-Id`
- `X-Identity-Timestamp` (epoch segundos)
- `X-Identity-Signature` (HMAC SHA256 de `user_id|team_id|timestamp`)

Esse fallback exige `LLM_INTERNAL_IDENTITY_SECRET`.
Assinatura esperada: `HMAC_SHA256(secret, METHOD|PATH|user_id|team_id|timestamp)`.
No endpoint atual: `POST|/llm/chat|...`.
Reuso da mesma assinatura na janela de skew e rejeitado (proteção anti-replay best-effort).

Gerar headers assinados:

```bash
python scripts/sign_identity_header.py --user-id svc-backend --team-id juridico --secret <SECRET>
```

## Variaveis de ambiente

Obrigatorias de infra (ja existentes):

- `DATABASE_URL`
- `REDIS_URL`
- `SECRET_KEY`

Novas do gateway:

- `LLM_GATEWAY_ENABLED=true`
- `LLM_GATEWAY_MOCK_MODE=false` (use `true` para smoke/CI sem provedor externo)
- `LLM_GATEWAY_TIMEOUT_SECONDS=60`
- `LLM_LOG_RETENTION_DAYS=30`
- `LLM_RATE_LIMIT_USER_PER_HOUR=60`
- `LLM_RATE_LIMIT_TEAM_PER_HOUR=600`
- `LLM_DEFAULT_PROVIDER=openai`
- `LLM_URGENCY_PROVIDER_ORDER=openai,azure,local`
- `LLM_REQUIRE_TRUSTED_IDENTITY=true`
- `LLM_ALLOW_BODY_IDENTITY_FALLBACK=false`
- `LLM_INTERNAL_IDENTITY_SECRET=`
- `LLM_INTERNAL_IDENTITY_MAX_SKEW_SECONDS=300`

OpenAI:

- `LLM_OPENAI_API_KEY=...`
- `LLM_OPENAI_BASE_URL=https://api.openai.com`
- `LLM_OPENAI_MODEL=gpt-4o-mini`

Azure OpenAI:

- `LLM_AZURE_API_KEY=...`
- `LLM_AZURE_ENDPOINT=https://<resource>.openai.azure.com`
- `LLM_AZURE_DEPLOYMENT=<deployment>`
- `LLM_AZURE_API_VERSION=2024-10-21`

Local (OpenAI-compatible):

- `LLM_LOCAL_BASE_URL=http://127.0.0.1:11434`
- `LLM_LOCAL_API_KEY=` (opcional)
- `LLM_LOCAL_MODEL=llama3.1`

## VS Code extension

Uma extensao minima ja foi adicionada em:

- `tools/vscode-fc-gateway-extension/package.json`
- `tools/vscode-fc-gateway-extension/extension.js`
- `tools/vscode-fc-gateway-extension/README.md`

Ela envia o texto selecionado (ou prompt manual) para `POST /llm/chat`.

## Smoke test

Script pronto:

- `tools/fc_llm_gateway_smoke.ps1`

Execucao:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Aggregatto\Core\tools\fc_llm_gateway_smoke.ps1 `
  -Root C:\Aggregatto\Core `
  -HostUrl http://127.0.0.1:8000 `
  -PayloadPath C:\Aggregatto\Core\docs\llm_gateway_payload.json
```
