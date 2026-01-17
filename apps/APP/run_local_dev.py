import os
import sys
import subprocess
import time
from pathlib import Path

# Configuração
PROJECT_ROOT = Path("C:/fusionecore-suite")
os.chdir(PROJECT_ROOT)

def log(msg, color="white"):
    print(f"[FUSIONECORE] {msg}")

def install_dependencies():
    log("Instalando dependências Python...", "cyan")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-e", ".[dev]"])
        log("Dependências instaladas!", "green")
    except subprocess.CalledProcessError as e:
        log(f"Erro ao instalar dependências: {e}", "red")

def configure_local_env():
    log("Configurando ambiente local (SQLite)...", "cyan")
    
    env_file = PROJECT_ROOT / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = ""

    if "DATABASE_URL=postgresql" in content:
        content = content.replace(
            "DATABASE_URL=\"postgresql://fusionecore:fc_dev_2024@localhost:5432/fusionecore\"",
            "DATABASE_URL=\"sqlite:///./fusionecore.db\""
        )
        log("DATABASE_URL atualizada para SQLite", "green")
    elif "sqlite" not in content:
         if "DATABASE_URL=" not in content:
             content += '\nDATABASE_URL="sqlite:///./fusionecore.db"\n'

    with open(env_file, "w", encoding="utf-8") as f:
        f.write(content)

def init_db():
    log("Inicializando banco de dados...", "cyan")
    try:
        from fc_core.core.database import engine, Base
        from fc_core.core import models 
        Base.metadata.create_all(bind=engine)
        log("Tabelas criadas com sucesso!", "green")
    except ImportError as e:
        log(f"Erro ao importar módulos: {e}", "red")
    except Exception as e:
        log(f"Erro ao criar tabelas: {e}", "red")

def run_backend():
    log("Iniciando Backend (FastAPI)...", "green")
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "fc_core.api.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
        cwd=PROJECT_ROOT
    )

def run_frontend():
    log("Iniciando Frontend (Vite)...", "green")
    frontend_dir = PROJECT_ROOT / "frontend"
    
    if not (frontend_dir / "node_modules").exists():
        log("Instalando dependências do Frontend...", "cyan")
        try:
            # Força instalação ignorando workspaces da raiz se houver
            subprocess.check_call("npm install --no-workspaces", cwd=frontend_dir, shell=True)
        except Exception as e:
            log(f"Erro no npm install: {e}. Tentando 'npm install' simples...", "yellow")
            try:
                 subprocess.check_call("npm install", cwd=frontend_dir, shell=True)
            except Exception as e2:
                 log(f"Falha total no npm install: {e2}", "red")
    
    # Roda Vite
    return subprocess.Popen("npm run dev", cwd=frontend_dir, shell=True)

def main():
    log("🚀 Iniciando Modo de Desenvolvimento Local", "magenta")
    
    sys.path.append(str(PROJECT_ROOT))
    
    # install_dependencies() # Já instalamos, pular para ganhar tempo
    configure_local_env()
    init_db()
    
    p_backend = run_backend()
    p_frontend = run_frontend()
    
    log("\n✅ Serviços iniciados!", "green")
    log("   Backend API: http://localhost:8000/docs")
    log("   Frontend:    http://localhost:5173")
    log("\n(Pressione Ctrl+C para parar)")
    
    try:
        while True:
            time.sleep(1)
            if p_backend.poll() is not None:
                log("Backend parou inesperadamente!", "red")
                break
    except KeyboardInterrupt:
        log("Parando serviços...", "yellow")
        p_backend.terminate()
        p_frontend.terminate()

if __name__ == "__main__":
    main()
