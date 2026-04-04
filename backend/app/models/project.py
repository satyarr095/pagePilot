"""Project aggregate root."""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum as SAEnum, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditedUUIDBase

if TYPE_CHECKING:
    from app.models.chat import ChatSession
    from app.models.chunk_meta import ChunkMeta
    from app.models.document import Document


class ProjectStatus(str, enum.Enum):
    processing = "processing"
    ready = "ready"
    failed = "failed"
    created = "created"


class Project(AuditedUUIDBase):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ProjectStatus] = mapped_column(
        SAEnum(ProjectStatus, native_enum=False, length=32),
        nullable=False,
        default=ProjectStatus.created,
        server_default=text("'created'"),
        index=True,
    )

    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    chunk_metas: Mapped[list["ChunkMeta"]] = relationship(
        "ChunkMeta",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        "ChatSession",
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
