# -*- coding: utf-8 -*-
import os, re, sqlite3, unicodedata, uuid, hashlib
from pathlib import Path
from datetime import datetime
import pandas as pd

# ==== CONFIG ============================================
DB_PATH = r"G:\Meu Drive\fusione\historico_contencioso.db"
YEAR_DIRS = [
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2015",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2016",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2017",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2018",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2019",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2020",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2021",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2022",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2023",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2024",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2025",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2026",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2027",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2028",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2029",
    r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2030",
]
# Nome(s) a ignorar (relatórios consolidados)
IGNORE_PREFIXES = ("relatório de contingências", "relatorio de contingencias")
# Colunas destino (padrão)
TARGET_COLS = [
    "pasta","situacao","categoria","polo","risco",
    "valor_analisado","valor_analisado_atualizado",
    "competencia","objeto","data_criacao","data_encerramento",
    "data_acordo","data_atualizacao","advogado","tribunal",
    "instancia","fase_processual"
]
# ========================================================

def norm_txt(s: str) -> str:
    if s is None: return ""
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "", s.lower())

COLMAP = {
    "pasta": "pasta",
    "situacao": "situacao",
    "status": "situacao",
    "categoria": "categoria",
    "polo": "polo",
    "risco": "risco",
    "valoranalisado": "valor_analisado",
    "valor": "valor_analisado",
    "valoratualizado": "valor_analisado_atualizado",
    "valoranalisadoatualizado": "valor_analisado_atualizado",
    "objeto": "objeto",
    "objetoacao": "objeto",
    "objeto da acao": "objeto",
    "datacriacao": "data_criacao",
    "data de criacao": "data_criacao",
    "data criacao": "data_criacao",
    "dataencerramento": "data_encerramento",
    "data de encerramento": "data_encerramento",
    "data encerramento": "data_encerramento",
    "dataacordo": "data_acordo",
    "data de acordo": "data_acordo",
    "data acordo": "data_acordo",
    "dataatualizacao": "data_atualizacao",
    "data de atualizacao": "data_atualizacao",
    "data atualizacao": "data_atualizacao",
    "advogado": "advogado",
    "responsavel": "advogado",
    "tribunal": "tribunal",
    "instancia": "instancia",
    "faseprocessual": "fase_processual",
    "fase processual": "fase_processual",
    "fase": "fase_processual",
}

def parse_competencia(path: Path) -> str:
    name = path.name
    # tenta 08_2025 ou 08-2025
    m = re.search(r"(\d{2})[ _-](\d{4})", name)
    if m: return f"{m.group(2)}-{m.group(1)}"
    # tenta 2025-08 ou 2025_08
    m = re.search(r"(\d{4})[ _-](\d{2})", name)
    if m: return f"{m.group(1)}-{m.group(2)}"
    # usa o ano da pasta + Janeiro
    try:
        year = re.search(r"(20\d{2})", str(path.parent)).group(1)
        return f"{year}-01"
    except Exception:
        return "1900-01"

def to_number_pt(x):
    if pd.isna(x): return None
    if isinstance(x, (int, float)): return float(x)
    s = str(x)
    s = s.replace("R$", "").replace(" ", "").replace(".", "").replace(",", ".")
    try:
        return float(s)
    except Exception:
        return None

def normaliza_risco(r):
    r0 = norm_txt(r)
    if r0.startswith("a") or "provavel" in r0: return "A - Provável"
    if r0.startswith("b") or "possivel" in r0: return "B - Possível"
    if r0.startswith("c") or "remot" in r0:    return "C - Remota"
    return r if isinstance(r, str) and r else None

def pick_sheet(df_dict):
    # escolhe a primeira planilha que tenha coluna 'pasta' (ou semelhante)
    for name, df in df_dict.items():
        cols_norm = [norm_txt(c) for c in df.columns]
        if any(c.startswith("pasta") or c=="pasta" for c in cols_norm):
            return df
    # se nenhuma, devolve a primeira
    return next(iter(df_dict.values()))

