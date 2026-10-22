from collections.abc import Generator
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Body, Depends, File, Form, HTTPException, Query, UploadFile, status

from app.config import Settings, get_settings
from app.database import get_connection
from app.modules.auth.dependencies import (
    enforce_spatial_district_access,
    get_admin_user,
    get_current_user,
    get_engineer_user,
    verify_report_spatial_access,
)
from app.modules.auth.schemas import AuthUser
from app.modules.auth.repository import AuthRepository
from app.modules.reports.ai_client import AiServiceClient
from app.modules.reports.repository import CHECKIN_NEAR_THRESHOLD_METERS, ReportRepository
from app.modules.reports.schemas import (
    AdminAssignEngineerRequest,
    AdminDashboardResponse,
    AdminReportListResponse,
    AdminReportResponse,
    AdministrativeStatsResponse,
    AiDetectionResult,
    AiPreviewDetectionResult,
    DamageClustersResponse,
    EngineerCheckInRequest,
    EngineerReportListResponse,
    EngineerReportResponse,
    EngineerSurveyRequest,
    EngineerTimelineResponse,
    NearbyReportsResponse,
    ReporterReportListResponse,
    ReporterReportResponse,
    UpdateReportDamageTypeRequest,
    UpdateReportStatusRequest,
)
from app.modules.reports.service import ReportService


router = APIRouter(tags=["reports"])


def get_report_service(
    settings: Settings = Depends(get_settings),
) -> Generator[ReportService, None, None]:
    connection = get_connection()
    try:
        repository = ReportRepository(connection)
        ai_client = AiServiceClient(settings)

        yield ReportService(
            settings=settings,
            repository=repository,
            ai_client=ai_client,
        )
    finally:
        connection.close()


@router.post("/reports", response_model=ReporterReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    gps_accuracy: float = Form(...),
    location_source: str | None = Form(default="camera_gps"),
    location_recorded_at: str | None = Form(default=None),
    image_source: str | None = Form(default="camera_live"),
    note: str | None = Form(default=None),
    preview_token: str | None = Form(default=None),
    service: ReportService = Depends(get_report_service),
    current_user: AuthUser = Depends(get_current_user),
 ) -> ReporterReportResponse:
    try:
        return await service.create_report(
            current_user=current_user,
            image=image,
            latitude=latitude,
            longitude=longitude,
            gps_accuracy=gps_accuracy,
            location_source=location_source,
            location_recorded_at=location_recorded_at,
            image_source=image_source,
            note=note,
            preview_token=preview_token,
            background_tasks=background_tasks,
        )
    finally:
        await image.close()


@router.post("/reports/preview-ai", response_model=AiPreviewDetectionResult)
async def preview_report_ai(
    image: UploadFile = File(...),
    service: ReportService = Depends(get_report_service),
    current_user: AuthUser = Depends(get_current_user),
) -> AiPreviewDetectionResult:
    try:
        return await service.preview_ai_result(image=image)
    finally:
        await image.close()


@router.get("/reports/history", response_model=ReporterReportListResponse)
def list_report_history(
    limit: int = 50,
    offset: int = 0,
    current_user: AuthUser = Depends(get_current_user),
) -> ReporterReportListResponse:
    with get_connection() as connection:
        items, total = ReportRepository(connection).list_reports(
            limit=limit,
            offset=offset,
            user_id=current_user.id,
        )

    return ReporterReportListResponse(items=items, total=total)


@router.get("/engineer/reports/nearby", response_model=NearbyReportsResponse)
@router.get("/reports/nearby", response_model=NearbyReportsResponse)
def get_nearby_reports(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    radius_meters: float = Query(default=200.0, ge=10.0, le=5000.0),
    status: str | None = Query(default=None),
    exclude_repaired: bool = Query(default=True),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: AuthUser = Depends(get_current_user),
) -> NearbyReportsResponse:
    with get_connection() as connection:
        items = ReportRepository(connection).list_nearby_reports(
            latitude=latitude,
            longitude=longitude,
            radius_meters=radius_meters,
            status=status,
            exclude_repaired=exclude_repaired,
            limit=limit,
        )
    return NearbyReportsResponse(
        items=items,
        total=len(items),
        center_latitude=latitude,
        center_longitude=longitude,
        radius_meters=radius_meters,
    )


