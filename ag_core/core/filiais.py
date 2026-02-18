import json
import re
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class Filial:
    indice: int
    nome: str
    cnpj: Optional[str]
    cnpj_conv: Optional[str]
    nome_maiusculo: str
    codigo_empresa: Optional[str] = None # Codigo Empresa Vipal (ex: 0001, 0345)

class FilialManager:
    def __init__(self, json_path: str = None):
        if json_path is None:
            # Default to the ingested location relative to this file
            # fc_core/core/filiais.py -> fc_core/data/reference/clientes.json
            base_path = Path(__file__).parent.parent
            json_path = base_path / "data" / "reference" / "clientes.json"
        
        self.json_path = Path(json_path)
        self.filiais: List[Filial] = []
        self._cnpj_index: Dict[str, Filial] = {}
        self._name_index: Dict[str, Filial] = {}
        self._code_index: Dict[str, Filial] = {}
        
        self.load_data()

    def load_data(self):
        if not self.json_path.exists():
            print(f"Warning: Reference file not found at {self.json_path}")
            return

        try:
            with open(self.json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            for item in data:
                filial = Filial(
                    indice=item.get("Índice"),
                    nome=item.get("Clientes"),
                    cnpj=item.get("CPF_CNPJ"),
                    cnpj_conv=str(item.get("CPF_CNPJ_Conv")) if item.get("CPF_CNPJ_Conv") else None,
                    nome_maiusculo=item.get("Clientes_Maiusc"),
                    codigo_empresa=item.get("Codigo_Empresa")
                )
                self.filiais.append(filial)
                
                # Indexing
                if filial.cnpj_conv:
                    # Normalize CNPJ (digits only) just in case
                    # The JSON has float-like strings sometimes "123.0", need to handle
                    raw_val = str(filial.cnpj_conv).split('.')[0]
                    clean_cnpj = re.sub(r'\D', '', raw_val)
                    self._cnpj_index[clean_cnpj] = filial
                
                if filial.nome_maiusculo:
                    self._name_index[filial.nome_maiusculo] = filial
                
                if filial.codigo_empresa:
                    self._code_index[filial.codigo_empresa] = filial
                    
        except Exception as e:
            print(f"Error loading filiais data: {e}")

    def get_by_cnpj(self, cnpj: str) -> Optional[Filial]:
        if not cnpj:
            return None
        # Handle input like "12.345.678/0001-90" or "12345678000190"
        clean_cnpj = re.sub(r'\D', '', str(cnpj))
        return self._cnpj_index.get(clean_cnpj)

    def get_by_name(self, name: str) -> Optional[Filial]:
        if not name:
            return None
        return self._name_index.get(name.upper())

    def get_by_code(self, code: str) -> Optional[Filial]:
        if not code:
            return None
        return self._code_index.get(code)

    def get_all(self) -> List[Filial]:
        return self.filiais

    def get_client_code(self, filial: Filial) -> str:
        """Retorna o código para pastas. Prioriza codigo_empresa se existir."""
        if filial.codigo_empresa:
            return filial.codigo_empresa
        # Fallback para 0001 se for Vipal (assumindo que Vipal tem CNPJ raiz conhecido ou nome)
        return "0001"
