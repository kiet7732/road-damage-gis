from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[3]
ROOT_ENV_FILE = REPO_ROOT / ".env"
SERVICE_ENV_FILE = BASE_DIR / ".env"

load_dotenv(ROOT_ENV_FILE, override=False)
load_dotenv(SERVICE_ENV_FILE, override=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(ROOT_ENV_FILE, SERVICE_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Road Damage GIS AI Service"
    service_host: str = Field(default="127.0.0.1", alias="AI_SERVICE_HOST")
    service_port: int = Field(default=8001, alias="AI_SERVICE_PORT")
    service_url: str = Field(default="http://localhost:8001", alias="AI_SERVICE_URL")
    api_prefix: str = Field(default="/api/ai", alias="AI_API_PREFIX")
    model_path: str = Field(
        default="./models/best_26s_rdd_vn.pt",
        alias="AI_MODEL_PATH",
    )
    image_size: int = Field(default=1216, alias="AI_IMAGE_SIZE")
    confidence_threshold: float = Field(default=0.05, alias="AI_CONFIDENCE_THRESHOLD")
    iou_threshold: float = Field(default=0.45, alias="AI_IOU_THRESHOLD")
    device: str = Field(default="auto", alias="AI_DEVICE")
    inference_timeout_seconds: float = Field(default=25, alias="AI_INFERENCE_TIMEOUT_SECONDS")
    max_upload_size_mb: int = Field(default=15, alias="AI_MAX_UPLOAD_SIZE_MB")
    max_image_dimension: int = Field(default=1600, alias="AI_MAX_IMAGE_DIMENSION")
    max_image_pixels: int = Field(default=25_000_000, alias="AI_MAX_IMAGE_PIXELS")
    cors_allowed_origins: str = Field(default="*", alias="AI_CORS_ALLOWED_ORIGINS")

    @property
    def resolved_model_path(self) -> Path:
        raw_path = Path(self.model_path).expanduser()
        if raw_path.is_absolute():
            return raw_path.resolve()

        return (BASE_DIR / raw_path).resolve()

    @property
    def yolo_device(self) -> str | None:
        return None if self.device.lower() == "auto" else self.device

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def normalized_service_url(self) -> str:
        return self.service_url.rstrip("/")

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_allowed_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
