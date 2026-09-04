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
from scripts.data_scopes import SMOKE_ADMIN_NOTE_PREFIX, SMOKE_TAG


BACKEND_BASE_URL = (
    os.getenv("BACKEND_API_URL")
    or os.getenv("EXPO_PUBLIC_API_URL")
    or os.getenv("VITE_API_URL")
    or "http://127.0.0.1:5000/api"
)
UPLOAD_IMAGE_PATH = Path(
    r"D:\DATN\Code\road-damage-gis\services\backend-api\uploads\reports\seed-report-001.png"
)
REPORTER_EMAIL = "reporter2.demo@roadgis.local"
REPORTER_PASSWORD = "Reporter@123"
ADMIN_EMAIL = "admin.demo@roadgis.local"
ADMIN_PASSWORD = "Admin@123"
ADMIN_CONTEXT_HEADER = {"X-Auth-Context": "web-admin"}
UPDATED_STATUS = "processing"
UPDATED_ADMIN_NOTE = f"{SMOKE_ADMIN_NOTE_PREFIX}E2E-05 manual review xử lý"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


class ManualReviewE2EFailure(RuntimeError):
    pass


@dataclass
class LoginResult:
    access_token: str
    refresh_token: str
    user: dict[str, Any]


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise ManualReviewE2EFailure(message)


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


