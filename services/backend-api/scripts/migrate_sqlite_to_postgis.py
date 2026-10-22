import argparse
import json
import os
import sqlite3
import sys
from pathlib import Path
from typing import Any

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
from app.database import get_database_path


def validate_json_string(val: Any) -> str:
    if not val:
        return '{"detections": []}'
    if isinstance(val, str):
        try:
            json.loads(val)
            return val
        except Exception:
            return '{"detections": []}'
    try:
        return json.dumps(val)
    except Exception:
        return '{"detections": []}'


def migrate_users(sqlite_conn: sqlite3.Connection, pg_conn: psycopg.Connection, dry_run: bool = False) -> int:
    cur_sqlite = sqlite_conn.cursor()
    cur_sqlite.execute(
        """
        SELECT id, full_name, email, phone, password_hash, role,
               managed_district, managed_ward, auth_revoked_at, is_active,
               created_at, updated_at
        FROM users
        """
    )
    rows = cur_sqlite.fetchall()
    print(f"[USERS] Tìm thấy {len(rows)} bản ghi trong SQLite.")

    if dry_run:
        return len(rows)

    upsert_sql = """
    INSERT INTO users (
        id, full_name, email, phone, password_hash, role,
        managed_district, managed_ward, auth_revoked_at, is_active,
        created_at, updated_at
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        managed_district = EXCLUDED.managed_district,
        managed_ward = EXCLUDED.managed_ward,
        auth_revoked_at = EXCLUDED.auth_revoked_at,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at;
    """

    with pg_conn.cursor() as cur_pg:
        for row in rows:
            cur_pg.execute(
                upsert_sql,
                (
                    row["id"],
                    row["full_name"],
                    row["email"],
                    row["phone"],
                    row["password_hash"],
                    row["role"],
                    row["managed_district"],
                    row["managed_ward"],
                    row["auth_revoked_at"],
                    bool(row["is_active"]),
                    row["created_at"],
                    row["updated_at"],
                ),
            )
    return len(rows)


