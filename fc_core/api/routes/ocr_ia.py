from fastapi import APIRouter, UploadFile, File, Depends
from sqlalchemy.orm import Session
from fc_core.core.database import get_db
from fc_core.ingestion.ocr.ocr_service import OCRService
from fc_core.ingestion.ocr.ner_service import NERService
from fc_core.analysis.llm_service import OllamaService
from fc_core.analysis.vector_store import VectorStore
from pathlib import Path
import aiofiles
from uuid import uuid4

router = APIRouter()

ocr_service = OCRService()
ner_service = NERService()
llm_service = OllamaService()
vector_store = VectorStore()

TEMP_DIR = Path("outputs/temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/ocr")
async def processar_ocr(file: UploadFile = File(...)):
    """Processa OCR em documento"""
    temp_path = TEMP_DIR / f"{uuid4()}_{file.filename}"
    
    try:
        async with aiofiles.open(temp_path, "wb") as f:
            content = await file.read()
            await f.write(content)
        
        resultado = ocr_service.processar_documento(str(temp_path))
        
        if resultado["success"]:
            entidades = ner_service.extrair_entidades_juridicas(resultado["texto"])
            resultado["entidades"] = entidades
        
        return resultado
    
    finally:
        if temp_path.exists():
            temp_path.unlink()

@router.post("/analisar")
async def analisar_documento(file: UploadFile = File(...)):
    """Analisa documento com IA"""
    temp_path = TEMP_DIR / f"{uuid4()}_{file.filename}"
    
    try:
        async with aiofiles.open(temp_path, "wb") as f:
            content = await file.read()
            await f.write(content)
        
        resultado_ocr = ocr_service.processar_documento(str(temp_path))
        
        if not resultado_ocr["success"]:
            return resultado_ocr
        
        texto = resultado_ocr["texto"]
        analise = llm_service.analisar_documento_juridico(texto)
        resumo = llm_service.resumir_texto(texto)
        
        return {
            "success": True,
            "texto": texto[:500] + "...",
            "analise": analise,
            "resumo": resumo
        }
    
    finally:
        if temp_path.exists():
            temp_path.unlink()

@router.post("/buscar-similares")
def buscar_similares(query: str, n_results: int = 5):
    """Busca documentos similares"""
    resultados = vector_store.buscar_similares(query, n_results)
    return {"resultados": resultados}
