from fastapi import FastAPI, File, HTTPException, Request, UploadFile, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.schemas.detection import DetectRoadDamageResponse, ErrorResponse, HealthResponse, ReadinessResponse
from app.services.detector import RoadDamageDetector


settings = get_settings()
detector = RoadDamageDetector(settings)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="AI Service nhận dạng hư hỏng mặt đường bằng YOLO12.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)


def build_error_payload(
    *,
    error_code: str,
    message: str,
    details: object | None = None,
) -> dict:
    return ErrorResponse(
        error_code=error_code,
        message=message,
        details=details,
    ).model_dump()


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=build_error_payload(
            error_code="VALIDATION_ERROR",
            message="Dữ liệu ảnh gửi lên không hợp lệ.",
            details=exc.errors(),
        ),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request,
    exc: HTTPException,
) -> JSONResponse:
    error_code = "AI_SERVICE_ERROR"
    if exc.status_code == status.HTTP_400_BAD_REQUEST:
        error_code = "BAD_REQUEST"
    elif exc.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE:
        error_code = "FILE_TOO_LARGE"
    elif exc.status_code == status.HTTP_504_GATEWAY_TIMEOUT:
        error_code = "INFERENCE_TIMEOUT"
    elif exc.status_code == status.HTTP_503_SERVICE_UNAVAILABLE:
        error_code = "MODEL_UNAVAILABLE"

    return JSONResponse(
        status_code=exc.status_code,
        content=build_error_payload(
            error_code=error_code,
            message=str(exc.detail) if exc.detail else "Yêu cầu xử lý ảnh thất bại.",
            details=None if isinstance(exc.detail, str) else exc.detail,
        ),
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=build_error_payload(
            error_code="INTERNAL_SERVER_ERROR",
            message="AI Service đang gặp lỗi nội bộ.",
            details=None,
        ),
    )


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    return HealthResponse(
        success=True,
        model_loaded=detector.model_loaded,
        model_path=detector.model_path,
        message="AI Service đang chạy.",
    )


@app.get("/ready", response_model=ReadinessResponse)
def readiness_check() -> JSONResponse:
    try:
        detector.load_model()
        ready = detector.model_loaded
        payload = ReadinessResponse(
            success=ready,
            ready=ready,
            service=settings.app_name,
            model_loaded=detector.model_loaded,
            model_path=detector.model_path,
            checks={
                "model_file_exists": detector._model_path.exists(),
                "model_file_is_file": detector._model_path.is_file(),
                "image_size": settings.image_size,
                "device": settings.device,
                "inference_timeout_seconds": settings.inference_timeout_seconds,
                "max_image_pixels": settings.max_image_pixels,
            },
            message="AI Service sẵn sàng nhận dạng." if ready else "AI Service chưa sẵn sàng.",
        ).model_dump()

        return JSONResponse(
            status_code=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
            content=payload,
        )
    except Exception as exc:
        payload = ReadinessResponse(
            success=False,
            ready=False,
            service=settings.app_name,
            model_loaded=False,
            model_path=detector.model_path,
            checks={
                "model_file_exists": detector._model_path.exists(),
                "model_file_is_file": detector._model_path.is_file(),
            },
            message=str(exc),
        ).model_dump()

        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=payload,
        )


@app.post(
    f"{settings.api_prefix}/detect-road-damage",
    response_model=DetectRoadDamageResponse,
    responses={
        400: {"model": ErrorResponse},
        413: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
        500: {"model": ErrorResponse},
    },
)
async def detect_road_damage(
    image: UploadFile = File(...),
) -> DetectRoadDamageResponse:
    if not image.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng gửi ảnh cần nhận dạng.",
        )
    try:
        return await detector.detect(image)
    finally:
        await image.close()


@app.post(
    f"{settings.api_prefix}/detect",
    response_model=DetectRoadDamageResponse,
)
async def detect_alias(
    image: UploadFile = File(...),
) -> DetectRoadDamageResponse:
    return await detect_road_damage(image)
