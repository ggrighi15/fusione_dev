# -*- coding: utf-8 -*-
"""
Script de Análise de Contingências - Período Expandido
Analisa arquivos disponíveis no período de 2015-2030 com padrões mm-aaaa melhorados
"""

import os
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Importar configurações do script principal
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

IGNORE_PREFIXES = ("relatório de contingências", "relatorio de contingencias")

def is_monthly_report_extended(p: Path) -> bool:
    """Versão melhorada da função is_monthly_report com padrões expandidos"""
    name = p.stem.lower()
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

def file_should_skip(p: Path) -> bool:
    """Verifica se o arquivo deve ser ignorado"""
    import unicodedata
    name = unicodedata.normalize("NFKD", p.stem).encode("ascii","ignore").decode("ascii").lower()
    return name.startswith(IGNORE_PREFIXES)

def get_file_info(file_path: Path) -> dict:
    """Obtém informações detalhadas do arquivo"""
    try:
        stat = file_path.stat()
        return {
            'path': str(file_path),
            'name': file_path.name,
            'size_mb': round(stat.st_size / (1024 * 1024), 2),
            'modified': datetime.fromtimestamp(stat.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
            'extension': file_path.suffix.lower()
        }
    except Exception as e:
        return {
            'path': str(file_path),
            'name': file_path.name,
            'size_mb': 0,
            'modified': 'N/A',
            'extension': file_path.suffix.lower(),
            'error': str(e)
        }

def analyze_contingencias_files():
    """Analisa todos os arquivos de contingências no período expandido"""
    print("=" * 80)
    print("ANÁLISE DE ARQUIVOS DE CONTINGÊNCIAS - PERÍODO EXPANDIDO (2015-2030)")
    print("=" * 80)
    print(f"Gerado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Estatísticas gerais
    total_dirs = len(YEAR_DIRS)
    existing_dirs = 0
    total_files = 0
    monthly_files = 0
    ignored_files = 0
    total_size_mb = 0
    
    # Agrupamento por ano
    files_by_year = defaultdict(list)
    pattern_stats = defaultdict(int)
    
    print("📁 ANÁLISE DE DIRETÓRIOS:")
    print("-" * 40)
    
    for year_dir in YEAR_DIRS:
        year = Path(year_dir).name
        if os.path.isdir(year_dir):
            existing_dirs += 1
            print(f"✅ {year}: {year_dir}")
            
            # Buscar arquivos Excel
            dir_path = Path(year_dir)
            for ext in ("*.xlsx", "*.xlsm", "*.xls"):
                for file_path in dir_path.glob(ext):
                    total_files += 1
                    file_info = get_file_info(file_path)
                    total_size_mb += file_info['size_mb']
                    
                    if file_should_skip(file_path):
                        ignored_files += 1
                        continue
                    
                    if is_monthly_report_extended(file_path):
                        monthly_files += 1
                        files_by_year[year].append(file_info)
                        
                        # Identificar padrão usado
                        name = file_path.stem.lower()
                        if re.match(r'^\d{1,2}-\d{4}$', name):
                            pattern_stats['mm-aaaa'] += 1
                        elif re.match(r'^\d{1,2}\s*e\s*\d{1,2}-\d{4}$', name):
                            pattern_stats['mm e mm-aaaa'] += 1
                        elif re.match(r'^\d{1,2}-\d{4}e\d{1,2}-\d{4}$', name):
                            pattern_stats['mm-aaaemm-aaaa'] += 1
                        elif re.match(r'^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)', name):
                            pattern_stats['mês-aaaa'] += 1
                        else:
                            pattern_stats['outros'] += 1
        else:
            print(f"❌ {year}: Diretório não encontrado")
    
    print(f"\n📊 RESUMO EXECUTIVO:")
    print("-" * 40)
    print(f"• Diretórios configurados: {total_dirs}")
    print(f"• Diretórios existentes: {existing_dirs}")
    print(f"• Total de arquivos Excel: {total_files}")
    print(f"• Arquivos com padrão mm-aaaa: {monthly_files}")
    print(f"• Arquivos ignorados: {ignored_files}")
    print(f"• Tamanho total: {total_size_mb:.2f} MB")
    
    print(f"\n📈 ESTATÍSTICAS POR PADRÃO:")
    print("-" * 40)
    for pattern, count in sorted(pattern_stats.items()):
        print(f"• {pattern}: {count} arquivos")
    
    print(f"\n📅 ARQUIVOS POR ANO:")
    print("-" * 40)
    
    for year in sorted(files_by_year.keys()):
        files = files_by_year[year]
        year_size = sum(f['size_mb'] for f in files)
        print(f"\n🗓️  {year} ({len(files)} arquivos, {year_size:.2f} MB):")
        
        for file_info in sorted(files, key=lambda x: x['name']):
            status = "⚠️ ERRO" if 'error' in file_info else "✅"
            print(f"   {status} {file_info['name']} ({file_info['size_mb']} MB, {file_info['modified']})")
    
    print(f"\n🎯 RECOMENDAÇÕES:")
    print("-" * 40)
    
    if monthly_files == 0:
        print("⚠️  Nenhum arquivo com padrão mm-aaaa encontrado")
        print("   Verifique se os diretórios estão corretos e acessíveis")
    elif monthly_files < 12:
        print(f"⚠️  Apenas {monthly_files} arquivos encontrados")
        print("   Considere verificar se há arquivos em outros formatos ou locais")
    else:
        print(f"✅ {monthly_files} arquivos identificados com sucesso")
        print("   Sistema pronto para processamento")
    
    if existing_dirs < total_dirs:
        missing = total_dirs - existing_dirs
        print(f"⚠️  {missing} diretórios não encontrados")
        print("   Considere criar os diretórios ou ajustar a configuração")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    analyze_contingencias_files()