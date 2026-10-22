import json
import sqlite3
from typing import Any

from app.config import get_settings
from app.modules.reports.repository_analytics import ReportAnalyticsMixin
from app.modules.reports.repository_constants import (
    AUTO_RELEASE_WINDOW,
    CHECKIN_MAX_ACCURACY_METERS,
    CHECKIN_NEAR_THRESHOLD_METERS,
    CHECKIN_WARN_THRESHOLD_METERS,
    CLAIM_STATUS_ACTIVE,
    CLAIM_STATUS_EXPIRED,
    CLAIM_STATUS_RELEASED,
    CLAIM_STATUS_REVOKED,
    DAMAGE_LABELS,
    FIELD_STATUS_AVAILABLE,
    FIELD_STATUS_CLAIMED,
    FIELD_STATUS_IN_PROGRESS,
    FIELD_STATUS_REVOKED,
    FIELD_STATUS_SURVEY_COMPLETED,
    SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION,
    SQL_PRIMARY_CONFIDENCE_EXPRESSION,
    SQL_REPORT_SELECT,
    SQL_STATUS_EXPRESSION,
    STATUS_COLORS,
    STATUS_LABELS,
)
from app.modules.reports.repository_engineer import ReportEngineerMixin
from app.modules.reports.repository_gis import ReportGisMixin
from app.modules.reports.schemas import (
    AdminReportResponse,
    AiDetectionResult,
    ReporterReportResponse,
)


