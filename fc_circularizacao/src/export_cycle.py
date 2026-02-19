from __future__ import annotations
import argparse
import hashlib
import json
import os
import shutil
import sqlite3
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fc_circularize.settings import load_settings
from fc_circularize.db import db_session
from fc_circularize.util import now_iso

MANIFEST_SCHEMA_VERSION = "1.1"
HASH_CHUNK_SIZE = 1024 * 1024


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(HASH_CHUNK_SIZE)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def collect_export_files(export_dir: Path, exclude_names: set[str] | None = None) -> list[Path]:
    exclude_names = exclude_names or set()
    files: list[Path] = []
    for p in export_dir.rglob("*"):
        if p.is_file() and p.name not in exclude_names:
            files.append(p)
    return sorted(files, key=lambda x: x.as_posix())


def make_zip_bundle(export_dir: Path, zip_path: Path, exclude_names: set[str] | None = None) -> None:
    exclude_names = exclude_names or set()
    export_dir = export_dir.resolve()
    zip_path = zip_path.resolve()
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for p in export_dir.rglob("*"):
            if not p.is_file():
                continue
            if p.name in exclude_names:
                continue
            arcname = p.relative_to(export_dir).as_posix()
            zf.write(p, arcname=arcname)


def _is_windows() -> bool:
    return os.name == "nt"


def _to_extended_path(path: Path) -> str:
    p = str(path.resolve())
    if not _is_windows():
        return p
    if p.startswith("\\\\?\\"):
        return p
    if p.startswith("\\\\"):
        return "\\\\?\\UNC\\" + p[2:]
    return "\\\\?\\" + p


def copytree_longpath_dest(src: Path, dst: Path) -> None:
    src = src.resolve()
    dst = dst.resolve()
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        target_root = dst if rel == "." else (dst / rel)
        os.makedirs(_to_extended_path(Path(target_root)), exist_ok=True)
        for name in files:
            s = Path(root) / name
            d = Path(target_root) / name
            shutil.copy2(str(s), _to_extended_path(d))


def _bytes_human(n: int) -> str:
    units = ["B", "KB", "MB", "GB", "TB"]
    x = float(n)
    for u in units:
        if x < 1024.0 or u == units[-1]:
            return f"{x:.1f} {u}" if u != "B" else f"{int(x)} B"
        x /= 1024.0
    return f"{n} B"


def _sha_short(s: str, k: int = 12) -> str:
    return (s or "")[:k]


def _format_missing_line(item: dict) -> str:
    kind = item.get("type") or item.get("kind") or "missing"
    parts = [kind]
    for key in ("msg_id", "att_id", "raw_storage_ref", "storage_path"):
        if key in item and item.get(key):
            parts.append(f"{key}:{item.get(key)}")
    return " | ".join(parts)


