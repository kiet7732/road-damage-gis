from datetime import datetime, timezone
from dataclasses import dataclass
import hashlib
from io import BytesIO
import logging
from pathlib import Path
import re
from time import perf_counter
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.config import Settings
from app.modules.auth.schemas import AuthUser
from app.modules.reports.ai_client import AiServiceClient, AiServiceError
from app.modules.reports.repository import ReportRepository
from app.modules.reports.schemas import (
    AiDetectionResult,
    AiPreviewDetectionResult,
    ReporterReportResponse,
)


REPORT_STATUS_PENDING_VERIFICATION = "pending_verification"
AI_STATUS_SUCCESS = "success"
AI_STATUS_MANUAL_REVIEW_REQUIRED = "manual_review_required"
ALLOWED_IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
logger = logging.getLogger(__name__)
PREVIEW_TOKEN_TTL_SECONDS = 10 * 60
LOCATION_SOURCE_CAMERA_GPS = "camera_gps"
LOCATION_SOURCE_MAP_SELECTED = "map_selected"
ALLOWED_LOCATION_SOURCES = {LOCATION_SOURCE_CAMERA_GPS, LOCATION_SOURCE_MAP_SELECTED}


@dataclass(slots=True)
class CachedAiPreviewResult:
    image_hash: str
    result: AiDetectionResult
    expires_at_ts: float


