"""Metadata for a vector-store chunk linked to a document."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Integer, String, false
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import UUIDCreatedAtBase

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.project import Project


class ChunkMeta(UUIDCreatedAtBase):
    __tablename__ = "chunk_metas"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chroma_id: Mapped[str] = mapped_column(String(512), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    has_table: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    has_image: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())
    raw_text_preview: Mapped[str] = mapped_column(String(200), nullable=False)
    content_type: Mapped[str] = mapped_column(String(128), nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="chunk_metas")
    document: Mapped["Document"] = relationship("Document", back_populates="chunk_metas")
