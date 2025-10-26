from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "Parking Allocator"
    api_prefix: str = "/api"
    environment: Literal["local", "dev", "prod", "docker"] = "local"
    database_url: str = "sqlite+aiosqlite:///./parking.db"
    db_echo: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
