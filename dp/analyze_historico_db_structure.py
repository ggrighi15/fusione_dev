# -*- coding: utf-8 -*-
"""
Script para analisar a estrutura do banco historico_contencioso.db
e identificar dados confiáveis desde 2021
"""

import sqlite3
import re
import pandas as pd
from datetime import datetime
import os

# Caminho do banco de dados
DB_PATH = r"G:\Meu Drive\fusione\sql\historico_contencioso.db"
REPORT_PATH = "./relatorio_estrutura_historico_db.md"

def connect_to_db():
    """Conecta ao banco de dados"""
    try:
        if not os.path.exists(DB_PATH):
            print(f"❌ Banco não encontrado: {DB_PATH}")
            return None
        
        conn = sqlite3.connect(DB_PATH)
        print(f"✅ Conectado ao banco: {DB_PATH}")
        return conn
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")
        return None

def get_all_tables(conn):
    """Obtém todas as tabelas do banco"""
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT name, type, sql 
            FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
            ORDER BY name
        """)
        
        tables = cursor.fetchall()
        print(f"📊 Total de tabelas encontradas: {len(tables)}")
        return tables
    except Exception as e:
        print(f"❌ Erro ao obter tabelas: {e}")
        return []

def analyze_table_structure(conn, table_name):
    """Analisa a estrutura de uma tabela específica"""
    try:
        cursor = conn.cursor()
        
        # Obter informações das colunas
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        
        # Contar registros
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        
        # Obter amostra dos dados
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
        sample = cursor.fetchall()
        
        return {
            'columns': columns,
            'count': count,
            'sample': sample
        }
    except Exception as e:
        print(f"❌ Erro ao analisar tabela {table_name}: {e}")
        return None

def identify_temporal_tables(tables):
    """Identifica tabelas com padrão temporal MM_AAAA"""
    temporal_tables = []
    
    for table_name, table_type, sql in tables:
        # Padrão MM_AAAA
        if re.match(r'^\d{2}_\d{4}$', table_name):
            month, year = table_name.split('_')
            temporal_tables.append({
                'name': table_name,
                'month': int(month),
                'year': int(year),
                'date_key': f"{year}-{month.zfill(2)}"
            })
    
    # Ordenar por data
    temporal_tables.sort(key=lambda x: x['date_key'])
    
    print(f"📅 Tabelas temporais encontradas: {len(temporal_tables)}")
    return temporal_tables

def analyze_data_coverage(conn, temporal_tables):
    """Analisa a cobertura temporal dos dados"""
    coverage = []
    
    for table_info in temporal_tables:
        table_name = table_info['name']
        analysis = analyze_table_structure(conn, table_name)
        
        if analysis:
            coverage.append({
                'table': table_name,
                'date': table_info['date_key'],
                'year': table_info['year'],
                'month': table_info['month'],
                'records': analysis['count'],
                'columns': len(analysis['columns']),
                'has_data': analysis['count'] > 0
            })
    
    return coverage

def find_data_since_2021(coverage):
    """Identifica dados confiáveis desde 2021"""
    data_2021_plus = [item for item in coverage if item['year'] >= 2021]
    
    # Estatísticas
    total_records = sum(item['records'] for item in data_2021_plus)
    years_covered = set(item['year'] for item in data_2021_plus)
    
    print(f"📈 Dados desde 2021:")
    print(f"   - Tabelas: {len(data_2021_plus)}")
    print(f"   - Registros: {total_records:,}")
    print(f"   - Anos cobertos: {sorted(years_covered)}")
    
    return data_2021_plus

def generate_report(tables, temporal_tables, coverage, data_2021_plus):
    """Gera relatório detalhado"""
    report = []
    report.append("# Relatório de Estrutura - historico_contencioso.db")
    report.append(f"## Gerado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("")
    
    # Resumo executivo
    report.append("## 📊 RESUMO EXECUTIVO")
    report.append("")
    report.append(f"- **Total de tabelas**: {len(tables)}")
    report.append(f"- **Tabelas temporais (MM_AAAA)**: {len(temporal_tables)}")
    report.append(f"- **Tabelas desde 2021**: {len(data_2021_plus)}")
    
    if data_2021_plus:
        total_records = sum(item['records'] for item in data_2021_plus)
        years = sorted(set(item['year'] for item in data_2021_plus))
        min_date = min(item['date'] for item in data_2021_plus)
        max_date = max(item['date'] for item in data_2021_plus)
        
        report.append(f"- **Total de registros desde 2021**: {total_records:,}")
        report.append(f"- **Período coberto**: {min_date} a {max_date}")
        report.append(f"- **Anos disponíveis**: {years}")
    
    report.append("")
    
    # Tabelas temporais detalhadas
    report.append("## 📅 TABELAS TEMPORAIS (MM_AAAA)")
    report.append("")
    
    if temporal_tables:
        report.append("| Tabela | Data | Registros | Status |")
        report.append("|--------|------|-----------|--------|")
        
        for item in coverage:
            status = "✅ Com dados" if item['has_data'] else "❌ Vazia"
            report.append(f"| {item['table']} | {item['date']} | {item['records']:,} | {status} |")
    
    report.append("")
    
    # Dados desde 2021
    report.append("## 🎯 DADOS CONFIÁVEIS DESDE 2021")
    report.append("")
    
    if data_2021_plus:
        # Por ano
        years_summary = {}
        for item in data_2021_plus:
            year = item['year']
            if year not in years_summary:
                years_summary[year] = {'tables': 0, 'records': 0}
            years_summary[year]['tables'] += 1
            years_summary[year]['records'] += item['records']
        
        report.append("### Resumo por Ano:")
        report.append("")
        report.append("| Ano | Tabelas | Registros |")
        report.append("|-----|---------|-----------|")
        
        for year in sorted(years_summary.keys()):
            data = years_summary[year]
            report.append(f"| {year} | {data['tables']} | {data['records']:,} |")
        
        report.append("")
        
        # Tabelas prioritárias
        priority_tables = sorted(data_2021_plus, key=lambda x: x['records'], reverse=True)[:10]
        
        report.append("### Top 10 Tabelas com Mais Dados:")
        report.append("")
        report.append("| Posição | Tabela | Data | Registros |")
        report.append("|---------|--------|------|-----------|")
        
        for i, item in enumerate(priority_tables, 1):
            report.append(f"| {i} | {item['table']} | {item['date']} | {item['records']:,} |")
    
    report.append("")
    
    # Recomendações
    report.append("## 🎯 RECOMENDAÇÕES")
    report.append("")
    
    if data_2021_plus:
        min_date = min(item['date'] for item in data_2021_plus)
        max_date = max(item['date'] for item in data_2021_plus)
        
        report.append(f"1. **Período Confiável Identificado**: {min_date} a {max_date}")
        report.append(f"2. **Implementar ETL** para consolidar {len(data_2021_plus)} tabelas")
        report.append(f"3. **Priorizar tabelas** com maior volume de dados")
        report.append(f"4. **Validar integridade** dos {sum(item['records'] for item in data_2021_plus):,} registros")
    else:
        report.append("1. **Nenhum dado desde 2021 encontrado**")
        report.append("2. **Verificar outros bancos de dados**")
        report.append("3. **Revisar estratégia de análise temporal**")
    
    # Salvar relatório
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report))
    
    print(f"📄 Relatório salvo em: {REPORT_PATH}")
    return report

def main():
    """Função principal"""
    print("🔍 Iniciando análise da estrutura do historico_contencioso.db...")
    print("="*60)
    
    # Conectar ao banco
    conn = connect_to_db()
    if not conn:
        return
    
    try:
        # Obter todas as tabelas
        tables = get_all_tables(conn)
        
        # Identificar tabelas temporais
        temporal_tables = identify_temporal_tables(tables)
        
        # Analisar cobertura de dados
        coverage = analyze_data_coverage(conn, temporal_tables)
        
        # Encontrar dados desde 2021
        data_2021_plus = find_data_since_2021(coverage)
        
        # Gerar relatório
        generate_report(tables, temporal_tables, coverage, data_2021_plus)
        
        print("\n✅ Análise concluída com sucesso!")
        
    except Exception as e:
        print(f"❌ Erro durante a análise: {e}")
    
    finally:
        conn.close()
        print("🔒 Conexão com banco fechada")

if __name__ == "__main__":
    main()