def migrate_reports(sqlite_conn: sqlite3.Connection, pg_conn: psycopg.Connection, dry_run: bool = False) -> int:
    cur_sqlite = sqlite_conn.cursor()
    cur_sqlite.execute("SELECT * FROM reports")
    rows = cur_sqlite.fetchall()
    print(f"[REPORTS] Tìm thấy {len(rows)} bản ghi trong SQLite.")

    if dry_run:
        return len(rows)

    # Get valid user IDs to avoid FK violations
    with pg_conn.cursor() as cur_pg:
        cur_pg.execute("SELECT id FROM users")
        valid_user_ids = {r[0] for r in cur_pg.fetchall()}

    upsert_sql = """
    INSERT INTO reports (
        id, user_id, image_path, geom, gps_accuracy, location_source, location_recorded_at,
        note, ai_status, status, ai_message, detections_json, admin_note, corrected_damage_type,
        is_ai_overridden, road_name, ward, district, province, formatted_address,
        created_at, updated_at, assigned_engineer_id, claimed_by_engineer_id, claimed_at,
        claim_expires_at, claim_status, claim_source, field_status, survey_started_at,
        survey_completed_at, field_verified_damage_type, field_severity, field_priority,
        field_note, field_checked_in_geom, field_checked_in_accuracy,
        field_checked_in_distance_meters, field_checked_in_at
    )
    VALUES (
        %(id)s, %(user_id)s, %(image_path)s,
        ST_SetSRID(ST_MakePoint(%(longitude)s, %(latitude)s), 4326),
        %(gps_accuracy)s, %(location_source)s, %(location_recorded_at)s,
        %(note)s, %(ai_status)s, %(status)s, %(ai_message)s, %(detections_json)s::jsonb,
        %(admin_note)s, %(corrected_damage_type)s, %(is_ai_overridden)s,
        %(road_name)s, %(ward)s, %(district)s, %(province)s, %(formatted_address)s,
        %(created_at)s, %(updated_at)s, %(assigned_engineer_id)s, %(claimed_by_engineer_id)s,
        %(claimed_at)s, %(claim_expires_at)s, %(claim_status)s, %(claim_source)s,
        %(field_status)s, %(survey_started_at)s, %(survey_completed_at)s,
        %(field_verified_damage_type)s, %(field_severity)s, %(field_priority)s,
        %(field_note)s,
        CASE WHEN %(field_lon)s::float8 IS NOT NULL AND %(field_lat)s::float8 IS NOT NULL 
             THEN ST_SetSRID(ST_MakePoint(%(field_lon)s::float8, %(field_lat)s::float8), 4326) 
             ELSE NULL END,
        %(field_checked_in_accuracy)s, %(field_checked_in_distance_meters)s, %(field_checked_in_at)s
    )
    ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        image_path = EXCLUDED.image_path,
        geom = EXCLUDED.geom,
        gps_accuracy = EXCLUDED.gps_accuracy,
        location_source = EXCLUDED.location_source,
        location_recorded_at = EXCLUDED.location_recorded_at,
        note = EXCLUDED.note,
        ai_status = EXCLUDED.ai_status,
        status = EXCLUDED.status,
        ai_message = EXCLUDED.ai_message,
        detections_json = EXCLUDED.detections_json,
        admin_note = EXCLUDED.admin_note,
        corrected_damage_type = EXCLUDED.corrected_damage_type,
        is_ai_overridden = EXCLUDED.is_ai_overridden,
        road_name = EXCLUDED.road_name,
        ward = EXCLUDED.ward,
        district = EXCLUDED.district,
        province = EXCLUDED.province,
        formatted_address = EXCLUDED.formatted_address,
        updated_at = EXCLUDED.updated_at,
        assigned_engineer_id = EXCLUDED.assigned_engineer_id,
        claimed_by_engineer_id = EXCLUDED.claimed_by_engineer_id,
        claimed_at = EXCLUDED.claimed_at,
        claim_expires_at = EXCLUDED.claim_expires_at,
        claim_status = EXCLUDED.claim_status,
        claim_source = EXCLUDED.claim_source,
        field_status = EXCLUDED.field_status,
        survey_started_at = EXCLUDED.survey_started_at,
        survey_completed_at = EXCLUDED.survey_completed_at,
        field_verified_damage_type = EXCLUDED.field_verified_damage_type,
        field_severity = EXCLUDED.field_severity,
        field_priority = EXCLUDED.field_priority,
        field_note = EXCLUDED.field_note,
        field_checked_in_geom = EXCLUDED.field_checked_in_geom,
        field_checked_in_accuracy = EXCLUDED.field_checked_in_accuracy,
        field_checked_in_distance_meters = EXCLUDED.field_checked_in_distance_meters,
        field_checked_in_at = EXCLUDED.field_checked_in_at;
    """

    with pg_conn.cursor() as cur_pg:
        for r in rows:
            d = dict(r)
            user_id = d.get("user_id")
            if user_id and user_id not in valid_user_ids:
                user_id = None

            assigned_id = d.get("assigned_engineer_id")
            if assigned_id and assigned_id not in valid_user_ids:
                assigned_id = None

            claimed_id = d.get("claimed_by_engineer_id")
            if claimed_id and claimed_id not in valid_user_ids:
                claimed_id = None

            detections_json = validate_json_string(d.get("detections_json"))

            # Extract field coordinates
            field_lat = d.get("field_checked_in_latitude")
            field_lon = d.get("field_checked_in_longitude")

            params = {
                "id": d["id"],
                "user_id": user_id,
                "image_path": d["image_path"],
                "longitude": float(d["longitude"]),
                "latitude": float(d["latitude"]),
                "gps_accuracy": d.get("gps_accuracy"),
                "location_source": d.get("location_source"),
                "location_recorded_at": d.get("location_recorded_at"),
                "note": d.get("note"),
                "ai_status": d.get("ai_status", "completed"),
                "status": d.get("status", "new"),
                "ai_message": d.get("ai_message"),
                "detections_json": detections_json,
                "admin_note": d.get("admin_note"),
                "corrected_damage_type": d.get("corrected_damage_type"),
                "is_ai_overridden": bool(d.get("is_ai_overridden", 0)),
                "road_name": d.get("road_name"),
                "ward": d.get("ward"),
                "district": d.get("district"),
                "province": d.get("province"),
                "formatted_address": d.get("formatted_address"),
                "created_at": d["created_at"],
                "updated_at": d["updated_at"],
                "assigned_engineer_id": assigned_id,
                "claimed_by_engineer_id": claimed_id,
                "claimed_at": d.get("claimed_at"),
                "claim_expires_at": d.get("claim_expires_at"),
                "claim_status": d.get("claim_status"),
                "claim_source": d.get("claim_source"),
                "field_status": d.get("field_status"),
                "survey_started_at": d.get("survey_started_at"),
                "survey_completed_at": d.get("survey_completed_at"),
                "field_verified_damage_type": d.get("field_verified_damage_type"),
                "field_severity": d.get("field_severity"),
                "field_priority": d.get("field_priority"),
                "field_note": d.get("field_note"),
                "field_lon": float(field_lon) if field_lon is not None else None,
                "field_lat": float(field_lat) if field_lat is not None else None,
                "field_checked_in_accuracy": d.get("field_checked_in_accuracy"),
                "field_checked_in_distance_meters": d.get("field_checked_in_distance_meters"),
                "field_checked_in_at": d.get("field_checked_in_at"),
            }

            cur_pg.execute(upsert_sql, params)

    return len(rows)


