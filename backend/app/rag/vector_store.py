"""ChromaDB vector store with project-scoped retrieval and lifecycle helpers."""

from __future__ import annotations

import threading
from typing import TYPE_CHECKING

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings

from app.core.config import Settings, get_settings

if TYPE_CHECKING:
    pass

_lock = threading.Lock()
_manager: "VectorStoreManager | None" = None


class VectorStoreManager:
    """Persistent Chroma collection with OpenAI embeddings."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required for embeddings")

        self._embeddings = OpenAIEmbeddings(
            model=settings.EMBEDDING_MODEL,
            api_key=settings.OPENAI_API_KEY,
        )
        self._collection_name = settings.CHROMA_COLLECTION_NAME
        self._chroma = Chroma(
            collection_name=self._collection_name,
            embedding_function=self._embeddings,
            persist_directory=settings.CHROMA_PERSIST_DIR,
        )

    @property
    def chroma(self) -> Chroma:
        return self._chroma

    def add_documents(
        self,
        documents: list[Document],
        metadatas: list[dict] | None = None,
        ids: list[str] | None = None,
    ) -> None:
        if not documents:
            return
        if metadatas is not None and len(metadatas) != len(documents):
            raise ValueError("metadatas length must match documents length")
        if ids is not None and len(ids) != len(documents):
            raise ValueError("ids length must match documents length")

        if ids is not None:
            self._chroma.add_documents(documents, ids=ids)
        else:
            self._chroma.add_documents(documents)

    def similarity_search(
        self,
        query: str,
        project_id: str,
        k: int,
    ) -> list[tuple[Document, float]]:
        """Return LangChain Documents with distance scores (lower is more similar for L2)."""
        where_filter = {"project_id": project_id}
        return self._chroma.similarity_search_with_score(
            query,
            k=k,
            filter=where_filter,
        )

    def delete_by_document_id(self, document_id: str) -> None:
        self._chroma.delete(where={"document_id": document_id})

    def delete_by_project_id(self, project_id: str) -> None:
        self._chroma.delete(where={"project_id": project_id})


def get_vectorstore() -> VectorStoreManager:
    global _manager
    with _lock:
        if _manager is None:
            _manager = VectorStoreManager(get_settings())
        return _manager


get_vector_store = get_vectorstore


def reset_vectorstore_singleton_for_tests() -> None:
    """Test hook only."""
    global _manager
    with _lock:
        _manager = None
