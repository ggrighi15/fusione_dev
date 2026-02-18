from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
from dotenv import load_dotenv
import win32com.client

AG_ROOT_DEFAULT = Path(r"C:\Aggregatto")
ATTACHMENT_EXTS = (".pdf", ".docx", ".xlsx", ".xls", ".zip")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_name(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name or "")
    return cleaned.strip("._") or "arquivo.bin"


def parse_folder_mapping(raw: str) -> List[Tuple[str, str]]:
    pairs = []
    for part in (raw or "").split(","):
        part = part.strip()
        if not part or ":" not in part:
            continue
        src, dst = part.split(":", 1)
        pairs.append((src.strip(), dst.strip()))
    return pairs


def load_config() -> Dict[str, object]:
    load_dotenv(AG_ROOT_DEFAULT / ".env")
    base_dir = Path(os.getenv("AG_ROOT", str(AG_ROOT_DEFAULT))).resolve()
    docs_dir = base_dir / "docs"
    out_dir = base_dir / "outputs" / "automation"
    out_dir.mkdir(parents=True, exist_ok=True)

    mapping = parse_folder_mapping(
        os.getenv(
            "AG_OUTLOOK_FOLDERS",
            "Espaider:espaider_anexos,Escavador:escavador_alertas,Docusign:contratos_docusign,OAB:publicacoes_oab",
        )
    )

    return {
        "base_dir": base_dir,
        "docs_dir": docs_dir,
        "out_dir": out_dir,
        "mapping": mapping,
    }


def extract_outlook_attachments(docs_dir: Path, mapping: List[Tuple[str, str]]) -> Dict[str, int]:
    stats = {"folders_seen": 0, "messages_seen": 0, "attachments_saved": 0}

    outlook = win32com.client.Dispatch("Outlook.Application").GetNamespace("MAPI")
    inbox = outlook.GetDefaultFolder(6)

    for folder_name, target_subdir in mapping:
        stats["folders_seen"] += 1
        target_dir = docs_dir / target_subdir
        target_dir.mkdir(parents=True, exist_ok=True)

        try:
            folder = inbox.Folders(folder_name)
        except Exception:
            continue

        items = list(folder.Items)
        stats["messages_seen"] += len(items)

        for msg in items:
            if not hasattr(msg, "Attachments"):
                continue
            count = int(getattr(msg.Attachments, "Count", 0) or 0)
            if count <= 0:
                continue
            for i in range(1, count + 1):
                att = msg.Attachments.Item(i)
                filename = str(getattr(att, "FileName", "") or "")
                if not filename.lower().endswith(ATTACHMENT_EXTS):
                    continue
                out_path = target_dir / safe_name(filename)
                att.SaveAsFile(str(out_path))
                stats["attachments_saved"] += 1

    return stats


def consolidate_espaider(docs_dir: Path) -> Dict[str, object]:
    src_dir = docs_dir / "espaider_anexos"
    out_csv = docs_dir / "aggregatto_master_report.csv"

    if not src_dir.exists():
        return {"consolidated": False, "reason": "missing_espaider_anexos", "output": str(out_csv)}

    xlsx_files = sorted(src_dir.glob("*.xlsx"))
    if not xlsx_files:
        return {"consolidated": False, "reason": "no_xlsx", "output": str(out_csv)}

    frames = []
    for f in xlsx_files:
        try:
            df = pd.read_excel(f)
            df["ag_fonte_arquivo"] = f.name
            frames.append(df)
        except Exception:
            continue

    if not frames:
        return {"consolidated": False, "reason": "read_error", "output": str(out_csv)}

    final_df = pd.concat(frames, ignore_index=True)
    dedupe_cols = [c for c in final_df.columns if c != "ag_fonte_arquivo"]
    if dedupe_cols:
        final_df = final_df.drop_duplicates(subset=dedupe_cols)

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    final_df.to_csv(out_csv, index=False, encoding="utf-8-sig")

    return {
        "consolidated": True,
        "files_used": len(frames),
        "rows": int(len(final_df)),
        "output": str(out_csv),
    }


def main() -> int:
    cfg = load_config()
    docs_dir = cfg["docs_dir"]
    out_dir = cfg["out_dir"]
    mapping = cfg["mapping"]

    docs_dir.mkdir(parents=True, exist_ok=True)

    run = {
        "started_at": now_iso(),
        "base_dir": str(cfg["base_dir"]),
        "mapping": mapping,
    }

    try:
        run["extract"] = extract_outlook_attachments(docs_dir, mapping)
        run["consolidation"] = consolidate_espaider(docs_dir)
        run["status"] = "ok"
    except Exception as exc:
        run["status"] = "error"
        run["error"] = str(exc)
    finally:
        run["finished_at"] = now_iso()
        out_json = out_dir / "outlook_etl_run.json"
        out_log = out_dir / "outlook_etl.log"
        out_json.write_text(json.dumps(run, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        with out_log.open("a", encoding="utf-8") as f:
            f.write(json.dumps(run, ensure_ascii=False) + "\n")

    print(json.dumps(run, ensure_ascii=False, indent=2))
    return 0 if run.get("status") == "ok" else 1


if __name__ == "__main__":
    raise SystemExit(main())
