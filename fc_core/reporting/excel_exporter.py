import pandas as pd
from openpyxl.styles import Font, PatternFill, Alignment
from datetime import datetime

def gerar_relatorio_excel(processos, output_path):
    data = []
    for p in processos:
        data.append({
            "Pasta": p.pasta,
            "#Cliente": p.cliente,
            "Número Principal": p.numero_principal,
            "Situação": p.situacao,
            "Natureza": p.natureza,
            "#Categoria": p.categoria,
            "Polo": p.polo,
            "#Risco": p.risco_atual,
            "Valor da Causa": float(p.valor_causa) if p.valor_causa else 0.0,
            "Criado em": p.created_at
        })
    
    df = pd.DataFrame(data)
    
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Processos', index=False)
        
        workbook = writer.book
        worksheet = writer.sheets['Processos']
        
        for cell in worksheet[1]:
            cell.font = Font(bold=True, color="FFFFFF")
            cell.fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            cell.alignment = Alignment(horizontal="center")
        
        for column in worksheet.columns:
            max_length = 0
            column_letter = column[0].column_letter
            for cell in column:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            adjusted_width = min(max_length + 2, 50)
            worksheet.column_dimensions[column_letter].width = adjusted_width
    
    return output_path
