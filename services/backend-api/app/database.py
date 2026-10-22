import threading
import sqlite3
from datetime import date, datetime
from pathlib import Path
from typing import Any, Iterator, Sequence

from app.config import Settings, get_settings

_POOL_LOCK = threading.Lock()


def convert_qmark_to_pyformat(query: str) -> str:
    parts: list[str] = []
    in_string = False
    escaped = False
    for char in query:
        if char == "'" and not escaped:
            in_string = not in_string
            parts.append(char)
        elif char == "\\" and in_string:
            escaped = not escaped
            parts.append(char)
        elif char == "?" and not in_string:
            parts.append("%s")
        else:
            escaped = False
            parts.append(char)
    return "".join(parts)


def postgis_row_factory(cursor: Any) -> Any:
    if cursor.description is None:
        return lambda values: values

    keys = [col.name for col in cursor.description]

    def make_row(values: Sequence[Any]) -> Any:
        converted_values = [
            v.isoformat() if isinstance(v, (datetime, date)) else v
            for v in values
        ]
        d = dict(zip(keys, converted_values))
        t = tuple(converted_values)

        class HybridRow(dict):
            def __getitem__(self, item: Any) -> Any:
                if isinstance(item, int):
                    return t[item]
                return super().__getitem__(item)

        return HybridRow(d)

    return make_row


class SqliteConnectionAdapter:
    def __init__(self, raw_conn: sqlite3.Connection) -> None:
        self._raw_conn = raw_conn
        self._closed = False

    def execute(self, query: str, params: Any = None) -> sqlite3.Cursor:
        if params is None:
            return self._raw_conn.execute(query)
        return self._raw_conn.execute(query, params)

    def commit(self) -> None:
        if not self._closed:
            self._raw_conn.commit()

    def rollback(self) -> None:
        if not self._closed:
            self._raw_conn.rollback()

    def close(self) -> None:
        if not self._closed:
            self._closed = True
            self._raw_conn.close()

    def __enter__(self) -> "SqliteConnectionAdapter":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        try:
            if exc_type is not None:
                self.rollback()
            else:
                self.commit()
        finally:
            self.close()

    def __getattr__(self, name: str) -> Any:
        return getattr(self._raw_conn, name)


class PostgisConnectionAdapter:
    def __init__(self, raw_conn: Any, pool: Any = None) -> None:
        self._raw_conn = raw_conn
        self._pool = pool
        self._closed = False

    def execute(self, query: str, params: Any = None) -> Any:
        if params is not None and isinstance(params, (list, tuple)) and "?" in query:
            converted_query = convert_qmark_to_pyformat(query)
            return self._raw_conn.execute(converted_query, params)
        if params is not None:
            return self._raw_conn.execute(query, params)
        return self._raw_conn.execute(query)

    def commit(self) -> None:
        if not self._closed:
            self._raw_conn.commit()

    def rollback(self) -> None:
        if not self._closed:
            self._raw_conn.rollback()

    def close(self) -> None:
        if not self._closed:
            self._closed = True
            if self._pool is not None:
                try:
                    from psycopg.pq import TransactionStatus
                    if self._raw_conn.info.transaction_status != TransactionStatus.IDLE:
                        self._raw_conn.rollback()
                except Exception:
                    pass
                self._pool.putconn(self._raw_conn)
            else:
                self._raw_conn.close()

    def __enter__(self) -> "PostgisConnectionAdapter":
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        try:
            if exc_type is not None:
                self.rollback()
            else:
                self.commit()
        finally:
            self.close()

    def __getattr__(self, name: str) -> Any:
        return getattr(self._raw_conn, name)


_POSTGRES_POOL: Any = None


def get_postgres_pool(settings: Settings | None = None) -> Any:
    global _POSTGRES_POOL
    if _POSTGRES_POOL is None or getattr(_POSTGRES_POOL, "closed", True):
        with _POOL_LOCK:
            if _POSTGRES_POOL is None or getattr(_POSTGRES_POOL, "closed", True):
                from psycopg_pool import ConnectionPool

                if settings is None:
                    settings = get_settings()

                _POSTGRES_POOL = ConnectionPool(
                    conninfo=settings.resolved_database_url,
                    min_size=settings.postgres_pool_min_size,
                    max_size=settings.postgres_pool_max_size,
                    timeout=30.0,
                    kwargs={"row_factory": postgis_row_factory, "autocommit": False},
                    open=True,
                )
    return _POSTGRES_POOL


