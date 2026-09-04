from __future__ import annotations

from datetime import datetime

import httpx

from engineer_runtime_qa import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    BACKEND_BASE_URL,
    ENGINEER_B_EMAIL,
    ENGINEER_B_PASSWORD,
    REPORTER_EMAIL,
    REPORTER_PASSWORD,
    EngineerQAFailure,
    EngineerRuntimeNotReady,
    assert_runtime_ready,
    cleanup_engineer_qa_reports,
    create_report_for_qa,
    ensure_demo_user,
    fetch_admin_report_detail,
    get_auth_headers,
    get_report_row,
    log_blocked,
    log_pass,
    log_step,
    login_admin_with_cookie,
    login_user,
    print_capability_report,
)


REQUIRED_ENDPOINTS = (
    "PATCH /api/admin/reports/{report_id}/assign-engineer",
    "GET /api/admin/reports/{report_id}/engineer-timeline",
    "GET /api/engineer/reports/assigned",
    "GET /api/engineer/reports/{report_id}",
    "POST /api/engineer/reports/{report_id}/check-in",
    "PATCH /api/engineer/reports/{report_id}/survey",
)


def main() -> int:
    try:
        capabilities = assert_runtime_ready(required_endpoints=REQUIRED_ENDPOINTS)
        print_capability_report(capabilities)
    except EngineerRuntimeNotReady as exc:
        print_capability_report(
            assert_runtime_ready.__globals__["inspect_runtime_capabilities"](required_endpoints=REQUIRED_ENDPOINTS)
        )
        log_blocked(str(exc))
        return 2

    ensure_demo_user(
        email=ENGINEER_B_EMAIL,
        password=ENGINEER_B_PASSWORD,
        role="field_engineer",
        full_name="Engineer B Demo",
        phone="0901000002",
    )
    ensure_demo_user(
        email=ADMIN_EMAIL,
        password=ADMIN_PASSWORD,
        role="admin",
        full_name="Admin Demo",
    )

    cleanup_engineer_qa_reports()

    with httpx.Client(timeout=40.0) as reporter_client, httpx.Client(timeout=40.0) as admin_client, httpx.Client(timeout=40.0) as engineer_client:
        reporter_login = login_user(
            reporter_client,
            email=REPORTER_EMAIL,
            password=REPORTER_PASSWORD,
        )
        created = create_report_for_qa(
            reporter_client,
            reporter_login.access_token,
            note_suffix=f"admin-assign {datetime.now().isoformat(timespec='seconds')}",
        )
        report_id = created["id"]
        report_row = get_report_row(report_id)
        log_pass(f"Tạo report test cho luồng admin assign: {report_id}")

        log_step("Admin đăng nhập bằng cookie flow")
        login_admin_with_cookie(admin_client)
        log_pass("Admin login thành công")

        assign = admin_client.patch(
            f"{BACKEND_BASE_URL}/admin/reports/{report_id}/assign-engineer",
            json={"engineer_id": ensure_demo_user(
                email=ENGINEER_B_EMAIL,
                password=ENGINEER_B_PASSWORD,
                role="field_engineer",
                full_name="Engineer B Demo",
            )["id"]},
        )
        assign.raise_for_status()
        log_pass("Admin phân công kỹ sư thành công")

        engineer_login = login_user(
            engineer_client,
            email=ENGINEER_B_EMAIL,
            password=ENGINEER_B_PASSWORD,
        )
        assigned = engineer_client.get(
            f"{BACKEND_BASE_URL}/engineer/reports/assigned",
            headers=get_auth_headers(engineer_login.access_token),
        )
        assigned.raise_for_status()
        log_pass("Engineer B đọc được danh sách được giao")

        detail = engineer_client.get(
            f"{BACKEND_BASE_URL}/engineer/reports/{report_id}",
            headers=get_auth_headers(engineer_login.access_token),
        )
        detail.raise_for_status()
        detail_payload = detail.json()
        latitude = float(detail_payload.get("latitude", report_row["latitude"]))
        longitude = float(detail_payload.get("longitude", report_row["longitude"]))

        check_in = engineer_client.post(
            f"{BACKEND_BASE_URL}/engineer/reports/{report_id}/check-in",
            headers=get_auth_headers(engineer_login.access_token),
            json={
                "latitude": latitude,
                "longitude": longitude,
                "gps_accuracy": 7.0,
                "source": "engineer_app_gps",
            },
        )
        check_in.raise_for_status()
        log_pass("Engineer B check-in thành công")

        survey = engineer_client.patch(
            f"{BACKEND_BASE_URL}/engineer/reports/{report_id}/survey",
            headers=get_auth_headers(engineer_login.access_token),
            json={
                "verified_damage_type": "D10",
                "severity": "high",
                "priority": "urgent",
                "note": "Hoàn tất khảo sát từ luồng admin phân công.",
                "is_draft": False,
            },
        )
        survey.raise_for_status()
        log_pass("Engineer B gửi khảo sát thành công")

        admin_detail = fetch_admin_report_detail(admin_client, report_id)
        log_pass("Admin xem lại được detail sau khi engineer khảo sát")

        timeline = admin_client.get(f"{BACKEND_BASE_URL}/admin/reports/{report_id}/engineer-timeline")
        timeline.raise_for_status()
        log_pass("Admin đọc được timeline kỹ sư")

        print("=== ENGINEER ADMIN ASSIGNMENT E2E RESULT ===")
        print(f"- Report id: {report_id}")
        print(f"- Engineer assigned: {ENGINEER_B_EMAIL}")
        print(f"- Admin detail status: {admin_detail.get('status')}")
        print(f"- Timeline items: {len(timeline.json().get('items', [])) if isinstance(timeline.json(), dict) else 'n/a'}")
        return 0
    raise AssertionError("Unreachable")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except EngineerQAFailure as exc:
        print(f"[FAIL] {exc}")
        raise SystemExit(1)
