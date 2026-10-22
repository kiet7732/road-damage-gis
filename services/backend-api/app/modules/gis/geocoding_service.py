from __future__ import annotations

from dataclasses import dataclass
import logging
import re
from typing import Any

import httpx

from app.config import Settings
from app.modules.reports.repository import ReportRepository

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class GeocodingAddress:
    road_name: str | None
    ward: str | None
    district: str | None
    province: str | None
    formatted_address: str
    source: str  # "cache" | "nominatim_local" | "nominatim_fallback" | "fallback"


class VietnamAddressParser:
    """
    Parser and normalizer for Vietnamese administrative hierarchies from OpenStreetMap / Nominatim.
    4-level hierarchy: Road Name -> Ward/Commune -> District -> Province/City
    """

    PROVINCE_NORMALIZATIONS = {
        "thành phố hồ chí minh": "TP. Hồ Chí Minh",
        "thanh pho ho chi minh": "TP. Hồ Chí Minh",
        "tp hồ chí minh": "TP. Hồ Chí Minh",
        "tp. hồ chí minh": "TP. Hồ Chí Minh",
        "tp.hcm": "TP. Hồ Chí Minh",
        "tp hcm": "TP. Hồ Chí Minh",
        "ho chi minh city": "TP. Hồ Chí Minh",
        "ho chi minh": "TP. Hồ Chí Minh",
        "thành phố hà nội": "Hà Nội",
        "thanh pho ha noi": "Hà Nội",
        "tp hà nội": "Hà Nội",
        "ha noi": "Hà Nội",
        "hanoi": "Hà Nội",
        "thành phố đà nẵng": "Đà Nẵng",
        "thanh pho da nang": "Đà Nẵng",
        "tp đà nẵng": "Đà Nẵng",
        "da nang": "Đà Nẵng",
        "thành phố cần thơ": "Cần Thơ",
        "thanh pho can tho": "Cần Thơ",
        "tp cần thơ": "Cần Thơ",
        "can tho": "Cần Thơ",
        "thành phố hải phòng": "Hải Phòng",
        "thanh pho hai phong": "Hải Phòng",
        "tp hải phòng": "Hải Phòng",
        "hai phong": "Hải Phòng",
    }

    DISTRICT_PREPENDS = {
        "bình chánh": "Huyện Bình Chánh",
        "hóc môn": "Huyện Hóc Môn",
        "củ chi": "Huyện Củ Chi",
        "nhà bè": "Huyện Nhà Bè",
        "cần giờ": "Huyện Cần Giờ",
        "bình tân": "Quận Bình Tân",
        "bình thạnh": "Quận Bình Thạnh",
        "gò vấp": "Quận Gò Vấp",
        "phú nhuận": "Quận Phú Nhuận",
        "tân bình": "Quận Tân Bình",
        "tân phú": "Quận Tân Phú",
        "thủ đức": "Thành phố Thủ Đức",
    }

    @classmethod
    def parse(
        cls,
        payload: dict[str, Any],
        latitude: float,
        longitude: float,
    ) -> GeocodingAddress:
        address_dict = payload.get("address", {}) if isinstance(payload, dict) else {}

        road_name = cls._extract_road_name(address_dict, payload)
        ward = cls._extract_ward(address_dict)
        district = cls._extract_district(address_dict)
        province = cls._extract_province(address_dict)

        # Cross-adjust ward prefix if district is an urban "Quận"
        if ward and not cls._has_ward_prefix(ward):
            ward = f"Phường {ward}"

        # Cross-adjust district prefix if numeric or plain
        if district:
            district = cls._normalize_district(district)

        # Build clean formatted address
        formatted_address = cls._build_formatted_address(
            address_dict=address_dict,
            road_name=road_name,
            ward=ward,
            district=district,
            province=province,
            display_name=payload.get("display_name"),
            latitude=latitude,
            longitude=longitude,
        )

        return GeocodingAddress(
            road_name=road_name,
            ward=ward,
            district=district,
            province=province,
            formatted_address=formatted_address,
            source="nominatim",
        )

    @classmethod
    def _extract_road_name(
        cls, address: dict[str, Any], root: dict[str, Any]
    ) -> str | None:
        candidate_keys = [
            "road",
            "pedestrian",
            "street",
            "footway",
            "path",
            "cycleway",
            "residential",
            "highway",
        ]
        for key in candidate_keys:
            val = address.get(key)
            if val and isinstance(val, str) and val.strip():
                return cls._clean_text(val)

        # Fallback to root name if highway
        if root.get("category") == "highway" or root.get("addresstype") in (
            "road",
            "street",
        ):
            name = root.get("name")
            if name and isinstance(name, str) and name.strip():
                return cls._clean_text(name)

        return None

    @classmethod
    def _extract_ward(cls, address: dict[str, Any]) -> str | None:
        candidate_keys = [
            "quarter",
            "suburb",
            "ward",
            "village",
            "neighbourhood",
            "residential",
            "hamlet",
        ]

        # First pass: check if any candidate already has official prefix
        for key in candidate_keys:
            val = address.get(key)
            if val and isinstance(val, str) and val.strip():
                cleaned = cls._clean_text(val)
                if cls._has_ward_prefix(cleaned):
                    return cls._normalize_ward(cleaned)

        # Second pass: take first available candidate
        for key in candidate_keys:
            val = address.get(key)
            if val and isinstance(val, str) and val.strip():
                return cls._normalize_ward(cls._clean_text(val))

        return None

    @classmethod
    def _extract_district(cls, address: dict[str, Any]) -> str | None:
        candidate_keys = [
            "city_district",
            "district",
            "county",
            "town",
            "municipality",
        ]
        for key in candidate_keys:
            val = address.get(key)
            if val and isinstance(val, str) and val.strip():
                return cls._normalize_district(cls._clean_text(val))

        return None

    @classmethod
    def _extract_province(cls, address: dict[str, Any]) -> str | None:
        candidate_keys = [
            "city",
            "state",
            "province",
            "region",
        ]
        for key in candidate_keys:
            val = address.get(key)
            if val and isinstance(val, str) and val.strip():
                return cls._normalize_province(cls._clean_text(val))

        return None

    @classmethod
    def _clean_text(cls, val: str) -> str:
        return re.sub(r"\s+", " ", val).strip()

    @classmethod
    def _has_ward_prefix(cls, val: str) -> bool:
        return bool(
            re.match(
                r"^(phường|xã|thị trấn|tt\.|p\.)\s+",
                val,
                re.IGNORECASE,
            )
        )

    @classmethod
    def _normalize_ward(cls, val: str) -> str:
        val = cls._clean_text(val)

        # 1. Pure number -> "Phường 1"
        if re.match(r"^\d+$", val):
            return f"Phường {int(val)}"

        # 2. Proper casing for existing full prefixes
        match = re.match(r"^(phường|xã|thị trấn)\s+(.*)$", val, re.IGNORECASE)
        if match:
            prefix_lower = match.group(1).lower()
            rest = match.group(2).strip()
            if prefix_lower == "phường":
                return f"Phường {rest}"
            if prefix_lower == "xã":
                return f"Xã {rest}"
            if prefix_lower == "thị trấn":
                return f"Thị trấn {rest}"

        # 3. Abbreviation P. / P (e.g. "P. Bến Nghé", "P.1", "P 1")
        p_match = re.match(r"^p(?:\.|\s+)\s*(.+)$", val, re.IGNORECASE) or re.match(r"^p(\d+)$", val, re.IGNORECASE)
        if p_match:
            rest = p_match.group(1).strip()
            return f"Phường {rest}"

        # 4. Abbreviation TT. / TT (e.g. "TT. Nhà Bè")
        tt_match = re.match(r"^tt\.?(?:\s+|$)(.+)$", val, re.IGNORECASE)
        if tt_match:
            rest = tt_match.group(1).strip()
            return f"Thị trấn {rest}"

        return val

    @classmethod
    def _normalize_district(cls, val: str) -> str:
        val = cls._clean_text(val)

        # 1. Pure number (e.g. "1", "3", "10") -> "Quận 1"
        if re.match(r"^\d+$", val):
            return f"Quận {int(val)}"

        # 2. Known plain names in HCMC/Vietnam
        lower_val = val.lower()
        if lower_val in cls.DISTRICT_PREPENDS:
            return cls.DISTRICT_PREPENDS[lower_val]

        # 3. Proper casing for existing full prefixes ("Quận ...", "Huyện ...", "Thị xã ...", "Thành phố ...")
        match = re.match(
            r"^(quận|huyện|thị xã|thành phố)\s+(.*)$", val, re.IGNORECASE
        )
        if match:
            prefix_lower = match.group(1).lower()
            rest = match.group(2).strip()
            if prefix_lower == "quận":
                return f"Quận {rest}"
            if prefix_lower == "huyện":
                return f"Huyện {rest}"
            if prefix_lower == "thị xã":
                return f"Thị xã {rest}"
            if prefix_lower == "thành phố":
                return f"Thành phố {rest}"

        # 4. Abbreviation prefixes: Q. / Q / H. / H / TX. / TP.
        q_match = re.match(r"^q(?:\.|\s+)\s*(.+)$", val, re.IGNORECASE) or re.match(r"^q(\d+)$", val, re.IGNORECASE)
        if q_match:
            rest = q_match.group(1).strip()
            return f"Quận {rest}"

        h_match = re.match(r"^h\.(?:\s+|$)(.+)$", val, re.IGNORECASE)
        if h_match:
            rest = h_match.group(1).strip()
            return f"Huyện {rest}"

        tx_match = re.match(r"^tx\.?(?:\s+|$)(.+)$", val, re.IGNORECASE)
        if tx_match:
            rest = tx_match.group(1).strip()
            return f"Thị xã {rest}"

        tp_match = re.match(r"^tp\.?(?:\s+|$)(.+)$", val, re.IGNORECASE)
        if tp_match:
            rest = tp_match.group(1).strip()
            return f"Thành phố {rest}"

        return val

    @classmethod
    def _normalize_province(cls, val: str) -> str:
        val = cls._clean_text(val)
        lower_val = val.lower()

        if lower_val in cls.PROVINCE_NORMALIZATIONS:
            return cls.PROVINCE_NORMALIZATIONS[lower_val]

        # Proper casing for "Tỉnh ..." / "Thành phố ..."
        match = re.match(r"^(tỉnh|thành phố)\s+(.*)$", val, re.IGNORECASE)
        if match:
            prefix_lower = match.group(1).lower()
            rest = match.group(2).strip()
            if prefix_lower == "tỉnh":
                return f"Tỉnh {rest}"
            if prefix_lower == "thành phố":
                return f"Thành phố {rest}"

        return val

    @classmethod
    def _build_formatted_address(
        cls,
        *,
        address_dict: dict[str, Any],
        road_name: str | None,
        ward: str | None,
        district: str | None,
        province: str | None,
        display_name: str | None,
        latitude: float,
        longitude: float,
    ) -> str:
        house_number = address_dict.get("house_number") or address_dict.get("housenumber")
        street_component = None
        if road_name:
            street_component = f"{house_number} {road_name}".strip() if house_number else road_name

        components = [c for c in [street_component, ward, district, province] if c]

        if len(components) >= 2:
            return ", ".join(components)

        if display_name and isinstance(display_name, str) and display_name.strip():
            return cls._clean_text(display_name)

        if components:
            return ", ".join(components)

        return f"Tọa độ ({latitude:.6f}, {longitude:.6f})"


