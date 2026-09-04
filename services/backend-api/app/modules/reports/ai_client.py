import logging

import httpx

from app.config import Settings
from app.modules.reports.schemas import AiDetectionResult


class AiServiceError(Exception):
    def __init__(
        self,
        message: str,
        *,
        status_code: int | None = None,
        error_code: str | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code


logger = logging.getLogger(__name__)


class AiServiceClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def detect_road_damage(
        self,
        image_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> AiDetectionResult:
        try:
            timeout = httpx.Timeout(
                timeout=self.settings.ai_timeout_seconds,
                connect=min(5.0, self.settings.ai_timeout_seconds),
            )
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(
                    self.settings.ai_detect_url,
                    files={
                        "image": (
                            filename,
                            image_bytes,
                            content_type,
                        )
                    },
                    headers={"Accept": "application/json"},
                )

            if response.status_code >= 400:
                message, error_code = self._extract_error_payload(response)
                logger.warning(
                    "AI Service returned %s for file %s (%s bytes): %s",
                    response.status_code,
                    filename,
                    len(image_bytes),
                    message,
                )
                raise AiServiceError(
                    message,
                    status_code=response.status_code,
                    error_code=error_code,
                )

            return AiDetectionResult.model_validate(response.json())
        except httpx.TimeoutException as exc:
            logger.warning("AI Service timeout after %ss", self.settings.ai_timeout_seconds)
            raise AiServiceError("AI Service phản hồi quá thời gian cho phép.") from exc
        except httpx.RequestError as exc:
            logger.warning("AI Service request error: %s", exc)
            raise AiServiceError("Không thể kết nối AI Service.") from exc
        except Exception as exc:
            if isinstance(exc, AiServiceError):
                raise
            logger.exception("Unexpected AI Service error")
            raise AiServiceError(f"Lỗi khi gọi AI Service: {exc}") from exc

    def _extract_error_payload(
        self,
        response: httpx.Response,
    ) -> tuple[str, str | None]:
        try:
            payload = response.json()
        except ValueError:
            return (
                f"AI Service lỗi {response.status_code}.",
                None,
            )

        if isinstance(payload, dict):
            message = payload.get("message")
            error_code = payload.get("error_code")
            if isinstance(message, str) and message.strip():
                return message.strip(), error_code if isinstance(error_code, str) else None

        return f"AI Service lỗi {response.status_code}.", None
