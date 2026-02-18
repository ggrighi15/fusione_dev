import win32com.client
import os
from decouple import config

def processar_todas_pastas_juridicas():
    print("--- INICIANDO PROCESSAMENTO MULTI-PASTAS JURÍDICAS ---")
    
    try:
        outlook = win32com.client.Dispatch("Outlook.Application").GetNamespace("MAPI")
        caixa_entrada = outlook.GetDefaultFolder(6)
        
        # Mapeamento: Nome da Pasta no Outlook -> Subpasta no Aggregatto
        mapeamento = {
            "Espaider": "espaider_anexos",
            "Escavador": "escavador_alertas",
            "Docusign": "contratos_docusign",
            "OAB": "publicacoes_oab"
        }

        diretorio_base = config('CAMINHO_aggregatto', default=r'C:\Aggregatto')
        
        for pasta_nome, sub_destino in mapeamento.items():
            try:
                pasta = caixa_entrada.Folders(pasta_nome)
                print(f"\n> Verificando pasta: {pasta_nome} ({len(pasta.Items)} itens)")
                
                caminho_salvar = os.path.join(diretorio_base, 'docs', sub_destino)
                if not os.path.exists(caminho_salvar):
                    os.makedirs(caminho_salvar)

                for msg in list(pasta.Items):
                    if hasattr(msg, "Attachments") and msg.Attachments.Count > 0:
                        for att in msg.Attachments:
                            ext_ok = ('.pdf', '.docx', '.xlsx', '.xls', '.zip', '.html')
                            if att.FileName.lower().endswith(ext_ok):
                                nome_limpo = "".join([c for c in att.FileName if c.isalnum() or c in ('.','_','-')]).strip()
                                att.SaveAsFile(os.path.join(caminho_salvar, nome_limpo))
                                print(f"   [SALVO] {att.FileName} em {sub_destino}")
            except Exception as e_pasta:
                print(f" [AVISO] Pasta {pasta_nome} não acessível ou vazia.")

        print("\n--- PROCESSAMENTO COMPLETO ---")

    except Exception as e:
        print(f"\n[ERRO CRÍTICO]: {e}")

if __name__ == "__main__":
    processar_todas_pastas_juridicas()