from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
from typing import Any, Iterable, Sequence
from uuid import uuid4

import httpx


BACKEND_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_SERVICE_DIR))

from app.config import get_settings
from app.database import get_connection
from app.modules.auth.security import hash_password


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


BACKEND_BASE_URL = (
    os.getenv("BACKEND_API_URL")
    or os.getenv("EXPO_PUBLIC_API_URL")
    or os.getenv("VITE_API_URL")
    or "http://127.0.0.1:5000/api"
).rstrip("/")
BACKEND_PUBLIC_BASE_URL = BACKEND_BASE_URL.rsplit("/api", 1)[0]
UPLOAD_IMAGE_PATH = Path(
    os.getenv("ENGINEER_QA_IMAGE_PATH")
    or r"D:\DATN\Code\road-damage-gis\services\backend-api\uploads\reports\seed-report-001.png"
)
ADMIN_CONTEXT_HEADER = {"X-Auth-Context": "web-admin"}

REPORTER_EMAIL = os.getenv("ENGINEER_QA_REPORTER_EMAIL", "reporter1.demo@roadgis.local")
REPORTER_PASSWORD = os.getenv("ENGINEER_QA_REPORTER_PASSWORD", "Reporter@123")
ADMIN_EMAIL = os.getenv("ENGINEER_QA_ADMIN_EMAIL", "admin.demo@roadgis.local")
ADMIN_PASSWORD = os.getenv("ENGINEER_QA_ADMIN_PASSWORD", "Admin@123")
ENGINEER_A_EMAIL = os.getenv("ENGINEER_QA_ENGINEER_A_EMAIL", "engineer.a.demo@roadgis.local")
ENGINEER_A_PASSWORD = os.getenv("ENGINEER_QA_ENGINEER_A_PASSWORD", "Engineer@123")
ENGINEER_B_EMAIL = os.getenv("ENGINEER_QA_ENGINEER_B_EMAIL", "engineer.b.demo@roadgis.local")
ENGINEER_B_PASSWORD = os.getenv("ENGINEER_QA_ENGINEER_B_PASSWORD", "Engineer@123")

ENGINEER_QA_TAG = "[engineer-runtime-qa]"
ENGINEER_QA_NOTE_PREFIX = f"{ENGINEER_QA_TAG} "
DEFAULT_FIELD_NOTE = f"{ENGINEER_QA_TAG} Khảo sát hiện trường tự động"

ENGINEER_WORKFLOW_COLUMNS = (
    "assigned_engineer_id",
    "claimed_by_engineer_id",
    "claimed_at",
    "claim_expires_at",
    "field_status",
    "survey_started_at",
    "survey_completed_at",
    "field_verified_damage_type",
    "field_severity",
    "field_priority",
    "field_note",
    "field_checked_in_latitude",
    "field_checked_in_longitude",
    "field_checked_in_accuracy",
    "field_checked_in_distance_meters",
    "field_checked_in_at",
)
ENGINEER_REQUIRED_TABLES = ("report_engineer_actions",)


class EngineerQAFailure(RuntimeError):
    pass


class EngineerRuntimeNotReady(EngineerQAFailure):
    def __init__(self, missing_items: Sequence[str]) -> None:
        self.missing_items = list(missing_items)
        joined = "\n".join(f"- {item}" for item in self.missing_items)
        super().__init__(
            "Engineer runtime chưa sẵn sàng cho QA automation.\n"
            f"{joined}"
        )


@dataclass
class LoginResult:
    access_token: str
    refresh_token: str
    user: dict[str, Any]


@dataclass
class AdminCookieLoginResult:
    user: dict[str, Any]
    cookies: dict[str, str]


@dataclass
class RuntimeCapabilities:
    ready: bool
    missing: list[str] = field(default_factory=list)
    openapi_paths: set[str] = field(default_factory=set)
    report_columns: set[str] = field(default_factory=set)
    tables: set[str] = field(default_factory=set)
    roles: set[str] = field(default_factory=set)


def log_step(message: str) -> None:
    print(f"[STEP] {message}")


def log_pass(message: str) -> None:
    print(f"[PASS] {message}")


def log_warn(message: str) -> None:
    print(f"[WARN] {message}")


def log_info(message: str) -> None:
    print(f"[INFO] {message}")


