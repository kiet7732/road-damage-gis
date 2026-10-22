import os
import tempfile
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import get_connection, init_database
from app.main import app
from app.modules.auth.security import hash_password


class ForgotPasswordWorkflowTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "test_forgot_password.db"
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
                    "usr-reporter-test",
                    "citizen.otp@roadgis.local",
                    hash_password("OldPassword@123"),
                    "Nguyễn Văn Dân",
                    "reporter",
                ),
            )
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                """,
                (
                    "usr-engineer-test",
                    "engineer.otp@roadgis.local",
                    hash_password("OldEngPassword@123"),
                    "Kỹ sư Hiện trường",
                    "field_engineer",
                ),
            )
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
                """,
                (
                    "usr-admin-test",
                    "admin.otp@roadgis.local",
                    hash_password("AdminPass@123"),
                    "Quản trị viên",
                    "admin",
                ),
            )
            conn.commit()

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_nonexistent_email_rejected(self) -> None:
        res = self.client.post(
            "/api/auth/forgot-password/request-otp",
            json={"email": "nonexistent@roadgis.local"},
        )
        self.assertEqual(res.status_code, 404)
        self.assertIn("Không tìm thấy", res.text)

    def test_inactive_user_rejected(self) -> None:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))
                """,
                ("usr-inactive-test", "inactive.otp@roadgis.local", hash_password("Pass@123"), "Inactive User", "reporter"),
            )
            conn.commit()

        res = self.client.post(
            "/api/auth/forgot-password/request-otp",
            json={"email": "inactive.otp@roadgis.local"},
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("bị khóa", res.text)

    def test_admin_email_rejected_on_mobile_forgot_password(self) -> None:
        res = self.client.post(
            "/api/auth/forgot-password/request-otp",
            json={"email": "admin.otp@roadgis.local"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Quản trị viên", res.text)

    def _get_latest_otp(self, email: str) -> str:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT otp_code FROM password_reset_otps WHERE email = ? AND is_used = 0 ORDER BY created_at DESC LIMIT 1",
                (email,),
            )
            row = cursor.fetchone()
            self.assertIsNotNone(row, f"OTP should be created in database for {email}")
            return row["otp_code"] if isinstance(row, dict) or hasattr(row, "keys") else row[0]

    def test_request_otp_success_for_citizen(self) -> None:
        res = self.client.post(
            "/api/auth/forgot-password/request-otp",
            json={"email": "citizen.otp@roadgis.local"},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["email"], "citizen.otp@roadgis.local")
        self.assertNotIn("debugOtp", data)
        otp = self._get_latest_otp("citizen.otp@roadgis.local")
        self.assertEqual(len(otp), 6)

    def test_verify_wrong_otp_rejected(self) -> None:
        # Request OTP first
        self.client.post(
            "/api/auth/forgot-password/request-otp",
            json={"email": "citizen.otp@roadgis.local"},
        )
        # Try wrong OTP
        res = self.client.post(
            "/api/auth/forgot-password/verify-otp",
            json={"email": "citizen.otp@roadgis.local", "otp": "000000"},
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("không chính xác", res.text)

    def test_full_forgot_password_flow_and_login_with_new_password(self) -> None:
        # 1. Request OTP
        req_res = self.client.post(
            "/api/auth/forgot-password/request-otp",
            json={"email": "citizen.otp@roadgis.local"},
        )
        self.assertEqual(req_res.status_code, 200)
        otp_code = self._get_latest_otp("citizen.otp@roadgis.local")

        # 2. Verify OTP
        verify_res = self.client.post(
            "/api/auth/forgot-password/verify-otp",
            json={"email": "citizen.otp@roadgis.local", "otp": otp_code},
        )
        self.assertEqual(verify_res.status_code, 200)

        # 3. Reset password
        reset_res = self.client.post(
            "/api/auth/forgot-password/reset-password",
            json={
                "email": "citizen.otp@roadgis.local",
                "otp": otp_code,
                "newPassword": "Citizen@NewPass789",
            },
        )
        self.assertEqual(reset_res.status_code, 200)
        self.assertIn("thành công", reset_res.text)

        # 4. Old password cannot login
        old_login_res = self.client.post(
            "/api/auth/login",
            json={"email": "citizen.otp@roadgis.local", "password": "OldPassword@123"},
            headers={"X-Auth-Context": "mobile-app"},
        )
        self.assertEqual(old_login_res.status_code, 401)

        # 5. New password logs in successfully
        new_login_res = self.client.post(
            "/api/auth/login",
            json={"email": "citizen.otp@roadgis.local", "password": "Citizen@NewPass789"},
            headers={"X-Auth-Context": "mobile-app"},
        )
        self.assertEqual(new_login_res.status_code, 200)
        self.assertTrue(bool(new_login_res.json().get("accessToken")))

    def test_engineer_forgot_password_flow(self) -> None:
        req_res = self.client.post(
            "/api/auth/forgot-password/request-otp",
            json={"email": "engineer.otp@roadgis.local"},
        )
        self.assertEqual(req_res.status_code, 200)
        otp = self._get_latest_otp("engineer.otp@roadgis.local")

        reset_res = self.client.post(
            "/api/auth/forgot-password/reset-password",
            json={
                "email": "engineer.otp@roadgis.local",
                "otp": otp,
                "new_password": "Engineer@BrandNew2026",
            },
        )
        self.assertEqual(reset_res.status_code, 200)

        # Login with new password
        login_res = self.client.post(
            "/api/auth/login",
            json={"email": "engineer.otp@roadgis.local", "password": "Engineer@BrandNew2026"},
            headers={"X-Auth-Context": "mobile-app"},
        )
        self.assertEqual(login_res.status_code, 200)