def ensure_db(con: sqlite3.Connection):
    con.execute("PRAGMA journal_mode=WAL;")
    con.execute("""
    CREATE TABLE IF NOT EXISTS fato_contingencias (
      pasta TEXT NOT NULL,
      situacao TEXT,
      categoria TEXT,
      polo TEXT,
      risco TEXT,
      valor_analisado REAL,
      valor_analisado_atualizado REAL,
      competencia TEXT NOT NULL,
      objeto TEXT,
      data_criacao TEXT,
      data_encerramento TEXT,
      data_acordo TEXT,
      data_atualizacao TEXT,
      advogado TEXT,
      tribunal TEXT,
      instancia TEXT,
      fase_processual TEXT,
      PRIMARY KEY (pasta, competencia) ON CONFLICT REPLACE
    );
    """)
    con.execute("CREATE INDEX IF NOT EXISTS ix_fc_comp ON fato_contingencias(competencia);")
    con.execute("CREATE INDEX IF NOT EXISTS ix_fc_risco ON fato_contingencias(risco);")
    con.execute("CREATE INDEX IF NOT EXISTS ix_fc_sit ON fato_contingencias(situacao);")
    
    # Tabela de controle para carregamento incremental
    con.execute("""
    CREATE TABLE IF NOT EXISTS arquivo_controle (
      arquivo_path TEXT PRIMARY KEY,
      arquivo_nome TEXT,
      data_modificacao TEXT,
      data_processamento TEXT,
      hash_arquivo TEXT,
      linhas_processadas INTEGER
    );
    """)
    # Views úteis pro Power BI
    con.execute("""
    CREATE VIEW IF NOT EXISTS vw_contingencias_ativo AS
      SELECT * FROM fato_contingencias
      WHERE lower(coalesce(situacao,'')) = 'ativo';
    """)
    con.execute("""
    CREATE VIEW IF NOT EXISTS vw_contingencias_ano AS
      SELECT substr(competencia,1,4) AS ano,
             COUNT(DISTINCT pasta)   AS qtd_processos,
             SUM(valor_analisado)    AS valor_total,
             SUM(valor_analisado_atualizado) AS valor_atualizado
      FROM vw_contingencias_ativo
      GROUP BY 1 ORDER BY 1;
    """)

def file_should_skip(p: Path) -> bool:
    name = unicodedata.normalize("NFKD", p.stem).encode("ascii","ignore").decode("ascii").lower()
    return name.startswith(IGNORE_PREFIXES)

def is_monthly_report(p: Path) -> bool:
    """Verifica se o arquivo segue o padrão mm-aaaa (ex: 01-2024, 12-2023)
    Inclui padrões especiais como '05 e 06-2025' e '12-2024e01-2025'
    """
    name = p.stem.lower()
    import re
    patterns = [
        # Padrões básicos mm-aaaa
        r'^\d{2}-\d{4}$',  # 01-2024
        r'^\d{1,2}-\d{4}$',  # 1-2024 ou 01-2024
        r'^\d{2}\.\d{4}$',  # 01.2024
        r'^\d{1,2}\.\d{4}$',  # 1.2024 ou 01.2024
        r'^\d{2}_\d{4}$',  # 01_2024
        r'^\d{1,2}_\d{4}$',  # 1_2024 ou 01_2024
        
        # Padrões especiais identificados no relatório
        r'^\d{2}\s*e\s*\d{2}-\d{4}$',  # 05 e 06-2025
        r'^\d{1,2}\s*e\s*\d{1,2}-\d{4}$',  # 5 e 6-2025
        r'^\d{2}-\d{4}e\d{2}-\d{4}$',  # 12-2024e01-2025
        r'^\d{1,2}-\d{4}e\d{1,2}-\d{4}$',  # 12-2024e1-2025
        
        # Padrões com espaços
        r'^\d{2}\s+-\s*\d{4}$',  # 01 - 2024
        r'^\d{1,2}\s+-\s*\d{4}$',  # 1 - 2024
        
        # Padrões com mês por extenso abreviado
        r'^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)-?\d{4}$',  # jan2024, jan-2024
        r'^(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)-?\d{4}$',
    ]
    return any(re.match(pattern, name) for pattern in patterns)

def get_file_hash(file_path: Path) -> str:
    """Calcula hash MD5 do arquivo para detectar mudanças"""
    hash_md5 = hashlib.md5()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except:
        return ""

def should_process_file(con: sqlite3.Connection, file_path: Path) -> bool:
    """Verifica se o arquivo precisa ser processado (novo ou modificado)"""
    if not file_path.exists():
        return False
        
    file_hash = get_file_hash(file_path)
    file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
    
    cursor = con.execute(
        "SELECT hash_arquivo, data_modificacao FROM arquivo_controle WHERE arquivo_path = ?",
        (str(file_path),)
    )
    result = cursor.fetchone()
    
    if result is None:
        return True  # Arquivo novo
    
    stored_hash, stored_mtime = result
    return file_hash != stored_hash or file_mtime != stored_mtime

