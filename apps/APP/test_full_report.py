import sys
import os
import asyncio
from datetime import datetime

# Environment setup
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["SECRET_KEY"] = "test_secret_key"

sys.path.append("c:/fusionecore-suite")

from fc_core.core.database import Base, engine, SessionLocal
from fc_core.core.models import Processo
from fc_core.automation.orchestrator import Orchestrator, ScrapingRequest, DataSource
from fc_core.reporting.excel_exporter import gerar_relatorio_excel

# Create Tables
Base.metadata.create_all(bind=engine)

async def main():
    print(">>> 1. Executing Pipeline...")
    orch = Orchestrator()
    
    # Simulate a request for a Vipal process
    # Using the code 0345 (Br Plásticos) we identified earlier to test logic
    # But wait, the mock PJe usually returns "Borrachas Vipal".
    # Let's force a client code via request to test that logic.
    
    cnj = "5009999-88.2025.8.13.0000"
    req = ScrapingRequest(
        target_id=cnj,
        sources=[DataSource.PJE],
        fetch_related=False,
        client_code="0345" # Br Plásticos
    )
    
    await orch.run_pipeline(req)
    
    print(">>> 2. Verifying DB Data...")
    db = SessionLocal()
    proc = db.query(Processo).filter(Processo.numero_principal == cnj).first()
    
    if proc:
        print(f"✅ Processo Found: {proc.pasta}")
        print(f"   Cliente: {proc.cliente}")
        print(f"   Categoria: {proc.categoria}")
        print(f"   Polo: {proc.polo}")
        print(f"   Risco: {proc.risco_atual}")
        
        # Test Export
        print(">>> 3. Generating Excel Report...")
        output = f"relatorio_teste_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        gerar_relatorio_excel([proc], output)
        print(f"✅ Report generated at {output}")
        
    else:
        print("❌ Process not found in DB")
        
    db.close()

if __name__ == "__main__":
    asyncio.run(main())
