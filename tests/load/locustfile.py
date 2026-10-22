"""
Locust load-testing script for Road Damage GIS Backend.
Ticket 11 (GEO-11): Performance Benchmark & Edge Case Verification.

Usage:
  locust -f tests/load/locustfile.py --host http://localhost:8000
"""

from __future__ import annotations

from io import BytesIO
import random
import time

from locust import HttpUser, between, task
from PIL import Image

# Coordinated clusters in Ho Chi Minh City
# Multiple points are placed within <= 15m to exercise spatial cache hit
HCMC_COORDINATE_CLUSTERS = [
    # Cluster 1: Đường Lê Duẩn, Quận 1 (~5m cluster)
    (10.782345, 106.699876, "Đường Lê Duẩn"),
    (10.782380, 106.699890, "Đường Lê Duẩn (5m away)"),
    (10.782360, 106.699880, "Đường Lê Duẩn (2m away)"),
    # Cluster 2: Đường Nguyễn Huệ, Quận 1 (~10m cluster)
    (10.774500, 106.703200, "Đường Nguyễn Huệ"),
    (10.774550, 106.703250, "Đường Nguyễn Huệ (8m away)"),
    # Cluster 3: Đường Điện Biên Phủ, Quận Bình Thạnh
    (10.799500, 106.715000, "Đường Điện Biên Phủ"),
    (10.799520, 106.715040, "Đường Điện Biên Phủ (5m away)"),
    # Cluster 4: Đường Cách Mạng Tháng Tám, Quận 3
    (10.778000, 106.685000, "Đường Cách Mạng Tháng 8"),
    (10.778030, 106.685020, "Đường Cách Mạng Tháng 8 (4m away)"),
]

DAMAGE_NOTES = [
    "Ổ gà sâu nguy hiểm",
    "Mặt đường bị nứt lún",
    "Vết nứt da cá sấu",
    "Nắp cống nhô cao gây cản trở giao thông",
    "Ổ voi đọng nước sau mưa",
]


def create_dummy_jpeg() -> bytes:
    """Generate a valid minimal JPEG image in-memory."""
    img = Image.new("RGB", (64, 64), color=(random.randint(50, 200), 100, 150))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


class ReporterUser(HttpUser):
    """
    Simulates a mobile app citizen reporter creating road damage reports
    concurrently, and querying map points / report history.
    """

    wait_time = between(0.5, 2.0)

    def on_start(self) -> None:
        """Authenticate as citizen user or set authorization header."""
        self.image_bytes = create_dummy_jpeg()
        self.token = None

        # Attempt login if auth endpoint is present, otherwise proceed
        try:
            res = self.client.post(
                "/api/auth/login",
                json={
                    "email": "citizen.demo@roadgis.local",
                    "password": "Citizen@123",
                },
                name="/api/auth/login",
            )
            if res.status_code == 200:
                data = res.json()
                self.token = data.get("access_token")
        except Exception:
            pass

    def _get_headers(self) -> dict[str, str]:
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    @task(5)
    def create_road_damage_report(self) -> None:
        """
        Create a road damage report with multipart/form-data.
        SLA Requirement: Average response time < 200ms.
        """
        lat, lon, road_hint = random.choice(HCMC_COORDINATE_CLUSTERS)
        note = f"{random.choice(DAMAGE_NOTES)} - {road_hint}"

        files = {
            "image": ("damage_report.jpg", self.image_bytes, "image/jpeg"),
        }
        data = {
            "latitude": str(lat),
            "longitude": str(lon),
            "gps_accuracy": str(round(random.uniform(3.0, 12.0), 1)),
            "location_source": "camera_gps",
            "note": note,
        }

        start_time = time.perf_counter()
        with self.client.post(
            "/api/reports",
            files=files,
            data=data,
            headers=self._get_headers(),
            catch_response=True,
            name="/api/reports (POST)",
        ) as response:
            latency_ms = (time.perf_counter() - start_time) * 1000

            if response.status_code == 201:
                # AC-04: Validate responsiveness
                if latency_ms > 200.0:
                    response.failure(f"Response took {latency_ms:.1f}ms (> 200ms SLA)")
                else:
                    response.success()
            else:
                response.failure(
                    f"Unexpected status code: {response.status_code} - {response.text[:100]}"
                )

    @task(2)
    def view_report_history(self) -> None:
        """Citizen views their submission history."""
        self.client.get(
            "/api/reports/history?limit=20&offset=0",
            headers=self._get_headers(),
            name="/api/reports/history (GET)",
        )

    @task(1)
    def view_gis_map_points(self) -> None:
        """Map points query for citizen overview."""
        self.client.get(
            "/api/gis/points",
            headers=self._get_headers(),
            name="/api/gis/points (GET)",
        )
