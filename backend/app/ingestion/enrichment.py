"""LLM enrichment for chunks that contain tables or images."""

from __future__ import annotations

import base64
import logging

from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI

from app.core.config import Settings

logger = logging.getLogger(__name__)


def _data_url_for_base64(image_b64: str) -> str:
    """Pick a reasonable data URL MIME type for OpenAI image inputs."""
    raw = base64.b64decode(image_b64, validate=False)
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return f"data:image/png;base64,{image_b64}"
    if raw.startswith(b"GIF87a") or raw.startswith(b"GIF89a"):
        return f"data:image/gif;base64,{image_b64}"
    if raw.startswith(b"RIFF") and raw[8:12] == b"WEBP":
        return f"data:image/webp;base64,{image_b64}"
    return f"data:image/jpeg;base64,{image_b64}"


def enrich_chunk(text: str, tables: list[str], images: list[str], settings: Settings) -> str:
    """
    Produce retrieval-oriented text for a chunk.

    Text-only chunks pass through unchanged. Mixed-media chunks are summarized with
    ``gpt-4o`` using multimodal messages (tables in the prompt, images as image_url parts).
    """
    if not tables and not images:
        return text

    llm = ChatOpenAI(
        model=settings.LLM_MODEL,
        temperature=settings.LLM_TEMPERATURE,
        api_key=settings.OPENAI_API_KEY,
    )

    prompt_parts: list[str] = [
        "You are creating a searchable description for document content retrieval.",
        "",
        "CONTENT TO ANALYZE:",
        "",
        "TEXT CONTENT:",
        text,
        "",
    ]

    if tables:
        prompt_parts.append("TABLES (HTML):")
        for i, table in enumerate(tables):
            prompt_parts.append(f"Table {i + 1}:")
            prompt_parts.append(table)
            prompt_parts.append("")

    prompt_parts.append(
        "YOUR TASK:\n"
        "Generate a comprehensive, searchable description that covers:\n"
        "1. Key facts, numbers, and data points from text and tables\n"
        "2. Main topics and concepts discussed\n"
        "3. Questions this content could answer\n"
        "4. Visual content analysis (charts, diagrams, patterns in images)\n"
        "5. Alternative search terms users might use\n"
        "\n"
        "Make it detailed and searchable — prioritize findability over brevity.\n"
        "\n"
        "SEARCHABLE DESCRIPTION:",
    )

    prompt_text = "\n".join(prompt_parts)

    message_content: list[dict] = [{"type": "text", "text": prompt_text}]
    for image_b64 in images:
        message_content.append(
            {
                "type": "image_url",
                "image_url": {"url": _data_url_for_base64(image_b64)},
            },
        )

    try:
        message = HumanMessage(content=message_content)
        response = llm.invoke([message])
        out = getattr(response, "content", None)
        if isinstance(out, str) and out.strip():
            return out.strip()
        if isinstance(out, list):
            joined = " ".join(
                part.get("text", "") if isinstance(part, dict) else str(part) for part in out
            )
            if joined.strip():
                return joined.strip()
    except Exception:
        logger.exception("enrich_chunk LLM call failed; falling back to raw text")

    summary = text.strip()
    if tables:
        summary = f"{summary}\n[Contains {len(tables)} table(s)]".strip()
    if images:
        summary = f"{summary}\n[Contains {len(images)} image(s)]".strip()
    return summary or text
