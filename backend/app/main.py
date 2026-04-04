"""PagePilot FastAPI application entrypoint."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api import chat, documents, health, projects
from app.core.config import get_settings
from app.core.error_handlers import register_exception_handlers
from app.db.session import async_engine, init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.CHROMA_PERSIST_DIR).mkdir(parents=True, exist_ok=True)
    await init_db()
    yield
    await async_engine.dispose()


class CatchAllCORSMiddleware(BaseHTTPMiddleware):
    """Safety net: ensure CORS headers exist on error responses that
    might bypass CORSMiddleware (e.g. ServerErrorMiddleware 500s)."""

    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("Unhandled middleware error")
            from starlette.responses import JSONResponse
            response = JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
            )
        origin = request.headers.get("origin")
        if origin and "access-control-allow-origin" not in response.headers:
            settings = get_settings()
            if origin in settings.CORS_ORIGINS or "*" in settings.CORS_ORIGINS:
                response.headers["access-control-allow-origin"] = origin
                response.headers["access-control-allow-credentials"] = "true"
        return response


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="PagePilot",
        description="Production-grade AI Document Intelligence API",
        version="1.0.0",
        lifespan=lifespan,
    )
    register_exception_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(CatchAllCORSMiddleware)
    app.include_router(projects.router, prefix="/api/v1/projects", tags=["projects"])
    app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
    app.include_router(chat.router, prefix="/api/v1/chat", tags=["chat"])
    app.include_router(health.router, prefix="/api/v1", tags=["health"])
    return app


app = create_app()
