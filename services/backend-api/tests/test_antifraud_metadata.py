from __future__ import annotations

import json
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
from app.modules.auth.dependencies import get_admin_user, get_engineer_user
from app.modules.auth.schemas import AuthUser


class AntiFraudMetadataTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "test_antifraud.db"
        self.upload_dir = Path(self.temp_dir.name) / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        os.environ["BACKEND_DATABASE_PATH"] = str(self.db_path)
        os.environ["BACKEND_UPLOAD_DIR"] = str(self.upload_dir)
        get_settings.cache_clear()
        init_database()

        self.connection = sqlite3.connect(self.db_path)
        self.connection.row_factory = sqlite3.Row

        self.engineer_user = AuthUser(
            id="usr-engineer-1",
            fullName="Kỹ sư Hiện trường Nguyễn Văn A",
            email="engineer.a@roadgis.local",
            role="field_engineer",
            phone="0912345678",
        )

        self.admin_user = AuthUser(
            id="usr-admin-1",
            fullName="Quản trị viên Hệ thống",
            email="admin@roadgis.local",
            role="admin",
            phone="0909999999",
        )

        # Seed test user and report
        self.connection.execute(
            """
            INSERT INTO users (id, full_name, email, phone, role, password_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'hash', '2026-09-16T00:00:00Z', '2026-09-16T00:00:00Z')
            """,
            (self.engineer_user.id, self.engineer_user.fullName, self.engineer_user.email, self.engineer_user.phone, self.engineer_user.role),
        )

        self.report_id = f"rep-{uuid4().hex[:8]}"
        self.report_lat = 10.772500
        self.report_lon = 106.698000

        self.connection.execute(
            """
            INSERT INTO reports (
                id, image_path, latitude, longitude, gps_accuracy, location_source,
                ai_status, status, detections_json, claimed_by_engineer_id, claim_status,
                field_status, created_at, updated_at
            )
            VALUES (?, 'uploads/test.jpg', ?, ?, 5.0, 'camera_live', 'processed', 'processing',
                    '{"success": true, "detections_count": 0, "detections": [], "message": "OK"}', ?, 'active', 'in_progress', '2026-09-16T00:00:00Z', '2026-09-16T00:00:00Z')
            """,
            (self.report_id, self.report_lat, self.report_lon, self.engineer_user.id),
        )
        self.connection.commit()

        app.dependency_overrides[get_engineer_user] = lambda: self.engineer_user
        app.dependency_overrides[get_admin_user] = lambda: self.admin_user
        self.client = TestClient(app)

    def tearDown(self) -> None:
        app.dependency_overrides.clear()
        self.connection.close()
        self.temp_dir.cleanup()

    def test_checkin_rejects_mock_location(self) -> None:
        """AC-04.1: API từ chối nếu is_mocked: true và ghi nhận audit log."""
        response = self.client.post(
            f"/api/engineer/reports/{self.report_id}/check-in",
            json={
                "latitude": self.report_lat,
                "longitude": self.report_lon,
                "gps_accuracy": 5.0,
                "source": "mock_gps",
                "is_mocked": True,
                "distance_meters": 0.0,
            },
        )
        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn("giả lập", payload.get("message", ""))

        # Verify audit log in report_engineer_actions
        action = self.connection.execute(
            """
            SELECT * FROM report_engineer_actions
            WHERE report_id = ? AND action_type = 'check_in_rejected'
            """,
            (self.report_id,),
        ).fetchone()
        self.assertIsNotNone(action)
        action_payload = json.loads(action["action_payload_json"])
        self.assertEqual(action_payload["rejection_reason"], "mock_location_detected")
        self.assertTrue(action_payload["is_mocked"])

    def test_checkin_tasks_alias_rejects_mock_location(self) -> None:
        """AC-04.1: Endpoint alias /api/engineer/tasks/{id}/check-in từ chối nếu is_mocked: true."""
        response = self.client.post(
            f"/api/engineer/tasks/{self.report_id}/check-in",
            json={
                "latitude": self.report_lat,
                "longitude": self.report_lon,
                "gps_accuracy": 5.0,
                "is_mocked": True,
            },
        )
        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn("giả lập", payload.get("message", ""))

    def test_checkin_rejects_distance_over_30m(self) -> None:
        """Server-side re-validation: Từ chối nếu cự ly tính lại trên Server > 30m."""
        # 10.7735 is ~111m away from 10.7725
        far_latitude = 10.773500
        response = self.client.post(
            f"/api/engineer/reports/{self.report_id}/check-in",
            json={
                "latitude": far_latitude,
                "longitude": self.report_lon,
                "gps_accuracy": 5.0,
                "is_mocked": False,
                "distance_meters": 111.0,
            },
        )
        self.assertEqual(response.status_code, 400)
        payload = response.json()
        self.assertIn("vượt quá bán kính", payload.get("message", ""))

        # Verify audit log in report_engineer_actions
        action = self.connection.execute(
            """
            SELECT * FROM report_engineer_actions
            WHERE report_id = ? AND action_type = 'check_in_rejected'
            ORDER BY created_at DESC LIMIT 1
            """,
            (self.report_id,),
        ).fetchone()
        self.assertIsNotNone(action)
        action_payload = json.loads(action["action_payload_json"])
        self.assertEqual(action_payload["rejection_reason"], "distance_exceeded")
        self.assertGreater(action_payload["server_distance_meters"], 30.0)

    def test_checkin_accepts_valid_distance_and_records_metadata(self) -> None:
        """AC-04.2: Check-in hợp lệ lưu đầy đủ lịch sử khoảng cách check-in cho Web Admin."""
        # ~11m away from 10.772500
        valid_latitude = 10.772600
        response = self.client.post(
            f"/api/engineer/reports/{self.report_id}/check-in",
            json={
                "latitude": valid_latitude,
                "longitude": self.report_lon,
                "gps_accuracy": 10.0,
                "source": "gps_live",
                "is_mocked": False,
                "distance_meters": 11.1,
            },
        )
        self.assertEqual(response.status_code, 200)
        report_data = response.json()
        self.assertIsNotNone(report_data["field_checked_in_distance_meters"])
        self.assertLessEqual(report_data["field_checked_in_distance_meters"], 30.0)
        self.assertEqual(report_data["field_checkin_quality"], "valid")

        # Verify DB values
        row = self.connection.execute(
            "SELECT field_checked_in_distance_meters, field_checked_in_at FROM reports WHERE id = ?",
            (self.report_id,),
        ).fetchone()
        self.assertIsNotNone(row["field_checked_in_at"])
        self.assertIsNotNone(row["field_checked_in_distance_meters"])

        # Check Admin timeline endpoint returns the action with metadata
        timeline_res = self.client.get(f"/api/admin/reports/{self.report_id}/engineer-timeline")
        self.assertEqual(timeline_res.status_code, 200)
        timeline_items = timeline_res.json()["items"]
        checkin_action = next(item for item in timeline_items if item["action_type"] == "check_in")
        self.assertIsNotNone(checkin_action["action_payload_json"])
        self.assertIn("distance_meters", checkin_action["action_payload_json"])
        self.assertIn("client_distance_meters", checkin_action["action_payload_json"])
        self.assertFalse(checkin_action["action_payload_json"]["is_mocked"])
