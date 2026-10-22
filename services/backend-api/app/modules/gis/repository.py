import json
import sqlite3
from collections import defaultdict
from typing import Any
from datetime import datetime, timedelta

from app.config import Settings
from app.modules.gis.schemas import (
    AdministrativeHierarchyResponse,
    DistrictHierarchyItem,
    GeoJsonPointGeometry,
    GisReportClusterItem,
    ProvinceHierarchyItem,
    ReportGeoJsonFeature,
    ReportGeoJsonFeatureCollection,
    ReportGeoJsonProperties,
)
from app.modules.reports.schemas import ReportMapListResponse, ReportMapPoint

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
    reports.road_name,
    reports.ward,
    reports.district,
    reports.province,
    reports.formatted_address,
    {SQL_STATUS_EXPRESSION} AS normalized_status,
    {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
    {SQL_DAMAGE_LABEL_EXPRESSION} AS effective_damage_label,
    {SQL_PRIMARY_CONFIDENCE_EXPRESSION} AS primary_confidence
FROM reports
""".strip()


class GisRepository:
    def __init__(self, connection: Any, settings: Settings) -> None:
        self.connection = connection
        self.settings = settings

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
        where_clauses, params = self._build_search_filters(
            user_id=user_id,
            status=status,
            damage_type=damage_type,
            district=district,
            ward=ward,
            road_name=road_name,
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
        user_id: str | None = None,
        status: str | None = None,
        damage_type: str | None = None,
        district: str | None = None,
        ward: str | None = None,
        road_name: str | None = None,
        period_days: int | None = None,
        exclude_repaired: bool = False,
        bbox: tuple[float, float, float, float] | None = None,
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

        if district and district.strip():
            d = district.strip()
            where_clauses.append("(TRIM(COALESCE(reports.district, '')) = ? OR LOWER(TRIM(COALESCE(reports.district, ''))) = ?)")
            params.extend([d, d.lower()])

        if ward and ward.strip():
            w = ward.strip()
            where_clauses.append("(TRIM(COALESCE(reports.ward, '')) = ? OR LOWER(TRIM(COALESCE(reports.ward, ''))) = ?)")
            params.extend([w, w.lower()])

        if road_name and road_name.strip():
            r = road_name.strip()
            where_clauses.append("(TRIM(COALESCE(reports.road_name, '')) = ? OR LOWER(TRIM(COALESCE(reports.road_name, ''))) = ?)")
            params.extend([r, r.lower()])

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
                road_name=row["road_name"] if "road_name" in row.keys() else None,
                ward=row["ward"] if "ward" in row.keys() else None,
                district=row["district"] if "district" in row.keys() else None,
                province=row["province"] if "province" in row.keys() else None,
                formatted_address=row["formatted_address"] if "formatted_address" in row.keys() else None,
                corrected_damage_type=row["corrected_damage_type"],
                is_ai_overridden=bool(row["is_ai_overridden"]),
                confidence=float(row["primary_confidence"]) if row["primary_confidence"] is not None else None,
                created_at=row["created_at"],
                updated_at=row["updated_at"],
            ),
        )

    def _row_to_map_point(self, row: sqlite3.Row) -> ReportMapPoint:
        image_url = self.settings.build_public_upload_url(row["image_path"])
        return ReportMapPoint(
            id=row["id"],
            image_url=image_url,
            latitude=float(row["latitude"]),
            longitude=float(row["longitude"]),
            gps_accuracy=float(row["gps_accuracy"]) if row["gps_accuracy"] is not None else None,
            note=row["note"],
            status=row["normalized_status"],
            damage_type=row["effective_damage_type"],
            damage_label=row["effective_damage_label"],
            road_name=row["road_name"] if "road_name" in row.keys() else None,
            ward=row["ward"] if "ward" in row.keys() else None,
            district=row["district"] if "district" in row.keys() else None,
            province=row["province"] if "province" in row.keys() else None,
            formatted_address=row["formatted_address"] if "formatted_address" in row.keys() else None,
            corrected_damage_type=row["corrected_damage_type"],
            is_ai_overridden=bool(row["is_ai_overridden"]),
            confidence=float(row["primary_confidence"]) if row["primary_confidence"] is not None else None,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

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
        where_clauses, params = self._build_search_filters(
            district=district,
            ward=ward,
            road_name=road_name,
            status=status,
            damage_type=damage_type,
        )
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        rows = self.connection.execute(
            f"""
            {SQL_GIS_SELECT}
            {where_sql}
            ORDER BY reports.created_at DESC
            LIMIT ?
            """,
            [*params, limit],
        ).fetchall()

        items = [self._row_to_map_point(row) for row in rows]
        return ReportMapListResponse(items=items, total=len(items))

    def get_administrative_hierarchy(self, *, district: str | None = None) -> AdministrativeHierarchyResponse:
        where_clauses = ["district IS NOT NULL", "TRIM(district) <> ''"]
        params: list[object] = []
        if district and district.strip():
            d = district.strip()
            where_clauses.append("(TRIM(district) = ? OR LOWER(TRIM(district)) = ?)")
            params.extend([d, d.lower()])

        where_sql = f"WHERE {' AND '.join(where_clauses)}"
        rows = self.connection.execute(
            f"""
            SELECT
                COALESCE(NULLIF(TRIM(province), ''), 'Thành phố Hồ Chí Minh') AS province,
                TRIM(district) AS district,
                TRIM(ward) AS ward,
                TRIM(road_name) AS road_name,
                COUNT(*) AS cnt
            FROM reports
            {where_sql}
            GROUP BY province, district, ward, road_name
            ORDER BY province ASC, district ASC
            """,
            params,
        ).fetchall()

        tree: dict[str, dict[str, dict[str, Any]]] = {}
        for row in rows:
            prov = row["province"]
            dist = row["district"]
            ward = row["ward"]
            road = row["road_name"]
            cnt = int(row["cnt"])

            if prov not in tree:
                tree[prov] = {}
            if dist not in tree[prov]:
                tree[prov][dist] = {
                    "wards": set(),
                    "roads": set(),
                    "total_reports": 0,
                }

            tree[prov][dist]["total_reports"] += cnt
            if ward:
                tree[prov][dist]["wards"].add(ward)
            if road:
                tree[prov][dist]["roads"].add(road)

        provinces: list[ProvinceHierarchyItem] = []
        for prov_name, dist_dict in sorted(tree.items(), key=lambda x: x[0]):
            districts: list[DistrictHierarchyItem] = []
            for dist_name, d_info in sorted(dist_dict.items(), key=lambda x: x[0]):
                districts.append(
                    DistrictHierarchyItem(
                        name=dist_name,
                        wards=sorted(list(d_info["wards"])),
                        roads=sorted(list(d_info["roads"])),
                        total_reports=d_info["total_reports"],
                    )
                )
            provinces.append(
                ProvinceHierarchyItem(
                    name=prov_name,
                    districts=districts,
                )
            )

        return AdministrativeHierarchyResponse(provinces=provinces)

    def get_report_clusters_dbscan(
        self,
        *,
        eps: float = 0.001,
        min_points: int = 5,
        status: str | None = None,
        district: str | None = None,
        ward: str | None = None,
    ) -> list[GisReportClusterItem]:
        if self.settings.gis_backend == "postgis":
            sql = """
            WITH clustered_points AS (
                SELECT
                    id,
                    geom,
                    status,
                    COALESCE(corrected_damage_type, detections_json->'detections'->0->>'damage_type', 'unknown') AS effective_damage_type,
                    ST_ClusterDBSCAN(geom, eps := ?, minpoints := ?) OVER () AS cluster_id
                FROM reports
                WHERE (?::varchar IS NULL OR status = ?)
                  AND (?::varchar IS NULL OR district = ?)
                  AND (?::varchar IS NULL OR ward = ?)
            )
            SELECT
                cluster_id,
                COUNT(*) AS count,
                ST_AsGeoJSON(ST_Centroid(ST_Collect(geom)))::json AS centroid_geojson,
                json_agg(json_build_object(
                    'id', id,
                    'status', status,
                    'latitude', ST_Y(geom),
                    'longitude', ST_X(geom),
                    'damage_type', effective_damage_type
                )) FILTER (WHERE cluster_id IS NULL) AS noise_points
            FROM clustered_points
            GROUP BY cluster_id
            ORDER BY count DESC;
            """
            params = (eps, min_points, status, status, district, district, ward, ward)
            rows = self.connection.execute(sql, params).fetchall()

            results: list[GisReportClusterItem] = []
            for row in rows:
                cid = row["cluster_id"]
                centroid = row["centroid_geojson"]
                noise = row["noise_points"]

                if isinstance(centroid, str):
                    try:
                        centroid = json.loads(centroid)
                    except Exception:
                        pass
                if isinstance(noise, str):
                    try:
                        noise = json.loads(noise)
                    except Exception:
                        pass

                center_lat = None
                center_lon = None
                if centroid and isinstance(centroid, dict) and "coordinates" in centroid:
                    coords = centroid["coordinates"]
                    if len(coords) >= 2:
                        center_lon = float(coords[0])
                        center_lat = float(coords[1])

                results.append(
                    GisReportClusterItem(
                        cluster_id=int(cid) if cid is not None else None,
                        count=int(row["count"]),
                        centroid_geojson=centroid,
                        center_latitude=center_lat,
                        center_longitude=center_lon,
                        noise_points=noise,
                    )
                )
            return results
        else:
            where_clauses = [
                "reports.latitude IS NOT NULL",
                "reports.longitude IS NOT NULL",
            ]
            params = []
            if status:
                where_clauses.append("reports.status = ?")
                params.append(status)
            if district:
                where_clauses.append("reports.district = ?")
                params.append(district)
            if ward:
                where_clauses.append("reports.ward = ?")
                params.append(ward)

            where_sql = f"WHERE {' AND '.join(where_clauses)}"
            sql = f"""
            SELECT reports.id,
                   reports.latitude,
                   reports.longitude,
                   reports.status,
                   {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type
            FROM reports
            {where_sql}
            """
            rows = self.connection.execute(sql, tuple(params)).fetchall()
            points = [dict(r) for r in rows]
            if not points:
                return []

            visited: set[int] = set()
            point_cluster: dict[int, int | None] = {}
            cluster_idx = 0

            def get_neighbors(p_idx: int) -> list[int]:
                p = points[p_idx]
                lat_p, lon_p = float(p["latitude"]), float(p["longitude"])
                neighbors = []
                for j, other in enumerate(points):
                    lat_o, lon_o = float(other["latitude"]), float(other["longitude"])
                    dist_deg = ((lat_p - lat_o) ** 2 + (lon_p - lon_o) ** 2) ** 0.5
                    if dist_deg <= eps:
                        neighbors.append(j)
                return neighbors

            for i in range(len(points)):
                if i in visited:
                    continue
                visited.add(i)
                neighbors = get_neighbors(i)
                if len(neighbors) < min_points:
                    point_cluster[i] = None
                else:
                    point_cluster[i] = cluster_idx
                    queue = list(neighbors)
                    for n_idx in queue:
                        if n_idx not in visited:
                            visited.add(n_idx)
                            n_neighbors = get_neighbors(n_idx)
                            if len(n_neighbors) >= min_points:
                                for nn in n_neighbors:
                                    if nn not in queue:
                                        queue.append(nn)
                        if point_cluster.get(n_idx) is None:
                            point_cluster[n_idx] = cluster_idx
                    cluster_idx += 1

            clusters: dict[int, list[dict[str, Any]]] = defaultdict(list)
            noise: list[dict[str, Any]] = []
            for i, p in enumerate(points):
                cid = point_cluster.get(i)
                if cid is not None:
                    clusters[cid].append(p)
                else:
                    noise.append(p)

            results: list[GisReportClusterItem] = []
            for cid, c_points in clusters.items():
                mean_lat = sum(float(p["latitude"]) for p in c_points) / len(c_points)
                mean_lon = sum(float(p["longitude"]) for p in c_points) / len(c_points)
                results.append(
                    GisReportClusterItem(
                        cluster_id=cid,
                        count=len(c_points),
                        centroid_geojson={
                            "type": "Point",
                            "coordinates": [round(mean_lon, 6), round(mean_lat, 6)],
                        },
                        center_latitude=round(mean_lat, 6),
                        center_longitude=round(mean_lon, 6),
                        noise_points=None,
                    )
                )

            if noise:
                mean_lat = sum(float(p["latitude"]) for p in noise) / len(noise)
                mean_lon = sum(float(p["longitude"]) for p in noise) / len(noise)
                results.append(
                    GisReportClusterItem(
                        cluster_id=None,
                        count=len(noise),
                        centroid_geojson={
                            "type": "Point",
                            "coordinates": [round(mean_lon, 6), round(mean_lat, 6)],
                        },
                        center_latitude=round(mean_lat, 6),
                        center_longitude=round(mean_lon, 6),
                        noise_points=[
                            {
                                "id": p["id"],
                                "status": p["status"],
                                "latitude": float(p["latitude"]),
                                "longitude": float(p["longitude"]),
                                "damage_type": p["effective_damage_type"],
                            }
                            for p in noise
                        ],
                    )
                )

            results.sort(key=lambda item: item.count, reverse=True)
            return results

