from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import get_connection, init_database
from app.main import app
from app.modules.auth.security import hash_password


class ChangePasswordWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "test_change_password.db"
        self.upload_dir = Path(self.temp_dir.name) / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        os.environ["BACKEND_DATABASE_PATH"] = str(self.db_path)
        os.environ["BACKEND_UPLOAD_DIR"] = str(self.upload_dir)
        get_settings.cache_clear()
        init_database()

        self.client = TestClient(app)

        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                """,
                (
                    "usr-admin-1",
                    "admin.cp@roadgis.local",
                    hash_password("Admin@Old123"),
                    "Cán bộ Quản trị",
                    "admin",
                ),
            )
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                """,
                (
                    "usr-reporter-1",
                    "reporter.cp@roadgis.local",
                    hash_password("Citizen@Old123"),
                    "Người dân Phản ánh",
                    "reporter",
                ),
            )
            conn.commit()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def _login(self, email: str, password: str, context: str = "web-admin") -> str:
        res = self.client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
            headers={"X-Auth-Context": context},
        )
        self.assertEqual(res.status_code, 200, f"Login failed for {email}: {res.text}")
        data = res.json()
        return data["accessToken"]

    def test_unauthenticated_change_password_rejected(self) -> None:
        res = self.client.post(
            "/api/auth/change-password",
            json={"currentPassword": "AnyPassword", "newPassword": "NewPassword123"},
        )
        self.assertEqual(res.status_code, 401)

    def test_wrong_current_password_rejected(self) -> None:
        token = self._login("admin.cp@roadgis.local", "Admin@Old123", context="web-admin")
        res = self.client.post(
            "/api/auth/change-password",
            json={"currentPassword": "WrongCurrentPassword", "newPassword": "NewPassword@123"},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(res.status_code, 400)
        response_text = res.text
        self.assertIn("Mật khẩu hiện tại không chính xác", response_text)

    def test_new_password_same_as_current_rejected(self) -> None:
        token = self._login("admin.cp@roadgis.local", "Admin@Old123", context="web-admin")
        res = self.client.post(
            "/api/auth/change-password",
            json={"currentPassword": "Admin@Old123", "newPassword": "Admin@Old123"},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(res.status_code, 400)
        response_text = res.text
        self.assertIn("không được trùng", response_text)

    def test_new_password_too_short_rejected(self) -> None:
        token = self._login("admin.cp@roadgis.local", "Admin@Old123", context="web-admin")
        res = self.client.post(
            "/api/auth/change-password",
            json={"currentPassword": "Admin@Old123", "newPassword": "123"},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertIn(res.status_code, [400, 422])

    def test_change_password_success_and_login_with_new_password(self) -> None:
        # 1. Login with current password
        old_token = self._login("admin.cp@roadgis.local", "Admin@Old123", context="web-admin")

        # 2. Change password
        res = self.client.post(
            "/api/auth/change-password",
            json={"currentPassword": "Admin@Old123", "newPassword": "Admin@New456"},
            headers={"Authorization": f"Bearer {old_token}"},
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("thành công", res.text)

        # 3. Old password should fail
        fail_res = self.client.post(
            "/api/auth/login",
            json={"email": "admin.cp@roadgis.local", "password": "Admin@Old123"},
            headers={"X-Auth-Context": "web-admin"},
        )
        self.assertEqual(fail_res.status_code, 401)

        # 4. New password should succeed
        new_token = self._login("admin.cp@roadgis.local", "Admin@New456", context="web-admin")
        self.assertTrue(bool(new_token))

    def test_mobile_reporter_change_password_flow(self) -> None:
        token = self._login("reporter.cp@roadgis.local", "Citizen@Old123", context="mobile-app")

        # Change password using mobile-style payload
        res = self.client.post(
            "/api/auth/change-password",
            json={"current_password": "Citizen@Old123", "new_password": "Citizen@New456"},
            headers={
                "Authorization": f"Bearer {token}",
                "X-Auth-Context": "mobile-app",
            },
        )
        self.assertEqual(res.status_code, 200)

        # Login with new password on mobile context
        new_token = self._login("reporter.cp@roadgis.local", "Citizen@New456", context="mobile-app")
        self.assertTrue(bool(new_token))
