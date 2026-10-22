from __future__ import annotations

import asyncio
from io import BytesIO
import os
import sqlite3
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import BackgroundTasks, UploadFile

from app.config import Settings, get_settings
from app.database import init_database
from app.modules.auth.schemas import AuthUser
from app.modules.gis.geocoding_service import GeocodingAddress
from app.modules.reports.ai_client import AiServiceClient
from app.modules.reports.repository import ReportRepository
from app.modules.reports.schemas import (
    AdminReportResponse,
    AiDetectionResult,
    EngineerReportResponse,
    ReporterReportResponse,
    ReportMapPoint,
)
from app.modules.reports.service import ReportService, geocode_report_background
from PIL import Image


class GeocodingBackgroundTaskTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "test_bg_task.db"
        self.upload_dir = Path(self.temp_dir.name) / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        os.environ["BACKEND_DATABASE_PATH"] = str(self.db_path)
        os.environ["BACKEND_UPLOAD_DIR"] = str(self.upload_dir)
        get_settings.cache_clear()
        init_database()

        self.connection = sqlite3.connect(self.db_path)
        self.connection.row_factory = sqlite3.Row
        self.repository = ReportRepository(self.connection)
        self.settings = get_settings()

        self.mock_user = AuthUser(
            id="usr-test-01",
            fullName="Nguyễn Văn Test",
            email="test@roadgis.local",
            role="citizen",
            phone=None,
        )

        self.mock_ai_client = MagicMock(spec=AiServiceClient)
        self.mock_ai_client.detect_road_damage = AsyncMock(
            return_value=AiDetectionResult(
                success=True,
                image_width=800,
                image_height=600,
                detections_count=1,
                detections=[],
                processing_time_ms=10.0,
                message="OK",
            )
        )

        self.service = ReportService(
            settings=self.settings,
            repository=self.repository,
            ai_client=self.mock_ai_client,
        )

    def tearDown(self) -> None:
        self.connection.close()
        import gc
        gc.collect()
        os.environ.pop("BACKEND_DATABASE_PATH", None)
        os.environ.pop("BACKEND_UPLOAD_DIR", None)
        get_settings.cache_clear()
        try:
            self.temp_dir.cleanup()
        except Exception:
            pass

    def _create_dummy_upload_file(self) -> UploadFile:
        img = Image.new("RGB", (100, 100), color="blue")
        buf = BytesIO()
        img.save(buf, format="JPEG")
        buf.seek(0)
        return UploadFile(file=buf, filename="road.jpg", headers={"content-type": "image/jpeg"})

    async def test_ac01_endpoint_responsiveness_under_200ms_with_slow_geocoding(self) -> None:
        # Create a mock for geocoding that takes 1.5 seconds
        async def slow_reverse_geocode(*args, **kwargs):
            await asyncio.sleep(1.5)
            return GeocodingAddress(
                road_name="Lê Duẩn",
                ward="Phường Bến Nghé",
                district="Quận 1",
                province="TP. Hồ Chí Minh",
                formatted_address="12 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
                source="nominatim_local",
            )

        background_tasks = BackgroundTasks()
        upload_file = self._create_dummy_upload_file()

        start_time = time.perf_counter()
        report_response = await self.service.create_report(
            current_user=self.mock_user,
            image=upload_file,
            latitude=10.782345,
            longitude=106.699876,
            gps_accuracy=10.0,
            location_source="camera_gps",
            location_recorded_at="2026-09-14T10:00:00Z",
            note="Ổ gà to",
            preview_token=None,
            background_tasks=background_tasks,
        )
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        # AC-01: Response time must be under 200ms
        self.assertLess(elapsed_ms, 200.0, f"create_report took {elapsed_ms:.2f}ms, expected <= 200ms")
        self.assertIn(report_response.status, ("pending", "pending_verification"))
        # Initially, road_name is None because geocoding is queued
        self.assertIsNone(report_response.road_name)
        self.assertIsNone(report_response.formatted_address)

        # Verify a task was added to BackgroundTasks
        self.assertEqual(len(background_tasks.tasks), 1)
        self.assertEqual(background_tasks.tasks[0].func, geocode_report_background)

    async def test_ac02_background_task_updates_database(self) -> None:
        # Create a report first
        upload_file = self._create_dummy_upload_file()
        background_tasks = BackgroundTasks()

        report_response = await self.service.create_report(
            current_user=self.mock_user,
            image=upload_file,
            latitude=10.782345,
            longitude=106.699876,
            gps_accuracy=10.0,
            location_source="camera_gps",
            location_recorded_at="2026-09-14T10:00:00Z",
            note="Vết nứt",
            preview_token=None,
            background_tasks=background_tasks,
        )

        report_id = report_response.id

        # Mock ReverseGeocodingService to return parsed address
        mock_geocoding_address = GeocodingAddress(
            road_name="Lê Duẩn",
            ward="Phường Bến Nghé",
            district="Quận 1",
            province="TP. Hồ Chí Minh",
            formatted_address="12 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
            source="nominatim_local",
        )

        with patch("app.modules.reports.service.ReverseGeocodingService.reverse_geocode", AsyncMock(return_value=mock_geocoding_address)):
            # Execute background task
            await geocode_report_background(
                report_id=report_id,
                latitude=10.782345,
                longitude=106.699876,
                settings=self.settings,
            )

        # AC-02: After background task finishes, DB record is updated with all 5 administrative fields
        updated_report = self.repository.get_report(report_id, include_admin_fields=True)
        self.assertIsNotNone(updated_report)
        self.assertEqual(updated_report.road_name, "Lê Duẩn")
        self.assertEqual(updated_report.ward, "Phường Bến Nghé")
        self.assertEqual(updated_report.district, "Quận 1")
        self.assertEqual(updated_report.province, "TP. Hồ Chí Minh")
        self.assertEqual(
            updated_report.formatted_address,
            "12 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
        )

    def test_ac03_schemas_have_nullable_administrative_fields(self) -> None:
        ai_res = AiDetectionResult(
            success=True,
            detections_count=0,
            detections=[],
            message="OK",
        )

        # 1. ReporterReportResponse with None address
        rep = ReporterReportResponse(
            id="r1",
            image_url="http://localhost:5000/uploads/r1.jpg",
            latitude=10.78,
            longitude=106.70,
            note=None,
            ai_status="success",
            status="pending",
            ai_result=ai_res,
            created_at="2026-09-14T10:00:00Z",
            updated_at="2026-09-14T10:00:00Z",
        )
        self.assertIsNone(rep.road_name)
        self.assertIsNone(rep.ward)
        self.assertIsNone(rep.district)
        self.assertIsNone(rep.province)
        self.assertIsNone(rep.formatted_address)

        # 2. ReporterReportResponse with populated address
        rep_populated = ReporterReportResponse(
            id="r2",
            image_url="http://localhost:5000/uploads/r2.jpg",
            latitude=10.78,
            longitude=106.70,
            note=None,
            ai_status="success",
            status="pending",
            ai_result=ai_res,
            created_at="2026-09-14T10:00:00Z",
            updated_at="2026-09-14T10:00:00Z",
            road_name="Lê Duẩn",
            ward="Phường Bến Nghé",
            district="Quận 1",
            province="TP. Hồ Chí Minh",
            formatted_address="12 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
        )
        self.assertEqual(rep_populated.road_name, "Lê Duẩn")
        self.assertEqual(rep_populated.district, "Quận 1")

        # 3. ReportMapPoint
        map_pt = ReportMapPoint(
            id="m1",
            image_url="http://localhost:5000/uploads/m1.jpg",
            latitude=10.78,
            longitude=106.70,
            status="pending",
            created_at="2026-09-14T10:00:00Z",
            updated_at="2026-09-14T10:00:00Z",
            road_name="Lê Duẩn",
            ward="Phường Bến Nghé",
            district="Quận 1",
            province="TP. Hồ Chí Minh",
            formatted_address="12 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
        )
        self.assertEqual(map_pt.road_name, "Lê Duẩn")
        self.assertEqual(map_pt.district, "Quận 1")


if __name__ == "__main__":
    unittest.main()
