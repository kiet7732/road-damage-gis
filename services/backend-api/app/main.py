from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import check_database_ready, init_database
from app.modules.auth.router import router as auth_router
from app.modules.gis.router import router as gis_router
from app.modules.reports.router import router as reports_router
from app.schemas import build_error_response


settings = get_settings()
settings.resolved_upload_dir.parent.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Backend API cho hệ thống GIS nhận dạng hư hỏng mặt đường.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_database()
    settings.resolved_upload_dir.mkdir(parents=True, exist_ok=True)


def _error_code_from_status(status_code: int) -> str:
    if status_code == status.HTTP_400_BAD_REQUEST:
        return "BAD_REQUEST"
    if status_code == status.HTTP_401_UNAUTHORIZED:
        return "UNAUTHORIZED"
    if status_code == status.HTTP_403_FORBIDDEN:
        return "FORBIDDEN"
    if status_code == status.HTTP_404_NOT_FOUND:
        return "NOT_FOUND"
    if status_code == status.HTTP_409_CONFLICT:
        return "CONFLICT"
    if status_code == status.HTTP_422_UNPROCESSABLE_ENTITY:
        return "VALIDATION_ERROR"
    if status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
        return "INTERNAL_SERVER_ERROR"

    return "API_ERROR"


def _http_error_message(status_code: int, detail: object) -> str:
    if isinstance(detail, str) and detail.strip():
        return detail

    if status_code == status.HTTP_401_UNAUTHORIZED:
        return "Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
    if status_code == status.HTTP_403_FORBIDDEN:
        return "Bạn không có quyền thực hiện chức năng này."
    if status_code == status.HTTP_404_NOT_FOUND:
        return "Không tìm thấy dữ liệu yêu cầu."

    return "Thông tin gửi lên chưa hợp lệ."


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=build_error_response(
            error_code="VALIDATION_ERROR",
            message="Thông tin gửi lên chưa hợp lệ.",
            details=exc.errors(),
        ).model_dump(),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request,
    exc: HTTPException,
) -> JSONResponse:
    details = exc.detail if not isinstance(exc.detail, str) else None

    return JSONResponse(
        status_code=exc.status_code,
        content=build_error_response(
            error_code=_error_code_from_status(exc.status_code),
            message=_http_error_message(exc.status_code, exc.detail),
            details=details,
        ).model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=build_error_response(
            error_code="INTERNAL_SERVER_ERROR",
            message="Hệ thống đang tạm gián đoạn. Vui lòng thử lại sau.",
            details=None,
        ).model_dump(),
    )


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.get("/ready")
def readiness_check() -> JSONResponse:
    try:
        database = check_database_ready()
        uploads_ready = settings.resolved_upload_dir.exists() and settings.resolved_upload_dir.is_dir()
        ready = bool(database["connected"]) and bool(database["ready"]) and uploads_ready

        return JSONResponse(
            status_code=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "ready" if ready else "not_ready",
                "ready": ready,
                "service": settings.app_name,
                "checks": {
                    "database": database,
                    "uploads": {
                        "ready": uploads_ready,
                        "directory": str(settings.resolved_upload_dir),
                    },
                },
            },
        )
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "not_ready",
                "ready": False,
                "service": settings.app_name,
                "checks": {
                    "database": {
                        "ready": False,
                        "error": str(exc),
                    }
                },
            },
        )


app.include_router(reports_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(gis_router, prefix=settings.api_prefix)
app.mount(
    settings.normalized_upload_url_prefix,
    StaticFiles(directory=settings.resolved_upload_dir.parent),
    name="uploads",
)
