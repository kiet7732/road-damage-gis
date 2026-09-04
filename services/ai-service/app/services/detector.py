import asyncio
from io import BytesIO
import logging
from pathlib import Path
from time import perf_counter
from typing import Any

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool
from ultralytics import YOLO

from app.config import Settings
from app.schemas.detection import BoundingBox, DamageDetection, DetectRoadDamageResponse


DAMAGE_CLASS_LABELS: dict[str, str] = {
    "D00": "Nứt dọc",
    "D10": "Nứt ngang",
    "D20": "Nứt da cá sấu",
    "D40": "Ổ gà",
}

DAMAGE_CLASS_ALIASES: dict[str, str] = {
    "longitudinal": "D00",
    "longitudinal_crack": "D00",
    "vertical_crack": "D00",
    "transverse": "D10",
    "transverse_crack": "D10",
    "horizontal_crack": "D10",
    "alligator": "D20",
    "alligator_crack": "D20",
    "pothole": "D40",
}
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
logger = logging.getLogger(__name__)


class RoadDamageDetector:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._model: YOLO | None = None
        self._model_path: Path = settings.resolved_model_path

    @property
    def model_loaded(self) -> bool:
        return self._model is not None

    @property
    def model_path(self) -> str:
        return str(self._model_path)

    def load_model(self) -> None:
        if self._model is not None:
            return

        if not self._model_path.exists():
            raise FileNotFoundError(f"Không tìm thấy model tại: {self._model_path}")

        if not self._model_path.is_file():
            raise FileNotFoundError(f"Đường dẫn model không phải file: {self._model_path}")

        self._model = YOLO(str(self._model_path))

    async def detect(self, file: UploadFile) -> DetectRoadDamageResponse:
        started_at = perf_counter()

        try:
            image = await self._read_image(file)
            self.load_model()
            assert self._model is not None

            try:
                results = await asyncio.wait_for(
                    run_in_threadpool(
                        self._model.predict,
                        source=image,
                        imgsz=self.settings.image_size,
                        conf=self.settings.confidence_threshold,
                        iou=self.settings.iou_threshold,
                        device=self.settings.yolo_device,
                        verbose=False,
                    ),
                    timeout=self.settings.inference_timeout_seconds,
                )
            except (asyncio.TimeoutError, TimeoutError) as exc:
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail=(
                        "AI Service xử lý ảnh quá thời gian cho phép "
                        f"({self.settings.inference_timeout_seconds}s)."
                    ),
                ) from exc

            detections = self._parse_results(results)
            message = (
                "Không phát hiện hư hỏng mặt đường."
                if not detections
                else f"Phát hiện {len(detections)} hư hỏng mặt đường."
            )

            processing_time_ms = round((perf_counter() - started_at) * 1000, 2)
            logger.info(
                "AI detect completed for %s in %.2fms with %s detections",
                file.filename or "unknown",
                processing_time_ms,
                len(detections),
            )
            return DetectRoadDamageResponse(
                success=True,
                image_width=image.width,
                image_height=image.height,
                detections_count=len(detections),
                detections=detections,
                processing_time_ms=processing_time_ms,
                message=message,
            )
        except HTTPException:
            raise
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Lỗi khi nhận dạng ảnh: {exc}",
            ) from exc

    async def _read_image(self, file: UploadFile) -> Image.Image:
        if not file.content_type or file.content_type.lower() not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="AI Service chỉ hỗ trợ ảnh JPEG, PNG hoặc WEBP.",
            )

        image_bytes = await file.read()

        if not image_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ảnh đầu vào rỗng.",
            )

        if len(image_bytes) > self.settings.max_upload_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Ảnh vượt quá dung lượng tối đa {self.settings.max_upload_size_mb}MB.",
            )

        try:
            image = Image.open(BytesIO(image_bytes))
            image.load()

            if image.width * image.height > self.settings.max_image_pixels:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=(
                        "Ảnh có độ phân giải quá lớn để xử lý an toàn. "
                        f"Giới hạn hiện tại là {self.settings.max_image_pixels} pixel."
                    ),
                )

            image = image.convert("RGB")
            max_dimension = self.settings.max_image_dimension

            if max(image.width, image.height) > max_dimension:
                image.thumbnail((max_dimension, max_dimension))

            return image
        except UnidentifiedImageError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không đọc được ảnh đầu vào.",
            ) from exc
        except OSError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ảnh đầu vào bị lỗi hoặc không thể giải mã.",
            ) from exc

    def _parse_results(self, results: list[Any]) -> list[DamageDetection]:
        if not results:
            return []

        result = results[0]
        boxes = result.boxes

        if boxes is None or len(boxes) == 0:
            return []

        detections: list[DamageDetection] = []
        names = result.names or {}

        for box in boxes:
            class_id = int(box.cls[0].item())
            raw_class_name = str(names.get(class_id, f"class_{class_id}"))
            class_code = self._normalize_class_code(raw_class_name)
            x1, y1, x2, y2 = [float(value) for value in box.xyxy[0].tolist()]
            confidence = float(box.conf[0].item())

            detections.append(
                DamageDetection(
                    class_id=class_id,
                    damage_type=class_code,
                    class_name=DAMAGE_CLASS_LABELS.get(class_code, raw_class_name),
                    confidence=round(confidence, 4),
                    bbox=BoundingBox(
                        x1=round(x1, 2),
                        y1=round(y1, 2),
                        x2=round(x2, 2),
                        y2=round(y2, 2),
                    ),
                )
            )

        return detections

    def _normalize_class_code(self, class_name: str) -> str:
        normalized_name = class_name.strip().upper()

        if normalized_name in DAMAGE_CLASS_LABELS:
            return normalized_name

        alias_key = class_name.strip().lower().replace(" ", "_").replace("-", "_")
        return DAMAGE_CLASS_ALIASES.get(alias_key, normalized_name)
