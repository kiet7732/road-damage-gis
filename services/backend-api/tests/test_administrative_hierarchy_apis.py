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


class AdministrativeHierarchyApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "test_hierarchy.db"
        self.upload_dir = Path(self.temp_dir.name) / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        os.environ["BACKEND_DATABASE_PATH"] = str(self.db_path)
        os.environ["BACKEND_UPLOAD_DIR"] = str(self.upload_dir)
        get_settings.cache_clear()
        init_database()

        self.connection = sqlite3.connect(self.db_path)
        self.connection.row_factory = sqlite3.Row

        self.mock_citizen = AuthUser(
            id="usr-citizen-01",
            fullName="Nguyễn Văn Dân",
            email="citizen@gis.local",
            role="citizen",
            phone=None,
        )
        self.mock_admin = AuthUser(
            id="usr-admin-01",
            fullName="Trần Cán Bộ",
            email="admin@gis.local",
            role="admin",
            phone=None,
        )

        app.dependency_overrides[get_current_user] = lambda: self.mock_citizen
        app.dependency_overrides[get_admin_user] = lambda: self.mock_admin
        self.client = TestClient(app)

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
        province: str | None = "Thành phố Hồ Chí Minh",
        district: str | None = "Quận 1",
        ward: str | None = "Phường Bến Nghé",
        road_name: str | None = "Đường Lê Duẩn",
        formatted_address: str | None = "12 Lê Duẩn, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh",
        status: str = "pending",
        damage_type: str = "D40",
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
                self.mock_citizen.id,
                "uploads/test.jpg",
                latitude,
                longitude,
                5.0,
                "gps",
                "2026-09-14T10:00:00Z",
                "Test note",
                "success",
                status,
                "OK",
                (
                    f'{{"success": true, "image_width": 800, "image_height": 600, "detections_count": 1, '
                    f'"detections": [{{"damage_type": "{damage_type}", "confidence": 0.85, '
                    f'"bbox": {{"x1": 0.1, "y1": 0.1, "x2": 0.5, "y2": 0.5}}}}], '
                    f'"processing_time_ms": 10.0, "message": "OK"}}'
                ),
                road_name,
                ward,
                district,
                province,
                formatted_address,
                "2026-09-14T10:00:00Z",
                "2026-09-14T10:00:00Z",
            ),
        )
        self.connection.commit()
        return rep_id

    def test_ac01_empty_hierarchy(self) -> None:
        response = self.client.get("/api/gis/administrative-hierarchy")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("provinces", data)
        self.assertEqual(data["provinces"], [])

    def test_ac01_dynamic_hierarchy_structure_and_counts(self) -> None:
        # District 1: 3 reports (2 in Bến Nghé on different roads, 1 in Đa Kao)
        self._insert_report(
            district="Quận 1",
            ward="Phường Bến Nghé",
            road_name="Đường Lê Duẩn",
        )
        self._insert_report(
            district="Quận 1",
            ward="Phường Bến Nghé",
            road_name="Đường Pasteur",
        )
        self._insert_report(
            district="Quận 1",
            ward="Phường Đa Kao",
            road_name="Đường Điện Biên Phủ",
        )

        # District Bình Thạnh: 2 reports
        self._insert_report(
            district="Quận Bình Thạnh",
            ward="Phường 25",
            road_name="Đường Điện Biên Phủ",
        )
        self._insert_report(
            district="Quận Bình Thạnh",
            ward="Phường 25",
            road_name="Đường D2",
        )

        response = self.client.get("/api/gis/administrative-hierarchy")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(len(data["provinces"]), 1)
        hcm = data["provinces"][0]
        self.assertEqual(hcm["name"], "Thành phố Hồ Chí Minh")
        self.assertEqual(len(hcm["districts"]), 2)

        # Quận 1
        q1 = next(d for d in hcm["districts"] if d["name"] == "Quận 1")
        self.assertEqual(q1["total_reports"], 3)
        self.assertEqual(sorted(q1["wards"]), ["Phường Bến Nghé", "Phường Đa Kao"])
        self.assertEqual(
            sorted(q1["roads"]),
            ["Đường Lê Duẩn", "Đường Pasteur", "Đường Điện Biên Phủ"],
        )

        # Quận Bình Thạnh
        bt = next(d for d in hcm["districts"] if d["name"] == "Quận Bình Thạnh")
        self.assertEqual(bt["total_reports"], 2)
        self.assertEqual(bt["wards"], ["Phường 25"])
        self.assertEqual(sorted(bt["roads"]), ["Đường D2", "Đường Điện Biên Phủ"])

    def test_ac02_admin_reports_filtering_by_district_ward_road(self) -> None:
        self._insert_report(
            district="Quận 1",
            ward="Phường Bến Nghé",
            road_name="Đường Lê Duẩn",
        )
        self._insert_report(
            district="Quận 1",
            ward="Phường Bến Nghé",
            road_name="Đường Pasteur",
        )
        self._insert_report(
            district="Quận Bình Thạnh",
            ward="Phường 25",
            road_name="Đường Điện Biên Phủ",
        )

        # Filter by district only
        res_q1 = self.client.get("/api/admin/reports?district=Quận 1")
        self.assertEqual(res_q1.status_code, 200)
        data_q1 = res_q1.json()
        self.assertEqual(data_q1["total"], 2)
        self.assertTrue(all(item["district"] == "Quận 1" for item in data_q1["items"]))

        # Filter by district + ward
        res_ward = self.client.get(
            "/api/admin/reports?district=Quận 1&ward=Phường Bến Nghé"
        )
        self.assertEqual(res_ward.status_code, 200)
        self.assertEqual(res_ward.json()["total"], 2)

        # Filter by district + road
        res_road = self.client.get(
            "/api/admin/reports?district=Quận 1&road_name=Đường Lê Duẩn"
        )
        self.assertEqual(res_road.status_code, 200)
        self.assertEqual(res_road.json()["total"], 1)
        self.assertEqual(res_road.json()["items"][0]["road_name"], "Đường Lê Duẩn")

        # Filter other district
        res_bt = self.client.get("/api/admin/reports?district=Quận Bình Thạnh")
        self.assertEqual(res_bt.status_code, 200)
        self.assertEqual(res_bt.json()["total"], 1)
        self.assertEqual(res_bt.json()["items"][0]["ward"], "Phường 25")

    def test_ac03_gis_points_filtered_by_administrative_boundary(self) -> None:
        self._insert_report(
            district="Quận 1",
            ward="Phường Bến Nghé",
            road_name="Đường Lê Duẩn",
            status="pending",
            damage_type="D40",
            latitude=10.781,
            longitude=106.691,
        )
        self._insert_report(
            district="Quận 1",
            ward="Phường Đa Kao",
            road_name="Đường Điện Biên Phủ",
            status="processing",
            damage_type="D00",
            latitude=10.785,
            longitude=106.695,
        )
        self._insert_report(
            district="Quận 3",
            ward="Phường Võ Thị Sáu",
            road_name="Đường Nam Kỳ Khởi Nghĩa",
            status="repaired",
            damage_type="D10",
            latitude=10.788,
            longitude=106.688,
        )

        # Query all points
        res_all = self.client.get("/api/gis/points")
        self.assertEqual(res_all.status_code, 200)
        self.assertEqual(res_all.json()["total"], 3)

        # Query points for Quận 1
        res_q1 = self.client.get("/api/gis/points?district=Quận 1")
        self.assertEqual(res_q1.status_code, 200)
        data_q1 = res_q1.json()
        self.assertEqual(data_q1["total"], 2)
        self.assertTrue(all(item["district"] == "Quận 1" for item in data_q1["items"]))

        # Verify address fields are populated on MapPoint
        first = data_q1["items"][0]
        self.assertIn("road_name", first)
        self.assertIn("ward", first)
        self.assertIn("district", first)
        self.assertIn("province", first)
        self.assertIn("formatted_address", first)

        # Query points with ward + status filter
        res_filter = self.client.get(
            "/api/gis/points?district=Quận 1&ward=Phường Đa Kao&status=processing"
        )
        self.assertEqual(res_filter.status_code, 200)
        self.assertEqual(res_filter.json()["total"], 1)
        self.assertEqual(res_filter.json()["items"][0]["damage_type"], "D00")

    def test_gis_geojson_search_with_administrative_filters(self) -> None:
        self._insert_report(
            district="Quận 1",
            ward="Phường Bến Nghé",
            road_name="Đường Lê Duẩn",
            status="pending",
        )
        self._insert_report(
            district="Quận 7",
            ward="Phường Tân Phong",
            road_name="Đường Nguyễn Văn Linh",
            status="pending",
        )

        # Mobile GIS search with district
        res = self.client.get("/api/gis/search?district=Quận 1")
        self.assertEqual(res.status_code, 200)
        geojson = res.json()
        self.assertEqual(geojson["type"], "FeatureCollection")
        self.assertEqual(len(geojson["features"]), 1)
        props = geojson["features"][0]["properties"]
        self.assertEqual(props["district"], "Quận 1")
        self.assertEqual(props["ward"], "Phường Bến Nghé")
        self.assertEqual(props["road_name"], "Đường Lê Duẩn")


if __name__ == "__main__":
    unittest.main()
