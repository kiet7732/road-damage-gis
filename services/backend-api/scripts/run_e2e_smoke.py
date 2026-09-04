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
UPLOAD_IMAGE_PATH = Path(
    r"D:\DATN\Code\road-damage-gis\services\backend-api\uploads\reports\seed-report-001.png"
)
REPORTER_1_EMAIL = "reporter1.demo@roadgis.local"
REPORTER_1_PASSWORD = "Reporter@123"
REPORTER_2_EMAIL = "reporter2.demo@roadgis.local"
REPORTER_2_PASSWORD = "Reporter@123"
REPORT_LATITUDE = 10.782345
REPORT_LONGITUDE = 106.699876
REPORT_GPS_ACCURACY = 9.5
REPORT_LOCATION_SOURCE = "camera_gps"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


class E2ETestFailure(RuntimeError):
    pass


@dataclass
class LoginResult:
    access_token: str
    refresh_token: str
    user: dict[str, Any]


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise E2ETestFailure(message)


def request_json(
    client: httpx.Client,
    method: str,
    url: str,
    **kwargs: Any,
) -> Any:
    response = client.request(method, url, **kwargs)
    response.raise_for_status()
    return response.json()


def get_smoke_reports(connection: sqlite3.Connection) -> list[sqlite3.Row]:
    return connection.execute(
        """
        SELECT id, image_path, note, location_source
        FROM reports
        WHERE note LIKE ?
        ORDER BY created_at ASC
        """,
        (f"{SMOKE_NOTE_PREFIX}%",),
    ).fetchall()


