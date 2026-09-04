from collections.abc import Generator

from fastapi import APIRouter, Depends, Query

from app.config import Settings, get_settings
from app.database import get_connection
from app.modules.auth.dependencies import get_admin_user, get_current_user
from app.modules.auth.schemas import AuthUser
from app.modules.gis.repository import GisRepository
from app.modules.gis.schemas import ReportGeoJsonFeatureCollection
from app.modules.gis.service import GisService


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


@router.get("/gis/search", response_model=ReportGeoJsonFeatureCollection)
def search_mobile_gis_reports(
    min_latitude: float | None = Query(default=None),
    min_longitude: float | None = Query(default=None),
    max_latitude: float | None = Query(default=None),
    max_longitude: float | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    damage_type: str | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=2000),
    current_user: AuthUser = Depends(get_current_user),
    service: GisService = Depends(get_gis_service),
) -> ReportGeoJsonFeatureCollection:
    bbox = None
    if min_latitude is not None and min_longitude is not None and max_latitude is not None and max_longitude is not None:
        bbox = (min_longitude, min_latitude, max_longitude, max_latitude)

    return service.search_report_features(
        status=status_filter,
        damage_type=damage_type,
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
    period_days: int | None = Query(default=None, ge=1, le=3650),
    limit: int = Query(default=1500, ge=1, le=5000),
    current_user: AuthUser = Depends(get_admin_user),
    service: GisService = Depends(get_gis_service),
) -> ReportGeoJsonFeatureCollection:
    bbox = None
    if min_latitude is not None and min_longitude is not None and max_latitude is not None and max_longitude is not None:
        bbox = (min_longitude, min_latitude, max_longitude, max_latitude)

    return service.search_report_features(
        status=status_filter,
        damage_type=damage_type,
        period_days=period_days,
        bbox=bbox,
        limit=limit,
    )
