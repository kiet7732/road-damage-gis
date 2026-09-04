from __future__ import annotations

SEED_SCOPE = "seed-demo"
SMOKE_SCOPE = "e2e-smoke"
LOCAL_RUNTIME_SCOPE = "local-runtime"

SEED_TAG = f"[{SEED_SCOPE}]"
SMOKE_TAG = f"[{SMOKE_SCOPE}]"

SEED_USER_ID_PREFIX = "seed-user-"
SEED_REPORT_ID_PREFIX = "seed-report-"
SEED_IMAGE_PREFIX = "seed-report-"
SEED_EMAIL_DOMAIN = "@roadgis.local"

SMOKE_NOTE_PREFIX = f"{SMOKE_TAG} Smoke test "
SMOKE_ADMIN_NOTE_PREFIX = f"{SMOKE_TAG} Cookie flow admin status update"


def has_scope_prefix(value: str | None, prefix: str) -> bool:
    if not value:
        return False

    return value.strip().startswith(prefix)