def build_dossier_summary_pdf(
    export_dir: Path,
    manifest: dict,
    verify_report: Optional[dict],
    out_pdf: Path,
) -> dict:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import cm
        from reportlab.pdfgen import canvas
    except Exception as exc:
        raise RuntimeError("Dependencia ausente: reportlab. Rode: pip install reportlab") from exc

    out_pdf.parent.mkdir(parents=True, exist_ok=True)

    c = canvas.Canvas(str(out_pdf), pagesize=A4)
    w, h = A4

    def header(title: str):
        c.setFont("Helvetica-Bold", 14)
        c.drawString(2 * cm, h - 2 * cm, title)
        c.setLineWidth(1)
        c.line(2 * cm, h - 2.2 * cm, w - 2 * cm, h - 2.2 * cm)

    def kv(y: float, k: str, v: str):
        c.setFont("Helvetica-Bold", 10)
        c.drawString(2 * cm, y, k)
        c.setFont("Helvetica", 10)
        c.drawString(6 * cm, y, v)

    header("Dossie de Circularizacao (Export Auditavel)")
    y = h - 3.2 * cm

    s = manifest.get("summary", {})
    cycle_id = manifest.get("cycle_id", "")
    created = manifest.get("created_at_utc", "")
    num_files = int(s.get("num_files", 0))
    total_bytes = int(s.get("total_bytes", 0))
    missing_count = int(s.get("missing_count", 0))

    kv(y, "cycle_id:", cycle_id); y -= 0.6 * cm
    kv(y, "created_at_utc:", created); y -= 0.6 * cm
    kv(y, "num_files:", str(num_files)); y -= 0.6 * cm
    kv(y, "total_bytes:", _bytes_human(total_bytes)); y -= 0.6 * cm
    kv(y, "missing_count:", str(missing_count)); y -= 0.6 * cm

    if verify_report:
        kv(y, "verify_status:", str(verify_report.get("status"))); y -= 0.6 * cm
        kv(y, "checked_files_ok:", str(verify_report.get("checked_files_ok"))); y -= 0.6 * cm
        kv(y, "mismatches:", str(len(verify_report.get("mismatches", [])))); y -= 0.6 * cm
        kv(y, "missing_files:", str(len(verify_report.get("missing_files", [])))); y -= 0.6 * cm
    else:
        kv(y, "verify_status:", "N/A (verify_report ausente)"); y -= 0.6 * cm

    artifacts = manifest.get("artifacts") or {}
    if "zip" in artifacts:
        z = artifacts["zip"]
        kv(y, "zip:", f'{z.get("path","")}  sha:{_sha_short(z.get("sha256",""))}'); y -= 0.6 * cm
    c.showPage()

    header("Pendencias (missing)")
    y = h - 3.2 * cm
    missing = manifest.get("missing", []) or []
    if not missing:
        c.setFont("Helvetica", 11)
        c.drawString(2 * cm, y, "Nenhuma pendencia declarada no manifest.")
        y -= 0.8 * cm
    else:
        c.setFont("Helvetica", 10)
        for item in missing[:80]:
            line = _format_missing_line(item)
            c.drawString(2 * cm, y, line[:120])
            y -= 0.5 * cm
            if y < 2 * cm:
                c.showPage()
                header("Pendencias (missing) - continuacao")
                y = h - 3.2 * cm
    c.showPage()

    header("Inventario de Arquivos (path / size / sha256)")
    y = h - 3.2 * cm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(2 * cm, y, "path")
    c.drawString(13 * cm, y, "size")
    c.drawString(16 * cm, y, "sha256")
    y -= 0.6 * cm

    c.setFont("Helvetica", 8)
    files = manifest.get("files", []) or []
    for entry in files:
        path = entry.get("path", "")
        size = int(entry.get("size", 0))
        sha = entry.get("sha256", "")

        p1 = path[:90]
        c.drawString(2 * cm, y, p1)
        c.drawRightString(15.5 * cm, y, _bytes_human(size))
        c.drawString(16 * cm, y, _sha_short(sha, 16))
        y -= 0.45 * cm

        if len(path) > 90:
            c.drawString(2 * cm, y, "  " + path[90:180])
            y -= 0.45 * cm

        if y < 2 * cm:
            c.showPage()
            header("Inventario - continuacao")
            y = h - 3.2 * cm
            c.setFont("Helvetica", 8)

    c.save()
    return {"generated": True}


def merge_pdfs_into_dossier(summary_pdf: Path, export_dir: Path, out_pdf: Path) -> dict:
    try:
        from PyPDF2 import PdfReader, PdfWriter
    except Exception as exc:
        raise RuntimeError("Dependencia ausente: PyPDF2. Rode: pip install pypdf2") from exc

    writer = PdfWriter()

    reader = PdfReader(str(summary_pdf))
    for page in reader.pages:
        writer.add_page(page)

    pdfs = []
    for p in export_dir.rglob("*.pdf"):
        if p.resolve() in {summary_pdf.resolve(), out_pdf.resolve()}:
            continue
        pdfs.append(p)
    pdfs = sorted(pdfs, key=lambda x: x.as_posix())

    skipped = []
    appended = 0
    for p in pdfs:
        try:
            r = PdfReader(str(p))
            if getattr(r, "is_encrypted", False):
                skipped.append({"path": p.relative_to(export_dir).as_posix(), "reason": "encrypted_pdf"})
                continue
            for page in r.pages:
                writer.add_page(page)
            appended += 1
        except Exception as exc:
            skipped.append({"path": p.relative_to(export_dir).as_posix(), "reason": f"read_error:{type(exc).__name__}"})

    out_pdf.parent.mkdir(parents=True, exist_ok=True)
    with out_pdf.open("wb") as f:
        writer.write(f)

    return {"pdfs_appended": appended, "pdfs_skipped": skipped}


