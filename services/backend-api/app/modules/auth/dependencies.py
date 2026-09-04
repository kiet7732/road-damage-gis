from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.database import get_connection
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import AuthUser
from app.modules.auth.security import ACCESS_TOKEN_TYPE, TokenValidationError, decode_token


http_bearer = HTTPBearer(auto_error=False)
ADMIN_ROLES = {"admin", "manager", "staff", "officer", "can_bo"}
ENGINEER_ROLES = {"field_engineer"}


def _get_access_token(
    credentials: HTTPAuthorizationCredentials | None,
    access_cookie: str | None,
) -> str | None:
    if credentials and credentials.scheme.lower() == "bearer" and credentials.credentials:
        return credentials.credentials

    return access_cookie


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    settings: Settings = Depends(get_settings),
    request: Request = None,
) -> AuthUser:
    access_cookie = request.cookies.get(settings.web_access_cookie_name) if request else None
    token = _get_access_token(credentials, access_cookie)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thiếu thông tin xác thực.",
        )

    try:
        payload = decode_token(
            token,
            secret_key=settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
            expected_type=ACCESS_TOKEN_TYPE,
        )
    except TokenValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    with get_connection() as connection:
        repository = AuthRepository(connection)
        row = repository.get_user_by_id(payload["sub"])

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Người dùng không tồn tại hoặc đã bị vô hiệu hóa.",
        )

    auth_revoked_at = row["auth_revoked_at"] if "auth_revoked_at" in row.keys() else None
    token_issued_at = payload.get("iat")

    if auth_revoked_at and isinstance(token_issued_at, int):
        revoked_at_datetime = datetime.fromisoformat(
            auth_revoked_at.replace("Z", "+00:00")
        )
        if revoked_at_datetime.tzinfo is None:
            revoked_at_datetime = revoked_at_datetime.replace(tzinfo=timezone.utc)

        if token_issued_at <= int(revoked_at_datetime.timestamp()):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.",
            )

    return AuthRepository.row_to_user(row)


def get_admin_user(
    current_user: AuthUser = Depends(get_current_user),
) -> AuthUser:
    if current_user.role.strip().lower() not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản không có quyền truy cập tài nguyên quản trị.",
        )

    return current_user


def get_engineer_user(
    current_user: AuthUser = Depends(get_current_user),
) -> AuthUser:
    if current_user.role.strip().lower() not in ENGINEER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản không có quyền truy cập tài nguyên kỹ sư hiện trường.",
        )

    return current_user
