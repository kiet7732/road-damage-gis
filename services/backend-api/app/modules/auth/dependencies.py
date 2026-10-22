from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.database import get_connection
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import AuthUser
from app.modules.auth.security import ACCESS_TOKEN_TYPE, TokenValidationError, decode_token


http_bearer = HTTPBearer(auto_error=False)
ADMIN_ROLES = {"admin", "super_admin", "manager", "staff", "officer", "can_bo", "district_officer"}
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

    if "is_active" in row.keys() and row["is_active"] == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị tạm khóa bởi Quản trị viên.",
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


def is_user_spatially_restricted(user: AuthUser) -> bool:
    role = (user.role or "").strip().lower()
    managed_district = (user.managed_district or user.managedDistrict or "").strip()
    return role == "district_officer" or bool(managed_district)


def get_user_managed_district(user: AuthUser) -> str | None:
    managed_district = (user.managed_district or user.managedDistrict or "").strip()
    return managed_district or None


def enforce_spatial_district_access(
    current_user: AuthUser,
    requested_district: str | None,
) -> str | None:
    """
    Enforces spatial access control based on user role and managed district:
    - If user is spatially restricted (district_officer or has managed_district):
      - If requested_district is supplied and does NOT match user's managed district:
        Raise 403 Forbidden (AC-02).
      - Otherwise, returns the user's managed district as the mandatory filter (AC-01).
    - If user is not spatially restricted (super_admin, general admin):
      - Returns requested_district as requested (no restriction) (AC-03).
    """
    if not is_user_spatially_restricted(current_user):
        return (requested_district or "").strip() or None

    user_district = get_user_managed_district(current_user)
    if not user_district:
        return (requested_district or "").strip() or None

    if requested_district and requested_district.strip():
        req = requested_district.strip()
        if req.lower() != user_district.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cán bộ không có quyền truy cập dữ liệu ngoài địa bàn quản lý.",
            )

    return user_district


def verify_report_spatial_access(
    current_user: AuthUser,
    report_district: str | None,
    *,
    action_description: str = "truy cập",
) -> None:
    """
    Verifies that the current user has permission to access or modify a report in report_district.
    Raises 403 Forbidden if the user is restricted to a different district (AC-02).
    """
    if not is_user_spatially_restricted(current_user):
        return

    user_district = get_user_managed_district(current_user)
    if not user_district:
        return

    report_dist = (report_district or "").strip()
    if not report_dist or report_dist.lower() != user_district.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Không có quyền {action_description} hồ sơ phản ánh thuộc địa bàn khác.",
        )
