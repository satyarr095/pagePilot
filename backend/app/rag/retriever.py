"""RAG retrieval: project-scoped similarity search with structured chunk parsing."""

from __future__ import annotations

import json
from dataclasses import dataclass, field

from app.core.config import get_settings
from app.core.logging import get_logger
from app.rag.vector_store import VectorStoreManager, get_vectorstore

logger = get_logger(__name__)


@dataclass
class RetrievalResult:
    """Structured retrieval output for the chat engine and observability."""

    chunks: list[str] = field(default_factory=list)
    sources: list[dict] = field(default_factory=list)
    scores: list[float] = field(default_factory=list)


class RetrievalService:
    def __init__(self, vector_store: VectorStoreManager) -> None:
        self._vector_store = vector_store

    def retrieve(self, query: str, project_id: str, k: int | None = None) -> RetrievalResult:
        settings = get_settings()
        top_k = k if k is not None else settings.RETRIEVAL_TOP_K
        pairs = self._vector_store.similarity_search(query, project_id=project_id, k=top_k)

        chunks: list[str] = []
        sources: list[dict] = []
        scores: list[float] = []

        for doc, distance in pairs:
            similarity = 1.0 / (1.0 + float(distance))
            meta = dict(doc.metadata or {})
            raw_payload = meta.get("original_content")
            raw_text = ""
            tables: list = []
            images: list = []
            if isinstance(raw_payload, str) and raw_payload.strip():
                try:
                    parsed = json.loads(raw_payload)
                    if isinstance(parsed, dict):
                        raw_text = str(parsed.get("raw_text", "") or "")
                        tables = parsed.get("tables") or parsed.get("tables_html") or []
                        images = parsed.get("images") or parsed.get("images_base64") or []
                        if not isinstance(tables, list):
                            tables = []
                        if not isinstance(images, list):
                            images = []
                except json.JSONDecodeError:
                    raw_text = doc.page_content or ""
            else:
                raw_text = doc.page_content or ""

            context_block_parts = [raw_text.strip()] if raw_text.strip() else []
            if tables:
                context_block_parts.append(f"[tables]: {json.dumps(tables, ensure_ascii=False)}")
            if images:
                context_block_parts.append(f"[images]: {json.dumps(images, ensure_ascii=False)}")
            chunk_text = "\n".join(context_block_parts).strip() or (doc.page_content or "")

            chunks.append(chunk_text)
            scores.append(similarity)

            source_meta = {
                "document_id": meta.get("document_id"),
                "chunk_index": meta.get("chunk_index"),
                "source_file": meta.get("source_file"),
                "page": meta.get("page"),
                "raw_text": raw_text,
                "tables": tables,
                "images": images,
                "similarity": similarity,
                "distance": float(distance),
            }
            sources.append(source_meta)

        logger.info(
            "retrieval.completed",
            project_id=project_id,
            query_preview=query[:500],
            num_results=len(scores),
            scores=scores,
        )

        return RetrievalResult(chunks=chunks, sources=sources, scores=scores)