def _timestamp_slug() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def write_audit_exports(
    base_dir: Path,
    export_root: Path,
    manifest: dict,
    verify_report: Optional[dict],
    zip_path: Optional[Path],
) -> None:
    pdf_artifact = (manifest.get("artifacts") or {}).get("pdf") if isinstance(manifest.get("artifacts"), dict) else None
    pdf_info = None
    if isinstance(pdf_artifact, dict):
        pdf_info = {
            "path": pdf_artifact.get("path"),
            "size": pdf_artifact.get("size"),
            "sha256": (pdf_artifact.get("sha256") or "").lower() if pdf_artifact.get("sha256") else None,
            "merge": pdf_artifact.get("merge"),
            "pdfs_appended": pdf_artifact.get("pdfs_appended"),
            "pdfs_skipped": pdf_artifact.get("pdfs_skipped"),
        }

    last_path = export_root.parent / "LAST_EXPORT.json"
    last_payload = {
        "timestamp_utc": utc_now_iso(),
        "cycle_id": manifest.get("cycle_id"),
        "export_dir": str(export_root),
        "manifest_path": str(export_root / "manifest.json"),
        "verify_report": str(export_root / "verify_report.json") if verify_report else None,
        "zip_path": str(zip_path) if zip_path else None,
        "zip_sha256": (manifest.get("artifacts") or {}).get("zip", {}).get("sha256"),
        "verify_status": verify_report.get("status") if verify_report else "N/A",
        "checked_files_ok": verify_report.get("checked_files_ok") if verify_report else None,
        "missing_files": len(verify_report.get("missing_files", [])) if verify_report else None,
        "mismatches": len(verify_report.get("mismatches", [])) if verify_report else None,
        "missing_count": manifest.get("summary", {}).get("missing_count"),
        "python_version": sys.version.split()[0],
        "python_executable": sys.executable,
        "pdf": pdf_info,
    }
    write_json(last_path, last_payload)

    logs_dir = base_dir / "logs" / "audit_exports"
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_path = logs_dir / f"export_{_timestamp_slug()}.md"
    pdf_lines = []
    if pdf_info:
        pdf_lines = [
            "",
            "## PDF Dossie",
            f"- path: {pdf_info.get('path')}",
            f"- sha256: {pdf_info.get('sha256')}",
            f"- merge: {pdf_info.get('merge')}",
            f"- pdfs_appended: {pdf_info.get('pdfs_appended')}",
            f"- pdfs_skipped: {json.dumps(pdf_info.get('pdfs_skipped'), ensure_ascii=False)}",
        ]
    lines = [
        f"Data (UTC): {last_payload['timestamp_utc']}",
        f"Cycle: {last_payload['cycle_id']}",
        f"Export dir: {last_payload['export_dir']}",
        f"ZIP: {last_payload['zip_path']}",
        f"ZIP SHA-256: {last_payload['zip_sha256']}",
        f"VERIFY: {last_payload['verify_status']}",
        f"- ok_files: {last_payload['checked_files_ok']}",
        f"- missing_files: {last_payload['missing_files']}",
        f"- mismatches: {last_payload['mismatches']}",
        "MANIFEST:",
        f"- num_files: {manifest.get('summary', {}).get('num_files')}",
        f"- missing_count: {manifest.get('summary', {}).get('missing_count')}",
        f"Env: python {last_payload['python_version']} | exe: {last_payload['python_executable']}",
    ]
    lines.extend(pdf_lines)
    log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_manifest(export_dir: Path, cycle_id: str, command: str, missing: list[dict]) -> dict:
    exclude = {"manifest.json", "verify_report.json"}
    files = collect_export_files(export_dir, exclude_names=exclude)

    file_entries: list[dict] = []
    total_bytes = 0
    for p in files:
        rel = p.relative_to(export_dir).as_posix()
        size = p.stat().st_size
        total_bytes += size
        file_entries.append(
            {
                "path": rel,
                "size": size,
                "sha256": sha256_file(p),
            }
        )

    return {
        "schema_version": MANIFEST_SCHEMA_VERSION,
        "cycle_id": cycle_id,
        "created_at_utc": utc_now_iso(),
        "command": command,
        "summary": {
            "num_files": len(file_entries),
            "total_bytes": total_bytes,
            "missing_count": len(missing),
        },
        "missing": missing,
        "files": sorted(file_entries, key=lambda x: x["path"]),
        "artifacts": {},
    }


