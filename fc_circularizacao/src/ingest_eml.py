from __future__ import annotations
from email import policy
from email.parser import BytesParser
from email.utils import getaddresses
from pathlib import Path
from fc_circularize.settings import load_settings
from fc_circularize.db import db_session
from fc_circularize.util import new_id, now_iso, sha256_bytes, sha256_text
from typing import List, Tuple, Iterable
import os

try:
    import extract_msg
except Exception:
    extract_msg = None

def parse_eml(path: Path):
    msg = BytesParser(policy=policy.default).parsebytes(path.read_bytes())
    subject = str(msg.get("subject",""))
    from_ = str(msg.get("from",""))
    to_ = str(msg.get("to",""))
    cc_ = str(msg.get("cc",""))
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            disp = str(part.get("content-disposition",""))
            if ctype == "text/plain" and "attachment" not in disp.lower():
                body = part.get_content()
                break
    else:
        body = msg.get_content()
    attachments = []
    for part in msg.iter_attachments():
        filename = part.get_filename() or "attachment.bin"
        data = part.get_payload(decode=True) or b""
        attachments.append((filename, data, part.get_content_type()))
    return subject, from_, to_, cc_, body, attachments

def parse_msg(path: Path):
    if extract_msg is None:
        raise RuntimeError("extract_msg nao instalado. Rode: pip install extract-msg")
    msg = extract_msg.Message(str(path))
    subject = msg.subject or ""
    from_ = msg.sender or ""
    to_ = msg.to or ""
    cc_ = msg.cc or ""
    body = msg.body or ""
    attachments = []
    for att in msg.attachments:
        try:
            data = att.data
        except Exception:
            data = b""
        filename = att.longFilename or att.shortFilename or "attachment.bin"
        mime = getattr(att, "mimetype", None) or "application/octet-stream"
        attachments.append((filename, data, mime))
    return subject, from_, to_, cc_, body, attachments

def normalize_subject(subject: str) -> str:
    s = subject.strip()
    while True:
        upper = s.upper()
        if upper.startswith("RE:"):
            s = s[3:].strip()
            continue
        if upper.startswith("FW:"):
            s = s[3:].strip()
            continue
        if upper.startswith("FWD:"):
            s = s[4:].strip()
            continue
        if upper.startswith("ENC:"):
            s = s[4:].strip()
            continue
        if upper.startswith("RES:"):
            s = s[4:].strip()
            continue
        if upper.startswith("RES_"):
            s = s[4:].strip()
            continue
        if upper.startswith("ENC_"):
            s = s[4:].strip()
            continue
        if upper.startswith("FW_"):
            s = s[3:].strip()
            continue
        if upper.startswith("FWD_"):
            s = s[4:].strip()
            continue
        break
    return s

def extract_emails(value: str) -> List[str]:
    if not value:
        return []
    emails = []
    for _, addr in getaddresses([value]):
        if addr:
            emails.append(addr.strip().lower())
    return emails

def recipient_key_from_email(email: str) -> str:
    local = email.split("@")[0] if "@" in email else email
    key = "".join(ch for ch in local if ch.isalnum() or ch in ("_", "-"))
    return key.upper() if key else "UNKNOWN"

