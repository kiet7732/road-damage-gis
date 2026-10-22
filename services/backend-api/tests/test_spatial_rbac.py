from __future__ import annotations

import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import init_database
from app.main import app
from app.modules.auth.dependencies import get_admin_user, get_current_user
from app.modules.auth.schemas import AuthUser


class SpatialRbacTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "test_spatial_rbac.db"
        self.upload_dir = Path(self.temp_dir.name) / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        os.environ["BACKEND_DATABASE_PATH"] = str(self.db_path)
        os.environ["BACKEND_UPLOAD_DIR"] = str(self.upload_dir)
        get_settings.cache_clear()
        init_database()

        self.connection = sqlite3.connect(self.db_path)
        self.connection.row_factory = sqlite3.Row

        # Mock users
        self.officer_q1 = AuthUser(
            id="usr-officer-q1",
            fullName="Cán bộ Quản lý Quận 1",
            email="officer.q1@roadgis.local",
            role="district_officer",
            managedDistrict="Quận 1",
            phone="0901111111",
        )
        self.super_admin = AuthUser(
            id="usr-super-admin",
            fullName="Lãnh đạo Sở GTVT",
            email="superadmin@roadgis.local",
            role="super_admin",
            managedDistrict=None,
            phone="0909999999",
        )
        self.general_admin = AuthUser(
            id="usr-general-admin",
            fullName="Quản trị viên Trung tâm",
            email="admin@roadgis.local",
            role="admin",
            managedDistrict=None,
            phone="0908888888",
        )

        # Seed reports
        self.q1_rep1_id = self._insert_report(
            district="Quận 1",
            ward="Phường Bến Nghé",
            road_name="Đường Lê Duẩn",
            status="pending",
        )
        self.q1_rep2_id = self._insert_report(
            district="Quận 1",
            ward="Phường Bến Thành",
            road_name="Đường Nguyễn Thị Minh Khai",
            status="processing",
        )
        self.q3_rep1_id = self._insert_report(
            district="Quận 3",
            ward="Phường Võ Thị Sáu",
            road_name="Đường Nam Kỳ Khởi Nghĩa",
            status="pending",
        )
        self.q3_rep2_id = self._insert_report(
            district="Quận 3",
            ward="Phường 1",
            road_name="Đường Cách Mạng Tháng 8",
            status="repaired",
        )
        self.q7_rep1_id = self._insert_report(
            district="Quận 7",
            ward="Phường Tân Phong",
            road_name="Đường Nguyễn Văn Linh",
            status="pending",
        )

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
        report_id: str | None = None,
        district: str = "Quận 1",
        ward: str = "Phường Bến Nghé",
        road_name: str = "Đường Lê Duẩn",
        status: str = "pending",
        latitude: float = 10.78,
        longitude: float = 106.69,
    ) -> str:
        rep_id = report_id or f"rep-{uuid4().hex[:8]}"
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
                road_name,
                ward,
                district,
                province,
                formatted_address,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rep_id,
                "usr-citizen-01",
                "uploads/test.jpg",
                latitude,
                longitude,
                5.0,
                "gps",
                "2026-09-14T10:00:00Z",
                f"Sự cố tại {road_name}",
                "ai_verified",
                status,
                "Phát hiện ổ gà",
                (
                    '{"success": true, "image_width": 800, "image_height": 600, "detections_count": 1, '
                    '"detections": [{"damage_type": "D40", "confidence": 0.95, '
                    '"bbox": {"x1": 0.1, "y1": 0.1, "x2": 0.5, "y2": 0.5}}], '
                    '"processing_time_ms": 10.0, "message": "Phát hiện ổ gà"}'
                ),
                road_name,
                ward,
                district,
                "Thành phố Hồ Chí Minh",
                f"{road_name}, {ward}, {district}, TP. Hồ Chí Minh",
                "2026-09-14T10:00:00Z",
                "2026-09-14T10:00:00Z",
            ),
        )
        self.connection.commit()
        return rep_id

    def test_database_migration_users_managed_district(self) -> None:
        """Kiểm tra cột managed_district và managed_ward đã tồn tại trong bảng users sau migration."""
        columns = {
            row["name"]
            for row in self.connection.execute("PRAGMA table_info(users)").fetchall()
        }
        self.assertIn("managed_district", columns)
        self.assertIn("managed_ward", columns)

    def test_ac01_district_officer_auto_filters_reports_and_gis(self) -> None:
        """AC-01: Cán bộ Quận 1 đăng nhập -> API tự động lọc trả về chỉ các báo cáo thuộc Quận 1."""
        app.dependency_overrides[get_current_user] = lambda: self.officer_q1
        app.dependency_overrides[get_admin_user] = lambda: self.officer_q1
        client = TestClient(app)

        # 1. Danh sách báo cáo (/api/admin/reports)
        resp_reports = client.get("/api/admin/reports")
        self.assertEqual(resp_reports.status_code, 200)
        data_reports = resp_reports.json()
        self.assertEqual(data_reports["total"], 2)
        for item in data_reports["items"]:
            self.assertEqual(item["district"], "Quận 1")

        # 2. Bản đồ GIS (/api/admin/gis/reports)
        resp_gis = client.get("/api/admin/gis/reports")
        self.assertEqual(resp_gis.status_code, 200)
        data_gis = resp_gis.json()
        self.assertEqual(len(data_gis["features"]), 2)
        for feature in data_gis["features"]:
            self.assertEqual(feature["properties"]["district"], "Quận 1")

        # 3. Dashboard thống kê (/api/admin/dashboard)
        resp_dash = client.get("/api/admin/dashboard")
        self.assertEqual(resp_dash.status_code, 200)
        data_dash = resp_dash.json()
        self.assertEqual(data_dash["total_reports"], 2)

        # 4. Cây phân cấp hành chính (/api/gis/administrative-hierarchy)
        resp_tree = client.get("/api/gis/administrative-hierarchy")
        self.assertEqual(resp_tree.status_code, 200)
        data_tree = resp_tree.json()
        districts = [
            d["name"]
            for p in data_tree["provinces"]
            for d in p["districts"]
        ]
        self.assertEqual(districts, ["Quận 1"])

    def test_ac02_district_officer_tampering_prevented_with_403(self) -> None:
        """AC-02: Cán bộ Quận 1 cố tình query hoặc sửa sang Quận 3 sẽ bị chặn mã 403 Forbidden."""
        app.dependency_overrides[get_current_user] = lambda: self.officer_q1
        app.dependency_overrides[get_admin_user] = lambda: self.officer_q1
        client = TestClient(app)

        # 1. Cố tình query sang Quận 3 trên danh sách báo cáo -> 403
        resp_query_other = client.get("/api/admin/reports?district=Quận 3")
        self.assertEqual(resp_query_other.status_code, 403)
        err_msg = resp_query_other.json().get("message") or resp_query_other.json().get("detail") or ""
        self.assertIn("không có quyền truy cập", err_msg.lower())

        # 2. Cố tình query sang Quận 3 trên bản đồ GIS -> 403
        resp_gis_other = client.get("/api/admin/gis/reports?district=Quận 3")
        self.assertEqual(resp_gis_other.status_code, 403)

        # 3. Cố tình query sang Quận 3 trên /gis/points -> 403
        resp_points_other = client.get("/api/gis/points?district=Quận 3")
        self.assertEqual(resp_points_other.status_code, 403)

        # 4. Cố tình truy cập chi tiết ID phản ánh thuộc Quận 3 -> 403
        resp_detail_q3 = client.get(f"/api/admin/reports/{self.q3_rep1_id}")
        self.assertEqual(resp_detail_q3.status_code, 403)

        # 5. Cố tình cập nhật trạng thái phản ánh thuộc Quận 3 -> 403
        resp_patch_status = client.patch(
            f"/api/admin/reports/{self.q3_rep1_id}/status",
            json={"status": "processing", "admin_note": "Can thiệp trái phép"},
        )
        self.assertEqual(resp_patch_status.status_code, 403)

        # 6. Cố tình cập nhật loại hư hỏng phản ánh thuộc Quận 3 -> 403
        resp_patch_damage = client.patch(
            f"/api/admin/reports/{self.q3_rep1_id}/damage-type",
            json={"corrected_damage_type": "D10", "is_ai_overridden": True},
        )
        self.assertEqual(resp_patch_damage.status_code, 403)

        # 7. Truy cập đúng ID phản ánh thuộc Quận 1 -> 200 OK
        resp_detail_q1 = client.get(f"/api/admin/reports/{self.q1_rep1_id}")
        self.assertEqual(resp_detail_q1.status_code, 200)
        self.assertEqual(resp_detail_q1.json()["id"], self.q1_rep1_id)

    def test_ac03_super_admin_unrestricted_access(self) -> None:
        """AC-03: Tài khoản super_admin có quyền xem toàn bộ dữ liệu của tất cả các quận."""
        app.dependency_overrides[get_current_user] = lambda: self.super_admin
        app.dependency_overrides[get_admin_user] = lambda: self.super_admin
        client = TestClient(app)

        # 1. Xem toàn bộ danh sách báo cáo thành phố (5 phản ánh)
        resp_reports = client.get("/api/admin/reports")
        self.assertEqual(resp_reports.status_code, 200)
        self.assertEqual(resp_reports.json()["total"], 5)

        # 2. Lọc tùy ý theo Quận 3 -> 200 OK (2 phản ánh)
        resp_q3 = client.get("/api/admin/reports?district=Quận 3")
        self.assertEqual(resp_q3.status_code, 200)
        self.assertEqual(resp_q3.json()["total"], 2)

        # 3. Xem chi tiết phản ánh thuộc Quận 3 -> 200 OK
        resp_detail_q3 = client.get(f"/api/admin/reports/{self.q3_rep1_id}")
        self.assertEqual(resp_detail_q3.status_code, 200)
        self.assertEqual(resp_detail_q3.json()["district"], "Quận 3")

        # 4. Xem chi tiết phản ánh thuộc Quận 1 -> 200 OK
        resp_detail_q1 = client.get(f"/api/admin/reports/{self.q1_rep1_id}")
        self.assertEqual(resp_detail_q1.status_code, 200)
        self.assertEqual(resp_detail_q1.json()["district"], "Quận 1")

        # 5. Dashboard tổng thể thành phố -> 5 phản ánh
        resp_dash = client.get("/api/admin/dashboard")
        self.assertEqual(resp_dash.status_code, 200)
        self.assertEqual(resp_dash.json()["total_reports"], 5)

        # 6. Cây phân cấp hành chính chứa đủ các quận
        resp_tree = client.get("/api/gis/administrative-hierarchy")
        self.assertEqual(resp_tree.status_code, 200)
        districts = {
            d["name"]
            for p in resp_tree.json()["provinces"]
            for d in p["districts"]
        }
        self.assertIn("Quận 1", districts)
        self.assertIn("Quận 3", districts)
        self.assertIn("Quận 7", districts)


if __name__ == "__main__":
    unittest.main()
