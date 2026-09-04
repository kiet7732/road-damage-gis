from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import os
from pathlib import Path
import sqlite3
import sys
from typing import Any
from urllib.parse import quote_plus

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

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


class MobileToAdminListE2ETestFailure(RuntimeError):
    pass


@dataclass
class ReporterLoginResult:
    access_token: str
    refresh_token: str
    user: dict[str, Any]


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise MobileToAdminListE2ETestFailure(message)


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


def cleanup_smoke_reports() -> int:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, image_path
            FROM reports
            WHERE note LIKE ?
            ORDER BY created_at ASC
            """,
            (f"{SMOKE_NOTE_PREFIX}E2E-02%",),
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
                user_id,
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
        raise MobileToAdminListE2ETestFailure("Không tìm thấy phản ánh vừa tạo trong database.")

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
        refresh_token=response["refreshToken"],
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


def fetch_reporter_detail(client: httpx.Client, token: str, report_id: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/reports/{report_id}",
        headers=get_auth_headers(token),
    )


def fetch_admin_reports(client: httpx.Client, *, search: str) -> dict[str, Any]:
    query = quote_plus(search)
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports?limit=50&offset=0&search={query}",
    )


def fetch_admin_report_detail(client: httpx.Client, report_id: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports/{report_id}",
    )


def fetch_image_ok(image_url: str) -> bool:
    if not image_url:
        return False

    normalized_image_url = image_url
    if image_url.startswith("/uploads/"):
        normalized_image_url = f"{BACKEND_PUBLIC_BASE_URL}{image_url}"

    response = httpx.get(normalized_image_url, timeout=20.0)
    return response.status_code == 200 and response.headers.get("content-type", "").startswith("image/")


def run_mobile_to_admin_list_flow() -> dict[str, Any]:
    assert_true(UPLOAD_IMAGE_PATH.exists(), f"Thiếu ảnh test: {UPLOAD_IMAGE_PATH}")

    with httpx.Client(timeout=40.0) as reporter_client, httpx.Client(timeout=40.0) as admin_client:
        reporter = login_reporter(reporter_client)
        assert_true(reporter.user["role"] == "reporter", "Reporter login role mismatch.")

        preview = preview_ai(reporter_client, reporter.access_token)
        preview_token = preview.get("preview_token")
        assert_true(bool(preview_token), "Preview AI không trả preview_token.")

        note = f"{SMOKE_NOTE_PREFIX}E2E-02 {datetime.now().isoformat(timespec='seconds')}"
        created_report = create_report(
            reporter_client,
            reporter.access_token,
            note=note,
            preview_token=preview_token,
        )
        report_id = created_report["id"]

        assert_true(created_report["status"] == "pending", "Create report không normalize status về pending.")
        assert_true(abs(float(created_report["latitude"]) - REPORT_LATITUDE) < 0.000001, "Latitude create response không đúng.")
        assert_true(abs(float(created_report["longitude"]) - REPORT_LONGITUDE) < 0.000001, "Longitude create response không đúng.")

        reporter_detail = fetch_reporter_detail(reporter_client, reporter.access_token, report_id)
        assert_true(reporter_detail["id"] == report_id, "Reporter detail không trả đúng report vừa tạo.")

        admin_user = login_admin(admin_client)
        assert_true(admin_user["user"]["role"] == "admin", "Admin login role mismatch.")

        admin_list = fetch_admin_reports(admin_client, search=note)
        matched_items = [item for item in admin_list["items"] if normalize_text(item.get("note")) == normalize_text(note)]

        assert_true(len(matched_items) == 1, "Admin list phải thấy đúng 1 phản ánh theo note duy nhất.")

        admin_item = matched_items[0]
        assert_true(admin_item["id"] == report_id, "Admin list thấy sai report id.")
        assert_true(admin_item["status"] == "pending", "Admin list chưa phản ánh đúng trạng thái ban đầu.")
        assert_true(abs(float(admin_item["latitude"]) - REPORT_LATITUDE) < 0.000001, "Admin list latitude không đúng.")
        assert_true(abs(float(admin_item["longitude"]) - REPORT_LONGITUDE) < 0.000001, "Admin list longitude không đúng.")
        assert_true(normalize_text(admin_item.get("note")) == normalize_text(note), "Admin list note không đúng.")
        assert_true(bool(admin_item.get("image_url")), "Admin list chưa có image_url.")
        assert_true(fetch_image_ok(admin_item["image_url"]), "Ảnh từ admin list không tải được.")

        admin_detail = fetch_admin_report_detail(admin_client, report_id)
        assert_true(admin_detail["id"] == report_id, "Admin detail không đúng report.")
        assert_true(admin_detail["status"] == "pending", "Admin detail chưa đúng trạng thái ban đầu.")
        assert_true(normalize_text(admin_detail.get("note")) == normalize_text(note), "Admin detail note không đúng.")
        assert_true(bool(admin_detail.get("image_url")), "Admin detail chưa có image_url.")
        assert_true(fetch_image_ok(admin_detail["image_url"]), "Ảnh từ admin detail không tải được.")

        db_row = inspect_report_row(report_id)
        assert_true(normalize_text(db_row["note"]) == normalize_text(note), "DB note không khớp với phản ánh vừa tạo.")
        assert_true(db_row["status"] in ("pending_verification", "manual_review_required", "pending"), "DB status ban đầu không hợp lệ.")

        return {
            "report_id": report_id,
            "note": note,
            "status": admin_item["status"],
            "created_at": admin_item["created_at"],
        }


def main() -> None:
    cleaned_before = cleanup_smoke_reports()
    result: dict[str, Any] | None = None

    try:
        result = run_mobile_to_admin_list_flow()
    finally:
        cleaned_after = cleanup_smoke_reports()

    print("=== MOBILE TO ADMIN LIST E2E RESULT ===")
    print(f"- Data scope tag: {SMOKE_TAG}")
    print(f"- Smoke reports cleaned before run: {cleaned_before}")
    print("Reporter mobile gửi phản ánh: PASS")
    print("Web admin nhận đúng danh sách phản ánh: PASS")
    print("Ảnh, GPS, thời gian, trạng thái hiển thị đúng: PASS")
    print(f"- Report id: {result['report_id']}")
    print(f"- Note search key: {result['note']}")
    print(f"- Initial status: {result['status']}")
    print(f"- Created at: {result['created_at']}")
    print(f"- Smoke reports cleaned after run: {cleaned_after}")


if __name__ == "__main__":
    main()
