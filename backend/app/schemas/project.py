"""Pydantic models for projects."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.project import ProjectStatus


class ProjectCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, strict=True, extra="forbid")

    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, strict=True, extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    status: ProjectStatus | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, strict=True, extra="forbid")

    id: UUID
    name: str
    description: str | None
    status: ProjectStatus
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    items: list[ProjectResponse]
    total: int = Field(..., ge=0)
