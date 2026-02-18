import win32com.client
import os
import pandas as pd
import glob
from decouple import config

# Configurações de Ambiente (Lendo do seu .env em C:\Aggregatto)
BASE_DIR = config('CAMINHO_aggregatto', default=r'C:\Aggregatto')
DOCS_DIR = os.path.join(BASE_DIR, 'docs')
OUTLOOK_SUBFOLDERS = {
    "Espaider": "espaider_anexos",
    "Escavador": "escavador_alertas",
    "Docusign": "contratos_docusign",
    "OAB": "publicacoes_oab"
}

def extrair_anexos_outlook():
    print("--- [AG] FASE 1: EXTRAÇÃO OUTLOOK ---")
    try:
        outlook = win32com.client.Dispatch("Outlook.Application").GetNamespace("MAPI")
        caixa_entrada = outlook.GetDefaultFolder(6)
        
        for pasta_nome, sub_dest in OUTLOOK_SUBFOLDERS.items():
            try:
                pasta = caixa_entrada.Folders(pasta_nome)
                caminho_salvar = os.path.join(DOCS_DIR, sub_dest)
                if not os.path.exists(caminho_salvar): os.makedirs(caminho_salvar)

                print(f" > Verificando {pasta_nome}...")
                for msg in list(pasta.Items):
                    if hasattr(msg, "Attachments") and msg.Attachments.Count > 0:
                        for att in msg.Attachments:
                            if att.FileName.lower().endswith(('.pdf', '.docx', '.xlsx', '.xls', '.zip')):
                                # Limpeza de nome para evitar erros de sistema
                                nome_limpo = "".join([c for c in att.FileName if c.isalnum() or c in ('.','_','-')]).strip()
                                att.SaveAsFile(os.path.join(caminho_salvar, nome_limpo))
                print(f"   [OK] Pasta {pasta_nome} processada.")
            except Exception:
                print(f"   [AVISO] Pasta {pasta_nome} ignorada (não encontrada).")
    except Exception as e:
        print(f" [ERRO] Falha no Outlook: {e}")

def consolidar_dados_aggregatto():
    print("\n--- [AG] FASE 2: CONSOLIDAÇÃO DE DADOS ---")
    pasta_anexos = os.path.join(DOCS_DIR, "espaider_anexos")
    arquivos = glob.glob(os.path.join(pasta_anexos, "*.xlsx"))
    
    if not arquivos:
        print(" [AVISO] Nenhuma planilha encontrada para consolidar.")
        return

    lista_df = []
    for f in arquivos:
        try:
            temp_df = pd.read_excel(f)
            temp_df['ag_fonte_arquivo'] = os.path.basename(f)
            lista_df.append(temp_df)
        except Exception as e:
            print(f" [ERRO] Falha ao ler {os.path.basename(f)}: {e}")

    if lista_df:
        df_final = pd.concat(lista_df, ignore_index=True)
        # Remove duplicatas baseadas em todas as colunas (exceto a fonte) para limpar o relatório
        df_final = df_final.drop_duplicates(subset=[c for c in df_final.columns if c != 'ag_fonte_arquivo'])
        
        caminho_saida = os.path.join(DOCS_DIR, 'aggregatto_master_report.csv')
        df_final.to_csv(caminho_saida, index=False, encoding='utf-8-sig')
        print(f" [SUCESSO] Relatório Master Gerado: {len(df_final)} linhas únicas.")

if __name__ == "__main__":
    extrair_anexos_outlook()
    consolidar_dados_aggregatto()