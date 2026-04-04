"""Document upload, listing, and background ingestion."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.db.session import async_session_factory
from app.ingestion.pipeline import IngestPipeline
from app.models.project import ProjectStatus
from app.schemas.document import DocumentListResponse, DocumentProcessQueued, DocumentResponse
from app.services.document_service import DocumentService
from app.services.project_service import ProjectService

logger = logging.getLogger(__name__)

router = APIRouter()


async def _process_uploaded_documents(project_id: uuid.UUID) -> None:
    ingest = IngestPipeline()
    async with async_session_factory() as db:
        docs = await DocumentService.list_uploaded_by_project(db, project_id)
        for doc in docs:
            try:
                await ingest.run(db, doc.id, project_id)
            except Exception:
                logger.exception(
                    "Background ingestion failed for document_id=%s project_id=%s",
                    doc.id,
                    project_id,
                )


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    project_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> DocumentResponse:
    await ProjectService.get_project(db, project_id)
    document = await DocumentService.upload_document(db, project_id, file)
    return DocumentResponse.model_validate(document)


@router.post("/process/{project_id}", response_model=DocumentProcessQueued)
async def process_documents(
    project_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> DocumentProcessQueued:
    await ProjectService.get_project(db, project_id)
    pending = await DocumentService.list_uploaded_by_project(db, project_id)
    count = len(pending)
    if count > 0:
        await ProjectService.update_project_status(db, project_id, ProjectStatus.processing)
    background_tasks.add_task(_process_uploaded_documents, project_id)
    return DocumentProcessQueued(
        project_id=project_id,
        queued_documents=count,
        message="Processing started in background",
    )


@router.get("/{project_id}", response_model=DocumentListResponse)
async def list_documents(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> DocumentListResponse:
    await ProjectService.get_project(db, project_id)
    items = await DocumentService.list_documents_by_project(db, project_id)
    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in items],
        total=len(items),
    )
