from app.modules.gis.schemas import (
    AdministrativeHierarchyResponse,
    GisReportClusterItem,
    ReportGeoJsonFeatureCollection,
)
from app.modules.gis.repository import GisRepository
from app.modules.reports.schemas import ReportMapListResponse


class GisService:
    def __init__(self, repository: GisRepository) -> None:
        self.repository = repository

    def search_report_features(
        self,
        *,
        user_id: str | None = None,
        status: str | None = None,
        damage_type: str | None = None,
        district: str | None = None,
        ward: str | None = None,
        road_name: str | None = None,
        period_days: int | None = None,
        exclude_repaired: bool = False,
        bbox: tuple[float, float, float, float] | None = None,
        limit: int = 500,
    ) -> ReportGeoJsonFeatureCollection:
        return self.repository.search_report_features(
            user_id=user_id,
            status=status,
            damage_type=damage_type,
            district=district,
            ward=ward,
            road_name=road_name,
            period_days=period_days,
            exclude_repaired=exclude_repaired,
            bbox=bbox,
            limit=limit,
        )

    def get_administrative_hierarchy(self, *, district: str | None = None) -> AdministrativeHierarchyResponse:
        return self.repository.get_administrative_hierarchy(district=district)

    def get_map_points(
        self,
        *,
        district: str | None = None,
        ward: str | None = None,
        road_name: str | None = None,
        status: str | None = None,
        damage_type: str | None = None,
        limit: int = 1500,
    ) -> ReportMapListResponse:
        return self.repository.get_map_points(
            district=district,
            ward=ward,
            road_name=road_name,
            status=status,
            damage_type=damage_type,
            limit=limit,
        )

    def get_report_clusters(
        self,
        *,
        eps: float = 0.001,
        min_points: int = 5,
        status: str | None = None,
        district: str | None = None,
        ward: str | None = None,
    ) -> list[GisReportClusterItem]:
        return self.repository.get_report_clusters_dbscan(
            eps=eps,
            min_points=min_points,
            status=status,
            district=district,
            ward=ward,
        )

