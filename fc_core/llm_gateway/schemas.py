from datetime import datetime
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


ProviderName = Literal["openai", "azure", "local"]
ConfidentialityLevel = Literal["low", "medium", "high"]
UrgencyLevel = Literal["low", "normal", "high"]


class LLMChatRequest(BaseModel):
    user_id: Optional[str] = Field(default=None, max_length=120)
    team_id: Optional[str] = Field(default=None, max_length=120)
    case_id: Optional[str] = Field(default=None, max_length=120)
    process_id: Optional[str] = Field(default=None, max_length=120)

    prompt: str = Field(min_length=1)
    confidentiality: ConfidentialityLevel = "medium"
    urgency: UrgencyLevel = "normal"
    prefer_low_cost: bool = False
    provider_override: Optional[ProviderName] = None
    model_override: Optional[str] = None
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    max_output_tokens: int = Field(default=800, ge=64, le=8000)

    metadata: Dict[str, Any] = Field(default_factory=dict)


class LLMUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


class LLMChatResponse(BaseModel):
    provider: ProviderName
    model: str
    answer: str
    route_reason: str
    request_hash: str
    estimated_cost_usd: float
    usage: LLMUsage
    latency_ms: int
    timestamp_utc: datetime

