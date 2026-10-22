from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import init_database
from app.main import app
from app.modules.auth.security import hash_password


class PlatformRoleIsolationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "test_auth_isolation.db"
        self.upload_dir = Path(self.temp_dir.name) / "uploads"
        self.upload_dir.mkdir(parents=True, exist_ok=True)

        os.environ["BACKEND_DATABASE_PATH"] = str(self.db_path)
        os.environ["BACKEND_UPLOAD_DIR"] = str(self.upload_dir)
        get_settings.cache_clear()
        init_database()

        self.client = TestClient(app)

        # Seed test users
        from app.database import get_connection
        with get_connection() as conn:
            # 1. Admin user
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                """,
                (
                    "usr-admin",
                    "admin.test@roadgis.local",
                    hash_password("Admin@123"),
                    "Quản trị viên Test",
                    "admin",
                ),
            )
            # 2. Reporter user
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                """,
                (
                    "usr-reporter",
                    "reporter.test@roadgis.local",
                    hash_password("Reporter@123"),
                    "Người dân Test",
                    "reporter",
                ),
            )
            # 3. Field Engineer user
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                """,
                (
                    "usr-engineer",
                    "engineer.test@roadgis.local",
                    hash_password("Engineer@123"),
                    "Kỹ sư Test",
                    "field_engineer",
                ),
            )
            conn.commit()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_admin_login_on_web_admin_succeeds(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "admin.test@roadgis.local", "password": "Admin@123"},
            headers={"X-Auth-Context": "web-admin"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["user"]["role"], "admin")
        self.assertIn("accessToken", data)

    def test_reporter_login_on_web_admin_is_rejected(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "reporter.test@roadgis.local", "password": "Reporter@123"},
            headers={"X-Auth-Context": "web-admin"},
        )
        self.assertEqual(response.status_code, 403)
        msg = response.json().get("message") or response.json().get("detail")
        self.assertIn("Ứng dụng Di động", msg)

    def test_engineer_login_on_web_admin_is_rejected(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "engineer.test@roadgis.local", "password": "Engineer@123"},
            headers={"X-Auth-Context": "web-admin"},
        )
        self.assertEqual(response.status_code, 403)
        msg = response.json().get("message") or response.json().get("detail")
        self.assertIn("Ứng dụng Di động", msg)

    def test_reporter_login_on_mobile_app_succeeds(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "reporter.test@roadgis.local", "password": "Reporter@123"},
            headers={"X-Auth-Context": "mobile-app"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["user"]["role"], "reporter")

    def test_engineer_login_on_mobile_app_succeeds(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "engineer.test@roadgis.local", "password": "Engineer@123"},
            headers={"X-Auth-Context": "mobile-app"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["user"]["role"], "field_engineer")

    def test_admin_login_on_mobile_app_is_rejected(self) -> None:
        response = self.client.post(
            "/api/auth/login",
            json={"email": "admin.test@roadgis.local", "password": "Admin@123"},
            headers={"X-Auth-Context": "mobile-app"},
        )
        self.assertEqual(response.status_code, 403)
        msg = response.json().get("message") or response.json().get("detail")
        self.assertIn("Cổng Web Quản lý", msg)

    def test_admin_me_on_mobile_app_is_rejected(self) -> None:
        login_res = self.client.post(
            "/api/auth/login",
            json={"email": "admin.test@roadgis.local", "password": "Admin@123"},
            headers={"X-Auth-Context": "web-admin"},
        )
        token = login_res.json()["accessToken"]

        # Call /me with mobile-app context header
        me_res = self.client.get(
            "/api/auth/me",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Auth-Context": "mobile-app",
            },
        )
        self.assertEqual(me_res.status_code, 403)
        msg = me_res.json().get("message") or me_res.json().get("detail")
        self.assertIn("Cổng Web Quản lý", msg)

    def test_reporter_me_on_web_admin_is_rejected(self) -> None:
        login_res = self.client.post(
            "/api/auth/login",
            json={"email": "reporter.test@roadgis.local", "password": "Reporter@123"},
            headers={"X-Auth-Context": "mobile-app"},
        )
        token = login_res.json()["accessToken"]

        # Call /me with web-admin context header
        me_res = self.client.get(
            "/api/auth/me",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Auth-Context": "web-admin",
            },
        )
        self.assertEqual(me_res.status_code, 403)
        msg = me_res.json().get("message") or me_res.json().get("detail")
        self.assertIn("Ứng dụng Di động", msg)


if __name__ == "__main__":
    unittest.main()
