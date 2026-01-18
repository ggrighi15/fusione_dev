import json

# Mapping extracted from the provided image
# Key: Índice (int), Value: Código Empresa Vipal (str)
image_mapping = {
    1: "0000",
    2: "1673",
    3: "1887",
    4: "1265",
    5: "1906",
    6: "1886",
    7: "0008",
    9: "0000",
    11: "0368",
    12: "1907",
    14: "0278",
    16: "0001",
    42: "0345",
    43: "0075",
    44: "1869",
    45: "1510",
    47: "0432",
    51: "1567",
    52: "1670",
    53: "0010",
    54: "1605",
    80: "1261",
    81: "1672",
    82: "1894",
    83: "0006",
    84: "1610",
    85: "0004",
    86: "0002",
    87: "1671",
    88: "1844",
    91: "1902",
    92: "1263",
    93: "0012",
    95: "0007",
    96: "1264",
    97: "1909",
    98: "1262",
    99: "1770",
    102: "0003",
    103: "1900",
    104: "0009",
    105: "0741",
    107: "1871",
    108: "1868",
    109: "0322",
    110: "0702",
    111: "0014",
    112: "0306",
    116: "0307"
}

file_path = 'c:/fusionecore-suite/fc_core/data/reference/clientes.json'

def patch_clientes():
    print(f"Reading {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    updated_count = 0
    for item in data:
        idx = item.get("Índice")
        if idx in image_mapping:
            item["Codigo_Empresa"] = image_mapping[idx]
            updated_count += 1
            
    print(f"Updated {updated_count} records with Codigo_Empresa.")
    
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print("File saved.")

if __name__ == "__main__":
    patch_clientes()
