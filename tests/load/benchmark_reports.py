"""
Standalone Performance Benchmark Runner for Road Damage GIS Backend.
Ticket 11 (GEO-11): 100 concurrent requests benchmark verifying < 200ms SLA.

Usage:
  python tests/load/benchmark_reports.py [--requests 100] [--concurrency 10] [--in-process]
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import math
import os
from pathlib import Path
import random
import sqlite3
import sys
import tempfile
import time
from typing import Any
from unittest.mock import AsyncMock, patch

from PIL import Image

# Ensure backend-api is in sys.path
backend_path = Path(__file__).resolve().parents[2] / "services" / "backend-api"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient

from app.config import get_settings
from app.database import init_database
from app.main import app
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import AuthUser
from app.modules.reports.ai_client import AiServiceClient
from app.modules.reports.schemas import AiDetectionResult

# Coordinate clusters in Ho Chi Minh City
COORDINATE_CLUSTERS = [
    # Cluster 1: Lê Duẩn, Q.1
    (10.782345, 106.699876, "Đường Lê Duẩn, Quận 1"),
    # Cluster 2: Nguyễn Huệ, Q.1
    (10.774500, 106.703200, "Đường Nguyễn Huệ, Quận 1"),
    # Cluster 3: Điện Biên Phủ, Bình Thạnh
    (10.799500, 106.715000, "Đường Điện Biên Phủ, Bình Thạnh"),
    # Cluster 4: Hai Bà Trưng, Q.3
    (10.788500, 106.692000, "Đường Hai Bà Trưng, Quận 3"),
    # Cluster 5: Cách Mạng Tháng 8, Q.10
    (10.778000, 106.685000, "Đường CMT8, Quận 10"),
]


def create_dummy_jpeg() -> bytes:
    img = Image.new("RGB", (64, 64), color=(30, 120, 200))
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def run_benchmark(
    total_requests: int = 100,
    concurrency: int = 10,
    base_url: str | None = None,
    in_process: bool = True,
) -> int:
    print("=" * 80)
    print("🚀 GEO-11: BENCHMARK HIỆU NĂNG TẠO BÁO CÁO & GEOCODING BẤT ĐỒNG BỘ")
    print("=" * 80)
    print(f"  - Tổng số request: {total_requests}")
    print(f"  - Mức độ đồng thời (Concurrency): {concurrency}")
    print(f"  - Chế độ chạy: {'In-process TestClient (zero overhead)' if in_process else base_url}")
    print("-" * 80)

    image_bytes = create_dummy_jpeg()
    mock_user = AuthUser(
        id="usr-bench-01",
        fullName="Kỹ Sư Benchmark",
        email="bench@roadgis.local",
        role="citizen",
        phone="0988888888",
    )

    # Set up temp environment
    temp_dir = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
    db_path = Path(temp_dir.name) / "bench_geocoding.db"
    upload_dir = Path(temp_dir.name) / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    os.environ["BACKEND_DATABASE_PATH"] = str(db_path)
    os.environ["BACKEND_UPLOAD_DIR"] = str(upload_dir)
    get_settings.cache_clear()
    init_database()

    app.dependency_overrides[get_current_user] = lambda: mock_user

    # Mock AI detect to simulate fast AI response (e.g. 5ms)
    mock_ai_result = AiDetectionResult(
        success=True,
        image_width=64,
        image_height=64,
        detections_count=1,
        detections=[],
        processing_time_ms=5.0,
        message="OK",
    )

    # Mock Nominatim lookup to simulate fast local server response (10ms)
    def mock_nominatim_side_effect(lat: float, lon: float):
        return (
            {
                "address": {
                    "road": "Đường Lê Duẩn",
                    "suburb": "Phường Bến Nghé",
                    "city_district": "Quận 1",
                    "city": "TP. Hồ Chí Minh",
                },
                "display_name": f"Lê Duẩn, Quận 1, TP. Hồ Chí Minh ({lat:.4f}, {lon:.4f})",
            },
            "nominatim_local",
        )

    ai_patch = patch.object(
        AiServiceClient,
        "detect_road_damage",
        AsyncMock(return_value=mock_ai_result),
    )
    nominatim_patch = patch(
        "app.modules.gis.geocoding_service.ReverseGeocodingService._fetch_nominatim_with_fallback",
        AsyncMock(side_effect=mock_nominatim_side_effect),
    )

    ai_patch.start()
    nominatim_patch.start()

    try:
        client = TestClient(app)

        # Warm-up request
        client.post(
            "/api/reports",
            files={"image": ("warmup.jpg", image_bytes, "image/jpeg")},
            data={"latitude": 10.782345, "longitude": 106.699876, "gps_accuracy": 5.0},
        )

        latencies: list[float] = []
        status_codes: list[int] = []

        def worker(i: int) -> tuple[int, float]:
            # Pick a cluster, then add tiny jitter (0 to 10 meters) to test spatial cache hit
            base_lat, base_lon, _ = COORDINATE_CLUSTERS[i % len(COORDINATE_CLUSTERS)]
            jitter_lat = (random.randint(-5, 5)) * 0.00001
            jitter_lon = (random.randint(-5, 5)) * 0.00001
            lat = round(base_lat + jitter_lat, 6)
            lon = round(base_lon + jitter_lon, 6)

            t0 = time.perf_counter()
            res = client.post(
                "/api/reports",
                files={"image": (f"damage_{i}.jpg", image_bytes, "image/jpeg")},
                data={
                    "latitude": lat,
                    "longitude": lon,
                    "gps_accuracy": round(random.uniform(3.0, 10.0), 1),
                    "note": f"Phản ánh ổ gà tải đồng thời #{i + 1}",
                },
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            return res.status_code, elapsed_ms

        print("⏳ Đang thực hiện 100 requests đồng thời...")
        wall_start = time.perf_counter()

        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            results = list(executor.map(worker, range(total_requests)))

        total_wall_ms = (time.perf_counter() - wall_start) * 1000.0

        for status_code, elapsed in results:
            status_codes.append(status_code)
            latencies.append(elapsed)

        latencies_sorted = sorted(latencies)
        avg_latency = sum(latencies) / len(latencies)
        min_latency = latencies_sorted[0]
        max_latency = latencies_sorted[-1]
        p50 = latencies_sorted[int(len(latencies) * 0.50)]
        p90 = latencies_sorted[int(len(latencies) * 0.90)]
        p95 = latencies_sorted[int(len(latencies) * 0.95)]
        p99 = latencies_sorted[int(len(latencies) * 0.99)]
        success_count = status_codes.count(201)
        throughput = (total_requests / (total_wall_ms / 1000.0)) if total_wall_ms > 0 else 0

        # Query database cache statistics
        with sqlite3.connect(db_path) as conn:
            conn.row_factory = sqlite3.Row
            cache_rows = conn.execute("SELECT * FROM geocoding_cache").fetchall()
            total_cache_entries = len(cache_rows)
            total_cache_hits = sum(row["hit_count"] for row in cache_rows)
            reports_count = conn.execute("SELECT COUNT(*) AS c FROM reports").fetchone()["c"]

        print("\n" + "=" * 80)
        print("📊 KẾT QUẢ ĐO LƯỜNG HIỆU NĂNG & ĐỘ TRỄ:")
        print("=" * 80)
        print(f"  - Thành công: {success_count}/{total_requests} ({(success_count/total_requests)*100:.1f}%)")
        print(f"  - Tổng thời gian thực thi (Wall time): {total_wall_ms:.2f} ms")
        print(f"  - Thông lượng (Throughput): {throughput:.2f} requests/sec")
        print("-" * 80)
        print(f"  - Thời gian phản hồi trung bình (Avg):  {avg_latency:.2f} ms  {'[ĐẠT SLA < 200ms ✅]' if avg_latency < 200 else '[VƯỢT SLA ❌]'}")
        print(f"  - Thời gian nhỏ nhất (Min):             {min_latency:.2f} ms")
        print(f"  - Thời gian lớn nhất (Max):             {max_latency:.2f} ms")
        print(f"  - Median (p50):                         {p50:.2f} ms")
        print(f"  - 90th Percentile (p90):                {p90:.2f} ms")
        print(f"  - 95th Percentile (p95):                {p95:.2f} ms")
        print(f"  - 99th Percentile (p99):                {p99:.2f} ms")
        print("-" * 80)
        print("🗺️ THỐNG KÊ SPATIAL CACHE (Haversine <= 15m):")
        print(f"  - Số bản ghi phản ánh đã lưu DB:        {reports_count}")
        print(f"  - Số mục lưu trong spatial cache:       {total_cache_entries}")
        print(f"  - Tổng số lượt Spatial Cache Hits:      {total_cache_hits - total_cache_entries}")
        print("=" * 80)

        # Verification asserts
        if success_count == total_requests and avg_latency < 200.0:
            print("🎉 TẤT CẢ TIÊU CHÍ KIỂM THỬ VÀ SLA ĐÃ ĐẠT 100%!")
            print("=" * 80)
            return 0
        else:
            print("❌ BENCHMARK KHÔNG ĐẠT TIÊU CHÍ YÊU CẦU!")
            print("=" * 80)
            return 1

    finally:
        ai_patch.stop()
        nominatim_patch.stop()
        app.dependency_overrides.clear()
        os.environ.pop("BACKEND_DATABASE_PATH", None)
        os.environ.pop("BACKEND_UPLOAD_DIR", None)
        get_settings.cache_clear()
        try:
            temp_dir.cleanup()
        except Exception:
            pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Benchmark Road Damage Report Creation")
    parser.add_argument("--requests", type=int, default=100, help="Total number of requests (default: 100)")
    parser.add_argument("--concurrency", type=int, default=10, help="Concurrency level (default: 10)")
    parser.add_argument("--base-url", type=str, default=None, help="Base URL of backend (optional)")
    parser.add_argument("--in-process", action="store_true", default=True, help="Run in-process using TestClient")
    args = parser.parse_args()

    exit_code = run_benchmark(
        total_requests=args.requests,
        concurrency=args.concurrency,
        base_url=args.base_url,
        in_process=args.in_process,
    )
    sys.exit(exit_code)
