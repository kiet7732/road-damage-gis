import uuid
from app.modules.gis.schemas import (
    AdministrativeHierarchyResponse,
    GisReportClusterItem,
    ReportGeoJsonFeatureCollection,
    RoadRestrictionCreate,
    RoadRestrictionItem,
    RoadRestrictionListResponse,
    RoadRestrictionUpdate,
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
        province: str | None = None,
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
            province=province,
            district=district,
            ward=ward,
            road_name=road_name,
            period_days=period_days,
            exclude_repaired=exclude_repaired,
            bbox=bbox,
            limit=limit,
        )

    def get_administrative_hierarchy(
        self,
        *,
        province: str | None = None,
        district: str | None = None,
    ) -> AdministrativeHierarchyResponse:
        return self.repository.get_administrative_hierarchy(
            province=province,
            district=district,
        )

    def get_map_points(
        self,
        *,
        province: str | None = None,
        district: str | None = None,
        ward: str | None = None,
        road_name: str | None = None,
        status: str | None = None,
        damage_type: str | None = None,
        limit: int = 1500,
    ) -> ReportMapListResponse:
        return self.repository.get_map_points(
            province=province,
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
        province: str | None = None,
        district: str | None = None,
        ward: str | None = None,
    ) -> list[GisReportClusterItem]:
        return self.repository.get_report_clusters_dbscan(
            eps=eps,
            min_points=min_points,
            status=status,
            province=province,
            district=district,
            ward=ward,
        )

    def get_road_restrictions(
        self,
        *,
        province: str | None = None,
        district: str | None = None,
        is_active: bool | None = None,
        restriction_type: str | None = None,
    ) -> RoadRestrictionListResponse:
        items = self.repository.get_road_restrictions(
            province=province,
            district=district,
            is_active=is_active,
            restriction_type=restriction_type,
        )
        return RoadRestrictionListResponse(total=len(items), items=items)

    def get_road_restriction_by_id(self, restriction_id: str) -> RoadRestrictionItem | None:
        return self.repository.get_road_restriction_by_id(restriction_id)

    def create_road_restriction(
        self,
        data: RoadRestrictionCreate,
        user_id: str | None = None,
    ) -> RoadRestrictionItem:
        item_id = f"restr-{uuid.uuid4().hex[:12]}"
        return self.repository.create_road_restriction(item_id=item_id, data=data, user_id=user_id)

    def update_road_restriction(
        self,
        restriction_id: str,
        data: RoadRestrictionUpdate,
    ) -> RoadRestrictionItem | None:
        return self.repository.update_road_restriction(restriction_id, data)

    def update_road_restriction_status(
        self,
        restriction_id: str,
        is_active: bool,
    ) -> RoadRestrictionItem | None:
        return self.repository.update_road_restriction_status(restriction_id, is_active)

    def delete_road_restriction(self, restriction_id: str) -> bool:
        return self.repository.delete_road_restriction(restriction_id)


