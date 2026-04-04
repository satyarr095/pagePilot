"""FastAPI dependencies (DB session, settings, RAG singletons)."""

from __future__ import annotations

from app.core.config import get_settings
from app.db.session import get_db
from app.rag.chat_engine import ChatEngine
from app.rag.retriever import RetrievalService
from app.rag.vector_store import get_vector_store

__all__ = [
    "get_chat_engine",
    "get_db",
    "get_retrieval_service",
    "get_settings",
    "get_vector_store",
]

_retrieval_service: RetrievalService | None = None
_chat_engine: ChatEngine | None = None


def get_retrieval_service() -> RetrievalService:
    global _retrieval_service
    if _retrieval_service is None:
        _retrieval_service = RetrievalService(get_vector_store())
    return _retrieval_service


def get_chat_engine() -> ChatEngine:
    global _chat_engine
    if _chat_engine is None:
        _chat_engine = ChatEngine()
    return _chat_engine
