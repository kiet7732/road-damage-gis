from __future__ import annotations

from datetime import datetime

import httpx

from engineer_runtime_qa import (
    BACKEND_BASE_URL,
    ENGINEER_A_EMAIL,
    ENGINEER_A_PASSWORD,
    REPORTER_EMAIL,
    REPORTER_PASSWORD,
    UPLOAD_IMAGE_PATH,
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
    log_info,
    log_pass,
    log_step,
    login_admin_with_cookie,
    login_user,
    print_capability_report,
)


REQUIRED_ENDPOINTS = (
    "GET /api/engineer/reports/available",
    "GET /api/engineer/reports/in-progress",
    "GET /api/engineer/reports/{report_id}",
    "POST /api/engineer/reports/{report_id}/claim",
    "POST /api/engineer/reports/{report_id}/check-in",
    "PATCH /api/engineer/reports/{report_id}/survey",
    "GET /api/admin/reports/{report_id}/engineer-timeline",
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
        email=ENGINEER_A_EMAIL,
        password=ENGINEER_A_PASSWORD,
        role="field_engineer",
        full_name="Engineer A Demo",
        phone="0901000001",
    )

    cleanup_engineer_qa_reports()

    with httpx.Client(timeout=40.0) as reporter_client, httpx.Client(timeout=40.0) as engineer_client, httpx.Client(timeout=40.0) as admin_client:
        log_step("Đăng nhập reporter để tạo report test")
        reporter_login = login_user(
            reporter_client,
            email=REPORTER_EMAIL,
            password=REPORTER_PASSWORD,
        )
        log_pass("Reporter login thành công")

        ensure_demo_user(
            email=REPORTER_EMAIL,
            password=REPORTER_PASSWORD,
            role="reporter",
            full_name="Reporter Demo",
        )

        ensure_demo_user(
            email="admin.demo@roadgis.local",
            password="Admin@123",
            role="admin",
            full_name="Admin Demo",
        )

        created = create_report_for_qa(
            reporter_client,
            reporter_login.access_token,
            note_suffix=f"self-claim {datetime.now().isoformat(timespec='seconds')}",
        )
        report_id = created["id"]
        report_row = get_report_row(report_id)
        log_pass(f"Tạo report test thành công: {report_id}")

        log_step("Đăng nhập kỹ sư hiện trường A")
        engineer_login = login_user(
            engineer_client,
            email=ENGINEER_A_EMAIL,
            password=ENGINEER_A_PASSWORD,
        )
        log_pass("Engineer A login thành công")

        available = engineer_client.get(
            f"{BACKEND_BASE_URL}/engineer/reports/available",
            headers=get_auth_headers(engineer_login.access_token),
        )
        available.raise_for_status()
        log_pass("Engineer đọc được danh sách điểm có thể nhận")

        claim = engineer_client.post(
            f"{BACKEND_BASE_URL}/engineer/reports/{report_id}/claim",
            headers=get_auth_headers(engineer_login.access_token),
        )
        claim.raise_for_status()
        log_pass("Engineer nhận kiểm tra thành công")

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
                "gps_accuracy": 8.0,
                "source": "engineer_app_gps",
            },
        )
        check_in.raise_for_status()
        log_pass("Engineer check-in hiện trường thành công")

        survey = engineer_client.patch(
            f"{BACKEND_BASE_URL}/engineer/reports/{report_id}/survey",
            headers=get_auth_headers(engineer_login.access_token),
            json={
                "verified_damage_type": "D20",
                "severity": "medium",
                "priority": "normal",
                "note": "Kỹ sư đã khảo sát hiện trường bằng QA automation.",
                "is_draft": True,
            },
        )
        survey.raise_for_status()
        log_pass("Engineer lưu khảo sát thành công")

        log_step("Admin kiểm tra lại detail để xác nhận dữ liệu đã đồng bộ")
        login_admin_with_cookie(admin_client)
        admin_detail = fetch_admin_report_detail(admin_client, report_id)
        log_pass("Admin đọc được detail report sau self-claim flow")

        print("=== ENGINEER SELF-CLAIM E2E RESULT ===")
        print(f"- Backend API: {BACKEND_BASE_URL}")
        print(f"- Upload image used: {UPLOAD_IMAGE_PATH}")
        print(f"- Report id: {report_id}")
        print(f"- Engineer: {ENGINEER_A_EMAIL}")
        print(f"- Admin detail status: {admin_detail.get('status')}")
        print(f"- Engineer detail keys: {sorted(detail_payload.keys())[:12]}")
        return 0
    raise AssertionError("Unreachable")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except EngineerQAFailure as exc:
        print(f"[FAIL] {exc}")
        raise SystemExit(1)
