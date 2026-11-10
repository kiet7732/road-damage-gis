from collections.abc import Generator

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.config import Settings, get_settings
from app.database import get_connection
from app.modules.auth.dependencies import (
    enforce_spatial_district_access,
    enforce_spatial_province_access,
    enforce_web_only_role_restriction,
    get_admin_user,
    get_current_user,
)
from app.modules.auth.schemas import AuthUser
from app.modules.gis.provinces_data import (
    get_province_boundary_geojson,
    normalize_province_name,
)
from app.modules.gis.repository import GisRepository
from app.modules.gis.schemas import (
    AdministrativeHierarchyResponse,
    GisReportClusterItem,
    ReportGeoJsonFeatureCollection,
    RoadRestrictionCreate,
    RoadRestrictionItem,
    RoadRestrictionListResponse,
    RoadRestrictionStatusUpdate,
    RoadRestrictionUpdate,
)
from app.modules.gis.service import GisService
from app.modules.reports.schemas import ReportMapListResponse


router = APIRouter(tags=["gis"])


def get_gis_service(
    settings: Settings = Depends(get_settings),
) -> Generator[GisService, None, None]:
    connection = get_connection()
    try:
        repository = GisRepository(connection, settings)
        yield GisService(repository)
    finally:
        connection.close()


@router.get("/gis/administrative-hierarchy", response_model=AdministrativeHierarchyResponse)
def get_administrative_hierarchy(
    province: str | None = Query(default=None),
    current_user: AuthUser = Depends(get_current_user),
    service: GisService = Depends(get_gis_service),
) -> AdministrativeHierarchyResponse:
    effective_province = enforce_spatial_province_access(current_user, province)
    effective_district = enforce_spatial_district_access(current_user, None)
    return service.get_administrative_hierarchy(
        province=effective_province,
        district=effective_district,
    )


@router.get("/gis/boundaries/province")
def get_province_boundary(
    province: str | None = Query(default=None),
    current_user: AuthUser = Depends(get_current_user),
) -> dict[str, Any]:
    effective_province = enforce_spatial_province_access(current_user, province)
    return get_province_boundary_geojson(effective_province)


@router.get("/gis/points", response_model=ReportMapListResponse)
def get_map_points(
    province: str | None = Query(default=None),
    district: str | None = Query(default=None),
    ward: str | None = Query(default=None),
    road_name: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    damage_type: str | None = Query(default=None),
    limit: int = Query(default=1500, ge=1, le=5000),
    current_user: AuthUser = Depends(get_current_user),
    service: GisService = Depends(get_gis_service),
) -> ReportMapListResponse:
    effective_province = enforce_spatial_province_access(current_user, province)
    effective_district = enforce_spatial_district_access(current_user, district)
    return service.get_map_points(
        province=effective_province,
        district=effective_district,
        ward=ward,
        road_name=road_name,
        status=status_filter,
        damage_type=damage_type,
        limit=limit,
    )


@router.get("/gis/search", response_model=ReportGeoJsonFeatureCollection)
def search_mobile_gis_reports(
    min_latitude: float | None = Query(default=None),
    min_longitude: float | None = Query(default=None),
    max_latitude: float | None = Query(default=None),
    max_longitude: float | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    damage_type: str | None = Query(default=None),
    district: str | None = Query(default=None),
    ward: str | None = Query(default=None),
    road_name: str | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=2000),
    current_user: AuthUser = Depends(get_current_user),
    service: GisService = Depends(get_gis_service),
) -> ReportGeoJsonFeatureCollection:
    enforce_web_only_role_restriction(current_user)
    bbox = None
    if min_latitude is not None and min_longitude is not None and max_latitude is not None and max_longitude is not None:
        bbox = (min_longitude, min_latitude, max_longitude, max_latitude)

    return service.search_report_features(
        status=status_filter,
        damage_type=damage_type,
        district=district,
        ward=ward,
        road_name=road_name,
        exclude_repaired=True,
        bbox=bbox,
        limit=limit,
    )


@router.get("/admin/gis/reports", response_model=ReportGeoJsonFeatureCollection)
def search_admin_gis_reports(
    min_latitude: float | None = Query(default=None),
    min_longitude: float | None = Query(default=None),
    max_latitude: float | None = Query(default=None),
    max_longitude: float | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    damage_type: str | None = Query(default=None),
    province: str | None = Query(default=None),
    district: str | None = Query(default=None),
    ward: str | None = Query(default=None),
    road_name: str | None = Query(default=None),
    period_days: int | None = Query(default=None, ge=1, le=3650),
    limit: int = Query(default=1500, ge=1, le=5000),
    current_user: AuthUser = Depends(get_admin_user),
    service: GisService = Depends(get_gis_service),
) -> ReportGeoJsonFeatureCollection:
    effective_province = enforce_spatial_province_access(current_user, province)
    effective_district = enforce_spatial_district_access(current_user, district)
    bbox = None
    if min_latitude is not None and min_longitude is not None and max_latitude is not None and max_longitude is not None:
        bbox = (min_longitude, min_latitude, max_longitude, max_latitude)

    return service.search_report_features(
        status=status_filter,
        damage_type=damage_type,
        province=effective_province,
        district=effective_district,
        ward=ward,
        road_name=road_name,
        period_days=period_days,
        bbox=bbox,
        limit=limit,
    )


