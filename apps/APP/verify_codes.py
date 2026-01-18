import sys
import os

# Add root to path so we can import fc_core
sys.path.append("c:/fusionecore-suite")

from fc_core.core.filiais import FilialManager

def identify_clients(codes):
    manager = FilialManager()
    print(f"Loaded {len(manager.get_all())} clients.")
    
    for code in codes:
        filial = manager.get_by_code(code)
        if filial:
            print(f"✅ Code {code} -> {filial.nome}")
        else:
            print(f"❌ Code {code} -> Not Found")

if __name__ == "__main__":
    identify_clients(["0345", "0278", "0306"])
