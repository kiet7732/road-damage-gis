import os
import sqlite3
import tempfile
from pathlib import Path
from unittest import TestCase
from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import init_database
from app.main import app
from app.modules.auth.dependencies import get_admin_user, get_current_user
from app.modules.auth.schemas import AuthUser


class AdministrativeDashboardStatsTests(TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "test_admin_stats.db"
        self.upload_dir = Path(self.temp_dir.name) / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        os.environ["BACKEND_DATABASE_PATH"] = str(self.db_path)
        os.environ["BACKEND_UPLOAD_DIR"] = str(self.upload_dir)
        get_settings.cache_clear()
        init_database()

        self.connection = sqlite3.connect(self.db_path)
        self.connection.row_factory = sqlite3.Row

        self.super_admin = AuthUser(
            id="usr-super-admin",
            fullName="Lãnh đạo Sở GTVT",
            email="superadmin@sgtvt.gov.vn",
            role="super_admin",
            managedDistrict=None,
            phone="0909999999",
        )
        self.officer_q1 = AuthUser(
            id="usr-officer-q1",
            fullName="Cán bộ Quản lý Quận 1",
            email="officer.q1@tphcm.gov.vn",
            role="district_officer",
            managedDistrict="Quận 1",
            phone="0901111111",
        )

        # Tạo các báo cáo mẫu ở các quận khác nhau
        # Quận 1: 3 báo cáo (2 pending ở Lê Duẩn, 1 repaired ở Đồng Khởi)
        self._insert_report(district="Quận 1", ward="Phường Bến Nghé", road_name="Đường Lê Duẩn", status="pending")
        self._insert_report(district="Quận 1", ward="Phường Bến Nghé", road_name="Đường Lê Duẩn", status="pending")
        self._insert_report(district="Quận 1", ward="Phường Bến Thành", road_name="Đường Đồng Khởi", status="repaired")

        # Quận 3: 2 báo cáo (1 processing, 1 repaired)
        self._insert_report(district="Quận 3", ward="Phường 1", road_name="Đường Cách Mạng Tháng 8", status="processing")
        self._insert_report(district="Quận 3", ward="Phường 2", road_name="Đường Nguyễn Thị Minh Khai", status="repaired")

        # Quận 7: 1 báo cáo (1 pending)
        self._insert_report(district="Quận 7", ward="Phường Tân Phong", road_name="Đường Nguyễn Văn Linh", status="pending")

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.connection.close()
        get_settings.cache_clear()
        try:
            self.temp_dir.cleanup()
        except Exception:
            pass

    def _insert_report(
        self,
        *,
        district: str = "Quận 1",
        ward: str = "Phường Bến Nghé",
        road_name: str = "Đường Lê Duẩn",
        status: str = "pending",
    ) -> str:
        rep_id = f"rep-{uuid4().hex[:8]}"
        self.connection.execute(
            """
            INSERT INTO reports (
                id, user_id, image_path, latitude, longitude,
                ai_status, status, detections_json, road_name, ward, district, province,
                formatted_address, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rep_id,
                "usr-citizen-01",
                "/uploads/test.jpg",
                10.78,
                106.69,
                "completed",
                status,
                '[]',
                road_name,
                ward,
                district,
                "Thành phố Hồ Chí Minh",
                f"{road_name}, {ward}, {district}",
                "2026-09-14T10:00:00Z",
                "2026-09-14T10:00:00Z",
            ),
        )
        self.connection.commit()
        return rep_id

    def test_ac01_administrative_stats_response_structure(self) -> None:
        """AC-01: Kiểm tra cấu trúc và tính chính xác của dữ liệu trả về từ /admin/dashboard/administrative-stats"""
        app.dependency_overrides[get_current_user] = lambda: self.super_admin
        app.dependency_overrides[get_admin_user] = lambda: self.super_admin
        client = TestClient(app)

        resp = client.get("/api/admin/dashboard/administrative-stats")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        # Kiểm tra tổng số
        self.assertEqual(data["total_reports"], 6)
        self.assertIsNone(data["filtered_district"])

        # Kiểm tra district_stats
        district_names = [d["district"] for d in data["district_stats"]]
        self.assertIn("Quận 1", district_names)
        self.assertIn("Quận 3", district_names)
        self.assertIn("Quận 7", district_names)

        q1_stat = next(d for d in data["district_stats"] if d["district"] == "Quận 1")
        self.assertEqual(q1_stat["total"], 3)
        self.assertEqual(q1_stat["pending"], 2)
        self.assertEqual(q1_stat["repaired"], 1)
        self.assertEqual(q1_stat["percentage"], 50.0)

        # Kiểm tra top_roads
        self.assertGreater(len(data["top_roads"]), 0)
        # Đường Lê Duẩn có 2 báo cáo, phải nằm đầu danh sách
        self.assertEqual(data["top_roads"][0]["road_name"], "Đường Lê Duẩn")
        self.assertEqual(data["top_roads"][0]["total"], 2)

        # Kiểm tra ward_stats
        ward_names = [w["ward"] for w in data["ward_stats"]]
        self.assertIn("Phường Bến Nghé", ward_names)
        self.assertIn("Phường Bến Thành", ward_names)
        bn_stat = next(w for w in data["ward_stats"] if w["ward"] == "Phường Bến Nghé")
        self.assertEqual(bn_stat["total"], 2)
        self.assertEqual(bn_stat["pending"], 2)

    def test_ac01_spatial_rbac_auto_filter_district_officer(self) -> None:
        """AC-01: Cán bộ Quận 1 đăng nhập -> Tự động chỉ trả về dữ liệu của Quận 1"""
        app.dependency_overrides[get_current_user] = lambda: self.officer_q1
        app.dependency_overrides[get_admin_user] = lambda: self.officer_q1
        client = TestClient(app)

        resp = client.get("/api/admin/dashboard/administrative-stats")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["total_reports"], 3)
        self.assertEqual(data["filtered_district"], "Quận 1")

        # Toàn bộ district_stats chỉ có Quận 1
        for d in data["district_stats"]:
            self.assertEqual(d["district"], "Quận 1")

        # Toàn bộ ward_stats chỉ thuộc Quận 1
        for w in data["ward_stats"]:
            self.assertEqual(w["district"], "Quận 1")

        # Top roads chỉ thuộc Quận 1
        road_names = [r["road_name"] for r in data["top_roads"]]
        self.assertIn("Đường Lê Duẩn", road_names)
        self.assertIn("Đường Đồng Khởi", road_names)
        self.assertNotIn("Đường Cách Mạng Tháng 8", road_names)

    def test_ac01_district_officer_tampering_prevented(self) -> None:
        """AC-01: Cán bộ Quận 1 cố tình query sang Quận 3 -> 403 Forbidden"""
        app.dependency_overrides[get_current_user] = lambda: self.officer_q1
        app.dependency_overrides[get_admin_user] = lambda: self.officer_q1
        client = TestClient(app)

        resp = client.get("/api/admin/dashboard/administrative-stats?district=Quận 3")
        self.assertEqual(resp.status_code, 403)
        msg = resp.json().get("message") or resp.json().get("detail") or ""
        self.assertIn("không có quyền truy cập", msg.lower())

    def test_ac01_super_admin_can_filter_specific_district(self) -> None:
        """AC-01: Super Admin có quyền truy vấn cụ thể một quận bất kỳ"""
        app.dependency_overrides[get_current_user] = lambda: self.super_admin
        app.dependency_overrides[get_admin_user] = lambda: self.super_admin
        client = TestClient(app)

        resp = client.get("/api/admin/dashboard/administrative-stats?district=Quận 3")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()

        self.assertEqual(data["total_reports"], 2)
        self.assertEqual(data["filtered_district"], "Quận 3")
        for d in data["district_stats"]:
            self.assertEqual(d["district"], "Quận 3")