def register_file_processing(con: sqlite3.Connection, file_path: Path, lines_processed: int):
    """Registra o processamento do arquivo na tabela de controle"""
    file_hash = get_file_hash(file_path)
    file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime).isoformat()
    process_time = datetime.now().isoformat()
    
    con.execute("""
        INSERT OR REPLACE INTO arquivo_controle 
        (arquivo_path, arquivo_nome, data_modificacao, data_processamento, hash_arquivo, linhas_processadas)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (str(file_path), file_path.name, file_mtime, process_time, file_hash, lines_processed))

def load_file(p: Path) -> pd.DataFrame | None:
    try:
        xls = pd.read_excel(p, sheet_name=None, engine="openpyxl")
        raw = pick_sheet(xls)
        # renomeia colunas ao padrão, evitando duplicações
        mapping = {}
        used_targets = set()
        for c in raw.columns:
            n = norm_txt(c)
            if n in COLMAP:
                target = COLMAP[n]
                # Se o target já foi usado, pula esta coluna para evitar duplicação
                if target not in used_targets:
                    mapping[c] = target
                    used_targets.add(target)
        df = raw.rename(columns=mapping)
        # garante colunas alvo
        for t in TARGET_COLS:
            if t not in df.columns: df[t] = None
        # recorta no padrão
        df = df[TARGET_COLS].copy()

        # limpa
        df["pasta"] = df["pasta"].astype(str).str.strip()
        df = df[df["pasta"].notna() & (df["pasta"]!="")]

        df["competencia"] = parse_competencia(p)
        df["valor_analisado"] = df["valor_analisado"].apply(to_number_pt)
        if "valor_analisado_atualizado" in df:
            df["valor_analisado_atualizado"] = df["valor_analisado_atualizado"].apply(to_number_pt)
        df["risco"] = df["risco"].apply(normaliza_risco)
        return df
    except Exception as e:
        print(f"[SKIP] {p.name}: {e}")
        return None

def upsert_df(con, df: pd.DataFrame):
    # usa staging + UPSERT
    stg = f"stg_fc_{uuid.uuid4().hex[:8]}"
    df.to_sql(stg, con, if_exists="replace", index=False)
    
    # SQLite não suporta ON CONFLICT ... DO UPDATE SET da mesma forma que PostgreSQL
    # Vamos usar INSERT OR REPLACE com uma abordagem diferente
    con.execute(f"""
    INSERT OR REPLACE INTO fato_contingencias
    (pasta, situacao, categoria, polo, risco, valor_analisado, valor_analisado_atualizado, 
     competencia, objeto, data_criacao, data_encerramento, data_acordo, data_atualizacao, 
     advogado, tribunal, instancia, fase_processual)
    SELECT 
        s.pasta,
        s.situacao,
        s.categoria,
        s.polo,
        s.risco,
        COALESCE(s.valor_analisado, 
                 (SELECT valor_analisado FROM fato_contingencias f 
                  WHERE f.pasta = s.pasta AND f.competencia = s.competencia)),
        COALESCE(s.valor_analisado_atualizado,
                 (SELECT valor_analisado_atualizado FROM fato_contingencias f 
                  WHERE f.pasta = s.pasta AND f.competencia = s.competencia)),
        s.competencia,
        COALESCE(s.objeto,
                 (SELECT objeto FROM fato_contingencias f 
                  WHERE f.pasta = s.pasta AND f.competencia = s.competencia)),
        s.data_criacao,
        s.data_encerramento,
        s.data_acordo,
        s.data_atualizacao,
        s.advogado,
        s.tribunal,
        s.instancia,
        s.fase_processual
    FROM {stg} s;
    """)
    con.execute(f"DROP TABLE {stg};")

def main():
    files = []
    for d in YEAR_DIRS:
        if not os.path.isdir(d): 
            print(f"[WARN] Pasta não encontrada: {d}")
            continue
        for ext in ("*.xlsx","*.xlsm","*.xls"):
            files += list(Path(d).glob(ext))
    
    # Filtrar apenas arquivos com padrão mm-aaaa e que não devem ser ignorados
    files = [f for f in files if not file_should_skip(f) and is_monthly_report(f)]
    files.sort()

    con = sqlite3.connect(DB_PATH)
    ensure_db(con)

    before = con.execute("SELECT COUNT(*) FROM fato_contingencias").fetchone()[0]
    print(f"Arquivos encontrados (mm-aaaa): {len(files)}")
    
    processed_count = 0
    skipped_count = 0

    for f in files:
        # Verificar se o arquivo precisa ser processado (carregamento incremental)
        if not should_process_file(con, f):
            print(f"[SKIP] {f.name}: arquivo não modificado")
            skipped_count += 1
            continue
            
        df = load_file(f)
        if df is None or df.empty: 
            print(f"[ZERO] {f.name}")
            continue
            
        upsert_df(con, df)
        register_file_processing(con, f, len(df))
        print(f"[OK] {f.name}: {len(df)} linhas")
        processed_count += 1

    after = con.execute("SELECT COUNT(*) FROM fato_contingencias").fetchone()[0]
    con.commit(); con.close()
    print(f"Arquivos processados: {processed_count}, ignorados: {skipped_count}")
    print(f"Linhas na fato_contingencias: {before} -> {after} (+{after-before})")

if __name__ == "__main__":
    main()
