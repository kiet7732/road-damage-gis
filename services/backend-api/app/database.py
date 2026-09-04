import sqlite3
from pathlib import Path
from typing import Iterator

from app.config import get_settings


def get_database_path() -> Path:
    settings = get_settings()
    settings.resolved_database_path.parent.mkdir(parents=True, exist_ok=True)
    return settings.resolved_database_path


def get_connection() -> sqlite3.Connection:
    connection = sqlite3.connect(
        get_database_path(),
        check_same_thread=False,
        timeout=30,
    )
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 30000")
    connection.execute("PRAGMA journal_mode = WAL")
    connection.execute("PRAGMA synchronous = NORMAL")
    return connection


def iter_connection() -> Iterator[sqlite3.Connection]:
    connection = get_connection()
    try:
        yield connection
    finally:
        connection.close()


def init_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS reports (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                image_path TEXT NOT NULL,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                gps_accuracy REAL,
                location_source TEXT,
                location_recorded_at TEXT,
                note TEXT,
                ai_status TEXT NOT NULL,
                status TEXT NOT NULL,
                ai_message TEXT,
                detections_json TEXT NOT NULL,
                admin_note TEXT,
                corrected_damage_type TEXT,
                is_ai_overridden INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_created_at
            ON reports(created_at)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_status
            ON reports(status)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                auth_revoked_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_users_email
            ON users(email)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token_hash TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                revoked_at TEXT,
                replaced_by_token_id TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id
            ON refresh_tokens(user_id)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash
            ON refresh_tokens(token_hash)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at
            ON refresh_tokens(expires_at)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_at
            ON refresh_tokens(revoked_at)
            """
        )

        report_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(reports)").fetchall()
        }
        if "user_id" not in report_columns:
            connection.execute("ALTER TABLE reports ADD COLUMN user_id TEXT")
        if "gps_accuracy" not in report_columns:
            connection.execute("ALTER TABLE reports ADD COLUMN gps_accuracy REAL")
        if "location_source" not in report_columns:
            connection.execute("ALTER TABLE reports ADD COLUMN location_source TEXT")
        if "location_recorded_at" not in report_columns:
            connection.execute("ALTER TABLE reports ADD COLUMN location_recorded_at TEXT")
        if "admin_note" not in report_columns:
            connection.execute("ALTER TABLE reports ADD COLUMN admin_note TEXT")
        if "corrected_damage_type" not in report_columns:
            connection.execute("ALTER TABLE reports ADD COLUMN corrected_damage_type TEXT")
        if "is_ai_overridden" not in report_columns:
            connection.execute("ALTER TABLE reports ADD COLUMN is_ai_overridden INTEGER DEFAULT 0")
        engineer_report_columns = {
            "assigned_engineer_id": "ALTER TABLE reports ADD COLUMN assigned_engineer_id TEXT",
            "claimed_by_engineer_id": "ALTER TABLE reports ADD COLUMN claimed_by_engineer_id TEXT",
            "claimed_at": "ALTER TABLE reports ADD COLUMN claimed_at TEXT",
            "claim_expires_at": "ALTER TABLE reports ADD COLUMN claim_expires_at TEXT",
            "claim_status": "ALTER TABLE reports ADD COLUMN claim_status TEXT",
            "claim_source": "ALTER TABLE reports ADD COLUMN claim_source TEXT",
            "field_status": "ALTER TABLE reports ADD COLUMN field_status TEXT",
            "survey_started_at": "ALTER TABLE reports ADD COLUMN survey_started_at TEXT",
            "survey_completed_at": "ALTER TABLE reports ADD COLUMN survey_completed_at TEXT",
            "field_verified_damage_type": "ALTER TABLE reports ADD COLUMN field_verified_damage_type TEXT",
            "field_severity": "ALTER TABLE reports ADD COLUMN field_severity TEXT",
            "field_priority": "ALTER TABLE reports ADD COLUMN field_priority TEXT",
            "field_note": "ALTER TABLE reports ADD COLUMN field_note TEXT",
            "field_checked_in_latitude": "ALTER TABLE reports ADD COLUMN field_checked_in_latitude REAL",
            "field_checked_in_longitude": "ALTER TABLE reports ADD COLUMN field_checked_in_longitude REAL",
            "field_checked_in_accuracy": "ALTER TABLE reports ADD COLUMN field_checked_in_accuracy REAL",
            "field_checked_in_distance_meters": "ALTER TABLE reports ADD COLUMN field_checked_in_distance_meters REAL",
            "field_checked_in_at": "ALTER TABLE reports ADD COLUMN field_checked_in_at TEXT",
        }
        report_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(reports)").fetchall()
        }
        for column_name, statement in engineer_report_columns.items():
            if column_name not in report_columns:
                connection.execute(statement)
        user_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(users)").fetchall()
        }
        if "auth_revoked_at" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN auth_revoked_at TEXT")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS report_engineer_actions (
                id TEXT PRIMARY KEY,
                report_id TEXT NOT NULL,
                engineer_id TEXT,
                action_type TEXT NOT NULL,
                action_payload_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(report_id) REFERENCES reports(id)
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_coordinates
            ON reports(latitude, longitude)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_user_id
            ON reports(user_id)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_corrected_damage_type
            ON reports(corrected_damage_type)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_ai_status
            ON reports(ai_status)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_location_source
            ON reports(location_source)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_field_status
            ON reports(field_status)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_assigned_engineer_id
            ON reports(assigned_engineer_id)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_claimed_by_engineer_id
            ON reports(claimed_by_engineer_id)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_claim_expires_at
            ON reports(claim_expires_at)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_report_engineer_actions_report_created_at
            ON report_engineer_actions(report_id, created_at)
            """
        )
        connection.commit()


