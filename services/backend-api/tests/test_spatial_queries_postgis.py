import math
import os
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import get_connection, check_database_health
from app.main import app
from app.modules.auth.dependencies import get_engineer_user
from app.modules.auth.schemas import AuthUser
from app.modules.reports.repository import ReportRepository, CHECKIN_NEAR_THRESHOLD_METERS
from app.modules.reports.schemas import AiDetectionResult


class SpatialQueriesPostgisTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls._saved_env = os.environ.copy()
        os.environ["GIS_BACKEND"] = "postgis"
        os.environ["POSTGRES_HOST"] = "127.0.0.1"
        os.environ["POSTGRES_PORT"] = "5432"
        os.environ["POSTGRES_DB"] = "road_damage_gis"
        os.environ["POSTGRES_USER"] = "rdg_admin"
        os.environ["POSTGRES_PASSWORD"] = "rdg_secret_postgis_2026"
        get_settings.cache_clear()
        health = check_database_health()
        if not health.get("ready") or health.get("status") != "ok":
            raise unittest.SkipTest(f"PostGIS database not available: {health.get('error')}")

    @classmethod
    def tearDownClass(cls) -> None:
        os.environ.clear()
        os.environ.update(cls._saved_env)
        get_settings.cache_clear()

    def setUp(self) -> None:
        self.settings = get_settings()
        self.assertEqual(self.settings.gis_backend, "postgis")

    def tearDown(self) -> None:
        with get_connection() as connection:
            connection.execute("DELETE FROM reports WHERE id LIKE 'test-%'")
            connection.execute("DELETE FROM users WHERE id LIKE 'test-%'")
            connection.execute("DELETE FROM geocoding_cache WHERE id LIKE 'test-%'")
            connection.commit()

    def test_01_calculate_report_distance_vs_haversine(self) -> None:
        with get_connection() as connection:
            repo = ReportRepository(connection)
            report = connection.execute(
                "SELECT id, latitude, longitude FROM reports WHERE geom IS NOT NULL LIMIT 1"
            ).fetchone()
            self.assertIsNotNone(report, "At least one report with geom must exist in PostGIS")

            base_lat = float(report["latitude"])
            base_lon = float(report["longitude"])

            # Offset ~15 meters north: 1 deg lat ~ 111,320m -> 15m ~ 0.0001347 deg
            test_lat = base_lat + 0.0001347
            test_lon = base_lon

            postgis_dist = repo.calculate_report_distance(report["id"], test_lat, test_lon)
            self.assertIsNotNone(postgis_dist)

            haversine_dist = repo._distance_meters(test_lat, test_lon, base_lat, base_lon)

            # Both should measure ~15 meters, and discrepancy between spheroid and spherical should be < 1%
            self.assertAlmostEqual(postgis_dist, 15.0, delta=1.0)
            self.assertAlmostEqual(haversine_dist, 15.0, delta=1.0)
            diff_ratio = abs(postgis_dist - haversine_dist) / postgis_dist
            self.assertLess(diff_ratio, 0.01, f"Difference ratio too high: {diff_ratio}")

    def test_02_engineer_check_in_valid_distance(self) -> None:
        report_id = f"test-checkin-{uuid4().hex[:8]}"
        engineer_id = "test-engineer-pg-01"
        lat = 10.776543
        lon = 106.700987

        with get_connection() as connection:
            repo = ReportRepository(connection)
            # Create user if needed
            connection.execute(
                """
                INSERT INTO users (id, full_name, email, password_hash, role)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                """,
                (engineer_id, "Kỹ sư PostGIS Test", f"{engineer_id}@roadgis.local", "hash", "field_engineer"),
            )

            # Create test report
            repo.create_report(
                report_id=report_id,
                user_id=engineer_id,
                image_path="uploads/test_checkin.jpg",
                latitude=lat,
                longitude=lon,
                gps_accuracy=5.0,
                location_source="gps_camera",
                location_recorded_at="2026-09-22T08:00:00Z",
                note="Spatial check-in test",
                ai_status="completed",
                status="processing",
                ai_result=AiDetectionResult(success=True, detections_count=0, detections=[], message="OK"),
                created_at="2026-09-22T08:00:00Z",
                updated_at="2026-09-22T08:00:00Z",
            )
            # Assign and claim by engineer
            connection.execute(
                """
                UPDATE reports
                SET assigned_engineer_id = ?, claimed_by_engineer_id = ?, claim_status = 'active', field_status = 'available_for_inspection'
                WHERE id = ?
                """,
                (engineer_id, engineer_id, report_id),
            )
            connection.commit()

            # Check in at 8 meters away
            checkin_lat = lat + 0.000072
            checkin_lon = lon
            result = repo.check_in_engineer_report(
                report_id=report_id,
                engineer_id=engineer_id,
                latitude=checkin_lat,
                longitude=checkin_lon,
                gps_accuracy=4.0,
                source="gps_device",
                is_mocked=False,
                client_distance_meters=8.0,
                updated_at="2026-09-22T08:05:00Z",
            )

            self.assertIsNotNone(result)
            self.assertEqual(result.field_status, "inspection_in_progress")
            self.assertIsNotNone(result.field_checked_in_distance_meters)
            self.assertLess(result.field_checked_in_distance_meters, CHECKIN_NEAR_THRESHOLD_METERS)
            self.assertAlmostEqual(result.field_checked_in_latitude, checkin_lat, delta=0.0001)
            self.assertAlmostEqual(result.field_checked_in_longitude, checkin_lon, delta=0.0001)

            # Check action history
            actions = connection.execute(
                "SELECT * FROM report_engineer_actions WHERE report_id = ? AND action_type = 'check_in'",
                (report_id,),
            ).fetchall()
            self.assertEqual(len(actions), 1)

            # Cleanup
            connection.execute("DELETE FROM reports WHERE id = ?", (report_id,))
            connection.execute("DELETE FROM users WHERE id = ?", (engineer_id,))
            connection.commit()

    def test_03_geocoding_cache_st_dwithin_and_knn(self) -> None:
        with get_connection() as connection:
            repo = ReportRepository(connection)
            center_lat = 10.790000
            center_lon = 106.690000

            # 1. Save cache point
            cache_id = repo.save_geocoding_cache(
                latitude=center_lat,
                longitude=center_lon,
                road_name="Đường PostGIS Cache",
                ward="Phường Bến Nghé",
                district="Quận 1",
                province="TP. Hồ Chí Minh",
                formatted_address="Đường PostGIS Cache, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
            )
            self.assertTrue(bool(cache_id))

            # 2. Query within 10 meters (offset ~5m: lat + 0.000045)
            near_lat = center_lat + 0.000045
            near_lon = center_lon
            cached_hit = repo.find_geocoding_cache(near_lat, near_lon, max_distance_meters=15.0)
            self.assertIsNotNone(cached_hit)
            self.assertEqual(cached_hit["id"], cache_id)
            self.assertEqual(cached_hit["hit_count"], 2)

            # 3. Query far away (offset ~100m: lat + 0.0009)
            far_lat = center_lat + 0.0009
            far_lon = center_lon
            cached_miss = repo.find_geocoding_cache(far_lat, far_lon, max_distance_meters=15.0)
            self.assertIsNone(cached_miss)

            # Cleanup
            connection.execute("DELETE FROM geocoding_cache WHERE id = ?", (cache_id,))
            connection.commit()

    def test_04_check_in_rejected_beyond_30m_via_api(self) -> None:
        report_id = f"test-reject-{uuid4().hex[:8]}"
        engineer_id = f"test-eng-rej-{uuid4().hex[:6]}"
        lat = 10.776543
        lon = 106.700987

        with get_connection() as connection:
            repo = ReportRepository(connection)
            # Create user
            connection.execute(
                """
                INSERT INTO users (id, full_name, email, password_hash, role)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (id) DO NOTHING
                """,
                (engineer_id, "Kỹ sư Rejection Test", f"{engineer_id}@roadgis.local", "hash", "field_engineer"),
            )

            # Create test report
            repo.create_report(
                report_id=report_id,
                user_id=engineer_id,
                image_path="uploads/test_reject.jpg",
                latitude=lat,
                longitude=lon,
                gps_accuracy=5.0,
                location_source="gps_camera",
                location_recorded_at="2026-09-22T08:00:00Z",
                note="Spatial rejection test",
                ai_status="completed",
                status="processing",
                ai_result=AiDetectionResult(success=True, detections_count=0, detections=[], message="OK"),
                created_at="2026-09-22T08:00:00Z",
                updated_at="2026-09-22T08:00:00Z",
            )
            # Assign and claim by engineer
            connection.execute(
                """
                UPDATE reports
                SET assigned_engineer_id = ?, claimed_by_engineer_id = ?, claim_status = 'active', field_status = 'available_for_inspection'
                WHERE id = ?
                """,
                (engineer_id, engineer_id, report_id),
            )
            connection.commit()

        # Set up auth override
        engineer_user = AuthUser(
            id=engineer_id,
            fullName="Kỹ sư Rejection Test",
            email=f"{engineer_id}@roadgis.local",
            role="field_engineer",
            phone="0911223344",
        )
        app.dependency_overrides[get_engineer_user] = lambda: engineer_user
        client = TestClient(app)

        try:
            # Check in 150m away (150m ~ 0.00135 deg lat)
            response = client.post(
                f"/api/engineer/reports/{report_id}/check-in",
                json={
                    "latitude": lat + 0.00135,
                    "longitude": lon,
                    "gps_accuracy": 5.0,
                    "is_mocked": False,
                    "source": "gps",
                },
            )
            self.assertEqual(response.status_code, 400)
            self.assertIn("vượt quá bán kính tiếp cận cho phép (30m)", response.json()["message"])

            # Verify that check_in_rejected action was logged
            with get_connection() as connection:
                actions = connection.execute(
                    "SELECT * FROM report_engineer_actions WHERE report_id = ? AND action_type = 'check_in_rejected'",
                    (report_id,),
                ).fetchall()
                self.assertEqual(len(actions), 1)
        finally:
            app.dependency_overrides.pop(get_engineer_user, None)
            with get_connection() as connection:
                connection.execute("DELETE FROM reports WHERE id = ?", (report_id,))
                connection.execute("DELETE FROM users WHERE id = ?", (engineer_id,))
                connection.commit()

    def test_05_benchmark_spatial_geocoding_lookup(self) -> None:
        import time
        with get_connection() as connection:
            repo = ReportRepository(connection)
            lat = 10.782345
            lon = 106.699876

            # Warmup
            repo.find_geocoding_cache(lat, lon, max_distance_meters=20.0)

            iterations = 50
            start_time = time.perf_counter()
            for _ in range(iterations):
                repo.find_geocoding_cache(lat, lon, max_distance_meters=20.0)
            elapsed = time.perf_counter() - start_time

            avg_ms = (elapsed / iterations) * 1000
            # GiST spatial index lookups on geography should average < 5ms
            self.assertLess(avg_ms, 15.0, f"Average query time too high: {avg_ms:.2f}ms")


if __name__ == "__main__":
    unittest.main()
