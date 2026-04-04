"""Storage abstraction for uploaded PDFs (relative keys under ``UPLOAD_DIR``)."""

from __future__ import annotations

import io
import logging
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

from app.core.config import Settings, get_settings

ALLOWED_EXTENSIONS = frozenset({".pdf"})

_log = logging.getLogger(__name__)


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


class S3StorageBackend(StorageBackend):
    """Stores objects as ``s3://{bucket}/{prefix}/{project_id}/{uuid}.pdf``."""

    def __init__(self, bucket_name: str, region: str, upload_prefix: str = "uploads") -> None:
        self._bucket = bucket_name
        self._prefix = upload_prefix.strip("/")
        self._client = boto3.client("s3", region_name=region)

    def _normalize_key(self, relative_path: str) -> str:
        return relative_path.replace("\\", "/").lstrip("/")

    async def save_file(self, project_id: uuid.UUID, filename: str, content: bytes) -> str:
        settings = get_settings()
        _validate_pdf(filename, content, settings)
        dest_name = f"{uuid.uuid4()}.pdf"
        if self._prefix:
            key = f"{self._prefix}/{project_id}/{dest_name}"
        else:
            key = f"{project_id}/{dest_name}"
        self._client.put_object(
            Bucket=self._bucket,
            Key=key,
            Body=io.BytesIO(content),
            ContentType="application/pdf",
        )
        return key

    async def get_file(self, relative_path: str) -> bytes:
        key = self._normalize_key(relative_path)
        try:
            resp = self._client.get_object(Bucket=self._bucket, Key=key)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in ("404", "NoSuchKey", "NotFound"):
                raise FileNotFoundError(relative_path) from exc
            _log.warning("S3 get_object failed for key %s", key, exc_info=exc)
            raise
        data = resp["Body"].read()
        return data if isinstance(data, bytes) else bytes(data)

    async def delete_file(self, relative_path: str) -> None:
        key = self._normalize_key(relative_path)
        self._client.delete_object(Bucket=self._bucket, Key=key)

    async def file_exists(self, relative_path: str) -> bool:
        key = self._normalize_key(relative_path)
        try:
            self._client.head_object(Bucket=self._bucket, Key=key)
            return True
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in ("404", "NoSuchKey", "NotFound"):
                return False
            _log.warning("S3 head_object failed for key %s", key, exc_info=exc)
            raise

    def get_file_path(self, relative_path: str) -> Path:
        key = self._normalize_key(relative_path)
        local = Path("/tmp") / key
        local.parent.mkdir(parents=True, exist_ok=True)
        try:
            self._client.download_file(self._bucket, key, str(local))
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in ("404", "NoSuchKey", "NotFound"):
                raise FileNotFoundError(relative_path) from exc
            _log.warning("S3 download_file failed for key %s", key, exc_info=exc)
            raise
        return local.resolve()


def get_storage(settings: Settings | None = None) -> StorageBackend:
    cfg = settings or get_settings()
    if cfg.STORAGE_BACKEND == "s3":
        return S3StorageBackend(cfg.AWS_S3_BUCKET, cfg.AWS_REGION)
    return LocalStorageBackend(cfg.UPLOAD_DIR)
