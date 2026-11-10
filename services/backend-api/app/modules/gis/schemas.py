from typing import Any, Literal

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
    road_name: str | None = None
    ward: str | None = None
    district: str | None = None
    province: str | None = None
    formatted_address: str | None = None
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


class DistrictHierarchyItem(BaseModel):
    name: str
    wards: list[str] = []
    roads: list[str] = []
    total_reports: int = 0


class ProvinceHierarchyItem(BaseModel):
    name: str
    districts: list[DistrictHierarchyItem] = []


class AdministrativeHierarchyResponse(BaseModel):
    provinces: list[ProvinceHierarchyItem]


class NoisePointItem(BaseModel):
    id: str
    status: str
    latitude: float | None = None
    longitude: float | None = None
    damage_type: str | None = None


class GisReportClusterItem(BaseModel):
    cluster_id: int | None = None
    count: int
    centroid_geojson: dict[str, Any] | None = None
    center_latitude: float | None = None
    center_longitude: float | None = None
    noise_points: list[dict[str, Any]] | None = None
    items: list[dict[str, Any]] | None = None


class RoadRestrictionCreate(BaseModel):
    road_name: str
    province: str
    district: str | None = None
    ward: str | None = None
    start_latitude: float
    start_longitude: float
    end_latitude: float
    end_longitude: float
    restriction_type: str = "under_maintenance"
    severity: str = "warning"
    reason: str
    start_date: str | None = None
    end_date: str | None = None
    is_active: bool = True


class RoadRestrictionUpdate(BaseModel):
    road_name: str | None = None
    province: str | None = None
    district: str | None = None
    ward: str | None = None
    restriction_type: str | None = None
    severity: str | None = None
    reason: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_active: bool | None = None


class RoadRestrictionStatusUpdate(BaseModel):
    is_active: bool


class RoadRestrictionItem(BaseModel):
    id: str
    road_name: str
    province: str
    district: str | None = None
    ward: str | None = None
    start_latitude: float
    start_longitude: float
    end_latitude: float
    end_longitude: float
    coordinates: list[tuple[float, float]] = []
    restriction_type: str
    severity: str
    reason: str
    start_date: str
    end_date: str | None = None
    is_active: bool
    created_by_user_id: str | None = None
    created_at: str
    updated_at: str


class RoadRestrictionListResponse(BaseModel):
    total: int
    items: list[RoadRestrictionItem]

