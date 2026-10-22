import sqlite3
from collections import Counter, defaultdict
from datetime import date, datetime

from app.modules.reports.repository_constants import (
    DAMAGE_LABELS,
    SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION,
    SQL_PRIMARY_CONFIDENCE_EXPRESSION,
    SQL_REPORT_SELECT,
    SQL_STATUS_EXPRESSION,
    STATUS_COLORS,
    STATUS_LABELS,
)
from app.modules.reports.schemas import (
    AdminDashboardResponse,
    AdministrativeStatsResponse,
    DashboardChartItem,
    DashboardKpiItem,
    DashboardTimelineItem,
    DistrictAdministrativeStat,
    TopRoadAdministrativeStat,
    WardAdministrativeStat,
)


class ReportAnalyticsMixin:
    """Admin dashboard KPIs, timeline grouping, and administrative statistics."""

    @staticmethod
    def _parse_datetime(value: str) -> datetime | None:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    @classmethod
    def _to_timeline_bucket_key(cls, value: str) -> str:
        parsed = cls._parse_datetime(value)
        if parsed is not None:
            return parsed.date().isoformat()

        return value[:10]

    @classmethod
    def _format_timeline_label(cls, bucket_key: str) -> str:
        try:
            parsed_date = date.fromisoformat(bucket_key)
            return parsed_date.strftime("%d/%m")
        except ValueError:
            return bucket_key

    def get_admin_dashboard(
        self,
        *,
        district: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> AdminDashboardResponse:
        where_clauses = []
        params: list[object] = []
        if district and district.strip():
            d = district.strip()
            where_clauses.append("(TRIM(COALESCE(reports.district, '')) = ? OR LOWER(TRIM(COALESCE(reports.district, ''))) = ?)")
            params.extend([d, d.lower()])

        if from_date and from_date.strip():
            where_clauses.append("reports.created_at >= ?")
            params.append(from_date.strip())

        if to_date and to_date.strip():
            to_val = to_date.strip()
            if len(to_val) == 10 and "T" not in to_val:
                to_val = f"{to_val}T23:59:59.999Z"
            where_clauses.append("reports.created_at <= ?")
            params.append(to_val)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        try:
            rows = self.connection.execute(
                f"""
                {SQL_REPORT_SELECT}
                {where_sql}
                ORDER BY reports.created_at ASC
                """,
                params,
            ).fetchall()
        except sqlite3.OperationalError as exc:
            if "no such table: users" in str(exc).lower():
                rows = self.connection.execute(
                    f"""
                    SELECT
                        reports.*,
                        {SQL_STATUS_EXPRESSION} AS normalized_status,
                        {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
                        {SQL_PRIMARY_CONFIDENCE_EXPRESSION} AS primary_confidence
                    FROM reports
                    {where_sql}
                    ORDER BY reports.created_at ASC
                    """,
                    params,
                ).fetchall()
            else:
                raise

        total_reports = len(rows)
        status_counter: Counter[str] = Counter()
        damage_counter: Counter[str] = Counter()
        timeline_map: dict[str, dict[str, int]] = defaultdict(
            lambda: {
                "total": 0,
                "pending": 0,
                "processing": 0,
                "repaired": 0,
            }
        )

        for row in rows:
            normalized_status = row["normalized_status"] or self._normalize_status(row["status"])
            status_counter[normalized_status] += 1

            damage_type = self._get_effective_damage_type_from_row(row)
            if damage_type in DAMAGE_LABELS:
                damage_counter[damage_type] += 1

            created_at = row["created_at"]
            timeline_bucket_key = self._to_timeline_bucket_key(created_at)
            timeline_map[timeline_bucket_key]["total"] += 1
            if normalized_status in ("pending", "processing", "repaired"):
                timeline_map[timeline_bucket_key][normalized_status] += 1

        kpis = [
            DashboardKpiItem(
                key=status_key,
                label=STATUS_LABELS[status_key][0],
                value=int(status_counter.get(status_key, 0)),
                description=STATUS_LABELS[status_key][1],
                status=status_key,
            )
            for status_key in ("pending", "processing", "repaired")
        ]

        status_summary = [
            DashboardChartItem(
                key=status_key,
                label=STATUS_LABELS[status_key][0],
                value=int(status_counter.get(status_key, 0)),
                color=STATUS_COLORS.get(status_key),
            )
            for status_key in ("new", "pending", "processing", "repaired", "rejected")
        ]

        damage_type_summary = [
            DashboardChartItem(
                key=damage_key,
                label=DAMAGE_LABELS[damage_key],
                value=int(damage_counter.get(damage_key, 0)),
                color=None,
            )
            for damage_key in ("D00", "D10", "D20", "D40")
        ]

        timeline = [
            DashboardTimelineItem(
                date=self._format_timeline_label(date_key),
                total=values["total"],
                pending=values["pending"],
                processing=values["processing"],
                repaired=values["repaired"],
            )
            for date_key, values in sorted(timeline_map.items(), key=lambda item: item[0])
        ]

        return AdminDashboardResponse(
            total_reports=total_reports,
            kpis=kpis,
            status_summary=status_summary,
            damage_type_summary=damage_type_summary,
            timeline=timeline,
        )

    def get_administrative_stats(
        self,
        *,
        district: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> AdministrativeStatsResponse:
        where_clauses = []
        params: list[object] = []
        if district and district.strip():
            d = district.strip()
            where_clauses.append("(TRIM(COALESCE(reports.district, '')) = ? OR LOWER(TRIM(COALESCE(reports.district, ''))) = ?)")
            params.extend([d, d.lower()])

        if from_date and from_date.strip():
            where_clauses.append("reports.created_at >= ?")
            params.append(from_date.strip())

        if to_date and to_date.strip():
            to_val = to_date.strip()
            if len(to_val) == 10 and "T" not in to_val:
                to_val = f"{to_val}T23:59:59.999Z"
            where_clauses.append("reports.created_at <= ?")
            params.append(to_val)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        rows = self.connection.execute(
            f"""
            SELECT
                reports.id,
                reports.status,
                COALESCE(reports.district, '') AS district,
                COALESCE(reports.ward, '') AS ward,
                COALESCE(reports.road_name, '') AS road_name,
                {SQL_STATUS_EXPRESSION} AS normalized_status
            FROM reports
            {where_sql}
            """,
            params,
        ).fetchall()

        total_reports = len(rows)
        district_map: dict[str, dict[str, int]] = defaultdict(
            lambda: {"total": 0, "pending": 0, "processing": 0, "repaired": 0}
        )
        ward_map: dict[tuple[str, str], dict[str, int]] = defaultdict(
            lambda: {"total": 0, "pending": 0, "processing": 0, "repaired": 0}
        )
        road_map: dict[tuple[str, str], dict[str, int]] = defaultdict(
            lambda: {"total": 0, "pending": 0, "processing": 0, "repaired": 0}
        )

        for row in rows:
            normalized_status = row["normalized_status"] or self._normalize_status(row["status"])
            d_raw = (row["district"] or "").strip()
            w_raw = (row["ward"] or "").strip()
            r_raw = (row["road_name"] or "").strip()

            d_name = d_raw if d_raw else "Chưa phân loại"
            district_map[d_name]["total"] += 1
            if normalized_status in ("pending", "processing", "repaired"):
                district_map[d_name][normalized_status] += 1

            if w_raw:
                ward_key = (d_name, w_raw)
                ward_map[ward_key]["total"] += 1
                if normalized_status in ("pending", "processing", "repaired"):
                    ward_map[ward_key][normalized_status] += 1

            if r_raw and r_raw.lower() not in ("chưa rõ", "unknown", "n/a", ""):
                road_key = (d_name, r_raw)
                road_map[road_key]["total"] += 1
                if normalized_status in ("pending", "processing", "repaired"):
                    road_map[road_key][normalized_status] += 1

        district_stats = [
            DistrictAdministrativeStat(
                district=d_name,
                total=counts["total"],
                pending=counts["pending"],
                processing=counts["processing"],
                repaired=counts["repaired"],
                percentage=round((counts["total"] / total_reports * 100), 1) if total_reports > 0 else 0.0,
            )
            for d_name, counts in sorted(district_map.items(), key=lambda item: item[1]["total"], reverse=True)
        ]

        ward_stats = [
            WardAdministrativeStat(
                ward=w_name,
                district=d_name,
                total=counts["total"],
                pending=counts["pending"],
                processing=counts["processing"],
                repaired=counts["repaired"],
                completion_rate=round((counts["repaired"] / counts["total"] * 100), 1) if counts["total"] > 0 else 0.0,
            )
            for (d_name, w_name), counts in sorted(ward_map.items(), key=lambda item: item[1]["total"], reverse=True)
        ]

        top_roads = [
            TopRoadAdministrativeStat(
                road_name=r_name,
                district=d_name if not district else None,
                total=counts["total"],
                pending=counts["pending"],
                processing=counts["processing"],
                repaired=counts["repaired"],
            )
            for (d_name, r_name), counts in sorted(road_map.items(), key=lambda item: item[1]["total"], reverse=True)[:10]
        ]

        return AdministrativeStatsResponse(
            district_stats=district_stats,
            ward_stats=ward_stats,
            top_roads=top_roads,
            total_reports=total_reports,
            filtered_district=district.strip() if district and district.strip() else None,
        )
