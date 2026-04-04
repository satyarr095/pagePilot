"""Project CRUD routes."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.project import ProjectCreate, ProjectListResponse, ProjectResponse
from app.services.project_service import ProjectService

router = APIRouter()


@router.post("", response_model=ProjectResponse)
async def create_project(
    body: ProjectCreate,
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    project = await ProjectService.create_project(db, body.name, body.description)
    return ProjectResponse.model_validate(project)


@router.get("", response_model=ProjectListResponse)
async def list_projects(db: AsyncSession = Depends(get_db)) -> ProjectListResponse:
    items = await ProjectService.list_projects(db)
    return ProjectListResponse(
        items=[ProjectResponse.model_validate(p) for p in items],
        total=len(items),
    )


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ProjectResponse:
    project = await ProjectService.get_project(db, project_id)
    return ProjectResponse.model_validate(project)


@router.delete("/{project_id}")
async def delete_project(
    project_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    await ProjectService.delete_project_cascade(db, project_id)
    return JSONResponse(content={"detail": "Project deleted successfully"}, status_code=200)
