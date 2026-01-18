import json
import re

def search_code(code_str):
    with open('c:/fusionecore-suite/fc_core/data/reference/clientes.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    print(f"Searching for {code_str} in {len(data)} records...")
    
    found = False
    for item in data:
        # Check all values
        raw = str(item).lower()
        if code_str in raw:
            print(f"MATCH for {code_str}: {item}")
            found = True
            
        # Specific check for CNPJ branch
        cnpj = item.get("CPF_CNPJ")
        if cnpj and "/" in cnpj:
            branch = cnpj.split("/")[1].split("-")[0]
            if branch == code_str or branch == code_str.zfill(4):
                print(f"MATCH BRANCH {branch}: {item['Clientes']}")
                found = True

    if not found:
        print(f"No match for {code_str}")

if __name__ == "__main__":
    search_code("0345")
    search_code("0278")
    search_code("0306")
    search_code("345")
    search_code("278")
    search_code("306")
