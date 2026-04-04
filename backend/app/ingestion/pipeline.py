"""End-to-end ingestion: parse, chunk, enrich, embed, and persist metadata."""

from __future__ import annotations

import asyncio
import concurrent.futures
import json
import logging
import time
import uuid

from langchain_core.documents import Document as LCDocument
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import NotFoundException
from app.ingestion.chunker import create_chunks
from app.ingestion.content_separator import separate_content_types
from app.ingestion.enrichment import enrich_chunk
from app.ingestion.parser import parse_document
from app.models.chunk_meta import ChunkMeta
from app.models.document import Document, DocumentStatus
from app.models.project import ProjectStatus
from app.rag.vector_store import get_vectorstore
from app.services.document_service import DocumentService
from app.services.project_service import ProjectService
from app.utils.storage import get_storage

logger = logging.getLogger(__name__)


def _preview(text: str, max_len: int = 200) -> str:
    t = (text or "").strip()
    if len(t) <= max_len:
        return t or ""
    return t[: max_len - 3] + "..."


def _content_type_label(types: list[str]) -> str:
    label = ",".join(types) if types else "text"
    return label[:128]


async def _maybe_finalize_project_status(db: AsyncSession, project_id: uuid.UUID) -> None:
    result = await db.execute(select(Document).where(Document.project_id == project_id))
    docs = list(result.scalars().all())
    if not docs:
        return
    if any(d.status in (DocumentStatus.uploaded, DocumentStatus.processing) for d in docs):
        return
    if all(d.status == DocumentStatus.processed for d in docs):
        await ProjectService.update_project_status(db, project_id, ProjectStatus.ready)
    elif all(d.status == DocumentStatus.failed for d in docs):
        await ProjectService.update_project_status(db, project_id, ProjectStatus.failed)
    else:
        await ProjectService.update_project_status(db, project_id, ProjectStatus.ready)


class IngestPipeline:
    """
    CPU-heavy parsing runs in a thread pool; enrichment and embedding use ``asyncio.to_thread``.

    Chroma rows include ``project_id``, ``document_id``, ``chunk_index``, ``has_table``, and
    ``has_image``. PostgreSQL ``ChunkMeta`` rows mirror vector ids plus preview fields.
    """

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    async def run(
        self,
        db: AsyncSession,
        document_id: uuid.UUID,
        project_id: uuid.UUID,
    ) -> None:
        settings = self._settings
        t_pipeline = time.perf_counter()

        doc = await DocumentService.get_document(db, document_id)
        if doc.project_id != project_id:
            raise NotFoundException("Document does not belong to the specified project.")

        logger.info(
            "ingest start document_id=%s project_id=%s file_path=%s",
            document_id,
            project_id,
            doc.file_path,
        )

        get_vectorstore().delete_by_document_id(str(document_id))
        await db.execute(delete(ChunkMeta).where(ChunkMeta.document_id == document_id))
        await db.commit()

        await DocumentService.update_document_status(
            db,
            document_id,
            DocumentStatus.processing,
            total_chunks=0,
            error_message=None,
        )
        await ProjectService.update_project_status(db, project_id, ProjectStatus.processing)

        storage = get_storage(settings)
        pdf_path = storage.get_file_path(doc.file_path).as_posix()

        if not await storage.file_exists(doc.file_path):
            msg = "Stored file missing on disk"
            await DocumentService.update_document_status(
                db,
                document_id,
                DocumentStatus.failed,
                error_message=msg,
            )
            await _maybe_finalize_project_status(db, project_id)
            raise NotFoundException(msg)

        try:
            t0 = time.perf_counter()
            loop = asyncio.get_running_loop()
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                elements = await loop.run_in_executor(pool, parse_document, pdf_path)
            logger.info("ingest parse finished in %.2fs", time.perf_counter() - t0)

            t0 = time.perf_counter()
            chunks = create_chunks(elements, settings)
            logger.info("ingest chunk finished in %.2fs", time.perf_counter() - t0)

            lc_docs: list[LCDocument] = []
            chroma_ids: list[str] = []
            separations: list[dict] = []

            for idx, raw_chunk in enumerate(chunks):
                t_step = time.perf_counter()
                separated = separate_content_types(raw_chunk)
                separations.append(separated)
                enriched = await asyncio.to_thread(
                    enrich_chunk,
                    separated["text"],
                    separated["tables"],
                    separated["images"],
                    settings,
                )
                page_content = enriched.strip() or "[empty chunk]"
                original_payload = json.dumps(
                    {
                        "raw_text": separated["text"],
                        "tables_html": separated["tables"],
                        "images_base64": separated["images"],
                    },
                    ensure_ascii=False,
                )
                cid = str(uuid.uuid4())
                chroma_ids.append(cid)
                lc_docs.append(
                    LCDocument(
                        page_content=page_content,
                        metadata={
                            "project_id": str(project_id),
                            "document_id": str(document_id),
                            "chunk_index": idx,
                            "source_file": doc.file_name,
                            "has_table": separated["has_table"],
                            "has_image": separated["has_image"],
                            "original_content": original_payload,
                        },
                    ),
                )
                logger.debug(
                    "ingest chunk %s enrich+pack in %.2fs types=%s",
                    idx,
                    time.perf_counter() - t_step,
                    separated["types"],
                )

            t0 = time.perf_counter()
            vs = get_vectorstore()
            if lc_docs:
                await asyncio.to_thread(vs.add_documents, lc_docs, None, chroma_ids)
            logger.info("ingest chroma upsert finished in %.2fs", time.perf_counter() - t0)

            for idx, cid in enumerate(chroma_ids):
                sep = separations[idx]
                preview = _preview(sep["text"] or lc_docs[idx].page_content)
                meta = lc_docs[idx].metadata
                db.add(
                    ChunkMeta(
                        project_id=project_id,
                        document_id=document_id,
                        chunk_index=idx,
                        chroma_id=cid,
                        has_table=bool(meta.get("has_table")),
                        has_image=bool(meta.get("has_image")),
                        raw_text_preview=preview or "[empty]",
                        content_type=_content_type_label(sep["types"]),
                    ),
                )

            await DocumentService.update_document_status(
                db,
                document_id,
                DocumentStatus.processed,
                total_chunks=len(chunks),
                error_message=None,
            )
            await _maybe_finalize_project_status(db, project_id)

            logger.info(
                "ingest success document_id=%s chunks=%s total_time=%.2fs",
                document_id,
                len(chunks),
                time.perf_counter() - t_pipeline,
            )
        except Exception as exc:  # noqa: BLE001 — record failure for operators
            logger.exception("ingest failed document_id=%s", document_id)
            await DocumentService.update_document_status(
                db,
                document_id,
                DocumentStatus.failed,
                error_message=str(exc)[:4000],
            )
            await _maybe_finalize_project_status(db, project_id)
            raise
