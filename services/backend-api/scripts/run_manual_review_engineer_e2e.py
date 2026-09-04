from __future__ import annotations

import httpx

from engineer_runtime_qa import (
    BACKEND_BASE_URL,
    ENGINEER_A_EMAIL,
    ENGINEER_A_PASSWORD,
    EngineerQAFailure,
    EngineerRuntimeNotReady,
    assert_runtime_ready,
    ensure_demo_user,
    fetch_admin_manual_review_list,
    fetch_admin_report_detail,
    get_auth_headers,
    get_report_row,
    log_blocked,
    log_pass,
    log_step,
    login_admin_with_cookie,
    login_user,
    pick_report_candidate,
    print_capability_report,
)


REQUIRED_ENDPOINTS = (
    "GET /api/admin/reports",
    "GET /api/admin/reports/{report_id}",
    "POST /api/engineer/reports/{report_id}/claim",
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
        email=ENGINEER_A_EMAIL,
        password=ENGINEER_A_PASSWORD,
        role="field_engineer",
        full_name="Engineer A Demo",
        phone="0901000001",
    )

    manual_report = pick_report_candidate(
        ai_status="manual_review_required",
        allowed_statuses=("pending", "pending_verification", "processing"),
        created_by_prefix=None,
    )
    if manual_report is None:
        raise EngineerQAFailure(
            "Không tìm thấy report manual review nào trong DB để chạy E2E."
        )
    report_id = manual_report["id"]
    report_row = get_report_row(report_id)

    with httpx.Client(timeout=40.0) as admin_client, httpx.Client(timeout=40.0) as engineer_client:
        log_step("Admin mở nhóm Cần kiểm tra thêm")
        login_admin_with_cookie(admin_client)
        manual_list = fetch_admin_manual_review_list(admin_client)
        ensure = any(item["id"] == report_id for item in manual_list.get("items", []))
        if not ensure:
            raise EngineerQAFailure(
                "Report manual review không xuất hiện trong list admin theo ai_status."
            )
        log_pass("Admin thấy đúng report manual review")

        engineer_login = login_user(
            engineer_client,
            email=ENGINEER_A_EMAIL,
            password=ENGINEER_A_PASSWORD,
        )
        claim = engineer_client.post(
            f"{BACKEND_BASE_URL}/engineer/reports/{report_id}/claim",
            headers=get_auth_headers(engineer_login.access_token),
        )
        claim.raise_for_status()
        log_pass("Engineer nhận kiểm tra report manual review thành công")

        check_in = engineer_client.post(
            f"{BACKEND_BASE_URL}/engineer/reports/{report_id}/check-in",
            headers=get_auth_headers(engineer_login.access_token),
            json={
                "latitude": float(report_row["latitude"]),
                "longitude": float(report_row["longitude"]),
                "gps_accuracy": 7.0,
                "source": "engineer_app_gps",
            },
        )
        check_in.raise_for_status()
        log_pass("Engineer check-in trên report manual review thành công")

        survey = engineer_client.patch(
            f"{BACKEND_BASE_URL}/engineer/reports/{report_id}/survey",
            headers=get_auth_headers(engineer_login.access_token),
            json={
                "verified_damage_type": "D00",
                "severity": "medium",
                "priority": "normal",
                "note": "Khảo sát report thuộc luồng manual review.",
                "is_draft": False,
            },
        )
        survey.raise_for_status()
        log_pass("Engineer khảo sát được report manual review")

        admin_detail = fetch_admin_report_detail(admin_client, report_id)
        log_pass("Admin mở lại được detail report manual review sau engineer flow")

        print("=== MANUAL REVIEW + ENGINEER E2E RESULT ===")
        print(f"- Report id: {report_id}")
        print(f"- AI status: {manual_report['ai_status']}")
        print(f"- Admin detail status: {admin_detail.get('status')}")
        return 0
    raise AssertionError("Unreachable")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except EngineerQAFailure as exc:
        print(f"[FAIL] {exc}")
        raise SystemExit(1)
