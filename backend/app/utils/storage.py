"""Storage abstraction for uploaded PDFs (relative keys under ``UPLOAD_DIR``)."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from app.core.config import Settings, get_settings

ALLOWED_EXTENSIONS = frozenset({".pdf"})


class StorageError(Exception):
    """Invalid file or storage operation failure."""


class StorageBackend(ABC):
    @abstractmethod
    async def save_file(self, project_id: uuid.UUID, filename: str, content: bytes) -> str:
        """Persist bytes; return a relative storage key (posix path under ``UPLOAD_DIR``)."""

    @abstractmethod
    async def get_file(self, relative_path: str) -> bytes:
        """Read file bytes by storage key."""

    @abstractmethod
    async def delete_file(self, relative_path: str) -> None:
        """Remove stored object if present."""

    @abstractmethod
    async def file_exists(self, relative_path: str) -> bool:
        """Return True if the object exists."""

    @abstractmethod
    def get_file_path(self, relative_path: str) -> Path:
        """Resolved absolute path for filesystem tools (e.g. Unstructured)."""


def _validate_pdf(filename: str, content: bytes, settings: Settings) -> None:
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise StorageError(f"Unsupported file type {suffix!r}; only PDF uploads are allowed.")
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise StorageError(
            f"File exceeds maximum size of {settings.MAX_FILE_SIZE_MB} MB ({len(content)} bytes).",
        )


class LocalStorageBackend(StorageBackend):
    """Stores objects as ``{UPLOAD_DIR}/{project_id}/{uuid}.pdf``."""

    def __init__(self, upload_dir: str) -> None:
        self._root = Path(upload_dir).resolve()

    def _project_dir(self, project_id: uuid.UUID) -> Path:
        return self._root / str(project_id)

    def get_file_path(self, relative_path: str) -> Path:
        rel = Path(relative_path)
        if rel.is_absolute():
            raise StorageError("relative_path must be relative.")
        resolved = (self._root / rel).resolve()
        try:
            resolved.relative_to(self._root)
        except ValueError as exc:
            raise StorageError("Invalid path escapes upload directory.") from exc
        return resolved

    async def save_file(self, project_id: uuid.UUID, filename: str, content: bytes) -> str:
        settings = get_settings()
        _validate_pdf(filename, content, settings)
        dest_dir = self._project_dir(project_id)
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_name = f"{uuid.uuid4()}.pdf"
        dest_path = dest_dir / dest_name
        dest_path.write_bytes(content)
        rel = Path(str(project_id)) / dest_name
        return rel.as_posix()

    async def get_file(self, relative_path: str) -> bytes:
        path = self.get_file_path(relative_path)
        if not path.is_file():
            raise FileNotFoundError(relative_path)
        return path.read_bytes()

    async def delete_file(self, relative_path: str) -> None:
        path = self.get_file_path(relative_path)
        if path.is_file():
            path.unlink()

    async def file_exists(self, relative_path: str) -> bool:
        return self.get_file_path(relative_path).is_file()


def get_storage(settings: Settings | None = None) -> LocalStorageBackend:
    cfg = settings or get_settings()
    return LocalStorageBackend(cfg.UPLOAD_DIR)
