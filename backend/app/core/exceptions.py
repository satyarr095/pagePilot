"""Domain-level and HTTP-oriented exceptions."""


class AppException(Exception):
    """Base application error with API metadata."""

    def __init__(
        self,
        detail: str,
        *,
        status_code: int = 500,
        error_code: str = "app_error",
    ) -> None:
        self.detail = detail
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(detail)


class NotFoundException(AppException):
    def __init__(self, detail: str = "Resource not found", *, error_code: str = "not_found") -> None:
        super().__init__(detail, status_code=404, error_code=error_code)


class ValidationException(AppException):
    def __init__(self, detail: str = "Validation failed", *, error_code: str = "validation_error") -> None:
        super().__init__(detail, status_code=422, error_code=error_code)


class ProcessingException(AppException):
    def __init__(self, detail: str = "Processing failed", *, error_code: str = "processing_error") -> None:
        super().__init__(detail, status_code=500, error_code=error_code)


class StorageException(AppException):
    def __init__(self, detail: str = "Storage operation failed", *, error_code: str = "storage_error") -> None:
        super().__init__(detail, status_code=500, error_code=error_code)