def main():
    s = load_settings()
    inbox = Path(s.inbox_eml_dir)
    inbox.mkdir(parents=True, exist_ok=True)

    emls = sorted(inbox.glob("*.eml"))
    msgs = sorted(inbox.glob("*.msg"))
    if not emls and not msgs:
        print(f"Nenhum .eml/.msg encontrado em {inbox}")
        return

    with db_session(s.db_path) as conn:
        # pega o ciclo aberto mais recente
        row = conn.execute(
            "SELECT cycle_id FROM circularization_cycle WHERE status='OPEN' ORDER BY opened_at DESC LIMIT 1"
        ).fetchone()
        if not row:
            raise RuntimeError("Nao existe ciclo OPEN. Rode run_cycle.py primeiro.")
        cycle_id = row["cycle_id"]

        # index simples: emails de destinatarios cadastrados no ciclo
        recipients = conn.execute(
            "SELECT recipient_id, email, recipient_key, cliente, escritorio, owner, escopo FROM circularization_recipient WHERE cycle_id=?",
            (cycle_id,)
        ).fetchall()
        email_to_recipient = {r["email"].strip().lower(): r["recipient_id"] for r in recipients}
        subject_to_recipient = {}
        out_rows = conn.execute(
            "SELECT recipient_id, subject FROM circularization_message WHERE cycle_id=? AND direction='OUT'",
            (cycle_id,)
        ).fetchall()
        for r in out_rows:
            key = normalize_subject(r["subject"] or "")
            if key and key not in subject_to_recipient:
                subject_to_recipient[key] = r["recipient_id"]

        known_senders = set(
            e.strip().lower()
            for e in [s.sender_email, os.getenv("FC_SENDER_PRIMARY_EMAIL"), os.getenv("FC_SENDER_SECONDARY_EMAIL")]
            if e
        )
        extra_known = os.getenv("FC_KNOWN_SENDERS", "")
        for addr in extra_known.split(","):
            addr = addr.strip().lower()
            if addr:
                known_senders.add(addr)

        for p in emls + msgs:
            existing = conn.execute(
                "SELECT 1 FROM circularization_message WHERE cycle_id=? AND raw_storage_ref=? LIMIT 1",
                (cycle_id, str(p))
            ).fetchone()
            if existing:
                continue
            if p.suffix.lower() == ".eml":
                subject, from_, to_, cc_, body, attachments = parse_eml(p)
            else:
                subject, from_, to_, cc_, body, attachments = parse_msg(p)

            from_email = extract_emails(from_)[0] if extract_emails(from_) else ""
            to_emails = extract_emails(to_)
            cc_emails = extract_emails(cc_)

            normalized_subject = normalize_subject(subject)
            direction = "OUT" if from_email in known_senders else "IN"

            recipient_id = None
            if direction == "OUT":
                for addr in to_emails + cc_emails:
                    recipient_id = email_to_recipient.get(addr)
                    if recipient_id:
                        break
            else:
                if from_email:
                    recipient_id = email_to_recipient.get(from_email)

            if not recipient_id and normalized_subject:
                recipient_id = subject_to_recipient.get(normalized_subject)

            if not recipient_id:
                # cria destinatario automaticamente usando email disponível
                auto_email = from_email if direction == "IN" else (to_emails[0] if to_emails else "")
                if auto_email:
                    recipient_id = new_id("rcp")
                    auto_key = recipient_key_from_email(auto_email)
                    conn.execute(
                        """INSERT OR IGNORE INTO circularization_recipient
                           (recipient_id, cycle_id, recipient_key, cliente, escritorio, email, owner, escopo, status, last_event_at, notes)
                           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                        (
                            recipient_id,
                            cycle_id,
                            auto_key,
                            "UNKNOWN",
                            "UNKNOWN",
                            auto_email,
                            "UNKNOWN",
                            "UNKNOWN",
                            "PREPARADO",
                            now_iso(),
                            f"auto-created from {direction} message ({p.name})",
                        ),
                    )
                    # if insert was ignored, fetch existing recipient_id
                    row = conn.execute(
                        "SELECT recipient_id FROM circularization_recipient WHERE cycle_id=? AND recipient_key=? LIMIT 1",
                        (cycle_id, auto_key),
                    ).fetchone()
                    if row:
                        recipient_id = row["recipient_id"]
                    email_to_recipient[auto_email] = recipient_id
                else:
                    # sem email para vincular, registra issue e segue
                    issue_id = new_id("iss")
                    fallback_recipient = recipients[0]["recipient_id"] if recipients else new_id("rcp")
                    conn.execute(
                        """INSERT INTO reconciliation_issue
                           (issue_id, cycle_id, recipient_id, severity, code, description, created_at)
                           VALUES (?,?,?,?,?,?,?)""",
                        (issue_id, cycle_id, fallback_recipient, "MED", "UNMATCHED",
                         f"Mensagem sem destinatario identificavel: {p.name}", now_iso())
                    )
                    continue

            msg_id = new_id("msg")
            event_at = now_iso()
            if direction == "OUT":
                conn.execute(
                    """INSERT INTO circularization_message
                       (msg_id, cycle_id, recipient_id, direction, provider_message_id, subject, sent_at, hash_body, raw_storage_ref, confidence)
                       VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    (msg_id, cycle_id, recipient_id, "OUT", None, subject, event_at, sha256_text(body), str(p), 0.98)
                )
            else:
                conn.execute(
                    """INSERT INTO circularization_message
                       (msg_id, cycle_id, recipient_id, direction, provider_message_id, subject, received_at, hash_body, raw_storage_ref, confidence)
                       VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    (msg_id, cycle_id, recipient_id, "IN", None, subject, event_at, sha256_text(body), str(p), 0.98)
                )

            # anexos: salvar em data/attachments/<msg_id>/
            att_dir = Path("./data/attachments") / msg_id
            att_dir.mkdir(parents=True, exist_ok=True)

            for filename, data, mime in attachments:
                out_path = att_dir / filename
                out_path.write_bytes(data or b"")
                att_id = new_id("att")
                conn.execute(
                    """INSERT INTO circularization_attachment
                       (att_id, msg_id, filename, sha256, storage_path, mime, pages, text_extracted)
                       VALUES (?,?,?,?,?,?,NULL,0)""",
                    (att_id, msg_id, filename, sha256_bytes(data or b""), str(out_path), mime)
                )

            new_status = "ENVIADO" if direction == "OUT" else "RESPONDIDO"
            conn.execute(
                "UPDATE circularization_recipient SET status=?, last_event_at=? WHERE recipient_id=?",
                (new_status, event_at, recipient_id)
            )

    print(f"OK: ingeridos {len(emls) + len(msgs)} arquivos em ciclo OPEN")

if __name__ == "__main__":
    main()