@router.get("/reports/clusters", response_model=DamageClustersResponse)
@router.get("/admin/reports/clusters", response_model=DamageClustersResponse)
def get_damage_clusters(
    eps: float = Query(default=0.001, gt=0.0, le=0.05),
    min_points: int = Query(default=3, ge=2, le=50),
    status: str | None = Query(default=None),
    district: str | None = Query(default=None),
    ward: str | None = Query(default=None),
) -> DamageClustersResponse:
    with get_connection() as connection:
        return ReportRepository(connection).get_damage_clusters(
            eps=eps,
            min_points=min_points,
            status=status,
            district=district,
            ward=ward,
        )


@router.get("/reports/{report_id}", response_model=ReporterReportResponse)
def get_report(
    report_id: str,
    current_user: AuthUser = Depends(get_current_user),
) -> ReporterReportResponse:
    with get_connection() as connection:
        report = ReportRepository(connection).get_report(report_id)

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phản ánh.",
        )

    return report


@router.get("/admin/reports", response_model=AdminReportListResponse)
def list_admin_reports(
    limit: int = 10,
    offset: int = 0,
    status_filter: str | None = None,
    damage_type: str | None = None,
    search: str | None = None,
    ai_status: str | None = None,
    district: str | None = None,
    ward: str | None = None,
    road_name: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    current_user: AuthUser = Depends(get_admin_user),
) -> AdminReportListResponse:
    effective_district = enforce_spatial_district_access(current_user, district)
    with get_connection() as connection:
        items, total = ReportRepository(connection).list_reports(
            limit=limit,
            offset=offset,
            status=status_filter,
            damage_type=damage_type,
            search=search,
            ai_status=ai_status,
            district=effective_district,
            ward=ward,
            road_name=road_name,
            from_date=from_date,
            to_date=to_date,
            include_admin_fields=True,
        )

    return AdminReportListResponse(items=items, total=total)


@router.get("/admin/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    district: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    current_user: AuthUser = Depends(get_admin_user),
) -> AdminDashboardResponse:
    effective_district = enforce_spatial_district_access(current_user, district)
    with get_connection() as connection:
        return ReportRepository(connection).get_admin_dashboard(
            district=effective_district,
            from_date=from_date,
            to_date=to_date,
        )


@router.get("/admin/dashboard/administrative-stats", response_model=AdministrativeStatsResponse)
def get_admin_dashboard_administrative_stats(
    district: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    current_user: AuthUser = Depends(get_admin_user),
) -> AdministrativeStatsResponse:
    effective_district = enforce_spatial_district_access(current_user, district)
    with get_connection() as connection:
        return ReportRepository(connection).get_administrative_stats(
            district=effective_district,
            from_date=from_date,
            to_date=to_date,
        )


@router.get("/admin/reports/{report_id}", response_model=AdminReportResponse)
def get_admin_report(
    report_id: str,
    current_user: AuthUser = Depends(get_admin_user),
) -> AdminReportResponse:
    with get_connection() as connection:
        report = ReportRepository(connection).get_report(report_id, include_admin_fields=True)

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy phản ánh.",
        )

    verify_report_spatial_access(current_user, report.district, action_description="truy cập")

    return report