def log_blocked(message: str) -> None:
    print(f"[BLOCKED] {message}")


def ensure(condition: bool, message: str) -> None:
    if not condition:
        raise EngineerQAFailure(message)


def get_auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def request(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    expected_statuses: Iterable[int] = (200,),
    **kwargs: Any,
) -> httpx.Response:
    response = client.request(method, url, headers=headers, **kwargs)
    if response.status_code not in set(expected_statuses):
        response.raise_for_status()
    return response


def request_json(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    expected_statuses: Iterable[int] = (200,),
    **kwargs: Any,
) -> Any:
    response = request(
        client,
        method,
        url,
        headers=headers,
        expected_statuses=expected_statuses,
        **kwargs,
    )
    return response.json()


def ensure_demo_user(
    *,
    email: str,
    password: str,
    role: str,
    full_name: str,
    phone: str | None = None,
) -> sqlite3.Row:
    now = datetime.now(timezone.utc).isoformat()
    normalized_email = email.strip().lower()
    normalized_role = role.strip().lower()
    normalized_name = full_name.strip()
    password_hash = hash_password(password)
    with get_connection() as connection:
        existing = connection.execute(
            "SELECT * FROM users WHERE lower(email) = lower(?)",
            (normalized_email,),
        ).fetchone()

        if existing is None:
            user_id = str(uuid4())
            connection.execute(
                """
                INSERT INTO users (
                    id, full_name, email, phone, password_hash, role, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    normalized_name,
                    normalized_email,
                    phone,
                    password_hash,
                    normalized_role,
                    now,
                    now,
                ),
            )
            connection.commit()
            row = connection.execute(
                "SELECT * FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
            assert row is not None
            return row

        updates: list[str] = []
        values: list[Any] = []
        if existing["role"] != normalized_role:
            updates.append("role = ?")
            values.append(normalized_role)
        if existing["full_name"] != normalized_name:
            updates.append("full_name = ?")
            values.append(normalized_name)
        if phone is not None and existing["phone"] != phone:
            updates.append("phone = ?")
            values.append(phone)
        if existing["password_hash"] != password_hash:
            updates.append("password_hash = ?")
            values.append(password_hash)

        if updates:
            updates.append("updated_at = ?")
            values.append(now)
            values.append(existing["id"])
            connection.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                values,
            )
            connection.commit()

        return connection.execute(
            "SELECT * FROM users WHERE id = ?",
            (existing["id"],),
        ).fetchone()


def login_user(client: httpx.Client, *, email: str, password: str) -> LoginResult:
    payload = request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/login",
        json={"email": email, "password": password},
    )
    return LoginResult(
        access_token=payload["accessToken"],
        refresh_token=payload["refreshToken"],
        user=payload["user"],
    )


def login_admin_with_cookie(client: httpx.Client) -> AdminCookieLoginResult:
    payload = request_json(
        client,
        "POST",
        f"{BACKEND_BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers=ADMIN_CONTEXT_HEADER,
    )
    settings = get_settings()
    ensure(
        settings.web_access_cookie_name in client.cookies,
        "Admin login chưa set access cookie.",
    )
    ensure(
        settings.web_refresh_cookie_name in client.cookies,
        "Admin login chưa set refresh cookie.",
    )
    return AdminCookieLoginResult(
        user=payload["user"],
        cookies=dict(client.cookies),
    )


def fetch_openapi_paths() -> set[str]:
    with httpx.Client(timeout=20.0) as client:
        response = client.get(f"{BACKEND_PUBLIC_BASE_URL}/openapi.json")
        response.raise_for_status()
        payload = response.json()
    return {
        f"{method.strip().upper()} {path}"
        for path, methods in payload.get("paths", {}).items()
        for method in methods.keys()
    }


def inspect_runtime_capabilities(*, required_endpoints: Sequence[str]) -> RuntimeCapabilities:
    missing: list[str] = []
    openapi_paths: set[str] = set()
    report_columns: set[str] = set()
    tables: set[str] = set()
    roles: set[str] = set()

    try:
        with httpx.Client(timeout=10.0) as client:
            ready = client.get(f"{BACKEND_PUBLIC_BASE_URL}/ready")
            ready.raise_for_status()
            ready_payload = ready.json()
            if not ready_payload.get("ready", False):
                missing.append("Backend /ready trả về chưa sẵn sàng.")
    except Exception as exc:  # noqa: BLE001
        missing.append(f"Không truy cập được backend /ready: {exc}")

    try:
        openapi_paths = fetch_openapi_paths()
    except Exception as exc:  # noqa: BLE001
        missing.append(f"Không đọc được OpenAPI: {exc}")

    with get_connection() as connection:
        report_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(reports)").fetchall()
        }
        tables = {
            row["name"]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        roles = {
            (row["role"] or "").strip().lower()
            for row in connection.execute("SELECT DISTINCT role FROM users").fetchall()
        }

    for endpoint in required_endpoints:
        if endpoint not in openapi_paths:
            missing.append(f"Thiếu endpoint runtime: {endpoint}")

    for column in ENGINEER_WORKFLOW_COLUMNS:
        if column not in report_columns:
            missing.append(f"Thiếu cột reports.{column}")

    for table in ENGINEER_REQUIRED_TABLES:
        if table not in tables:
            missing.append(f"Thiếu bảng {table}")

    if "field_engineer" not in roles:
        missing.append("Chưa có role field_engineer trong runtime users.")

    return RuntimeCapabilities(
        ready=not missing,
        missing=missing,
        openapi_paths=openapi_paths,
        report_columns=report_columns,
        tables=tables,
        roles=roles,
    )


def assert_runtime_ready(*, required_endpoints: Sequence[str]) -> RuntimeCapabilities:
    capabilities = inspect_runtime_capabilities(required_endpoints=required_endpoints)
    if not capabilities.ready:
        raise EngineerRuntimeNotReady(capabilities.missing)
    return capabilities


def print_capability_report(capabilities: RuntimeCapabilities) -> None:
    print("=== ENGINEER RUNTIME PREFLIGHT ===")
    print(f"- Backend API: {BACKEND_BASE_URL}")
    print(f"- Roles hiện có: {', '.join(sorted(capabilities.roles)) or '(trống)'}")
    print(f"- Số endpoint OpenAPI: {len(capabilities.openapi_paths)}")
    if capabilities.ready:
        print("- Trạng thái: READY")
        return
    print("- Trạng thái: BLOCKED")
    for item in capabilities.missing:
        print(f"  * {item}")


def cleanup_engineer_qa_reports() -> int:
    removed = 0
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, image_path
            FROM reports
            WHERE note LIKE ?
            ORDER BY created_at ASC
            """,
            (f"{ENGINEER_QA_NOTE_PREFIX}%",),
        ).fetchall()

        if not rows:
            return 0

        report_ids = [row["id"] for row in rows]
        if "report_engineer_actions" in {
            row["name"]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }:
            placeholders = ",".join("?" for _ in report_ids)
            connection.execute(
                f"DELETE FROM report_engineer_actions WHERE report_id IN ({placeholders})",
                report_ids,
            )

        for row in rows:
            image_path = row["image_path"]
            if image_path:
                image_file = Path(image_path)
                if not image_file.is_absolute():
                    image_file = BACKEND_SERVICE_DIR / "uploads" / image_path
                if image_file.exists():
                    image_file.unlink()
            removed += 1

        placeholders = ",".join("?" for _ in report_ids)
        connection.execute(
            f"DELETE FROM reports WHERE id IN ({placeholders})",
            report_ids,
        )
        connection.commit()

    return removed


