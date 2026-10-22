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
    get_connection,
    get_postgres_pool,
    close_postgres_pool,
    check_database_ready,
)
from app.main import app


class PostgisSchemaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        os.environ["GIS_BACKEND"] = "postgis"
        get_settings.cache_clear()
        cls.settings = get_settings()
        cls.pool = get_postgres_pool(cls.settings)

    @classmethod
    def tearDownClass(cls) -> None:
        os.environ["GIS_BACKEND"] = "sqlite"
        get_settings.cache_clear()
        close_postgres_pool()

    def test_required_tables_exist(self) -> None:
        """Kiểm tra tất cả 5 bảng bắt buộc đã được tạo trong public schema"""
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                """
            ).fetchall()
            existing_tables = {row["table_name"] for row in rows}

        expected_tables = {
            "users",
            "reports",
            "geocoding_cache",
            "refresh_tokens",
            "report_engineer_actions",
        }
        for table in expected_tables:
            self.assertIn(table, existing_tables, f"Thiếu bảng {table}")

    def test_geometry_columns_registered(self) -> None:
        """Kiểm tra các cột không gian Point WGS84 (SRID 4326)"""
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT f_table_name, f_geometry_column, srid, type
                FROM geometry_columns
                WHERE f_table_name IN ('reports', 'geocoding_cache')
                """
            ).fetchall()

            col_map = {(r["f_table_name"], r["f_geometry_column"]): r for r in rows}

        # reports.geom
        self.assertIn(("reports", "geom"), col_map)
        self.assertEqual(col_map[("reports", "geom")]["srid"], 4326)
        self.assertEqual(col_map[("reports", "geom")]["type"].upper(), "POINT")

        # reports.field_checked_in_geom
        self.assertIn(("reports", "field_checked_in_geom"), col_map)
        self.assertEqual(col_map[("reports", "field_checked_in_geom")]["srid"], 4326)
        self.assertEqual(col_map[("reports", "field_checked_in_geom")]["type"].upper(), "POINT")

        # geocoding_cache.geom
        self.assertIn(("geocoding_cache", "geom"), col_map)
        self.assertEqual(col_map[("geocoding_cache", "geom")]["srid"], 4326)
        self.assertEqual(col_map[("geocoding_cache", "geom")]["type"].upper(), "POINT")

    def test_jsonb_columns(self) -> None:
        """Kiểm tra cột detections_json và action_payload_json thuộc kiểu JSONB"""
        with get_connection() as conn:
            row_reports = conn.execute(
                """
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'reports' AND column_name = 'detections_json'
                """
            ).fetchone()
            self.assertEqual(row_reports["data_type"].lower(), "jsonb")

            row_actions = conn.execute(
                """
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'report_engineer_actions' AND column_name = 'action_payload_json'
                """
            ).fetchone()
            self.assertEqual(row_actions["data_type"].lower(), "jsonb")

    def test_gist_and_gin_indexes(self) -> None:
        """Kiểm tra các chỉ mục GiST (không gian) và GIN (JSONB) đã tồn tại"""
        with get_connection() as conn:
            rows = conn.execute(
                """
                SELECT 
                    i.relname AS index_name,
                    t.relname AS table_name,
                    a.amname AS index_type
                FROM pg_class i
                JOIN pg_index idx ON idx.indexrelid = i.oid
                JOIN pg_class t ON t.oid = idx.indrelid
                JOIN pg_am a ON a.oid = i.relam
                JOIN pg_namespace n ON n.oid = t.relnamespace
                WHERE n.nspname = 'public' AND a.amname IN ('gist', 'gin')
                """
            ).fetchall()

            idx_map = {r["index_name"]: r["index_type"] for r in rows}

        self.assertEqual(idx_map.get("idx_reports_geom_gist"), "gist")
        self.assertEqual(idx_map.get("idx_reports_field_checked_in_geom_gist"), "gist")
        self.assertEqual(idx_map.get("idx_geocoding_cache_geom_gist"), "gist")
        self.assertEqual(idx_map.get("idx_reports_detections_jsonb"), "gin")

    def test_spatial_insert_and_dwithin_query(self) -> None:
        """Kiểm tra thao tác INSERT hình học không gian và truy vấn ST_DWithin"""
        test_id = "test-postgis-schema-verify-01"
        lon = 106.660172
        lat = 10.762622

        with get_connection() as conn:
            # Clean up if exists
            conn.execute("DELETE FROM reports WHERE id = ?", (test_id,))

            # Insert với toạ độ POINT WGS84
            conn.execute(
                """
                INSERT INTO reports (
                    id, image_path, geom, status, ai_status, detections_json
                )
                VALUES (
                    ?,
                    'test/path.jpg',
                    ST_SetSRID(ST_MakePoint(?, ?), 4326),
                    'new',
                    'completed',
                    '{"detections": [{"damage_type": "D40", "confidence": 0.95}]}'::jsonb
                )
                """,
                (test_id, lon, lat),
            )

            # Query đọc toạ độ và kiểm tra bán kính trắc địa với ST_DWithin
            row = conn.execute(
                """
                SELECT 
                    id,
                    ST_AsText(geom) AS geom_wkt,
                    ST_X(geom) AS x_lon,
                    ST_Y(geom) AS y_lat,
                    ST_Distance(
                        geom::geography, 
                        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
                    ) AS distance_meters,
                    detections_json->'detections'->0->>'damage_type' AS first_damage_type
                FROM reports
                WHERE id = ?
                  AND ST_DWithin(
                      geom::geography, 
                      ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, 
                      50.0
                  )
                """,
                (lon, lat, test_id, lon, lat),
            ).fetchone()

            self.assertIsNotNone(row)
            self.assertEqual(row["geom_wkt"], f"POINT({lon} {lat})")
            self.assertAlmostEqual(float(row["x_lon"]), lon, places=5)
            self.assertAlmostEqual(float(row["y_lat"]), lat, places=5)
            self.assertAlmostEqual(float(row["distance_meters"]), 0.0, places=2)
            self.assertEqual(row["first_damage_type"], "D40")

            # Clean up
            conn.execute("DELETE FROM reports WHERE id = ?", (test_id,))

    def test_ready_endpoint_with_postgis(self) -> None:
        """Kiểm tra endpoint /ready trả về HTTP 200 và ready=True khi ở chế độ PostGIS"""
        ready_info = check_database_ready()
        self.assertTrue(ready_info["connected"])
        self.assertTrue(ready_info["ready"])
        self.assertEqual(ready_info["missing_tables"], [])

        client = TestClient(app)
        response = client.get("/ready")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ready"])
        self.assertEqual(body["checks"]["database"]["backend"], "postgis")
        self.assertEqual(body["checks"]["database"]["missing_tables"], [])


if __name__ == "__main__":
    unittest.main()