class ReportRepository(ReportGisMixin, ReportEngineerMixin, ReportAnalyticsMixin):
    """Core reports repository coordinating CRUD, GIS, engineer workflows, and analytics."""

    def __init__(self, connection: Any) -> None:
        self.connection = connection
        self.settings = get_settings()

    def create_report(
        self,
        *,
        report_id: str,
        user_id: str,
        image_path: str,
        latitude: float,
        longitude: float,
        gps_accuracy: float | None,
        location_source: str | None,
        location_recorded_at: str | None,
        note: str | None,
        ai_status: str,
        status: str,
        ai_result: AiDetectionResult,
        created_at: str,
        updated_at: str,
    ) -> ReporterReportResponse:
        detections_json = ai_result.model_dump_json()

        if self.settings.gis_backend == "postgis":
            self.connection.execute(
                """
                INSERT INTO reports (
                    id,
                    user_id,
                    image_path,
                    geom,
                    gps_accuracy,
                    location_source,
                    location_recorded_at,
                    note,
                    ai_status,
                    status,
                    ai_message,
                    detections_json,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ST_SetSRID(ST_MakePoint(?, ?), 4326), ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?)
                """,
                (
                    report_id,
                    user_id,
                    image_path,
                    longitude,
                    latitude,
                    gps_accuracy,
                    location_source,
                    location_recorded_at,
                    note,
                    ai_status,
                    status,
                    ai_result.message,
                    detections_json,
                    created_at,
                    updated_at,
                ),
            )
        else:
            self.connection.execute(
                """
                INSERT INTO reports (
                    id,
                    user_id,
                    image_path,
                    latitude,
                    longitude,
                    gps_accuracy,
                    location_source,
                    location_recorded_at,
                    note,
                    ai_status,
                    status,
                    ai_message,
                    detections_json,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report_id,
                    user_id,
                    image_path,
                    latitude,
                    longitude,
                    gps_accuracy,
                    location_source,
                    location_recorded_at,
                    note,
                    ai_status,
                    status,
                    ai_result.message,
                    detections_json,
                    created_at,
                    updated_at,
                ),
            )
        self.connection.commit()

        created_report = self.get_report(report_id, user_id=user_id)
        if created_report is None:
            raise RuntimeError(
                f"Created report {report_id} could not be reloaded after insert."
            )

        return created_report

    def get_report(
        self,
        report_id: str,
        *,
        user_id: str | None = None,
        include_admin_fields: bool = False,
    ) -> ReporterReportResponse | AdminReportResponse | None:
        where_clauses = ["reports.id = ?"]
        params: list[object] = [report_id]

        if user_id:
            where_clauses.append("reports.user_id = ?")
            params.append(user_id)

        try:
            row = self.connection.execute(
                f"""
                {SQL_REPORT_SELECT}
                WHERE {' AND '.join(where_clauses)}
                LIMIT 1
                """,
                params,
            ).fetchone()
        except sqlite3.OperationalError as exc:
            if "no such table: users" in str(exc).lower():
                row = self.connection.execute(
                    f"""
                    SELECT
                        reports.*,
                        {SQL_STATUS_EXPRESSION} AS normalized_status,
                        {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
                        {SQL_PRIMARY_CONFIDENCE_EXPRESSION} AS primary_confidence,
                        NULL AS assigned_engineer_name,
                        NULL AS claimed_by_engineer_name
                    FROM reports
                    WHERE {' AND '.join(where_clauses)}
                    LIMIT 1
                    """,
                    params,
                ).fetchone()
            else:
                raise

        if row is None:
            return None

        return self._row_to_report(row, include_admin_fields=include_admin_fields)

    def update_report_status(
        self,
        report_id: str,
        *,
        status: str,
        admin_note: str | None,
        updated_at: str,
        include_admin_fields: bool = True,
    ) -> ReporterReportResponse | AdminReportResponse | None:
        self.connection.execute(
            """
            UPDATE reports
            SET status = ?, admin_note = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                status,
                admin_note,
                updated_at,
                report_id,
            ),
        )
        self.connection.commit()

        return self.get_report(report_id, include_admin_fields=include_admin_fields)

    def update_report_damage_type(
        self,
        report_id: str,
        *,
        corrected_damage_type: str,
        is_ai_overridden: bool,
        updated_at: str,
        include_admin_fields: bool = True,
    ) -> ReporterReportResponse | AdminReportResponse | None:
        self.connection.execute(
            """
            UPDATE reports
            SET corrected_damage_type = ?, is_ai_overridden = ?, updated_at = ?
            WHERE id = ?
            """,
            (
                corrected_damage_type,
                1 if is_ai_overridden else 0,
                updated_at,
                report_id,
            ),
        )
        self.connection.commit()

        return self.get_report(report_id, include_admin_fields=include_admin_fields)

    def list_reports(
        self,
        *,
        limit: int = 50,
        offset: int = 0,
        user_id: str | None = None,
        exclude_repaired: bool = False,
        status: str | None = None,
        damage_type: str | None = None,
        search: str | None = None,
        ai_status: str | None = None,
        district: str | None = None,
        ward: str | None = None,
        road_name: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
        include_admin_fields: bool = False,
    ) -> tuple[list[ReporterReportResponse] | list[AdminReportResponse], int]:
        where_clauses, params = self._build_report_filters(
            user_id=user_id,
            exclude_repaired=exclude_repaired,
            status=status,
            damage_type=damage_type,
            search=search,
            ai_status=ai_status,
            district=district,
            ward=ward,
            road_name=road_name,
            from_date=from_date,
            to_date=to_date,
        )

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        total_row = self.connection.execute(
            f"""
            SELECT COUNT(*) AS total
            FROM reports
            {where_sql}
            """,
            params,
        ).fetchone()
        total = int(total_row["total"]) if total_row else 0

        try:
            rows = self.connection.execute(
                f"""
                {SQL_REPORT_SELECT}
                {where_sql}
                ORDER BY reports.created_at DESC
                LIMIT ? OFFSET ?
                """,
                [*params, limit, offset],
            ).fetchall()
        except sqlite3.OperationalError as exc:
            if "no such table: users" in str(exc).lower():
                rows = self.connection.execute(
                    f"""
                    SELECT
                        reports.*,
                        {SQL_STATUS_EXPRESSION} AS normalized_status,
                        {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
                        {SQL_PRIMARY_CONFIDENCE_EXPRESSION} AS primary_confidence,
                        NULL AS assigned_engineer_name,
                        NULL AS claimed_by_engineer_name
                    FROM reports
                    {where_sql}
                    ORDER BY reports.created_at DESC
                    LIMIT ? OFFSET ?
                    """,
                    [*params, limit, offset],
                ).fetchall()
            else:
                raise

        return [
            self._row_to_report(row, include_admin_fields=include_admin_fields)
            for row in rows
        ], total

    def _build_report_filters(
        self,
        *,
        user_id: str | None = None,
        exclude_repaired: bool = False,
        status: str | None = None,
        damage_type: str | None = None,
        search: str | None = None,
        ai_status: str | None = None,
        district: str | None = None,
        ward: str | None = None,
        road_name: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> tuple[list[str], list[object]]:
        where_clauses: list[str] = []
        params: list[object] = []

        if user_id:
            where_clauses.append("reports.user_id = ?")
            params.append(user_id)

        if exclude_repaired:
            where_clauses.append(f"{SQL_STATUS_EXPRESSION} NOT IN ('repaired')")

        normalized_status = self._normalize_status(status) if status else None
        if normalized_status:
            where_clauses.append(f"{SQL_STATUS_EXPRESSION} = ?")
            params.append(normalized_status)

        normalized_damage_type = (damage_type or "").strip().upper()
        if normalized_damage_type:
            where_clauses.append(f"{SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} = ?")
            params.append(normalized_damage_type)

        normalized_ai_status = (ai_status or "").strip().lower()
        if normalized_ai_status:
            where_clauses.append("LOWER(TRIM(COALESCE(reports.ai_status, ''))) = ?")
            params.append(normalized_ai_status)

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

        if from_date and from_date.strip():
            where_clauses.append("reports.created_at >= ?")
            params.append(from_date.strip())

        if to_date and to_date.strip():
            to_val = to_date.strip()
            if len(to_val) == 10 and "T" not in to_val:
                to_val = f"{to_val}T23:59:59.999Z"
            where_clauses.append("reports.created_at <= ?")
            params.append(to_val)

        normalized_search = (search or "").strip().lower()
        if normalized_search:
            where_clauses.append(
                """
                LOWER(
                    COALESCE(reports.id, '') || ' ' ||
                    COALESCE(reports.note, '') || ' ' ||
                    COALESCE(reports.road_name, '') || ' ' ||
                    COALESCE(reports.ward, '') || ' ' ||
                    COALESCE(reports.district, '') || ' ' ||
                    COALESCE(reports.formatted_address, '') || ' ' ||
                    COALESCE(CAST(reports.latitude AS TEXT), '') || ' ' ||
                    COALESCE(CAST(reports.longitude AS TEXT), '')
                ) LIKE ?
                """.strip()
            )
            params.append(f"%{normalized_search}%")

        return where_clauses, params

    def _row_to_report(
        self,
        row: sqlite3.Row,
        *,
        include_admin_fields: bool = False,
    ) -> ReporterReportResponse | AdminReportResponse:
        raw_ai_result = row["detections_json"] if isinstance(row["detections_json"], dict) else json.loads(row["detections_json"])
        row_keys = row.keys() if hasattr(row, "keys") else ()

        base_payload = {
            "id": row["id"],
            "image_url": self.settings.build_public_upload_url(row["image_path"]),
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "gps_accuracy": row["gps_accuracy"],
            "location_source": row["location_source"],
            "location_recorded_at": row["location_recorded_at"],
            "note": row["note"],
            "corrected_damage_type": row["corrected_damage_type"],
            "road_name": row["road_name"] if "road_name" in row_keys else None,
            "ward": row["ward"] if "ward" in row_keys else None,
            "district": row["district"] if "district" in row_keys else None,
            "province": row["province"] if "province" in row_keys else None,
            "formatted_address": row["formatted_address"] if "formatted_address" in row_keys else None,
            "ai_status": row["ai_status"],
            "status": row["normalized_status"] or self._normalize_status(row["status"]),
            "ai_result": AiDetectionResult.model_validate(raw_ai_result),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

        if not include_admin_fields:
            return ReporterReportResponse(**base_payload)

        return AdminReportResponse(
            **base_payload,
            image_path=row["image_path"],
            user_id=row["user_id"],
            admin_note=row["admin_note"],
            is_ai_overridden=bool(row["is_ai_overridden"]),
            assigned_engineer_id=row["assigned_engineer_id"] if "assigned_engineer_id" in row_keys else None,
            assigned_engineer_name=row["assigned_engineer_name"] if "assigned_engineer_name" in row_keys else None,
            claimed_by_engineer_id=row["claimed_by_engineer_id"] if "claimed_by_engineer_id" in row_keys else None,
            claimed_by_engineer_name=row["claimed_by_engineer_name"] if "claimed_by_engineer_name" in row_keys else None,
            field_status=row["field_status"] if "field_status" in row_keys else None,
            field_checked_in_latitude=row["field_checked_in_latitude"] if "field_checked_in_latitude" in row_keys else None,
            field_checked_in_longitude=row["field_checked_in_longitude"] if "field_checked_in_longitude" in row_keys else None,
            field_checked_in_accuracy=row["field_checked_in_accuracy"] if "field_checked_in_accuracy" in row_keys else None,
            field_checked_in_distance_meters=row["field_checked_in_distance_meters"] if "field_checked_in_distance_meters" in row_keys else None,
            field_checked_in_at=row["field_checked_in_at"] if "field_checked_in_at" in row_keys else None,
            field_checkin_quality=self._checkin_quality(row["field_checked_in_distance_meters"], row["field_checked_in_accuracy"]) if ("field_checked_in_distance_meters" in row_keys and "field_checked_in_accuracy" in row_keys) else None,
            field_verified_damage_type=row["field_verified_damage_type"] if "field_verified_damage_type" in row_keys else None,
            field_severity=row["field_severity"] if "field_severity" in row_keys else None,
            field_priority=row["field_priority"] if "field_priority" in row_keys else None,
            field_note=row["field_note"] if "field_note" in row_keys else None,
            survey_started_at=row["survey_started_at"] if "survey_started_at" in row_keys else None,
            survey_completed_at=row["survey_completed_at"] if "survey_completed_at" in row_keys else None,
            claim_expires_at=row["claim_expires_at"] if "claim_expires_at" in row_keys else None,
            claim_status=row["claim_status"] if "claim_status" in row_keys else None,
            attachments=self._list_engineer_attachments(row["id"]),
        )

    @staticmethod
    def _get_effective_damage_type_from_row(row: sqlite3.Row) -> str:
        return (row["effective_damage_type"] or "").strip().upper()

    @staticmethod
    def _normalize_status(status: str | None) -> str:
        normalized = (status or "").strip().lower()
        if normalized in ("pending_verification", "manual_review_required"):
            return "pending"
        if normalized in ("verified", "in_progress"):
            return "processing"
        if normalized in ("resolved", "done"):
            return "repaired"
        if normalized in STATUS_LABELS or normalized == "rejected":
            return normalized
        return "new"
