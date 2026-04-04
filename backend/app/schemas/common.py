"""Shared API response shapes."""

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ErrorResponse(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    detail: str
    error_code: str | None = None


class HealthResponse(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    status: str = Field(default="ok", min_length=1)


class PaginatedResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(strict=True, extra="forbid")

    items: list[T]
    total: int = Field(..., ge=0)
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1)
