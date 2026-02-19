from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fc_core.fiscal.normalization import ensure_schema, run_batch_pipeline, export_pending_report


def main() -> int:
    parser = argparse.ArgumentParser(description="Run fiscal/cadastro normalization batch pipeline")
    parser.add_argument("--db", default=r"C:\Aggregatto\outputs\fiscal_normalization.db")
    parser.add_argument("--report", default=r"C:\Aggregatto\outputs\automation\fiscal_pending_report.json")
    args = parser.parse_args()

    db_path = Path(args.db)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    con = sqlite3.connect(str(db_path))
    try:
        ensure_schema(con)
        stats = run_batch_pipeline(con)
        export_pending_report(con, Path(args.report))
        out = {
            "db": str(db_path),
            "report": args.report,
            "pessoas_normalizadas": stats.pessoas_normalizadas,
            "ncm_sugeridos": stats.ncm_sugeridos,
            "pendencias_ncm": stats.pendencias_ncm,
        }
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0
    finally:
        con.close()


if __name__ == "__main__":
    raise SystemExit(main())
