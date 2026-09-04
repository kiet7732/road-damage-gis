from __future__ import annotations

import asyncio
from io import BytesIO
from pathlib import Path
import sys
from types import SimpleNamespace

from fastapi import HTTPException
from starlette.datastructures import Headers, UploadFile
from PIL import Image


AI_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_DIR))

from app.config import Settings
from app.services.detector import RoadDamageDetector


class GuardrailSmokeFailure(RuntimeError):
    pass


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise GuardrailSmokeFailure(message)


def make_upload_file(
    *,
    filename: str,
    content_type: str,
    data: bytes,
) -> UploadFile:
    return UploadFile(
        file=BytesIO(data),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


def create_png_bytes(width: int, height: int) -> bytes:
    image = Image.new("RGB", (width, height), color=(120, 120, 120))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class FastModel:
    def predict(self, **kwargs):
        return [
            SimpleNamespace(
                boxes=[],
                names={},
            )
        ]


class SlowModel:
    def predict(self, **kwargs):
        import time

        time.sleep(0.2)
        return [
            SimpleNamespace(
                boxes=[],
                names={},
            )
        ]


async def expect_http_error(
    coroutine,
    *,
    expected_status: int,
) -> HTTPException:
    try:
        await coroutine
    except HTTPException as exc:
        assert_true(
            exc.status_code == expected_status,
            f"Expected HTTP {expected_status} nhưng nhận {exc.status_code}.",
        )
        return exc

    raise GuardrailSmokeFailure(
        f"Expected HTTP {expected_status} nhưng không có exception nào được raise."
    )


async def main() -> None:
    base_settings = Settings()

    invalid_detector = RoadDamageDetector(base_settings)
    invalid_file = make_upload_file(
        filename="invalid.png",
        content_type="image/png",
        data=b"not-a-real-image",
    )
    invalid_error = await expect_http_error(
        invalid_detector.detect(invalid_file),
        expected_status=400,
    )
    assert_true(
        "không thể" in str(invalid_error.detail).lower()
        or "không đọc" in str(invalid_error.detail).lower(),
        "Thông báo ảnh lỗi chưa đúng kỳ vọng.",
    )

    oversized_settings = base_settings.model_copy(
        update={"max_upload_size_mb": 1}
    )
    oversized_detector = RoadDamageDetector(oversized_settings)
    oversized_file = make_upload_file(
        filename="oversized.png",
        content_type="image/png",
        data=b"x" * (oversized_settings.max_upload_size_bytes + 1),
    )
    await expect_http_error(
        oversized_detector.detect(oversized_file),
        expected_status=413,
    )

    pixel_settings = base_settings.model_copy(
        update={"max_image_pixels": 100}
    )
    pixel_detector = RoadDamageDetector(pixel_settings)
    pixel_file = make_upload_file(
        filename="too-many-pixels.png",
        content_type="image/png",
        data=create_png_bytes(20, 20),
    )
    await expect_http_error(
        pixel_detector.detect(pixel_file),
        expected_status=413,
    )

    timeout_settings = base_settings.model_copy(
        update={"inference_timeout_seconds": 0.05}
    )
    timeout_detector = RoadDamageDetector(timeout_settings)
    timeout_detector._model = SlowModel()
    timeout_file = make_upload_file(
        filename="timeout.png",
        content_type="image/png",
        data=create_png_bytes(64, 64),
    )
    await expect_http_error(
        timeout_detector.detect(timeout_file),
        expected_status=504,
    )

    success_detector = RoadDamageDetector(base_settings)
    success_detector._model = FastModel()
    success_file = make_upload_file(
        filename="ok.png",
        content_type="image/png",
        data=create_png_bytes(64, 64),
    )
    success_result = await success_detector.detect(success_file)
    assert_true(success_result.success is True, "Luồng ảnh hợp lệ không trả success=True.")
    assert_true(success_result.detections_count == 0, "Fast model giả lập phải trả 0 detections.")

    print("=== AI GUARDRAIL SMOKE RESULT ===")
    print("Invalid image handling: PASS")
    print("Oversized payload handling: PASS")
    print("Oversized pixel handling: PASS")
    print("Inference timeout handling: PASS")
    print("Valid image path remains healthy: PASS")


if __name__ == "__main__":
    asyncio.run(main())
