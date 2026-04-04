"""Application settings loaded from environment and `.env`."""

from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key")

    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/pagepilot",
    )
    DATABASE_URL_SYNC: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/pagepilot",
    )

    CHROMA_PERSIST_DIR: str = Field(default="./data/chroma_db")
    CHROMA_COLLECTION_NAME: str = Field(default="pagepilot_chunks")
    UPLOAD_DIR: str = Field(default="./data/uploads")

    MAX_FILE_SIZE_MB: int = Field(default=50, ge=1)

    EMBEDDING_MODEL: str = Field(default="text-embedding-3-small")
    LLM_MODEL: str = Field(default="gpt-4o")
    LLM_TEMPERATURE: float = Field(default=0.0, ge=0.0, le=2.0)

    CHUNK_MAX_CHARACTERS: int = Field(default=3000, ge=100)
    CHUNK_NEW_AFTER_N_CHARS: int = Field(default=2400, ge=1)
    CHUNK_COMBINE_TEXT_UNDER_N_CHARS: int = Field(default=500, ge=0)

    RETRIEVAL_TOP_K: int = Field(default=5, ge=1, le=100)

    LOG_LEVEL: str = Field(default="INFO")

    CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173"],
    )

    STORAGE_BACKEND: str = Field(default="local", description="local or s3")
    AWS_S3_BUCKET: str = Field(default="", description="S3 bucket for uploads")
    AWS_REGION: str = Field(default="ap-south-1", description="AWS region")
    SQS_QUEUE_URL: str = Field(default="", description="SQS queue URL for ingestion jobs")
    ENVIRONMENT: str = Field(default="development", description="deployment environment")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if value is None:
            return ["http://localhost:5173"]
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()]
        if isinstance(value, str):
            raw = value.strip()
            if not raw:
                return ["http://localhost:5173"]
            if raw.startswith("["):
                import json

                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    return [s.strip() for s in raw.split(",") if s.strip()]
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
                return [str(parsed).strip()] if str(parsed).strip() else ["http://localhost:5173"]
            return [s.strip() for s in raw.split(",") if s.strip()]
        return ["http://localhost:5173"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
