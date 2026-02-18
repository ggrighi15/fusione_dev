from datetime import datetime, timezone
from decimal import Decimal
import time
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from fc_core.core.config import Settings, get_settings
from fc_core.core.database import get_db
from fc_core.core.models import LLMGatewayLog
from fc_core.core.security import (
    decode_access_token,
    extract_bearer_token,
    verify_internal_identity_signature,
)
from fc_core.llm_gateway.connectors import (
    ConnectorError,
    call_azure_openai,
    call_local,
    call_openai,
)
from fc_core.llm_gateway.policy import (
    PolicyViolation,
    apply_retention,
    enforce_rate_limits,
    estimate_cost_usd,
    estimate_tokens,
    prepare_prompt,
)
from fc_core.llm_gateway.routing import RouteDecision, select_provider
from fc_core.llm_gateway.schemas import LLMChatRequest, LLMChatResponse, LLMUsage

router = APIRouter()


def _resolve_identity(
    *,
    request: LLMChatRequest,
    settings: Settings,
    authorization: Optional[str],
    x_user_id: Optional[str],
    x_team_id: Optional[str],
    x_identity_timestamp: Optional[str],
    x_identity_signature: Optional[str],
) -> tuple[str, Optional[str], str]:
    token = extract_bearer_token(authorization)
    if token:
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            user = str(payload.get("sub")).strip()
            team = (
                str(payload.get("team_id") or payload.get("tenant_id") or payload.get("org_id") or "").strip()
                or None
            )
            if not team:
                team = (x_team_id or "").strip() or None
            return user, team, "jwt"

    if x_user_id and x_identity_timestamp and x_identity_signature and settings.llm_internal_identity_secret:
        user = x_user_id.strip()
        team = (x_team_id or "").strip()
        if verify_internal_identity_signature(
            method="POST",
            path="/llm/chat",
            user_id=user,
            team_id=team,
            ts=x_identity_timestamp,
            signature=x_identity_signature,
            secret=settings.llm_internal_identity_secret,
            max_skew_seconds=settings.llm_internal_identity_max_skew_seconds,
        ):
            return user, (team or None), "signed_header"

    if not settings.llm_require_trusted_identity:
        if settings.llm_allow_body_identity_fallback and request.user_id:
            return request.user_id.strip(), (request.team_id or "").strip() or None, "body_fallback"
        if x_user_id:
            return x_user_id.strip(), (x_team_id or "").strip() or None, "header_untrusted"

    raise HTTPException(
        status_code=401,
        detail="Trusted identity required. Provide Authorization: Bearer <token> or signed identity headers.",
    )


def _save_log(
    db: Session,
    *,
    user_id: str,
    team_id: Optional[str],
    case_id: Optional[str],
    process_id: Optional[str],
    provider: str,
    model: str,
    route_reason: str,
    prompt_masked: str,
    response_text: Optional[str],
    request_hash: str,
    input_tokens: int,
    output_tokens: int,
    estimated_cost_usd: Decimal,
    latency_ms: int,
    status: str,
    error_message: Optional[str],
    metadata: Dict[str, Any],
) -> None:
    log_row = LLMGatewayLog(
        user_id=user_id,
        team_id=team_id,
        case_id=case_id,
        process_id=process_id,
        provider=provider,
        model=model,
        route_reason=route_reason,
        prompt_masked=prompt_masked,
        response_text=response_text,
        request_hash=request_hash,
        estimated_input_tokens=input_tokens,
        estimated_output_tokens=output_tokens,
        estimated_cost_usd=estimated_cost_usd,
        latency_ms=latency_ms,
        status=status,
        error_message=error_message,
        request_metadata=metadata,
    )
    db.add(log_row)
    db.commit()


