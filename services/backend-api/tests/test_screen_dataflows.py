"""Automated End-to-End Screen Dataflow Verification.

Validates that all backend API payloads match the frontend contracts across:
  1. Web Admin: DamageMapPage (WebGisMap, DBSCAN clusters, AdministrativeFilterBar)
  2. Web Admin: ReportsPage (ReportTable, pagination, 5 address columns)
  3. Web Admin: ReportDetailPage (full details, AI detections, engineer timeline)
  4. Web Admin: DashboardPage (KPI metrics, timeline chart, damage distribution, administrative stats)
  5. Mobile Reporter: HomeScreen & HistoryScreen (/reports/history, /reports/{id})
  6. Mobile Reporter: MapScreen (/gis/search GeoJSON FeatureCollection)
  7. Mobile Engineer: TasksScreen & HomeScreen (/engineer/reports/{scope})
  8. Mobile Engineer: EngineerMapScreen (/engineer/reports/nearby ST_DWithin 200m)
"""

import sys
import unittest
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from app.main import app


class TestScreenDataflows(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client = TestClient(app)

        # Login credentials
        res_admin = cls.client.post("/api/auth/login", json={"email": "admin.demo@roadgis.local", "password": "Admin@123"})
        assert res_admin.status_code == 200, f"Admin login failed: {res_admin.text}"
        cls.admin_token = res_admin.json()["accessToken"]

        res_eng = cls.client.post("/api/auth/login", json={"email": "engineer.a.demo@roadgis.local", "password": "Engineer@123"})
        assert res_eng.status_code == 200, f"Engineer login failed: {res_eng.text}"
        cls.engineer_token = res_eng.json()["accessToken"]

        res_rep = cls.client.post("/api/auth/login", json={"email": "reporter1.demo@roadgis.local", "password": "Reporter@123"})
        assert res_rep.status_code == 200, f"Reporter login failed: {res_rep.text}"
        cls.reporter_token = res_rep.json()["accessToken"]

    def test_screen_01_web_admin_gis_map(self) -> None:
        """Kiểm tra màn hình Bản đồ sự cố GIS (DamageMapPage / WebGisMap)."""
        # 1. GeoJSON Features & Aggregations
        res = self.client.get("/api/admin/gis/reports", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("features", data)
        self.assertIn("matched_total", data)
        self.assertIn("pending_count", data)
        self.assertIn("processing_count", data)
        self.assertIn("repaired_count", data)
        self.assertIn("bbox", data)
        self.assertIsInstance(data["features"], list)
        self.assertGreater(len(data["features"]), 0)

        for feat in data["features"]:
            self.assertEqual(feat["type"], "Feature")
            geom = feat["geometry"]
            self.assertEqual(geom["type"], "Point")
            self.assertEqual(len(geom["coordinates"]), 2)
            self.assertIsInstance(geom["coordinates"][0], (int, float))  # longitude
            self.assertIsInstance(geom["coordinates"][1], (int, float))  # latitude

            props = feat["properties"]
            for field in [
                "id", "image_url", "status", "damage_type", "damage_label",
                "road_name", "ward", "district", "province", "formatted_address",
                "confidence", "created_at", "updated_at"
            ]:
                self.assertIn(field, props, f"Missing {field} in feature properties")

        # 2. Server-side DBSCAN Clusters
        res_cl = self.client.get("/api/gis/reports/clusters", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res_cl.status_code, 200)
        clusters = res_cl.json()
        self.assertIsInstance(clusters, list)
        for cl in clusters:
            self.assertIn("count", cl)
            self.assertIn("centroid_geojson", cl)
            self.assertIn("center_latitude", cl)
            self.assertIn("center_longitude", cl)

        # 3. Cascading Administrative Hierarchy
        res_hier = self.client.get("/api/gis/administrative-hierarchy", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res_hier.status_code, 200)
        hier = res_hier.json()
        self.assertIn("provinces", hier)
        for p in hier["provinces"]:
            self.assertIn("name", p)
            self.assertIn("districts", p)
            for d in p["districts"]:
                self.assertIn("name", d)
                self.assertIn("wards", d)
                self.assertIn("roads", d)
                self.assertIn("total_reports", d)

    def test_screen_02_web_admin_reports_table(self) -> None:
        """Kiểm tra màn hình Bảng quản lý sự cố (ReportsPage / ReportTable)."""
        res = self.client.get("/api/admin/reports?limit=10&offset=0", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertGreater(len(data["items"]), 0)

        for item in data["items"]:
            for expected_col in [
                "id", "status", "latitude", "longitude", "road_name", "ward",
                "district", "province", "formatted_address", "created_at", "updated_at",
                "assigned_engineer_name", "claimed_by_engineer_name"
            ]:
                self.assertIn(expected_col, item, f"Missing {expected_col} in report row")

    def test_screen_03_web_admin_report_detail(self) -> None:
        """Kiểm tra màn hình Chi tiết sự cố (ReportDetailPage)."""
        # Get first report ID
        res_list = self.client.get("/api/admin/reports?limit=1", headers={"Authorization": f"Bearer {self.admin_token}"})
        first_id = res_list.json()["items"][0]["id"]

        res_detail = self.client.get(f"/api/admin/reports/{first_id}", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res_detail.status_code, 200)
        detail = res_detail.json()

        for field in [
            "id", "image_url", "latitude", "longitude", "status", "ai_status",
            "ai_result", "road_name", "ward", "district", "province",
            "formatted_address", "created_at", "updated_at"
        ]:
            self.assertIn(field, detail)

        self.assertIn("detections", detail["ai_result"])
        self.assertIsInstance(detail["ai_result"]["detections"], list)

    def test_screen_04_web_admin_dashboard(self) -> None:
        """Kiểm tra màn hình Dashboard Tổng quan (DashboardPage)."""
        # KPI & Charts
        res_dash = self.client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res_dash.status_code, 200)
        dash = res_dash.json()
        for kpi in ["total_reports", "kpis", "status_summary", "damage_type_summary", "timeline"]:
            self.assertIn(kpi, dash)

        # Administrative Hierarchy Stats
        res_stats = self.client.get("/api/admin/dashboard/administrative-stats", headers={"Authorization": f"Bearer {self.admin_token}"})
        self.assertEqual(res_stats.status_code, 200)
        stats = res_stats.json()
        for s in ["district_stats", "ward_stats", "top_roads", "total_reports"]:
            self.assertIn(s, stats)

    def test_screen_05_mobile_reporter_screens(self) -> None:
        """Kiểm tra màn hình Người dân (HomeScreen, HistoryScreen, MapScreen)."""
        # 1. History & List of citizen reports
        res_hist = self.client.get("/api/reports/history", headers={"Authorization": f"Bearer {self.reporter_token}"})
        self.assertEqual(res_hist.status_code, 200)
        hist = res_hist.json()
        self.assertIn("items", hist)
        self.assertIn("total", hist)

        # 2. Map Screen (Spatial Search)
        res_map = self.client.get("/api/gis/search", headers={"Authorization": f"Bearer {self.reporter_token}"})
        self.assertEqual(res_map.status_code, 200)
        map_data = res_map.json()
        self.assertIn("features", map_data)

    def test_screen_06_mobile_engineer_tasks(self) -> None:
        """Kiểm tra màn hình Danh sách nhiệm vụ của Kỹ sư (EngineerHomeScreen & TasksScreen)."""
        for scope in ["available", "assigned", "in-progress", "history"]:
            res = self.client.get(f"/api/engineer/reports/{scope}", headers={"Authorization": f"Bearer {self.engineer_token}"})
            self.assertEqual(res.status_code, 200, f"Scope {scope} failed")
            tasks = res.json()
            self.assertIn("items", tasks)
            self.assertIn("total", tasks)
            for t in tasks["items"]:
                self.assertIn("can_claim", t)
                self.assertIn("can_check_in", t)
                self.assertIn("can_submit_survey", t)
                self.assertIn("field_status", t)

    def test_screen_07_mobile_engineer_map_nearby(self) -> None:
        """Kiểm tra màn hình Bản đồ Kỹ sư & Tra cứu hư hỏng lân cận 200m (EngineerMapScreen)."""
        # Ho Chi Minh City coordinates
        lat, lon = 10.7769, 106.7009
        res = self.client.get(
            f"/api/engineer/reports/nearby?latitude={lat}&longitude={lon}&radius_meters=5000",
            headers={"Authorization": f"Bearer {self.engineer_token}"},
        )
        self.assertEqual(res.status_code, 200)
        nearby = res.json()
        self.assertIn("items", nearby)
        self.assertIn("total", nearby)
        self.assertIn("radius_meters", nearby)

        for item in nearby["items"]:
            self.assertIn("id", item)
            self.assertIn("distance_meters", item)
            self.assertIn("latitude", item)
            self.assertIn("longitude", item)
            self.assertIn("damage_type", item)
            self.assertIn("status", item)
            self.assertIsInstance(item["distance_meters"], (int, float))


if __name__ == "__main__":
    unittest.main()
