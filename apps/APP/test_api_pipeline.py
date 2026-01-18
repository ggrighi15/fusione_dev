import os
import sys
from unittest.mock import patch, AsyncMock

# Setup Env Vars needed for Settings
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/db"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"
os.environ["SECRET_KEY"] = "super-secret-key"

# Add project root to path
sys.path.append(r"c:\fusionecore-suite")

# Import after env vars are set
from fastapi.testclient import TestClient
from fc_core.api.main import app

client = TestClient(app)

@patch("fc_core.api.routes.pipeline.Orchestrator")
def test_pipeline_endpoint(MockOrchestrator):
    # Setup mock
    mock_instance = MockOrchestrator.return_value
    mock_instance.run_pipeline = AsyncMock()

    payload = {
        "target_id": "0000000-00.2024.8.13.0000",
        "sources": ["pje"],
        "fetch_related": False,
        "client_code": "0345" # Test with our specific client
    }

    print("Sending POST request to /api/pipeline/run ...")
    response = client.post("/api/pipeline/run", json=payload)

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    if response.status_code == 202:
        print("✅ Endpoint success! (Status 202 Accepted)")
    else:
        print(f"❌ Endpoint failed! Status: {response.status_code}")

if __name__ == "__main__":
    try:
        test_pipeline_endpoint()
    except Exception as e:
        print(f"❌ Error running test: {e}")
