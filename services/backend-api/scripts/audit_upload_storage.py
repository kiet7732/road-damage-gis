from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from pathlib import Path
import sys

BACKEND_SERVICE_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_SERVICE_DIR))

from app.config import get_settings
from app.database import get_connection
from scripts.data_scopes import SEED_IMAGE_PREFIX, SEED_TAG, SMOKE_TAG

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


@dataclass(frozen=True)
class UploadEntry:
    relative_path: str
    scope: str
    report_id: str | None = None


def _normalize_relative_path(value: str) -> str:
    return value.replace("\\", "/").lstrip("/")


def _classify_scope(*, image_path: str, note: str | None) -> str:
    normalized_image_path = _normalize_relative_path(image_path)
    normalized_note = (note or "").strip()

    if normalized_image_path.split("/")[-1].startswith(SEED_IMAGE_PREFIX) or normalized_note.startswith(SEED_TAG):
        return "seed-demo"

    if normalized_note.startswith(SMOKE_TAG):
        return "e2e-smoke"

    return "local-runtime"


def load_db_upload_entries() -> list[UploadEntry]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT id, image_path, note
            FROM reports
            WHERE image_path IS NOT NULL
              AND TRIM(image_path) <> ''
            ORDER BY created_at DESC
            """
        ).fetchall()

    return [
        UploadEntry(
            relative_path=_normalize_relative_path(row["image_path"]),
            scope=_classify_scope(image_path=row["image_path"], note=row["note"]),
            report_id=row["id"],
        )
        for row in rows
    ]


def main() -> None:
    settings = get_settings()
    upload_root = settings.resolved_upload_dir.parent
    report_dir = settings.resolved_upload_dir

    db_entries = load_db_upload_entries()
    db_paths = {entry.relative_path: entry for entry in db_entries}
    all_files = sorted(path for path in report_dir.rglob("*") if path.is_file())

    counter = Counter(entry.scope for entry in db_entries)
    orphan_files: list[str] = []

    for file_path in all_files:
        relative_path = _normalize_relative_path(str(file_path.relative_to(upload_root)))
        if relative_path not in db_paths:
            orphan_files.append(relative_path)

    print("=== UPLOAD STORAGE AUDIT ===")
    print(f"Upload root: {upload_root}")
    print(f"Report directory: {report_dir}")
    print(f"Seed files in DB: {counter.get('seed-demo', 0)}")
    print(f"Smoke files in DB: {counter.get('e2e-smoke', 0)}")
    print(f"Local runtime files in DB: {counter.get('local-runtime', 0)}")
    print(f"Orphan files on disk: {len(orphan_files)}")

    if orphan_files:
        print("\n[Orphan files]")
        for item in orphan_files:
            print(f"- {item}")

    print("\nKết luận:")
    print("- Ảnh seed-demo: file demo cố định, giữ lại để trình bày.")
    print("- Ảnh e2e-smoke: có thể dọn bằng cleanup smoke.")
    print("- Ảnh local-runtime: dữ liệu test tay thực tế, chỉ xóa khi bạn chủ động.")
    print("- Ảnh orphan: file còn trên ổ đĩa nhưng không còn report tham chiếu.")


if __name__ == "__main__":
    main()
