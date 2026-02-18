"""
Simple SQL migration runner for FusionCore.

Usage:
  python scripts/apply_db_migrations.py
  python scripts/apply_db_migrations.py --database-url sqlite:///./fusionecore.db
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Iterable, List

from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS_ROOT = ROOT / "fc_core" / "db" / "migrations"


def normalize_dialect(raw: str) -> str:
    if raw in ("postgresql", "postgres"):
        return "postgresql"
    if raw in ("mysql", "mariadb"):
        return "mysql"
    if raw == "sqlite":
        return "sqlite"
    raise RuntimeError(f"Unsupported database dialect for SQL migrations: {raw}")


def split_sql_statements(sql: str) -> Iterable[str]:
    # Minimal parser is enough for our migration files (no procedural blocks).
    parts = sql.split(";")
    for part in parts:
        stmt = part.strip()
        if stmt:
            yield stmt


def ensure_schema_migrations_table(conn, dialect: str) -> None:
    if dialect == "postgresql":
        ddl = """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id VARCHAR(128) PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        """
    elif dialect == "mysql":
        ddl = """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id VARCHAR(128) PRIMARY KEY,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """
    else:
        ddl = """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id TEXT PRIMARY KEY,
            applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """
    conn.exec_driver_sql(ddl)


def get_pending_migrations(conn, migration_files: List[Path]) -> List[Path]:
    existing = {
        row[0]
        for row in conn.execute(text("SELECT id FROM schema_migrations")).fetchall()
    }
    return [p for p in migration_files if p.stem not in existing]


def apply_migration(conn, dialect: str, migration_file: Path) -> None:
    sql = migration_file.read_text(encoding="utf-8")
    if dialect == "sqlite":
        raw = conn.connection
        raw.executescript(sql)
    else:
        for stmt in split_sql_statements(sql):
            conn.exec_driver_sql(stmt)
    conn.execute(
        text("INSERT INTO schema_migrations (id) VALUES (:id)"),
        {"id": migration_file.stem},
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply SQL migrations from fc_core/db/migrations.")
    parser.add_argument(
        "--database-url",
        dest="database_url",
        default="",
        help="Override DATABASE_URL for migration run.",
    )
    args = parser.parse_args()

    database_url = args.database_url.strip() or os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is required (env or --database-url).")
    engine = create_engine(database_url)
    dialect = normalize_dialect(engine.url.get_backend_name())

    migration_dir = MIGRATIONS_ROOT / dialect
    if not migration_dir.exists():
        raise RuntimeError(f"Migration directory not found for dialect '{dialect}': {migration_dir}")

    migration_files = sorted(migration_dir.glob("*.sql"))
    if not migration_files:
        print(f"No SQL migration files found in {migration_dir}")
        return 0

    with engine.begin() as conn:
        ensure_schema_migrations_table(conn, dialect)
        pending = get_pending_migrations(conn, migration_files)
        if not pending:
            print("No pending migrations.")
            return 0

        for migration_file in pending:
            print(f"Applying {migration_file.name} ...")
            try:
                apply_migration(conn, dialect, migration_file)
            except Exception as exc:
                raise RuntimeError(f"Failed applying migration '{migration_file.name}': {exc}") from exc

    print("Migrations applied successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
