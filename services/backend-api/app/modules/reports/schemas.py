from pydantic import BaseModel, Field
from typing import Literal


class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float


class DamageDetection(BaseModel):
    class_id: int | None = None
    damage_type: str
    class_name: str | None = None
    confidence: float = Field(ge=0, le=1)
    bbox: BoundingBox


class AiDetectionResult(BaseModel):
    success: bool
    image_width: int | None = None
    image_height: int | None = None
    detections_count: int
    detections: list[DamageDetection]
    processing_time_ms: float | None = None
    message: str


class AiPreviewDetectionResult(AiDetectionResult):
    preview_token: str | None = None


class ReporterReportResponse(BaseModel):
    id: str
    image_url: str
    latitude: float
    longitude: float
    gps_accuracy: float | None = None
    location_source: str | None = None
    location_recorded_at: str | None = None
    note: str | None
    corrected_damage_type: str | None = None
    ai_status: str
    status: str
    ai_result: AiDetectionResult
    created_at: str
    updated_at: str


class ReporterReportListResponse(BaseModel):
    items: list[ReporterReportResponse]
    total: int


class AdminReportResponse(ReporterReportResponse):
    image_path: str
    user_id: str | None = None
    admin_note: str | None = None
    is_ai_overridden: bool = False


class AdminReportListResponse(BaseModel):
    items: list[AdminReportResponse]
    total: int


class DashboardKpiItem(BaseModel):
    key: str
    label: str
    value: int
    description: str
    status: str


class DashboardChartItem(BaseModel):
    key: str
    label: str
    value: int
    color: str | None = None


class DashboardTimelineItem(BaseModel):
    date: str
    total: int
    pending: int
    processing: int
    repaired: int


class AdminDashboardResponse(BaseModel):
    total_reports: int
    kpis: list[DashboardKpiItem]
    status_summary: list[DashboardChartItem]
    damage_type_summary: list[DashboardChartItem]
    timeline: list[DashboardTimelineItem]


class ReportMapPoint(BaseModel):
    id: str
    image_url: str
    latitude: float
    longitude: float
    gps_accuracy: float | None = None
    note: str | None = None
    status: str
    damage_type: str | None = None
    damage_label: str | None = None
    corrected_damage_type: str | None = None
    is_ai_overridden: bool = False
    confidence: float | None = None
    created_at: str
    updated_at: str


class ReportMapListResponse(BaseModel):
    items: list[ReportMapPoint]
    total: int


class UpdateReportStatusRequest(BaseModel):
    status: Literal["pending", "processing", "repaired", "rejected"]
    admin_note: str | None = None


class UpdateReportDamageTypeRequest(BaseModel):
    corrected_damage_type: Literal["D00", "D10", "D20", "D40"]
    is_ai_overridden: bool = True


class EngineerAttachmentResponse(BaseModel):
    id: str
    file_url: str
    original_filename: str | None = None
    content_type: str | None = None
    note: str | None = None
    created_at: str


class EngineerReportResponse(ReporterReportResponse):
    assigned_engineer_id: str | None = None
    assigned_engineer_name: str | None = None
    claimed_by_engineer_id: str | None = None
    claimed_by_engineer_name: str | None = None
    claimed_at: str | None = None
    claim_expires_at: str | None = None
    claim_status: str | None = None
    claim_source: str | None = None
    field_status: str | None = None
    survey_started_at: str | None = None
    survey_completed_at: str | None = None
    field_verified_damage_type: str | None = None
    field_severity: str | None = None
    field_priority: str | None = None
    field_note: str | None = None
    field_checked_in_latitude: float | None = None
    field_checked_in_longitude: float | None = None
    field_checked_in_accuracy: float | None = None
    field_checked_in_distance_meters: float | None = None
    field_checked_in_at: str | None = None
    field_checkin_quality: str | None = None
    field_checkin_warning_code: str | None = None
    history_bucket: str | None = None
    history_at: str | None = None
    can_claim: bool = False
    can_release_claim: bool = False
    can_check_in: bool = False
    can_submit_survey: bool = False
    attachments: list[EngineerAttachmentResponse] = Field(default_factory=list)


class EngineerReportListResponse(BaseModel):
    items: list[EngineerReportResponse]
    total: int


class EngineerCheckInRequest(BaseModel):
    latitude: float
    longitude: float
    gps_accuracy: float = Field(gt=0)
    source: str | None = None


class EngineerSurveyRequest(BaseModel):
    verified_damage_type: Literal["D00", "D10", "D20", "D40"] | None = None
    severity: str | None = None
    priority: str | None = None
    note: str | None = None
    submit: bool = False


class AdminAssignEngineerRequest(BaseModel):
    engineer_id: str


class EngineerTimelineItem(BaseModel):
    id: str
    report_id: str
    engineer_id: str | None = None
    engineer_name: str | None = None
    action_type: str
    action_payload_json: dict | None = None
    created_at: str


class EngineerTimelineResponse(BaseModel):
    items: list[EngineerTimelineItem]
