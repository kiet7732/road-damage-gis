import os
import sys
import unittest
from pathlib import Path

# Add backend app directory to sys.path
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from app.config import get_settings
from app.database import (
    convert_qmark_to_pyformat,
    get_connection,
    get_db_connection,
    get_postgres_pool,
    close_postgres_pool,
    check_database_health,
    check_database_ready,
)
from app.main import app


class DatabaseAbstractionTests(unittest.TestCase):
    def tearDown(self) -> None:
        # Reset default to sqlite
        os.environ["GIS_BACKEND"] = "sqlite"
        get_settings.cache_clear()
        close_postgres_pool()

    def test_qmark_conversion(self) -> None:
        """Kiểm tra hàm chuyển đổi placeholder từ '?' sang '%s'"""
        q1 = "SELECT * FROM users WHERE email = ? AND role = ?"
        self.assertEqual(convert_qmark_to_pyformat(q1), "SELECT * FROM users WHERE email = %s AND role = %s")

        q2 = "SELECT * FROM reports WHERE note = 'Are you sure?' AND status = ?"
        self.assertEqual(convert_qmark_to_pyformat(q2), "SELECT * FROM reports WHERE note = 'Are you sure?' AND status = %s")

        q3 = "INSERT INTO users (id, full_name, email) VALUES (?, ?, ?)"
        self.assertEqual(convert_qmark_to_pyformat(q3), "INSERT INTO users (id, full_name, email) VALUES (%s, %s, %s)")

    def test_sqlite_backend_and_endpoint(self) -> None:
        """Kiểm tra chế độ SQLite (Fallback an toàn)"""
        os.environ["GIS_BACKEND"] = "sqlite"
        get_settings.cache_clear()
        settings = get_settings()
        self.assertEqual(settings.gis_backend, "sqlite")

        health = check_database_health()
        self.assertEqual(health["backend"], "sqlite")
        self.assertTrue(health["ready"])
        self.assertEqual(health["status"], "ok")

        client = TestClient(app)
        response = client.get("/health/db")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["backend"], "sqlite")
        self.assertTrue(data["ready"])

        # Test query execution and row indexing
        with get_connection() as conn:
            row = conn.execute("SELECT 1 AS num, 'sqlite_val' AS val").fetchone()
            self.assertEqual(row["num"], 1)
            self.assertEqual(row["val"], "sqlite_val")
            self.assertEqual(row[0], 1)
            self.assertEqual(row[1], "sqlite_val")

    def test_postgis_backend_and_pool(self) -> None:
        """Kiểm tra chế độ PostgreSQL 16 + PostGIS 3.4 với ConnectionPool"""
        os.environ["GIS_BACKEND"] = "postgis"
        get_settings.cache_clear()
        settings = get_settings()
        self.assertEqual(settings.gis_backend, "postgis")

        # Khởi tạo pool
        close_postgres_pool()
        pool = get_postgres_pool(settings)
        self.assertIsNotNone(pool)
        self.assertEqual(pool.min_size, 5)
        self.assertEqual(pool.max_size, 20)

        # Kiểm tra healthcheck database
        health = check_database_health()
        self.assertEqual(health["backend"], "postgis")
        self.assertTrue(health["ready"])
        self.assertIsNotNone(health["postgis_version"])
        self.assertEqual(health["pool"]["min_size"], 5)
        self.assertEqual(health["pool"]["max_size"], 20)

        # Kiểm tra endpoint GET /health/db
        client = TestClient(app)
        response = client.get("/health/db")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["backend"], "postgis")
        self.assertTrue(data["ready"])
        self.assertIn("postgis_version", data)
        self.assertEqual(data["pool"]["min_size"], 5)

        # Test query execution with converted placeholder ? and row access
        with get_connection() as conn:
            cursor = conn.execute("SELECT ? AS num, ? AS val", (100, "postgis_val"))
            row = cursor.fetchone()
            self.assertEqual(row["num"], 100)
            self.assertEqual(row["val"], "postgis_val")
            self.assertEqual(row[0], 100)
            self.assertEqual(row[1], "postgis_val")

    def test_connection_pool_no_leaks(self) -> None:
        """Kiểm tra chống rò rỉ kết nối (Zero Connection Leak) qua 30 lần mượn/trả"""
        os.environ["GIS_BACKEND"] = "postgis"
        get_settings.cache_clear()
        settings = get_settings()

        pool = get_postgres_pool(settings)

        for i in range(30):
            with get_connection() as conn:
                row = conn.execute("SELECT 1 AS ok").fetchone()
                self.assertEqual(row["ok"], 1)

        # Test qua generator get_db_connection (FastAPI dependency)
        for i in range(10):
            gen = get_db_connection()
            conn = next(gen)
            row = conn.execute("SELECT 2 AS ok").fetchone()
            self.assertEqual(row["ok"], 2)
            try:
                next(gen)
            except StopIteration:
                pass

        # Pool vẫn hoạt động bình thường, không cạn kiệt kết nối
        with get_connection() as conn:
            row = conn.execute("SELECT 3 AS ok").fetchone()
            self.assertEqual(row["ok"], 3)


if __name__ == "__main__":
    unittest.main()
