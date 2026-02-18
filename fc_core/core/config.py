from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    app_name: str = "FusionCore-Suite"
    app_version: str = "2.0.0"
    environment: str = "development"
    debug: bool = True
    
    database_url: str
    redis_url: str
    
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    auto_create_schema_on_startup: bool = False

    # LLM Gateway
    llm_gateway_enabled: bool = True
    llm_gateway_mock_mode: bool = False
    llm_gateway_timeout_seconds: int = 60
    llm_log_retention_days: int = 30
    llm_rate_limit_user_per_hour: int = 60
    llm_rate_limit_team_per_hour: int = 600

    llm_default_provider: str = "openai"
    llm_urgency_provider_order: str = "openai,azure,local"
    llm_require_trusted_identity: bool = True
    llm_allow_body_identity_fallback: bool = False
    llm_internal_identity_secret: str = ""
    llm_internal_identity_max_skew_seconds: int = 300

    llm_openai_api_key: str = ""
    llm_openai_base_url: str = "https://api.openai.com"
    llm_openai_model: str = "gpt-4o-mini"
    llm_openai_cost_in_per_1k: float = 0.00015
    llm_openai_cost_out_per_1k: float = 0.0006

    llm_azure_api_key: str = ""
    llm_azure_endpoint: str = ""
    llm_azure_deployment: str = ""
    llm_azure_api_version: str = "2024-10-21"
    llm_azure_model: str = "azure-gpt"
    llm_azure_cost_in_per_1k: float = 0.0002
    llm_azure_cost_out_per_1k: float = 0.0008

    llm_local_base_url: str = "http://127.0.0.1:11434"
    llm_local_api_key: str = ""
    llm_local_model: str = "llama3.1"
    llm_local_cost_in_per_1k: float = 0.0
    llm_local_cost_out_per_1k: float = 0.0

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )

@lru_cache()
def get_settings() -> Settings:
    return Settings()
