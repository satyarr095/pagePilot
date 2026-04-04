"""Pydantic models for chat sessions and messages."""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.chat import MessageRole


class ChatCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, strict=True, extra="forbid")

    title: str | None = Field(default=None, max_length=512)


class MessageCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, strict=True, extra="forbid")

    role: MessageRole
    content: str = Field(..., min_length=1)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, strict=True, extra="forbid")

    id: UUID
    chat_session_id: UUID
    role: MessageRole
    content: str
    sources: list[dict[str, Any]] | None = None
    retrieval_scores: list[float] | None = None
    created_at: datetime

    @field_validator("retrieval_scores", mode="before")
    @classmethod
    def normalize_scores(cls, value: Any) -> list[float] | None:
        if value is None:
            return None
        if not isinstance(value, list):
            msg = "retrieval_scores must be a list of numbers or null"
            raise TypeError(msg)
        return [float(x) for x in value]


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, strict=True, extra="forbid")

    id: UUID
    project_id: UUID
    title: str | None
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    model_config = ConfigDict(strict=True, extra="forbid")

    session: ChatSessionResponse
    messages: list[MessageResponse]


class ChatMessageRequest(BaseModel):
    """Inbound user message for streaming or non-streaming chat endpoints."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    message: str = Field(..., min_length=1, max_length=32000)
    session_id: UUID | None = None
