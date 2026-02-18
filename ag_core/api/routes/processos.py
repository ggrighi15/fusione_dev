from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import Optional
from fc_core.core.database import get_db
from fc_core.core.models import Processo
from fc_core.api.schemas import ProcessoCreate, ProcessoResponse, ProcessoList
from uuid import UUID
from fastapi.responses import FileResponse
from fc_core.reporting.pdf_exporter import gerar_relatorio_processos
from fc_core.reporting.excel_exporter import gerar_relatorio_excel
from pathlib import Path
from datetime import datetime

router = APIRouter()
REPORTS_DIR = Path("outputs/reports")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/", response_model=ProcessoList)
def list_processos(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    situacao: Optional[str] = None,
    natureza: Optional[str] = None,
    risco: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Processo).filter(Processo.deleted_at.is_(None))
    
    if search:
        query = query.filter(
            or_(
                Processo.pasta.ilike(f"%{search}%"),
                Processo.numero_principal.ilike(f"%{search}%")
            )
        )
    
    if situacao:
        query = query.filter(Processo.situacao == situacao)
    
    if natureza:
        query = query.filter(Processo.natureza == natureza)
    
    if risco:
        query = query.filter(Processo.risco_atual == risco)
    
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "total": total,
        "items": items,
        "page": page,
        "page_size": page_size
    }

@router.get("/{processo_id}", response_model=ProcessoResponse)
def get_processo(processo_id: UUID, db: Session = Depends(get_db)):
    processo = db.query(Processo).filter(
        Processo.id == processo_id,
        Processo.deleted_at.is_(None)
    ).first()
    
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    
    return processo

@router.post("/", response_model=ProcessoResponse, status_code=201)
def create_processo(data: ProcessoCreate, db: Session = Depends(get_db)):
    existing = db.query(Processo).filter(Processo.pasta == data.pasta).first()
    if existing:
        raise HTTPException(status_code=400, detail="Pasta já existe")
    
    processo = Processo(**data.dict())
    db.add(processo)
    db.commit()
    db.refresh(processo)
    return processo

@router.put("/{processo_id}", response_model=ProcessoResponse)
def update_processo(processo_id: UUID, data: ProcessoCreate, db: Session = Depends(get_db)):
    processo = db.query(Processo).filter(Processo.id == processo_id).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(processo, key, value)
    
    db.commit()
    db.refresh(processo)
    return processo

@router.delete("/{processo_id}", status_code=204)
def delete_processo(processo_id: UUID, db: Session = Depends(get_db)):
    processo = db.query(Processo).filter(Processo.id == processo_id).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    
    processo.deleted_at = func.now()
    db.commit()
    return None

@router.get("/stats/summary")
def get_stats(db: Session = Depends(get_db)):
    total = db.query(Processo).filter(Processo.deleted_at.is_(None)).count()
    
    por_situacao = db.query(
        Processo.situacao, func.count(Processo.id)
    ).filter(Processo.deleted_at.is_(None)).group_by(Processo.situacao).all()
    
    por_risco = db.query(
        Processo.risco_atual, func.count(Processo.id)
    ).filter(Processo.deleted_at.is_(None)).group_by(Processo.risco_atual).all()
    
    return {
        "total": total,
        "por_situacao": dict(por_situacao),
        "por_risco": dict(por_risco)
    }

@router.get("/export/pdf")
def export_pdf(db: Session = Depends(get_db)):
    processos = db.query(Processo).filter(Processo.deleted_at.is_(None)).all()
    output_path = REPORTS_DIR / f"processos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    gerar_relatorio_processos(processos, str(output_path))
    return FileResponse(output_path, media_type="application/pdf", filename=output_path.name)

@router.get("/export/excel")
def export_excel(db: Session = Depends(get_db)):
    processos = db.query(Processo).filter(Processo.deleted_at.is_(None)).all()
    output_path = REPORTS_DIR / f"processos_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    gerar_relatorio_excel(processos, str(output_path))
    return FileResponse(output_path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=output_path.name)
