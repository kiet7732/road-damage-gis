from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
import sys
from typing import Any

import httpx


BACKEND_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_SERVICE_DIR))

from app.config import get_settings
from scripts.data_scopes import SMOKE_ADMIN_NOTE_PREFIX, SMOKE_TAG


BACKEND_BASE_URL = (
    os.getenv("BACKEND_API_URL")
    or os.getenv("EXPO_PUBLIC_API_URL")
    or os.getenv("VITE_API_URL")
    or "http://127.0.0.1:5000/api"
)
ADMIN_EMAIL = "admin.demo@roadgis.local"
ADMIN_PASSWORD = "Admin@123"
ADMIN_CONTEXT_HEADER = {"X-Auth-Context": "web-admin"}
TARGET_REPORT_ID = "seed-report-005"
UPDATED_DAMAGE_TYPE = "D10"
UPDATED_STATUS = "processing"
UPDATED_ADMIN_NOTE = SMOKE_ADMIN_NOTE_PREFIX

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


class E2ETestFailure(RuntimeError):
    pass


@dataclass
class CookieFlowLoginResult:
    user: dict[str, Any]
    access_cookie_name: str
    refresh_cookie_name: str


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise E2ETestFailure(message)


def assert_no_bearer_header(headers: dict[str, str] | None) -> None:
    if not headers:
        return

    assert_true(
        "Authorization" not in headers,
        "Admin cookie flow smoke test không được dùng Authorization header.",
    )


def request_json(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    **kwargs: Any,
) -> Any:
    assert_no_bearer_header(headers)
    response = client.request(method, url, headers=headers, **kwargs)
    response.raise_for_status()
    return response.json()


def request_json_expect_status(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    expected_status: int,
    headers: dict[str, str] | None = None,
    **kwargs: Any,
) -> Any:
    assert_no_bearer_header(headers)
    response = client.request(method, url, headers=headers, **kwargs)
    assert_true(
        response.status_code == expected_status,
        f"Expected HTTP {expected_status} nhưng nhận {response.status_code} tại {url}.",
    )
    if response.content:
        return response.json()
    return None


def login_admin_with_cookie(client: httpx.Client) -> CookieFlowLoginResult:
    settings = get_settings()
    payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    response = request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/login",
        json=payload,
        headers=ADMIN_CONTEXT_HEADER,
    )

    assert_true(response["user"]["role"] == "admin", "Admin login role mismatch.")
    assert_true(
        settings.web_access_cookie_name in client.cookies,
        "Login web-admin không set access cookie.",
    )
    assert_true(
        settings.web_refresh_cookie_name in client.cookies,
        "Login web-admin không set refresh cookie.",
    )

    return CookieFlowLoginResult(
        user=response["user"],
        access_cookie_name=settings.web_access_cookie_name,
        refresh_cookie_name=settings.web_refresh_cookie_name,
    )


def fetch_auth_me(client: httpx.Client) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/auth/me",
        headers=ADMIN_CONTEXT_HEADER,
    )


def refresh_cookie_session(client: httpx.Client) -> dict[str, Any]:
    return request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/refresh",
        json={},
        headers=ADMIN_CONTEXT_HEADER,
    )


def fetch_dashboard(client: httpx.Client) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/dashboard",
    )


def fetch_admin_reports(client: httpx.Client) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports?limit=20&offset=0",
    )


def fetch_admin_report_detail(client: httpx.Client, report_id: str) -> dict[str, Any]:
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports/{report_id}",
    )


def fetch_admin_map(client: httpx.Client) -> dict[str, Any]:
    params = (
        "?min_latitude=10.70"
        "&min_longitude=106.50"
        "&max_latitude=11.10"
        "&max_longitude=106.90"
        "&limit=200"
    )
    return request_json(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/gis/reports{params}",
    )


def update_damage_type(client: httpx.Client, report_id: str, corrected_damage_type: str) -> dict[str, Any]:
    payload = {
        "corrected_damage_type": corrected_damage_type,
        "is_ai_overridden": True,
    }
    return request_json(
        client,
        "PATCH",
        f"{BACKEND_BASE_URL}/admin/reports/{report_id}/damage-type",
        json=payload,
    )


def update_status(client: httpx.Client, report_id: str, status_value: str, admin_note: str | None) -> dict[str, Any]:
    payload = {
        "status": status_value,
        "admin_note": admin_note,
    }
    return request_json(
        client,
        "PATCH",
        f"{BACKEND_BASE_URL}/admin/reports/{report_id}/status",
        json=payload,
    )


def logout(client: httpx.Client) -> dict[str, Any]:
    return request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/logout",
        json={},
        headers=ADMIN_CONTEXT_HEADER,
    )


