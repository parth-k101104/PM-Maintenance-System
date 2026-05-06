from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_LOCAL_DATABASE_URL = "postgresql://postgres:root@localhost:5433/pm_db"


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables / .env file.

    Only infrastructure and security concerns live here.
    Analytics tuning parameters (warn_threshold_ratio, stable_slope_epsilon,
    anomaly_velocity_ratio, etc.) are now stored in the ``config_param`` DB table
    and loaded at runtime via :func:`app.repository.fetch_analytics_config`.
    """
    database_url: str = Field(DEFAULT_LOCAL_DATABASE_URL, alias="DATABASE_URL")
    analytics_api_key: str | None = Field(default=None, alias="ANALYTICS_API_KEY")
    analytics_shared_secret: str | None = Field(default=None, alias="ANALYTICS_SHARED_SECRET")
    analytics_token_clock_skew_seconds: int = Field(60, alias="ANALYTICS_TOKEN_CLOCK_SKEW_SECONDS")
    db_pool_min_size: int = Field(1, alias="DB_POOL_MIN_SIZE")
    db_pool_max_size: int = Field(8, alias="DB_POOL_MAX_SIZE")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
