from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import FieldValidationInfo, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.desktop import CONFIG_NAMESPACE

DEFAULT_DATA_DIR = Path.home() / f".{CONFIG_NAMESPACE}" / "data"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    project_name: str = "Parking Allocator"
    api_prefix: str = "/api"
    environment: Literal["local", "dev", "prod", "docker", "desktop"] = "local"
    data_dir: str = str(DEFAULT_DATA_DIR)
    database_url: str | None = None
    db_echo: bool = False

    @field_validator("data_dir", mode="after")
    @classmethod
    def _expand_data_dir(cls, value: str) -> str:
        path = Path(value).expanduser().resolve()
        path.mkdir(parents=True, exist_ok=True)
        return str(path)

    @field_validator("database_url", mode="before")
    @classmethod
    def _default_database_url(cls, value: str | None, info: FieldValidationInfo) -> str:
        if value:
            return value

        raw_data_dir = info.data.get("data_dir", str(DEFAULT_DATA_DIR))
        data_dir = Path(raw_data_dir).expanduser().resolve()
        data_dir.mkdir(parents=True, exist_ok=True)
        return f"sqlite+aiosqlite:///{data_dir / 'parking.db'}"

    @property
    def data_dir_path(self) -> Path:
        return Path(self.data_dir)


@lru_cache
def get_settings() -> Settings:
    return Settings()


def reload_settings() -> Settings:
    get_settings.cache_clear()
    new_settings = get_settings()
    globals()["settings"] = new_settings
    return new_settings


settings = get_settings()
