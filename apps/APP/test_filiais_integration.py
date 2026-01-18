import sys
import os
import asyncio

# Set environment variables for testing BEFORE importing config
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0" # Dummy
os.environ["SECRET_KEY"] = "test_secret_key"

# Add root to path so we can import fc_core
sys.path.append("c:/fusionecore-suite")

from fc_core.core.filiais import FilialManager
from fc_core.automation.orchestrator import Orchestrator, ScrapingRequest, DataSource
from fc_core.core.database import Base, engine

# Ensure DB tables exist
Base.metadata.create_all(bind=engine)

async def main():
    print(">>> 1. Testando FilialManager...")
    manager = FilialManager()
    print(f"Carregadas {len(manager.get_all())} filiais.")
    
    vipal = manager.get_by_name("Borrachas Vipal S.A.")
    if vipal:
        print(f"Encontrado: {vipal.nome} | CNPJ: {vipal.cnpj}")
    else:
        print("❌ Vipal não encontrada via get_by_name!")
        # Debug names
        # print([f.nome for f in manager.get_all()[:5]])

    print("\n>>> 2. Testando Orquestrador com Integração...")
    try:
        orch = Orchestrator()
        
        # CNJ de teste novo para garantir nova pasta
        import random
        cnj = f"500{random.randint(1000,9999)}-88.2025.8.13.0000"
        
        req = ScrapingRequest(
            target_id=cnj,
            sources=[DataSource.PJE], # O mock do PJE retorna "Borrachas Vipal S.A." como parte
            fetch_related=False
        )
        
        print(f"Executando pipeline para {cnj}...")
        result = await orch.run_pipeline(req)
        
        print("\n>>> 3. Verificando Resultado...")
        
        from fc_core.core.database import SessionLocal
        from fc_core.core.models import Processo
        
        db = SessionLocal()
        proc = db.query(Processo).filter(Processo.numero_principal == cnj).first()
        if proc:
            print(f"✅ Processo salvo! Pasta: {proc.pasta}")
            # Esperado: 0001.3.XXXXX (0001=Vipal, 3=Contencioso default)
            if proc.pasta.startswith("0001.3."):
                 print("✅ Formato da pasta CORRETO (0001.3.XXXXX)")
            else:
                 print(f"❌ Formato da pasta INCORRETO: {proc.pasta}")
        else:
            print("❌ Processo não encontrado no banco.")
        db.close()
    except Exception as e:
        print(f"❌ Erro durante teste do orquestrador: {e}")

if __name__ == "__main__":
    asyncio.run(main())
