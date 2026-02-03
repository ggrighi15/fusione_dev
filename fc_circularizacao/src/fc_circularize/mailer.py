from __future__ import annotations
import re
import smtplib
from datetime import datetime, timezone
from email import policy
from email.message import EmailMessage
from email.utils import make_msgid
from pathlib import Path
from fc_circularize.util import sha256_text, new_id, now_iso

def build_message(
    sender_name: str,
    sender_email: str,
    to_email: str,
    bcc_email: str,
    subject: str,
    body: str,
    reply_to: str | None = None,
    cc_emails: str | None = None,
) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = to_email
    if cc_emails:
        msg["Cc"] = cc_emails
    if bcc_email:
        msg["Bcc"] = bcc_email
    if reply_to:
        msg["Reply-To"] = reply_to
    msg["Subject"] = subject
    msg.set_content(body)
    return msg

def save_eml_before_smtp(msg: EmailMessage, out_dir: Path, filename_prefix: str = "outbound") -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    if not msg.get("Message-ID"):
        msg["Message-ID"] = make_msgid()
    raw_id = msg["Message-ID"]
    safe_id = re.sub(r"[^A-Za-z0-9._-]+", "_", raw_id)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    eml_path = out_dir / f"{filename_prefix}_{ts}_{safe_id}.eml"
    eml_path.write_bytes(msg.as_bytes(policy=policy.SMTP))
    return eml_path

def send_email_smtp(msg: EmailMessage, host: str, port: int, user: str, password: str, tls: bool = True) -> str:
    # Retorna um provider_message_id "simulado" (SMTP nao garante id padrao)
    with smtplib.SMTP(host, port, timeout=60) as server:
        server.ehlo()
        if tls:
            server.starttls()
            server.ehlo()
        server.login(user, password)
        server.send_message(msg)
    return new_id("smtp")

def save_eml_outbox(msg: EmailMessage, out_dir: str) -> str:
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    fname = f"{now_iso().replace(':','-')}_{new_id('out')}.eml"
    fpath = Path(out_dir) / fname
    fpath.write_bytes(bytes(msg))
    return str(fpath)

def body_hash(body: str) -> str:
    return sha256_text(body)
