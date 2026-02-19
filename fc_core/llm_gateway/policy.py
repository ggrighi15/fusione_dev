import hashlib
import math
import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from fc_core.core.config import Settings
from fc_core.core.models import LLMGatewayLog


class PolicyViolation(Exception):
    pass


_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_CPF_RE = re.compile(r"\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b")
_CNPJ_RE = re.compile(r"\b\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}\b")
_PHONE_RE = re.compile(r"\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}\b")


def mask_sensitive_data(text: str) -> str:
    masked = _EMAIL_RE.sub("[EMAIL]", text)
    masked = _CPF_RE.sub("[CPF]", masked)
    masked = _CNPJ_RE.sub("[CNPJ]", masked)
    masked = _PHONE_RE.sub("[PHONE]", masked)
    return masked


def estimate_tokens(text: str) -> int:
    # Coarse estimate compatible with logging/cost governance.
    return max(1, math.ceil(len(text) / 4))


def estimate_cost_usd(
    settings: Settings,
    provider: str,
    input_tokens: int,
    output_tokens: int,
) -> Decimal:
    if provider == "openai":
        in_cost = Decimal(str(settings.llm_openai_cost_in_per_1k))
        out_cost = Decimal(str(settings.llm_openai_cost_out_per_1k))
    elif provider == "azure":
        in_cost = Decimal(str(settings.llm_azure_cost_in_per_1k))
        out_cost = Decimal(str(settings.llm_azure_cost_out_per_1k))
    else:
        in_cost = Decimal(str(settings.llm_local_cost_in_per_1k))
        out_cost = Decimal(str(settings.llm_local_cost_out_per_1k))

    total = (Decimal(input_tokens) / Decimal(1000)) * in_cost
    total += (Decimal(output_tokens) / Decimal(1000)) * out_cost
    return total.quantize(Decimal("0.000001"))


def build_request_hash(user_id: str, team_id: str, prompt: str) -> str:
    payload = f"{user_id}|{team_id}|{prompt}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def enforce_rate_limits(db: Session, settings: Settings, user_id: str, team_id: Optional[str]) -> None:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=1)

    user_count = (
        db.query(func.count(LLMGatewayLog.id))
        .filter(LLMGatewayLog.user_id == user_id, LLMGatewayLog.created_at >= window_start)
        .scalar()
        or 0
    )
    if user_count >= settings.llm_rate_limit_user_per_hour:
        raise PolicyViolation("User rate limit exceeded for the last hour.")

    if team_id:
        team_count = (
            db.query(func.count(LLMGatewayLog.id))
            .filter(LLMGatewayLog.team_id == team_id, LLMGatewayLog.created_at >= window_start)
            .scalar()
            or 0
        )
        if team_count >= settings.llm_rate_limit_team_per_hour:
            raise PolicyViolation("Team rate limit exceeded for the last hour.")


def apply_retention(db: Session, settings: Settings) -> int:
    if settings.llm_log_retention_days <= 0:
        return 0
    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.llm_log_retention_days)
    deleted = (
        db.query(LLMGatewayLog)
        .filter(LLMGatewayLog.created_at < cutoff)
        .delete(synchronize_session=False)
    )
    if deleted:
        db.commit()
    return deleted


def prepare_prompt(
    user_id: str,
    team_id: Optional[str],
    prompt: str,
) -> Tuple[str, str]:
    masked = mask_sensitive_data(prompt)
    hash_value = build_request_hash(user_id=user_id, team_id=team_id or "", prompt=prompt)
    return masked, hash_value

