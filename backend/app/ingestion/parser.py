"""PDF parsing via Unstructured.io (hi-res partition)."""

from __future__ import annotations

import logging

from unstructured.partition.pdf import partition_pdf

logger = logging.getLogger(__name__)


def parse_document(file_path: str) -> list:
    """
    Partition a PDF into Unstructured elements.

    Uses the same high-resolution settings as the reference notebook:
    ``hi_res`` strategy, structured tables, and base64 image payloads.
    """
    logger.info("Starting PDF partition for path=%s", file_path)
    try:
        elements = partition_pdf(
            filename=file_path,
            strategy="hi_res",
            infer_table_structure=True,
            extract_image_block_types=["Image"],
            extract_image_block_to_payload=True,
        )
    except Exception:
        logger.exception("partition_pdf failed for path=%s", file_path)
        raise

    logger.info("partition_pdf extracted %s elements", len(elements))
    return elements
