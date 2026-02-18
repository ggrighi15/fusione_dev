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
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"
    )

@lru_cache()
def get_settings() -> Settings:
    return Settings()