def preview_ai(client: httpx.Client, reporter_token: str) -> dict[str, Any]:
    with UPLOAD_IMAGE_PATH.open("rb") as image_file:
        return request_json(
            client,
            "POST",
            f"{BACKEND_BASE_URL}/reports/preview-ai",
            files={"image": (UPLOAD_IMAGE_PATH.name, image_file, "image/png")},
            headers=get_auth_headers(reporter_token),
        )


def create_report_for_qa(
    client: httpx.Client,
    reporter_token: str,
    *,
    note_suffix: str,
    latitude: float = 10.782345,
    longitude: float = 106.699876,
    gps_accuracy: float = 8.0,
) -> dict[str, Any]:
    preview = preview_ai(client, reporter_token)
    preview_token = preview.get("preview_token")
    note = f"{ENGINEER_QA_NOTE_PREFIX}{note_suffix}"
    with UPLOAD_IMAGE_PATH.open("rb") as image_file:
        data = {
            "latitude": str(latitude),
            "longitude": str(longitude),
            "gps_accuracy": str(gps_accuracy),
            "location_source": "camera_gps",
            "location_recorded_at": datetime.now().isoformat(timespec="seconds"),
            "note": note,
        }
        if preview_token:
            data["preview_token"] = preview_token

        created = request_json(
            client,
            "POST",
            f"{BACKEND_BASE_URL}/reports",
            files={"image": (UPLOAD_IMAGE_PATH.name, image_file, "image/png")},
            data=data,
            headers=get_auth_headers(reporter_token),
            expected_statuses=(201,),
        )
    return created


