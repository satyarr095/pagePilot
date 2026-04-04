"""Async SQLAlchemy engine/session and a synchronous engine for Alembic."""

from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.db.base import Base

_settings = get_settings()

import app.models  # noqa: E402, F401 — register ORM tables on metadata

async_engine = create_async_engine(
    _settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)

async_session_factory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

sync_engine = create_engine(
    _settings.DATABASE_URL_SYNC,
    echo=False,
    pool_pre_ping=True,
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async database session."""
    async with async_session_factory() as session:
        yield session


async def init_db() -> None:
    """Create tables (bootstrap / dev). Prefer Alembic migrations in production."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
