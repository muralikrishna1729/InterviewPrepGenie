"""
Pydantic Settings -- loads from .env, validates types, single source of truth
for config across FastAPI app, Celery workers, and Alembic migrations.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str

    # Redis (session store + Celery broker/backend)
    REDIS_URL: str = "redis://localhost:6379/0"

    # Auth
    JWT_SECRET: str
    JWT_EXPIRE_DAYS: int = 7

    # AI providers
    GROQ_API_KEY: str
 

    # Server
    FRONTEND_URL: str = "http://localhost:5173"
    PORT: int = 5000
    ENVIRONMENT: str = "development"


settings = Settings()