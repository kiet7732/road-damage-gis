from __future__ import annotations

import os
import sqlite3
import tempfile
import unittest
from pathlib import Path

from app.config import get_settings
from app.database import init_database
from app.modules.reports.repository import ReportRepository


OLD_REPORTS_TABLE_SQL = """
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
);
""".strip()


class GeocodingDbMigrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_road_damage.db"
        os.environ["BACKEND_DATABASE_PATH"] = str(self.db_path)
        get_settings.cache_clear()

    def tearDown(self) -> None:
        import gc
        gc.collect()
        os.environ.pop("BACKEND_DATABASE_PATH", None)
        get_settings.cache_clear()
        try:
            self.temp_dir.cleanup()
        except Exception:
            pass

    def test_migration_adds_administrative_columns_and_preserves_data(self) -> None:
        # 1. Setup old database with legacy schema
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute(OLD_REPORTS_TABLE_SQL)
        conn.execute(
            """
            INSERT INTO reports (
                id, user_id, image_path, latitude, longitude, note,
                ai_status, status, detections_json, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "rep-legacy-01",
                "usr-01",
                "reports/test.jpg",
                10.782345,
                106.699876,
                "Old report before migration",
                "success",
                "pending_verification",
                '{"success": true, "detections_count": 0, "detections": [], "message": "OK"}',
                "2026-09-10T10:00:00Z",
                "2026-09-10T10:00:00Z",
            ),
        )
        conn.commit()
        conn.close()

        # 2. Run init_database to trigger automatic migration
        init_database()

        # 3. Verify columns in reports table
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        columns = {
            row["name"]: row["type"]
            for row in conn.execute("PRAGMA table_info(reports)").fetchall()
        }

        self.assertIn("road_name", columns)
        self.assertIn("ward", columns)
        self.assertIn("district", columns)
        self.assertIn("province", columns)
        self.assertIn("formatted_address", columns)

        # 4. Verify existing data preserved
        legacy_row = conn.execute(
            "SELECT * FROM reports WHERE id = 'rep-legacy-01'"
        ).fetchone()
        self.assertIsNotNone(legacy_row)
        self.assertEqual(legacy_row["id"], "rep-legacy-01")
        self.assertEqual(legacy_row["note"], "Old report before migration")
        self.assertIsNone(legacy_row["road_name"])
        self.assertIsNone(legacy_row["formatted_address"])

        # 5. Verify indexes on reports table
        index_names = {
            row["name"]
            for row in conn.execute("PRAGMA index_list(reports)").fetchall()
        }
        self.assertIn("idx_reports_district_ward", index_names)
        self.assertIn("idx_reports_road_name", index_names)

        # 6. Verify geocoding_cache table and index
        cache_columns = {
            row["name"]: row["type"]
            for row in conn.execute("PRAGMA table_info(geocoding_cache)").fetchall()
        }
        self.assertIn("id", cache_columns)
        self.assertIn("latitude", cache_columns)
        self.assertIn("longitude", cache_columns)
        self.assertIn("road_name", cache_columns)
        self.assertIn("ward", cache_columns)
        self.assertIn("district", cache_columns)
        self.assertIn("province", cache_columns)
        self.assertIn("formatted_address", cache_columns)
        self.assertIn("hit_count", cache_columns)

        cache_indexes = {
            row["name"]
            for row in conn.execute("PRAGMA index_list(geocoding_cache)").fetchall()
        }
        self.assertIn("idx_geocoding_cache_coords", cache_indexes)
        conn.close()

    def test_update_report_administrative_address(self) -> None:
        init_database()
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        repo = ReportRepository(conn)

        conn.execute(
            """
            INSERT INTO reports (
                id, user_id, image_path, latitude, longitude, note,
                ai_status, status, detections_json, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "rep-addr-01",
                "usr-01",
                "reports/test.jpg",
                10.782345,
                106.699876,
                "Need address",
                "success",
                "pending",
                '{"success": true, "detections_count": 0, "detections": [], "message": "OK"}',
                "2026-09-14T10:00:00Z",
                "2026-09-14T10:00:00Z",
            ),
        )
        conn.commit()

        # Update address
        repo.update_report_administrative_address(
            "rep-addr-01",
            road_name="Lê Duẩn",
            ward="Phường Bến Nghé",
            district="Quận 1",
            province="TP. Hồ Chí Minh",
            formatted_address="12 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
        )

        report = repo.get_report("rep-addr-01", include_admin_fields=True)
        self.assertIsNotNone(report)
        self.assertEqual(report.road_name, "Lê Duẩn")
        self.assertEqual(report.ward, "Phường Bến Nghé")
        self.assertEqual(report.district, "Quận 1")
        self.assertEqual(report.province, "TP. Hồ Chí Minh")
        self.assertEqual(
            report.formatted_address,
            "12 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
        )
        conn.close()

    def test_geocoding_cache_hit_and_miss_within_15_meters(self) -> None:
        init_database()
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        repo = ReportRepository(conn)

        # Save address in cache at point A (10.782345, 106.699876)
        cache_id = repo.save_geocoding_cache(
            latitude=10.782345,
            longitude=106.699876,
            road_name="Lê Duẩn",
            ward="Phường Bến Nghé",
            district="Quận 1",
            province="TP. Hồ Chí Minh",
            formatted_address="12 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
        )
        self.assertTrue(len(cache_id) > 0)

        # 1. Point B is ~5.2 meters away from Point A -> Expected HIT (<= 15m)
        hit_row = repo.find_geocoding_cache(
            latitude=10.782380,
            longitude=106.699890,
            max_distance_meters=15.0,
        )
        self.assertIsNotNone(hit_row)
        self.assertEqual(hit_row["road_name"], "Lê Duẩn")
        self.assertEqual(hit_row["district"], "Quận 1")
        self.assertEqual(hit_row["hit_count"], 2)  # Hit count incremented

        # 2. Point C is ~140 meters away from Point A -> Expected MISS (> 15m)
        miss_row = repo.find_geocoding_cache(
            latitude=10.783500,
            longitude=106.701000,
            max_distance_meters=15.0,
        )
        self.assertIsNone(miss_row)

        conn.close()


if __name__ == "__main__":
    unittest.main()
