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
REPORTER_EMAIL = "reporter1.demo@roadgis.local"
REPORTER_PASSWORD = "Reporter@123"
ADMIN_EMAIL = "admin.demo@roadgis.local"
ADMIN_PASSWORD = "Admin@123"
ADMIN_CONTEXT_HEADER = {"X-Auth-Context": "web-admin"}
UPDATED_STATUS = "processing"
UPDATED_ADMIN_NOTE = f"{SMOKE_NOTE_PREFIX}E2E-04 admin cập nhật trạng thái"
REPORT_LATITUDE = 10.98468010973337
REPORT_LONGITUDE = 106.67808022561869
REPORT_GPS_ACCURACY = 6.0
REPORT_LOCATION_SOURCE = "camera_gps"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


class AdminStatusToMobileE2EFailure(RuntimeError):
    pass


@dataclass
class ReporterLoginResult:
    access_token: str
    refresh_token: str
    user: dict[str, Any]


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AdminStatusToMobileE2EFailure(message)


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


def cleanup_smoke_reports() -> int:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, image_path
            FROM reports
            WHERE note LIKE ?
            ORDER BY created_at ASC
            """,
            (f"{SMOKE_NOTE_PREFIX}E2E-04%",),
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
            SELECT id, status, admin_note, created_at, updated_at
            FROM reports
            WHERE id = ?
            LIMIT 1
            """,
            (report_id,),
        ).fetchone()

    if row is None:
        raise AdminStatusToMobileE2EFailure("Không tìm thấy report trong database.")

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


def refresh_reporter_session(client: httpx.Client, refresh_token: str) -> ReporterLoginResult:
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


def login_admin_with_cookie(client: httpx.Client) -> dict[str, Any]:
    response = request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers=ADMIN_CONTEXT_HEADER,
    )
    assert_true(response["user"]["role"] == "admin", "Admin login role mismatch.")
    return response


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


