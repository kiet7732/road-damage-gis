from app.modules.gis.schemas import ReportGeoJsonFeatureCollection
from app.modules.gis.repository import GisRepository


class GisService:
    def __init__(self, repository: GisRepository) -> None:
        self.repository = repository

    def search_report_features(
        self,
        *,
        user_id: str | None = None,
        status: str | None = None,
        damage_type: str | None = None,
        period_days: int | None = None,
        exclude_repaired: bool = False,
        bbox: tuple[float, float, float, float] | None = None,
        limit: int = 500,
    ) -> ReportGeoJsonFeatureCollection:
        return self.repository.search_report_features(
            user_id=user_id,
            status=status,
            damage_type=damage_type,
            period_days=period_days,
            exclude_repaired=exclude_repaired,
            bbox=bbox,
            limit=limit,
        )
