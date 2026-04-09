"""Streaming chat (SSE) and session history."""

from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.api.deps import get_chat_engine, get_db, get_retrieval_service
from app.core.exceptions import ValidationException
from app.db.session import async_session_factory
from app.models.chat import MessageRole
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatMessageRequest,
    ChatSessionResponse,
    MessageResponse,
)
from app.services.chat_service import ChatService
from app.services.project_service import ProjectService

router = APIRouter()


def _sse_payload(data: dict) -> dict:
    return {"data": json.dumps(data, ensure_ascii=False)}


@router.post("/{project_id}")
async def stream_chat(
    project_id: uuid.UUID,
    body: ChatMessageRequest,
) -> EventSourceResponse:
    async with async_session_factory() as db:
        await ProjectService.get_project(db, project_id)

        if body.session_id is not None:
            session = await ChatService.get_session(db, body.session_id)
            if session.project_id != project_id:
                raise ValidationException("Session does not belong to this project.")
            chat_session_id = session.id
        else:
            title = body.message.strip()[:120] if body.message.strip() else None
            created = await ChatService.create_session(db, project_id, title)
            chat_session_id = created.id

        history = await ChatService.get_history(db, chat_session_id)
    history_tuples: list[tuple[str, str]] = []
    for m in history:
        role_val = m.role.value if isinstance(m.role, MessageRole) else str(m.role)
        history_tuples.append((role_val, m.content))

    retrieval_service = get_retrieval_service()
    chat_engine = get_chat_engine()

    async def event_generator():
        import logging
        _log = logging.getLogger(__name__)

        try:
            retrieval = retrieval_service.retrieve(
                body.message,
                project_id=str(project_id),
                k=None,
            )
        except Exception as exc:
            _log.exception("Retrieval failed for project %s", project_id)
            yield _sse_payload({"type": "error", "message": f"Retrieval failed: {exc}"})
            yield _sse_payload({"type": "done", "session_id": str(chat_session_id)})
            return

        yield _sse_payload(
            {
                "type": "sources",
                "sources": retrieval.sources,
                "scores": retrieval.scores,
            },
        )

        pieces: list[str] = []
        try:
            async for token in chat_engine.generate_response(
                body.message,
                retrieval.chunks,
                history_tuples,
            ):
                pieces.append(token)
                yield _sse_payload({"type": "token", "content": token})
        except Exception as exc:
            _log.exception("LLM generation failed for project %s", project_id)
            error_msg = str(exc)
            if "rate_limit" in error_msg.lower() or "429" in error_msg:
                error_msg = "OpenAI rate limit exceeded. Please wait a moment and try again."
            elif "authentication" in error_msg.lower() or "401" in error_msg:
                error_msg = "OpenAI API key is invalid. Please check configuration."
            yield _sse_payload({"type": "error", "message": error_msg})
            yield _sse_payload({"type": "done", "session_id": str(chat_session_id)})
            return

        try:
            async with async_session_factory() as persist_db:
                await ChatService.add_message(
                    persist_db,
                    chat_session_id,
                    MessageRole.user,
                    body.message,
                )
                await ChatService.add_message(
                    persist_db,
                    chat_session_id,
                    MessageRole.assistant,
                    "".join(pieces),
                    sources=retrieval.sources,
                    retrieval_scores=retrieval.scores,
                )
        except Exception:
            _log.exception("Failed to persist messages for session %s", chat_session_id)

        yield _sse_payload(
            {
                "type": "done",
                "session_id": str(chat_session_id),
            },
        )

    return EventSourceResponse(event_generator())


@router.get("/{project_id}/history", response_model=list[ChatHistoryResponse])
async def chat_history(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[ChatHistoryResponse]:
    await ProjectService.get_project(db, project_id)
    sessions = await ChatService.list_sessions_with_messages(db, project_id)
    out: list[ChatHistoryResponse] = []
    for s in sessions:
        out.append(
            ChatHistoryResponse(
                session=ChatSessionResponse.model_validate(s),
                messages=[MessageResponse.model_validate(m) for m in s.messages],
            ),
        )
    return out


@router.get("/{project_id}/sessions", response_model=list[ChatSessionResponse])
async def list_chat_sessions(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[ChatSessionResponse]:
    await ProjectService.get_project(db, project_id)
    sessions = await ChatService.list_sessions(db, project_id)
    return [ChatSessionResponse.model_validate(s) for s in sessions]


@router.post("/{project_id}/sessions", response_model=ChatSessionResponse)
async def create_chat_session(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ChatSessionResponse:
    await ProjectService.get_project(db, project_id)
    session = await ChatService.create_session(db, project_id, title=None)
    return ChatSessionResponse.model_validate(session)


@router.get(
    "/{project_id}/sessions/{session_id}/messages",
    response_model=list[MessageResponse],
)
async def get_session_messages(
    project_id: uuid.UUID,
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[MessageResponse]:
    await ProjectService.get_project(db, project_id)
    session = await ChatService.get_session(db, session_id)
    if session.project_id != project_id:
        raise ValidationException("Session does not belong to this project.")
    messages = await ChatService.get_history(db, session_id)
    return [MessageResponse.model_validate(m) for m in messages]