def run_cookie_flow(client: httpx.Client) -> dict[str, Any]:
    login_result = login_admin_with_cookie(client)

    me = fetch_auth_me(client)
    assert_true(me["id"] == login_result.user["id"], "Cookie session /auth/me không trả đúng admin.")

    refreshed_session = refresh_cookie_session(client)
    assert_true(
        refreshed_session["user"]["id"] == login_result.user["id"],
        "Refresh cookie session không trả về đúng admin.",
    )

    dashboard = fetch_dashboard(client)
    assert_true(dashboard["total_reports"] > 0, "Dashboard total_reports phải lớn hơn 0.")
    original_processing_kpi = next(
        (item for item in dashboard.get("kpis", []) if item.get("key") == "processing"),
        None,
    )
    assert_true(original_processing_kpi is not None, "Dashboard thiếu KPI processing.")
    original_processing_count = int(original_processing_kpi["value"])

    report_list = fetch_admin_reports(client)
    target_list_item = next(
        (item for item in report_list["items"] if item["id"] == TARGET_REPORT_ID),
        None,
    )
    assert_true(target_list_item is not None, "Admin report list không chứa report seed mục tiêu.")

    gis_payload = fetch_admin_map(client)
    target_map_feature = next(
        (feature for feature in gis_payload.get("features", []) if feature["id"] == TARGET_REPORT_ID),
        None,
    )
    assert_true(target_map_feature is not None, "Admin GIS map không chứa report seed mục tiêu.")

    original_detail = fetch_admin_report_detail(client, TARGET_REPORT_ID)
    original_corrected_type = original_detail.get("corrected_damage_type")
    original_status = original_detail.get("status")
    original_admin_note = original_detail.get("admin_note")

    assert_true(
        original_corrected_type is not None,
        "Report seed mục tiêu phải có corrected_damage_type để restore deterministic.",
    )

    try:
        updated_damage = update_damage_type(client, TARGET_REPORT_ID, UPDATED_DAMAGE_TYPE)
        assert_true(
            updated_damage["corrected_damage_type"] == UPDATED_DAMAGE_TYPE,
            "Cookie flow update damage type không thành công.",
        )

        updated_status = update_status(
            client,
            TARGET_REPORT_ID,
            UPDATED_STATUS,
            UPDATED_ADMIN_NOTE,
        )
        assert_true(
            updated_status["status"] == UPDATED_STATUS,
            "Cookie flow update status không thành công.",
        )
        assert_true(
            updated_status.get("admin_note") == UPDATED_ADMIN_NOTE,
            "Cookie flow update admin_note không thành công.",
        )

        report_list_after_update = fetch_admin_reports(client)
        target_list_item_after_update = next(
            (item for item in report_list_after_update["items"] if item["id"] == TARGET_REPORT_ID),
            None,
        )
        assert_true(
            target_list_item_after_update is not None,
            "Sau khi update, admin list không còn chứa report mục tiêu.",
        )
        assert_true(
            target_list_item_after_update["corrected_damage_type"] == UPDATED_DAMAGE_TYPE,
            "Admin list không phản ánh corrected_damage_type sau update.",
        )
        assert_true(
            target_list_item_after_update["status"] == UPDATED_STATUS,
            "Admin list không phản ánh status sau update.",
        )

        gis_payload_after_update = fetch_admin_map(client)
        target_map_feature_after_update = next(
            (feature for feature in gis_payload_after_update.get("features", []) if feature["id"] == TARGET_REPORT_ID),
            None,
        )
        assert_true(
            target_map_feature_after_update is not None,
            "Sau khi update, GIS map không còn chứa report mục tiêu.",
        )
        map_properties = target_map_feature_after_update["properties"]
        assert_true(
            map_properties["corrected_damage_type"] == UPDATED_DAMAGE_TYPE,
            "GIS map không phản ánh corrected_damage_type sau update.",
        )
        assert_true(
            map_properties["status"] == UPDATED_STATUS,
            "GIS map không phản ánh status sau update.",
        )

        detail_after_update = fetch_admin_report_detail(client, TARGET_REPORT_ID)
        assert_true(
            detail_after_update["corrected_damage_type"] == UPDATED_DAMAGE_TYPE,
            "Admin detail không phản ánh corrected_damage_type sau update qua cookie.",
        )
        assert_true(
            detail_after_update["status"] == UPDATED_STATUS,
            "Admin detail không phản ánh status sau update qua cookie.",
        )
        assert_true(
            detail_after_update.get("admin_note") == UPDATED_ADMIN_NOTE,
            "Admin detail không phản ánh admin_note sau update.",
        )

        dashboard_after_update = fetch_dashboard(client)
        processing_kpi_after_update = next(
            (item for item in dashboard_after_update.get("kpis", []) if item.get("key") == "processing"),
            None,
        )
        assert_true(
            processing_kpi_after_update is not None,
            "Dashboard sau update thiếu KPI processing.",
        )
        assert_true(
            int(processing_kpi_after_update["value"]) >= original_processing_count,
            "Dashboard không phản ánh trạng thái processing sau update.",
        )
    finally:
        update_damage_type(client, TARGET_REPORT_ID, original_corrected_type)
        update_status(
            client,
            TARGET_REPORT_ID,
            original_status,
            original_admin_note,
        )

    logout_result = logout(client)
    assert_true(logout_result["success"] is True, "Logout cookie flow không thành công.")

    request_json_expect_status(
        client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/dashboard",
        expected_status=401,
    )

    return {
        "target_report_id": TARGET_REPORT_ID,
        "updated_damage_type": UPDATED_DAMAGE_TYPE,
        "updated_status": UPDATED_STATUS,
        "access_cookie_name": login_result.access_cookie_name,
        "refresh_cookie_name": login_result.refresh_cookie_name,
    }


def main() -> None:
    with httpx.Client(timeout=30.0) as client:
        result = run_cookie_flow(client)

    print("=== ADMIN COOKIE FLOW SMOKE RESULT ===")
    print(f"- Data scope tag: {SMOKE_TAG}")
    print("Admin cookie login: PASS")
    print(f"- Access cookie: {result['access_cookie_name']}")
    print(f"- Refresh cookie: {result['refresh_cookie_name']}")
    print("Admin dashboard/list/detail/map: PASS")
    print(f"- Target report id: {result['target_report_id']}")
    print("Admin update via cookie session: PASS")
    print(f"- Updated damage type: {result['updated_damage_type']}")
    print(f"- Updated status: {result['updated_status']}")
    print("Admin logout + protected route check: PASS")


if __name__ == "__main__":
    main()
