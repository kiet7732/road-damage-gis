import sqlite3
from datetime import datetime, timedelta

from app.config import Settings
from app.modules.gis.schemas import (
    GeoJsonPointGeometry,
    ReportGeoJsonFeature,
    ReportGeoJsonFeatureCollection,
    ReportGeoJsonProperties,
)

SQL_STATUS_EXPRESSION = """
CASE
    WHEN LOWER(TRIM(COALESCE(reports.status, ''))) IN ('verified', 'in_progress') THEN 'processing'
    WHEN LOWER(TRIM(COALESCE(reports.status, ''))) IN ('resolved', 'done') THEN 'repaired'
    WHEN LOWER(TRIM(COALESCE(reports.status, ''))) IN ('pending_verification', 'manual_review_required') THEN 'pending'
    WHEN LOWER(TRIM(COALESCE(reports.status, ''))) IN ('new', 'pending', 'processing', 'repaired', 'rejected')
        THEN LOWER(TRIM(COALESCE(reports.status, '')))
    ELSE 'new'
END
""".strip()

SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION = """
COALESCE(
    NULLIF(UPPER(TRIM(COALESCE(reports.corrected_damage_type, ''))), ''),
    NULLIF(UPPER(TRIM(COALESCE(json_extract(reports.detections_json, '$.detections[0].damage_type'), ''))), '')
)
""".strip()

SQL_DAMAGE_LABEL_EXPRESSION = f"""
CASE {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION}
    WHEN 'D00' THEN 'Nứt dọc'
    WHEN 'D10' THEN 'Nứt ngang'
    WHEN 'D20' THEN 'Nứt da cá sấu'
    WHEN 'D40' THEN 'Ổ gà'
    ELSE NULL
END
""".strip()

SQL_PRIMARY_CONFIDENCE_EXPRESSION = """
CAST(json_extract(reports.detections_json, '$.detections[0].confidence') AS REAL)
""".strip()

SQL_GIS_SELECT = f"""
SELECT
    reports.id,
    reports.user_id,
    reports.image_path,
    reports.latitude,
    reports.longitude,
    reports.gps_accuracy,
    reports.location_source,
    reports.location_recorded_at,
    reports.note,
    reports.ai_status,
    reports.corrected_damage_type,
    reports.is_ai_overridden,
    reports.created_at,
    reports.updated_at,
    {SQL_STATUS_EXPRESSION} AS normalized_status,
    {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
    {SQL_DAMAGE_LABEL_EXPRESSION} AS effective_damage_label,
    {SQL_PRIMARY_CONFIDENCE_EXPRESSION} AS primary_confidence
FROM reports
""".strip()


