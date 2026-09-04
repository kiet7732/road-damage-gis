import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt


ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


class TokenValidationError(Exception):
    pass


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120_000,
    ).hex()

    return f"pbkdf2_sha256$120000${salt}${password_hash}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations, salt, expected_hash = stored_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    actual_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(iterations),
    ).hex()

    return hmac.compare_digest(actual_hash, expected_hash)


def create_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(
    *,
    secret_key: str,
    algorithm: str,
    subject: str,
    role: str,
    expires_minutes: int,
) -> str:
    issued_at = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "type": ACCESS_TOKEN_TYPE,
        "iat": int(issued_at.timestamp()),
        "exp": int((issued_at + timedelta(minutes=expires_minutes)).timestamp()),
    }
    return jwt.encode(payload, secret_key, algorithm=algorithm)


def create_refresh_token(
    *,
    secret_key: str,
    algorithm: str,
    subject: str,
    role: str,
    token_id: str,
    expires_days: int,
) -> str:
    issued_at = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "role": role,
        "jti": token_id,
        "type": REFRESH_TOKEN_TYPE,
        "iat": int(issued_at.timestamp()),
        "exp": int((issued_at + timedelta(days=expires_days)).timestamp()),
    }
    return jwt.encode(payload, secret_key, algorithm=algorithm)


def decode_token(
    token: str,
    *,
    secret_key: str,
    algorithm: str,
    expected_type: str,
) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise TokenValidationError("Phiên đăng nhập đã hết hạn.") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenValidationError("Token xác thực không hợp lệ.") from exc

    if payload.get("type") != expected_type:
        raise TokenValidationError("Loại token không hợp lệ.")

    subject = payload.get("sub")
    role = payload.get("role")

    if not isinstance(subject, str) or not subject:
        raise TokenValidationError("Token không chứa định danh người dùng hợp lệ.")

    if not isinstance(role, str) or not role:
        raise TokenValidationError("Token không chứa vai trò hợp lệ.")

    if expected_type == REFRESH_TOKEN_TYPE:
        token_id = payload.get("jti")

        if not isinstance(token_id, str) or not token_id:
            raise TokenValidationError("Refresh token không hợp lệ.")

    return payload