def close_postgres_pool() -> None:
    global _POSTGRES_POOL
    if _POSTGRES_POOL is not None:
        try:
            if not getattr(_POSTGRES_POOL, "closed", True):
                _POSTGRES_POOL.close()
        finally:
            _POSTGRES_POOL = None


def get_database_path() -> Path:
    settings = get_settings()
    settings.resolved_database_path.parent.mkdir(parents=True, exist_ok=True)
    return settings.resolved_database_path


def get_connection() -> Any:
    settings = get_settings()
    if settings.gis_backend == "postgis":
        pool = get_postgres_pool(settings)
        raw_conn = pool.getconn()
        return PostgisConnectionAdapter(raw_conn, pool=pool)

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
    return SqliteConnectionAdapter(connection)


def get_db_connection() -> Iterator[Any]:
    connection = get_connection()
    try:
        yield connection
    finally:
        connection.close()


def iter_connection() -> Iterator[Any]:
    return get_db_connection()


def init_database() -> None:
    settings = get_settings()
    if settings.gis_backend == "postgis":
        get_postgres_pool(settings)
        migration_file = Path(__file__).resolve().parents[1] / "migrations" / "001_initial_postgis_schema.sql"
        with get_connection() as connection:
            if migration_file.exists():
                connection.execute(migration_file.read_text(encoding="utf-8"))
            else:
                connection.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
                connection.execute("CREATE EXTENSION IF NOT EXISTS postgis_topology;")
                connection.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
        return

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
                road_name TEXT,
                ward TEXT,
                district TEXT,
                province TEXT,
                formatted_address TEXT,
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
                managed_district TEXT,
                managed_ward TEXT,
                auth_revoked_at TEXT,
                is_active INTEGER DEFAULT 1,
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
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS password_reset_otps (
                id TEXT PRIMARY KEY,
                email TEXT NOT NULL,
                otp_code TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                is_used INTEGER DEFAULT 0,
                created_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email
            ON password_reset_otps(email)
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
        address_report_columns = {
            "road_name": "ALTER TABLE reports ADD COLUMN road_name TEXT",
            "ward": "ALTER TABLE reports ADD COLUMN ward TEXT",
            "district": "ALTER TABLE reports ADD COLUMN district TEXT",
            "province": "ALTER TABLE reports ADD COLUMN province TEXT",
            "formatted_address": "ALTER TABLE reports ADD COLUMN formatted_address TEXT",
        }
        for column_name, statement in address_report_columns.items():
            if column_name not in report_columns:
                connection.execute(statement)
        user_columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(users)").fetchall()
        }
        if "auth_revoked_at" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN auth_revoked_at TEXT")
        if "managed_district" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN managed_district TEXT")
        if "managed_ward" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN managed_ward TEXT")
        if "is_active" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1")
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
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_district_ward
            ON reports(district, ward)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_reports_road_name
            ON reports(road_name)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS geocoding_cache (
                id TEXT PRIMARY KEY,
                latitude REAL NOT NULL,
                longitude REAL NOT NULL,
                road_name TEXT,
                ward TEXT,
                district TEXT,
                province TEXT,
                formatted_address TEXT NOT NULL,
                hit_count INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_geocoding_cache_coords
            ON geocoding_cache(latitude, longitude)
            """
        )
        connection.commit()


def check_database_health() -> dict[str, object]:
    settings = get_settings()
    if settings.gis_backend == "postgis":
        get_postgres_pool(settings)
        with get_connection() as connection:
            ping_row = connection.execute("SELECT 1 AS ok").fetchone()
            postgis_row = connection.execute(
                "SELECT extversion FROM pg_extension WHERE extname = 'postgis'"
            ).fetchone()

        is_connected = ping_row is not None and (ping_row.get("ok") == 1 or ping_row.get("ok") is True)
        postgis_ready = postgis_row is not None
        postgis_ver = postgis_row.get("extversion") if postgis_row else None

        return {
            "status": "ok" if (is_connected and postgis_ready) else "error",
            "backend": "postgis",
            "connected": is_connected,
            "ready": is_connected and postgis_ready,
            "database": settings.postgres_db,
            "host": settings.postgres_host,
            "port": settings.postgres_port,
            "postgis_version": postgis_ver,
            "pool": {
                "min_size": settings.postgres_pool_min_size,
                "max_size": settings.postgres_pool_max_size,
            },
        }
    else:
        with get_connection() as connection:
            ping_row = connection.execute("SELECT 1 AS ok").fetchone()

        is_connected = ping_row is not None and ping_row["ok"] == 1
        return {
            "status": "ok" if is_connected else "error",
            "backend": "sqlite",
            "connected": is_connected,
            "ready": is_connected,
            "database_path": str(get_database_path()),
            "database_exists": get_database_path().exists(),
        }


def check_database_ready() -> dict[str, object]:
    settings = get_settings()
    if settings.gis_backend == "postgis":
        required_tables = {"users", "reports", "refresh_tokens", "geocoding_cache"}
        with get_connection() as connection:
            ping_row = connection.execute("SELECT 1 AS ok").fetchone()
            postgis_row = connection.execute(
                "SELECT extversion FROM pg_extension WHERE extname = 'postgis'"
            ).fetchone()
            table_rows = connection.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
                """
            ).fetchall()

        available_tables = [str(row["table_name"]) for row in table_rows]
        missing_tables = sorted(required_tables.difference(available_tables))
        is_connected = ping_row is not None and (ping_row.get("ok") == 1 or ping_row.get("ok") is True)
        postgis_ready = postgis_row is not None

        return {
            "connected": is_connected,
            "backend": "postgis",
            "database": settings.postgres_db,
            "host": settings.postgres_host,
            "port": settings.postgres_port,
            "pool": {
                "min_size": settings.postgres_pool_min_size,
                "max_size": settings.postgres_pool_max_size,
            },
            "required_tables": sorted(required_tables),
            "available_tables": available_tables,
            "missing_tables": missing_tables,
            "postgis_installed": postgis_ready,
            "postgis_version": postgis_row.get("extversion") if postgis_ready else None,
            "ready": is_connected and postgis_ready and len(missing_tables) == 0,
        }
    else:
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
        required_tables = {"users", "reports", "refresh_tokens", "geocoding_cache"}
        missing_tables = sorted(required_tables.difference(available_tables))

        return {
            "connected": ping_row is not None and ping_row["ok"] == 1,
            "backend": "sqlite",
            "database_path": str(database_path),
            "database_exists": database_path.exists(),
            "required_tables": sorted(required_tables),
            "available_tables": available_tables,
            "missing_tables": missing_tables,
            "ready": len(missing_tables) == 0,
        }


