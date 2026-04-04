"""Pydantic models for documents."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.document import DocumentStatus


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, strict=True, extra="forbid")

    id: UUID
    project_id: UUID
    file_name: str
    file_path: str
    content_type: str
    file_size: int = Field(..., ge=0)
    status: DocumentStatus
    total_chunks: int = Field(..., ge=0)
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    items: list[DocumentResponse]
    total: int = Field(..., ge=0)


class DocumentProcessQueued(BaseModel):
    """Background job acknowledgement for ingestion pipelines."""

    model_config = ConfigDict(strict=True, extra="forbid")

    project_id: UUID
    queued_documents: int = Field(..., ge=0)
    message: str = Field(default="Processing started in background", min_length=1)
