from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import os
from pathlib import Path
import sqlite3
import sys
from typing import Any

import httpx


BACKEND_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_SERVICE_DIR))

from app.database import get_connection
from scripts.data_scopes import SMOKE_NOTE_PREFIX, SMOKE_TAG


BACKEND_BASE_URL = (
    os.getenv("BACKEND_API_URL")
    or os.getenv("EXPO_PUBLIC_API_URL")
    or os.getenv("VITE_API_URL")
    or "http://127.0.0.1:5000/api"
)
BACKEND_PUBLIC_BASE_URL = os.getenv("BACKEND_PUBLIC_BASE_URL") or "http://127.0.0.1:5000"
UPLOAD_IMAGE_PATH = Path(
    r"D:\DATN\Code\road-damage-gis\services\backend-api\uploads\reports\seed-report-001.png"
)
REPORTER_EMAIL = "reporter1.demo@roadgis.local"
REPORTER_PASSWORD = "Reporter@123"
ADMIN_EMAIL = "admin.demo@roadgis.local"
ADMIN_PASSWORD = "Admin@123"
ADMIN_CONTEXT_HEADER = {"X-Auth-Context": "web-admin"}
REPORT_LATITUDE = 10.98468010973337
REPORT_LONGITUDE = 106.67808022561869
REPORT_GPS_ACCURACY = 7.0
REPORT_LOCATION_SOURCE = "camera_gps"
MAP_BOUNDS_PADDING = 0.01

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


class MobileToAdminMapE2ETestFailure(RuntimeError):
    pass


@dataclass
class ReporterLoginResult:
    access_token: str
    user: dict[str, Any]


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise MobileToAdminMapE2ETestFailure(message)


def request_json(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    **kwargs: Any,
) -> Any:
    response = client.request(method, url, headers=headers, **kwargs)
    response.raise_for_status()
    return response.json()


def get_auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def normalize_text(value: str | None) -> str:
    return " ".join((value or "").split())


def get_first_detection_damage_type(report: dict[str, Any] | None) -> str | None:
    detections = report.get("ai_result", {}).get("detections", []) if report else []
    if not isinstance(detections, list) or not detections:
        return None

    first_detection = detections[0] or {}
    if not isinstance(first_detection, dict):
        return None

    damage_type = first_detection.get("damage_type")
    return damage_type if isinstance(damage_type, str) and damage_type.strip() else None


def cleanup_smoke_reports() -> int:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, image_path
            FROM reports
            WHERE note LIKE ?
            ORDER BY created_at ASC
            """,
            (f"{SMOKE_NOTE_PREFIX}E2E-03%",),
        ).fetchall()

        if not rows:
            return 0

        for row in rows:
            image_path = row["image_path"]
            if image_path:
                image_file = Path(image_path)
                if image_file.exists():
                    image_file.unlink()

        report_ids = [row["id"] for row in rows]
        placeholders = ",".join("?" for _ in report_ids)
        connection.execute(
            f"DELETE FROM reports WHERE id IN ({placeholders})",
            report_ids,
        )
        connection.commit()
        return len(report_ids)


def inspect_report_row(report_id: str) -> sqlite3.Row:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT
                id,
                latitude,
                longitude,
                gps_accuracy,
                note,
                ai_status,
                status,
                image_path,
                created_at,
                updated_at
            FROM reports
            WHERE id = ?
            LIMIT 1
            """,
            (report_id,),
        ).fetchone()

    if row is None:
        raise MobileToAdminMapE2ETestFailure("Không tìm thấy phản ánh vừa tạo trong database.")

    return row


def login_reporter(client: httpx.Client) -> ReporterLoginResult:
    response = request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/login",
        json={"email": REPORTER_EMAIL, "password": REPORTER_PASSWORD},
    )
    return ReporterLoginResult(
        access_token=response["accessToken"],
        user=response["user"],
    )


def login_admin(client: httpx.Client) -> dict[str, Any]:
    return request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers=ADMIN_CONTEXT_HEADER,
    )


