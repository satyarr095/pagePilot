"""Project persistence and lifecycle helpers."""

from __future__ import annotations

import logging
import shutil
import uuid
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import get_settings
from app.core.exceptions import NotFoundException
from app.models.project import Project, ProjectStatus

logger = logging.getLogger(__name__)


class ProjectService:
    @staticmethod
    async def create_project(
        db: AsyncSession,
        name: str,
        description: str | None,
    ) -> Project:
        project = Project(
            name=name,
            description=description,
            status=ProjectStatus.created,
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def get_project(db: AsyncSession, project_id: uuid.UUID) -> Project:
        project = await db.get(Project, project_id)
        if project is None:
            raise NotFoundException(f"Project {project_id} not found.")
        return project

    @staticmethod
    async def list_projects(db: AsyncSession) -> list[Project]:
        result = await db.execute(select(Project).order_by(Project.created_at.desc()))
        return list(result.scalars().all())

    @staticmethod
    async def update_project_status(
        db: AsyncSession,
        project_id: uuid.UUID,
        status: ProjectStatus,
    ) -> Project:
        project = await ProjectService.get_project(db, project_id)
        project.status = status
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def delete_project(db: AsyncSession, project_id: uuid.UUID) -> None:
        project = await db.get(Project, project_id)
        if project is None:
            raise NotFoundException(f"Project {project_id} not found.")
        await db.delete(project)
        await db.commit()

    @staticmethod
    async def delete_project_cascade(db: AsyncSession, project_id: uuid.UUID) -> None:
        """Delete project and clean up vector store + uploaded files."""
        project = await db.get(Project, project_id)
        if project is None:
            raise NotFoundException(f"Project {project_id} not found.")

        try:
            from app.rag.vector_store import get_vectorstore
            vs = get_vectorstore()
            vs.delete_by_project_id(str(project_id))
        except Exception:
            logger.warning("Failed to clean ChromaDB vectors for project %s", project_id, exc_info=True)

        try:
            settings = get_settings()
            project_dir = Path(settings.UPLOAD_DIR) / str(project_id)
            if project_dir.is_dir():
                shutil.rmtree(project_dir)
        except Exception:
            logger.warning("Failed to clean uploaded files for project %s", project_id, exc_info=True)

        await db.delete(project)
        await db.commit()