def fetch_admin_report_detail(client: httpx.Client, report_id: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports/{report_id}",
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


def get_processing_update_title(status: str) -> str:
    if status == "pending":
        return "Đã tiếp nhận phản ánh"
    if status == "processing":
        return "Đã xác minh phản ánh"
    if status == "repaired":
        return "Đã xử lý xong phản ánh"
    if status == "rejected":
        return "Đã từ chối phản ánh"
    return "Đã cập nhật phản ánh"


def build_processing_updates(history_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    updates: list[dict[str, Any]] = []

    for item in history_items:
        updated_at_raw = item.get("updated_at") or ""
        created_at_raw = item.get("created_at") or ""
        has_meaningful_update = bool(updated_at_raw) and bool(created_at_raw) and updated_at_raw != created_at_raw

        if not has_meaningful_update:
            continue

        sort_time = 0
        try:
            sort_time = int(datetime.fromisoformat(updated_at_raw.replace("Z", "+00:00")).timestamp())
        except ValueError:
            sort_time = 0

        updates.append(
            {
                "report_id": item["id"],
                "status": item["status"],
                "status_title": get_processing_update_title(item["status"]),
                "updated_at_raw": updated_at_raw,
                "created_at_raw": created_at_raw,
                "sort_time": sort_time,
            }
        )

    updates.sort(key=lambda entry: entry["sort_time"], reverse=True)
    return updates


def run_admin_status_to_mobile_flow() -> dict[str, Any]:
    assert_true(UPLOAD_IMAGE_PATH.exists(), f"Thiếu ảnh test: {UPLOAD_IMAGE_PATH}")

    with httpx.Client(timeout=40.0) as reporter_client, httpx.Client(timeout=40.0) as admin_client:
        reporter = login_reporter(reporter_client)
        refreshed_reporter = refresh_reporter_session(reporter_client, reporter.refresh_token)
        assert_true(refreshed_reporter.user["role"] == "reporter", "Reporter refresh role mismatch.")

        preview = preview_ai(reporter_client, refreshed_reporter.access_token)
        preview_token = preview.get("preview_token")
        assert_true(bool(preview_token), "Preview AI không trả preview_token.")

        note = f"{SMOKE_NOTE_PREFIX}E2E-04 {datetime.now().isoformat(timespec='seconds')}"
        created_report = create_report(
            reporter_client,
            refreshed_reporter.access_token,
            note=note,
            preview_token=preview_token,
        )
        report_id = created_report["id"]
        assert_true(created_report["status"] == "pending", "Create report không normalize status về pending.")

        reporter_history_before = fetch_reporter_history(reporter_client, refreshed_reporter.access_token)
        reporter_history_item_before = next((item for item in reporter_history_before["items"] if item["id"] == report_id), None)
        assert_true(reporter_history_item_before is not None, "Reporter history không thấy report vừa tạo.")
        assert_true(reporter_history_item_before["status"] == "pending", "Reporter history ban đầu không đúng pending.")

        updates_before = build_processing_updates(reporter_history_before["items"])
        assert_true(
            all(entry["report_id"] != report_id for entry in updates_before),
            "Report mới tạo không được xuất hiện ở Cập nhật xử lý trước khi quản lý đổi trạng thái.",
        )

        login_admin_with_cookie(admin_client)
        admin_detail_before = fetch_admin_report_detail(admin_client, report_id)
        assert_true(admin_detail_before["status"] == "pending", "Admin detail ban đầu không đúng pending.")

        updated_status = update_status(admin_client, report_id, UPDATED_STATUS, UPDATED_ADMIN_NOTE)
        assert_true(updated_status["status"] == UPDATED_STATUS, "Admin update status không thành công.")
        assert_true(updated_status.get("admin_note") == UPDATED_ADMIN_NOTE, "Admin note không lưu đúng.")

        admin_detail_after = fetch_admin_report_detail(admin_client, report_id)
        assert_true(admin_detail_after["status"] == UPDATED_STATUS, "Admin detail chưa phản ánh status mới.")

        reporter_history_after = fetch_reporter_history(reporter_client, refreshed_reporter.access_token)
        reporter_history_item_after = next((item for item in reporter_history_after["items"] if item["id"] == report_id), None)
        assert_true(reporter_history_item_after is not None, "Reporter history không còn thấy report sau update.")
        assert_true(
            reporter_history_item_after["status"] == UPDATED_STATUS,
            "Reporter history chưa phản ánh trạng thái mới từ quản lý.",
        )

        reporter_detail_after = fetch_reporter_detail(reporter_client, refreshed_reporter.access_token, report_id)
        assert_true(
            reporter_detail_after["status"] == UPDATED_STATUS,
            "Reporter detail chưa phản ánh trạng thái mới từ quản lý.",
        )

        updates_after = build_processing_updates(reporter_history_after["items"])
        updated_entry = next((entry for entry in updates_after if entry["report_id"] == report_id), None)
        assert_true(updated_entry is not None, "Màn Cập nhật xử lý sẽ không hiển thị report vừa được quản lý đổi trạng thái.")
        assert_true(
            updated_entry["status"] == UPDATED_STATUS,
            "Màn Cập nhật xử lý sẽ hiển thị sai badge trạng thái.",
        )
        assert_true(
            updated_entry["status_title"] == "Đã xác minh phản ánh",
            "Màn Cập nhật xử lý sẽ hiển thị sai nội dung nghiệp vụ sau khi đổi sang Đang xử lý.",
        )
        assert_true(
            updated_entry["updated_at_raw"] != updated_entry["created_at_raw"],
            "Report đã đổi trạng thái nhưng updated_at chưa thay đổi nên màn Cập nhật xử lý sẽ không nhận ra.",
        )

        db_row = inspect_report_row(report_id)
        assert_true(db_row["status"] in ("processing", "in_progress", "verified"), "Database chưa lưu trạng thái xử lý cuối.")
        assert_true(db_row["admin_note"] == UPDATED_ADMIN_NOTE, "Database chưa lưu admin_note cuối.")
        assert_true(db_row["created_at"] != db_row["updated_at"], "Database updated_at chưa thay đổi sau cập nhật trạng thái.")

        return {
            "report_id": report_id,
            "final_status": UPDATED_STATUS,
            "processing_update_title": updated_entry["status_title"],
        }


def main() -> None:
    cleaned_before = cleanup_smoke_reports()
    result: dict[str, Any] | None = None

    try:
        result = run_admin_status_to_mobile_flow()
    finally:
        cleaned_after = cleanup_smoke_reports()

    print("=== E2E-04 ADMIN STATUS TO MOBILE RESULT ===")
    print(f"- Data scope tag: {SMOKE_TAG}")
    print(f"- Smoke reports cleaned before run: {cleaned_before}")
    print("Web admin cập nhật trạng thái: PASS")
    print("Mobile history nhận trạng thái mới: PASS")
    print("Mobile detail nhận trạng thái mới: PASS")
    print("Màn Cập nhật xử lý chỉ nhận report đã đổi nghiệp vụ: PASS")
    print(f"- Report id: {result['report_id']}")
    print(f"- Final status: {result['final_status']}")
    print(f"- Processing update title: {result['processing_update_title']}")
    print(f"- Smoke reports cleaned after run: {cleaned_after}")


if __name__ == "__main__":
    main()
