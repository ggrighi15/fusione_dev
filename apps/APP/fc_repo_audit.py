import os
import hashlib
import json
import re
import ast
from pathlib import Path
from collections import defaultdict
from datetime import datetime
import difflib

# Configuração
IGNORE_DIRS = {
    'venv', '.venv', 'env', '.env', 'node_modules', '.git', '__pycache__', 
    'site-packages', 'dist', 'build', '.idea', '.vscode', 'outputs', 'coverage', '.pytest_cache'
}
IGNORE_EXTS = {'.pyc', '.pyo', '.pyd', '.so', '.dll', '.exe', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.rar'}

class RepoAuditor:
    def __init__(self, root_path):
        self.root = Path(root_path).resolve()
        self.stats = {
            'total_files': 0,
            'python_files': 0,
            'total_size': 0,
            'duplicates_exact': 0,
            'duplicates_name_pattern': 0
        }
        self.files_by_hash = defaultdict(list)
        self.files_by_name_pattern = defaultdict(list)
        self.imports_map = defaultdict(set)
        
    def should_ignore(self, path):
        # Verifica se algum diretório pai está na lista de ignorados
        parts = path.parts
        for part in parts:
            if part in IGNORE_DIRS:
                return True
        if path.suffix in IGNORE_EXTS:
            return True
        return False

    def get_file_hash(self, path):
        hasher = hashlib.md5()
        try:
            with open(path, 'rb') as f:
                buf = f.read(65536)
                while len(buf) > 0:
                    hasher.update(buf)
                    buf = f.read(65536)
            return hasher.hexdigest()
        except Exception:
            return None

    def analyze_imports(self, path):
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                tree = ast.parse(f.read())
            
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        self.imports_map[str(path)].add(alias.name)
                elif isinstance(node, ast.ImportFrom):
                    if node.module:
                        self.imports_map[str(path)].add(node.module)
        except Exception:
            pass

    def check_name_pattern(self, path):
        # Padrões: _v2, _final, (1), -copia, .bkp
        name = path.stem.lower()
        patterns = [
            r'_v\d+', r'_final', r'\(\d+\)', r'_copia', r'_bkp', r'_teste', r'_old'
        ]
        
        for pattern in patterns:
            if re.search(pattern, name):
                # Tenta achar o "pai" original (ex: script_v2 -> script)
                base_name = re.sub(pattern, '', name)
                if base_name:
                    self.files_by_name_pattern[base_name].append(str(path))
                    self.stats['duplicates_name_pattern'] += 1
                    return True
        return False

    def scan(self):
        print(f"Iniciando auditoria em: {self.root}")
        
        for root, dirs, files in os.walk(self.root):
            # Filtra diretórios in-place para não descer em pastas ignoradas
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                path = Path(root) / file
                if self.should_ignore(path):
                    continue
                
                self.stats['total_files'] += 1
                self.stats['total_size'] += path.stat().st_size
                
                # Análise de Hash (Duplicidade Exata)
                file_hash = self.get_file_hash(path)
                if file_hash:
                    self.files_by_hash[file_hash].append(str(path))
                
                # Análise Python Específica
                if path.suffix == '.py':
                    self.stats['python_files'] += 1
                    self.analyze_imports(path)
                    self.check_name_pattern(path)

    def generate_report(self, output_dir):
        out_path = Path(output_dir)
        out_path.mkdir(parents=True, exist_ok=True)
        
        # Processa duplicatas exatas
        duplicates = {k: v for k, v in self.files_by_hash.items() if len(v) > 1}
        self.stats['duplicates_exact'] = len(duplicates)
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'root': str(self.root),
            'stats': self.stats,
            'duplicates_exact': duplicates,
            'versioned_files': dict(self.files_by_name_pattern),
            'imports_map': {k: list(v) for k, v in self.imports_map.items()}
        }
        
        # Salva JSON
        json_path = out_path / 'fc_repo_audit.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
            
        # Gera Markdown
        md_path = out_path / 'fc_repo_audit.md'
        with open(md_path, 'w', encoding='utf-8') as f:
            f.write(f"# Relatório de Auditoria FusionCore\n\n")
            f.write(f"**Data:** {datetime.now().strftime('%d/%m/%Y %H:%M')}\n")
            f.write(f"**Raiz:** `{self.root}`\n\n")
            
            f.write("## 📊 Estatísticas Gerais\n")
            f.write(f"- **Total de Arquivos:** {self.stats['total_files']}\n")
            f.write(f"- **Arquivos Python:** {self.stats['python_files']}\n")
            f.write(f"- **Tamanho Total:** {self.stats['total_size'] / (1024*1024):.2f} MB\n")
            f.write(f"- **Grupos de Duplicatas Exatas:** {len(duplicates)}\n")
            f.write(f"- **Arquivos Versionados (v2, final, etc):** {self.stats['duplicates_name_pattern']}\n\n")
            
            f.write("## 👯 Duplicatas Exatas (Conteúdo Idêntico)\n")
            if not duplicates:
                f.write("_Nenhuma duplicata exata encontrada._\n")
            for h, paths in duplicates.items():
                f.write(f"- **Hash {h[:8]}** ({len(paths)} cópias):\n")
                for p in paths:
                    try:
                        rel_path = os.path.relpath(p, self.root)
                        f.write(f"  - `{rel_path}`\n")
                    except ValueError:
                         f.write(f"  - `{p}`\n")
            
            f.write("\n## 🏷️ Padrões de Versionamento (v2, final, copy)\n")
            if not self.files_by_name_pattern:
                f.write("_Nenhum arquivo versionado encontrado._\n")
            for base, paths in self.files_by_name_pattern.items():
                f.write(f"- **Base provável: `{base}`**\n")
                for p in paths:
                    try:
                        rel_path = os.path.relpath(p, self.root)
                        f.write(f"  - `{rel_path}`\n")
                    except ValueError:
                        f.write(f"  - `{p}`\n")

        print(f"\nRelatório gerado em: {out_path}")
        return json_path, md_path

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="FusionCore Repository Auditor")
    parser.add_argument("--root", default=".", help="Root directory to scan")
    parser.add_argument("--out", default="./outputs/repo_audit", help="Output directory")
    
    args = parser.parse_args()
    
    auditor = RepoAuditor(args.root)
    auditor.scan()
    auditor.generate_report(args.out)