def migrate_refresh_tokens(sqlite_conn: sqlite3.Connection, pg_conn: psycopg.Connection, dry_run: bool = False) -> int:
    cur_sqlite = sqlite_conn.cursor()
    cur_sqlite.execute("SELECT * FROM refresh_tokens")
    rows = cur_sqlite.fetchall()
    print(f"[REFRESH_TOKENS] Tìm thấy {len(rows)} bản ghi trong SQLite.")

    if dry_run:
        return len(rows)

    with pg_conn.cursor() as cur_pg:
        cur_pg.execute("SELECT id FROM users")
        valid_user_ids = {r[0] for r in cur_pg.fetchall()}

    upsert_sql = """
    INSERT INTO refresh_tokens (
        id, user_id, token_hash, expires_at, created_at, revoked_at, replaced_by_token_id
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (id) DO UPDATE SET
        revoked_at = EXCLUDED.revoked_at,
        replaced_by_token_id = EXCLUDED.replaced_by_token_id;
    """

    count = 0
    sqlite_ids = [dict(r)["id"] for r in rows if dict(r)["user_id"] in valid_user_ids]
    with pg_conn.cursor() as cur_pg:
        if sqlite_ids:
            cur_pg.execute("DELETE FROM refresh_tokens WHERE NOT (id = ANY(%s))", (sqlite_ids,))
        for r in rows:
            d = dict(r)
            if d["user_id"] not in valid_user_ids:
                continue
            cur_pg.execute(
                upsert_sql,
                (
                    d["id"],
                    d["user_id"],
                    d["token_hash"],
                    d["expires_at"],
                    d["created_at"],
                    d.get("revoked_at"),
                    d.get("replaced_by_token_id"),
                ),
            )
            count += 1
    return count


def migrate_report_engineer_actions(sqlite_conn: sqlite3.Connection, pg_conn: psycopg.Connection, dry_run: bool = False) -> int:
    cur_sqlite = sqlite_conn.cursor()
    try:
        cur_sqlite.execute("SELECT * FROM report_engineer_actions")
        rows = cur_sqlite.fetchall()
    except Exception:
        rows = []
    print(f"[REPORT_ENGINEER_ACTIONS] Tìm thấy {len(rows)} bản ghi trong SQLite.")

    if dry_run:
        return len(rows)

    with pg_conn.cursor() as cur_pg:
        cur_pg.execute("SELECT id FROM reports")
        valid_report_ids = {r[0] for r in cur_pg.fetchall()}
        cur_pg.execute("SELECT id FROM users")
        valid_user_ids = {r[0] for r in cur_pg.fetchall()}

    upsert_sql = """
    INSERT INTO report_engineer_actions (
        id, report_id, engineer_id, action_type, action_payload_json, created_at
    )
    VALUES (%s, %s, %s, %s, %s::jsonb, %s)
    ON CONFLICT (id) DO UPDATE SET
        action_type = EXCLUDED.action_type,
        action_payload_json = EXCLUDED.action_payload_json;
    """

    count = 0
    with pg_conn.cursor() as cur_pg:
        for r in rows:
            d = dict(r)
            if d["report_id"] not in valid_report_ids:
                continue
            eng_id = d.get("engineer_id")
            if eng_id and eng_id not in valid_user_ids:
                eng_id = None

            payload = validate_json_string(d.get("action_payload_json"))
            cur_pg.execute(
                upsert_sql,
                (
                    d["id"],
                    d["report_id"],
                    eng_id,
                    d["action_type"],
                    payload,
                    d["created_at"],
                ),
            )
            count += 1
    return count