class GisRepository:
    def __init__(self, connection: sqlite3.Connection, settings: Settings) -> None:
        self.connection = connection
        self.settings = settings

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
        where_clauses, params = self._build_search_filters(
            user_id=user_id,
            status=status,
            damage_type=damage_type,
            period_days=period_days,
            exclude_repaired=exclude_repaired,
            bbox=bbox,
        )

        if self.settings.gis_backend == "postgis":
            rows = self._search_report_features_postgis(
                where_clauses=where_clauses,
                params=params,
                bbox=bbox,
                limit=limit,
            )
        else:
            rows = self._search_report_features_sqlite(
                where_clauses=where_clauses,
                params=params,
                limit=limit,
            )

        features = [self._row_to_feature(row) for row in rows]
        aggregate = self._get_search_aggregate(
            where_clauses=where_clauses,
            params=params,
        )
        return ReportGeoJsonFeatureCollection(
            features=features,
            bbox=aggregate["bbox"],
            query_bbox=bbox,
            matched_total=aggregate["matched_total"],
            pending_count=aggregate["pending_count"],
            processing_count=aggregate["processing_count"],
            repaired_count=aggregate["repaired_count"],
            top_damage_type=aggregate["top_damage_type"],
            top_damage_label=aggregate["top_damage_label"],
        )

    def _build_search_filters(
        self,
        *,
        user_id: str | None,
        status: str | None,
        damage_type: str | None,
        period_days: int | None,
        exclude_repaired: bool,
        bbox: tuple[float, float, float, float] | None,
    ) -> tuple[list[str], list[object]]:
        where_clauses: list[str] = []
        params: list[object] = []

        if user_id:
            where_clauses.append("reports.user_id = ?")
            params.append(user_id)

        normalized_status = self._normalize_status(status)
        if normalized_status:
            where_clauses.append(f"{SQL_STATUS_EXPRESSION} = ?")
            params.append(normalized_status)

        normalized_damage_type = (damage_type or "").strip().upper()
        if normalized_damage_type:
            where_clauses.append(f"{SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} = ?")
            params.append(normalized_damage_type)

        if exclude_repaired:
            where_clauses.append(f"{SQL_STATUS_EXPRESSION} <> 'repaired'")

        if period_days is not None:
            threshold = (datetime.now() - timedelta(days=int(period_days))).isoformat()
            where_clauses.append("reports.created_at >= ?")
            params.append(threshold)

        if bbox:
            min_lng, min_lat, max_lng, max_lat = bbox
            if self.settings.gis_backend == "postgis":
                where_clauses.append(
                    f"ST_Intersects(reports.geom, ST_MakeEnvelope(?, ?, ?, ?, {self.settings.gis_srid}))"
                )
                params.extend([min_lng, min_lat, max_lng, max_lat])
            else:
                where_clauses.append("reports.longitude BETWEEN ? AND ?")
                params.extend([min_lng, max_lng])
                where_clauses.append("reports.latitude BETWEEN ? AND ?")
                params.extend([min_lat, max_lat])

        return where_clauses, params

    def _search_report_features_sqlite(
        self,
        *,
        where_clauses: list[str],
        params: list[object],
        limit: int,
    ) -> list[sqlite3.Row]:
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        return self.connection.execute(
            f"""
            {SQL_GIS_SELECT}
            {where_sql}
            ORDER BY reports.created_at DESC
            LIMIT ?
            """,
            [*params, limit],
        ).fetchall()

    def _search_report_features_postgis(
        self,
        *,
        where_clauses: list[str],
        params: list[object],
        bbox: tuple[float, float, float, float] | None,
        limit: int,
    ) -> list[sqlite3.Row]:
        # PostGIS-ready SQL path. Requires table reports.geom geometry(Point, 4326).
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        return self.connection.execute(
            f"""
            {SQL_GIS_SELECT}
            {where_sql}
            ORDER BY reports.created_at DESC
            LIMIT ?
            """,
            [*params, limit],
        ).fetchall()

    @staticmethod
    def _normalize_status(status: str | None) -> str | None:
        normalized = (status or "").strip().lower()
        if not normalized:
            return None
        if normalized in ("pending_verification", "manual_review_required"):
            return "pending"
        if normalized in ("verified", "in_progress"):
            return "processing"
        if normalized in ("resolved", "done"):
            return "repaired"
        return normalized

    def _get_search_aggregate(
        self,
        *,
        where_clauses: list[str],
        params: list[object],
    ) -> dict[str, object]:
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        aggregate_row = self.connection.execute(
            f"""
            SELECT
                COUNT(*) AS matched_total,
                SUM(CASE WHEN {SQL_STATUS_EXPRESSION} = 'pending' THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN {SQL_STATUS_EXPRESSION} = 'processing' THEN 1 ELSE 0 END) AS processing_count,
                SUM(CASE WHEN {SQL_STATUS_EXPRESSION} = 'repaired' THEN 1 ELSE 0 END) AS repaired_count,
                MIN(reports.longitude) AS min_longitude,
                MIN(reports.latitude) AS min_latitude,
                MAX(reports.longitude) AS max_longitude,
                MAX(reports.latitude) AS max_latitude
            FROM reports
            {where_sql}
            """,
            params,
        ).fetchone()

        bbox = None
        matched_total = int(aggregate_row["matched_total"]) if aggregate_row and aggregate_row["matched_total"] is not None else 0
        if (
            matched_total > 0
            and aggregate_row["min_longitude"] is not None
            and aggregate_row["min_latitude"] is not None
            and aggregate_row["max_longitude"] is not None
            and aggregate_row["max_latitude"] is not None
        ):
            bbox = (
                float(aggregate_row["min_longitude"]),
                float(aggregate_row["min_latitude"]),
                float(aggregate_row["max_longitude"]),
                float(aggregate_row["max_latitude"]),
            )

        top_damage_row = self.connection.execute(
            f"""
            SELECT
                {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS top_damage_type,
                {SQL_DAMAGE_LABEL_EXPRESSION} AS top_damage_label,
                COUNT(*) AS total_count
            FROM reports
            {where_sql}
            GROUP BY {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION}, {SQL_DAMAGE_LABEL_EXPRESSION}
            HAVING {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} IS NOT NULL
                AND TRIM({SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION}) <> ''
            ORDER BY total_count DESC, top_damage_type ASC
            LIMIT 1
            """,
            params,
        ).fetchone()

        return {
            "matched_total": matched_total,
            "pending_count": int(aggregate_row["pending_count"] or 0) if aggregate_row else 0,
            "processing_count": int(aggregate_row["processing_count"] or 0) if aggregate_row else 0,
            "repaired_count": int(aggregate_row["repaired_count"] or 0) if aggregate_row else 0,
            "bbox": bbox,
            "top_damage_type": top_damage_row["top_damage_type"] if top_damage_row else None,
            "top_damage_label": top_damage_row["top_damage_label"] if top_damage_row else None,
        }

    def _row_to_feature(self, row: sqlite3.Row) -> ReportGeoJsonFeature:
        image_url = self.settings.build_public_upload_url(row["image_path"])
        return ReportGeoJsonFeature(
            id=row["id"],
            geometry=GeoJsonPointGeometry(
                coordinates=(float(row["longitude"]), float(row["latitude"])),
            ),
            properties=ReportGeoJsonProperties(
                id=row["id"],
                image_url=image_url,
                user_id=row["user_id"],
                status=row["normalized_status"],
                ai_status=row["ai_status"],
                note=row["note"],
                gps_accuracy=row["gps_accuracy"],
                location_source=row["location_source"],
                location_recorded_at=row["location_recorded_at"],
                damage_type=row["effective_damage_type"],
                damage_label=row["effective_damage_label"],
                corrected_damage_type=row["corrected_damage_type"],
                is_ai_overridden=bool(row["is_ai_overridden"]),
                confidence=float(row["primary_confidence"]) if row["primary_confidence"] is not None else None,
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            ),
        )