def verify_export_from_manifest(export_dir: Path, manifest: dict) -> dict:
    started = utc_now_iso()
    export_dir = export_dir.resolve()

    mismatches: list[dict] = []
    missing_files: list[dict] = []
    checked = 0

    for entry in manifest.get("files", []):
        rel = entry["path"]
        expected_size = entry["size"]
        expected_sha = entry["sha256"]

        target = export_dir / Path(rel)
        if not target.exists():
            missing_files.append({"path": rel, "reason": "file_missing_on_disk"})
            continue

        actual_size = target.stat().st_size
        if actual_size != expected_size:
            mismatches.append(
                {
                    "path": rel,
                    "kind": "size_mismatch",
                    "expected": expected_size,
                    "actual": actual_size,
                }
            )
            continue

        actual_sha = sha256_file(target)
        if actual_sha != expected_sha:
            mismatches.append(
                {
                    "path": rel,
                    "kind": "sha256_mismatch",
                    "expected": expected_sha,
                    "actual": actual_sha,
                }
            )
            continue

        checked += 1

    artifacts = manifest.get("artifacts") or {}
    zip_info = artifacts.get("zip")
    zip_checked = False
    if isinstance(zip_info, dict) and zip_info.get("path"):
        zip_path = (export_dir.parent / zip_info["path"]).resolve()
        zip_checked = True
        if not zip_path.exists():
            missing_files.append({"path": zip_info["path"], "reason": "zip_missing_on_disk"})
        else:
            expected_zip_size = zip_info.get("size")
            expected_zip_sha = zip_info.get("sha256")

            if expected_zip_size is not None and zip_path.stat().st_size != expected_zip_size:
                mismatches.append(
                    {
                        "path": zip_info["path"],
                        "kind": "zip_size_mismatch",
                        "expected": expected_zip_size,
                        "actual": zip_path.stat().st_size,
                    }
                )
            else:
                if expected_zip_sha:
                    actual_zip_sha = sha256_file(zip_path)
                    if actual_zip_sha != expected_zip_sha:
                        mismatches.append(
                            {
                                "path": zip_info["path"],
                                "kind": "zip_sha256_mismatch",
                                "expected": expected_zip_sha,
                                "actual": actual_zip_sha,
                            }
                        )

    status = "PASS" if (not mismatches and not missing_files) else "FAIL"
    return {
        "schema_version": "1.0",
        "started_at_utc": started,
        "finished_at_utc": utc_now_iso(),
        "status": status,
        "checked_files_ok": checked,
        "missing_files": missing_files,
        "mismatches": mismatches,
        "zip_checked": zip_checked,
        "missing_declared_in_manifest": manifest.get("summary", {}).get("missing_count", 0),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Exporta um pacote completo do ciclo de circularizacao (docs, emails, anexos, relatorios, db)."
    )
    parser.add_argument("--cycle-id", help="ID do ciclo. Padrao: mais recente.")
    parser.add_argument("--out-dir", default="./exports", help="Diretorio base para exportacao.")
    parser.add_argument("--filled-dir", help="Pasta filled_* especifica para incluir.")
    parser.add_argument("--no-docs", action="store_true", help="Nao copiar /docs.")
    parser.add_argument("--no-filled", action="store_true", help="Nao copiar /outputs/filled_*.")
    parser.add_argument("--no-emails", action="store_true", help="Nao copiar emails (.eml/.msg).")
    parser.add_argument("--no-attachments", action="store_true", help="Nao copiar anexos extraidos.")
    parser.add_argument("--no-reports", action="store_true", help="Nao gerar/copiar relatorios.")
    parser.add_argument("--include-all-reports", action="store_true", help="Copiar tudo de /outputs/reports.")
    parser.add_argument("--include-db-full", action="store_true", help="Copiar o banco completo alem do recorte.")
    parser.add_argument("--zip", action="store_true", help="Compacta o pacote exportado em .zip.")
    parser.add_argument("--verify", action="store_true", help="Verifica integridade (size + sha256) do export.")
    parser.add_argument("--pdf", action="store_true", help="Gera um dossie PDF do export (resumo+inventario+merge de PDFs).")
    parser.add_argument("--pdf-no-merge", action="store_true", help="Gera PDF apenas com resumo/inventario (nao anexa PDFs).")
    return parser.parse_args()


def resolve_existing(path_str: str, base_dir: Path) -> Path | None:
    if not path_str:
        return None
    lower = path_str.lower()
    if not (lower.endswith(".eml") or lower.endswith(".msg")):
        return None
    p = Path(path_str)
    if p.is_absolute() and p.exists():
        return p
    candidates = [
        base_dir / path_str,
        base_dir / path_str.lstrip("./\\"),
    ]
    for cand in candidates:
        try:
            if cand.exists():
                return cand.resolve()
        except Exception:
            continue
    return None


