from __future__ import annotations

import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, patch

import httpx
import yaml

from app.config import Settings, get_settings
from app.database import init_database
from app.modules.gis.geocoding_service import ReverseGeocodingService
from app.modules.reports.repository import ReportRepository


class NominatimInfraAndFallbackTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        self.db_path = Path(self.temp_dir.name) / "test_nominatim_fallback.db"
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

    def tearDown(self) -> None:
        self.connection.close()
        get_settings.cache_clear()
        try:
            self.temp_dir.cleanup()
        except Exception:
            pass

    def test_docker_compose_config_structure(self) -> None:
        repo_root = Path(__file__).resolve().parents[3]
        compose_file = repo_root / "docker-compose.nominatim.yml"

        self.assertTrue(compose_file.exists(), "docker-compose.nominatim.yml must exist at repo root")
        with open(compose_file, "r", encoding="utf-8") as f:
            content = yaml.safe_load(f)

        self.assertIn("services", content)
        self.assertIn("nominatim", content["services"])
        nominatim_svc = content["services"]["nominatim"]

        self.assertEqual(nominatim_svc["image"], "mediagis/nominatim:4.4")
        self.assertEqual(nominatim_svc["container_name"], "rdg-nominatim")
        self.assertIn("8080:8080", nominatim_svc["ports"])

        env_list = nominatim_svc["environment"]
        env_dict = {}
        for item in env_list:
            if "=" in item:
                k, v = item.split("=", 1)
                env_dict[k] = v

        self.assertIn("PBF_URL", env_dict)
        self.assertIn("vietnam-latest.osm.pbf", env_dict["PBF_URL"])
        self.assertIn("REPLICATION_URL", env_dict)
        self.assertIn("NOMINATIM_PASSWORD", env_dict)

        self.assertIn("volumes", content)
        self.assertIn("nominatim-data", content["volumes"])
        self.assertIn("nominatim-flatnode", content["volumes"])

    def test_env_example_contains_nominatim_configurations(self) -> None:
        repo_root = Path(__file__).resolve().parents[3]
        root_env_example = repo_root / ".env.example"
        backend_env_example = Path(__file__).resolve().parents[1] / ".env.example"

        for env_file in (root_env_example, backend_env_example):
            self.assertTrue(env_file.exists(), f"{env_file} must exist")
            content = env_file.read_text(encoding="utf-8")
            self.assertIn("NOMINATIM_SERVER_URL", content)
            self.assertIn("http://localhost:8080", content)
            self.assertIn("NOMINATIM_FALLBACK_URL", content)
            self.assertIn("https://nominatim.openstreetmap.org", content)
            self.assertIn("NOMINATIM_TIMEOUT_SECONDS", content)

    async def test_ac03_local_nominatim_failure_triggers_automatic_public_fallback(self) -> None:
        # Settings with local URL and public fallback
        test_settings = Settings(
            NOMINATIM_SERVER_URL="http://localhost:8080",
            NOMINATIM_FALLBACK_URL="https://nominatim.openstreetmap.org",
            NOMINATIM_TIMEOUT_SECONDS=1.0,
        )

        mock_fallback_payload = {
            "address": {
                "road": "Đường Lê Duẩn",
                "suburb": "Phường Bến Nghé",
                "city_district": "Quận 1",
                "city": "Thành phố Hồ Chí Minh",
            },
            "display_name": "12 Đường Lê Duẩn, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh",
        }

        # Mock client to simulate local failure and fallback success
        mock_client = AsyncMock(spec=httpx.AsyncClient)

        async def fake_get(url, *args, **kwargs):
            if "localhost:8080" in url:
                # Simulate local container connection refused / down
                raise httpx.ConnectError("Connection refused to local Nominatim container")
            elif "nominatim.openstreetmap.org" in url:
                # Simulate public fallback responding successfully
                mock_response = AsyncMock()
                mock_response.status_code = 200
                mock_response.json = lambda: mock_fallback_payload
                return mock_response
            raise ValueError(f"Unexpected url: {url}")

        mock_client.get = AsyncMock(side_effect=fake_get)

        service = ReverseGeocodingService(
            settings=test_settings,
            repository=self.repository,
            http_client=mock_client,
        )

        # Call reverse geocode
        addr = await service.reverse_geocode(latitude=10.782345, longitude=106.699876)

        # AC-03: Local failed, successfully fell back to public API
        self.assertEqual(addr.source, "nominatim_fallback")
        self.assertEqual(addr.road_name, "Đường Lê Duẩn")
        self.assertEqual(addr.ward, "Phường Bến Nghé")
        self.assertEqual(addr.district, "Quận 1")
        self.assertEqual(addr.province, "TP. Hồ Chí Minh")

        # Cache should now have the resolved address
        cached = self.repository.find_geocoding_cache(10.782345, 106.699876, 15.0)
        self.assertIsNotNone(cached)
        self.assertEqual(cached["road_name"], "Đường Lê Duẩn")

    async def test_local_nominatim_primary_success_bypasses_fallback(self) -> None:
        test_settings = Settings(
            NOMINATIM_SERVER_URL="http://localhost:8080",
            NOMINATIM_FALLBACK_URL="https://nominatim.openstreetmap.org",
            NOMINATIM_TIMEOUT_SECONDS=1.0,
        )

        mock_local_payload = {
            "address": {
                "road": "Đường Pasteur",
                "suburb": "Phường Bến Nghé",
                "city_district": "Quận 1",
                "city": "Thành phố Hồ Chí Minh",
            },
            "display_name": "Pasteur, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh",
        }

        mock_client = AsyncMock(spec=httpx.AsyncClient)

        async def fake_get(url, *args, **kwargs):
            if "localhost:8080" in url:
                mock_response = AsyncMock()
                mock_response.status_code = 200
                mock_response.json = lambda: mock_local_payload
                return mock_response
            raise AssertionError(f"Public fallback should NOT be called when local is up! Called: {url}")

        mock_client.get = AsyncMock(side_effect=fake_get)

        service = ReverseGeocodingService(
            settings=test_settings,
            repository=self.repository,
            http_client=mock_client,
        )

        addr = await service.reverse_geocode(latitude=10.780000, longitude=106.700000)

        # Local success
        self.assertEqual(addr.source, "nominatim_local")
        self.assertEqual(addr.road_name, "Đường Pasteur")
        self.assertEqual(addr.ward, "Phường Bến Nghé")
        self.assertEqual(addr.district, "Quận 1")


if __name__ == "__main__":
    unittest.main()
