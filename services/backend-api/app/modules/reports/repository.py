import json
import sqlite3
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from math import atan2, cos, radians, sin, sqrt
from uuid import uuid4

from app.config import get_settings
from app.modules.reports.schemas import (
    AdminDashboardResponse,
    AdminReportResponse,
    AiDetectionResult,
    DashboardChartItem,
    DashboardKpiItem,
    DashboardTimelineItem,
    EngineerAttachmentResponse,
    EngineerReportResponse,
    EngineerTimelineItem,
    ReporterReportResponse,
)


STATUS_LABELS = {
    "new": ("Mới ghi nhận", "Báo cáo mới vào hệ thống"),
    "pending": ("Chờ xác minh", "Đã có dữ liệu AI, chờ cán bộ xác minh"),
    "processing": ("Đang xử lý", "Đã chuyển đơn vị phụ trách"),
    "repaired": ("Đã sửa chữa", "Đã hoàn tất xử lý ngoài thực địa"),
    "rejected": ("Từ chối", "Báo cáo không hợp lệ hoặc không cần xử lý"),
}

STATUS_COLORS = {
    "new": "#075DBB",
    "pending": "#E86C00",
    "processing": "#7E3FB3",
    "repaired": "#119C39",
    "rejected": "#667085",
}

DAMAGE_LABELS = {
    "D00": "Nứt dọc",
    "D10": "Nứt ngang",
    "D20": "Nứt da cá sấu",
    "D40": "Ổ gà",
}

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

SQL_PRIMARY_CONFIDENCE_EXPRESSION = """
CAST(json_extract(reports.detections_json, '$.detections[0].confidence') AS REAL)
""".strip()

SQL_REPORT_SELECT = f"""
SELECT
    reports.*,
    {SQL_STATUS_EXPRESSION} AS normalized_status,
    {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
    {SQL_PRIMARY_CONFIDENCE_EXPRESSION} AS primary_confidence
FROM reports
""".strip()

FIELD_STATUS_AVAILABLE = "available_for_inspection"
FIELD_STATUS_CLAIMED = "inspection_claimed"
FIELD_STATUS_IN_PROGRESS = "inspection_in_progress"
FIELD_STATUS_SURVEY_COMPLETED = "survey_completed"
FIELD_STATUS_REVOKED = "inspection_revoked"
CLAIM_STATUS_ACTIVE = "active"
CLAIM_STATUS_RELEASED = "released"
CLAIM_STATUS_REVOKED = "revoked"
CLAIM_STATUS_EXPIRED = "expired"
AUTO_RELEASE_WINDOW = timedelta(hours=1)
CHECKIN_NEAR_THRESHOLD_METERS = 30.0
CHECKIN_WARN_THRESHOLD_METERS = 100.0
CHECKIN_MAX_ACCURACY_METERS = 100.0


class ReportRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
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

        row = self.connection.execute(
            f"""
            {SQL_REPORT_SELECT}
            WHERE {' AND '.join(where_clauses)}
            LIMIT 1
            """,
            params,
        ).fetchone()

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
        include_admin_fields: bool = False,
    ) -> tuple[list[ReporterReportResponse] | list[AdminReportResponse], int]:
        where_clauses, params = self._build_report_filters(
            user_id=user_id,
            exclude_repaired=exclude_repaired,
            status=status,
            damage_type=damage_type,
            search=search,
            ai_status=ai_status,
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

        rows = self.connection.execute(
            f"""
            {SQL_REPORT_SELECT}
            {where_sql}
            ORDER BY reports.created_at DESC
            LIMIT ? OFFSET ?
            """,
            [*params, limit, offset],
        ).fetchall()

        return [
            self._row_to_report(row, include_admin_fields=include_admin_fields)
            for row in rows
        ], total

    def list_engineer_reports(
        self,
        *,
        scope: str,
        engineer_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[EngineerReportResponse], int]:
        self.expire_stale_claims(updated_at=datetime.now(timezone.utc).isoformat())
        where_clauses = []
        params: list[object] = []
        normalized_scope = scope.strip().lower()

        if normalized_scope == "available":
            where_clauses.append(
                """
                COALESCE(reports.field_status, '') IN ('', ?) AND
                (
                    reports.claimed_by_engineer_id IS NULL OR
                    reports.claim_status IS NULL OR
                    LOWER(TRIM(reports.claim_status)) != ?
                ) AND
                (
                    reports.assigned_engineer_id IS NULL OR
                    reports.assigned_engineer_id = ?
                )
                """.strip()
            )
            params.extend([FIELD_STATUS_AVAILABLE, CLAIM_STATUS_ACTIVE, engineer_id])
        elif normalized_scope == "assigned":
            where_clauses.append("reports.assigned_engineer_id = ?")
            params.append(engineer_id)
            where_clauses.append(
                "COALESCE(reports.field_status, ?) NOT IN (?, ?)"
            )
            params.extend([FIELD_STATUS_AVAILABLE, FIELD_STATUS_IN_PROGRESS, FIELD_STATUS_SURVEY_COMPLETED])
        elif normalized_scope in {"in-progress", "in_progress"}:
            where_clauses.append("reports.claimed_by_engineer_id = ?")
            params.append(engineer_id)
            where_clauses.append(
                "COALESCE(reports.field_status, ?) IN (?, ?)"
            )
            params.extend([FIELD_STATUS_AVAILABLE, FIELD_STATUS_CLAIMED, FIELD_STATUS_IN_PROGRESS])
        elif normalized_scope == "history":
            where_clauses.append(
                """
                reports.claimed_by_engineer_id = ? AND (
                    reports.survey_completed_at IS NOT NULL OR
                    LOWER(TRIM(COALESCE(reports.claim_status, ''))) IN (?, ?)
                )
                """.strip()
            )
            params.extend([engineer_id, CLAIM_STATUS_REVOKED, CLAIM_STATUS_RELEASED])
        else:
            raise ValueError(f"Unsupported engineer scope: {scope}")

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        total_row = self.connection.execute(
            f"SELECT COUNT(*) AS total FROM reports {where_sql}",
            params,
        ).fetchone()
        rows = self.connection.execute(
            f"""
            {self._engineer_report_select_sql()}
            {where_sql}
            ORDER BY reports.updated_at DESC, reports.created_at DESC
            LIMIT ? OFFSET ?
            """,
            [*params, limit, offset],
        ).fetchall()
        return [self._row_to_engineer_report(row, engineer_id=engineer_id, scope=normalized_scope) for row in rows], int(total_row["total"] if total_row else 0)

    def get_engineer_report(self, report_id: str, *, engineer_id: str) -> EngineerReportResponse | None:
        self.expire_stale_claims(updated_at=datetime.now(timezone.utc).isoformat())
        row = self.connection.execute(
            f"""
            {self._engineer_report_select_sql()}
            WHERE reports.id = ?
            LIMIT 1
            """,
            (report_id,),
        ).fetchone()
        if row is None:
            return None
        return self._row_to_engineer_report(row, engineer_id=engineer_id, scope=None)

    def assign_engineer(
        self,
        report_id: str,
        *,
        engineer_id: str,
        actor_id: str,
        updated_at: str,
    ) -> EngineerReportResponse | None:
        self.connection.execute(
            """
            UPDATE reports
            SET assigned_engineer_id = ?, updated_at = ?
            WHERE id = ?
            """,
            (engineer_id, updated_at, report_id),
        )
        self._insert_engineer_action(
            report_id=report_id,
            engineer_id=actor_id,
            action_type="admin_assign",
            payload={"assigned_engineer_id": engineer_id},
            created_at=updated_at,
        )
        self.connection.commit()
        return self.get_engineer_report(report_id, engineer_id=engineer_id)

    def revoke_engineer(self, report_id: str, *, actor_id: str, updated_at: str) -> None:
        report = self.connection.execute(
            "SELECT claimed_by_engineer_id FROM reports WHERE id = ?",
            (report_id,),
        ).fetchone()
        self.connection.execute(
            """
            UPDATE reports
            SET assigned_engineer_id = NULL,
                claimed_by_engineer_id = NULL,
                claimed_at = NULL,
                claim_expires_at = NULL,
                claim_status = ?,
                field_status = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (CLAIM_STATUS_REVOKED, FIELD_STATUS_AVAILABLE, updated_at, report_id),
        )
        self._insert_engineer_action(
            report_id=report_id,
            engineer_id=actor_id,
            action_type="admin_revoke",
            payload={"previous_engineer_id": report["claimed_by_engineer_id"] if report else None},
            created_at=updated_at,
        )
        self.connection.commit()

    def claim_engineer_report(
        self,
        report_id: str,
        *,
        engineer_id: str,
        updated_at: str,
    ) -> EngineerReportResponse | None:
        self.expire_stale_claims(updated_at=updated_at)
        claim_expires_at = (datetime.fromisoformat(updated_at.replace("Z", "+00:00")) + AUTO_RELEASE_WINDOW).isoformat()
        cursor = self.connection.execute(
            """
            UPDATE reports
            SET claimed_by_engineer_id = ?,
                claimed_at = ?,
                claim_expires_at = ?,
                claim_status = ?,
                claim_source = 'self_claim',
                field_status = ?,
                updated_at = ?
            WHERE id = ?
              AND (
                  claimed_by_engineer_id IS NULL OR
                  claimed_by_engineer_id = ? OR
                  LOWER(TRIM(COALESCE(claim_status, ''))) != ?
              )
              AND (
                  assigned_engineer_id IS NULL OR
                  assigned_engineer_id = ?
              )
            """,
            (
                engineer_id,
                updated_at,
                claim_expires_at,
                CLAIM_STATUS_ACTIVE,
                FIELD_STATUS_CLAIMED,
                updated_at,
                report_id,
                engineer_id,
                CLAIM_STATUS_ACTIVE,
                engineer_id,
            ),
        )
        if cursor.rowcount <= 0:
            return None
        self._insert_engineer_action(
            report_id=report_id,
            engineer_id=engineer_id,
            action_type="claim",
            payload={"claim_expires_at": claim_expires_at},
            created_at=updated_at,
        )
        self.connection.commit()
        return self.get_engineer_report(report_id, engineer_id=engineer_id)

    def release_engineer_claim(
        self,
        report_id: str,
        *,
        engineer_id: str,
        updated_at: str,
    ) -> EngineerReportResponse | None:
        cursor = self.connection.execute(
            """
            UPDATE reports
            SET claimed_by_engineer_id = NULL,
                claimed_at = NULL,
                claim_expires_at = NULL,
                claim_status = ?,
                field_status = ?,
                updated_at = ?
            WHERE id = ?
              AND claimed_by_engineer_id = ?
              AND field_checked_in_at IS NULL
              AND survey_started_at IS NULL
              AND survey_completed_at IS NULL
            """,
            (CLAIM_STATUS_RELEASED, FIELD_STATUS_AVAILABLE, updated_at, report_id, engineer_id),
        )
        if cursor.rowcount <= 0:
            return None
        self._insert_engineer_action(
            report_id=report_id,
            engineer_id=engineer_id,
            action_type="release_claim",
            payload=None,
            created_at=updated_at,
        )
        self.connection.commit()
        return self.get_engineer_report(report_id, engineer_id=engineer_id)

    def check_in_engineer_report(
        self,
        report_id: str,
        *,
        engineer_id: str,
        latitude: float,
        longitude: float,
        gps_accuracy: float,
        source: str | None,
        updated_at: str,
    ) -> EngineerReportResponse | None:
        report = self.connection.execute(
            """
            SELECT latitude,
                   longitude,
                   claimed_by_engineer_id,
                   assigned_engineer_id
            FROM reports
            WHERE id = ?
            """,
            (report_id,),
        ).fetchone()
        if report is None:
            return None
        claimed_by_engineer_id = report["claimed_by_engineer_id"]
        assigned_engineer_id = report["assigned_engineer_id"]
        if claimed_by_engineer_id and claimed_by_engineer_id != engineer_id:
            return None
        if claimed_by_engineer_id is None and assigned_engineer_id not in (None, engineer_id):
            return None
        distance = self._distance_meters(latitude, longitude, float(report["latitude"]), float(report["longitude"]))
        cursor = self.connection.execute(
            """
            UPDATE reports
            SET claimed_by_engineer_id = COALESCE(claimed_by_engineer_id, ?),
                claimed_at = COALESCE(claimed_at, ?),
                claim_status = COALESCE(NULLIF(claim_status, ''), ?),
                claim_source = COALESCE(NULLIF(claim_source, ''), ?),
                field_checked_in_latitude = ?,
                field_checked_in_longitude = ?,
                field_checked_in_accuracy = ?,
                field_checked_in_distance_meters = ?,
                field_checked_in_at = ?,
                field_status = ?,
                survey_started_at = COALESCE(survey_started_at, ?),
                updated_at = ?
            WHERE id = ?
              AND (
                    claimed_by_engineer_id = ? OR
                    (claimed_by_engineer_id IS NULL AND (assigned_engineer_id IS NULL OR assigned_engineer_id = ?))
              )
            """,
            (
                engineer_id,
                updated_at,
                CLAIM_STATUS_ACTIVE,
                "admin_assignment",
                latitude,
                longitude,
                gps_accuracy,
                distance,
                updated_at,
                FIELD_STATUS_IN_PROGRESS,
                updated_at,
                updated_at,
                report_id,
                engineer_id,
                engineer_id,
            ),
        )
        if cursor.rowcount <= 0:
            return None
        quality = self._checkin_quality(distance, gps_accuracy)
        self._insert_engineer_action(
            report_id=report_id,
            engineer_id=engineer_id,
            action_type="check_in",
            payload={
                "latitude": latitude,
                "longitude": longitude,
                "gps_accuracy": gps_accuracy,
                "distance_meters": distance,
                "source": source,
                "quality": quality,
            },
            created_at=updated_at,
        )
        self.connection.commit()
        return self.get_engineer_report(report_id, engineer_id=engineer_id)

    def update_engineer_survey(
        self,
        report_id: str,
        *,
        engineer_id: str,
        verified_damage_type: str | None,
        severity: str | None,
        priority: str | None,
        note: str | None,
        submit: bool,
        updated_at: str,
    ) -> EngineerReportResponse | None:
        next_status = FIELD_STATUS_SURVEY_COMPLETED if submit else FIELD_STATUS_IN_PROGRESS
        cursor = self.connection.execute(
            """
            UPDATE reports
            SET field_verified_damage_type = COALESCE(?, field_verified_damage_type),
                field_severity = COALESCE(?, field_severity),
                field_priority = COALESCE(?, field_priority),
                field_note = COALESCE(?, field_note),
                field_status = ?,
                survey_started_at = COALESCE(survey_started_at, ?),
                survey_completed_at = CASE WHEN ? = 1 THEN ? ELSE survey_completed_at END,
                updated_at = ?
            WHERE id = ?
              AND claimed_by_engineer_id = ?
            """,
            (
                verified_damage_type,
                severity,
                priority,
                note,
                next_status,
                updated_at,
                1 if submit else 0,
                updated_at,
                updated_at,
                report_id,
                engineer_id,
            ),
        )
        if cursor.rowcount <= 0:
            return None
        self._insert_engineer_action(
            report_id=report_id,
            engineer_id=engineer_id,
            action_type="submit_survey" if submit else "save_survey_draft",
            payload={
                "verified_damage_type": verified_damage_type,
                "severity": severity,
                "priority": priority,
                "note": note,
            },
            created_at=updated_at,
        )
        self.connection.commit()
        return self.get_engineer_report(report_id, engineer_id=engineer_id)

    def add_engineer_attachment(
        self,
        report_id: str,
        *,
        engineer_id: str,
        file_url: str,
        original_filename: str | None,
        content_type: str | None,
        note: str | None,
        created_at: str,
    ) -> EngineerAttachmentResponse:
        attachment_id = str(uuid4())
        payload = {
            "attachment_id": attachment_id,
            "file_url": file_url,
            "original_filename": original_filename,
            "content_type": content_type,
            "note": note,
        }
        self._insert_engineer_action(
            report_id=report_id,
            engineer_id=engineer_id,
            action_type="upload_attachment",
            payload=payload,
            created_at=created_at,
            action_id=attachment_id,
        )
        self.connection.commit()
        return EngineerAttachmentResponse(
            id=attachment_id,
            file_url=file_url,
            original_filename=original_filename,
            content_type=content_type,
            note=note,
            created_at=created_at,
        )

    def list_engineer_timeline(self, report_id: str) -> list[EngineerTimelineItem]:
        rows = self.connection.execute(
            """
            SELECT actions.*, users.full_name AS engineer_name
            FROM report_engineer_actions AS actions
            LEFT JOIN users ON users.id = actions.engineer_id
            WHERE actions.report_id = ?
            ORDER BY actions.created_at DESC
            """,
            (report_id,),
        ).fetchall()
        items: list[EngineerTimelineItem] = []
        for row in rows:
            payload = None
            if row["action_payload_json"]:
                try:
                    payload = json.loads(row["action_payload_json"])
                except json.JSONDecodeError:
                    payload = None
            items.append(
                EngineerTimelineItem(
                    id=row["id"],
                    report_id=row["report_id"],
                    engineer_id=row["engineer_id"],
                    engineer_name=row["engineer_name"],
                    action_type=row["action_type"],
                    action_payload_json=payload,
                    created_at=row["created_at"],
                )
            )
        return items

    def expire_stale_claims(self, *, updated_at: str) -> int:
        cursor = self.connection.execute(
            """
            UPDATE reports
            SET claimed_by_engineer_id = NULL,
                claimed_at = NULL,
                claim_expires_at = NULL,
                claim_status = ?,
                field_status = ?,
                updated_at = ?
            WHERE claim_expires_at IS NOT NULL
              AND claim_expires_at < ?
              AND field_checked_in_at IS NULL
              AND survey_started_at IS NULL
              AND survey_completed_at IS NULL
              AND LOWER(TRIM(COALESCE(claim_status, ''))) = ?
            """,
            (CLAIM_STATUS_EXPIRED, FIELD_STATUS_AVAILABLE, updated_at, updated_at, CLAIM_STATUS_ACTIVE),
        )
        if cursor.rowcount > 0:
            self.connection.commit()
        return int(cursor.rowcount)

    def get_admin_dashboard(self) -> AdminDashboardResponse:
        rows = self.connection.execute(
            f"""
            {SQL_REPORT_SELECT}
            ORDER BY reports.created_at ASC
            """
        ).fetchall()

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

    def _build_report_filters(
        self,
        *,
        user_id: str | None = None,
        exclude_repaired: bool = False,
        status: str | None = None,
        damage_type: str | None = None,
        search: str | None = None,
        ai_status: str | None = None,
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

        normalized_search = (search or "").strip().lower()
        if normalized_search:
            where_clauses.append(
                """
                LOWER(
                    COALESCE(reports.id, '') || ' ' ||
                    COALESCE(reports.note, '') || ' ' ||
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
        raw_ai_result = json.loads(row["detections_json"])

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
        )

    def _row_to_engineer_report(
        self,
        row: sqlite3.Row,
        *,
        engineer_id: str,
        scope: str | None,
    ) -> EngineerReportResponse:
        raw_ai_result = json.loads(row["detections_json"])
        attachments = self._list_engineer_attachments(row["id"])
        field_status = (row["field_status"] or FIELD_STATUS_AVAILABLE).strip().lower()
        claimed_by_me = row["claimed_by_engineer_id"] == engineer_id
        assigned_to_me = row["assigned_engineer_id"] == engineer_id
        can_claim = (field_status == FIELD_STATUS_AVAILABLE and (row["claimed_by_engineer_id"] is None or claimed_by_me) and (row["assigned_engineer_id"] is None or assigned_to_me))
        can_release_claim = claimed_by_me and row["field_checked_in_at"] is None and row["survey_started_at"] is None and row["survey_completed_at"] is None
        can_check_in = claimed_by_me and row["field_checked_in_at"] is None
        can_submit_survey = claimed_by_me and row["field_checked_in_at"] is not None
        history_bucket = None
        history_at = None
        if row["survey_completed_at"]:
            history_bucket = "submitted"
            history_at = row["survey_completed_at"]
        elif (row["claim_status"] or "").strip().lower() in {CLAIM_STATUS_REVOKED, CLAIM_STATUS_RELEASED, CLAIM_STATUS_EXPIRED}:
            history_bucket = "revoked"
            history_at = row["updated_at"]

        payload = {
            "id": row["id"],
            "image_url": self.settings.build_public_upload_url(row["image_path"]),
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "gps_accuracy": row["gps_accuracy"],
            "location_source": row["location_source"],
            "location_recorded_at": row["location_recorded_at"],
            "note": row["note"],
            "corrected_damage_type": row["corrected_damage_type"],
            "ai_status": row["ai_status"],
            "status": row["normalized_status"] or self._normalize_status(row["status"]),
            "ai_result": AiDetectionResult.model_validate(raw_ai_result),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "assigned_engineer_id": row["assigned_engineer_id"],
            "assigned_engineer_name": row["assigned_engineer_name"],
            "claimed_by_engineer_id": row["claimed_by_engineer_id"],
            "claimed_by_engineer_name": row["claimed_by_engineer_name"],
            "claimed_at": row["claimed_at"],
            "claim_expires_at": row["claim_expires_at"],
            "claim_status": row["claim_status"],
            "claim_source": row["claim_source"],
            "field_status": field_status,
            "survey_started_at": row["survey_started_at"],
            "survey_completed_at": row["survey_completed_at"],
            "field_verified_damage_type": row["field_verified_damage_type"],
            "field_severity": row["field_severity"],
            "field_priority": row["field_priority"],
            "field_note": row["field_note"],
            "field_checked_in_latitude": row["field_checked_in_latitude"],
            "field_checked_in_longitude": row["field_checked_in_longitude"],
            "field_checked_in_accuracy": row["field_checked_in_accuracy"],
            "field_checked_in_distance_meters": row["field_checked_in_distance_meters"],
            "field_checked_in_at": row["field_checked_in_at"],
            "field_checkin_quality": self._checkin_quality(row["field_checked_in_distance_meters"], row["field_checked_in_accuracy"]),
            "field_checkin_warning_code": self._checkin_warning_code(row["field_checked_in_distance_meters"], row["field_checked_in_accuracy"]),
            "history_bucket": history_bucket,
            "history_at": history_at,
            "can_claim": can_claim,
            "can_release_claim": can_release_claim,
            "can_check_in": can_check_in,
            "can_submit_survey": can_submit_survey,
            "attachments": attachments,
        }
        return EngineerReportResponse(**payload)

    def _engineer_report_select_sql(self) -> str:
        return f"""
        SELECT
            reports.*,
            {SQL_STATUS_EXPRESSION} AS normalized_status,
            {SQL_EFFECTIVE_DAMAGE_TYPE_EXPRESSION} AS effective_damage_type,
            {SQL_PRIMARY_CONFIDENCE_EXPRESSION} AS primary_confidence,
            assigned_user.full_name AS assigned_engineer_name,
            claimed_user.full_name AS claimed_by_engineer_name
        FROM reports
        LEFT JOIN users AS assigned_user ON assigned_user.id = reports.assigned_engineer_id
        LEFT JOIN users AS claimed_user ON claimed_user.id = reports.claimed_by_engineer_id
        """.strip()

    def _insert_engineer_action(
        self,
        *,
        report_id: str,
        engineer_id: str | None,
        action_type: str,
        payload: dict | None,
        created_at: str,
        action_id: str | None = None,
    ) -> None:
        self.connection.execute(
            """
            INSERT INTO report_engineer_actions (
                id, report_id, engineer_id, action_type, action_payload_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                action_id or str(uuid4()),
                report_id,
                engineer_id,
                action_type,
                json.dumps(payload, ensure_ascii=False) if payload is not None else None,
                created_at,
            ),
        )

    def _list_engineer_attachments(self, report_id: str) -> list[EngineerAttachmentResponse]:
        rows = self.connection.execute(
            """
            SELECT *
            FROM report_engineer_actions
            WHERE report_id = ?
              AND action_type = 'upload_attachment'
            ORDER BY created_at ASC
            """,
            (report_id,),
        ).fetchall()
        items: list[EngineerAttachmentResponse] = []
        for row in rows:
            try:
                payload = json.loads(row["action_payload_json"] or "{}")
            except json.JSONDecodeError:
                payload = {}
            items.append(
                EngineerAttachmentResponse(
                    id=payload.get("attachment_id") or row["id"],
                    file_url=payload.get("file_url", ""),
                    original_filename=payload.get("original_filename"),
                    content_type=payload.get("content_type"),
                    note=payload.get("note"),
                    created_at=row["created_at"],
                )
            )
        return items

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
    def _checkin_quality(distance_meters: float | None, accuracy_meters: float | None) -> str | None:
        if distance_meters is None or accuracy_meters is None:
            return None
        if accuracy_meters > CHECKIN_MAX_ACCURACY_METERS:
            return "invalid"
        if distance_meters <= CHECKIN_NEAR_THRESHOLD_METERS:
            return "valid"
        if distance_meters <= CHECKIN_WARN_THRESHOLD_METERS:
            return "warning"
        return "invalid"

    @classmethod
    def _checkin_warning_code(cls, distance_meters: float | None, accuracy_meters: float | None) -> str | None:
        quality = cls._checkin_quality(distance_meters, accuracy_meters)
        if quality == "warning":
            return "distance_warning"
        if quality == "invalid":
            return "too_far" if distance_meters and distance_meters > CHECKIN_WARN_THRESHOLD_METERS else "accuracy_too_low"
        return None

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
