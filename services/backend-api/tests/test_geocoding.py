from __future__ import annotations

import asyncio
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from app.config import Settings, get_settings
from app.database import init_database
from app.modules.gis.geocoding_service import (
    GeocodingAddress,
    ReverseGeocodingService,
    VietnamAddressParser,
)
from app.modules.reports.repository import ReportRepository


class VietnamAddressParserTests(unittest.TestCase):
    def test_ac01_parse_sample_coordinates_le_duan(self) -> None:
        sample_payload = {
            "place_id": 12345,
            "display_name": "12, Lê Duẩn, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, 71006, Việt Nam",
            "address": {
                "house_number": "12",
                "road": "Lê Duẩn",
                "quarter": "Bến Nghé",
                "suburb": "Phường Bến Nghé",
                "city_district": "Quận 1",
                "city": "Thành phố Hồ Chí Minh",
                "country": "Việt Nam",
            },
        }

        result = VietnamAddressParser.parse(
            payload=sample_payload,
            latitude=10.782345,
            longitude=106.699876,
        )

        self.assertEqual(result.road_name, "Lê Duẩn")
        self.assertEqual(result.ward, "Phường Bến Nghé")
        self.assertEqual(result.district, "Quận 1")
        self.assertEqual(result.province, "TP. Hồ Chí Minh")
        self.assertEqual(
            result.formatted_address,
            "12 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
        )

    def test_administrative_abbreviation_normalization(self) -> None:
        # 1. P. Bến Nghé, Q.1
        payload_1 = {
            "address": {
                "road": "Đồng Khởi",
                "suburb": "P. Bến Nghé",
                "district": "Q. 1",
                "city": "TP.HCM",
            }
        }
        res_1 = VietnamAddressParser.parse(payload_1, 10.77, 106.70)
        self.assertEqual(res_1.ward, "Phường Bến Nghé")
        self.assertEqual(res_1.district, "Quận 1")
        self.assertEqual(res_1.province, "TP. Hồ Chí Minh")

        # 2. H. Bình Chánh, Xã Tân Kiên
        payload_2 = {
            "address": {
                "road": "Quốc lộ 1A",
                "village": "Xã Tân Kiên",
                "county": "H. Bình Chánh",
                "province": "Thành phố Hồ Chí Minh",
            }
        }
        res_2 = VietnamAddressParser.parse(payload_2, 10.72, 106.60)
        self.assertEqual(res_2.ward, "Xã Tân Kiên")
        self.assertEqual(res_2.district, "Huyện Bình Chánh")
        self.assertEqual(res_2.province, "TP. Hồ Chí Minh")

        # 3. Plain numeric district "10", ward "15", Hanoi
        payload_3 = {
            "address": {
                "road": "Ba Tháng Hai",
                "quarter": "15",
                "city_district": "10",
                "state": "Hanoi",
            }
        }
        res_3 = VietnamAddressParser.parse(payload_3, 10.76, 106.66)
        self.assertEqual(res_3.ward, "Phường 15")
        self.assertEqual(res_3.district, "Quận 10")
        self.assertEqual(res_3.province, "Hà Nội")

    def test_fallback_when_address_empty(self) -> None:
        payload: dict = {"address": {}}
        res = VietnamAddressParser.parse(payload, 10.782345, 106.699876)
        self.assertIsNone(res.road_name)
        self.assertIsNone(res.ward)
        self.assertIsNone(res.district)
        self.assertIsNone(res.province)
        self.assertEqual(res.formatted_address, "Tọa độ (10.782345, 106.699876)")


class ReverseGeocodingServiceTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "test_geocoding_svc.db"
        os.environ["BACKEND_DATABASE_PATH"] = str(self.db_path)
        get_settings.cache_clear()
        init_database()

        self.connection = sqlite3.connect(self.db_path)
        self.connection.row_factory = sqlite3.Row
        self.repository = ReportRepository(self.connection)
        self.settings = get_settings()

    def tearDown(self) -> None:
        self.connection.close()
        import gc
        gc.collect()
        os.environ.pop("BACKEND_DATABASE_PATH", None)
        get_settings.cache_clear()
        try:
            self.temp_dir.cleanup()
        except Exception:
            pass

    async def test_ac02_cache_hit_within_10_meters_no_http_call(self) -> None:
        # Pre-seed cache with point A at (10.782345, 106.699876)
        self.repository.save_geocoding_cache(
            latitude=10.782345,
            longitude=106.699876,
            road_name="Lê Duẩn",
            ward="Phường Bến Nghé",
            district="Quận 1",
            province="TP. Hồ Chí Minh",
            formatted_address="12 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
        )

        mock_http_client = AsyncMock(spec=httpx.AsyncClient)
        service = ReverseGeocodingService(
            settings=self.settings,
            repository=self.repository,
            http_client=mock_http_client,
        )

        # Point B is ~6.6 meters away from Point A (<= 10m)
        result = await service.reverse_geocode(
            latitude=10.782400,
            longitude=106.699900,
        )

        # Verify: returned from cache, and HTTP client was NEVER called
        self.assertEqual(result.source, "cache")
        self.assertEqual(result.road_name, "Lê Duẩn")
        self.assertEqual(result.district, "Quận 1")
        self.assertEqual(result.formatted_address, "12 Lê Duẩn, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh")
        mock_http_client.get.assert_not_called()

        # Verify hit_count was incremented to 2
        cached = self.repository.find_geocoding_cache(10.782345, 106.699876, 5.0)
        self.assertIsNotNone(cached)
        self.assertGreaterEqual(cached["hit_count"], 2)

    async def test_ac03_timeout_and_error_handling_graceful_fallback(self) -> None:
        # Configure mock client to simulate a timeout (> 2.0s)
        mock_http_client = AsyncMock(spec=httpx.AsyncClient)
        mock_http_client.get.side_effect = httpx.TimeoutException("Nominatim timed out")

        service = ReverseGeocodingService(
            settings=self.settings,
            repository=self.repository,
            http_client=mock_http_client,
        )

        # Should not raise exception; must gracefully degrade
        result = await service.reverse_geocode(
            latitude=10.782345,
            longitude=106.699876,
        )

        self.assertEqual(result.source, "fallback")
        self.assertIsNone(result.road_name)
        self.assertIsNone(result.ward)
        self.assertIsNone(result.district)
        self.assertEqual(result.formatted_address, "Tọa độ (10.782345, 106.699876)")

    async def test_nominatim_success_and_cache_population(self) -> None:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "place_id": 999,
            "display_name": "Lê Duẩn, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, Việt Nam",
            "address": {
                "road": "Lê Duẩn",
                "suburb": "Phường Bến Nghé",
                "city_district": "Quận 1",
                "city": "Thành phố Hồ Chí Minh",
                "country": "Việt Nam",
            },
        }

        mock_http_client = AsyncMock(spec=httpx.AsyncClient)
        mock_http_client.get.return_value = mock_response

        service = ReverseGeocodingService(
            settings=self.settings,
            repository=self.repository,
            http_client=mock_http_client,
        )

        # 1. First call -> Cache miss -> Fetches Nominatim -> Populates cache
        result_1 = await service.reverse_geocode(
            latitude=10.782345,
            longitude=106.699876,
        )
        self.assertEqual(result_1.source, "nominatim_local")
        self.assertEqual(result_1.road_name, "Lê Duẩn")
        self.assertEqual(result_1.district, "Quận 1")
        self.assertEqual(mock_http_client.get.call_count, 1)

        # 2. Second call nearby (within 5m) -> Cache hit -> No extra HTTP call
        result_2 = await service.reverse_geocode(
            latitude=10.782360,
            longitude=106.699880,
        )
        self.assertEqual(result_2.source, "cache")
        self.assertEqual(result_2.road_name, "Lê Duẩn")
        self.assertEqual(mock_http_client.get.call_count, 1)  # Still 1 call!


if __name__ == "__main__":
    unittest.main()