@router.patch("/admin/reports/{report_id}/status", response_model=AdminReportResponse)
def update_admin_report_status(
    report_id: str,
    payload: UpdateReportStatusRequest = Body(...),
    current_user: AuthUser = Depends(get_admin_user),
) -> AdminReportResponse:
    with get_connection() as connection:
        repository = ReportRepository(connection)
        existing_report = repository.get_report(report_id, include_admin_fields=True)

        if existing_report is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy phản ánh.",
            )

        verify_report_spatial_access(current_user, existing_report.district, action_description="thao tác trên")

        updated_report = repository.update_report_status(
            report_id,
            status=payload.status,
            admin_note=(payload.admin_note or "").strip() or None,
            updated_at=datetime.now(timezone.utc).isoformat(),
            include_admin_fields=True,
        )

    if updated_report is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật trạng thái báo cáo.",
        )

    return updated_report


@router.patch("/admin/reports/{report_id}/damage-type", response_model=AdminReportResponse)
def update_admin_report_damage_type(
    report_id: str,
    payload: UpdateReportDamageTypeRequest = Body(...),
    current_user: AuthUser = Depends(get_admin_user),
) -> AdminReportResponse:
    with get_connection() as connection:
        repository = ReportRepository(connection)
        existing_report = repository.get_report(report_id, include_admin_fields=True)

        if existing_report is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy phản ánh.",
            )

        verify_report_spatial_access(current_user, existing_report.district, action_description="thao tác trên")

        updated_report = repository.update_report_damage_type(
            report_id,
            corrected_damage_type=payload.corrected_damage_type,
            is_ai_overridden=payload.is_ai_overridden,
            updated_at=datetime.now(timezone.utc).isoformat(),
            include_admin_fields=True,
        )

    if updated_report is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật loại hư hỏng.",
        )

    return updated_report


@router.get("/engineer/reports/available", response_model=EngineerReportListResponse)
def list_engineer_available_reports(
    limit: int = 50,
    offset: int = 0,
    current_user: AuthUser = Depends(get_engineer_user),
) -> EngineerReportListResponse:
    with get_connection() as connection:
        items, total = ReportRepository(connection).list_engineer_reports(
            scope="available",
            engineer_id=current_user.id,
            limit=limit,
            offset=offset,
        )
    return EngineerReportListResponse(items=items, total=total)


@router.get("/engineer/reports/assigned", response_model=EngineerReportListResponse)
def list_engineer_assigned_reports(
    limit: int = 50,
    offset: int = 0,
    current_user: AuthUser = Depends(get_engineer_user),
) -> EngineerReportListResponse:
    with get_connection() as connection:
        items, total = ReportRepository(connection).list_engineer_reports(
            scope="assigned",
            engineer_id=current_user.id,
            limit=limit,
            offset=offset,
        )
    return EngineerReportListResponse(items=items, total=total)


@router.get("/engineer/reports/in-progress", response_model=EngineerReportListResponse)
def list_engineer_in_progress_reports(
    limit: int = 50,
    offset: int = 0,
    current_user: AuthUser = Depends(get_engineer_user),
) -> EngineerReportListResponse:
    with get_connection() as connection:
        items, total = ReportRepository(connection).list_engineer_reports(
            scope="in-progress",
            engineer_id=current_user.id,
            limit=limit,
            offset=offset,
        )
    return EngineerReportListResponse(items=items, total=total)


@router.get("/engineer/reports/history", response_model=EngineerReportListResponse)
def list_engineer_history_reports(
    limit: int = 50,
    offset: int = 0,
    current_user: AuthUser = Depends(get_engineer_user),
) -> EngineerReportListResponse:
    with get_connection() as connection:
        items, total = ReportRepository(connection).list_engineer_reports(
            scope="history",
            engineer_id=current_user.id,
            limit=limit,
            offset=offset,
        )
    return EngineerReportListResponse(items=items, total=total)


@router.get("/engineer/reports/{report_id}", response_model=EngineerReportResponse)
def get_engineer_report_detail(
    report_id: str,
    current_user: AuthUser = Depends(get_engineer_user),
) -> EngineerReportResponse:
    with get_connection() as connection:
        report = ReportRepository(connection).get_engineer_report(report_id, engineer_id=current_user.id)
    if report is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phản ánh.")
    return report


