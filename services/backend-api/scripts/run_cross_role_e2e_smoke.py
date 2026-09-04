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

from app.config import get_settings
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
REPORTER_EMAIL = "reporter1.demo@roadgis.local"
REPORTER_PASSWORD = "Reporter@123"
ADMIN_EMAIL = "admin.demo@roadgis.local"
ADMIN_PASSWORD = "Admin@123"
ADMIN_CONTEXT_HEADER = {"X-Auth-Context": "web-admin"}
REPORT_LATITUDE = 10.782345
REPORT_LONGITUDE = 106.699876
REPORT_GPS_ACCURACY = 9.5
REPORT_LOCATION_SOURCE = "camera_gps"
UPDATED_DAMAGE_TYPE = "D20"
UPDATED_STATUS = "processing"
UPDATED_ADMIN_NOTE = f"{SMOKE_NOTE_PREFIX}Cross-role admin xử lý"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


class CrossRoleE2ETestFailure(RuntimeError):
    pass


@dataclass
class ReporterLoginResult:
    access_token: str
    refresh_token: str
    user: dict[str, Any]


@dataclass
class AdminLoginResult:
    user: dict[str, Any]
    access_cookie_name: str
    refresh_cookie_name: str


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise CrossRoleE2ETestFailure(message)


def assert_no_bearer_header(headers: dict[str, str] | None) -> None:
    if not headers:
        return

    assert_true(
        "Authorization" not in headers,
        "Admin cookie flow không được phép dùng Authorization header.",
    )


def request_json(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    **kwargs: Any,
) -> Any:
    if headers and headers.get("X-Auth-Context") == "web-admin":
        assert_no_bearer_header(headers)

    response = client.request(method, url, headers=headers, **kwargs)
    response.raise_for_status()
    return response.json()


def get_auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def cleanup_smoke_reports() -> int:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, image_path
            FROM reports
            WHERE note LIKE ?
            ORDER BY created_at ASC
            """,
            (f"{SMOKE_NOTE_PREFIX}%",),
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
                location_source,
                location_recorded_at,
                note,
                corrected_damage_type,
                admin_note,
                ai_status,
                status
            FROM reports
            WHERE id = ?
            LIMIT 1
            """,
            (report_id,),
        ).fetchone()

    if row is None:
        raise CrossRoleE2ETestFailure("Không tìm thấy report liên thông trong database.")

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


def refresh_reporter_session(
    client: httpx.Client, refresh_token: str
) -> ReporterLoginResult:
    response = request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/refresh",
        json={"refreshToken": refresh_token},
    )
    return ReporterLoginResult(
        access_token=response["accessToken"],
        refresh_token=response["refreshToken"],
        user=response["user"],
    )


def login_admin_with_cookie(client: httpx.Client) -> AdminLoginResult:
    settings = get_settings()
    response = request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers=ADMIN_CONTEXT_HEADER,
    )
    assert_true(response["user"]["role"] == "admin", "Admin login role mismatch.")
    assert_true(
        settings.web_access_cookie_name in client.cookies,
        "Admin login không set access cookie.",
    )
    assert_true(
        settings.web_refresh_cookie_name in client.cookies,
        "Admin login không set refresh cookie.",
    )
    return AdminLoginResult(
        user=response["user"],
        access_cookie_name=settings.web_access_cookie_name,
        refresh_cookie_name=settings.web_refresh_cookie_name,
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
    reporter_token: str,
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
            headers=get_auth_headers(reporter_token),
        )


def fetch_reporter_history(client: httpx.Client, token: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/reports/history?limit=50&offset=0",
        headers=get_auth_headers(token),
    )


def fetch_reporter_detail(client: httpx.Client, token: str, report_id: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/reports/{report_id}",
        headers=get_auth_headers(token),
    )


def fetch_admin_dashboard(client: httpx.Client) -> dict[str, Any]:
    return request_json(client, "GET", f"{BACKEND_BASE_URL}/admin/dashboard")


def fetch_admin_reports(client: httpx.Client) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports?limit=50&offset=0",
    )


def fetch_admin_report_detail(client: httpx.Client, report_id: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports/{report_id}",
    )


def fetch_admin_map(client: httpx.Client) -> dict[str, Any]:
    params = (
        f"?min_latitude={REPORT_LATITUDE - 0.02}"
        f"&min_longitude={REPORT_LONGITUDE - 0.02}"
        f"&max_latitude={REPORT_LATITUDE + 0.02}"
        f"&max_longitude={REPORT_LONGITUDE + 0.02}"
        "&limit=200"
    )
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/gis/reports{params}",
    )


