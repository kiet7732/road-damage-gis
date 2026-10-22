import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timezone
from math import atan2, cos, radians, sin, sqrt
from typing import Any
from uuid import uuid4

from app.modules.reports.repository_constants import (
    SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION,
    SQL_STATUS_EXPRESSION,
)
from app.modules.reports.schemas import (
    DamageClusterItem,
    DamageClustersResponse,
    NearbyReportItem,
)


class ReportGisMixin:
    """GIS spatial queries, clustering, and geocoding operations."""

    @staticmethod
    def _distance_meters(
        from_latitude: float,
        from_longitude: float,
        to_latitude: float,
        to_longitude: float,
    ) -> float:
        earth_radius = 6_371_000
        d_lat = radians(to_latitude - from_latitude)
        d_lng = radians(to_longitude - from_longitude)
        from_lat = radians(from_latitude)
        to_lat = radians(to_latitude)
        haversine = sin(d_lat / 2) ** 2 + cos(from_lat) * cos(to_lat) * sin(d_lng / 2) ** 2
        return 2 * earth_radius * atan2(sqrt(haversine), sqrt(1 - haversine))

    @staticmethod
    def _calculate_haversine_distance_meters(
        lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        r = 6371000.0  # Earth radius in meters
        phi1 = radians(lat1)
        phi2 = radians(lat2)
        delta_phi = radians(lat2 - lat1)
        delta_lambda = radians(lon2 - lon1)

        a = sin(delta_phi / 2.0) ** 2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2.0) ** 2
        c = 2.0 * atan2(sqrt(a), sqrt(1.0 - a))
        return r * c

    def calculate_report_distance(
        self,
        report_id: str,
        latitude: float,
        longitude: float,
    ) -> float | None:
        if self.settings.gis_backend == "postgis":
            row = self.connection.execute(
                """
                SELECT ST_Distance(
                    geom::geography,
                    ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
                ) AS distance_meters
                FROM reports
                WHERE id = ?
                """,
                (longitude, latitude, report_id),
            ).fetchone()
            if row is None or row["distance_meters"] is None:
                return None
            return float(row["distance_meters"])
        else:
            row = self.connection.execute(
                "SELECT latitude, longitude FROM reports WHERE id = ?",
                (report_id,),
            ).fetchone()
            if row is None or row["latitude"] is None or row["longitude"] is None:
                return None
            return self._distance_meters(latitude, longitude, float(row["latitude"]), float(row["longitude"]))

    def list_nearby_reports(
        self,
        *,
        latitude: float,
        longitude: float,
        radius_meters: float = 200.0,
        status: str | None = None,
        exclude_repaired: bool = True,
        limit: int = 50,
    ) -> list[NearbyReportItem]:
        if self.settings.gis_backend == "postgis":
            conditions = ["reports.geom IS NOT NULL"]
            params: list[Any] = [longitude, latitude, longitude, latitude, radius_meters]

            if status:
                conditions.append("reports.status = ?")
                params.append(status)
            elif exclude_repaired:
                conditions.append("reports.status != 'repaired'")

            params.append(limit)
            where_sql = " AND ".join(conditions)

            sql = f"""
            SELECT reports.id,
                   reports.latitude,
                   reports.longitude,
                   reports.status,
                   {SQL_STATUS_EXPRESSION} AS normalized_status,
                   {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
                   reports.road_name, reports.ward, reports.district, reports.formatted_address, reports.created_at,
                   ST_Distance(reports.geom::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) AS distance_meters
            FROM reports
            WHERE ST_DWithin(reports.geom::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
              AND {where_sql}
            ORDER BY distance_meters ASC
            LIMIT ?
            """
            rows = self.connection.execute(sql, tuple(params)).fetchall()
            return [
                NearbyReportItem(
                    id=row["id"],
                    damage_type=row["effective_damage_type"],
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    distance_meters=round(float(row["distance_meters"]), 1),
                    status=row["normalized_status"] or self._normalize_status(row["status"]),
                    road_name=row["road_name"] if "road_name" in row else None,
                    ward=row["ward"] if "ward" in row else None,
                    district=row["district"] if "district" in row else None,
                    formatted_address=row["formatted_address"] if "formatted_address" in row else None,
                    created_at=row["created_at"],
                )
                for row in rows
            ]
        else:
            delta_lat = radius_meters / 111_000.0
            cos_lat = max(cos(radians(latitude)), 0.01)
            delta_lon = radius_meters / (111_000.0 * cos_lat)

            lat_min = latitude - delta_lat
            lat_max = latitude + delta_lat
            lon_min = longitude - delta_lon
            lon_max = longitude + delta_lon

            conditions = [
                "reports.latitude BETWEEN ? AND ?",
                "reports.longitude BETWEEN ? AND ?",
            ]
            params = [lat_min, lat_max, lon_min, lon_max]

            if status:
                conditions.append("reports.status = ?")
                params.append(status)
            elif exclude_repaired:
                conditions.append("reports.status != 'repaired'")

            where_sql = " AND ".join(conditions)
            sql = f"""
            SELECT reports.id,
                   reports.latitude,
                   reports.longitude,
                   reports.status,
                   {SQL_STATUS_EXPRESSION} AS normalized_status,
                   {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
                   reports.road_name, reports.ward, reports.district, reports.formatted_address, reports.created_at
            FROM reports
            WHERE {where_sql}
            """
            rows = self.connection.execute(sql, tuple(params)).fetchall()
            candidates: list[NearbyReportItem] = []
            for row in rows:
                if row["latitude"] is None or row["longitude"] is None:
                    continue
                dist = self._distance_meters(latitude, longitude, float(row["latitude"]), float(row["longitude"]))
                if dist <= radius_meters:
                    candidates.append(
                        NearbyReportItem(
                            id=row["id"],
                            damage_type=row["effective_damage_type"],
                            latitude=float(row["latitude"]),
                            longitude=float(row["longitude"]),
                            distance_meters=round(dist, 1),
                            status=row["normalized_status"] or self._normalize_status(row["status"]),
                            road_name=row["road_name"] if "road_name" in row else None,
                            ward=row["ward"] if "ward" in row else None,
                            district=row["district"] if "district" in row else None,
                            formatted_address=row["formatted_address"] if "formatted_address" in row else None,
                            created_at=row["created_at"],
                        )
                    )
            candidates.sort(key=lambda item: item.distance_meters)
            return candidates[:limit]

    def get_damage_clusters(
        self,
        *,
        eps: float = 0.001,
        min_points: int = 3,
        status: str | None = None,
        district: str | None = None,
        ward: str | None = None,
    ) -> DamageClustersResponse:
        filter_clauses = ["reports.status != 'rejected'"]
        filter_params: list[Any] = []

        if status:
            filter_clauses.append("reports.status = ?")
            filter_params.append(status)
        if district:
            filter_clauses.append("reports.district = ?")
            filter_params.append(district)
        if ward:
            filter_clauses.append("reports.ward = ?")
            filter_params.append(ward)

        where_sql = " AND ".join(filter_clauses)

        if self.settings.gis_backend == "postgis":
            sql = f"""
            WITH filtered AS (
                SELECT reports.id,
                       reports.latitude,
                       reports.longitude,
                       reports.status,
                       {SQL_STATUS_EXPRESSION} AS normalized_status,
                       {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
                       reports.road_name, reports.ward, reports.district, reports.formatted_address, reports.created_at,
                       reports.geom,
                       ST_ClusterDBSCAN(reports.geom, eps := ?, minpoints := ?) OVER () AS cid
                FROM reports
                WHERE reports.geom IS NOT NULL
                  AND {where_sql}
            )
            SELECT * FROM filtered
            """
            all_params = [eps, min_points] + filter_params
            rows = self.connection.execute(sql, tuple(all_params)).fetchall()

            clusters_dict: dict[int, list[NearbyReportItem]] = defaultdict(list)
            unclustered: list[NearbyReportItem] = []

            for row in rows:
                cid = row["cid"]
                item = NearbyReportItem(
                    id=row["id"],
                    damage_type=row["effective_damage_type"],
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    distance_meters=0.0,
                    status=row["normalized_status"] or self._normalize_status(row["status"]),
                    road_name=row["road_name"] if "road_name" in row else None,
                    ward=row["ward"] if "ward" in row else None,
                    district=row["district"] if "district" in row else None,
                    formatted_address=row["formatted_address"] if "formatted_address" in row else None,
                    created_at=row["created_at"],
                )
                if cid is not None:
                    clusters_dict[cid].append(item)
                else:
                    unclustered.append(item)

            cluster_items: list[DamageClusterItem] = []
            for cid, items in clusters_dict.items():
                center_lat = sum(it.latitude for it in items) / len(items)
                center_lon = sum(it.longitude for it in items) / len(items)
                status_counts = Counter(it.status for it in items)
                dominant_status = max(status_counts.keys(), key=lambda s: status_counts[s])
                cluster_items.append(
                    DamageClusterItem(
                        cluster_id=int(cid),
                        center_latitude=round(center_lat, 6),
                        center_longitude=round(center_lon, 6),
                        count=len(items),
                        dominant_status=dominant_status,
                        report_ids=[it.id for it in items],
                    )
                )

            cluster_items.sort(key=lambda c: c.count, reverse=True)
            total_reports = sum(c.count for c in cluster_items) + len(unclustered)

            return DamageClustersResponse(
                clusters=cluster_items,
                unclustered=unclustered,
                total_reports=total_reports,
                total_clusters=len(cluster_items),
            )
        else:
            sql = f"""
            SELECT reports.id,
                   reports.latitude,
                   reports.longitude,
                   reports.status,
                   {SQL_STATUS_EXPRESSION} AS normalized_status,
                   {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
                   reports.road_name, reports.ward, reports.district, reports.formatted_address, reports.created_at
            FROM reports
            WHERE {where_sql}
            """
            rows = self.connection.execute(sql, tuple(filter_params)).fetchall()

            raw_items = [
                NearbyReportItem(
                    id=row["id"],
                    damage_type=row["effective_damage_type"],
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    distance_meters=0.0,
                    status=row["normalized_status"] or self._normalize_status(row["status"]),
                    road_name=row["road_name"] if "road_name" in row else None,
                    ward=row["ward"] if "ward" in row else None,
                    district=row["district"] if "district" in row else None,
                    formatted_address=row["formatted_address"] if "formatted_address" in row else None,
                    created_at=row["created_at"],
                )
                for row in rows
                if row["latitude"] is not None and row["longitude"] is not None
            ]

            if not raw_items:
                return DamageClustersResponse(clusters=[], unclustered=[], total_reports=0, total_clusters=0)

            grid: dict[tuple[int, int], list[int]] = defaultdict(list)
            for idx, pt in enumerate(raw_items):
                cx = int(pt.longitude / eps)
                cy = int(pt.latitude / eps)
                grid[(cx, cy)].append(idx)

            def get_neighbors(i: int) -> list[int]:
                p = raw_items[i]
                cx = int(p.longitude / eps)
                cy = int(p.latitude / eps)
                res = []
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        for o_idx in grid.get((cx + dx, cy + dy), []):
                            op = raw_items[o_idx]
                            d2 = (p.latitude - op.latitude)**2 + (p.longitude - op.longitude)**2
                            if d2 <= eps * eps:
                                res.append(o_idx)
                return res

            visited: set[int] = set()
            noise: set[int] = set()
            point_cluster: dict[int, int] = {}
            current_cid = 0

            for i in range(len(raw_items)):
                if i in visited:
                    continue
                visited.add(i)
                neighbors = get_neighbors(i)
                if len(neighbors) < min_points:
                    noise.add(i)
                else:
                    point_cluster[i] = current_cid
                    queue = list(neighbors)
                    while queue:
                        q_idx = queue.pop(0)
                        if q_idx in noise:
                            noise.remove(q_idx)
                            point_cluster[q_idx] = current_cid
                        if q_idx not in visited:
                            visited.add(q_idx)
                            q_nbrs = get_neighbors(q_idx)
                            if len(q_nbrs) >= min_points:
                                queue.extend(q_nbrs)
                            point_cluster[q_idx] = current_cid
                    current_cid += 1

            clusters_dict = defaultdict(list)
            unclustered = []
            for i, item in enumerate(raw_items):
                if i in point_cluster:
                    clusters_dict[point_cluster[i]].append(item)
                else:
                    unclustered.append(item)

            cluster_items = []
            for cid, items in clusters_dict.items():
                center_lat = sum(it.latitude for it in items) / len(items)
                center_lon = sum(it.longitude for it in items) / len(items)
                status_counts = Counter(it.status for it in items)
                dominant_status = max(status_counts.keys(), key=lambda s: status_counts[s])
                cluster_items.append(
                    DamageClusterItem(
                        cluster_id=int(cid),
                        center_latitude=round(center_lat, 6),
                        center_longitude=round(center_lon, 6),
                        count=len(items),
                        dominant_status=dominant_status,
                        report_ids=[it.id for it in items],
                    )
                )

            cluster_items.sort(key=lambda c: c.count, reverse=True)
            total_reports = sum(c.count for c in cluster_items) + len(unclustered)

            return DamageClustersResponse(
                clusters=cluster_items,
                unclustered=unclustered,
                total_reports=total_reports,
                total_clusters=len(cluster_items),
            )

    def update_report_administrative_address(
        self,
        report_id: str,
        *,
        road_name: str | None,
        ward: str | None,
        district: str | None,
        province: str | None,
        formatted_address: str,
        updated_at: str | None = None,
    ) -> None:
        now = updated_at or datetime.now(timezone.utc).isoformat()
        self.connection.execute(
            """
            UPDATE reports
            SET road_name = ?,
                ward = ?,
                district = ?,
                province = ?,
                formatted_address = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                road_name,
                ward,
                district,
                province,
                formatted_address,
                now,
                report_id,
            ),
        )
        self.connection.commit()

    def find_geocoding_cache(
        self,
        latitude: float,
        longitude: float,
        max_distance_meters: float = 15.0,
    ) -> sqlite3.Row | None:
        if self.settings.gis_backend == "postgis":
            best_row = self.connection.execute(
                """
                SELECT id
                FROM geocoding_cache
                WHERE ST_DWithin(
                    geom::geography,
                    ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                    ?
                )
                ORDER BY geom <-> ST_SetSRID(ST_MakePoint(?, ?), 4326)
                LIMIT 1
                """,
                (longitude, latitude, max_distance_meters, longitude, latitude),
            ).fetchone()

            if best_row is not None:
                now = datetime.now(timezone.utc).isoformat()
                self.connection.execute(
                    """
                    UPDATE geocoding_cache
                    SET hit_count = hit_count + 1, updated_at = ?
                    WHERE id = ?
                    """,
                    (now, best_row["id"]),
                )
                self.connection.commit()
                return self.connection.execute(
                    "SELECT * FROM geocoding_cache WHERE id = ?",
                    (best_row["id"],),
                ).fetchone()

            return None
        else:
            delta = 0.00035
            lat_min = latitude - delta
            lat_max = latitude + delta
            lon_min = longitude - delta
            lon_max = longitude + delta

            rows = self.connection.execute(
                """
                SELECT *
                FROM geocoding_cache
                WHERE latitude BETWEEN ? AND ?
                  AND longitude BETWEEN ? AND ?
                """,
                (lat_min, lat_max, lon_min, lon_max),
            ).fetchall()

            best_row = None
            best_distance = float("inf")

            for row in rows:
                dist = self._calculate_haversine_distance_meters(
                    latitude, longitude, float(row["latitude"]), float(row["longitude"])
                )
                if dist <= max_distance_meters and dist < best_distance:
                    best_distance = dist
                    best_row = row

            if best_row is not None:
                now = datetime.now(timezone.utc).isoformat()
                self.connection.execute(
                    """
                    UPDATE geocoding_cache
                    SET hit_count = hit_count + 1, updated_at = ?
                    WHERE id = ?
                    """,
                    (now, best_row["id"]),
                )
                self.connection.commit()
                return self.connection.execute(
                    "SELECT * FROM geocoding_cache WHERE id = ?",
                    (best_row["id"],),
                ).fetchone()

            return None

    def save_geocoding_cache(
        self,
        *,
        latitude: float,
        longitude: float,
        road_name: str | None,
        ward: str | None,
        district: str | None,
        province: str | None,
        formatted_address: str,
    ) -> str:
        cache_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()
        if self.settings.gis_backend == "postgis":
            self.connection.execute(
                """
                INSERT INTO geocoding_cache (
                    id, geom, road_name, ward, district, province,
                    formatted_address, hit_count, created_at, updated_at
                )
                VALUES (?, ST_SetSRID(ST_MakePoint(?, ?), 4326), ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    cache_id,
                    longitude,
                    latitude,
                    road_name,
                    ward,
                    district,
                    province,
                    formatted_address,
                    now,
                    now,
                ),
            )
        else:
            self.connection.execute(
                """
                INSERT INTO geocoding_cache (
                    id, latitude, longitude, road_name, ward, district, province,
                    formatted_address, hit_count, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    cache_id,
                    latitude,
                    longitude,
                    road_name,
                    ward,
                    district,
                    province,
                    formatted_address,
                    now,
                    now,
                ),
            )
        self.connection.commit()
        return cache_id

    get_cached_geocoding = find_geocoding_cache
