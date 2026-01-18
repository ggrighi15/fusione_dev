from sqlalchemy import Column, String, Boolean, DateTime, Text, DECIMAL, JSON, ForeignKey
from sqlalchemy.types import Uuid
from sqlalchemy.sql import func
from fc_core.core.database import Base
import uuid

class User(Base):
    __tablename__ = "users"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Processo(Base):
    __tablename__ = "processos"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pasta = Column(String(100), unique=True, nullable=False)
    numero_principal = Column(String(50))
    # SQLite não suporta ARRAY nativo, usamos JSON
    numeros_extra = Column(JSON) 
    situacao = Column(String(50))
    natureza = Column(String(50))
    
    # Campos de Relatório Solicitados
    cliente = Column(String(255))   # Mapped to #Cliente
    categoria = Column(String(100)) # Mapped to #Categoria
    polo = Column(String(50))       # Mapped to Polo
    risco_atual = Column(String(50))# Mapped to #Risco
    
    valor_causa = Column(DECIMAL(15, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    deleted_at = Column(DateTime(timezone=True))

class Documento(Base):
    __tablename__ = "documentos"
    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    processo_id = Column(Uuid(as_uuid=True), ForeignKey('processos.id'))
    nome_arquivo = Column(String(500), nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    mime_type = Column(String(100))
    storage_backend = Column(String(20), default='filesystem')
    storage_path = Column(Text, nullable=False)
    tamanho_bytes = Column(DECIMAL)
    texto_extraido = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
