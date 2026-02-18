import requests
import pandas as pd
from pathlib import Path
from datetime import datetime
import logging
from typing import Dict, Any, Optional
import time

logger = logging.getLogger(__name__)

class InstagramScraper:
    """Extrator automatizado genérico para dados do Instagram via API Local"""
    
    def __init__(self, target_username: str, login_username: str, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url
        self.target_username = target_username
        self.login_username = login_username
        self.output_dir = Path("outputs/scrapers/instagram") / target_username
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"InstagramScraper inicializado para alvo: {self.target_username} (Login: {self.login_username})")
    
    def check_api_status(self) -> bool:
        """Verifica se a API Instagram está disponível"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            return response.status_code == 200
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao conectar com API Instagram: {e}")
            return False
    
    def extract(self, password: str, code_2fa: str = "") -> Dict[str, Any]:
        """Executa a extração dos dados"""
        logger.info(f"Iniciando extração para {self.target_username}...")
        
        form_data = {
            "username": self.login_username,
            "password": password,
            "target": self.target_username,
            "code": code_2fa
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/export",
                data=form_data,
                timeout=300
            )
            
            if response.status_code == 200:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"{self.target_username}_data_{timestamp}.xlsx"
                filepath = self.output_dir / filename
                
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                
                logger.info(f"Dados salvos em: {filepath}")
                return {
                    "success": True,
                    "filepath": str(filepath),
                    "timestamp": timestamp
                }
            
            elif response.status_code == 401:
                return {"success": False, "error": "2FA_REQUIRED", "message": "Autenticação de dois fatores necessária"}
            
            else:
                return {"success": False, "error": "HTTP_ERROR", "status": response.status_code}
                
        except Exception as e:
            logger.error(f"Erro na extração: {e}")
            return {"success": False, "error": "EXCEPTION", "message": str(e)}

    def analyze(self, filepath: str) -> Dict[str, Any]:
        """Analisa o arquivo Excel extraído"""
        try:
            df_dict = pd.read_excel(filepath, sheet_name=None)
            stats = {
                "sheets": list(df_dict.keys()),
                "total_records": 0
            }
            
            for name, df in df_dict.items():
                stats[name] = len(df)
                stats["total_records"] += len(df)
                
            return {"success": True, "stats": stats}
        except Exception as e:
            return {"success": False, "error": str(e)}
