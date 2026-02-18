from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from datetime import datetime

def gerar_relatorio_processos(processos, output_path):
    doc = SimpleDocTemplate(output_path, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []
    
    title = Paragraph("Relatório de Processos", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 12))
    
    subtitle = Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal'])
    story.append(subtitle)
    story.append(Spacer(1, 24))
    
    data = [["Pasta", "Número", "Situação", "Risco", "Valor"]]
    
    for p in processos:
        data.append([
            p.pasta,
            p.numero_principal or "-",
            p.situacao or "-",
            p.risco_atual or "-",
            f"R$ {p.valor_causa:,.2f}" if p.valor_causa else "-"
        ])
    
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    story.append(table)
    doc.build(story)
    return output_path
