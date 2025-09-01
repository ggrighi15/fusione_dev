#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sistema de Verificação Mensal Automatizada - Contingências
Implementa a estratégia de arquivamento otimizada com foco em campos críticos
"""

import os
import sqlite3
import pandas as pd
import hashlib
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import logging

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('verificacao_mensal.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class VerificacaoMensalContingencias:
    """
    Classe para gerenciar verificação mensal automatizada de contingências
    com foco em campos críticos e arquivamento otimizado
    """
    
    def __init__(self, db_path: str, backup_dir: str):
        self.db_path = db_path
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Campos críticos para monitoramento obrigatório
        self.campos_criticos = [
            'pasta', 'situacao', 'risco', 'valor_analisado', 
            'valor_analisado_atualizado', 'competencia', 
            'data_criacao', 'categoria'
        ]
        
        # Campos importantes para monitoramento mensal
        self.campos_importantes = [
            'polo', 'data_encerramento', 'data_acordo', 
            'tribunal', 'instancia', 'fase_processual'
        ]
        
        # Campos opcionais para verificação trimestral
        self.campos_opcionais = [
            'objeto', 'advogado', 'data_atualizacao'
        ]
        
        # Todos os campos
        self.todos_campos = self.campos_criticos + self.campos_importantes + self.campos_opcionais
    
    def conectar_db(self) -> sqlite3.Connection:
        """Conecta ao banco de dados"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.execute("PRAGMA journal_mode=WAL;")
            return conn
        except Exception as e:
            logger.error(f"Erro ao conectar ao banco: {e}")
            raise
    
    def criar_tabela_mensal(self, periodo: str) -> bool:
        """
        Cria tabela mensal para o período especificado (AAAA-MM)
        """
        try:
            with self.conectar_db() as conn:
                tabela_nome = f"contingencias_{periodo.replace('-', '')}"
                
                sql_create = f"""
                CREATE TABLE IF NOT EXISTS {tabela_nome} (
                    -- Campos Críticos
                    pasta TEXT PRIMARY KEY,
                    situacao TEXT NOT NULL CHECK (situacao IN ('Ativo', 'Encerrado', 'Suspenso', 'Arquivado')),
                    risco TEXT NOT NULL CHECK (risco IN ('Alto', 'Médio', 'Baixo', 'Muito Alto', 'Muito Baixo')),
                    valor_analisado REAL CHECK (valor_analisado >= 0),
                    valor_analisado_atualizado REAL CHECK (valor_analisado_atualizado >= 0),
                    competencia TEXT NOT NULL,
                    data_criacao TEXT,
                    categoria TEXT NOT NULL,
                    
                    -- Campos Importantes
                    polo TEXT CHECK (polo IN ('Ativo', 'Passivo')),
                    data_encerramento TEXT,
                    data_acordo TEXT,
                    tribunal TEXT,
                    instancia TEXT,
                    fase_processual TEXT,
                    
                    -- Metadados
                    data_processamento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    hash_registro TEXT,
                    arquivo_origem TEXT,
                    
                    -- Constraints
                    CHECK (data_encerramento IS NULL OR data_encerramento >= data_criacao),
                    CHECK (data_acordo IS NULL OR data_acordo >= data_criacao)
                );
                """
                
                conn.execute(sql_create)
                
                # Criar índices
                indices = [
                    f"CREATE INDEX IF NOT EXISTS idx_{tabela_nome}_situacao ON {tabela_nome}(situacao);",
                    f"CREATE INDEX IF NOT EXISTS idx_{tabela_nome}_risco ON {tabela_nome}(risco);",
                    f"CREATE INDEX IF NOT EXISTS idx_{tabela_nome}_categoria ON {tabela_nome}(categoria);",
                    f"CREATE INDEX IF NOT EXISTS idx_{tabela_nome}_competencia ON {tabela_nome}(competencia);",
                    f"CREATE INDEX IF NOT EXISTS idx_{tabela_nome}_valor ON {tabela_nome}(valor_analisado_atualizado);"
                ]
                
                for indice in indices:
                    conn.execute(indice)
                
                conn.commit()
                logger.info(f"Tabela {tabela_nome} criada com sucesso")
                return True
                
        except Exception as e:
            logger.error(f"Erro ao criar tabela mensal para {periodo}: {e}")
            return False
    
    def validar_campos_criticos(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
        """
        Valida campos críticos e retorna DataFrame limpo + lista de erros
        """
        erros = []
        df_limpo = df.copy()
        
        # Verificar campos obrigatórios
        for campo in self.campos_criticos:
            if campo not in df_limpo.columns:
                erros.append(f"Campo crítico ausente: {campo}")
                continue
            
            # Verificações específicas por campo
            if campo == 'pasta':
                nulos = df_limpo[campo].isnull().sum()
                if nulos > 0:
                    erros.append(f"Campo 'pasta' tem {nulos} valores nulos")
                    df_limpo = df_limpo.dropna(subset=[campo])
            
            elif campo == 'situacao':
                valores_validos = ['Ativo', 'Encerrado', 'Suspenso', 'Arquivado']
                invalidos = ~df_limpo[campo].isin(valores_validos)
                if invalidos.any():
                    count_invalidos = invalidos.sum()
                    erros.append(f"Campo 'situacao' tem {count_invalidos} valores inválidos")
                    df_limpo = df_limpo[~invalidos]
            
            elif campo == 'risco':
                valores_validos = ['Alto', 'Médio', 'Baixo', 'Muito Alto', 'Muito Baixo']
                invalidos = ~df_limpo[campo].isin(valores_validos)
                if invalidos.any():
                    count_invalidos = invalidos.sum()
                    erros.append(f"Campo 'risco' tem {count_invalidos} valores inválidos")
                    df_limpo = df_limpo[~invalidos]
            
            elif campo in ['valor_analisado', 'valor_analisado_atualizado']:
                # Converter para numérico e verificar valores negativos
                df_limpo[campo] = pd.to_numeric(df_limpo[campo], errors='coerce')
                negativos = (df_limpo[campo] < 0).sum()
                if negativos > 0:
                    erros.append(f"Campo '{campo}' tem {negativos} valores negativos")
                    df_limpo = df_limpo[df_limpo[campo] >= 0]
        
        return df_limpo, erros
    
    def processar_arquivo_mensal(self, arquivo_path: str, periodo: str) -> Dict:
        """
        Processa arquivo mensal e insere dados na tabela correspondente
        """
        resultado = {
            'arquivo': arquivo_path,
            'periodo': periodo,
            'sucesso': False,
            'registros_processados': 0,
            'registros_validos': 0,
            'erros': []
        }
        
        try:
            # Ler arquivo Excel
            df = pd.read_excel(arquivo_path)
            resultado['registros_processados'] = len(df)
            
            # Validar campos críticos
            df_limpo, erros_validacao = self.validar_campos_criticos(df)
            resultado['erros'].extend(erros_validacao)
            resultado['registros_validos'] = len(df_limpo)
            
            if len(df_limpo) == 0:
                resultado['erros'].append("Nenhum registro válido após validação")
                return resultado
            
            # Adicionar metadados
            df_limpo['data_processamento'] = datetime.now().isoformat()
            df_limpo['arquivo_origem'] = Path(arquivo_path).name
            
            # Calcular hash para cada registro
            df_limpo['hash_registro'] = df_limpo.apply(
                lambda row: hashlib.md5(str(row[self.campos_criticos]).encode()).hexdigest(),
                axis=1
            )
            
            # Inserir no banco
            tabela_nome = f"contingencias_{periodo.replace('-', '')}"
            with self.conectar_db() as conn:
                df_limpo.to_sql(tabela_nome, conn, if_exists='append', index=False)
            
            resultado['sucesso'] = True
            logger.info(f"Arquivo {arquivo_path} processado: {resultado['registros_validos']} registros válidos")
            
        except Exception as e:
            resultado['erros'].append(f"Erro no processamento: {str(e)}")
            logger.error(f"Erro ao processar {arquivo_path}: {e}")
        
        return resultado
    
    def gerar_backup_criticos(self, periodo: str) -> bool:
        """
        Gera backup dos campos críticos para o período
        """
        try:
            tabela_nome = f"contingencias_{periodo.replace('-', '')}"
            
            with self.conectar_db() as conn:
                # Query apenas campos críticos
                campos_str = ', '.join(self.campos_criticos)
                query = f"SELECT {campos_str} FROM {tabela_nome}"
                df = pd.read_sql_query(query, conn)
            
            # Criar diretório do período
            ano, mes = periodo.split('-')
            periodo_dir = self.backup_dir / ano / mes
            periodo_dir.mkdir(parents=True, exist_ok=True)
            
            # Salvar arquivo crítico
            arquivo_critico = periodo_dir / f"contingencias_criticos_{periodo.replace('-', '')}.csv"
            df.to_csv(arquivo_critico, index=False, encoding='utf-8')
            
            # Calcular hash do arquivo
            hash_arquivo = self._calcular_hash_arquivo(arquivo_critico)
            
            logger.info(f"Backup crítico gerado: {arquivo_critico}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao gerar backup crítico para {periodo}: {e}")
            return False
    
    def gerar_metadados_periodo(self, periodo: str) -> Dict:
        """
        Gera metadados estatísticos para o período
        """
        try:
            tabela_nome = f"contingencias_{periodo.replace('-', '')}"
            
            with self.conectar_db() as conn:
                # Estatísticas gerais
                query_stats = f"""
                SELECT 
                    COUNT(*) as total_registros,
                    COUNT(CASE WHEN situacao = 'Ativo' THEN 1 END) as registros_ativos,
                    COUNT(CASE WHEN situacao = 'Encerrado' THEN 1 END) as registros_encerrados,
                    COUNT(CASE WHEN situacao = 'Suspenso' THEN 1 END) as registros_suspensos,
                    COUNT(CASE WHEN situacao = 'Arquivado' THEN 1 END) as registros_arquivados,
                    COALESCE(SUM(valor_analisado_atualizado), 0) as valor_total,
                    COALESCE(AVG(valor_analisado_atualizado), 0) as valor_medio
                FROM {tabela_nome}
                """
                
                stats = pd.read_sql_query(query_stats, conn).iloc[0].to_dict()
                
                # Distribuição por risco
                query_risco = f"""
                SELECT risco, COUNT(*) as quantidade
                FROM {tabela_nome}
                GROUP BY risco
                """
                
                risco_dist = pd.read_sql_query(query_risco, conn)
                
                # Distribuição por categoria
                query_categoria = f"""
                SELECT categoria, COUNT(*) as quantidade
                FROM {tabela_nome}
                GROUP BY categoria
                """
                
                categoria_dist = pd.read_sql_query(query_categoria, conn)
            
            metadados = {
                'periodo': periodo,
                'data_processamento': datetime.now().isoformat(),
                'estatisticas_gerais': stats,
                'distribuicao_risco': risco_dist.to_dict('records'),
                'distribuicao_categoria': categoria_dist.to_dict('records')
            }
            
            # Salvar metadados
            ano, mes = periodo.split('-')
            periodo_dir = self.backup_dir / ano / mes
            periodo_dir.mkdir(parents=True, exist_ok=True)
            
            arquivo_metadados = periodo_dir / f"metadados_{periodo.replace('-', '')}.json"
            with open(arquivo_metadados, 'w', encoding='utf-8') as f:
                json.dump(metadados, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Metadados gerados: {arquivo_metadados}")
            return metadados
            
        except Exception as e:
            logger.error(f"Erro ao gerar metadados para {periodo}: {e}")
            return {}
    
    def _calcular_hash_arquivo(self, arquivo_path: Path) -> str:
        """Calcula hash MD5 de um arquivo"""
        hash_md5 = hashlib.md5()
        with open(arquivo_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    
    def verificacao_mensal_completa(self, periodo: str, arquivos_origem: List[str]) -> Dict:
        """
        Executa verificação mensal completa para um período
        """
        logger.info(f"Iniciando verificação mensal para período {periodo}")
        
        resultado = {
            'periodo': periodo,
            'inicio': datetime.now().isoformat(),
            'sucesso': False,
            'arquivos_processados': [],
            'erros_gerais': []
        }
        
        try:
            # 1. Criar tabela mensal
            if not self.criar_tabela_mensal(periodo):
                resultado['erros_gerais'].append("Falha ao criar tabela mensal")
                return resultado
            
            # 2. Processar arquivos
            for arquivo in arquivos_origem:
                if Path(arquivo).exists():
                    resultado_arquivo = self.processar_arquivo_mensal(arquivo, periodo)
                    resultado['arquivos_processados'].append(resultado_arquivo)
                else:
                    resultado['erros_gerais'].append(f"Arquivo não encontrado: {arquivo}")
            
            # 3. Gerar backup crítico
            if not self.gerar_backup_criticos(periodo):
                resultado['erros_gerais'].append("Falha ao gerar backup crítico")
            
            # 4. Gerar metadados
            metadados = self.gerar_metadados_periodo(periodo)
            resultado['metadados'] = metadados
            
            # 5. Verificar se houve sucesso geral
            arquivos_com_sucesso = sum(1 for a in resultado['arquivos_processados'] if a['sucesso'])
            if arquivos_com_sucesso > 0:
                resultado['sucesso'] = True
            
            resultado['fim'] = datetime.now().isoformat()
            logger.info(f"Verificação mensal concluída para {periodo}")
            
        except Exception as e:
            resultado['erros_gerais'].append(f"Erro geral na verificação: {str(e)}")
            logger.error(f"Erro na verificação mensal para {periodo}: {e}")
        
        return resultado

# Exemplo de uso
if __name__ == "__main__":
    # Configurações
    DB_PATH = r"G:\Meu Drive\fusione\historico_contencioso.db"
    BACKUP_DIR = r"C:\backup\contingencias"
    
    # Instanciar verificador
    verificador = VerificacaoMensalContingencias(DB_PATH, BACKUP_DIR)
    
    # Exemplo: verificação para janeiro 2025
    periodo = "2025-01"
    arquivos = [
        r"C:\dados\contingencias\01-2025.xlsx",
        r"C:\dados\contingencias\jan-2025.xlsx"
    ]
    
    resultado = verificador.verificacao_mensal_completa(periodo, arquivos)
    
    print("Resultado da verificação mensal:")
    print(json.dumps(resultado, indent=2, ensure_ascii=False))