def cleanup_smoke_reports() -> int:
    with get_connection() as connection:
        smoke_reports = get_smoke_reports(connection)
        if not smoke_reports:
            return 0

        for row in smoke_reports:
            image_path = row["image_path"]
            if image_path:
                image_file = Path(image_path)
                if image_file.exists():
                    image_file.unlink()

        report_ids = [row["id"] for row in smoke_reports]
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
                image_path,
                latitude,
                longitude,
                gps_accuracy,
                location_source,
                location_recorded_at,
                note,
                ai_status,
                status,
                detections_json
            FROM reports
            WHERE id = ?
            LIMIT 1
            """,
            (report_id,),
        ).fetchone()

    if row is None:
        raise E2ETestFailure("Không tìm thấy báo cáo vừa tạo trong database.")

    return row


def login(client: httpx.Client, email: str, password: str) -> LoginResult:
    payload = {"email": email, "password": password}
    response = request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/login",
        json=payload,
    )
    return LoginResult(
        access_token=response["accessToken"],
        refresh_token=response["refreshToken"],
        user=response["user"],
    )


def refresh_access_token(client: httpx.Client, refresh_token: str) -> LoginResult:
    response = request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/refresh",
        json={"refreshToken": refresh_token},
    )
    return LoginResult(
        access_token=response["accessToken"],
        refresh_token=response["refreshToken"],
        user=response["user"],
    )


def logout(client: httpx.Client, refresh_token: str, access_token: str) -> dict[str, Any]:
    return request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/logout",
        json={"refreshToken": refresh_token},
        headers=get_auth_headers(access_token),
    )


def expect_status(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    expected_status: int,
    **kwargs: Any,
) -> None:
    response = client.request(method, url, **kwargs)
    assert_true(
        response.status_code == expected_status,
        f"Expected HTTP {expected_status} nhưng nhận {response.status_code} tại {url}.",
    )


def get_auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def preview_ai(client: httpx.Client, reporter_token: str) -> dict[str, Any]:
    with UPLOAD_IMAGE_PATH.open("rb") as image_file:
        files = {
            "image": (UPLOAD_IMAGE_PATH.name, image_file, "image/png"),
        }
        response = request_json(
            client,
            "POST",
            f"{BACKEND_BASE_URL}/reports/preview-ai",
            files=files,
            headers=get_auth_headers(reporter_token),
        )
    return response


def create_report(
    client: httpx.Client,
    reporter_token: str,
    *,
    note: str,
    preview_token: str | None,
) -> dict[str, Any]:
    with UPLOAD_IMAGE_PATH.open("rb") as image_file:
        files = {
            "image": (UPLOAD_IMAGE_PATH.name, image_file, "image/png"),
        }
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

        response = request_json(
            client,
            "POST",
            f"{BACKEND_BASE_URL}/reports",
            files=files,
            data=data,
            headers=get_auth_headers(reporter_token),
        )
    return response


def fetch_history(client: httpx.Client, token: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/reports/history?limit=50&offset=0",
        headers=get_auth_headers(token),
    )


def fetch_report_detail(client: httpx.Client, token: str, report_id: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/reports/{report_id}",
        headers=get_auth_headers(token),
    )


def run_reporter_flow(client: httpx.Client) -> dict[str, Any]:
    reporter = login(client, REPORTER_1_EMAIL, REPORTER_1_PASSWORD)
    assert_true(reporter.user["role"] == "reporter", "Reporter login role mismatch.")

    refreshed_session = refresh_access_token(client, reporter.refresh_token)
    assert_true(
        refreshed_session.user["id"] == reporter.user["id"],
        "Refresh token không trả về đúng người dùng reporter.",
    )
    assert_true(
        refreshed_session.refresh_token != reporter.refresh_token,
        "Refresh token rotation không tạo refresh token mới.",
    )

    expect_status(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/refresh",
        expected_status=401,
        json={"refreshToken": reporter.refresh_token},
    )

    preview = preview_ai(client, refreshed_session.access_token)
    preview_token = preview.get("preview_token")
    assert_true(preview["success"] is True, "Preview AI did not return success.")
    assert_true(bool(preview_token), "Preview AI did not return preview_token.")

    note = f"{SMOKE_NOTE_PREFIX}{datetime.now().isoformat(timespec='seconds')}"
    created = create_report(
        client,
        refreshed_session.access_token,
        note=note,
        preview_token=preview_token,
    )

    assert_true(created["status"] == "pending", "POST /reports did not return normalized pending status.")
    assert_true(created["note"] == note, "Created report note mismatch.")
    assert_true(
        abs(float(created["latitude"]) - REPORT_LATITUDE) < 1e-9,
        "POST /reports trả về latitude không đúng dữ liệu đã gửi.",
    )
    assert_true(
        abs(float(created["longitude"]) - REPORT_LONGITUDE) < 1e-9,
        "POST /reports trả về longitude không đúng dữ liệu đã gửi.",
    )
    assert_true(
        abs(float(created["gps_accuracy"]) - REPORT_GPS_ACCURACY) < 1e-9,
        "POST /reports trả về gps_accuracy không đúng dữ liệu đã gửi.",
    )
    assert_true(
        created["location_source"] == REPORT_LOCATION_SOURCE,
        "POST /reports không trả về đúng location_source.",
    )

    report_id = created["id"]
    db_row = inspect_report_row(report_id)
    assert_true(
        abs(float(db_row["latitude"]) - REPORT_LATITUDE) < 1e-9,
        "Database lưu latitude sai.",
    )
    assert_true(
        abs(float(db_row["longitude"]) - REPORT_LONGITUDE) < 1e-9,
        "Database lưu longitude sai.",
    )
    assert_true(
        abs(float(db_row["gps_accuracy"]) - REPORT_GPS_ACCURACY) < 1e-9,
        "Database lưu gps_accuracy sai.",
    )
    assert_true(
        db_row["location_source"] == REPORT_LOCATION_SOURCE,
        "Database lưu location_source sai.",
    )
    assert_true(bool(db_row["location_recorded_at"]), "Database không lưu location_recorded_at.")
    assert_true(bool(db_row["image_path"]), "Database không lưu image_path.")

    history = fetch_history(client, refreshed_session.access_token)
    history_item = next((item for item in history["items"] if item["id"] == report_id), None)
    assert_true(history_item is not None, "Created report is missing from reporter history.")
    assert_true(history_item["status"] == "pending", "Reporter history status không đúng.")
    assert_true(history_item["note"] == note, "Reporter history note không đúng.")
    assert_true(
        abs(float(history_item["latitude"]) - REPORT_LATITUDE) < 1e-9,
        "Reporter history latitude không khớp DB.",
    )
    assert_true(
        abs(float(history_item["longitude"]) - REPORT_LONGITUDE) < 1e-9,
        "Reporter history longitude không khớp DB.",
    )

    detail = fetch_report_detail(client, refreshed_session.access_token, report_id)
    assert_true(detail["id"] == report_id, "Reporter detail did not return created report.")
    assert_true(detail["status"] == "pending", "Reporter detail status is not normalized.")
    assert_true(detail["ai_result"]["detections_count"] >= 0, "Reporter detail AI result is invalid.")
    assert_true(detail["note"] == note, "Reporter detail note không đúng.")
    assert_true(
        abs(float(detail["latitude"]) - REPORT_LATITUDE) < 1e-9,
        "Reporter detail latitude không khớp DB.",
    )
    assert_true(
        abs(float(detail["longitude"]) - REPORT_LONGITUDE) < 1e-9,
        "Reporter detail longitude không khớp DB.",
    )
    assert_true(
        detail["location_source"] == REPORT_LOCATION_SOURCE,
        "Reporter detail location_source không đúng.",
    )
    assert_true(
        detail["location_recorded_at"] == db_row["location_recorded_at"],
        "Reporter detail location_recorded_at không khớp DB.",
    )

    reporter_2 = login(client, REPORTER_2_EMAIL, REPORTER_2_PASSWORD)
    reporter_2_history = fetch_history(client, reporter_2.access_token)
    manual_review_report = next(
        (item for item in reporter_2_history["items"] if item["ai_status"] == "manual_review_required"),
        None,
    )
    assert_true(manual_review_report is not None, "Could not find manual review report for reporter 2.")
    manual_review_detail = fetch_report_detail(client, reporter_2.access_token, manual_review_report["id"])
    assert_true(
        manual_review_detail["ai_status"] == "manual_review_required",
        "Manual review report detail did not preserve fallback AI status.",
    )

    logout_result = logout(
        client,
        refreshed_session.refresh_token,
        refreshed_session.access_token,
    )
    assert_true(logout_result["success"] is True, "Reporter logout không thành công.")

    expect_status(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/reports/history?limit=10&offset=0",
        expected_status=401,
        headers=get_auth_headers(refreshed_session.access_token),
    )

    return {
        "created_report_id": report_id,
        "created_report_note": note,
        "created_report_latitude": REPORT_LATITUDE,
        "created_report_longitude": REPORT_LONGITUDE,
        "manual_review_report_id": manual_review_report["id"],
    }


def main() -> None:
    assert_true(UPLOAD_IMAGE_PATH.exists(), f"Upload image not found: {UPLOAD_IMAGE_PATH}")

    cleaned_before = cleanup_smoke_reports()
    reporter_result: dict[str, Any] | None = None

    try:
        with httpx.Client(timeout=30.0) as client:
            reporter_result = run_reporter_flow(client)
    finally:
        cleaned_after = cleanup_smoke_reports()

    print("=== REPORTER BEARER FLOW SMOKE RESULT ===")
    print(f"- Data scope tag: {SMOKE_TAG}")
    print(f"- Smoke reports cleaned before run: {cleaned_before}")
    print("Reporter bearer login + refresh rotation + logout revoke: PASS")
    print(f"- Created report id: {reporter_result['created_report_id']}")
    print(
        f"- Created report GPS: {reporter_result['created_report_latitude']}, "
        f"{reporter_result['created_report_longitude']}"
    )
    print(f"- Manual review report id: {reporter_result['manual_review_report_id']}")
    print("- Web admin cookie flow được test riêng tại: scripts/run_admin_cookie_flow_smoke.py")
    print(f"- Smoke reports cleaned after run: {cleaned_after}")


if __name__ == "__main__":
    main()