@router.post("/llm/chat", response_model=LLMChatResponse)
def llm_chat(
    request: LLMChatRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
    x_user_id: Optional[str] = Header(default=None, alias="X-User-Id"),
    x_team_id: Optional[str] = Header(default=None, alias="X-Team-Id"),
    x_identity_timestamp: Optional[str] = Header(default=None, alias="X-Identity-Timestamp"),
    x_identity_signature: Optional[str] = Header(default=None, alias="X-Identity-Signature"),
):
    if not settings.llm_gateway_enabled:
        raise HTTPException(status_code=503, detail="LLM gateway is disabled.")

    user_id, team_id, identity_source = _resolve_identity(
        request=request,
        settings=settings,
        authorization=authorization,
        x_user_id=x_user_id,
        x_team_id=x_team_id,
        x_identity_timestamp=x_identity_timestamp,
        x_identity_signature=x_identity_signature,
    )

    masked_prompt, request_hash = prepare_prompt(user_id=user_id, team_id=team_id, prompt=request.prompt)
    metadata = dict(request.metadata or {})
    metadata["identity_source"] = identity_source

    provider = "n/a"
    model = request.model_override or "n/a"
    route_reason = "unrouted"
    response_text: Optional[str] = None
    input_tokens = estimate_tokens(request.prompt)
    output_tokens = 0
    estimated_cost = Decimal("0")

    started = time.perf_counter()
    try:
        apply_retention(db, settings)
        enforce_rate_limits(db, settings, user_id=user_id, team_id=team_id)

        decision: RouteDecision = select_provider(settings, request)
        provider = decision.provider
        model = decision.model
        route_reason = decision.reason

        if settings.llm_gateway_mock_mode:
            response_text = f"[mock:{provider}] {request.prompt[:500]}"
            output_tokens = estimate_tokens(response_text)
        elif provider == "openai":
            result = call_openai(settings, request, model=model)
            response_text = result.text
            if result.input_tokens > 0:
                input_tokens = result.input_tokens
            output_tokens = result.output_tokens if result.output_tokens > 0 else estimate_tokens(response_text)
        elif provider == "azure":
            result = call_azure_openai(settings, request, model=model)
            response_text = result.text
            if result.input_tokens > 0:
                input_tokens = result.input_tokens
            output_tokens = result.output_tokens if result.output_tokens > 0 else estimate_tokens(response_text)
        else:
            result = call_local(settings, request, model=model)
            response_text = result.text
            if result.input_tokens > 0:
                input_tokens = result.input_tokens
            output_tokens = result.output_tokens if result.output_tokens > 0 else estimate_tokens(response_text)
        estimated_cost = estimate_cost_usd(settings, provider, input_tokens, output_tokens)

        latency_ms = int((time.perf_counter() - started) * 1000)
        _save_log(
            db,
            user_id=user_id,
            team_id=team_id,
            case_id=request.case_id,
            process_id=request.process_id,
            provider=provider,
            model=model,
            route_reason=route_reason,
            prompt_masked=masked_prompt,
            response_text=response_text,
            request_hash=request_hash,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost_usd=estimated_cost,
            latency_ms=latency_ms,
            status="ok",
            error_message=None,
            metadata=metadata,
        )

        return LLMChatResponse(
            provider=provider,
            model=model,
            answer=response_text,
            route_reason=route_reason,
            request_hash=request_hash,
            estimated_cost_usd=float(estimated_cost),
            usage=LLMUsage(
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=input_tokens + output_tokens,
            ),
            latency_ms=latency_ms,
            timestamp_utc=datetime.now(timezone.utc),
        )

    except PolicyViolation as exc:
        latency_ms = int((time.perf_counter() - started) * 1000)
        _save_log(
            db,
            user_id=user_id,
            team_id=team_id,
            case_id=request.case_id,
            process_id=request.process_id,
            provider=provider,
            model=model,
            route_reason=route_reason,
            prompt_masked=masked_prompt,
            response_text=None,
            request_hash=request_hash,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost_usd=Decimal("0"),
            latency_ms=latency_ms,
            status="blocked",
            error_message=str(exc),
            metadata=metadata,
        )
        raise HTTPException(status_code=429, detail=str(exc)) from exc

    except (ValueError, ConnectorError) as exc:
        latency_ms = int((time.perf_counter() - started) * 1000)
        _save_log(
            db,
            user_id=user_id,
            team_id=team_id,
            case_id=request.case_id,
            process_id=request.process_id,
            provider=provider,
            model=model,
            route_reason=route_reason,
            prompt_masked=masked_prompt,
            response_text=None,
            request_hash=request_hash,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost_usd=Decimal("0"),
            latency_ms=latency_ms,
            status="error",
            error_message=str(exc),
            metadata=metadata,
        )
        raise HTTPException(status_code=502, detail=str(exc)) from exc
