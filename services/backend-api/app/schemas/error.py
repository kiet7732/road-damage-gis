from typing import Any, Literal

from pydantic import BaseModel


class ApiErrorResponse(BaseModel):
    success: Literal[False] = False
    error_code: str
    message: str
    details: Any | None = None


def build_error_response(
    *,
    error_code: str,
    message: str,
    details: Any | None = None,
) -> ApiErrorResponse:
    return ApiErrorResponse(
        error_code=error_code,
        message=message,
        details=details,
    )