def check_database_ready() -> dict[str, object]:
    database_path = get_database_path()

    with get_connection() as connection:
        ping_row = connection.execute("SELECT 1 AS ok").fetchone()
        table_rows = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
            """
        ).fetchall()

    available_tables = [str(row["name"]) for row in table_rows]
    required_tables = {"users", "reports", "refresh_tokens"}
    missing_tables = sorted(required_tables.difference(available_tables))

    return {
        "connected": ping_row is not None and ping_row["ok"] == 1,
        "database_path": str(database_path),
        "database_exists": database_path.exists(),
        "required_tables": sorted(required_tables),
        "available_tables": available_tables,
        "missing_tables": missing_tables,
        "ready": len(missing_tables) == 0,
    }


def inspect_database_runtime() -> dict[str, object]:
    database_path = get_database_path()

    with get_connection() as connection:
        table_rows = connection.execute(
            """
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
            ORDER BY name
            """
        ).fetchall()
        index_rows = connection.execute(
            """
            SELECT name, tbl_name
            FROM sqlite_master
            WHERE type = 'index'
              AND name NOT LIKE 'sqlite_autoindex_%'
            ORDER BY tbl_name, name
            """
        ).fetchall()

        table_names = [str(row["name"]) for row in table_rows]

        tables: dict[str, object] = {}
        for table_name in ("users", "refresh_tokens", "reports"):
            columns = [
                {
                    "name": row["name"],
                    "type": row["type"],
                    "notnull": bool(row["notnull"]),
                    "default": row["dflt_value"],
                    "primary_key": bool(row["pk"]),
                }
                for row in connection.execute(f"PRAGMA table_info({table_name})").fetchall()
            ]
            indexes = [
                str(row["name"])
                for row in connection.execute(f"PRAGMA index_list({table_name})").fetchall()
            ]
            count = connection.execute(f"SELECT COUNT(*) AS total FROM {table_name}").fetchone()["total"]
            tables[table_name] = {
                "columns": columns,
                "indexes": indexes,
                "row_count": int(count),
            }

        report_columns = {column["name"] for column in tables["reports"]["columns"]}  # type: ignore[index]
        gis_fields = {
            "latitude": "latitude" in report_columns,
            "longitude": "longitude" in report_columns,
            "gps_accuracy": "gps_accuracy" in report_columns,
            "location_source": "location_source" in report_columns,
            "location_recorded_at": "location_recorded_at" in report_columns,
        }
        ai_storage = {
            "storage_mode": "reports.detections_json",
            "separate_ai_result_table": "ai_result" in table_names,
            "detections_json_column": "detections_json" in report_columns,
            "ai_message_column": "ai_message" in report_columns,
            "corrected_damage_type_column": "corrected_damage_type" in report_columns,
            "is_ai_overridden_column": "is_ai_overridden" in report_columns,
        }

    return {
        "engine": "sqlite",
        "database_path": str(database_path),
        "database_exists": database_path.exists(),
        "tables": tables,
        "custom_indexes": [
            {"name": str(row["name"]), "table": str(row["tbl_name"])}
            for row in index_rows
        ],
        "gis_fields": gis_fields,
        "ai_result_storage": ai_storage,
    }
