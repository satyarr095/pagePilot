"""Chat sessions and messages scoped to a project."""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import UUIDCreatedAtBase

if TYPE_CHECKING:
    from app.models.project import Project


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class ChatSession(UUIDCreatedAtBase):
    __tablename__ = "chat_sessions"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(String(512), nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="chat_sessions")
    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="chat_session",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Message.created_at",
    )


class Message(UUIDCreatedAtBase):
    __tablename__ = "messages"

    chat_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[MessageRole] = mapped_column(
        SAEnum(MessageRole, native_enum=False, length=32),
        nullable=False,
        index=True,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    sources: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    retrieval_scores: Mapped[list[float] | None] = mapped_column(JSONB, nullable=True)

    chat_session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")
