from __future__ import annotations
from pathlib import Path
from fc_circularize.db import db_session
from fc_circularize.settings import load_settings

def main():
    s = load_settings()
    schema_path = Path("./data/schema.sql")
    if not schema_path.exists():
        raise FileNotFoundError("schema.sql nao encontrado em ./data/schema.sql")

    with db_session(s.db_path) as conn:
        conn.executescript(schema_path.read_text(encoding="utf-8"))
    print(f"OK: DB inicializado em {s.db_path}")

if __name__ == "__main__":
    main()