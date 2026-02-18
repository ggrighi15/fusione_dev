from pydantic import BaseModel, EmailStr, UUID4
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID4
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ProcessoBase(BaseModel):
    pasta: str
    numero_principal: Optional[str] = None
    situacao: Optional[str] = None
    natureza: Optional[str] = None
    categoria: Optional[str] = None
    risco_atual: Optional[str] = None
    valor_causa: Optional[Decimal] = None

class ProcessoCreate(ProcessoBase):
    pass

class ProcessoResponse(ProcessoBase):
    id: UUID4
    created_at: datetime
    
    class Config:
        from_attributes = True

class ProcessoList(BaseModel):
    total: int
    items: List[ProcessoResponse]
    page: int
    page_size: int
