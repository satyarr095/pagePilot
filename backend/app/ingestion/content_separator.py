"""Split chunk content into text, table HTML, and base64 images."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _chunk_plain_text(chunk: Any) -> str:
    text = getattr(chunk, "text", None)
    if text is None:
        return ""
    return str(text)


def separate_content_types(chunk: Any) -> dict[str, Any]:
    """
    Inspect ``chunk.metadata.orig_elements`` for Table and Image blocks.

    Returns structured fields for downstream enrichment and metadata.
    """
    text = _chunk_plain_text(chunk)
    tables: list[str] = []
    images: list[str] = []
    types: list[str] = []

    if text.strip():
        types.append("text")

    orig = None
    meta = getattr(chunk, "metadata", None)
    if meta is not None:
        orig = getattr(meta, "orig_elements", None)

    if orig:
        for element in orig:
            element_type = type(element).__name__

            if element_type == "Table":
                types.append("table")
                el_meta = getattr(element, "metadata", None)
                table_html = None
                if el_meta is not None:
                    table_html = getattr(el_meta, "text_as_html", None)
                if not table_html:
                    table_html = getattr(element, "text", "") or ""
                tables.append(str(table_html))

            elif element_type == "Image":
                el_meta = getattr(element, "metadata", None)
                b64 = None
                if el_meta is not None:
                    b64 = getattr(el_meta, "image_base64", None)
                if b64:
                    types.append("image")
                    images.append(str(b64))

    # Preserve stable, unique ordering while keeping "text" first when present
    seen: set[str] = set()
    ordered_types: list[str] = []
    for t in types:
        if t not in seen:
            seen.add(t)
            ordered_types.append(t)

    if not ordered_types and not text.strip():
        ordered_types = []

    result = {
        "text": text,
        "tables": tables,
        "images": images,
        "types": ordered_types,
        "has_table": bool(tables),
        "has_image": bool(images),
    }
    logger.debug(
        "separate_content_types types=%s tables=%s images=%s",
        result["types"],
        len(tables),
        len(images),
    )
    return result
