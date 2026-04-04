"""Title-aware chunking for Unstructured elements."""

from __future__ import annotations

import logging
from typing import Any

from unstructured.chunking.title import chunk_by_title

from app.core.config import Settings

logger = logging.getLogger(__name__)


def create_chunks(elements: list, settings: Settings) -> list[Any]:
    """
    Group parsed elements into chunks using ``chunk_by_title``.

    Chunk sizing parameters mirror the notebook and are driven by settings.
    """
    if not elements:
        logger.warning("create_chunks received zero elements")
        return []

    chunks = chunk_by_title(
        elements,
        max_characters=settings.CHUNK_MAX_CHARACTERS,
        new_after_n_chars=settings.CHUNK_NEW_AFTER_N_CHARS,
        combine_text_under_n_chars=settings.CHUNK_COMBINE_TEXT_UNDER_N_CHARS,
    )
    logger.info("chunk_by_title produced %s chunks", len(chunks))
    return chunks
