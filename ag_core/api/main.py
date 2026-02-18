from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fc_core.core.config import get_settings
from fc_core.api.routes import auth, processos, documentos

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(processos.router, prefix="/api/processos", tags=["processos"])
app.include_router(documentos.router, prefix="/api/documentos", tags=["documentos"])

@app.get("/")
def root():
    return {"message": "FusionCore-Suite API v2.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

from fc_core.api.routes import integracoes
app.include_router(integracoes.router, prefix="/api/integracoes", tags=["integracoes"])

from fc_core.api.routes import ocr_ia
app.include_router(ocr_ia.router, prefix="/api/ocr-ia", tags=["ocr-ia"])


# Pipeline / Orchestrator Router
from fc_core.api.routes import pipeline
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])