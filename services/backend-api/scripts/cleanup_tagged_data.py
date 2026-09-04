from __future__ import annotations

import argparse
from pathlib import Path
import sys

BACKEND_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_SERVICE_DIR))

from app.database import get_connection
from scripts.data_scopes import (
    SEED_REPORT_ID_PREFIX,
    SEED_SCOPE,
    SEED_TAG,
    SEED_USER_ID_PREFIX,
    SMOKE_NOTE_PREFIX,
    SMOKE_SCOPE,
    SMOKE_TAG,
)

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def _delete_report_image(image_path: str | None) -> None:
    if not image_path:
        return

    image_file = Path(image_path)
    if image_file.exists() and image_file.is_file():
        image_file.unlink()


def cleanup_smoke_scope() -> int:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, image_path
            FROM reports
            WHERE note LIKE ?
            """,
            (f"{SMOKE_NOTE_PREFIX}%",),
        ).fetchall()

        if not rows:
            return 0

        for row in rows:
            _delete_report_image(row["image_path"])

        report_ids = [row["id"] for row in rows]
        placeholders = ", ".join("?" for _ in report_ids)
        connection.execute(
            f"DELETE FROM reports WHERE id IN ({placeholders})",
            report_ids,
        )
        connection.commit()
        return len(report_ids)


def cleanup_seed_scope() -> tuple[int, int]:
    with get_connection() as connection:
        report_rows = connection.execute(
            """
            SELECT id, image_path
            FROM reports
            WHERE id LIKE ? OR note LIKE ?
            """,
            (f"{SEED_REPORT_ID_PREFIX}%", f"{SEED_TAG}%"),
        ).fetchall()

        for row in report_rows:
            _delete_report_image(row["image_path"])

        if report_rows:
            report_ids = [row["id"] for row in report_rows]
            report_placeholders = ", ".join("?" for _ in report_ids)
            connection.execute(
                f"DELETE FROM reports WHERE id IN ({report_placeholders})",
                report_ids,
            )

        user_rows = connection.execute(
            """
            SELECT id
            FROM users
            WHERE id LIKE ? OR email LIKE ?
            """,
            (f"{SEED_USER_ID_PREFIX}%", "%.demo@roadgis.local"),
        ).fetchall()

        user_ids = [row["id"] for row in user_rows]
        if user_ids:
            user_placeholders = ", ".join("?" for _ in user_ids)
            connection.execute(
                f"DELETE FROM refresh_tokens WHERE user_id IN ({user_placeholders})",
                user_ids,
            )
            connection.execute(
                f"DELETE FROM users WHERE id IN ({user_placeholders})",
                user_ids,
            )

        connection.commit()
        return len(report_rows), len(user_rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Cleanup dữ liệu có gắn tag theo scope.")
    parser.add_argument(
        "--scope",
        choices=("smoke", "seed"),
        default="smoke",
        help="Chọn nhóm dữ liệu cần dọn.",
    )
    args = parser.parse_args()

    if args.scope == "smoke":
        deleted_reports = cleanup_smoke_scope()
        print(f"Da xoa {deleted_reports} report thuoc scope {SMOKE_SCOPE} ({SMOKE_TAG}).")
        return

    deleted_reports, deleted_users = cleanup_seed_scope()
    print(
        f"Da xoa {deleted_reports} report va {deleted_users} user thuoc scope {SEED_SCOPE} ({SEED_TAG})."
    )


if __name__ == "__main__":
    main()
