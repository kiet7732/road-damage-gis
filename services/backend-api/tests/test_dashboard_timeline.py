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


class DashboardTimelineOrderingTests(unittest.TestCase):
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
        status: str = "pending_verification",
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                report_id,
                "seed-user-reporter",
                f"reports/{report_id}.png",
                10.75,
                106.68,
                12.0,
                f"[test] {report_id}",
                "success",
                status,
                "ok",
                '{"success": true, "image_width": 1280, "image_height": 720, "detections_count": 1, "detections": [{"class_id": null, "damage_type": "D40", "class_name": "Ổ gà", "confidence": 0.88, "bbox": {"x1": 10, "y1": 20, "x2": 30, "y2": 40}}], "processing_time_ms": 18.4, "message": "ok"}',
                None,
                None,
                0,
                created_at,
                created_at,
            ),
        )
        self.connection.commit()

    def test_timeline_orders_by_real_date_across_months_and_years(self) -> None:
        self._insert_report(report_id="r-1", created_at="2026-09-02T08:00:00+00:00")
        self._insert_report(report_id="r-2", created_at="2026-08-18T08:00:00+00:00")
        self._insert_report(report_id="r-3", created_at="2027-01-03T08:00:00+00:00")
        self._insert_report(report_id="r-4", created_at="2026-10-01T08:00:00+00:00")

        dashboard = self.repository.get_admin_dashboard()

        self.assertEqual(
            [item.date for item in dashboard.timeline],
            ["18/08", "02/09", "01/10", "03/01"],
        )
        self.assertEqual(
            [item.total for item in dashboard.timeline],
            [1, 1, 1, 1],
        )


if __name__ == "__main__":
    unittest.main()
