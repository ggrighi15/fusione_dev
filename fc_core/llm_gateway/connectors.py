import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Dict

from fc_core.core.config import Settings
from fc_core.llm_gateway.schemas import LLMChatRequest


@dataclass
class ConnectorResponse:
    text: str
    input_tokens: int
    output_tokens: int


class ConnectorError(Exception):
    pass


def _post_json(url: str, headers: Dict[str, str], body: Dict, timeout_seconds: int) -> Dict:
    payload = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url=url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as response:
            content = response.read().decode("utf-8")
            return json.loads(content)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise ConnectorError(f"HTTP {exc.code} from provider: {detail}") from exc
    except urllib.error.URLError as exc:
        raise ConnectorError(f"Connection error: {exc.reason}") from exc


def _parse_openai_usage(data: Dict) -> tuple[int, int]:
    usage = data.get("usage") or {}
    in_tokens = int(usage.get("prompt_tokens") or usage.get("input_tokens") or 0)
    out_tokens = int(usage.get("completion_tokens") or usage.get("output_tokens") or 0)
    return in_tokens, out_tokens


def _parse_openai_text(data: Dict) -> str:
    choices = data.get("choices") or []
    if not choices:
        raise ConnectorError("Provider returned empty choices.")
    message = choices[0].get("message") or {}
    text = message.get("content")
    if isinstance(text, list):
        # Some providers return rich content blocks.
        text = " ".join(str(part.get("text", "")) for part in text if isinstance(part, dict))
    if not text:
        raise ConnectorError("Provider returned empty content.")
    return str(text)


def call_openai(settings: Settings, request: LLMChatRequest, model: str) -> ConnectorResponse:
    url = settings.llm_openai_base_url.rstrip("/") + "/v1/chat/completions"
    body = {
        "model": model,
        "messages": [{"role": "user", "content": request.prompt}],
        "temperature": request.temperature,
        "max_tokens": request.max_output_tokens,
    }
    headers = {
        "Authorization": f"Bearer {settings.llm_openai_api_key}",
        "Content-Type": "application/json",
    }
    data = _post_json(url, headers, body, timeout_seconds=settings.llm_gateway_timeout_seconds)
    text = _parse_openai_text(data)
    in_tokens, out_tokens = _parse_openai_usage(data)
    return ConnectorResponse(text=text, input_tokens=in_tokens, output_tokens=out_tokens)


def call_azure_openai(settings: Settings, request: LLMChatRequest, model: str) -> ConnectorResponse:
    deployment = settings.llm_azure_deployment
    base = settings.llm_azure_endpoint.rstrip("/")
    api_version = settings.llm_azure_api_version
    path = f"/openai/deployments/{urllib.parse.quote(deployment)}/chat/completions"
    url = f"{base}{path}?api-version={urllib.parse.quote(api_version)}"
    body = {
        "messages": [{"role": "user", "content": request.prompt}],
        "temperature": request.temperature,
        "max_tokens": request.max_output_tokens,
    }
    # Azure usually routes by deployment, but keep model for compatible gateways.
    if model:
        body["model"] = model

    headers = {
        "api-key": settings.llm_azure_api_key,
        "Content-Type": "application/json",
    }
    data = _post_json(url, headers, body, timeout_seconds=settings.llm_gateway_timeout_seconds)
    text = _parse_openai_text(data)
    in_tokens, out_tokens = _parse_openai_usage(data)
    return ConnectorResponse(text=text, input_tokens=in_tokens, output_tokens=out_tokens)


def call_local(settings: Settings, request: LLMChatRequest, model: str) -> ConnectorResponse:
    # Local provider follows OpenAI-compatible /v1/chat/completions by default.
    base = settings.llm_local_base_url.rstrip("/")
    url = base + "/v1/chat/completions"
    body = {
        "model": model,
        "messages": [{"role": "user", "content": request.prompt}],
        "temperature": request.temperature,
        "max_tokens": request.max_output_tokens,
    }
    headers = {"Content-Type": "application/json"}
    if settings.llm_local_api_key:
        headers["Authorization"] = f"Bearer {settings.llm_local_api_key}"

    data = _post_json(url, headers, body, timeout_seconds=settings.llm_gateway_timeout_seconds)
    text = _parse_openai_text(data)
    in_tokens, out_tokens = _parse_openai_usage(data)
    return ConnectorResponse(text=text, input_tokens=in_tokens, output_tokens=out_tokens)