def inspect_database_runtime() -> dict[str, object]:
    settings = get_settings()
    if settings.gis_backend == "postgis":
        with get_connection() as connection:
            table_rows = connection.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name;
                """
            ).fetchall()
            table_names = [str(row["table_name"]) for row in table_rows]

            tables: dict[str, object] = {}
            for table_name in ("users", "refresh_tokens", "reports", "geocoding_cache", "report_engineer_actions"):
                if table_name in table_names:
                    col_rows = connection.execute(
                        """
                        SELECT column_name, data_type, is_nullable
                        FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = ?
                        ORDER BY ordinal_position;
                        """,
                        (table_name,),
                    ).fetchall()
                    count_row = connection.execute(f"SELECT COUNT(*) AS total FROM {table_name};").fetchone()
                    tables[table_name] = {
                        "columns": [{"name": r["column_name"], "type": r["data_type"], "nullable": r["is_nullable"] == "YES"} for r in col_rows],
                        "row_count": int(count_row["total"]) if count_row else 0,
                    }

            idx_rows = connection.execute(
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
                WHERE n.nspname = 'public'
                ORDER BY t.relname, i.relname;
                """
            ).fetchall()

        return {
            "engine": "postgis",
            "database": settings.postgres_db,
            "host": settings.postgres_host,
            "port": settings.postgres_port,
            "tables": tables,
            "indexes": [{"name": str(r["index_name"]), "table": str(r["table_name"]), "type": str(r["index_type"])} for r in idx_rows],
        }

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
