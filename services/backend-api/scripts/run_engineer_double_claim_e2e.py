from __future__ import annotations

from datetime import datetime

import httpx

from engineer_runtime_qa import (
    BACKEND_BASE_URL,
    ENGINEER_A_EMAIL,
    ENGINEER_A_PASSWORD,
    ENGINEER_B_EMAIL,
    ENGINEER_B_PASSWORD,
    REPORTER_EMAIL,
    REPORTER_PASSWORD,
    EngineerQAFailure,
    EngineerRuntimeNotReady,
    assert_runtime_ready,
    call_claim,
    cleanup_engineer_qa_reports,
    create_report_for_qa,
    ensure_demo_user,
    force_claim_expired,
    get_auth_headers,
    get_report_row,
    log_blocked,
    log_pass,
    log_step,
    login_user,
    print_capability_report,
    run_parallel_claims,
)


REQUIRED_ENDPOINTS = (
    "POST /api/engineer/reports/{report_id}/claim",
    "POST /api/engineer/reports/{report_id}/release-claim",
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
    ensure_demo_user(
        email=ENGINEER_B_EMAIL,
        password=ENGINEER_B_PASSWORD,
        role="field_engineer",
        full_name="Engineer B Demo",
        phone="0901000002",
    )

    cleanup_engineer_qa_reports()

    with (
        httpx.Client(timeout=40.0) as reporter_client,
        httpx.Client(timeout=40.0) as engineer_a_client,
        httpx.Client(timeout=40.0) as engineer_b_client,
    ):
        reporter_login = login_user(
            reporter_client,
            email=REPORTER_EMAIL,
            password=REPORTER_PASSWORD,
        )
        created = create_report_for_qa(
            reporter_client,
            reporter_login.access_token,
            note_suffix=f"double-claim {datetime.now().isoformat(timespec='seconds')}",
        )
        report_id = created["id"]
        report_row = get_report_row(report_id)
        log_pass(f"Tạo report test cho double-claim: {report_id}")

        log_step("Bắn đồng thời 2 request claim")
        results = run_parallel_claims(report_id)
        success_count = sum(1 for code, _ in results if 200 <= code < 300)
        ensure_demo = success_count == 1
        if not ensure_demo:
            raise EngineerQAFailure(
                "Double-claim test thất bại: không đúng mẫu 1 request thắng / 1 request thua. "
                f"Kết quả={results}"
            )
        log_pass(f"Double-claim được chặn đúng. Kết quả={results}")

        log_step("Giả lập hết hạn lock khi chưa có hoạt động")
        force_claim_expired(report_id)
        retry_code, retry_message = call_claim(
            email=ENGINEER_B_EMAIL,
            password=ENGINEER_B_PASSWORD,
            report_id=report_id,
        )
        if not (200 <= retry_code < 300):
            raise EngineerQAFailure(
                "Claim sau expire không thành công, nghĩa là rule auto-expire chưa chạy đúng. "
                f"status={retry_code}, body={retry_message}"
            )
        log_pass("Claim lại thành công sau khi lock hết hạn")

        log_step("Giả lập đã có hoạt động thật rồi thì không được nhả lock")
        engineer_b_login = login_user(
            engineer_b_client,
            email=ENGINEER_B_EMAIL,
            password=ENGINEER_B_PASSWORD,
        )
        check_in = engineer_b_client.post(
            f"{BACKEND_BASE_URL}/engineer/reports/{report_id}/check-in",
            headers=get_auth_headers(engineer_b_login.access_token),
            json={
                "latitude": float(report_row["latitude"]),
                "longitude": float(report_row["longitude"]),
                "gps_accuracy": 6.0,
                "source": "engineer_app_gps",
            },
        )
        check_in.raise_for_status()

        survey = engineer_b_client.patch(
            f"{BACKEND_BASE_URL}/engineer/reports/{report_id}/survey",
            headers=get_auth_headers(engineer_b_login.access_token),
            json={
                "verified_damage_type": "D40",
                "severity": "critical",
                "priority": "urgent",
                "note": "Lock phải giữ vì kỹ sư đã bắt đầu làm thật.",
                "is_draft": True,
            },
        )
        survey.raise_for_status()
        force_claim_expired(report_id)
        blocked_code, blocked_message = call_claim(
            email=ENGINEER_A_EMAIL,
            password=ENGINEER_A_PASSWORD,
            report_id=report_id,
        )
        if 200 <= blocked_code < 300:
            raise EngineerQAFailure(
                "Lock bị nhả sai dù kỹ sư đã check-in / lưu khảo sát. "
                f"status={blocked_code}, body={blocked_message}"
            )
        log_pass(
            "Sau khi đã có check-in/khảo sát, điểm vẫn không cho kỹ sư khác claim."
        )

        print("=== ENGINEER DOUBLE-CLAIM E2E RESULT ===")
        print(f"- Report id: {report_id}")
        print(f"- Parallel claim results: {results}")
        print(f"- Retry after forced expire: {retry_code} {retry_message}")
        print(f"- Retry after active work: {blocked_code} {blocked_message}")
        return 0
    raise AssertionError("Unreachable")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except EngineerQAFailure as exc:
        print(f"[FAIL] {exc}")
        raise SystemExit(1)