class ReportService:
    _preview_cache: dict[str, CachedAiPreviewResult] = {}

    def __init__(
        self,
        *,
        settings: Settings,
        repository: ReportRepository,
        ai_client: AiServiceClient,
    ) -> None:
        self.settings = settings
        self.repository = repository
        self.ai_client = ai_client

    async def create_report(
        self,
        *,
        current_user: AuthUser,
        image: UploadFile,
        latitude: float,
        longitude: float,
        gps_accuracy: float | None,
        location_source: str | None,
        location_recorded_at: str | None,
        note: str | None,
        preview_token: str | None,
    ) -> ReporterReportResponse:
        started_at = perf_counter()
        self._validate_coordinates(latitude, longitude)
        self._validate_accuracy(gps_accuracy)
        normalized_location_source = self._normalize_location_source(location_source)
        normalized_location_recorded_at = self._normalize_location_recorded_at(location_recorded_at)
        image_bytes = await self._read_image_bytes(image)
        optimized_image_bytes = self._prepare_image_for_ai(image_bytes)
        optimized_image_hash = self._build_image_hash(optimized_image_bytes)
        report_id = str(uuid4())
        saved_image_path = self._save_image(
            report_id=report_id,
            image_bytes=image_bytes,
            original_filename=image.filename or "road-damage.jpg",
        )
        relative_image_path = self._to_upload_relative_path(saved_image_path)

        ai_status = AI_STATUS_SUCCESS

        try:
            ai_result = self._consume_cached_preview(
                preview_token=preview_token,
                image_hash=optimized_image_hash,
            )
            if ai_result is None:
                ai_result = await self.ai_client.detect_road_damage(
                    image_bytes=optimized_image_bytes,
                    filename=image.filename or f"{report_id}.jpg",
                    content_type=self._resolve_content_type(image.content_type),
                )
        except AiServiceError as exc:
            ai_status = AI_STATUS_MANUAL_REVIEW_REQUIRED
            logger.warning("AI fallback for report %s: %s", report_id, exc)
            ai_result = AiDetectionResult(
                success=False,
                image_width=None,
                image_height=None,
                detections_count=0,
                detections=[],
                processing_time_ms=None,
                message="AI tạm thời chưa phân tích được ảnh. Báo cáo đã được chuyển sang kiểm tra thủ công.",
            )

        now = datetime.now(timezone.utc).isoformat()
        created_report = self.repository.create_report(
            report_id=report_id,
            user_id=current_user.id,
            image_path=relative_image_path,
            latitude=latitude,
            longitude=longitude,
            gps_accuracy=gps_accuracy,
            location_source=normalized_location_source,
            location_recorded_at=normalized_location_recorded_at,
            note=self._sanitize_note(note),
            ai_status=ai_status,
            status=REPORT_STATUS_PENDING_VERIFICATION,
            ai_result=ai_result,
            created_at=now,
            updated_at=now,
        )
        logger.info(
            "Created report %s for user %s in %.2fms (ai_status=%s, detections=%s)",
            report_id,
            current_user.id,
            round((perf_counter() - started_at) * 1000, 2),
            ai_status,
            ai_result.detections_count,
        )
        return created_report

    async def preview_ai_result(
        self,
        *,
        image: UploadFile,
    ) -> AiPreviewDetectionResult:
        image_bytes = await self._read_image_bytes(image)
        optimized_image_bytes = self._prepare_image_for_ai(image_bytes)
        preview_token = str(uuid4())

        try:
            ai_result = await self.ai_client.detect_road_damage(
                image_bytes=optimized_image_bytes,
                filename=image.filename or "preview-road-damage.jpg",
                content_type=self._resolve_content_type(image.content_type),
            )
            self._store_cached_preview(
                preview_token=preview_token,
                image_hash=self._build_image_hash(optimized_image_bytes),
                result=ai_result,
            )
            return AiPreviewDetectionResult(
                **ai_result.model_dump(),
                preview_token=preview_token,
            )
        except AiServiceError as exc:
            logger.warning("AI preview fallback: %s", exc)
            return AiPreviewDetectionResult(
                success=False,
                image_width=None,
                image_height=None,
                detections_count=0,
                detections=[],
                processing_time_ms=None,
                message="AI tạm thời chưa phân tích được ảnh preview. Bạn vẫn có thể gửi phản ánh để cán bộ kiểm tra thủ công.",
                preview_token=None,
            )

    async def _read_image_bytes(self, image: UploadFile) -> bytes:
        if not image.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng gửi ảnh phản ánh.",
            )

        if not image.content_type or image.content_type.lower() not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ảnh phản ánh chỉ hỗ trợ JPEG, PNG hoặc WEBP.",
            )

        image_bytes = await image.read()

        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ảnh phản ánh không được rỗng.",
            )

        if len(image_bytes) > self.settings.max_upload_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Ảnh vượt quá dung lượng tối đa {self.settings.max_upload_size_mb}MB.",
            )

        return image_bytes

    def _resolve_content_type(self, content_type: str | None) -> str:
        normalized = (content_type or "").lower().strip()
        return normalized if normalized in ALLOWED_IMAGE_CONTENT_TYPES else "image/jpeg"

    def _build_image_hash(self, image_bytes: bytes) -> str:
        return hashlib.sha256(image_bytes).hexdigest()

    def _store_cached_preview(
        self,
        *,
        preview_token: str,
        image_hash: str,
        result: AiDetectionResult,
    ) -> None:
        self._cleanup_expired_preview_cache()
        self._preview_cache[preview_token] = CachedAiPreviewResult(
            image_hash=image_hash,
            result=result,
            expires_at_ts=datetime.now(timezone.utc).timestamp() + PREVIEW_TOKEN_TTL_SECONDS,
        )

    def _consume_cached_preview(
        self,
        *,
        preview_token: str | None,
        image_hash: str,
    ) -> AiDetectionResult | None:
        self._cleanup_expired_preview_cache()
        if not preview_token:
            return None

        cached = self._preview_cache.pop(preview_token, None)
        if cached is None or cached.image_hash != image_hash:
            return None

        return cached.result

    def _cleanup_expired_preview_cache(self) -> None:
        now_ts = datetime.now(timezone.utc).timestamp()
        expired_tokens = [
            token
            for token, cached in self._preview_cache.items()
            if cached.expires_at_ts <= now_ts
        ]
        for token in expired_tokens:
            self._preview_cache.pop(token, None)

    def _prepare_image_for_ai(self, image_bytes: bytes) -> bytes:
        try:
            with Image.open(BytesIO(image_bytes)) as image:
                image = image.convert("RGB")
                image.thumbnail(
                    (
                        self.settings.max_ai_image_dimension,
                        self.settings.max_ai_image_dimension,
                    )
                )
                output_buffer = BytesIO()
                image.save(output_buffer, format="JPEG", quality=88, optimize=True)
                return output_buffer.getvalue()
        except (UnidentifiedImageError, OSError, ValueError):
            logger.warning(
                "Không tối ưu hóa được ảnh trước khi gọi AI, sẽ dùng byte gốc."
            )
            return image_bytes

    def _save_image(
        self,
        *,
        report_id: str,
        image_bytes: bytes,
        original_filename: str,
    ) -> Path:
        upload_dir = self.settings.resolved_upload_dir
        upload_dir.mkdir(parents=True, exist_ok=True)

        suffix = Path(original_filename).suffix.lower() or ".jpg"
        if suffix not in ALLOWED_IMAGE_SUFFIXES:
            suffix = ".jpg"

        image_path = upload_dir / f"{report_id}{suffix}"
        image_path.write_bytes(image_bytes)

        return image_path

    def _to_upload_relative_path(self, image_path: Path) -> str:
        relative_path = image_path.relative_to(self.settings.resolved_upload_dir.parent)
        return relative_path.as_posix()

    def _validate_coordinates(self, latitude: float, longitude: float) -> None:
        if latitude < -90 or latitude > 90:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Latitude phải nằm trong khoảng -90 đến 90.",
            )

        if longitude < -180 or longitude > 180:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Longitude phải nằm trong khoảng -180 đến 180.",
            )

        if latitude == 0 and longitude == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Vị trí hiện tại không hợp lệ. Vui lòng thử lấy lại vị trí.",
            )

    def _validate_accuracy(self, gps_accuracy: float | None) -> None:
        if gps_accuracy is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Thiếu thông tin về độ chính xác vị trí.",
            )

        if gps_accuracy <= 0 or gps_accuracy > self.settings.max_gps_accuracy_meters:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Độ chính xác vị trí chưa phù hợp. "
                    f"Vui lòng thử lại ở nơi tín hiệu ổn định hơn (tối đa {self.settings.max_gps_accuracy_meters}m)."
                ),
            )

    def _sanitize_note(self, note: str | None) -> str | None:
        if note is None:
            return None

        normalized = re.sub(r"\s+", " ", note).strip()
        normalized = re.sub(r"[\u0000-\u001F\u007F]", " ", normalized)
        normalized = re.sub(r"(.)\1{9,}", r"\1\1\1", normalized)
        normalized = normalized.replace("<", "＜").replace(">", "＞")

        if not normalized:
            return None

        return normalized[: self.settings.max_note_length]

    def _normalize_location_source(self, location_source: str | None) -> str:
        normalized = (location_source or LOCATION_SOURCE_CAMERA_GPS).strip().lower()
        if normalized not in ALLOWED_LOCATION_SOURCES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Nguồn vị trí không hợp lệ.",
            )
        return normalized

    def _normalize_location_recorded_at(self, location_recorded_at: str | None) -> str:
        normalized = (location_recorded_at or "").strip()
        if not normalized:
            return datetime.now(timezone.utc).isoformat()

        try:
            parsed = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Thời gian ghi nhận vị trí không hợp lệ.",
            ) from exc

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        return parsed.astimezone(timezone.utc).isoformat()
