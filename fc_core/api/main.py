import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fc_core.core.config import get_settings
from fc_core.core.database import Base, engine
from fc_core.core import models as _models  # noqa: F401
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

logger = logging.getLogger(__name__)

if settings.enable_ocr_ia:
    try:
        from fc_core.api.routes import ocr_ia
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "ENABLE_OCR_IA=true, but OCR dependencies/modules are missing "
            "(expected fc_core.ingestion.*)."
        ) from exc
    if getattr(ocr_ia, "_OCR_IMPORT_ERROR", None):
        raise RuntimeError(
            "ENABLE_OCR_IA=true, but OCR stack initialization failed: "
            f"{ocr_ia._OCR_IMPORT_ERROR}"
        )
    app.include_router(ocr_ia.router, prefix="/api/ocr-ia", tags=["ocr-ia"])
else:
    logger.info("OCR IA route disabled by ENABLE_OCR_IA=false")


# Pipeline / Orchestrator Router
from fc_core.api.routes import pipeline
app.include_router(pipeline.router, prefix="/api/pipeline", tags=["pipeline"])

from fc_core.api.routes import llm_gateway
app.include_router(llm_gateway.router, tags=["llm-gateway"])


@app.on_event("startup")
def ensure_schema():
    # Keep disabled by default; production should rely on explicit migrations.
    if settings.auto_create_schema_on_startup:
        Base.metadata.create_all(bind=engine)