def login_reporter(client: httpx.Client) -> LoginResult:
    response = request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/login",
        json={"email": REPORTER_EMAIL, "password": REPORTER_PASSWORD},
    )
    return LoginResult(
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


def preview_ai(client: httpx.Client, reporter_token: str) -> dict[str, Any]:
    with UPLOAD_IMAGE_PATH.open("rb") as image_file:
        return request_json(
            client,
            "POST",
            f"{BACKEND_BASE_URL}/reports/preview-ai",
            files={"image": (UPLOAD_IMAGE_PATH.name, image_file, "image/png")},
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


def fetch_admin_reports(client: httpx.Client, *, ai_status: str = "") -> dict[str, Any]:
    query = "?limit=50&offset=0"
    if ai_status:
        query += f"&ai_status={ai_status}"
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports{query}",
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


def count_reports() -> int:
    with get_connection() as connection:
        row = connection.execute("SELECT COUNT(*) AS total FROM reports").fetchone()
        return int(row["total"])


def find_existing_manual_review_report(connection: sqlite3.Connection, reporter_user_id: str) -> sqlite3.Row | None:
    return connection.execute(
        """
        SELECT id, status, ai_status, image_path, note, updated_at, created_at
        FROM reports
        WHERE user_id = ?
          AND ai_status = 'manual_review_required'
        ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC
        LIMIT 1
        """,
        (reporter_user_id,),
    ).fetchone()


def inspect_report_row(report_id: str) -> sqlite3.Row:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, status, ai_status, admin_note, created_at, updated_at, image_path
            FROM reports
            WHERE id = ?
            LIMIT 1
            """,
            (report_id,),
        ).fetchone()

    if row is None:
        raise ManualReviewE2EFailure("Không tìm thấy report manual review trong database.")

    return row


def run_manual_review_flow() -> dict[str, Any]:
    assert_true(UPLOAD_IMAGE_PATH.exists(), f"Thiếu ảnh test: {UPLOAD_IMAGE_PATH}")

    with httpx.Client(timeout=40.0) as reporter_client, httpx.Client(timeout=40.0) as admin_client:
        reporter = login_reporter(reporter_client)
        assert_true(reporter.user["role"] == "reporter", "Reporter login role mismatch.")

        count_before_preview = count_reports()
        preview = preview_ai(reporter_client, reporter.access_token)
        count_after_preview = count_reports()
        assert_true(
            count_after_preview == count_before_preview,
            "Chỉ preview AI mà database vẫn tăng report, tức là ảnh bị lưu sai trước khi người dùng xác nhận gửi.",
        )
        assert_true(
            "preview_token" in preview,
            "Preview AI không trả dữ liệu đúng để vào màn xác nhận.",
        )

        with get_connection() as connection:
            manual_review_row = find_existing_manual_review_report(connection, reporter.user["id"])

        assert_true(
            manual_review_row is not None,
            "Không tìm thấy report manual review để kiểm tra luồng Ảnh cần kiểm tra thêm.",
        )

        report_id = manual_review_row["id"]
        assert_true(bool(manual_review_row["image_path"]), "Report manual review không có ảnh lưu.")

        reporter_history = fetch_reporter_history(reporter_client, reporter.access_token)
        history_item = next((item for item in reporter_history["items"] if item["id"] == report_id), None)
        assert_true(history_item is not None, "Reporter history không thấy report manual review.")
        assert_true(
            history_item["ai_status"] == "manual_review_required",
            "Reporter history không giữ đúng ai_status cho report cần kiểm tra thêm.",
        )

        manual_group_items = [
            item for item in reporter_history["items"] if item.get("ai_status") == "manual_review_required"
        ]
        assert_true(
            any(item["id"] == report_id for item in manual_group_items),
            "Report manual review không đi đúng nhóm Ảnh cần kiểm tra thêm ở app người phản ánh.",
        )

        reporter_detail = fetch_reporter_detail(reporter_client, reporter.access_token, report_id)
        assert_true(
            reporter_detail["ai_status"] == "manual_review_required",
            "Reporter detail không phản ánh đúng trạng thái cần kiểm tra thêm.",
        )

        login_admin_with_cookie(admin_client)

        admin_manual_review_list = fetch_admin_reports(admin_client, ai_status="manual_review_required")
        admin_manual_item = next((item for item in admin_manual_review_list["items"] if item["id"] == report_id), None)
        assert_true(
            admin_manual_item is not None,
            "Web admin không thấy report trong nhóm Ảnh cần kiểm tra thêm.",
        )
        assert_true(
            admin_manual_item["ai_status"] == "manual_review_required",
            "Web admin list không phân biệt đúng report cần kiểm tra thủ công.",
        )

        admin_detail = fetch_admin_report_detail(admin_client, report_id)
        assert_true(admin_detail["id"] == report_id, "Web admin không mở được chi tiết report manual review.")
        assert_true(
            admin_detail["ai_status"] == "manual_review_required",
            "Web admin detail không giữ đúng ai_status manual review.",
        )

        original_status = admin_detail["status"]
        updated = update_status(admin_client, report_id, UPDATED_STATUS, UPDATED_ADMIN_NOTE)
        assert_true(updated["status"] == UPDATED_STATUS, "Quản lý không cập nhật được trạng thái report manual review.")
        assert_true(updated.get("admin_note") == UPDATED_ADMIN_NOTE, "Quản lý không lưu được ghi chú xử lý manual review.")

        admin_detail_after = fetch_admin_report_detail(admin_client, report_id)
        assert_true(
            admin_detail_after["status"] == UPDATED_STATUS,
            "Web admin detail chưa phản ánh đúng trạng thái mới của report manual review.",
        )

        reporter_detail_after = fetch_reporter_detail(reporter_client, reporter.access_token, report_id)
        assert_true(
            reporter_detail_after["status"] == UPDATED_STATUS,
            "App người phản ánh chưa nhận đúng trạng thái mới của report manual review sau khi quản lý xử lý.",
        )

        db_row_after = inspect_report_row(report_id)
        assert_true(
            db_row_after["ai_status"] == "manual_review_required",
            "Sau khi xử lý, report manual review bị đổi sai ai_status.",
        )
        assert_true(
            db_row_after["status"] in ("processing", "in_progress", "verified"),
            "Database chưa lưu đúng trạng thái xử lý mới cho report manual review.",
        )
        assert_true(
            db_row_after["admin_note"] == UPDATED_ADMIN_NOTE,
            "Database chưa lưu admin_note cho report manual review.",
        )

        # rollback để không làm bẩn seed/runtime sau khi test
        rollback_note = f"{SMOKE_ADMIN_NOTE_PREFIX}E2E-05 rollback {datetime.now().isoformat(timespec='seconds')}"
        rolled_back = update_status(admin_client, report_id, original_status, rollback_note)
        assert_true(
            rolled_back["status"] == original_status,
            "Không rollback được trạng thái gốc của report manual review sau test.",
        )

        return {
            "report_id": report_id,
            "original_status": original_status,
            "updated_status": UPDATED_STATUS,
            "manual_review_count": len(admin_manual_review_list["items"]),
        }


def main() -> None:
    result = run_manual_review_flow()
    print("=== E2E-05 MANUAL REVIEW RESULT ===")
    print(f"- Data scope tag: {SMOKE_TAG}")
    print("Preview-only không tạo report mới: PASS")
    print("App người phản ánh đưa đúng vào nhóm Ảnh cần kiểm tra thêm: PASS")
    print("Web admin thấy đúng report cần kiểm tra thủ công: PASS")
    print("Quản lý mở chi tiết và xử lý bình thường: PASS")
    print(f"- Report id: {result['report_id']}")
    print(f"- Original status: {result['original_status']}")
    print(f"- Updated status during test: {result['updated_status']}")
    print(f"- Manual review items visible in admin list: {result['manual_review_count']}")


if __name__ == "__main__":
    main()
