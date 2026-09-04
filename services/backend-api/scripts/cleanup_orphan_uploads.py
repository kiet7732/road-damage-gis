from __future__ import annotations

import argparse
from pathlib import Path
import sys

BACKEND_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_SERVICE_DIR))

from app.config import get_settings
from app.database import get_connection

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def _normalize_relative_path(value: str) -> str:
    return value.replace("\\", "/").lstrip("/")


def load_referenced_upload_paths() -> set[str]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT image_path
            FROM reports
            WHERE image_path IS NOT NULL
              AND TRIM(image_path) <> ''
            """
        ).fetchall()

    return {_normalize_relative_path(row["image_path"]) for row in rows}


def collect_orphan_files() -> list[Path]:
    settings = get_settings()
    upload_root = settings.resolved_upload_dir.parent
    report_dir = settings.resolved_upload_dir
    referenced_paths = load_referenced_upload_paths()

    orphan_files: list[Path] = []
    for file_path in sorted(path for path in report_dir.rglob("*") if path.is_file()):
        relative_path = _normalize_relative_path(str(file_path.relative_to(upload_root)))
        if relative_path not in referenced_paths:
            orphan_files.append(file_path)

    return orphan_files


def main() -> None:
    parser = argparse.ArgumentParser(description="Dọn ảnh upload orphan không còn report tham chiếu.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Thực hiện xóa thật. Nếu không truyền, script chỉ in preview.",
    )
    args = parser.parse_args()

    orphan_files = collect_orphan_files()

    print("=== ORPHAN UPLOAD CLEANUP ===")
    print(f"Orphan files: {len(orphan_files)}")

    if not orphan_files:
        print("Không có file orphan để dọn.")
        return

    for item in orphan_files:
        print(f"- {item}")

    if not args.apply:
        print("\nPreview mode: chưa xóa file nào. Dùng --apply để xóa thật.")
        return

    deleted = 0
    for item in orphan_files:
        try:
            item.unlink()
            deleted += 1
        except FileNotFoundError:
            continue

    print(f"\nĐã xóa {deleted} file orphan.")


if __name__ == "__main__":
    main()