def pick_report_candidate(
    *,
    ai_status: str | None = None,
    allowed_statuses: Sequence[str] = ("pending", "pending_verification"),
    created_by_prefix: str | None = ENGINEER_QA_NOTE_PREFIX,
) -> sqlite3.Row | None:
    clauses = ["1=1"]
    params: list[Any] = []

    if ai_status:
        clauses.append("ai_status = ?")
        params.append(ai_status)

    if allowed_statuses:
        placeholders = ",".join("?" for _ in allowed_statuses)
        clauses.append(f"status IN ({placeholders})")
        params.extend(allowed_statuses)

    if created_by_prefix:
        clauses.append("note LIKE ?")
        params.append(f"{created_by_prefix}%")

    query = f"""
        SELECT *
        FROM reports
        WHERE {' AND '.join(clauses)}
        ORDER BY datetime(updated_at) DESC, datetime(created_at) DESC
        LIMIT 1
    """
    with get_connection() as connection:
        return connection.execute(query, params).fetchone()


def get_report_row(report_id: str) -> sqlite3.Row:
    with get_connection() as connection:
        row = connection.execute(
            "SELECT * FROM reports WHERE id = ? LIMIT 1",
            (report_id,),
        ).fetchone()
    if row is None:
        raise EngineerQAFailure(f"Không tìm thấy report {report_id} trong DB.")
    return row


def force_claim_expired(report_id: str, *, hours_ago: int = 2) -> None:
    expired_at = (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat()
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE reports
            SET claim_expires_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (expired_at, datetime.now(timezone.utc).isoformat(), report_id),
        )
        connection.commit()


def fetch_admin_report_detail(admin_client: httpx.Client, report_id: str) -> dict[str, Any]:
    return request_json(
        admin_client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports/{report_id}",
    )


def fetch_admin_manual_review_list(admin_client: httpx.Client) -> dict[str, Any]:
    return request_json(
        admin_client,
        "GET",
        f"{BACKEND_BASE_URL}/admin/reports?limit=50&offset=0&ai_status=manual_review_required",
    )


def run_python_script(script_name: str) -> subprocess.CompletedProcess[str]:
    script_path = BACKEND_SERVICE_DIR / "scripts" / script_name
    env = os.environ.copy()
    env.setdefault("PYTHONUTF8", "1")
    env.setdefault("PYTHONIOENCODING", "utf-8")
    return subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(BACKEND_SERVICE_DIR),
        text=True,
        capture_output=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )


def call_claim(
    *,
    email: str,
    password: str,
    report_id: str,
) -> tuple[int, str]:
    with httpx.Client(timeout=40.0) as client:
        login = login_user(client, email=email, password=password)
        response = client.post(
            f"{BACKEND_BASE_URL}/engineer/reports/{report_id}/claim",
            headers=get_auth_headers(login.access_token),
        )
        try:
            body = response.json()
            message = json.dumps(body, ensure_ascii=False)
        except Exception:  # noqa: BLE001
            message = response.text
        return response.status_code, message


def run_parallel_claims(report_id: str) -> list[tuple[int, str]]:
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [
            executor.submit(
                call_claim,
                email=ENGINEER_A_EMAIL,
                password=ENGINEER_A_PASSWORD,
                report_id=report_id,
            ),
            executor.submit(
                call_claim,
                email=ENGINEER_B_EMAIL,
                password=ENGINEER_B_PASSWORD,
                report_id=report_id,
            ),
        ]
        return [future.result() for future in futures]