def safe_copy(src: Path, dest_dir: Path, preferred_name: str | None = None) -> Path:
    dest_dir.mkdir(parents=True, exist_ok=True)
    name = preferred_name or src.name
    name = Path(name).name or src.name
    dest = dest_dir / name
    if dest.exists():
        if dest.stat().st_size == src.stat().st_size:
            return dest
        dest = dest_dir / f"{dest.stem}_{src.stat().st_size}{dest.suffix}"
    shutil.copy2(src, dest)
    return dest


def find_latest_filled(outputs_dir: Path) -> Path | None:
    candidates = [p for p in outputs_dir.glob("filled_*") if p.is_dir()]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


def write_status_reports(out_dir: Path, cycle: dict, recipients: list[dict]) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    cycle_id = cycle["cycle_id"]
    csv_path = out_dir / f"status_{cycle_id}.csv"
    html_path = out_dir / f"status_{cycle_id}.html"

    rows = sorted(recipients, key=lambda r: (r.get("cliente") or ""))
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        f.write("recipient_key,cliente,escritorio,email,owner,escopo,status,last_event_at,next_action_at,notes\n")
        for r in rows:
            values = [
                r.get("recipient_key", ""),
                r.get("cliente", ""),
                r.get("escritorio", ""),
                r.get("email", ""),
                r.get("owner", ""),
                r.get("escopo", ""),
                r.get("status", ""),
                r.get("last_event_at", "") or "",
                r.get("next_action_at", "") or "",
                (r.get("notes", "") or "").replace("\n", " ").replace("\r", " "),
            ]
            escaped = [str(v).replace('"', '""') for v in values]
            f.write(",".join(f'"{v}"' for v in escaped) + "\n")

    html = []
    html.append(f"<h2>Status Circularizacao {cycle['quarter']}/{cycle['year']}</h2>")
    html.append(f"<p>Ciclo: {cycle_id} | Gerado em: {now_iso()}</p>")
    html.append("<table border='1' cellpadding='6' cellspacing='0'>")
    html.append("<tr><th>Cliente</th><th>Escritorio</th><th>Email</th><th>Status</th><th>Ultimo Evento</th></tr>")
    for r in rows:
        html.append(
            "<tr>"
            f"<td>{r.get('cliente','')}</td>"
            f"<td>{r.get('escritorio','')}</td>"
            f"<td>{r.get('email','')}</td>"
            f"<td>{r.get('status','')}</td>"
            f"<td>{r.get('last_event_at','') or ''}</td>"
            "</tr>"
        )
    html.append("</table>")
    html_path.write_text("\n".join(html), encoding="utf-8")
    return csv_path, html_path


