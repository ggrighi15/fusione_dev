# FusioneCore - Circularizacao (Kit Local)

## O que isso faz
- Cria ciclo trimestral (OPEN) e registra destinatarios (recipients.csv)
- Envia emails em 2 modos:
  - DRY_RUN: gera .eml para envio manual pelo Outlook
  - SMTP: envia via SMTP (se autorizado)
- Ingestao de respostas via .eml/.msg (inclusive lotes exportados)
- Dedupe por fingerprint (subject normalizado + hash body + hash anexos + escopo de recipient)
- Alertas de qualidade em `reconciliation_issue`:
  - `ZERO_DOCS_ALERT`
  - `DUPLICATE_MESSAGE`
- Report status (CSV + HTML)

## Setup rapido (padrao Aggregatto)
1) Copie `.env.example` -> `.env` e preencha os campos basicos.
2) Garanta arquivos em:
   - `./data/schema.sql`
   - `C:\Aggregatto\data\recipients.csv` (ou `./data/recipients.csv`)
   - `C:\Aggregatto\data\emails` para inbox de MSG/EML
3) Instale dependencias:
   - `python -m pip install -r requirements.txt`
4) Inicialize DB:
   - `python .\src\init_db.py`
5) Rode ciclo (envio):
   - `python .\src\run_cycle.py`
6) Ingerir respostas:
   - `python .\src\ingest_eml.py`
7) Gerar report:
   - `python .\src\report_status.py`

## Auditoria
- Envio: recomendado BCC fixo (`FC_AUDIT_BCC`)
- Evidencias: hashes + `raw_storage_ref` no banco

## Export do ciclo (pacote auditavel)

### Export padrao (com ZIP + verificacao)
```powershell
cd C:\Aggregatto\Core\fc_circularizacao
python .\src\export_cycle.py --zip --verify
```

### Dossie PDF (opcional)
Requer dependencias:
- reportlab
- pypdf2

```powershell
cd C:\Aggregatto\Core\fc_circularizacao
python .\src\export_cycle.py --zip --verify --pdf
```

### Saidas geradas
- `exports/circularizacao_<cycle_id>_<timestamp>/manifest.json` (SHA-256 por arquivo)
- `exports/circularizacao_<cycle_id>_<timestamp>/verify_report.json`
- `exports/circularizacao_<cycle_id>_<timestamp>.zip`
- `exports/circularizacao_<cycle_id>_<timestamp>/dossie_<cycle_id>.pdf` (se `--pdf`)

### Wrapper PowerShell
```powershell
cd C:\Aggregatto\Core\fc_circularizacao
.\fc_export_cycle.ps1
```

Com PDF:
```powershell
cd C:\Aggregatto\Core\fc_circularizacao
.\fc_export_cycle.ps1 -Pdf
```