def migrate_geocoding_cache(sqlite_conn: sqlite3.Connection, pg_conn: psycopg.Connection, dry_run: bool = False) -> int:
    cur_sqlite = sqlite_conn.cursor()
    cur_sqlite.execute("SELECT * FROM geocoding_cache")
    rows = cur_sqlite.fetchall()
    print(f"[GEOCODING_CACHE] Tìm thấy {len(rows)} bản ghi trong SQLite.")

    if dry_run:
        return len(rows)

    upsert_sql = """
    INSERT INTO geocoding_cache (
        id, geom, road_name, ward, district, province, formatted_address,
        hit_count, created_at, updated_at
    )
    VALUES (
        %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s, %s, %s, %s, %s
    )
    ON CONFLICT (id) DO UPDATE SET
        geom = EXCLUDED.geom,
        road_name = EXCLUDED.road_name,
        ward = EXCLUDED.ward,
        district = EXCLUDED.district,
        province = EXCLUDED.province,
        formatted_address = EXCLUDED.formatted_address,
        hit_count = EXCLUDED.hit_count,
        updated_at = EXCLUDED.updated_at;
    """

    with pg_conn.cursor() as cur_pg:
        for r in rows:
            d = dict(r)
            cur_pg.execute(
                upsert_sql,
                (
                    d["id"],
                    float(d["longitude"]),
                    float(d["latitude"]),
                    d.get("road_name"),
                    d.get("ward"),
                    d.get("district"),
                    d.get("province"),
                    d["formatted_address"],
                    int(d.get("hit_count", 1)),
                    d["created_at"],
                    d["updated_at"],
                ),
            )
    return len(rows)


def verify_migration_checksum(sqlite_conn: sqlite3.Connection, pg_conn: psycopg.Connection) -> bool:
    print("\n=== BẮT ĐẦU ĐỐI SOÁT CHECKSUM TOÀN VẸN DỮ LIỆU ===")
    all_ok = True

    # 1. So sánh số lượng bản ghi
    tables_to_check = [
        ("users", "users"),
        ("reports", "reports"),
        ("geocoding_cache", "geocoding_cache"),
        ("refresh_tokens", "refresh_tokens"),
        ("report_engineer_actions", "report_engineer_actions"),
    ]

    for sq_tbl, pg_tbl in tables_to_check:
        try:
            sq_cnt = sqlite_conn.execute(f"SELECT COUNT(*) AS c FROM {sq_tbl}").fetchone()[0]
        except Exception:
            sq_cnt = 0

        with pg_conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) FROM {pg_tbl}")
            pg_cnt = cur.fetchone()[0]

        status = "KHỚP" if sq_cnt == pg_cnt else "LỆCH"
        if sq_cnt != pg_cnt:
            all_ok = False
        print(f"  - Bảng {pg_tbl}: SQLite={sq_cnt}, PostGIS={pg_cnt} -> {status}")

    # 2. Kiểm tra toạ độ từng bản ghi reports không bị đảo ngược
    cur_sq = sqlite_conn.cursor()
    cur_sq.execute("SELECT id, latitude, longitude FROM reports")
    reports_sq = {r["id"]: (float(r["latitude"]), float(r["longitude"])) for r in cur_sq.fetchall()}

    coord_errors = 0
    with pg_conn.cursor() as cur_pg:
        cur_pg.execute("SELECT id, ST_X(geom) as lon, ST_Y(geom) as lat FROM reports")
        for pg_id, pg_lon, pg_lat in cur_pg.fetchall():
            if pg_id in reports_sq:
                sq_lat, sq_lon = reports_sq[pg_id]
                if abs(pg_lon - sq_lon) > 1e-6 or abs(pg_lat - sq_lat) > 1e-6:
                    print(f"LỖI TOẠ ĐỘ tại report {pg_id}: SQLite=({sq_lon}, {sq_lat}) vs PostGIS=({pg_lon}, {pg_lat})")
                    coord_errors += 1

    if coord_errors == 0:
        print(f"  - Kiểm tra toạ độ {len(reports_sq)} reports: 100% CHÍNH XÁC (ST_X == longitude, ST_Y == latitude).")
    else:
        all_ok = False
        print(f"  - Có {coord_errors} bản ghi bị sai toạ độ!")

    # 3. Kiểm tra JSONB detections_json
    with pg_conn.cursor() as cur_pg:
        cur_pg.execute("SELECT COUNT(*) FROM reports WHERE jsonb_typeof(detections_json) = 'object'")
        valid_json_count = cur_pg.fetchone()[0]
        print(f"  - Cấu trúc JSONB: {valid_json_count}/{len(reports_sq)} reports có JSONB Object hợp lệ.")

    print(f"=== KẾT QUẢ ĐỐI SOÁT: {'ĐẠT CHUẨN (PASS)' if all_ok else 'KHÔNG ĐẠT'} ===")
    return all_ok