def export_subset_db(
    export_db_path: Path,
    schema_path: Path,
    cycle: dict,
    recipients: list[dict],
    messages: list[dict],
    attachments: list[dict],
    audit_dispatch: list[dict],
    issues: list[dict],
    raw_ref_map: dict[str, str | None],
    att_path_map: dict[str, str | None],
) -> None:
    export_db_path.parent.mkdir(parents=True, exist_ok=True)
    if export_db_path.exists():
        export_db_path.unlink()
    schema_sql = schema_path.read_text(encoding="utf-8")
    conn = sqlite3.connect(str(export_db_path))
    try:
        conn.executescript(schema_sql)
        conn.execute(
            "INSERT INTO circularization_cycle (cycle_id, year, quarter, opened_at, closed_at, status) VALUES (?,?,?,?,?,?)",
            (
                cycle["cycle_id"],
                cycle["year"],
                cycle["quarter"],
                cycle["opened_at"],
                cycle.get("closed_at"),
                cycle["status"],
            ),
        )
        for r in recipients:
            conn.execute(
                """INSERT INTO circularization_recipient
                   (recipient_id, cycle_id, recipient_key, cliente, escritorio, email, owner, escopo, status, last_event_at, next_action_at, notes)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    r["recipient_id"],
                    r["cycle_id"],
                    r["recipient_key"],
                    r["cliente"],
                    r["escritorio"],
                    r["email"],
                    r["owner"],
                    r["escopo"],
                    r["status"],
                    r.get("last_event_at"),
                    r.get("next_action_at"),
                    r.get("notes"),
                ),
            )
        for m in messages:
            raw_ref = raw_ref_map.get(m["msg_id"])
            conn.execute(
                """INSERT INTO circularization_message
                   (msg_id, cycle_id, recipient_id, direction, provider_message_id, subject, sent_at, received_at, hash_body, raw_storage_ref, confidence)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    m["msg_id"],
                    m["cycle_id"],
                    m["recipient_id"],
                    m["direction"],
                    m.get("provider_message_id"),
                    m["subject"],
                    m.get("sent_at"),
                    m.get("received_at"),
                    m["hash_body"],
                    raw_ref or "",
                    m.get("confidence", 1.0),
                ),
            )
        for a in attachments:
            storage_path = att_path_map.get(a["att_id"])
            conn.execute(
                """INSERT INTO circularization_attachment
                   (att_id, msg_id, filename, sha256, storage_path, mime, pages, text_extracted)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (
                    a["att_id"],
                    a["msg_id"],
                    a["filename"],
                    a["sha256"],
                    storage_path or "",
                    a.get("mime"),
                    a.get("pages"),
                    a.get("text_extracted", 0),
                ),
            )
        for ad in audit_dispatch:
            conn.execute(
                """INSERT INTO circularization_audit_dispatch
                   (audit_id, msg_id, audit_copy_method, audit_delivered_at, audit_delivery_ok, failure_reason)
                   VALUES (?,?,?,?,?,?)""",
                (
                    ad["audit_id"],
                    ad["msg_id"],
                    ad["audit_copy_method"],
                    ad.get("audit_delivered_at"),
                    ad.get("audit_delivery_ok", 0),
                    ad.get("failure_reason"),
                ),
            )
        for issue in issues:
            conn.execute(
                """INSERT INTO reconciliation_issue
                   (issue_id, cycle_id, recipient_id, severity, code, description, created_at, resolved_at, resolved_by)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    issue["issue_id"],
                    issue["cycle_id"],
                    issue["recipient_id"],
                    issue["severity"],
                    issue["code"],
                    issue["description"],
                    issue["created_at"],
                    issue.get("resolved_at"),
                    issue.get("resolved_by"),
                ),
            )
        conn.commit()
    finally:
        conn.close()


