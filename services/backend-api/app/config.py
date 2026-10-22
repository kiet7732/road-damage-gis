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

    app_name: str = "Road Damage GIS Backend API"
    app_env: str = Field(default="development", alias="APP_ENV")
    backend_host: str = Field(default="127.0.0.1", alias="BACKEND_HOST")
    backend_port: int = Field(default=5000, alias="BACKEND_PORT")
    backend_public_base_url: str = Field(default="http://localhost:5000", alias="BACKEND_PUBLIC_BASE_URL")
    backend_api_url: str = Field(default="http://localhost:5000/api", alias="BACKEND_API_URL")
    api_prefix: str = Field(default="/api", alias="BACKEND_API_PREFIX")
    upload_url_prefix: str = Field(default="/uploads", alias="BACKEND_UPLOAD_URL_PREFIX")
    database_path: str = Field(default="./data/road_damage_gis.db", alias="BACKEND_DATABASE_PATH")
    upload_dir: str = Field(default="./uploads/reports", alias="BACKEND_UPLOAD_DIR")
    max_upload_size_mb: int = Field(default=15, alias="BACKEND_MAX_UPLOAD_SIZE_MB")
    max_ai_image_dimension: int = Field(default=1600, alias="BACKEND_MAX_AI_IMAGE_DIMENSION")
    max_gps_accuracy_meters: int = Field(default=80, alias="BACKEND_MAX_GPS_ACCURACY_METERS")
    max_note_length: int = Field(default=500, alias="BACKEND_MAX_NOTE_LENGTH")
    ai_service_url: str = Field(default="http://localhost:8001", alias="AI_SERVICE_URL")
    ai_detect_endpoint: str = Field(default="/api/ai/detect-road-damage", alias="AI_DETECT_ENDPOINT")
    ai_timeout_seconds: float = Field(default=20, alias="AI_TIMEOUT_SECONDS")
    gis_backend: str = Field(default="sqlite", alias="GIS_BACKEND")
    gis_srid: int = Field(default=4326, alias="GIS_SRID")
    read_only_mode: bool = Field(default=False, alias="READ_ONLY_MODE")
    maintenance_mode: bool = Field(default=False, alias="MAINTENANCE_MODE")
    postgres_host: str = Field(default="127.0.0.1", alias="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, alias="POSTGRES_PORT")
    postgres_db: str = Field(default="road_damage_gis", alias="POSTGRES_DB")
    postgres_user: str = Field(default="rdg_admin", alias="POSTGRES_USER")
    postgres_password: str = Field(default="rdg_secret_postgis_2026", alias="POSTGRES_PASSWORD")
    postgres_pool_min_size: int = Field(default=5, alias="POSTGRES_POOL_MIN_SIZE")
    postgres_pool_max_size: int = Field(default=20, alias="POSTGRES_POOL_MAX_SIZE")
    database_url: str | None = Field(default=None, alias="DATABASE_URL")
    nominatim_server_url: str = Field(default="http://localhost:8080", alias="NOMINATIM_SERVER_URL")
    nominatim_fallback_url: str = Field(
        default="https://nominatim.openstreetmap.org", alias="NOMINATIM_FALLBACK_URL"
    )
    nominatim_timeout_seconds: float = Field(default=2.0, alias="NOMINATIM_TIMEOUT_SECONDS")
    geocoding_cache_radius_meters: float = Field(default=15.0, alias="GEOCODING_CACHE_RADIUS_METERS")
    nominatim_user_agent: str = Field(
        default="RoadDamageGIS/1.0 (contact: admin@roaddamagegis.local)",
        alias="NOMINATIM_USER_AGENT",
    )
    jwt_secret_key: str = Field(default="change-me-in-production", alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=14, alias="REFRESH_TOKEN_EXPIRE_DAYS")
    web_access_cookie_name: str = Field(default="rdg_access_token", alias="WEB_ACCESS_COOKIE_NAME")
    web_refresh_cookie_name: str = Field(default="rdg_refresh_token", alias="WEB_REFRESH_COOKIE_NAME")
    cookie_secure: bool = Field(default=False, alias="COOKIE_SECURE")
    cookie_same_site: str = Field(default="lax", alias="COOKIE_SAME_SITE")
    cors_allowed_origins: str = Field(
        default="",
        alias="CORS_ALLOWED_ORIGINS",
    )
    cors_allowed_origins_dev: str = Field(
        default="http://localhost:8081,http://localhost:5173,http://127.0.0.1:8081,http://127.0.0.1:5173",
        alias="CORS_ALLOWED_ORIGINS_DEV",
    )
    cors_allowed_origins_staging: str = Field(default="", alias="CORS_ALLOWED_ORIGINS_STAGING")
    cors_allowed_origins_prod: str = Field(default="", alias="CORS_ALLOWED_ORIGINS_PROD")

    # SMTP / Email OTP
    smtp_host: str = Field(default="", alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: str = Field(default="", alias="SMTP_USER")
    smtp_password: str = Field(default="", alias="SMTP_PASSWORD")
    smtp_from_email: str = Field(default="noreply@roadgis.local", alias="SMTP_FROM_EMAIL")
    smtp_from_name: str = Field(default="Road Damage GIS", alias="SMTP_FROM_NAME")
    smtp_use_tls: bool = Field(default=True, alias="SMTP_USE_TLS")
    otp_expire_seconds: int = Field(default=300, alias="OTP_EXPIRE_SECONDS")

    @property
    def resolved_database_path(self) -> Path:
        return (BASE_DIR / self.database_path).resolve()

    @property
    def resolved_database_url(self) -> str:
        if self.database_url and self.database_url.strip():
            return self.database_url.strip()
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def resolved_upload_dir(self) -> Path:
        return (BASE_DIR / self.upload_dir).resolve()

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def ai_detect_url(self) -> str:
        return f"{self.ai_service_url.rstrip('/')}/{self.ai_detect_endpoint.lstrip('/')}"

    @property
    def normalized_nominatim_server_url(self) -> str:
        return self.nominatim_server_url.rstrip("/")

    @property
    def normalized_nominatim_fallback_url(self) -> str:
        return self.nominatim_fallback_url.rstrip("/")

    @property
    def normalized_backend_public_base_url(self) -> str:
        return self.backend_public_base_url.rstrip("/")

    @property
    def normalized_backend_api_url(self) -> str:
        return self.backend_api_url.rstrip("/")

    @property
    def normalized_upload_url_prefix(self) -> str:
        prefix = self.upload_url_prefix.strip() or "/uploads"
        if not prefix.startswith("/"):
            prefix = f"/{prefix}"

        return prefix.rstrip("/") or "/uploads"

    @property
    def normalized_app_env(self) -> str:
        return self.app_env.strip().lower()

    @property
    def is_production(self) -> bool:
        return self.normalized_app_env == "production"

    @property
    def normalized_cookie_same_site(self) -> str:
        value = self.cookie_same_site.strip().lower()

        if value not in {"lax", "strict", "none"}:
            return "lax"

        return value

    @property
    def cookie_secure_enabled(self) -> bool:
        return self.cookie_secure or self.is_production

    @property
    def cors_origins_list(self) -> list[str]:
        selected_origins = self.cors_allowed_origins

        if not selected_origins:
            if self.normalized_app_env == "production":
                selected_origins = self.cors_allowed_origins_prod
            elif self.normalized_app_env == "staging":
                selected_origins = self.cors_allowed_origins_staging
            else:
                selected_origins = self.cors_allowed_origins_dev

        return [
            origin.strip()
            for origin in selected_origins.split(",")
            if origin.strip()
        ]

    def build_public_upload_url(self, relative_path: str) -> str:
        normalized_relative_path = relative_path.replace("\\", "/").lstrip("/")
        return f"{self.normalized_backend_public_base_url}{self.normalized_upload_url_prefix}/{normalized_relative_path}"


@lru_cache
def get_settings() -> Settings:
    return Settings()
