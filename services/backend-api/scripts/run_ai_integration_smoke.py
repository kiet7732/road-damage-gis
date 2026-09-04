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
AI_SERVICE_BASE_URL = (
    os.getenv("AI_SERVICE_URL")
    or "http://127.0.0.1:8001"
)
UPLOAD_IMAGE_PATH = Path(
    r"D:\DATN\Code\road-damage-gis\services\backend-api\uploads\reports\seed-report-001.png"
)
REPORTER_EMAIL = "reporter1.demo@roadgis.local"
REPORTER_PASSWORD = "Reporter@123"

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


class AiIntegrationSmokeFailure(RuntimeError):
    pass


@dataclass
class LoginResult:
    access_token: str
    user: dict[str, Any]


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AiIntegrationSmokeFailure(message)


def request_json(
    client: httpx.Client,
    method: str,
    url: str,
    **kwargs: Any,
) -> Any:
    response = client.request(method, url, **kwargs)
    response.raise_for_status()
    return response.json()


def get_auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def login(client: httpx.Client) -> LoginResult:
    response = request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/login",
        json={"email": REPORTER_EMAIL, "password": REPORTER_PASSWORD},
    )
    return LoginResult(
        access_token=response["accessToken"],
        user=response["user"],
    )


def cleanup_smoke_reports() -> int:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, image_path
            FROM reports
            WHERE note LIKE ?
            ORDER BY created_at ASC
            """,
            (f"{SMOKE_NOTE_PREFIX}[ai-integration]%",),
        ).fetchall()

        if not rows:
            return 0

        report_ids = [row["id"] for row in rows]
        for row in rows:
            image_path = row["image_path"]
            if image_path:
                image_file = (BACKEND_SERVICE_DIR / image_path).resolve()
                if image_file.exists():
                    image_file.unlink()

        placeholders = ",".join("?" for _ in report_ids)
        connection.execute(
            f"DELETE FROM reports WHERE id IN ({placeholders})",
            report_ids,
        )
        connection.commit()
        return len(report_ids)


def check_service_health(client: httpx.Client) -> None:
    backend_health = request_json(client, "GET", f"{BACKEND_BASE_URL.removesuffix('/api')}/health")
    ai_ready = request_json(client, "GET", f"{AI_SERVICE_BASE_URL}/ready")
    assert_true(backend_health["status"] == "ok", "Backend health không sẵn sàng.")
    assert_true(ai_ready["ready"] is True, "AI service chưa sẵn sàng.")


def preview_ai(client: httpx.Client, token: str) -> dict[str, Any]:
    with UPLOAD_IMAGE_PATH.open("rb") as image_file:
        return request_json(
            client,
            "POST",
            f"{BACKEND_BASE_URL}/reports/preview-ai",
            files={"image": (UPLOAD_IMAGE_PATH.name, image_file, "image/png")},
            headers=get_auth_headers(token),
        )


def create_report(client: httpx.Client, token: str, *, preview_token: str | None, note: str) -> dict[str, Any]:
    with UPLOAD_IMAGE_PATH.open("rb") as image_file:
        data = {
            "latitude": "10.782345",
            "longitude": "106.699876",
            "gps_accuracy": "9.5",
            "location_source": "camera_gps",
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


def fetch_report_detail(client: httpx.Client, token: str, report_id: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/reports/{report_id}",
        headers=get_auth_headers(token),
    )


def inspect_report_row(report_id: str) -> sqlite3.Row:
    with get_connection() as connection:
        row = connection.execute(
            """
            SELECT id, ai_status, ai_message, detections_json, status
            FROM reports
            WHERE id = ?
            """,
            (report_id,),
        ).fetchone()

    if row is None:
        raise AiIntegrationSmokeFailure("Không tìm thấy report vừa tạo trong database.")

    return row


def main() -> None:
    assert_true(UPLOAD_IMAGE_PATH.exists(), f"Thiếu ảnh test: {UPLOAD_IMAGE_PATH}")

    cleaned_before = cleanup_smoke_reports()
    created_report_id: str | None = None

    try:
        with httpx.Client(timeout=40.0) as client:
            check_service_health(client)
            login_result = login(client)
            preview_result = preview_ai(client, login_result.access_token)
            preview_token = preview_result.get("preview_token")

            note = f"{SMOKE_NOTE_PREFIX}[ai-integration] {datetime.now().isoformat(timespec='seconds')}"
            created_report = create_report(
                client,
                login_result.access_token,
                preview_token=preview_token,
                note=note,
            )
            created_report_id = created_report["id"]

            assert_true(created_report["status"] == "pending", "Status report mới không được normalize đúng.")
            assert_true(created_report["ai_status"] == "success", "AI service đang sẵn sàng nhưng report không lưu ai_status=success.")
            assert_true(created_report["ai_result"]["success"] is True, "Kết quả AI trong response tạo report không hợp lệ.")

            detail = fetch_report_detail(client, login_result.access_token, created_report_id)
            assert_true(detail["id"] == created_report_id, "Detail report không khớp report vừa tạo.")
            assert_true(detail["ai_status"] == "success", "Detail report không giữ đúng ai_status.")

            row = inspect_report_row(created_report_id)
            assert_true(row["ai_status"] == "success", "DB không lưu đúng ai_status từ AI service.")
            assert_true(bool(row["detections_json"]), "DB không lưu detections_json.")
    finally:
        cleaned_after = cleanup_smoke_reports()

    print("=== AI INTEGRATION SMOKE RESULT ===")
    print(f"- Data scope tag: {SMOKE_TAG}")
    print(f"- Smoke reports cleaned before run: {cleaned_before}")
    print("Backend -> AI service detect flow: PASS")
    print(f"- Created report id: {created_report_id}")
    print("AI result persisted into report: PASS")
    print("Fallback logic vẫn nằm trong create_report nếu AI service lỗi hoặc timeout.")
    print(f"- Smoke reports cleaned after run: {cleaned_after}")


if __name__ == "__main__":
    main()
