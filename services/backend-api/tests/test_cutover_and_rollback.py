"""Automated Verification Test for Database Cutover & Emergency Rollback (RDG-PG-08).

Acceptance Criteria:
  - Scenario: Thực hiện quy trình Rollback thành công
    Given hệ thống gặp sự cố sau khi chuyển sang PostGIS
    When thực hiện các bước trong Kế hoạch Rollback
    Then hệ thống Backend API trở lại hoạt động bình thường với SQLite trong dưới 3 phút
    And không có dữ liệu lịch sử nào trước thời điểm cutover bị mất
"""

import os
import shutil
import time
import unittest
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import check_database_ready, get_connection
from app.main import app
from scripts.cutover_to_postgis import run_cutover
from scripts.rollback_to_sqlite import run_rollback


class TestCutoverAndRollback(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.settings = get_settings()
        cls.base_dir = Path(__file__).resolve().parents[1]
        cls.data_dir = cls.base_dir / "data"
        cls.sqlite_db = cls.data_dir / "road_damage_gis.db"
        cls.backup_db = cls.data_dir / "backup_pre_migration.db"

        # Count baseline records in SQLite before test
        cls.orig_backend = os.environ.get("GIS_BACKEND")
        os.environ["GIS_BACKEND"] = "sqlite"
        get_settings.cache_clear()
        with get_connection() as conn:
            cls.baseline_user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            cls.baseline_report_count = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0]

    @classmethod
    def tearDownClass(cls) -> None:
        # Restore original backend
        if cls.orig_backend:
            os.environ["GIS_BACKEND"] = cls.orig_backend
        os.environ["READ_ONLY_MODE"] = "false"
        os.environ["MAINTENANCE_MODE"] = "false"
        get_settings.cache_clear()

    def test_01_read_only_maintenance_mode(self) -> None:
        """Kiểm tra middleware READ_ONLY_MODE: Cho phép GET, chặn POST/PUT/DELETE với 503."""
        client = TestClient(app)

        try:
            # 1. Enable Read-only mode
            os.environ["READ_ONLY_MODE"] = "true"
            get_settings.cache_clear()

            # Health / Ready endpoints should remain accessible
            ready_res = client.get("/ready")
            self.assertEqual(ready_res.status_code, 200)

            # GET requests should succeed
            get_res = client.get("/api/reports/clusters")
            self.assertEqual(get_res.status_code, 200)

            # POST requests should be intercepted with 503 MAINTENANCE_MODE
            post_res = client.post("/api/reports", json={"test": "data"})
            self.assertEqual(post_res.status_code, 503)
            data = post_res.json()
            self.assertEqual(data.get("code"), "MAINTENANCE_MODE")
            self.assertEqual(data.get("status"), "maintenance")

            # DELETE requests should also be blocked
            del_res = client.delete("/api/reports/some-id")
            self.assertEqual(del_res.status_code, 503)

        finally:
            # Disable Read-only mode
            os.environ["READ_ONLY_MODE"] = "false"
            get_settings.cache_clear()

            # Verify POST is no longer blocked with 503
            post_res_after = client.post("/api/reports", json={"test": "data"})
            self.assertNotEqual(post_res_after.status_code, 503)

    def test_02_snapshot_backup_creation(self) -> None:
        """Kiểm tra tạo bản sao lưu Snapshot tệp SQLite an toàn trước khi cutover."""
        self.assertTrue(self.sqlite_db.exists(), "Tệp SQLite phải tồn tại")

        # Copy snapshot
        shutil.copy2(self.sqlite_db, self.backup_db)
        self.assertTrue(self.backup_db.exists(), "Snapshot backup_pre_migration.db phải được tạo")
        self.assertEqual(
            self.backup_db.stat().st_size,
            self.sqlite_db.stat().st_size,
            "Dung lượng tệp snapshot phải trùng khớp với tệp gốc",
        )

    def test_03_cutover_to_postgis_execution(self) -> None:
        """Kiểm tra quy trình cutover tự động sang PostGIS hoàn tất thành công."""
        success = run_cutover(skip_smoke_tests=False, dry_run=False)
        self.assertTrue(success, "Quy trình cutover sang PostGIS phải thành công")

        # Verify system is now running on PostGIS
        self.assertEqual(os.environ.get("GIS_BACKEND"), "postgis")
        self.assertTrue(check_database_ready()["ready"], "PostGIS phải ở trạng thái sẵn sàng")

    def test_04_emergency_rollback_within_3_minutes_sla(self) -> None:
        """Kịch bản nghiệm thu chính (Gherkin):

        Thực hiện rollback khẩn cấp về SQLite trong dưới 3 phút và bảo toàn 100% dữ liệu lịch sử.
        """
        # Ensure we start from postgis
        os.environ["GIS_BACKEND"] = "postgis"
        get_settings.cache_clear()

        t_start = time.perf_counter()
        rollback_success = run_rollback(restore_backup=True)
        elapsed_time = time.perf_counter() - t_start

        # 1. Rollback must succeed
        self.assertTrue(rollback_success, "Rollback về SQLite phải thành công")

        # 2. SLA must be < 3 minutes (180 seconds)
        self.assertLess(
            elapsed_time,
            180.0,
            f"Thời gian rollback phải dưới 3 phút (180s), thực tế: {elapsed_time:.2f}s",
        )
        print(f"\n[SLA CHECK] Thời gian hoàn thành Rollback: {elapsed_time:.3f}s (Chuẩn: < 180s) -> ĐẠT")

        # 3. Backend must be switched back to SQLite
        self.assertEqual(os.environ.get("GIS_BACKEND"), "sqlite")
        self.assertEqual(get_settings().gis_backend, "sqlite")
        self.assertTrue(check_database_ready()["ready"], "Hệ thống SQLite phải sẵn sàng hoạt động bình thường")

        # 4. Zero historical data loss
        with get_connection() as conn:
            restored_user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            restored_report_count = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0]

        self.assertEqual(
            restored_user_count,
            self.baseline_user_count,
            f"Số lượng users sau rollback ({restored_user_count}) phải khớp với dữ liệu gốc ({self.baseline_user_count})",
        )
        self.assertEqual(
            restored_report_count,
            self.baseline_report_count,
            f"Số lượng reports sau rollback ({restored_report_count}) phải khớp với dữ liệu gốc ({self.baseline_report_count})",
        )
        print(
            f"[DATA INTEGRITY] 100% dữ liệu lịch sử được bảo toàn nguyên vẹn: "
            f"{restored_user_count} users, {restored_report_count} reports."
        )


if __name__ == "__main__":
    unittest.main()
