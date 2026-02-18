from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from fc_core.core.database import get_db
from fc_core.core.models import Documento, Processo
from uuid import UUID
import hashlib
import aiofiles
from pathlib import Path

router = APIRouter()

UPLOAD_DIR = Path("outputs/documents")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/{processo_id}/upload")
async def upload_documento(
    processo_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    processo = db.query(Processo).filter(Processo.id == processo_id).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    
    content = await file.read()
    sha256_hash = hashlib.sha256(content).hexdigest()
    
    existing = db.query(Documento).filter(
        Documento.processo_id == processo_id,
        Documento.sha256_hash == sha256_hash
    ).first()
    
    if existing:
        return {"message": "Documento já existe", "id": str(existing.id)}
    
    file_path = UPLOAD_DIR / f"{sha256_hash}_{file.filename}"
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    
    documento = Documento(
        processo_id=processo_id,
        nome_arquivo=file.filename,
        sha256_hash=sha256_hash,
        mime_type=file.content_type,
        storage_backend="filesystem",
        storage_path=str(file_path),
        tamanho_bytes=len(content)
    )
    
    db.add(documento)
    db.commit()
    db.refresh(documento)
    
    return {"message": "Upload concluído", "id": str(documento.id)}

@router.get("/{processo_id}/documentos")
def list_documentos(processo_id: UUID, db: Session = Depends(get_db)):
    documentos = db.query(Documento).filter(Documento.processo_id == processo_id).all()
    return documentos