def update_damage_type(client: httpx.Client, report_id: str, corrected_damage_type: str) -> dict[str, Any]:
    return request_json(
        client,
        "PATCH",
        f"{BACKEND_BASE_URL}/admin/reports/{report_id}/damage-type",
        json={
            "corrected_damage_type": corrected_damage_type,
            "is_ai_overridden": True,
        },
    )


def update_status(client: httpx.Client, report_id: str, status_value: str, admin_note: str) -> dict[str, Any]:
    return request_json(
        client,
        "PATCH",
        f"{BACKEND_BASE_URL}/admin/reports/{report_id}/status",
        json={
            "status": status_value,
            "admin_note": admin_note,
        },
    )


def logout_reporter(client: httpx.Client, refresh_token: str, access_token: str) -> dict[str, Any]:
    return request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/logout",
        json={"refreshToken": refresh_token},
        headers=get_auth_headers(access_token),
    )


def logout_admin(client: httpx.Client) -> dict[str, Any]:
    return request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/logout",
        json={},
        headers=ADMIN_CONTEXT_HEADER,
    )


def run_cross_role_flow() -> dict[str, Any]:
    assert_true(UPLOAD_IMAGE_PATH.exists(), f"Thiếu ảnh test: {UPLOAD_IMAGE_PATH}")

    with httpx.Client(timeout=40.0) as reporter_client, httpx.Client(timeout=40.0) as admin_client:
        reporter = login_reporter(reporter_client)
        assert_true(reporter.user["role"] == "reporter", "Reporter login role mismatch.")

        refreshed_reporter = refresh_reporter_session(reporter_client, reporter.refresh_token)
        preview = preview_ai(reporter_client, refreshed_reporter.access_token)
        preview_token = preview.get("preview_token")
        assert_true(bool(preview_token), "Reporter preview không trả preview_token.")

        note = f"{SMOKE_NOTE_PREFIX}Cross-role {datetime.now().isoformat(timespec='seconds')}"
        created_report = create_report(
            reporter_client,
            refreshed_reporter.access_token,
            note=note,
            preview_token=preview_token,
        )
        report_id = created_report["id"]
        assert_true(created_report["status"] == "pending", "Reporter create report không normalize status về pending.")

        initial_detail = fetch_reporter_detail(reporter_client, refreshed_reporter.access_token, report_id)
        assert_true(initial_detail["status"] == "pending", "Reporter detail ban đầu không ở trạng thái pending.")

        admin_login = login_admin_with_cookie(admin_client)
        assert_true(admin_login.user["role"] == "admin", "Admin cookie login role mismatch.")

        dashboard_before = fetch_admin_dashboard(admin_client)
        list_before = fetch_admin_reports(admin_client)
        list_item_before = next((item for item in list_before["items"] if item["id"] == report_id), None)
        assert_true(list_item_before is not None, "Admin list không thấy report reporter vừa gửi.")

        map_before = fetch_admin_map(admin_client)
        map_feature_before = next((feature for feature in map_before.get("features", []) if feature["id"] == report_id), None)
        assert_true(map_feature_before is not None, "Admin map không thấy report reporter vừa gửi.")

        admin_detail_before = fetch_admin_report_detail(admin_client, report_id)
        assert_true(admin_detail_before["status"] == "pending", "Admin detail ban đầu không đúng status pending.")

        updated_damage = update_damage_type(admin_client, report_id, UPDATED_DAMAGE_TYPE)
        assert_true(
            updated_damage["corrected_damage_type"] == UPDATED_DAMAGE_TYPE,
            "Admin update corrected_damage_type không thành công.",
        )

        updated_status = update_status(admin_client, report_id, UPDATED_STATUS, UPDATED_ADMIN_NOTE)
        assert_true(updated_status["status"] == UPDATED_STATUS, "Admin update status không thành công.")
        assert_true(
            updated_status.get("admin_note") == UPDATED_ADMIN_NOTE,
            "Admin update admin_note không thành công.",
        )

        dashboard_after = fetch_admin_dashboard(admin_client)
        list_after = fetch_admin_reports(admin_client)
        list_item_after = next((item for item in list_after["items"] if item["id"] == report_id), None)
        assert_true(list_item_after is not None, "Sau update, admin list không còn thấy report.")
        assert_true(list_item_after["status"] == UPDATED_STATUS, "Admin list không đồng bộ status sau update.")
        assert_true(
            list_item_after["corrected_damage_type"] == UPDATED_DAMAGE_TYPE,
            "Admin list không đồng bộ corrected_damage_type sau update.",
        )

        map_after = fetch_admin_map(admin_client)
        map_feature_after = next((feature for feature in map_after.get("features", []) if feature["id"] == report_id), None)
        assert_true(map_feature_after is not None, "Sau update, admin map không còn thấy report.")
        map_properties_after = map_feature_after["properties"]
        assert_true(map_properties_after["status"] == UPDATED_STATUS, "Admin map không đồng bộ status sau update.")
        assert_true(
            map_properties_after["corrected_damage_type"] == UPDATED_DAMAGE_TYPE,
            "Admin map không đồng bộ corrected_damage_type sau update.",
        )

        admin_detail_after = fetch_admin_report_detail(admin_client, report_id)
        assert_true(admin_detail_after["status"] == UPDATED_STATUS, "Admin detail không đồng bộ status sau update.")
        assert_true(
            admin_detail_after["corrected_damage_type"] == UPDATED_DAMAGE_TYPE,
            "Admin detail không đồng bộ corrected_damage_type sau update.",
        )
        assert_true(
            admin_detail_after.get("admin_note") == UPDATED_ADMIN_NOTE,
            "Admin detail không đồng bộ admin_note sau update.",
        )

        reporter_history_after = fetch_reporter_history(reporter_client, refreshed_reporter.access_token)
        reporter_history_item_after = next(
            (item for item in reporter_history_after["items"] if item["id"] == report_id),
            None,
        )
        assert_true(reporter_history_item_after is not None, "Reporter history không thấy lại report sau khi admin xử lý.")
        assert_true(
            reporter_history_item_after["status"] == UPDATED_STATUS,
            "Reporter history chưa phản ánh trạng thái mới sau khi admin xử lý.",
        )
        assert_true(
            reporter_history_item_after["corrected_damage_type"] == UPDATED_DAMAGE_TYPE,
            "Reporter history chưa phản ánh loại hư hỏng cuối sau khi admin hiệu chỉnh.",
        )

        reporter_detail_after = fetch_reporter_detail(reporter_client, refreshed_reporter.access_token, report_id)
        assert_true(
            reporter_detail_after["status"] == UPDATED_STATUS,
            "Reporter detail chưa phản ánh trạng thái mới sau khi admin xử lý.",
        )
        assert_true(
            reporter_detail_after["corrected_damage_type"] == UPDATED_DAMAGE_TYPE,
            "Reporter detail chưa phản ánh loại hư hỏng cuối sau khi admin hiệu chỉnh.",
        )

        db_row = inspect_report_row(report_id)
        assert_true(db_row["status"] in ("processing", "in_progress", "verified"), "Database chưa lưu trạng thái xử lý cuối.")
        assert_true(
            db_row["corrected_damage_type"] == UPDATED_DAMAGE_TYPE,
            "Database chưa lưu corrected_damage_type cuối.",
        )
        assert_true(db_row["admin_note"] == UPDATED_ADMIN_NOTE, "Database chưa lưu admin_note cuối.")

        processing_before = next(
            (item for item in dashboard_before.get("kpis", []) if item.get("key") == "processing"),
            None,
        )
        processing_after = next(
            (item for item in dashboard_after.get("kpis", []) if item.get("key") == "processing"),
            None,
        )
        if processing_before and processing_after:
            assert_true(
                int(processing_after["value"]) >= int(processing_before["value"]),
                "Dashboard không phản ánh KPI processing sau khi admin xử lý report.",
            )

        reporter_logout = logout_reporter(
            reporter_client,
            refreshed_reporter.refresh_token,
            refreshed_reporter.access_token,
        )
        assert_true(reporter_logout["success"] is True, "Reporter logout không thành công.")

        admin_logout = logout_admin(admin_client)
        assert_true(admin_logout["success"] is True, "Admin logout không thành công.")

        return {
            "report_id": report_id,
            "final_status": UPDATED_STATUS,
            "final_damage_type": UPDATED_DAMAGE_TYPE,
        }


def main() -> None:
    cleaned_before = cleanup_smoke_reports()
    result: dict[str, Any] | None = None

    try:
        result = run_cross_role_flow()
    finally:
        cleaned_after = cleanup_smoke_reports()

    print("=== CROSS ROLE E2E SMOKE RESULT ===")
    print(f"- Data scope tag: {SMOKE_TAG}")
    print(f"- Smoke reports cleaned before run: {cleaned_before}")
    print("Reporter gửi phản ánh thật: PASS")
    print("Admin xử lý trên dữ liệu thật: PASS")
    print("Reporter xem lại kết quả cuối: PASS")
    print(f"- Report id: {result['report_id']}")
    print(f"- Final status: {result['final_status']}")
    print(f"- Final corrected damage type: {result['final_damage_type']}")
    print(f"- Smoke reports cleaned after run: {cleaned_after}")


if __name__ == "__main__":
    main()