def preview_ai(client: httpx.Client, token: str) -> dict[str, Any]:
    with UPLOAD_IMAGE_PATH.open("rb") as image_file:
        return request_json(
            client,
            "POST",
            f"{BACKEND_BASE_URL}/reports/preview-ai",
            files={"image": (UPLOAD_IMAGE_PATH.name, image_file, "image/png")},
            headers=get_auth_headers(token),
        )


def create_report(
    client: httpx.Client,
    token: str,
    *,
    note: str,
    preview_token: str | None,
) -> dict[str, Any]:
    with UPLOAD_IMAGE_PATH.open("rb") as image_file:
        data = {
            "latitude": str(REPORT_LATITUDE),
            "longitude": str(REPORT_LONGITUDE),
            "gps_accuracy": str(REPORT_GPS_ACCURACY),
            "location_source": REPORT_LOCATION_SOURCE,
            "location_recorded_at": datetime.now().isoformat(timespec="seconds"),
            "note": note,
        }
        if preview_token:
            data["preview_token"] = preview_token

        return request_json(
            client,
            "POST",
            f"{BACKEND_BASE_URL}/reports",
            files={"image": (UPLOAD_IMAGE_PATH.name, image_file, "image/png")},
            data=data,
            headers=get_auth_headers(token),
        )


def fetch_admin_reports(client: httpx.Client, *, search: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports?limit=50&offset=0&search={search}",
    )


def fetch_admin_report_detail(client: httpx.Client, report_id: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports/{report_id}",
    )


def fetch_admin_map(client: httpx.Client) -> dict[str, Any]:
    params = (
        f"?min_latitude={REPORT_LATITUDE - MAP_BOUNDS_PADDING}"
        f"&min_longitude={REPORT_LONGITUDE - MAP_BOUNDS_PADDING}"
        f"&max_latitude={REPORT_LATITUDE + MAP_BOUNDS_PADDING}"
        f"&max_longitude={REPORT_LONGITUDE + MAP_BOUNDS_PADDING}"
        "&limit=500"
    )
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/gis/reports{params}",
    )


def fetch_image_ok(image_url: str) -> bool:
    if not image_url:
        return False

    normalized_image_url = image_url
    if image_url.startswith("/uploads/"):
        normalized_image_url = f"{BACKEND_PUBLIC_BASE_URL}{image_url}"

    response = httpx.get(normalized_image_url, timeout=20.0)
    return response.status_code == 200 and response.headers.get("content-type", "").startswith("image/")


