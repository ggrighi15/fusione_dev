# -*- coding: utf-8 -*-
import re, sqlite3, unicodedata, pandas as pd

DB = r"G:\Meu Drive\fusione\historico_contencioso.db"

def norm(s:str)->str:
    if s is None: return ""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii","ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+","",s.lower())

COLMAP = {
    "pasta":"pasta",
    "situacao":"situacao","status":"situacao","situacaoatual":"situacao",
    "categoria":"categoria",
    "polo":"polo",
    "risco":"risco","#risco":"risco","nivelderisco":"risco",
    "valoranalisado":"valor_analisado","valor":"valor_analisado",
    "valoranalisadoatualizado":"valor_analisado_atualizado","valoratualizado":"valor_analisado_atualizado",
    "objeto":"objeto","objetoacao":"objeto","objeto da acao":"objeto","objeto da ação":"objeto",
}

TARGET = ["pasta","situacao","categoria","polo","risco",
          "valor_analisado","valor_analisado_atualizado","competencia","objeto"]

def to_number_pt(x):
    if pd.isna(x): return None
    if isinstance(x,(int,float)): return float(x)
    s = str(x).replace("R$","").replace(" ","").replace(".","").replace(",",".")
    try: return float(s)
    except: return None

def ensure_db(con):
    con.execute("PRAGMA journal_mode=WAL;")
    con.execute("""
    CREATE TABLE IF NOT EXISTS fato_contingencias(
      pasta TEXT NOT NULL,
      situacao TEXT,
      categoria TEXT,
      polo TEXT,
      risco TEXT,
      valor_analisado REAL,
      valor_analisado_atualizado REAL,
      competencia TEXT NOT NULL, -- YYYY-MM
      objeto TEXT,
      PRIMARY KEY(pasta, competencia) ON CONFLICT REPLACE
    );""")
    con.execute("CREATE INDEX IF NOT EXISTS ix_fc_comp ON fato_contingencias(competencia);")
    con.execute("CREATE INDEX IF NOT EXISTS ix_fc_risco ON fato_contingencias(risco);")
    con.execute("CREATE INDEX IF NOT EXISTS ix_fc_sit  ON fato_contingencias(situacao);")

def table_names(con):
    rows = con.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY 1"
    ).fetchall()
    # pega apenas padrão MM_AAAA
    return [r[0] for r in rows if re.fullmatch(r"\d{2}_\d{4}", r[0])]

def load_table(con, name):
    df = pd.read_sql_query(f'SELECT * FROM "{name}"', con)
    # renomeia colunas ao padrão
    mapping = {}
    for c in df.columns:
        key = norm(c)
        if key in COLMAP:
            mapping[c] = COLMAP[key]
    df = df.rename(columns=mapping)
    # garante colunas
    for col in TARGET:
        if col not in df.columns:
            df[col] = None
    # limpeza
    df["pasta"] = df["pasta"].astype(str).str.strip()
    df = df[df["pasta"].notna() & (df["pasta"]!="")]
    if "valor_analisado" in df: df["valor_analisado"] = df["valor_analisado"].apply(to_number_pt)
    if "valor_analisado_atualizado" in df: df["valor_analisado_atualizado"] = df["valor_analisado_atualizado"].apply(to_number_pt)
    # competência a partir do nome: MM_AAAA -> YYYY-MM
    comp = f"{name[3:]}-{name[:2]}"
    df["competencia"] = comp
    return df[TARGET].copy()

def upsert_df(con, df):
    stg = "stg_fc"
    df.to_sql(stg, con, if_exists="replace", index=False)
    con.execute(f"""
    INSERT INTO fato_contingencias
    (pasta,situacao,categoria,polo,risco,valor_analisado,valor_analisado_atualizado,competencia,objeto)
    SELECT pasta,situacao,categoria,polo,risco,valor_analisado,valor_analisado_atualizado,competencia,objeto
    FROM {stg}
    ON CONFLICT(pasta,competencia) DO UPDATE SET
      situacao=excluded.situacao,
      categoria=excluded.categoria,
      polo=excluded.polo,
      risco=excluded.risco,
      valor_analisado=COALESCE(excluded.valor_analisado, fato_contingencias.valor_analisado),
      valor_analisado_atualizado=COALESCE(excluded.valor_analisado_atualizado, fato_contingencias.valor_analisado_atualizado),
      objeto=COALESCE(excluded.objeto, fato_contingencias.objeto);
    """)
    con.execute("DROP TABLE IF EXISTS stg_fc;")

def main():
    con = sqlite3.connect(DB)
    ensure_db(con)
    tabs = table_names(con)
    print("Tabelas MM_AAAA detectadas:", len(tabs))
    total = 0
    for t in tabs:
        df = load_table(con, t)
        if not df.empty:
            upsert_df(con, df)
            print(f"[OK] {t}: {len(df)} linhas")
            total += len(df)
        else:
            print(f"[ZERO] {t}")
    con.commit()
    n = con.execute("SELECT COUNT(*) FROM fato_contingencias").fetchone()[0]
    print("Linhas em fato_contingencias:", n)
    print("Exemplo:", con.execute("SELECT competencia, COUNT(*) FROM fato_contingencias GROUP BY 1 ORDER BY 1 DESC LIMIT 5").fetchall())
    con.close()

if __name__ == "__main__":
    main()
