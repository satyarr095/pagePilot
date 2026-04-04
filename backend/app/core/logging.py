"""Structured logging: JSON in production-style environments, console-friendly in development."""

from __future__ import annotations

import logging
import os
import sys
import structlog
from structlog.types import Processor

from app.core.config import get_settings


def _is_development() -> bool:
    env = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower()
    return env in ("development", "dev", "local", "debug")


def configure_logging() -> None:
    settings = get_settings()
    level_name = str(settings.LOG_LEVEL).upper()
    level = getattr(logging, level_name, logging.INFO)

    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=level)

    timestamper = structlog.processors.TimeStamper(fmt="iso", utc=True)

    shared_pre: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        timestamper,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if _is_development():
        processors: list[Processor] = [
            *shared_pre,
            structlog.dev.ConsoleRenderer(colors=sys.stderr.isatty()),
        ]
    else:
        processors = [
            *shared_pre,
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer(),
        ]

    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Return a structlog logger bound to the given name (typically ``__name__``)."""
    return structlog.get_logger(name)


# Configure once on import so `uvicorn app.main:app` picks it up when logging module loads.
configure_logging()
