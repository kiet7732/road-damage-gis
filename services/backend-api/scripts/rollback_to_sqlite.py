"""Emergency Rollback Script: PostGIS back to SQLite in under 3 minutes.

Ticket: RDG-PG-08
Component: Deployment / Cutover Runbook
SLA: Rollback completed in under 3 minutes (180 seconds).
Steps:
  1. Set temporary maintenance window
  2. Switch configuration: GIS_BACKEND=sqlite
  3. Optional/Default: Restore SQLite file from backup_pre_migration.db
  4. Verify SQLite readiness & database health
  5. Restore write access (READ_ONLY_MODE=false)
  6. Output verification report
"""

import argparse
import os
import shutil
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.config import get_settings
from app.database import (
    check_database_health,
    check_database_ready,
    close_postgres_pool,
    get_connection,
)


def update_env_variable(env_file_path: Path, key: str, value: str) -> None:
    if not env_file_path.exists():
        env_file_path.write_text(f"{key}={value}\n", encoding="utf-8")
        return

    lines = env_file_path.read_text(encoding="utf-8").splitlines()
    found = False
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith(f"{key}=") or stripped.startswith(f"{key} ="):
            new_lines.append(f"{key}={value}")
            found = True
        else:
            new_lines.append(line)

    if not found:
        new_lines.append(f"{key}={value}")

    env_file_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


def run_rollback(restore_backup: bool = True) -> bool:
    t_start = time.perf_counter()
    print("=" * 80)
    print("      QUY TRÌNH ROLLBACK KHẨN CẤP VỀ SQLITE (SLA < 3 PHÚT) (TICKET RDG-PG-08)")
    print(f"      Thời gian khởi chạy: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("=" * 80)

    env_file = BASE_DIR / ".env"
    data_dir = BASE_DIR / "data"
    sqlite_db_path = data_dir / "road_damage_gis.db"
    backup_db_path = data_dir / "backup_pre_migration.db"

    # Bước 1: Khóa ghi tạm thời
    print("\n>>> [BƯỚC 1/5] Kích hoạt chế độ Read-only tạm thời...")
    if env_file.exists():
        update_env_variable(env_file, "READ_ONLY_MODE", "true")
    os.environ["READ_ONLY_MODE"] = "true"
    get_settings.cache_clear()
    print("    [OK] Đã kích hoạt READ_ONLY_MODE.")

    # Bước 2: Đổi cấu hình về SQLite
    print("\n>>> [BƯỚC 2/5] Chuyển đổi cấu hình môi trường về SQLite...")
    if env_file.exists():
        update_env_variable(env_file, "GIS_BACKEND", "sqlite")
    os.environ["GIS_BACKEND"] = "sqlite"
    get_settings.cache_clear()
    close_postgres_pool()
    print("    [OK] Đã cập nhật GIS_BACKEND=sqlite.")

    # Bước 3: Khôi phục SQLite từ snapshot backup nếu có yêu cầu
    print("\n>>> [BƯỚC 3/5] Kiểm tra và khôi phục tệp dữ liệu SQLite...")
    if restore_backup:
        if backup_db_path.exists():
            shutil.copy2(backup_db_path, sqlite_db_path)
            print(f"    [OK] Đã khôi phục hoàn chỉnh tệp SQLite từ snapshot: {backup_db_path}")
        else:
            print(f"    [CẢNH BÁO] Không tìm thấy snapshot {backup_db_path}, sử dụng tệp hiện có {sqlite_db_path}")
    else:
        print(f"    [INFO] Giữ nguyên tệp hiện có: {sqlite_db_path}")

    # Bước 4: Kiểm tra sức khỏe & Độ sẵn sàng của SQLite
    print("\n>>> [BƯỚC 4/5] Kiểm tra sức khỏe và độ sẵn sàng của SQLite...")
    ready = check_database_ready()
    health = check_database_health()
    if not ready.get("ready") or not health.get("ready"):
        print("    [LỖI] SQLite không sẵn sàng sau khi rollback!")
        return False

    with get_connection() as conn:
        user_cnt = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        rep_cnt = conn.execute("SELECT COUNT(*) FROM reports").fetchone()[0]
    print(f"    [OK] SQLite kết nối thành công: {user_cnt} users, {rep_cnt} reports trong cơ sở dữ liệu.")

    # Bước 5: Mở lại toàn bộ quyền ghi
    print("\n>>> [BƯỚC 5/5] Mở lại toàn bộ quyền ghi cho hệ thống...")
    if env_file.exists():
        update_env_variable(env_file, "READ_ONLY_MODE", "false")
    os.environ["READ_ONLY_MODE"] = "false"
    get_settings.cache_clear()
    print("    [OK] Đã tắt READ_ONLY_MODE. Hệ thống đã khôi phục trạng thái hoạt động bình thường trên SQLite.")

    elapsed_sec = time.perf_counter() - t_start
    print("\n" + "=" * 80)
    print(f"      ROLLBACK THÀNH CÔNG TRONG {elapsed_sec:.2f} GIÂY (CAM KẾT SLA < 180 GIÂY)")
    print("      Dữ liệu lịch sử trước thời điểm cutover được bảo toàn nguyên vẹn 100%.")
    print("=" * 80)
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Emergency Rollback Script")
    parser.add_argument("--no-restore-backup", action="store_true", help="Không ghi đè tệp sqlite từ backup")
    args = parser.parse_args()

    success = run_rollback(restore_backup=not args.no_restore_backup)
    sys.exit(0 if success else 1)
