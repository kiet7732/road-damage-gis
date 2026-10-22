import os
import sqlite3
import sys
import unittest
from pathlib import Path

# Add backend app directory to sys.path
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import psycopg
from app.config import get_settings
from app.database import get_database_path, close_postgres_pool
from scripts.migrate_sqlite_to_postgis import (
    migrate_users,
    migrate_reports,
    migrate_refresh_tokens,
    migrate_report_engineer_actions,
    migrate_geocoding_cache,
    verify_migration_checksum,
)


class MigrationPipelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.settings = get_settings()
        cls.sqlite_path = get_database_path()
        cls.sqlite_conn = sqlite3.connect(cls.sqlite_path)
        cls.sqlite_conn.row_factory = sqlite3.Row
        cls.pg_conn = psycopg.connect(cls.settings.resolved_database_url, autocommit=True)

    @classmethod
    def tearDownClass(cls) -> None:
        cls.sqlite_conn.close()
        cls.pg_conn.close()
        close_postgres_pool()

    def test_01_dry_run(self) -> None:
        """Kiểm tra dry-run đếm đúng số bản ghi nguồn mà không ghi dữ liệu"""
        user_count = migrate_users(self.sqlite_conn, self.pg_conn, dry_run=True)
        report_count = migrate_reports(self.sqlite_conn, self.pg_conn, dry_run=True)
        self.assertGreater(user_count, 0)
        self.assertGreater(report_count, 0)

    def test_02_execute_migration_and_verify_counts(self) -> None:
        """Kiểm tra thực thi migration và đối soát số lượng bản ghi giữa SQLite và PostGIS"""
        migrate_users(self.sqlite_conn, self.pg_conn, dry_run=False)
        migrate_reports(self.sqlite_conn, self.pg_conn, dry_run=False)
        migrate_refresh_tokens(self.sqlite_conn, self.pg_conn, dry_run=False)
        migrate_report_engineer_actions(self.sqlite_conn, self.pg_conn, dry_run=False)
        migrate_geocoding_cache(self.sqlite_conn, self.pg_conn, dry_run=False)

        # Chạy kiểm tra checksum toàn vẹn
        checksum_ok = verify_migration_checksum(self.sqlite_conn, self.pg_conn)
        self.assertTrue(checksum_ok)

    def test_03_coordinate_integrity_and_no_swap(self) -> None:
        """Kiểm tra toạ độ không bị đảo ngược: ST_X(geom) == lon, ST_Y(geom) == lat"""
        cur_sq = self.sqlite_conn.cursor()
        cur_sq.execute("SELECT id, latitude, longitude FROM reports")
        reports_sq = {r["id"]: (float(r["latitude"]), float(r["longitude"])) for r in cur_sq.fetchall()}

        with self.pg_conn.cursor() as cur_pg:
            cur_pg.execute("SELECT id, ST_X(geom) as lon, ST_Y(geom) as lat FROM reports")
            for pg_id, pg_lon, pg_lat in cur_pg.fetchall():
                self.assertIn(pg_id, reports_sq)
                sq_lat, sq_lon = reports_sq[pg_id]
                self.assertAlmostEqual(pg_lon, sq_lon, places=5, msg=f"Kinh độ bị lệch tại {pg_id}")
                self.assertAlmostEqual(pg_lat, sq_lat, places=5, msg=f"Vĩ độ bị lệch tại {pg_id}")

    def test_04_jsonb_structure_validity(self) -> None:
        """Kiểm tra toàn bộ bản ghi reports có detections_json thuộc kiểu JSONB hợp lệ"""
        with self.pg_conn.cursor() as cur_pg:
            cur_pg.execute("SELECT id, jsonb_typeof(detections_json) as jtype, detections_json FROM reports")
            rows = cur_pg.fetchall()
            for r_id, jtype, d_json in rows:
                self.assertEqual(jtype, "object")
                self.assertIn("detections", d_json)

    def test_05_idempotency_second_run(self) -> None:
        """Kiểm tra tính bất biến (Idempotency): Chạy lại lần 2 không gây lỗi và giữ nguyên số lượng"""
        with self.pg_conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM reports")
            count_before = cur.fetchone()[0]

        # Chạy lại migration
        migrate_reports(self.sqlite_conn, self.pg_conn, dry_run=False)

        with self.pg_conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM reports")
            count_after = cur.fetchone()[0]

        self.assertEqual(count_before, count_after)


if __name__ == "__main__":
    unittest.main()
