import pandas as pd
import os
import glob
from decouple import config

def consolidar_planilhas():
    print("--- CONSOLIDANDO RELATÓRIOS SMART REPORT ---")
    
    # Busca o caminho no .env
    diretorio_base = config('CAMINHO_aggregatto', default=r'C:\Aggregatto')
    pasta_anexos = os.path.join(diretorio_base, 'docs', 'espaider_anexos')
    
    # Lista todos os arquivos .xlsx na pasta
    arquivos = glob.glob(os.path.join(pasta_anexos, "*.xlsx"))
    
    if not arquivos:
        print("[AVISO] Nenhum arquivo .xlsx encontrado para consolidar.")
        return

    lista_df = []

    for arquivo in arquivos:
        try:
            # Lê a planilha (ajuste o header se a planilha tiver linhas de título no topo)
            df = pd.read_excel(arquivo)
            # Adicionamos uma coluna para saber de qual arquivo veio o dado (útil para auditoria)
            df['origem_arquivo'] = os.path.basename(arquivo)
            lista_df.append(df)
            print(f" > Lido: {os.path.basename(arquivo)}")
        except Exception as e:
            print(f" [ERRO] Falha ao ler {arquivo}: {e}")

    if lista_df:
        # Junta tudo em um único DataFrame
        df_final = pd.concat(lista_df, ignore_index=True)
        
        # Salva o resultado
        caminho_saida = os.path.join(diretorio_base, 'docs', 'consolidado_geral.csv')
        df_final.to_csv(caminho_saida, index=False, encoding='utf-8-sig')
        
        print(f"\n[SUCESSO] Consolidação finalizada!")
        print(f"Total de linhas processadas: {len(df_final)}")
        print(f"Arquivo gerado em: {caminho_saida}")

if __name__ == "__main__":
    consolidar_planilhas()