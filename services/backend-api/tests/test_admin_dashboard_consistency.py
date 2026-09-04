from __future__ import annotations

import sqlite3
import unittest

from app.modules.reports.repository import ReportRepository


CREATE_REPORTS_TABLE_SQL = """
CREATE TABLE reports (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    image_path TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    gps_accuracy REAL,
    location_source TEXT,
    location_recorded_at TEXT,
    note TEXT,
    ai_status TEXT NOT NULL,
    status TEXT NOT NULL,
    ai_message TEXT,
    detections_json TEXT NOT NULL,
    admin_note TEXT,
    corrected_damage_type TEXT,
    is_ai_overridden INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
""".strip()


class AdminDashboardConsistencyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.connection = sqlite3.connect(":memory:")
        self.connection.row_factory = sqlite3.Row
        self.connection.execute(CREATE_REPORTS_TABLE_SQL)
        self.repository = ReportRepository(self.connection)

    def tearDown(self) -> None:
        self.connection.close()

    def _insert_report(
        self,
        *,
        report_id: str,
        created_at: str,
        status: str,
        damage_type: str,
    ) -> None:
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
                admin_note,
                corrected_damage_type,
                is_ai_overridden,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                "seed-user-reporter",
                f"reports/{report_id}.png",
                10.75,
                106.68,
                8.0,
                "gps",
                created_at,
                f"[dashboard-test] {report_id}",
                "success",
                status,
                "ok",
                (
                    '{"success": true, "image_width": 1280, "image_height": 720, '
                    f'"detections_count": 1, "detections": [{{"class_id": null, "damage_type": "{damage_type}", '
                    '"class_name": "test", "confidence": 0.88, "bbox": {"x1": 10, "y1": 20, "x2": 30, "y2": 40}}], '
                    '"processing_time_ms": 18.4, "message": "ok"}'
                ),
                None,
                None,
                0,
                created_at,
                created_at,
            ),
        )
        self.connection.commit()

    def test_dashboard_totals_match_status_and_timeline_summaries(self) -> None:
        self._insert_report(
            report_id="r-001",
            created_at="2026-08-20T08:00:00+07:00",
            status="pending_verification",
            damage_type="D00",
        )
        self._insert_report(
            report_id="r-002",
            created_at="2026-08-20T09:00:00+07:00",
            status="manual_review_required",
            damage_type="D10",
        )
        self._insert_report(
            report_id="r-003",
            created_at="2026-08-21T10:00:00+07:00",
            status="in_progress",
            damage_type="D20",
        )
        self._insert_report(
            report_id="r-004",
            created_at="2026-08-22T11:00:00+07:00",
            status="resolved",
            damage_type="D40",
        )
        self._insert_report(
            report_id="r-005",
            created_at="2026-08-22T12:00:00+07:00",
            status="rejected",
            damage_type="D40",
        )

        dashboard = self.repository.get_admin_dashboard()

        self.assertEqual(dashboard.total_reports, 5)

        kpi_by_key = {item.key: item.value for item in dashboard.kpis}
        self.assertEqual(kpi_by_key["pending"], 2)
        self.assertEqual(kpi_by_key["processing"], 1)
        self.assertEqual(kpi_by_key["repaired"], 1)

        status_by_key = {item.key: item.value for item in dashboard.status_summary}
        self.assertEqual(status_by_key["pending"], 2)
        self.assertEqual(status_by_key["processing"], 1)
        self.assertEqual(status_by_key["repaired"], 1)
        self.assertEqual(status_by_key["rejected"], 1)
        self.assertEqual(sum(status_by_key.values()), 5)

        damage_by_key = {item.key: item.value for item in dashboard.damage_type_summary}
        self.assertEqual(damage_by_key["D00"], 1)
        self.assertEqual(damage_by_key["D10"], 1)
        self.assertEqual(damage_by_key["D20"], 1)
        self.assertEqual(damage_by_key["D40"], 2)
        self.assertEqual(sum(damage_by_key.values()), 5)

        self.assertEqual(sum(item.total for item in dashboard.timeline), 5)
        self.assertEqual(sum(item.pending for item in dashboard.timeline), 2)
        self.assertEqual(sum(item.processing for item in dashboard.timeline), 1)
        self.assertEqual(sum(item.repaired for item in dashboard.timeline), 1)


if __name__ == "__main__":
    unittest.main()
