from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import sys

from engineer_runtime_qa import run_python_script


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


@dataclass
class ScriptResult:
    script: str
    exit_code: int
    stdout: str
    stderr: str

    @property
    def status(self) -> str:
        if self.exit_code == 0:
            return "PASS"
        if self.exit_code == 2:
            return "BLOCKED"
        return "FAIL"


SCRIPT_MATRIX = (
    "run_e2e_smoke.py",
    "run_admin_cookie_flow_smoke.py",
    "run_cross_role_e2e_smoke.py",
    "run_manual_review_e2e.py",
    "run_engineer_self_claim_e2e.py",
    "run_engineer_admin_assignment_e2e.py",
    "run_engineer_double_claim_e2e.py",
    "run_manual_review_engineer_e2e.py",
)


def main() -> int:
    print("=== FULL REGRESSION AFTER ENGINEER ROLE ===")
    print(f"- Started at: {datetime.now().isoformat(timespec='seconds')}")

    results: list[ScriptResult] = []
    for script_name in SCRIPT_MATRIX:
        print(f"\n[RUN] {script_name}")
        completed = run_python_script(script_name)
        result = ScriptResult(
            script=script_name,
            exit_code=completed.returncode,
            stdout=completed.stdout or "",
            stderr=completed.stderr or "",
        )
        results.append(result)
        print(f"[{result.status}] {script_name} (exit={result.exit_code})")
        if result.stdout.strip():
            print(result.stdout.strip())
        if result.stderr.strip():
            print("[STDERR]")
            print(result.stderr.strip())

    passed = sum(1 for item in results if item.status == "PASS")
    blocked = sum(1 for item in results if item.status == "BLOCKED")
    failed = sum(1 for item in results if item.status == "FAIL")

    print("\n=== REGRESSION SUMMARY ===")
    print(f"- PASS: {passed}")
    print(f"- BLOCKED: {blocked}")
    print(f"- FAIL: {failed}")
    for item in results:
        print(f"  - {item.script}: {item.status}")

    if failed:
        return 1
    if blocked:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
