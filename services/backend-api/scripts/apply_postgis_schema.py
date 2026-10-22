import os
import sys
from pathlib import Path

# Add backend app directory to sys.path
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import psycopg
from app.config import get_settings


def apply_postgis_schema() -> None:
    settings = get_settings()
    migration_file = BASE_DIR / "migrations" / "001_initial_postgis_schema.sql"

    if not migration_file.exists():
        print(f"LỖI: Không tìm thấy file migration tại {migration_file}")
        sys.exit(1)

    print(f"=== KHỞI TẠO VÀ ÁP DỤNG SCHEMA POSTGIS 3.4 ===")
    print(f"Target Database: {settings.resolved_database_url}")
    print(f"Migration file: {migration_file}")

    sql_content = migration_file.read_text(encoding="utf-8")

    # Connect directly to Postgres to apply DDL
    with psycopg.connect(settings.resolved_database_url, autocommit=True) as conn:
        with conn.cursor() as cur:
            print("Đang thực thi các câu lệnh DDL...")
            cur.execute(sql_content)
            print("Đã thực thi thành công script DDL.")

            # Kiểm tra bảng đã tạo
            cur.execute(
                """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name;
                """
            )
            tables = [row[0] for row in cur.fetchall()]
            print("\nDanh sách bảng hiện có trong public schema:")
            for tbl in tables:
                print(f"  - {tbl}")

            # Kiểm tra các cột không gian đã đăng ký trong geometry_columns
            cur.execute(
                """
                SELECT f_table_name, f_geometry_column, coord_dimension, srid, type
                FROM geometry_columns
                ORDER BY f_table_name, f_geometry_column;
                """
            )
            geom_cols = cur.fetchall()
            print("\nDanh sách cột hình học không gian (PostGIS Geometry Columns):")
            for row in geom_cols:
                print(f"  - Table: {row[0]}, Column: {row[1]}, SRID: {row[3]}, Type: {row[4]}")

            # Kiểm tra chỉ mục GiST và GIN
            cur.execute(
                """
                SELECT 
                    i.relname AS index_name,
                    t.relname AS table_name,
                    a.amname AS index_type
                FROM pg_class i
                JOIN pg_index idx ON idx.indexrelid = i.oid
                JOIN pg_class t ON t.oid = idx.indrelid
                JOIN pg_am a ON a.oid = i.relam
                JOIN pg_namespace n ON n.oid = t.relnamespace
                WHERE n.nspname = 'public' AND a.amname IN ('gist', 'gin')
                ORDER BY a.amname, i.relname;
                """
            )
            special_indexes = cur.fetchall()
            print("\nDanh sách chỉ mục GiST & GIN tối ưu hiệu năng:")
            for idx in special_indexes:
                print(f"  - Index: {idx[0]} (Type: {idx[2].upper()}, Table: {idx[1]})")

    print("\n=== HOÀN TẤT ÁP DỤNG SCHEMA POSTGIS CHUẨN SẢN XUẤT ===")


if __name__ == "__main__":
    apply_postgis_schema()
