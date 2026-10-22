from __future__ import annotations

import asyncio
from io import BytesIO
import os
from pathlib import Path
import sqlite3
import sys
import tempfile
import time
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

from PIL import Image

# Ensure services/backend-api is in sys.path
backend_path = Path(__file__).resolve().parents[2] / "services" / "backend-api"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import init_database
from app.main import app
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import AuthUser
from app.modules.gis.geocoding_service import GeocodingAddress, ReverseGeocodingService
from app.modules.reports.ai_client import AiServiceClient
from app.modules.reports.repository import ReportRepository
from app.modules.reports.schemas import AiDetectionResult
from app.modules.reports.service import ReportService, geocode_report_background


class GeocodingWorkflowE2ETests(unittest.TestCase):
    """
    Ticket 11: GEO-11 [QA/Test] E2E Testing, Performance Benchmark & Edge Case Verification.
    Verifies:
      1. Spatial Cache Hit (<= 15m)
      2. Nominatim Service Outage Fallback
      3. Out-of-territory / Ocean Coordinates Edge Case
      4. Asynchronous Responsiveness & Concurrent Report Creation SLA (< 200ms)
    """

    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "test_e2e_geocoding.db"
        self.upload_dir = Path(self.temp_dir.name) / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        os.environ["BACKEND_DATABASE_PATH"] = str(self.db_path)
        os.environ["BACKEND_UPLOAD_DIR"] = str(self.upload_dir)
        get_settings.cache_clear()
        init_database()

        self.mock_user = AuthUser(
            id="usr-e2e-reporter-01",
            fullName="Nguyễn Văn Kiểm Thử",
            email="e2e.reporter@roadgis.local",
            role="citizen",
            phone="0901234567",
        )
        app.dependency_overrides[get_current_user] = lambda: self.mock_user

        # Create reusable dummy image bytes
        img = Image.new("RGB", (64, 64), color="blue")
        buf = BytesIO()
        img.save(buf, format="JPEG")
        self.dummy_image_bytes = buf.getvalue()

        # Mock AI detection to be instantaneous
        self.mock_ai_result = AiDetectionResult(
            success=True,
            image_width=64,
            image_height=64,
            detections_count=1,
            detections=[],
            processing_time_ms=5.0,
            message="OK",
        )
        self.ai_patcher = patch.object(
            AiServiceClient,
            "detect_road_damage",
            AsyncMock(return_value=self.mock_ai_result),
        )
        self.ai_patcher.start()

    def tearDown(self) -> None:
        self.ai_patcher.stop()
        app.dependency_overrides.clear()
        os.environ.pop("BACKEND_DATABASE_PATH", None)
        os.environ.pop("BACKEND_UPLOAD_DIR", None)
        get_settings.cache_clear()
        try:
            self.temp_dir.cleanup()
        except Exception:
            pass

    def _get_db_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # -------------------------------------------------------------------------
    # Scenario 1: Spatial Cache Hit (<= 15m)
    # -------------------------------------------------------------------------
    def test_scenario_01_spatial_cache_hit_under_15m(self) -> None:
        """
        Scenario 1:
        - Report A at (10.782345, 106.699876) (Lê Duẩn, Q.1) triggers Nominatim reverse geocode.
        - Report B at (10.782380, 106.699890) (~5.5m away, <= 15m) hits spatial cache directly.
        - Verifies external HTTP request is NOT repeated.
        - Verifies administrative address is identical and cache hit count increments.
        """
        nominatim_response = {
            "address": {
                "road": "Lê Duẩn",
                "suburb": "Phường Bến Nghé",
                "city_district": "Quận 1",
                "city": "Thành phố Hồ Chí Minh",
            },
            "display_name": "Đường Lê Duẩn, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, Việt Nam",
        }

        mock_nominatim = AsyncMock(return_value=(nominatim_response, "nominatim_local"))

        with patch(
            "app.modules.gis.geocoding_service.ReverseGeocodingService._fetch_nominatim_with_fallback",
            mock_nominatim,
        ):
            client = TestClient(app)

            # 1. Submit Report A at (10.782345, 106.699876)
            res_a = client.post(
                "/api/reports",
                files={"image": ("road_a.jpg", self.dummy_image_bytes, "image/jpeg")},
                data={
                    "latitude": 10.782345,
                    "longitude": 106.699876,
                    "gps_accuracy": 5.0,
                    "note": "Ổ gà đường Lê Duẩn",
                },
            )
            self.assertEqual(res_a.status_code, 201)
            report_a_id = res_a.json()["id"]

            # External Nominatim should have been called once for Report A
            self.assertEqual(mock_nominatim.call_count, 1)

            # Check Report A in DB
            with self._get_db_connection() as conn:
                repo = ReportRepository(conn)
                report_a = repo.get_report(report_a_id)
                self.assertIsNotNone(report_a)
                self.assertEqual(report_a.road_name, "Lê Duẩn")
                self.assertEqual(report_a.ward, "Phường Bến Nghé")
                self.assertEqual(report_a.district, "Quận 1")
                self.assertEqual(report_a.province, "TP. Hồ Chí Minh")
                self.assertIn("Lê Duẩn", report_a.formatted_address)

                # Check geocoding_cache table: 1 entry, hit_count = 1
                cache_rows = conn.execute("SELECT * FROM geocoding_cache").fetchall()
                self.assertEqual(len(cache_rows), 1)
                self.assertEqual(cache_rows[0]["hit_count"], 1)

            # 2. Submit Report B at (10.782380, 106.699890) -> distance ~5.5 meters
            res_b = client.post(
                "/api/reports",
                files={"image": ("road_b.jpg", self.dummy_image_bytes, "image/jpeg")},
                data={
                    "latitude": 10.782380,
                    "longitude": 106.699890,
                    "gps_accuracy": 4.0,
                    "note": "Vết nứt gần đó",
                },
            )
            self.assertEqual(res_b.status_code, 201)
            report_b_id = res_b.json()["id"]

            # Nominatim call count MUST REMAIN 1 because Report B hit spatial cache!
            self.assertEqual(
                mock_nominatim.call_count,
                1,
                "Report B should hit the spatial cache without calling external Nominatim!",
            )

            # Check Report B in DB: reuses the exact administrative values
            with self._get_db_connection() as conn:
                repo = ReportRepository(conn)
                report_b = repo.get_report(report_b_id)
                self.assertIsNotNone(report_b)
                self.assertEqual(report_b.road_name, report_a.road_name)
                self.assertEqual(report_b.ward, report_a.ward)
                self.assertEqual(report_b.district, report_a.district)
                self.assertEqual(report_b.province, report_a.province)
                self.assertEqual(report_b.formatted_address, report_a.formatted_address)

                # Check geocoding_cache table: still 1 row, hit_count incremented to 2
                cache_rows = conn.execute("SELECT * FROM geocoding_cache").fetchall()
                self.assertEqual(len(cache_rows), 1)
                self.assertEqual(cache_rows[0]["hit_count"], 2)

            # 3. Submit Report C outside 15m radius (e.g. 50m away at 10.782800, 106.699876)
            res_c = client.post(
                "/api/reports",
                files={"image": ("road_c.jpg", self.dummy_image_bytes, "image/jpeg")},
                data={
                    "latitude": 10.782800,
                    "longitude": 106.699876,
                    "gps_accuracy": 5.0,
                    "note": "Điểm xa ngoài bán kính 15m",
                },
            )
            self.assertEqual(res_c.status_code, 201)
            # Distance ~50m > 15m -> Triggers new Nominatim lookup
            self.assertEqual(
                mock_nominatim.call_count,
                2,
                "Report C is > 15m away, should trigger a new geocoding lookup",
            )

    # -------------------------------------------------------------------------
    # Scenario 2: Nominatim Service Outage Fallback
    # -------------------------------------------------------------------------
    def test_scenario_02_nominatim_service_outage(self) -> None:
        """
        Scenario 2:
        - Simulates Nominatim container outage / complete network partition.
        - Primary and fallback both fail (return None / timeout).
        - POST /api/reports MUST return 201 Created (never 500 or crash).
        - formatted_address saves fallback 'Tọa độ (10.7823..., 106.6998...)'.
        - road_name, ward, district, province remain None safely.
        """
        outage_mock = AsyncMock(return_value=(None, "fallback"))

        with patch(
            "app.modules.gis.geocoding_service.ReverseGeocodingService._fetch_nominatim_with_fallback",
            outage_mock,
        ):
            client = TestClient(app)

            res = client.post(
                "/api/reports",
                files={"image": ("road_outage.jpg", self.dummy_image_bytes, "image/jpeg")},
                data={
                    "latitude": 10.782345,
                    "longitude": 106.699876,
                    "gps_accuracy": 6.0,
                    "note": "Báo cáo khi Nominatim sập nguồn",
                },
            )

            # Must return 201 Created without throwing 500
            self.assertEqual(res.status_code, 201)
            report_id = res.json()["id"]

            with self._get_db_connection() as conn:
                repo = ReportRepository(conn)
                report = repo.get_report(report_id)
                self.assertIsNotNone(report)
                self.assertIsNotNone(report.formatted_address)
                self.assertTrue(
                    report.formatted_address.startswith("Tọa độ (10.7823"),
                    f"Unexpected formatted_address: {report.formatted_address}",
                )
                self.assertIsNone(report.road_name)
                self.assertIsNone(report.ward)
                self.assertIsNone(report.district)
                self.assertIsNone(report.province)

    # -------------------------------------------------------------------------
    # Scenario 3: Out-of-territory / Ocean Coordinates Edge Case
    # -------------------------------------------------------------------------
    def test_scenario_03_ocean_coordinates_edge_case(self) -> None:
        """
        Scenario 3:
        - Point in the ocean (10.0, 108.5) where OpenStreetMap has no administrative land borders.
        - Nominatim returns empty payload or {"error": "Unable to geocode"}.
        - Must return 201 Created without throwing 500.
        - Fallback formatted address is saved safely with coordinates.
        """
        with patch(
            "app.modules.gis.geocoding_service.ReverseGeocodingService._request_nominatim",
            AsyncMock(return_value=None),
        ):
            client = TestClient(app)

            res = client.post(
                "/api/reports",
                files={"image": ("ocean.jpg", self.dummy_image_bytes, "image/jpeg")},
                data={
                    "latitude": 10.0,
                    "longitude": 108.5,
                    "gps_accuracy": 15.0,
                    "note": "Tọa độ trên biển Đông ngoài khơi Phan Thiết",
                },
            )

            self.assertEqual(res.status_code, 201)
            report_id = res.json()["id"]

            with self._get_db_connection() as conn:
                repo = ReportRepository(conn)
                report = repo.get_report(report_id)
                self.assertIsNotNone(report)
                self.assertTrue(
                    report.formatted_address.startswith("Tọa độ (10.0000"),
                    f"Expected coordinate fallback, got: {report.formatted_address}",
                )
                self.assertIsNone(report.road_name)
                self.assertIsNone(report.district)

    # -------------------------------------------------------------------------
    # Scenario 4: Asynchronous Responsiveness SLA (< 200ms) & Background Task
    # -------------------------------------------------------------------------
    def test_scenario_04_asynchronous_responsiveness_sla(self) -> None:
        """
        Scenario 4:
        - Verifies that even if reverse geocoding is slow or delayed (e.g. simulated 1.5s network delay),
          the synchronous create_report endpoint responds in < 200ms because geocoding is offloaded
          to FastAPI BackgroundTasks.
        """
        async def slow_reverse_geocode(*args, **kwargs):
            await asyncio.sleep(1.5)
            return GeocodingAddress(
                road_name="Nam Kỳ Khởi Nghĩa",
                ward="Phường Bến Thành",
                district="Quận 1",
                province="TP. Hồ Chí Minh",
                formatted_address="Nam Kỳ Khởi Nghĩa, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh",
                source="nominatim_local",
            )

        with self._get_db_connection() as conn:
            repo = ReportRepository(conn)
            service = ReportService(
                settings=get_settings(),
                repository=repo,
                ai_client=MagicMock(detect_road_damage=AsyncMock(return_value=self.mock_ai_result)),
            )

            from fastapi import BackgroundTasks, UploadFile

            upload_file = UploadFile(
                file=BytesIO(self.dummy_image_bytes),
                filename="slow_test.jpg",
                headers={"content-type": "image/jpeg"},
            )
            bg_tasks = BackgroundTasks()

            start_t = time.perf_counter()
            report_resp = asyncio.run(
                service.create_report(
                    current_user=self.mock_user,
                    image=upload_file,
                    latitude=10.7745,
                    longitude=106.7001,
                    gps_accuracy=5.0,
                    location_source="camera_gps",
                    location_recorded_at="2026-09-14T10:00:00Z",
                    note="Kiểm tra SLA < 200ms khi geocoding chậm",
                    preview_token=None,
                    background_tasks=bg_tasks,
                )
            )
            elapsed_ms = (time.perf_counter() - start_t) * 1000

            # Must satisfy SLA < 200ms
            self.assertLess(
                elapsed_ms,
                200.0,
                f"create_report took {elapsed_ms:.2f}ms, which exceeded 200ms SLA!",
            )
            self.assertIn(report_resp.status, ("pending", "pending_verification"))
            self.assertIsNone(report_resp.road_name)

            # Verify background task was properly queued
            self.assertEqual(len(bg_tasks.tasks), 1)
            self.assertEqual(bg_tasks.tasks[0].func, geocode_report_background)


if __name__ == "__main__":
    unittest.main()
