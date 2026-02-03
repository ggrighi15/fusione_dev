from __future__ import annotations
from pydantic import BaseModel
from dotenv import load_dotenv
import os

class Settings(BaseModel):
    db_path: str
    sender_name: str
    sender_email: str
    reply_to: str | None = None
    cc_emails: str | None = None
    audit_bcc: str
    send_mode: str

    smtp_host: str | None = None
    smtp_port: int | None = None
    smtp_user: str | None = None
    smtp_pass: str | None = None
    smtp_tls: bool = True

    inbox_eml_dir: str
    recipients_csv: str
    retention_days: int = 365

def load_settings() -> Settings:
    load_dotenv()
    primary_name = os.getenv("FC_SENDER_PRIMARY_NAME") or os.getenv("FC_SENDER_NAME", "FusioneCore Circularizacao")
    primary_email = os.getenv("FC_SENDER_PRIMARY_EMAIL") or os.getenv("FC_SENDER_EMAIL", "")
    secondary_name = os.getenv("FC_SENDER_SECONDARY_NAME") or ""
    secondary_email = os.getenv("FC_SENDER_SECONDARY_EMAIL") or ""
    selected = (os.getenv("FC_SENDER_SELECTED") or "primary").lower()

    sender_name = primary_name
    sender_email = primary_email
    if selected == "secondary" and secondary_email:
        sender_name = secondary_name or sender_name
        sender_email = secondary_email

    return Settings(
        db_path=os.getenv("FC_DB_PATH", "./data/fc_circularizacao.db"),
        sender_name=sender_name,
        sender_email=sender_email,
        reply_to=os.getenv("FC_REPLY_TO") or None,
        cc_emails=os.getenv("FC_CC_EMAILS") or None,
        audit_bcc=os.getenv("FC_AUDIT_BCC", ""),
        send_mode=os.getenv("FC_SEND_MODE", "DRY_RUN").upper(),
        smtp_host=os.getenv("SMTP_HOST"),
        smtp_port=int(os.getenv("SMTP_PORT", "587")) if os.getenv("SMTP_PORT") else None,
        smtp_user=os.getenv("SMTP_USER"),
        smtp_pass=os.getenv("SMTP_PASS"),
        smtp_tls=(os.getenv("SMTP_TLS", "true").lower() == "true"),
        inbox_eml_dir=os.getenv("FC_INBOX_EML_DIR", "./data/inbox_eml"),
        recipients_csv=os.getenv("FC_RECIPIENTS_CSV", "./data/recipients.csv"),
        retention_days=int(os.getenv("FC_RETENTION_DAYS", "365")),
    )
