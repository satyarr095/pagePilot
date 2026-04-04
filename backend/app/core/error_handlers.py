"""Centralized HTTP exception handlers."""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError as PydanticValidationError
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import AppException
from app.schemas.common import ErrorResponse

logger = logging.getLogger(__name__)


def _friendly_integrity_message(exc: IntegrityError) -> str:
    msg = str(exc.orig) if exc.orig else str(exc)
    if "unique" in msg.lower() or "duplicate" in msg.lower():
        if "ix_projects_name" in msg or "projects_name" in msg:
            return "A project with this name already exists."
        return "A record with this value already exists."
    if "foreign" in msg.lower():
        return "Referenced record does not exist."
    return "Data integrity constraint violated."


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        body = ErrorResponse(detail=exc.detail, error_code=exc.error_code).model_dump()
        return JSONResponse(status_code=exc.status_code, content=body)

    @app.exception_handler(IntegrityError)
    async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
        detail = _friendly_integrity_message(exc)
        logger.warning("IntegrityError on %s %s: %s", request.method, request.url.path, detail)
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content=ErrorResponse(detail=detail, error_code="conflict").model_dump(),
        )

    @app.exception_handler(PydanticValidationError)
    async def pydantic_validation_handler(
        request: Request,
        exc: PydanticValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": exc.errors(),
                "error_code": "validation_error",
            },
        )

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "detail": exc.errors(),
                "error_code": "request_validation_error",
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        if isinstance(exc, HTTPException):
            return JSONResponse(
                status_code=exc.status_code,
                content={"detail": exc.detail},
            )
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=ErrorResponse(
                detail="Internal server error",
                error_code="internal_error",
            ).model_dump(),
        )