def main() -> None:
    parser = argparse.ArgumentParser(description="ETL Pipeline di chuyển dữ liệu từ SQLite sang PostgreSQL + PostGIS")
    parser.add_argument("--dry-run", action="store_true", help="Chạy thử nghiệm kiểm tra dữ liệu mà không ghi vào PostgreSQL")
    parser.add_argument("--batch-size", type=int, default=500, help="Kích thước batch xử lý")
    parser.add_argument("--verify-checksum", action="store_true", help="Thực hiện đối soát dữ liệu sau khi di chuyển")
    args = parser.parse_args()

    settings = get_settings()
    sqlite_path = get_database_path()

    if not sqlite_path.exists():
        print(f"LỖI: Không tìm thấy tệp SQLite tại {sqlite_path}")
        sys.exit(1)

    print(f"=== KHỞI CHẠY PIPELINE ETL DI CHUYỂN DỮ LIỆU SQLITE -> POSTGIS ===")
    print(f"Nguồn (SQLite): {sqlite_path}")
    print(f"Đích (PostgreSQL): {settings.resolved_database_url}")
    print(f"Chế độ: {'DRY RUN (Chỉ đọc)' if args.dry_run else 'EXECUTE (Ghi dữ liệu)'}")

    sqlite_conn = sqlite3.connect(sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row

    try:
        with psycopg.connect(settings.resolved_database_url, autocommit=True) as pg_conn:
            print("\n[Bước 1/5] Di chuyển bảng users...")
            migrate_users(sqlite_conn, pg_conn, dry_run=args.dry_run)

            print("\n[Bước 2/5] Di chuyển bảng reports (Point WGS84 + JSONB)...")
            migrate_reports(sqlite_conn, pg_conn, dry_run=args.dry_run)

            print("\n[Bước 3/5] Di chuyển bảng refresh_tokens...")
            migrate_refresh_tokens(sqlite_conn, pg_conn, dry_run=args.dry_run)

            print("\n[Bước 4/5] Di chuyển bảng report_engineer_actions...")
            migrate_report_engineer_actions(sqlite_conn, pg_conn, dry_run=args.dry_run)

            print("\n[Bước 5/5] Di chuyển bảng geocoding_cache...")
            migrate_geocoding_cache(sqlite_conn, pg_conn, dry_run=args.dry_run)

            if args.verify_checksum and not args.dry_run:
                success = verify_migration_checksum(sqlite_conn, pg_conn)
                if not success:
                    sys.exit(1)

    finally:
        sqlite_conn.close()

    print("\n=== HOÀN TẤT TOÀN BỘ QUÁ TRÌNH DI CHUYỂN DỮ LIỆU ===")


if __name__ == "__main__":
    main()
