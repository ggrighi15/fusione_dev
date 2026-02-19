from dataclasses import dataclass
from typing import Dict, List

from fc_core.core.config import Settings
from fc_core.llm_gateway.schemas import LLMChatRequest, ProviderName


@dataclass
class RouteDecision:
    provider: ProviderName
    model: str
    reason: str


def _provider_cost_score(settings: Settings, provider: str) -> float:
    if provider == "openai":
        return settings.llm_openai_cost_in_per_1k + settings.llm_openai_cost_out_per_1k
    if provider == "azure":
        return settings.llm_azure_cost_in_per_1k + settings.llm_azure_cost_out_per_1k
    return settings.llm_local_cost_in_per_1k + settings.llm_local_cost_out_per_1k


def _provider_model(settings: Settings, provider: ProviderName, override: str | None) -> str:
    if override:
        return override
    if provider == "openai":
        return settings.llm_openai_model
    if provider == "azure":
        return settings.llm_azure_model or settings.llm_azure_deployment or "azure-gpt"
    return settings.llm_local_model


def available_providers(settings: Settings) -> Dict[ProviderName, bool]:
    return {
        "openai": bool(settings.llm_openai_api_key),
        "azure": bool(settings.llm_azure_api_key and settings.llm_azure_endpoint and settings.llm_azure_deployment),
        "local": bool(settings.llm_local_base_url),
    }


def _first_available(candidates: List[ProviderName], available: Dict[ProviderName, bool]) -> ProviderName | None:
    for provider in candidates:
        if available.get(provider):
            return provider
    return None


def select_provider(settings: Settings, request: LLMChatRequest) -> RouteDecision:
    available = available_providers(settings)

    if request.provider_override:
        if not available.get(request.provider_override):
            raise ValueError(f"Provider override '{request.provider_override}' is not configured.")
        return RouteDecision(
            provider=request.provider_override,
            model=_provider_model(settings, request.provider_override, request.model_override),
            reason="provider_override",
        )

    if request.confidentiality == "high":
        provider = _first_available(["local", "azure", "openai"], available)
        if not provider:
            raise ValueError("No provider configured for high confidentiality requests.")
        return RouteDecision(
            provider=provider,
            model=_provider_model(settings, provider, request.model_override),
            reason="confidentiality_high",
        )

    if request.urgency == "high":
        urgency_order = [p.strip() for p in settings.llm_urgency_provider_order.split(",") if p.strip()]
        # Ensure known provider names only.
        known = [p for p in urgency_order if p in ("openai", "azure", "local")]
        provider = _first_available(known, available) if known else None
        if provider:
            return RouteDecision(
                provider=provider,
                model=_provider_model(settings, provider, request.model_override),
                reason="urgency_high",
            )

    if request.prefer_low_cost:
        candidates = [p for p, ok in available.items() if ok]
        if not candidates:
            raise ValueError("No provider configured.")
        cheapest = min(candidates, key=lambda p: _provider_cost_score(settings, p))
        return RouteDecision(
            provider=cheapest,
            model=_provider_model(settings, cheapest, request.model_override),
            reason="prefer_low_cost",
        )

    default_provider = settings.llm_default_provider if settings.llm_default_provider in available else "openai"
    if available.get(default_provider):
        provider: ProviderName = default_provider  # type: ignore[assignment]
        return RouteDecision(
            provider=provider,
            model=_provider_model(settings, provider, request.model_override),
            reason="default_provider",
        )

    fallback = _first_available(["openai", "azure", "local"], available)
    if not fallback:
        raise ValueError("No LLM provider configured.")
    return RouteDecision(
        provider=fallback,
        model=_provider_model(settings, fallback, request.model_override),
        reason="fallback_available",
    )

