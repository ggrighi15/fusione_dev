from __future__ import annotations

import json
import re
import sqlite3
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def strip_accents(text: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFKD", text) if not unicodedata.combining(ch))


def normalize_spaces(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def normalize_text(text: str) -> str:
    return normalize_spaces(strip_accents(text).upper())


def digits_only(value: str) -> str:
    return "".join(ch for ch in (value or "") if ch.isdigit())


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def normalize_phone(phone: str) -> str:
    d = digits_only(phone)
    return d


def normalize_cep(cep: str) -> str:
    d = digits_only(cep)
    return d[:8]


def detect_doc_type(doc: str) -> str:
    if len(doc) == 11:
        return "CPF"
    if len(doc) == 14:
        return "CNPJ"
    return "UNKNOWN"


def _cpf_valid(doc: str) -> bool:
    if len(doc) != 11 or len(set(doc)) == 1:
        return False
    weights1 = [10, 9, 8, 7, 6, 5, 4, 3, 2]
    total1 = sum(int(d) * w for d, w in zip(doc[:9], weights1))
    d1 = 11 - (total1 % 11)
    d1 = 0 if d1 >= 10 else d1
    weights2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]
    total2 = sum(int(d) * w for d, w in zip(doc[:10], weights2))
    d2 = 11 - (total2 % 11)
    d2 = 0 if d2 >= 10 else d2
    return doc[-2:] == f"{d1}{d2}"


def _cnpj_valid(doc: str) -> bool:
    if len(doc) != 14 or len(set(doc)) == 1:
        return False
    w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    t1 = sum(int(d) * w for d, w in zip(doc[:12], w1))
    d1 = 11 - (t1 % 11)
    d1 = 0 if d1 >= 10 else d1
    t2 = sum(int(d) * w for d, w in zip(doc[:13], w2))
    d2 = 11 - (t2 % 11)
    d2 = 0 if d2 >= 10 else d2
    return doc[-2:] == f"{d1}{d2}"


def validate_document(doc: str, doc_type: str) -> bool:
    if doc_type == "CPF":
        return _cpf_valid(doc)
    if doc_type == "CNPJ":
        return _cnpj_valid(doc)
    return False


@dataclass
class PipelineStats:
    pessoas_normalizadas: int = 0
    ncm_sugeridos: int = 0
    pendencias_ncm: int = 0


def ensure_schema(conn: sqlite3.Connection) -> None:
    schema_path = Path(__file__).with_name("schema.sql")
    conn.executescript(schema_path.read_text(encoding="utf-8"))
    conn.commit()


def _upsert_normalized_person(conn: sqlite3.Connection, row: sqlite3.Row) -> None:
    nome_norm = normalize_text(row["nome_raw"] or "")
    doc_norm = digits_only(row["documento_raw"] or "")
    doc_type = detect_doc_type(doc_norm)
    doc_valid = 1 if validate_document(doc_norm, doc_type) else 0
    email_norm = normalize_email(row["email_raw"] or "")
    telefone_norm = normalize_phone(row["telefone_raw"] or "")
    endereco_norm = normalize_text(row["endereco_raw"] or "")
    cidade_norm = normalize_text(row["cidade_raw"] or "")
    uf_norm = normalize_text(row["uf_raw"] or "")[:2]
    cep_norm = normalize_cep(row["cep_raw"] or "")

    dedupe_parts = [doc_norm or "", email_norm or "", nome_norm or "", telefone_norm or "", cep_norm or ""]
    dedupe_key = "|".join(dedupe_parts)
    if not dedupe_key.replace("|", ""):
        dedupe_key = "|".join(
            [
                normalize_text(row["source_system"] or ""),
                normalize_text(row["external_id"] or ""),
                "FALLBACK",
            ]
        )
    ts = now_iso()

    existing = conn.execute(
        """
        SELECT person_id
        FROM cadastro_normalizado_pessoas
        WHERE dedupe_key=?
        ORDER BY updated_at DESC, person_id DESC
        LIMIT 1
        """,
        (dedupe_key,),
    ).fetchone()

    if existing:
        conn.execute(
            """
            UPDATE cadastro_normalizado_pessoas
            SET source_system=?,
                external_id=?,
                nome_norm=?,
                documento_norm=?,
                documento_tipo=?,
                documento_valido=?,
                email_norm=?,
                telefone_norm=?,
                endereco_norm=?,
                cidade_norm=?,
                uf_norm=?,
                cep_norm=?,
                updated_at=?
            WHERE person_id=?
            """,
            (
                row["source_system"],
                row["external_id"],
                nome_norm,
                doc_norm,
                doc_type,
                doc_valid,
                email_norm,
                telefone_norm,
                endereco_norm,
                cidade_norm,
                uf_norm,
                cep_norm,
                ts,
                existing["person_id"],
            ),
        )
        return

    conn.execute(
        """
        INSERT INTO cadastro_normalizado_pessoas (
            source_system, external_id, nome_norm, documento_norm, documento_tipo, documento_valido,
            email_norm, telefone_norm, endereco_norm, cidade_norm, uf_norm, cep_norm, dedupe_key,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            row["source_system"],
            row["external_id"],
            nome_norm,
            doc_norm,
            doc_type,
            doc_valid,
            email_norm,
            telefone_norm,
            endereco_norm,
            cidade_norm,
            uf_norm,
            cep_norm,
            dedupe_key,
            ts,
            ts,
        ),
    )


def _suggest_ncm(conn: sqlite3.Connection, item: sqlite3.Row) -> tuple[Optional[str], float, str]:
    desc = normalize_text(item["descricao_raw"] or "")
    sku_norm = normalize_text(item["sku_raw"] or "")

    if item["ncm_raw"]:
        ncm_digits = digits_only(item["ncm_raw"])
        if len(ncm_digits) == 8:
            return ncm_digits, 1.0, "ncm_raw_valid"

    cur = conn.execute("SELECT ncm_code, keywords FROM fiscal_ncm_catalog WHERE active=1")
    best_code = None
    best_score = 0.0
    best_reason = "no_match"

    for ncm_code, keywords in cur.fetchall():
        kws = [normalize_text(k) for k in (keywords or "").split(",") if k.strip()]
        if not kws:
            continue
        hits = sum(1 for k in kws if k and k in desc)
        if hits <= 0:
            continue
        score = min(0.95, 0.4 + 0.1 * hits)
        if sku_norm and any(k in sku_norm for k in kws):
            score = min(0.98, score + 0.05)
        if score > best_score:
            best_score = score
            best_code = ncm_code
            best_reason = f"keyword_hits:{hits}"

    return best_code, best_score, best_reason


def run_batch_pipeline(conn: sqlite3.Connection) -> PipelineStats:
    conn.row_factory = sqlite3.Row
    stats = PipelineStats()

    pessoas = conn.execute(
        "SELECT source_system, external_id, nome_raw, documento_raw, email_raw, telefone_raw, endereco_raw, cidade_raw, uf_raw, cep_raw "
        "FROM cadastro_staging_pessoas"
    ).fetchall()

    for row in pessoas:
        _upsert_normalized_person(conn, row)
        stats.pessoas_normalizadas += 1

    itens = conn.execute(
        "SELECT item_staging_id, sku_raw, descricao_raw, ncm_raw FROM fiscal_item_staging"
    ).fetchall()

    for item in itens:
        ncm_code, score, reason = _suggest_ncm(conn, item)
        if ncm_code:
            conn.execute(
                """
                INSERT INTO fiscal_item_ncm_suggestion (
                    item_staging_id, sku_norm, ncm_suggested, score, rationale, status, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item["item_staging_id"],
                    normalize_text(item["sku_raw"] or ""),
                    ncm_code,
                    score,
                    reason,
                    "PENDING",
                    now_iso(),
                ),
            )
            stats.ncm_sugeridos += 1
        else:
            stats.pendencias_ncm += 1
            conn.execute(
                """
                INSERT INTO cadastro_change_log (
                    entity_type, entity_key, field_name, old_value, new_value, reason, rule_id, changed_by, changed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "fiscal_item",
                    str(item["item_staging_id"]),
                    "ncm_suggested",
                    item["ncm_raw"] or "",
                    "",
                    "No deterministic match in catalog",
                    "NCM_SUGGEST_001",
                    "batch_pipeline",
                    now_iso(),
                ),
            )

    conn.commit()
    return stats


def export_pending_report(conn: sqlite3.Connection, output_path: Path) -> None:
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        """
        SELECT i.item_staging_id, i.sku_raw, i.descricao_raw, i.ncm_raw
        FROM fiscal_item_staging i
        LEFT JOIN fiscal_item_ncm_suggestion s ON s.item_staging_id = i.item_staging_id
        WHERE s.item_staging_id IS NULL
        ORDER BY i.item_staging_id
        """
    ).fetchall()

    payload = {
        "generated_at": now_iso(),
        "pending_items": [dict(r) for r in rows],
        "count": len(rows),
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