class ReverseGeocodingService:
    """
    Reverse Geocoding engine with spatial caching and Vietnam administrative hierarchy parsing.
    """

    def __init__(
        self,
        *,
        settings: Settings,
        repository: ReportRepository,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.settings = settings
        self.repository = repository
        self._http_client = http_client

    async def reverse_geocode(
        self,
        latitude: float,
        longitude: float,
    ) -> GeocodingAddress:
        # Step 1: Spatial Cache Lookup (Radius <= 15m)
        radius = self.settings.geocoding_cache_radius_meters
        try:
            cached_row = self.repository.find_geocoding_cache(
                latitude=latitude,
                longitude=longitude,
                max_distance_meters=radius,
            )
            if cached_row is not None:
                logger.info(
                    "Geocoding cache hit for (%.6f, %.6f) -> %s (hits=%s)",
                    latitude,
                    longitude,
                    cached_row["formatted_address"],
                    cached_row["hit_count"],
                )
                return GeocodingAddress(
                    road_name=cached_row["road_name"],
                    ward=cached_row["ward"],
                    district=cached_row["district"],
                    province=cached_row["province"],
                    formatted_address=cached_row["formatted_address"],
                    source="cache",
                )
        except Exception as exc:
            logger.warning("Error checking geocoding cache: %s", exc)

        # Step 2: Cache Miss -> Call Nominatim (Local first, then Public OSM fallback)
        payload, source = await self._fetch_nominatim_with_fallback(latitude, longitude)

        # Step 3: Parse Vietnam Administrative Hierarchy
        if payload is not None:
            parsed = VietnamAddressParser.parse(
                payload=payload,
                latitude=latitude,
                longitude=longitude,
            )
            parsed_with_source = GeocodingAddress(
                road_name=parsed.road_name,
                ward=parsed.ward,
                district=parsed.district,
                province=parsed.province,
                formatted_address=parsed.formatted_address,
                source=source,
            )

            # Step 4: Persist to Spatial Cache for future requests
            try:
                self.repository.save_geocoding_cache(
                    latitude=latitude,
                    longitude=longitude,
                    road_name=parsed.road_name,
                    ward=parsed.ward,
                    district=parsed.district,
                    province=parsed.province,
                    formatted_address=parsed.formatted_address,
                )
            except Exception as exc:
                logger.warning("Failed to save geocoding cache: %s", exc)

            return parsed_with_source

        # Step 5: Graceful Fallback if all external services fail
        logger.warning(
            "All Nominatim sources failed for (%.6f, %.6f). Using fallback coordinates.",
            latitude,
            longitude,
        )
        return GeocodingAddress(
            road_name=None,
            ward=None,
            district=None,
            province=None,
            formatted_address=f"Tọa độ ({latitude:.6f}, {longitude:.6f})",
            source="fallback",
        )

    async def _fetch_nominatim_with_fallback(
        self,
        latitude: float,
        longitude: float,
    ) -> tuple[dict[str, Any] | None, str]:
        timeout_seconds = self.settings.nominatim_timeout_seconds
        client = self._http_client

        # 1. Try Local Nominatim Server
        local_url = f"{self.settings.normalized_nominatim_server_url}/reverse"
        data = await self._request_nominatim(
            url=local_url,
            latitude=latitude,
            longitude=longitude,
            timeout_seconds=timeout_seconds,
            client=client,
        )
        if data is not None:
            return data, "nominatim_local"

        # 2. Try Public OSM Fallback
        fallback_url = f"{self.settings.normalized_nominatim_fallback_url}/reverse"
        if fallback_url != local_url:
            logger.info("Attempting public Nominatim fallback for (%.6f, %.6f)", latitude, longitude)
            data = await self._request_nominatim(
                url=fallback_url,
                latitude=latitude,
                longitude=longitude,
                timeout_seconds=timeout_seconds,
                client=client,
            )
            if data is not None:
                return data, "nominatim_fallback"

        return None, "fallback"

    async def _request_nominatim(
        self,
        url: str,
        latitude: float,
        longitude: float,
        timeout_seconds: float,
        client: httpx.AsyncClient | None = None,
    ) -> dict[str, Any] | None:
        params = {
            "format": "jsonv2",
            "lat": latitude,
            "lon": longitude,
            "addressdetails": "1",
            "accept-language": "vi",
        }
        headers = {
            "User-Agent": self.settings.nominatim_user_agent,
            "Accept": "application/json",
        }

        should_close_client = False
        if client is None:
            timeout = httpx.Timeout(
                timeout=timeout_seconds,
                connect=min(1.0, timeout_seconds),
            )
            client = httpx.AsyncClient(timeout=timeout)
            should_close_client = True

        try:
            response = await client.get(
                url,
                params=params,
                headers=headers,
                timeout=timeout_seconds,
            )
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and not data.get("error"):
                    return data
                logger.warning("Nominatim returned error payload: %s", data)
            else:
                logger.warning(
                    "Nominatim request to %s failed with status %s",
                    url,
                    response.status_code,
                )
        except httpx.TimeoutException:
            logger.warning("Nominatim request to %s timed out after %.2fs", url, timeout_seconds)
        except Exception as exc:
            logger.warning("Nominatim request to %s failed: %s", url, exc)
        finally:
            if should_close_client:
                await client.aclose()

        return None
