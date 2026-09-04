from typing import Literal

from pydantic import BaseModel


class GeoJsonPointGeometry(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: tuple[float, float]


class GeoJsonBBox(BaseModel):
    min_longitude: float
    min_latitude: float
    max_longitude: float
    max_latitude: float


class ReportGeoJsonProperties(BaseModel):
    id: str
    image_url: str
    user_id: str | None = None
    status: str
    ai_status: str | None = None
    note: str | None = None
    gps_accuracy: float | None = None
    location_source: str | None = None
    location_recorded_at: str | None = None
    damage_type: str | None = None
    damage_label: str | None = None
    corrected_damage_type: str | None = None
    is_ai_overridden: bool = False
    confidence: float | None = None
    created_at: str
    updated_at: str


class ReportGeoJsonFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    id: str
    geometry: GeoJsonPointGeometry
    properties: ReportGeoJsonProperties


class ReportGeoJsonFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[ReportGeoJsonFeature]
    bbox: tuple[float, float, float, float] | None = None
    query_bbox: tuple[float, float, float, float] | None = None
    matched_total: int = 0
    pending_count: int = 0
    processing_count: int = 0
    repaired_count: int = 0
    top_damage_type: str | None = None
    top_damage_label: str | None = None