@router.get("/gis/reports/clusters", response_model=list[GisReportClusterItem])
def get_gis_report_clusters(
    eps: float = Query(default=0.001, gt=0, description="Bán kính gom cụm theo độ (~111m)"),
    min_points: int = Query(default=5, ge=1, description="Số điểm tối thiểu để tạo cụm"),
    status_filter: str | None = Query(default=None, alias="status"),
    province: str | None = Query(default=None),
    district: str | None = Query(default=None),
    ward: str | None = Query(default=None),
    current_user: AuthUser = Depends(get_current_user),
    service: GisService = Depends(get_gis_service),
) -> list[GisReportClusterItem]:
    effective_province = enforce_spatial_province_access(current_user, province)
    effective_district = enforce_spatial_district_access(current_user, district)
    return service.get_report_clusters(
        eps=eps,
        min_points=min_points,
        status=status_filter,
        province=effective_province,
        district=effective_district,
        ward=ward,
    )


# =============================================================================
# Road Restrictions Management Endpoints (Tuyến đường hạn chế & Điểm đầu/cuối)
# =============================================================================

@router.get("/gis/road-restrictions", response_model=RoadRestrictionListResponse)
def get_road_restrictions(
    province: str | None = Query(default=None),
    district: str | None = Query(default=None),
    is_active: bool | None = Query(default=None),
    restriction_type: str | None = Query(default=None),
    current_user: AuthUser = Depends(get_current_user),
    service: GisService = Depends(get_gis_service),
) -> RoadRestrictionListResponse:
    enforce_web_only_role_restriction(current_user)
    effective_province = enforce_spatial_province_access(current_user, province)
    effective_district = enforce_spatial_district_access(current_user, district)
    return service.get_road_restrictions(
        province=effective_province,
        district=effective_district,
        is_active=is_active,
        restriction_type=restriction_type,
    )


@router.post("/gis/road-restrictions", response_model=RoadRestrictionItem, status_code=status.HTTP_201_CREATED)
def create_road_restriction(
    payload: RoadRestrictionCreate,
    current_user: AuthUser = Depends(get_admin_user),
    service: GisService = Depends(get_gis_service),
) -> RoadRestrictionItem:
    enforce_web_only_role_restriction(current_user)

    if current_user.role == "province_officer":
        managed = normalize_province_name(current_user.managed_province)
        target = normalize_province_name(payload.province)
        if managed != target:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Quản trị viên cấp tỉnh chỉ được tạo đoạn đường hạn chế thuộc tỉnh {current_user.managed_province}",
            )

    return service.create_road_restriction(data=payload, user_id=current_user.id)


@router.put("/gis/road-restrictions/{restriction_id}", response_model=RoadRestrictionItem)
def update_road_restriction(
    restriction_id: str,
    payload: RoadRestrictionUpdate,
    current_user: AuthUser = Depends(get_admin_user),
    service: GisService = Depends(get_gis_service),
) -> RoadRestrictionItem:
    enforce_web_only_role_restriction(current_user)

    existing = service.get_road_restriction_by_id(restriction_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đoạn đường hạn chế",
        )

    if current_user.role == "province_officer":
        managed = normalize_province_name(current_user.managed_province)
        existing_prov = normalize_province_name(existing.province)
        if managed != existing_prov:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền chỉnh sửa đoạn đường thuộc tỉnh {existing.province}",
            )
        if payload.province and normalize_province_name(payload.province) != managed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không được thay đổi tỉnh quản lý sang tỉnh khác",
            )

    updated = service.update_road_restriction(restriction_id, payload)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật đoạn đường hạn chế",
        )
    return updated


@router.patch("/gis/road-restrictions/{restriction_id}/status", response_model=RoadRestrictionItem)
def update_road_restriction_status(
    restriction_id: str,
    payload: RoadRestrictionStatusUpdate,
    current_user: AuthUser = Depends(get_admin_user),
    service: GisService = Depends(get_gis_service),
) -> RoadRestrictionItem:
    enforce_web_only_role_restriction(current_user)

    existing = service.get_road_restriction_by_id(restriction_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đoạn đường hạn chế",
        )

    if current_user.role == "province_officer":
        managed = normalize_province_name(current_user.managed_province)
        existing_prov = normalize_province_name(existing.province)
        if managed != existing_prov:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền chỉnh sửa đoạn đường thuộc tỉnh {existing.province}",
            )

    updated = service.update_road_restriction_status(restriction_id, payload.is_active)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể cập nhật trạng thái đoạn đường",
        )
    return updated


@router.delete("/gis/road-restrictions/{restriction_id}")
def delete_road_restriction(
    restriction_id: str,
    current_user: AuthUser = Depends(get_admin_user),
    service: GisService = Depends(get_gis_service),
) -> dict[str, Any]:
    enforce_web_only_role_restriction(current_user)

    existing = service.get_road_restriction_by_id(restriction_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy đoạn đường hạn chế",
        )

    if current_user.role == "province_officer":
        managed = normalize_province_name(current_user.managed_province)
        existing_prov = normalize_province_name(existing.province)
        if managed != existing_prov:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền xóa đoạn đường thuộc tỉnh {existing.province}",
            )

    service.delete_road_restriction(restriction_id)
    return {
        "status": "success",
        "message": "Đã xóa đoạn đường hạn chế thành công",
        "id": restriction_id,
    }