def main() -> None:
    args = parse_args()

    base_dir = Path(__file__).resolve().parents[1]
    os.chdir(base_dir)

    settings = load_settings()
    db_path = Path(settings.db_path)
    if not db_path.is_absolute():
        db_path = (base_dir / db_path).resolve()
    if not db_path.exists():
        raise FileNotFoundError(f"DB nao encontrado: {db_path}")

    with db_session(str(db_path)) as conn:
        if args.cycle_id:
            cycle_row = conn.execute(
                "SELECT cycle_id, year, quarter, opened_at, closed_at, status FROM circularization_cycle WHERE cycle_id=?",
                (args.cycle_id,),
            ).fetchone()
        else:
            cycle_row = conn.execute(
                "SELECT cycle_id, year, quarter, opened_at, closed_at, status FROM circularization_cycle ORDER BY opened_at DESC LIMIT 1"
            ).fetchone()
        if not cycle_row:
            raise RuntimeError("Nenhum ciclo encontrado.")
        cycle = dict(cycle_row)
        cycle_id = cycle["cycle_id"]

        recipients = [dict(r) for r in conn.execute(
            "SELECT * FROM circularization_recipient WHERE cycle_id=?",
            (cycle_id,),
        ).fetchall()]
        messages = [dict(m) for m in conn.execute(
            "SELECT * FROM circularization_message WHERE cycle_id=?",
            (cycle_id,),
        ).fetchall()]
        msg_ids = [m["msg_id"] for m in messages]
        attachments = []
        audit_dispatch = []
        if msg_ids:
            placeholders = ",".join("?" for _ in msg_ids)
            attachments = [dict(a) for a in conn.execute(
                f"SELECT * FROM circularization_attachment WHERE msg_id IN ({placeholders})",
                msg_ids,
            ).fetchall()]
            audit_dispatch = [dict(a) for a in conn.execute(
                f"SELECT * FROM circularization_audit_dispatch WHERE msg_id IN ({placeholders})",
                msg_ids,
            ).fetchall()]
        issues = [dict(i) for i in conn.execute(
            "SELECT * FROM reconciliation_issue WHERE cycle_id=?",
            (cycle_id,),
        ).fetchall()]

    export_base = Path(args.out_dir)
    if not export_base.is_absolute():
        export_base = (base_dir / export_base).resolve()
    export_base.mkdir(parents=True, exist_ok=True)

    timestamp = now_iso().replace(":", "").replace(".", "").replace("+", "")
    export_root = export_base / f"circularizacao_{cycle_id}_{timestamp}"
    export_root.mkdir(parents=True, exist_ok=True)

    counts = {
        "recipients": len(recipients),
        "messages": len(messages),
        "messages_out": sum(1 for m in messages if m.get("direction") == "OUT"),
        "messages_in": sum(1 for m in messages if m.get("direction") == "IN"),
        "attachments": len(attachments),
        "audit_dispatch": len(audit_dispatch),
        "issues": len(issues),
    }
    included: dict[str, object] = {}
    missing_detail = {
        "raw_emails": [],
        "attachments": [],
    }

    # Inputs
    inputs_dir = export_root / "inputs"
    inputs_dir.mkdir(parents=True, exist_ok=True)
    recipients_csv = Path(settings.recipients_csv)
    if not recipients_csv.is_absolute():
        recipients_csv = (base_dir / recipients_csv).resolve()
    if recipients_csv.exists():
        safe_copy(recipients_csv, inputs_dir, "recipients.csv")
    schema_src = base_dir / "data" / "schema.sql"
    if schema_src.exists():
        safe_copy(schema_src, inputs_dir, "schema.sql")

    # Docs
    include_docs = not args.no_docs
    if include_docs:
        docs_src = base_dir / "docs"
        if docs_src.exists():
            shutil.copytree(docs_src, export_root / "docs", dirs_exist_ok=True)
    included["docs"] = include_docs

    # Filled outputs
    include_filled = not args.no_filled
    filled_used = None
    if include_filled:
        outputs_dir = base_dir / "outputs"
        if args.filled_dir:
            filled_candidate = Path(args.filled_dir)
            if not filled_candidate.is_absolute():
                filled_candidate = (base_dir / filled_candidate).resolve()
        else:
            filled_candidate = find_latest_filled(outputs_dir)
        if filled_candidate and filled_candidate.exists():
            filled_used = filled_candidate.name
            dest = export_root / "filled" / filled_candidate.name
            dest.parent.mkdir(parents=True, exist_ok=True)
            try:
                shutil.copytree(filled_candidate, dest, dirs_exist_ok=True)
            except shutil.Error:
                copytree_longpath_dest(filled_candidate, dest)
    included["filled"] = filled_used

    # Emails
    raw_ref_map: dict[str, str | None] = {}
    if not args.no_emails:
        emails_dir = export_root / "emails"
        for m in messages:
            ref = m.get("raw_storage_ref") or ""
            resolved = resolve_existing(ref, base_dir)
            direction = "outbox" if m.get("direction") == "OUT" else "inbox"
            if resolved and resolved.exists():
                target = safe_copy(resolved, emails_dir / direction, resolved.name)
                rel = Path("emails") / direction / target.name
                raw_ref_map[m["msg_id"]] = rel.as_posix()
            else:
                raw_ref_map[m["msg_id"]] = None
                if ref:
                    missing_detail["raw_emails"].append({"msg_id": m["msg_id"], "raw_storage_ref": ref})
    else:
        for m in messages:
            raw_ref_map[m["msg_id"]] = None
    included["emails"] = not args.no_emails

    # Attachments
    att_path_map: dict[str, str | None] = {}
    if not args.no_attachments:
        for a in attachments:
            src = Path(a.get("storage_path") or "")
            if not src.is_absolute():
                src = (base_dir / src).resolve()
            if src.exists():
                att_dir = export_root / "attachments" / a["msg_id"]
                safe_name = Path(a.get("filename") or "attachment.bin").name
                target = safe_copy(src, att_dir, safe_name)
                rel = Path("attachments") / a["msg_id"] / target.name
                att_path_map[a["att_id"]] = rel.as_posix()
            else:
                att_path_map[a["att_id"]] = None
                missing_detail["attachments"].append(
                    {"att_id": a["att_id"], "msg_id": a["msg_id"], "storage_path": a.get("storage_path", "")}
                )
    else:
        for a in attachments:
            att_path_map[a["att_id"]] = None
    included["attachments"] = not args.no_attachments

    # Reports
    if not args.no_reports:
        reports_dir = export_root / "reports"
        write_status_reports(reports_dir, cycle, recipients)
        reports_src = base_dir / "outputs" / "reports"
        if reports_src.exists():
            if args.include_all_reports:
                shutil.copytree(reports_src, reports_dir / "source", dirs_exist_ok=True)
            else:
                (reports_dir / "source").mkdir(parents=True, exist_ok=True)
                for p in reports_src.iterdir():
                    if not p.is_file():
                        continue
                    name = p.name
                    if (cycle_id in name) or name.startswith("controle_auditoria_") or name.startswith("recipients_from_base_") or name.startswith("pendentes_"):
                        safe_copy(p, reports_dir / "source", name)
    included["reports"] = not args.no_reports

    # Export subset db
    export_db = export_root / "db" / f"circularizacao_{cycle_id}.sqlite"
    export_subset_db(
        export_db,
        base_dir / "data" / "schema.sql",
        cycle,
        recipients,
        messages,
        attachments,
        audit_dispatch,
        issues,
        raw_ref_map,
        att_path_map,
    )

    if args.include_db_full:
        full_db_dest = export_root / "db" / db_path.name
        safe_copy(db_path, full_db_dest.parent, full_db_dest.name)
        included["db_full"] = full_db_dest.name
    else:
        included["db_full"] = None

    missing_list: list[dict] = []
    for item in missing_detail.get("raw_emails", []):
        missing_list.append({"type": "raw_email", **item})
    for item in missing_detail.get("attachments", []):
        missing_list.append({"type": "attachment", **item})

    command_str = " ".join([sys.executable] + sys.argv)
    manifest = build_manifest(export_root, cycle_id, command_str, missing_list)
    manifest["exported_at"] = now_iso()
    manifest["cycle"] = cycle
    manifest["counts"] = counts
    manifest["included"] = included
    manifest["missing_detail"] = missing_detail

    manifest_path = export_root / "manifest.json"
    write_json(manifest_path, manifest)

    verify_report = None
    if args.verify:
        verify_report = verify_export_from_manifest(export_root, manifest)
        write_json(export_root / "verify_report.json", verify_report)
        if verify_report["status"] != "PASS":
            print("VERIFY FAIL:", verify_report["status"])
            print("Missing files:", len(verify_report["missing_files"]))
            print("Mismatches:", len(verify_report["mismatches"]))
            sys.exit(2)
        print("VERIFY PASS. OK files:", verify_report["checked_files_ok"])
        if manifest.get("summary", {}).get("missing_count", 0) > 0:
            print("NOTE: manifest has missing items declared:", manifest["summary"]["missing_count"])

    if args.pdf:
        summary_pdf = export_root / "dossie_summary.pdf"
        final_pdf = export_root / f"dossie_{cycle_id}.pdf"
        build_dossier_summary_pdf(export_root, manifest, verify_report, summary_pdf)
        if args.pdf_no_merge:
            if summary_pdf.resolve() != final_pdf.resolve():
                shutil.copy2(summary_pdf, final_pdf)
                try:
                    summary_pdf.unlink(missing_ok=True)
                except Exception:
                    pass
            pdf_stats = {"pdfs_appended": 0, "pdfs_skipped": []}
        else:
            pdf_stats = merge_pdfs_into_dossier(summary_pdf, export_root, final_pdf)
            try:
                summary_pdf.unlink(missing_ok=True)
            except Exception:
                pass

        manifest.setdefault("artifacts", {})
        manifest["artifacts"]["pdf"] = {
            "path": final_pdf.name,
            "size": final_pdf.stat().st_size,
            "sha256": sha256_file(final_pdf),
            "merge": (not args.pdf_no_merge),
            "pdfs_appended": pdf_stats.get("pdfs_appended", 0),
            "pdfs_skipped": pdf_stats.get("pdfs_skipped", []),
        }
        write_json(manifest_path, manifest)

    zip_path = None
    if args.zip:
        zip_path = export_root.parent / f"{export_root.name}.zip"
        make_zip_bundle(export_root, zip_path, exclude_names=set())
        manifest.setdefault("artifacts", {})
        manifest["artifacts"]["zip"] = {
            "path": zip_path.name,
            "size": zip_path.stat().st_size,
            "sha256": sha256_file(zip_path),
        }
        write_json(manifest_path, manifest)

    if args.verify:
        write_audit_exports(base_dir, export_root, manifest, verify_report, zip_path)

    print(f"OK: exportacao concluida em {export_root}")


if __name__ == "__main__":
    main()
