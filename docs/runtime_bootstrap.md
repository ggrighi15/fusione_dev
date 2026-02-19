# Runtime Bootstrap (Python 3.11)

## Objective
Run the backend with a deterministic local setup and smoke validation.

## Preconditions
- Python 3.11 installed (`py -0p` should list `-V:3.11`).
- Redis available at `redis://127.0.0.1:6379/0` for local tasks.
- Work from the repo root.

## Setup
```powershell
cd C:\fusionecore-suite.clean
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -U pip
pip install -r requirements.txt
pip check
```

## Minimal `.env` for local boot
```dotenv
DATABASE_URL=sqlite:///./fusionecore_local.db
REDIS_URL=redis://127.0.0.1:6379/0
SECRET_KEY=local-dev-secret
ENABLE_OCR_IA=false
```

Optional LLM mock settings for endpoint smoke:
```dotenv
LLM_GATEWAY_ENABLED=true
LLM_GATEWAY_MOCK_MODE=true
LLM_REQUIRE_TRUSTED_IDENTITY=false
LLM_ALLOW_BODY_IDENTITY_FALLBACK=true
```

## Apply DB migrations
```powershell
python scripts\apply_db_migrations.py
```

## Start API
```powershell
python -m uvicorn fc_core.api.main:app --host 0.0.0.0 --port 8000
```

## Smoke checks
```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/openapi.json
```

Optional LLM chat smoke (mock mode):
```powershell
$payload = @{
  prompt = "teste de bootstrap"
  user_id = "dev-user"
  team_id = "dev-team"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/llm/chat `
  -ContentType "application/json" `
  -Body $payload
```

## Notes
- `ENABLE_OCR_IA=false` keeps API boot independent from optional OCR ingestion modules.
- For production-like deployments, keep `AUTO_CREATE_SCHEMA_ON_STARTUP=false` and rely on explicit migrations.
