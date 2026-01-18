import os

MAIN_PATH = r"c:\fusionecore-suite\fc_core\api\main.py"

def patch_main():
    if not os.path.exists(MAIN_PATH):
        print(f"Error: {MAIN_PATH} not found.")
        return

    with open(MAIN_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    if "fc_core.api.routes import pipeline" in content:
        print("Pipeline router already configured.")
        return

    print("Adding pipeline router configuration...")
    
    new_block = (
        "\n\n# Pipeline / Orchestrator Router\n"
        "from fc_core.api.routes import pipeline\n"
        'app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])'
    )
    
    with open(MAIN_PATH, "a", encoding="utf-8") as f:
        f.write(new_block)
    
    print("Successfully patched main.py with pipeline router.")

if __name__ == "__main__":
    patch_main()
