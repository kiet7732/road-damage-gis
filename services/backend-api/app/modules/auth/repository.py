import sqlite3
from datetime import datetime, timezone
from uuid import uuid4

from app.modules.auth.schemas import AuthUser, RegisterRequest
from app.modules.auth.security import hash_password


class AuthRepository:
    def __init__(self, connection: sqlite3.Connection) -> None:
        self.connection = connection

    def get_user_by_email(self, email: str) -> sqlite3.Row | None:
        return self.connection.execute(
            """
            SELECT *
            FROM users
            WHERE lower(email) = lower(?)
            """,
            (email.strip(),),
        ).fetchone()

    def get_user_by_id(self, user_id: str) -> sqlite3.Row | None:
        return self.connection.execute(
            """
            SELECT *
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()

    def create_user(self, payload: RegisterRequest) -> AuthUser:
        now = datetime.now(timezone.utc).isoformat()
        user_id = str(uuid4())
        email = payload.email.strip().lower()
        phone = payload.phone.strip() if payload.phone else None

        self.connection.execute(
            """
            INSERT INTO users (
                id,
                full_name,
                email,
                phone,
                password_hash,
                role,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                payload.fullName.strip(),
                email,
                phone,
                hash_password(payload.password),
                "reporter",
                now,
                now,
            ),
        )
        self.connection.commit()

        return AuthUser(
            id=user_id,
            fullName=payload.fullName.strip(),
            email=email,
            phone=phone,
            role="reporter",
        )

    def store_refresh_token(
        self,
        *,
        token_id: str,
        user_id: str,
        token_hash: str,
        expires_at: str,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.connection.execute(
            """
            INSERT INTO refresh_tokens (
                id,
                user_id,
                token_hash,
                expires_at,
                created_at,
                revoked_at,
                replaced_by_token_id
            )
            VALUES (?, ?, ?, ?, ?, NULL, NULL)
            """,
            (token_id, user_id, token_hash, expires_at, now),
        )
        self.connection.commit()

    def get_refresh_token_session(self, token_id: str) -> sqlite3.Row | None:
        return self.connection.execute(
            """
            SELECT *
            FROM refresh_tokens
            WHERE id = ?
            """,
            (token_id,),
        ).fetchone()

    def revoke_refresh_token(
        self,
        token_id: str,
        *,
        replaced_by_token_id: str | None = None,
    ) -> None:
        revoked_at = datetime.now(timezone.utc).isoformat()
        self.connection.execute(
            """
            UPDATE refresh_tokens
            SET revoked_at = ?, replaced_by_token_id = COALESCE(?, replaced_by_token_id)
            WHERE id = ?
            """,
            (revoked_at, replaced_by_token_id, token_id),
        )
        self.connection.commit()

    def revoke_all_refresh_tokens_for_user(self, user_id: str) -> None:
        revoked_at = datetime.now(timezone.utc).isoformat()
        self.connection.execute(
            """
            UPDATE refresh_tokens
            SET revoked_at = COALESCE(revoked_at, ?)
            WHERE user_id = ?
            """,
            (revoked_at, user_id),
        )
        self.connection.commit()

    def mark_user_auth_revoked(self, user_id: str, *, revoked_at: str) -> None:
        self.connection.execute(
            """
            UPDATE users
            SET auth_revoked_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (revoked_at, revoked_at, user_id),
        )
        self.connection.commit()

    def update_user_password(self, user_id: str, new_password_hash: str) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.connection.execute(
            """
            UPDATE users
            SET password_hash = ?, updated_at = ?
            WHERE id = ?
            """,
            (new_password_hash, now, user_id),
        )
        self.connection.commit()

    def create_password_reset_otp(
        self,
        *,
        email: str,
        otp_code: str,
        expires_at: str,
    ) -> str:
        otp_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()
        self.connection.execute(
            """
            INSERT INTO password_reset_otps (
                id,
                email,
                otp_code,
                expires_at,
                is_used,
                created_at
            )
            VALUES (?, ?, ?, ?, 0, ?)
            """,
            (otp_id, email.strip().lower(), otp_code.strip(), expires_at, now),
        )
        self.connection.commit()
        return otp_id

    def get_valid_password_reset_otp(
        self,
        *,
        email: str,
        otp_code: str,
    ) -> sqlite3.Row | None:
        now = datetime.now(timezone.utc).isoformat()
        return self.connection.execute(
            """
            SELECT *
            FROM password_reset_otps
            WHERE lower(email) = lower(?)
              AND otp_code = ?
              AND is_used = 0
              AND expires_at >= ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (email.strip().lower(), otp_code.strip(), now),
        ).fetchone()

    def mark_password_reset_otp_used(self, otp_id: str) -> None:
        self.connection.execute(
            """
            UPDATE password_reset_otps
            SET is_used = 1
            WHERE id = ?
            """,
            (otp_id,),
        )
        self.connection.commit()

    def invalidate_all_otps_for_email(self, email: str) -> None:
        self.connection.execute(
            """
            UPDATE password_reset_otps
            SET is_used = 1
            WHERE lower(email) = lower(?) AND is_used = 0
            """,
            (email.strip().lower(),),
        )
        self.connection.commit()

    @staticmethod
    def row_to_user(row: sqlite3.Row) -> AuthUser:
        keys = row.keys() if hasattr(row, "keys") else []
        is_active_raw = row["is_active"] if "is_active" in keys else 1
        is_active = bool(is_active_raw) if is_active_raw is not None else True
        return AuthUser(
            id=row["id"],
            fullName=row["full_name"],
            email=row["email"],
            phone=row["phone"] if "phone" in keys else None,
            role=row["role"],
            managedDistrict=row["managed_district"] if "managed_district" in keys else None,
            managedWard=row["managed_ward"] if "managed_ward" in keys else None,
            isActive=is_active,
            is_active=is_active,
        )
