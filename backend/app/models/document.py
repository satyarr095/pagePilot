"""Document belonging to a project."""

from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, Enum as SAEnum, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import AuditedUUIDBase

if TYPE_CHECKING:
    from app.models.chunk_meta import ChunkMeta
    from app.models.project import Project


class DocumentStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    processed = "processed"
    failed = "failed"


class Document(AuditedUUIDBase):
    __tablename__ = "documents"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_name: Mapped[str] = mapped_column(String(512), nullable=False)
    file_path: Mapped[str] = mapped_column(String(2048), nullable=False)
    content_type: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(
        SAEnum(DocumentStatus, native_enum=False, length=32),
        nullable=False,
        default=DocumentStatus.uploaded,
        server_default=text("'uploaded'"),
        index=True,
    )
    total_chunks: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    project: Mapped["Project"] = relationship("Project", back_populates="documents")
    chunk_metas: Mapped[list["ChunkMeta"]] = relationship(
        "ChunkMeta",
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