@router.post("/engineer/reports/{report_id}/claim", response_model=EngineerReportResponse)
def claim_engineer_report(
    report_id: str,
    current_user: AuthUser = Depends(get_engineer_user),
) -> EngineerReportResponse:
    with get_connection() as connection:
        report = ReportRepository(connection).claim_engineer_report(
            report_id,
            engineer_id=current_user.id,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
    if report is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Điểm này đã có người giữ hoặc không còn khả dụng.")
    return report


@router.post("/engineer/reports/{report_id}/release-claim", response_model=EngineerReportResponse)
def release_engineer_claim(
    report_id: str,
    current_user: AuthUser = Depends(get_engineer_user),
) -> EngineerReportResponse:
    with get_connection() as connection:
        report = ReportRepository(connection).release_engineer_claim(
            report_id,
            engineer_id=current_user.id,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
    if report is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Không thể hủy nhận kiểm tra ở trạng thái hiện tại.")
    return report


@router.post("/engineer/reports/{report_id}/check-in", response_model=EngineerReportResponse)
@router.post("/engineer/tasks/{report_id}/check-in", response_model=EngineerReportResponse)
def check_in_engineer_report(
    report_id: str,
    payload: EngineerCheckInRequest = Body(...),
    current_user: AuthUser = Depends(get_engineer_user),
) -> EngineerReportResponse:
    if payload.is_mocked:
        with get_connection() as connection:
            ReportRepository(connection).log_rejected_check_in(
                report_id=report_id,
                engineer_id=current_user.id,
                reason="mock_location_detected",
                payload=payload.model_dump(),
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phát hiện tọa độ giả lập (Mock Location). Yêu cầu tắt các ứng dụng can thiệp GPS.",
        )

    with get_connection() as connection:
        repo = ReportRepository(connection)
        server_distance = repo.calculate_report_distance(
            report_id=report_id,
            latitude=payload.latitude,
            longitude=payload.longitude,
        )
        if server_distance is not None and server_distance > CHECKIN_NEAR_THRESHOLD_METERS:
            repo.log_rejected_check_in(
                report_id=report_id,
                engineer_id=current_user.id,
                reason="distance_exceeded",
                payload={
                    **payload.model_dump(),
                    "server_distance_meters": server_distance,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Từ chối check-in: Cự ly hiện tại ({round(server_distance, 1)}m) vượt quá bán kính tiếp cận cho phép (30m).",
            )

        report = repo.check_in_engineer_report(
            report_id,
            engineer_id=current_user.id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            gps_accuracy=payload.gps_accuracy,
            source=payload.source,
            is_mocked=payload.is_mocked,
            client_distance_meters=payload.distance_meters,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
    if report is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Bạn chưa giữ quyền kiểm tra cho điểm này.")
    if report.field_checkin_quality == "invalid":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vị trí check-in chưa hợp lệ hoặc GPS chưa đủ chính xác.",
        )
    return report


@router.patch("/engineer/reports/{report_id}/survey", response_model=EngineerReportResponse)
def update_engineer_survey(
    report_id: str,
    payload: EngineerSurveyRequest = Body(...),
    current_user: AuthUser = Depends(get_engineer_user),
) -> EngineerReportResponse:
    if payload.submit and not (payload.verified_damage_type and payload.severity and payload.priority):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Gửi khảo sát hoàn chỉnh cần đủ loại hư hỏng, mức độ và ưu tiên.")
    with get_connection() as connection:
        report = ReportRepository(connection).get_engineer_report(report_id, engineer_id=current_user.id)
        if report is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phản ánh.")
        if payload.submit and not report.field_checked_in_at:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Bạn cần check-in hiện trường trước khi gửi khảo sát hoàn chỉnh.")
        updated = ReportRepository(connection).update_engineer_survey(
            report_id,
            engineer_id=current_user.id,
            verified_damage_type=payload.verified_damage_type,
            severity=(payload.severity or "").strip() or None,
            priority=(payload.priority or "").strip() or None,
            note=(payload.note or "").strip() or None,
            submit=payload.submit,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Không thể cập nhật khảo sát ở trạng thái hiện tại.")
    return updated


@router.post("/engineer/reports/{report_id}/survey-attachments")
async def upload_engineer_survey_attachments(
    report_id: str,
    files: list[UploadFile] = File(...),
    note: str | None = Form(default=None),
    image_source: str | None = Form(default="camera_live"),
    captured_at: str | None = Form(default=None),
    current_user: AuthUser = Depends(get_engineer_user),
    settings: Settings = Depends(get_settings),
) -> dict[str, list[dict]]:
    upload_dir = settings.resolved_upload_dir.parent / "engineer-survey"
    upload_dir.mkdir(parents=True, exist_ok=True)
    created_at = datetime.now(timezone.utc).isoformat()
    items: list[dict] = []
    with get_connection() as connection:
        repository = ReportRepository(connection)
        report = repository.get_engineer_report(report_id, engineer_id=current_user.id)
        if report is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phản ánh.")
        for file in files:
            try:
                suffix = Path(file.filename or "attachment.jpg").suffix.lower() or ".jpg"
                stored_name = f"{report_id}-{uuid4()}{suffix}"
                stored_path = upload_dir / stored_name
                stored_path.write_bytes(await file.read())
                relative_path = stored_path.relative_to(settings.resolved_upload_dir.parent).as_posix()
                attachment = repository.add_engineer_attachment(
                    report_id,
                    engineer_id=current_user.id,
                    file_url=settings.build_public_upload_url(relative_path),
                    original_filename=file.filename,
                    content_type=file.content_type,
                    note=(note or "").strip() or None,
                    created_at=created_at,
                )
                items.append(attachment.model_dump())
            finally:
                await file.close()
    return {"items": items}


@router.patch("/admin/reports/{report_id}/assign-engineer", response_model=EngineerReportResponse)
def assign_engineer_to_report(
    report_id: str,
    payload: AdminAssignEngineerRequest = Body(...),
    current_user: AuthUser = Depends(get_admin_user),
) -> EngineerReportResponse:
    with get_connection() as connection:
        report_repo = ReportRepository(connection)
        existing_report = report_repo.get_report(report_id, include_admin_fields=True)
        if existing_report is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phản ánh.")
        verify_report_spatial_access(current_user, existing_report.district, action_description="phân công xử lý")

        auth_repository = AuthRepository(connection)
        engineer_row = auth_repository.get_user_by_id(payload.engineer_id)
        if engineer_row is None or engineer_row["role"].strip().lower() != "field_engineer":
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Kỹ sư hiện trường không hợp lệ.")
        updated = report_repo.assign_engineer(
            report_id,
            engineer_id=payload.engineer_id,
            actor_id=current_user.id,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy phản ánh.")
    return updated


@router.patch("/admin/reports/{report_id}/reassign-engineer", response_model=EngineerReportResponse)
def reassign_engineer_to_report(
    report_id: str,
    payload: AdminAssignEngineerRequest = Body(...),
    current_user: AuthUser = Depends(get_admin_user),
) -> EngineerReportResponse:
    return assign_engineer_to_report(report_id, payload, current_user)


@router.patch("/admin/reports/{report_id}/revoke-engineer")
def revoke_engineer_from_report(
    report_id: str,
    current_user: AuthUser = Depends(get_admin_user),
) -> dict[str, bool]:
    with get_connection() as connection:
        ReportRepository(connection).revoke_engineer(
            report_id,
            actor_id=current_user.id,
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
    return {"success": True}


@router.get("/admin/reports/{report_id}/engineer-timeline", response_model=EngineerTimelineResponse)
def get_admin_engineer_timeline(
    report_id: str,
    current_user: AuthUser = Depends(get_admin_user),
) -> EngineerTimelineResponse:
    with get_connection() as connection:
        items = ReportRepository(connection).list_engineer_timeline(report_id)
    return EngineerTimelineResponse(items=items)