def run_mobile_to_admin_map_flow() -> dict[str, Any]:
    assert_true(UPLOAD_IMAGE_PATH.exists(), f"Thiếu ảnh test: {UPLOAD_IMAGE_PATH}")

    with httpx.Client(timeout=40.0) as reporter_client, httpx.Client(timeout=40.0) as admin_client:
        reporter = login_reporter(reporter_client)
        assert_true(reporter.user["role"] == "reporter", "Reporter login role mismatch.")

        preview = preview_ai(reporter_client, reporter.access_token)
        preview_token = preview.get("preview_token")
        assert_true(bool(preview_token), "Preview AI không trả preview_token.")

        note = f"{SMOKE_NOTE_PREFIX}E2E-03 {datetime.now().isoformat(timespec='seconds')}"
        created_report = create_report(
            reporter_client,
            reporter.access_token,
            note=note,
            preview_token=preview_token,
        )
        report_id = created_report["id"]

        login_admin(admin_client)

        admin_list = fetch_admin_reports(admin_client, search=note)
        list_item = next((item for item in admin_list["items"] if item["id"] == report_id), None)
        assert_true(list_item is not None, "Admin list không thấy report vừa gửi.")

        admin_detail = fetch_admin_report_detail(admin_client, report_id)
        assert_true(admin_detail["id"] == report_id, "Admin detail không thấy report vừa gửi.")

        admin_map = fetch_admin_map(admin_client)
        feature = next((item for item in admin_map.get("features", []) if item.get("id") == report_id), None)
        assert_true(feature is not None, "Admin map không thấy marker của report vừa gửi.")

        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []
        assert_true(len(coordinates) >= 2, "Feature GIS không có đủ tọa độ.")

        feature_longitude = float(coordinates[0])
        feature_latitude = float(coordinates[1])
        assert_true(abs(feature_latitude - REPORT_LATITUDE) < 0.000001, "Map bị sai latitude hoặc đảo lat/lng.")
        assert_true(abs(feature_longitude - REPORT_LONGITUDE) < 0.000001, "Map bị sai longitude hoặc đảo lat/lng.")

        properties = feature.get("properties") or {}
        assert_true(properties.get("id") == report_id, "Marker map không tham chiếu đúng report id.")
        assert_true(properties.get("status") == "pending", "Marker map chưa phản ánh đúng trạng thái ban đầu.")
        assert_true(normalize_text(properties.get("note")) == normalize_text(note), "Popup/panel map note không đúng.")
        assert_true(bool(properties.get("image_url")), "Marker map chưa có image_url.")
        assert_true(fetch_image_ok(properties["image_url"]), "Ảnh từ marker map không tải được.")

        map_damage_type = properties.get("damage_type")
        list_damage_type = list_item.get("corrected_damage_type") or get_first_detection_damage_type(list_item)
        detail_damage_type = admin_detail.get("corrected_damage_type") or get_first_detection_damage_type(admin_detail)
        if map_damage_type and list_damage_type:
            assert_true(map_damage_type == list_damage_type, "Map và list không đồng bộ loại hư hỏng.")
        if map_damage_type and detail_damage_type:
            assert_true(map_damage_type == detail_damage_type, "Map và detail không đồng bộ loại hư hỏng.")

        assert_true(properties.get("created_at") == list_item.get("created_at"), "Map và list không đồng bộ thời gian tạo.")
        assert_true(properties.get("created_at") == admin_detail.get("created_at"), "Map và detail không đồng bộ thời gian tạo.")
        assert_true(properties.get("status") == list_item.get("status"), "Map và list không đồng bộ trạng thái.")
        assert_true(properties.get("status") == admin_detail.get("status"), "Map và detail không đồng bộ trạng thái.")

        bbox = admin_map.get("bbox")
        assert_true(isinstance(bbox, list) or isinstance(bbox, tuple), "Map response chưa có bbox kết quả.")
        if bbox:
            min_longitude, min_latitude, max_longitude, max_latitude = [float(value) for value in bbox]
            assert_true(min_latitude <= REPORT_LATITUDE <= max_latitude, "BBox kết quả không bao phủ latitude của report.")
            assert_true(min_longitude <= REPORT_LONGITUDE <= max_longitude, "BBox kết quả không bao phủ longitude của report.")

        db_row = inspect_report_row(report_id)
        assert_true(abs(float(db_row["latitude"]) - feature_latitude) < 0.000001, "DB và map lệch latitude.")
        assert_true(abs(float(db_row["longitude"]) - feature_longitude) < 0.000001, "DB và map lệch longitude.")

        return {
            "report_id": report_id,
            "status": properties.get("status"),
            "damage_type": map_damage_type or detail_damage_type or list_damage_type or "unknown",
            "latitude": feature_latitude,
            "longitude": feature_longitude,
        }


def main() -> None:
    cleaned_before = cleanup_smoke_reports()
    result: dict[str, Any] | None = None

    try:
        result = run_mobile_to_admin_map_flow()
    finally:
        cleaned_after = cleanup_smoke_reports()

    print("=== MOBILE TO ADMIN MAP E2E RESULT ===")
    print(f"- Data scope tag: {SMOKE_TAG}")
    print(f"- Smoke reports cleaned before run: {cleaned_before}")
    print("Marker GIS admin hiển thị đúng điểm vừa gửi: PASS")
    print("Popup/panel đúng dữ liệu phản ánh: PASS")
    print("List, detail, map cùng tham chiếu một report: PASS")
    print(f"- Report id: {result['report_id']}")
    print(f"- Status: {result['status']}")
    print(f"- Damage type: {result['damage_type']}")
    print(f"- Latitude: {result['latitude']}")
    print(f"- Longitude: {result['longitude']}")
    print(f"- Smoke reports cleaned after run: {cleaned_after}")


if __name__ == "__main__":
    main()
