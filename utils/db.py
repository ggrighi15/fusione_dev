import os
from functools import lru_cache
from sqlalchemy import create_engine, text
import pandas as pd

MYSQL_URI = os.getenv("MYSQL_URI", "")

def ensure_uri():
    if not MYSQL_URI:
        raise RuntimeError("Env `MYSQL_URI` não configurada")
    return MYSQL_URI

@lru_cache(maxsize=1)
def engine():
    uri = ensure_uri()
    return create_engine(uri, pool_pre_ping=True)

def quick_check():
    with engine().connect() as conn:
        conn.execute(text("SELECT 1"))

def read_sql(sql: str, params=None) -> pd.DataFrame:
    with engine().connect() as conn:
        return pd.read_sql(text(sql), conn, params=params or {})

def execute(sql: str, params=None):
    with engine().begin() as conn:
        return conn.execute(text(sql), params or {})
