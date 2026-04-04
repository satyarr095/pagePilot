"""Document upload, metadata, and removal (including vector store cleanup)."""

from __future__ import annotations

import uuid

from fastapi import UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException
from app.models.chunk_meta import ChunkMeta
from app.models.document import Document, DocumentStatus
from app.rag.vector_store import get_vectorstore
from app.utils.storage import StorageError, get_storage


class DocumentService:
    @staticmethod
    async def upload_document(
        db: AsyncSession,
        project_id: uuid.UUID,
        file: UploadFile,
    ) -> Document:
        storage = get_storage()
        raw = await file.read()
        relative: str | None = None
        try:
            relative = await storage.save_file(project_id, file.filename or "upload.pdf", raw)
            doc = Document(
                project_id=project_id,
                file_name=file.filename or "upload.pdf",
                file_path=relative,
                content_type=file.content_type or "application/pdf",
                file_size=len(raw),
                status=DocumentStatus.uploaded,
            )
            db.add(doc)
            await db.commit()
            await db.refresh(doc)
            return doc
        except StorageError:
            raise
        except Exception:
            if relative is not None:
                await storage.delete_file(relative)
            await db.rollback()
            raise

    @staticmethod
    async def get_document(db: AsyncSession, document_id: uuid.UUID) -> Document:
        doc = await db.get(Document, document_id)
        if doc is None:
            raise NotFoundException(f"Document {document_id} not found.")
        return doc

    @staticmethod
    async def list_documents_by_project(
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> list[Document]:
        result = await db.execute(
            select(Document)
            .where(Document.project_id == project_id)
            .order_by(Document.created_at.desc()),
        )
        return list(result.scalars().all())

    @staticmethod
    async def list_uploaded_by_project(
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> list[Document]:
        result = await db.execute(
            select(Document)
            .where(
                Document.project_id == project_id,
                Document.status == DocumentStatus.uploaded,
            )
            .order_by(Document.created_at.asc()),
        )
        return list(result.scalars().all())

    @staticmethod
    async def update_document_status(
        db: AsyncSession,
        document_id: uuid.UUID,
        status: DocumentStatus,
        total_chunks: int | None = None,
        error_message: str | None = None,
    ) -> Document:
        doc = await DocumentService.get_document(db, document_id)
        doc.status = status
        if total_chunks is not None:
            doc.total_chunks = total_chunks
        if error_message is not None:
            doc.error_message = error_message
        await db.commit()
        await db.refresh(doc)
        return doc

    @staticmethod
    async def delete_document(db: AsyncSession, document_id: uuid.UUID) -> None:
        result = await db.execute(
            select(Document)
            .options(selectinload(Document.chunk_metas))
            .where(Document.id == document_id),
        )
        doc = result.scalar_one_or_none()
        if doc is None:
            raise NotFoundException(f"Document {document_id} not found.")

        get_vectorstore().delete_by_document_id(str(document_id))

        await db.execute(delete(ChunkMeta).where(ChunkMeta.document_id == document_id))

        storage = get_storage()
        await storage.delete_file(doc.file_path)

        await db.delete(doc)
        await db.commit()
