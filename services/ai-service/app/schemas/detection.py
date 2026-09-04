from pydantic import BaseModel, Field
from typing import Any, Literal


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class DamageDetection(BaseModel):
    class_id: int
    damage_type: str
    class_name: str
    confidence: float = Field(ge=0, le=1)
    bbox: BoundingBox


class DetectRoadDamageResponse(BaseModel):
    success: bool
    image_width: int
    image_height: int
    detections_count: int
    detections: list[DamageDetection]
    processing_time_ms: float
    message: str


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    error_code: str
    message: str
    details: Any | None = None


class HealthResponse(BaseModel):
    success: bool
    model_loaded: bool
    model_path: str
    message: str


class ReadinessResponse(BaseModel):
    success: bool
    ready: bool
    service: str
    model_loaded: bool
    model_path: str
    checks: dict[str, Any]
    message: str
