import os
import time
import unittest
from uuid import uuid4

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import get_connection, check_database_health
from app.main import app
from app.modules.auth.dependencies import get_current_user, get_engineer_user
from app.modules.auth.schemas import AuthUser
from app.modules.reports.repository import ReportRepository
from app.modules.reports.schemas import AiDetectionResult


class SpatialAnalyticsPostgisTests(unittest.TestCase):
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

    def tearDown(self) -> None:
        with get_connection() as connection:
            connection.execute("DELETE FROM reports WHERE id LIKE 'test-%'")
            connection.execute("DELETE FROM users WHERE id LIKE 'test-%'")
            connection.commit()

    def test_01_nearby_reports_postgis_geodesic(self) -> None:
        with get_connection() as connection:
            repo = ReportRepository(connection)
            # Center around Bình Dương reports cluster
            lat = 10.984512
            lon = 106.679541

            items = repo.list_nearby_reports(
                latitude=lat,
                longitude=lon,
                radius_meters=300.0,
                exclude_repaired=False,
                limit=10,
            )

            self.assertGreater(len(items), 0, "Should find nearby reports around cluster")
            # Verify distance is ascending
            distances = [it.distance_meters for it in items]
            self.assertEqual(distances, sorted(distances), "Nearby reports must be sorted by distance ascending")
            # All items must be within 300m
            for it in items:
                self.assertLessEqual(it.distance_meters, 300.0)
                self.assertIsNotNone(it.latitude)
                self.assertIsNotNone(it.longitude)

    def test_02_nearby_reports_radius_and_status_filtering(self) -> None:
        with get_connection() as connection:
            repo = ReportRepository(connection)
            lat = 10.984512
            lon = 106.679541

            # Strict radius 20 meters
            tight_items = repo.list_nearby_reports(
                latitude=lat,
                longitude=lon,
                radius_meters=20.0,
                exclude_repaired=False,
            )

            # Wider radius 300 meters
            wide_items = repo.list_nearby_reports(
                latitude=lat,
                longitude=lon,
                radius_meters=300.0,
                exclude_repaired=False,
            )

            self.assertGreaterEqual(len(wide_items), len(tight_items))
            for it in tight_items:
                self.assertLessEqual(it.distance_meters, 20.0)

    def test_03_st_cluster_dbscan_grouping(self) -> None:
        with get_connection() as connection:
            repo = ReportRepository(connection)
            # eps = 0.005 (~550m), min_points = 2
            resp = repo.get_damage_clusters(eps=0.005, min_points=2)

            self.assertGreater(resp.total_clusters, 0, "Should form at least one cluster in Bình Dương")
            self.assertGreater(len(resp.clusters), 0)

            # Largest cluster should contain the dense Bình Dương points
            main_cluster = resp.clusters[0]
            self.assertGreaterEqual(main_cluster.count, 2)
            self.assertTrue(len(main_cluster.report_ids) >= 2)
            self.assertAlmostEqual(main_cluster.center_latitude, 10.984, delta=0.05)
            self.assertAlmostEqual(main_cluster.center_longitude, 106.678, delta=0.05)

            # Remote HCM report (District 1) should be in unclustered
            unclustered_ids = [u.id for u in resp.unclustered]
            self.assertIn("6116c46d-794d-4ba1-ae0c-aa58f78a1a62", unclustered_ids)

    def test_04_api_nearby_and_clusters_endpoints(self) -> None:
        user = AuthUser(
            id="test-eng-nearby",
            fullName="Kỹ sư Khảo sát Lân cận",
            email="eng.nearby@roadgis.local",
            role="field_engineer",
            phone="0911223344",
        )
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_engineer_user] = lambda: user
        client = TestClient(app)

        try:
            # 1. Test GET /api/engineer/reports/nearby
            nearby_res = client.get(
                "/api/engineer/reports/nearby",
                params={
                    "latitude": 10.984512,
                    "longitude": 106.679541,
                    "radius_meters": 250.0,
                },
            )
            self.assertEqual(nearby_res.status_code, 200)
            nearby_data = nearby_res.json()
            self.assertIn("items", nearby_data)
            self.assertIn("total", nearby_data)
            self.assertGreater(nearby_data["total"], 0)

            # 2. Test GET /api/reports/clusters
            cluster_res = client.get(
                "/api/reports/clusters",
                params={
                    "eps": 0.005,
                    "min_points": 2,
                },
            )
            self.assertEqual(cluster_res.status_code, 200)
            cluster_data = cluster_res.json()
            self.assertIn("clusters", cluster_data)
            self.assertIn("unclustered", cluster_data)
            self.assertGreater(cluster_data["total_clusters"], 0)

            # 3. Test GET /api/gis/reports/clusters (Ticket RDG-PG-06 Server DBSCAN)
            t_start = time.perf_counter()
            gis_cluster_res = client.get(
                "/api/gis/reports/clusters",
                params={
                    "eps": 0.001,
                    "min_points": 2,
                },
            )
            t_elapsed_ms = (time.perf_counter() - t_start) * 1000
            self.assertEqual(gis_cluster_res.status_code, 200)
            self.assertLess(t_elapsed_ms, 250.0, f"API response too slow: {t_elapsed_ms:.2f}ms (must be < 250ms)")
            gis_clusters = gis_cluster_res.json()
            self.assertIsInstance(gis_clusters, list)
            self.assertGreater(len(gis_clusters), 0)

            cluster_rows = [c for c in gis_clusters if c["cluster_id"] is not None]
            noise_rows = [c for c in gis_clusters if c["cluster_id"] is None]
            self.assertGreater(len(cluster_rows), 0)
            for c in cluster_rows:
                self.assertIsNotNone(c["count"])
                self.assertGreaterEqual(c["count"], 2)
                self.assertIsNotNone(c["centroid_geojson"])
                self.assertEqual(c["centroid_geojson"]["type"], "Point")
                self.assertEqual(len(c["centroid_geojson"]["coordinates"]), 2)
                self.assertIsNone(c["noise_points"])

            if noise_rows:
                noise_item = noise_rows[0]
                self.assertIsNotNone(noise_item["noise_points"])
                self.assertIsInstance(noise_item["noise_points"], list)
                self.assertGreater(len(noise_item["noise_points"]), 0)
                first_noise = noise_item["noise_points"][0]
                self.assertIn("id", first_noise)
                self.assertIn("status", first_noise)
        finally:
            app.dependency_overrides.pop(get_current_user, None)
            app.dependency_overrides.pop(get_engineer_user, None)

    def test_05_sqlite_dual_backend_fallback(self) -> None:
        try:
            # Force SQLite backend to verify fallback clustering and nearby queries
            os.environ["GIS_BACKEND"] = "sqlite"
            get_settings.cache_clear()

            with get_connection() as connection:
                repo = ReportRepository(connection)
                self.assertEqual(repo.settings.gis_backend, "sqlite")

                # 1. Fallback nearby reports
                items = repo.list_nearby_reports(
                    latitude=10.984512,
                    longitude=106.679541,
                    radius_meters=300.0,
                    exclude_repaired=False,
                )
                self.assertGreater(len(items), 0)

                # 2. Fallback DBSCAN clustering
                resp = repo.get_damage_clusters(eps=0.005, min_points=2)
                self.assertGreater(resp.total_clusters, 0)
                self.assertGreaterEqual(resp.clusters[0].count, 2)

                # 3. Fallback GisRepository get_report_clusters_dbscan
                from app.modules.gis.repository import GisRepository
                gis_repo = GisRepository(connection, repo.settings)
                sqlite_clusters = gis_repo.get_report_clusters_dbscan(eps=0.001, min_points=2)
                self.assertIsInstance(sqlite_clusters, list)
                self.assertGreater(len(sqlite_clusters), 0)
                self.assertTrue(any(c.cluster_id is not None for c in sqlite_clusters))
        finally:
            os.environ["GIS_BACKEND"] = "postgis"
            get_settings.cache_clear()

    def test_06_benchmark_spatial_analytics_speed(self) -> None:
        with get_connection() as connection:
            repo = ReportRepository(connection)

            # Measure 20 iterations of ST_ClusterDBSCAN
            t0 = time.perf_counter()
            for _ in range(20):
                repo.get_damage_clusters(eps=0.005, min_points=2)
            elapsed = time.perf_counter() - t0
            avg_ms = (elapsed / 20) * 1000
            # PostGIS server-side DBSCAN clustering should execute in < 15ms per call
            self.assertLess(avg_ms, 15.0, f"DBSCAN clustering too slow: {avg_ms:.2f}ms")


if __name__ == "__main__":
    unittest.main()
