import json
import os
import shutil
from pathlib import Path
import pandas as pd

# Caminhos Origem (OneDrive local do Gustavo)
SOURCE_PATHS = {
    "risco": r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2025\07\db_risco.json",
    "categoria": r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2025\07\db_categoria.json",
    "clientes": r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2025\07\db_clientes.json",
    "polo": r"C:\Users\Gustavo_ri\OneDrive - BORRACHAS VIPAL S A\Relatórios Contingências\2025\07\db_polo.json"
}

# Planilhas de certidões/documentos consolidadas na pasta do projeto
CERTIDOES_SOURCES = {
    "lista_dd_31072023": r"C:\fusionecore-suite\Certidoes\Lista DD (31072023).xlsb",
    "dd_max": r"C:\fusionecore-suite\Certidoes\DD_Max.xlsx",
    "dd_projeto_max": r"C:\fusionecore-suite\Certidoes\DD_Projeto Max.xlsx"
}

# Destino no Projeto
DEST_DIR = Path("C:/fusionecore-suite/fc_core/data/reference")

def ingest():
    if not DEST_DIR.exists():
        os.makedirs(DEST_DIR)
        print(f"Diretório criado: {DEST_DIR}")

    for key, src in SOURCE_PATHS.items():
        if os.path.exists(src):
            dest = DEST_DIR / f"{key}.json"
            try:
                # Lê para validar JSON
                with open(src, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Salva no destino formatado
                with open(dest, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                
                print(f"✅ Ingestão {key}: Sucesso ({len(data)} registros)")
            except Exception as e:
                print(f"❌ Erro ao processar {key}: {e}")
        else:
            print(f"⚠️ Arquivo não encontrado: {src}")

    for key, src in CERTIDOES_SOURCES.items():
        if os.path.exists(src):
            dest = DEST_DIR / f"{key}.json"
            try:
                path = Path(src)
                ext = path.suffix.lower()

                if ext == ".xlsb":
                    df = pd.read_excel(path, engine="pyxlsb")
                else:
                    df = pd.read_excel(path)

                records = df.to_dict(orient="records")

                with open(dest, 'w', encoding='utf-8') as f:
                    json.dump(records, f, indent=2, ensure_ascii=False)

                print(f"✅ Ingestão certidões {key}: Sucesso ({len(records)} linhas)")
            except Exception as e:
                print(f"❌ Erro ao processar certidões {key}: {e}")
        else:
            print(f"⚠️ Arquivo de certidões não encontrado: {src}")

if __name__ == "__main__":
    ingest()
