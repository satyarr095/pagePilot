from __future__ import annotations

import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundException
from app.models.chat import ChatSession, Message, MessageRole


class ChatService:
    @staticmethod
    async def create_session(
        db: AsyncSession,
        project_id: uuid.UUID,
        title: str | None,
    ) -> ChatSession:
        normalized = title.strip() if title else None
        session = ChatSession(project_id=project_id, title=normalized)
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_session(db: AsyncSession, session_id: uuid.UUID) -> ChatSession:
        result = await db.execute(
            select(ChatSession).where(ChatSession.id == session_id),
        )
        session = result.scalar_one_or_none()
        if session is None:
            raise NotFoundException("Chat session not found")
        return session

    @staticmethod
    async def list_sessions(db: AsyncSession, project_id: uuid.UUID) -> list[ChatSession]:
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.project_id == project_id)
            .order_by(ChatSession.created_at.desc()),
        )
        return list(result.scalars().all())

    @staticmethod
    async def list_sessions_with_messages(
        db: AsyncSession,
        project_id: uuid.UUID,
    ) -> list[ChatSession]:
        result = await db.execute(
            select(ChatSession)
            .where(ChatSession.project_id == project_id)
            .options(selectinload(ChatSession.messages))
            .order_by(ChatSession.created_at.desc()),
        )
        sessions = list(result.scalars().unique().all())
        for s in sessions:
            s.messages.sort(key=lambda m: m.created_at)
        return sessions

    @staticmethod
    async def add_message(
        db: AsyncSession,
        session_id: uuid.UUID,
        role: MessageRole,
        content: str,
        sources: list[dict] | None = None,
        retrieval_scores: list[float] | None = None,
    ) -> Message:
        await ChatService.get_session(db, session_id)
        message = Message(
            chat_session_id=session_id,
            role=role,
            content=content,
            sources=sources,
            retrieval_scores=retrieval_scores,
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message

    @staticmethod
    async def get_history(db: AsyncSession, session_id: uuid.UUID) -> list[Message]:
        await ChatService.get_session(db, session_id)
        result = await db.execute(
            select(Message)
            .where(Message.chat_session_id == session_id)
            .order_by(Message.created_at.asc()),
        )
        return list(result.scalars().all())

    @staticmethod
    async def delete_session(db: AsyncSession, session_id: uuid.UUID) -> None:
        result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        if result.scalar_one_or_none() is None:
            raise NotFoundException("Chat session not found")
        await db.execute(delete(ChatSession).where(ChatSession.id == session_id))
        await db.commit()
