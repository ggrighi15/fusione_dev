# FusioneCore - Circularizacao (Kit Local)

## O que isso faz
- Cria ciclo trimestral (OPEN) e registra destinatarios (recipients.csv)
- Envia emails em 2 modos:
  - DRY_RUN: gera .eml para envio manual pelo Outlook
  - SMTP: envia via SMTP (se autorizado)
- Ingestao de respostas via .eml exportado
- Report status (CSV + HTML)

## Setup rapido
1) Copie .env.example -> .env e preencha os campos basicos
   - Use FC_SENDER_SELECTED=primary|secondary para escolher o remetente
   - Opcional: FC_REPLY_TO e FC_CC_EMAILS
2) Crie venv e instale deps:
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
3) Inicialize DB:
   python .\src\init_db.py
4) Rode ciclo (envio):
   python .\src\run_cycle.py
5) Exporte respostas do Outlook para ./data/inbox_eml (formato .eml) e rode:
   python .\src\ingest_eml.py
6) Gere report:
   python .\src\report_status.py

## Auditoria
- Envio: recomendado BCC fixo (FC_AUDIT_BCC)
- Evidencias: hashes + raw_storage_ref no banco

## Export do ciclo (pacote auditavel)

### Export padrao (com ZIP + verificacao)
```powershell
cd C:\fusionecore-suite\fc_circularizacao
python .\src\export_cycle.py --zip --verify
```

### Dossie PDF (opcional)
Requer dependencias:
- reportlab
- pypdf2

```powershell
cd C:\fusionecore-suite\fc_circularizacao
python .\src\export_cycle.py --zip --verify --pdf
```

### Saidas geradas
- exports/circularizacao_<cycle_id>_<timestamp>/manifest.json (SHA-256 por arquivo)
- exports/circularizacao_<cycle_id>_<timestamp>/verify_report.json
- exports/circularizacao_<cycle_id>_<timestamp>.zip (fora do diretorio exportado)
- exports/circularizacao_<cycle_id>_<timestamp>/dossie_<cycle_id>.pdf (se --pdf)

### Evidencias do ultimo export
- exports/LAST_EXPORT.json
- logs/audit_exports/

### Wrapper PowerShell
```powershell
cd C:\fusionecore-suite\fc_circularizacao
.\fc_export_cycle.ps1
```

Com PDF:
```powershell
cd C:\fusionecore-suite\fc_circularizacao
.\fc_export_cycle.ps1 -Pdf
```

Ultima validacao: 2026-02-03 (PASS) | Comando: .\fc_export_cycle.ps1
