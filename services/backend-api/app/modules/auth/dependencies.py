from datetime import datetime, timezone

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings
from app.database import get_connection
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import AuthUser
from app.modules.auth.security import ACCESS_TOKEN_TYPE, TokenValidationError, decode_token
from app.provinces_data import (
    PROVINCE_DISTRICT_HIERARCHY,
    normalize_province_name,
)


http_bearer = HTTPBearer(auto_error=False)
SYSTEM_ADMIN_ROLES = {"admin", "system_admin", "super_admin", "manager"}
PROVINCE_ADMIN_ROLES = {"province_officer", "provincial_admin", "provincial_manager"}
DISTRICT_OFFICER_ROLES = {"district_officer", "officer", "can_bo", "staff"}
ADMIN_ROLES = SYSTEM_ADMIN_ROLES | PROVINCE_ADMIN_ROLES | DISTRICT_OFFICER_ROLES
ENGINEER_ROLES = {"field_engineer"}
WEB_ONLY_ROLES = PROVINCE_ADMIN_ROLES | DISTRICT_OFFICER_ROLES


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


def is_system_admin(user: AuthUser) -> bool:
    role = (user.role or "").strip().lower()
    return role in SYSTEM_ADMIN_ROLES


def is_user_province_restricted(user: AuthUser) -> bool:
    if is_system_admin(user):
        return False
    role = (user.role or "").strip().lower()
    managed_province = (user.managed_province or user.managedProvince or "").strip()
    return role in PROVINCE_ADMIN_ROLES or (bool(managed_province) and role not in DISTRICT_OFFICER_ROLES)


def get_user_managed_province(user: AuthUser) -> str | None:
    if is_system_admin(user):
        return None
    raw_province = (user.managed_province or user.managedProvince or "").strip()
    return normalize_province_name(raw_province)


def is_user_spatially_restricted(user: AuthUser) -> bool:
    if is_system_admin(user) or is_user_province_restricted(user):
        return False
    role = (user.role or "").strip().lower()
    managed_district = (user.managed_district or user.managedDistrict or "").strip()
    return role in DISTRICT_OFFICER_ROLES or bool(managed_district)


def get_user_managed_district(user: AuthUser) -> str | None:
    if is_system_admin(user) or is_user_province_restricted(user):
        return None
    managed_district = (user.managed_district or user.managedDistrict or "").strip()
    return managed_district or None


def _infer_province_from_district(district: str | None) -> str | None:
    if not district or not district.strip():
        return None
    clean_dist = district.strip().lower()
    for prov, districts in PROVINCE_DISTRICT_HIERARCHY.items():
        for d in districts:
            d_low = d.lower()
            d_short = (
                d_low.replace("thành phố ", "")
                .replace("thị xã ", "")
                .replace("quận ", "")
                .replace("huyện ", "")
                .strip()
            )
            if clean_dist == d_low or clean_dist == d_short:
                return prov
    return None


def enforce_web_only_role_restriction(current_user: AuthUser) -> None:
    """
    Ngăn chặn vai trò Quản trị viên cấp tỉnh (province_officer) sử dụng chức năng của Mobile App.
    """
    role = (current_user.role or "").strip().lower()
    if role in PROVINCE_ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Vai trò Quản trị viên cấp tỉnh chỉ được phép sử dụng trên hệ thống Web Admin.",
        )


def enforce_spatial_province_access(
    current_user: AuthUser,
    requested_province: str | None,
) -> str | None:
    """
    Cưỡng chế kiểm soát phạm vi Tỉnh/Thành phố (Spatial Row-Level Security cấp Tỉnh):
    - Quản trị viên hệ thống (admin / system_admin): Không giới hạn, trả về requested_province.
    - Quản trị viên cấp tỉnh (province_officer):
      - Bắt buộc phải có managed_province.
      - Nếu truyền requested_province khác managed_province -> 403 Forbidden.
      - Luôn trả về managed_province để ép điều kiện lọc SQL.
    - Cán bộ cấp quận/huyện (district_officer):
      - Tự động suy luận tỉnh từ managed_district (nếu có) hoặc giữ nguyên requested_province.
    """
    if is_system_admin(current_user):
        return normalize_province_name(requested_province) or ((requested_province or "").strip() or None)

    if is_user_province_restricted(current_user):
        user_province = get_user_managed_province(current_user)
        if not user_province:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản Quản trị viên cấp tỉnh chưa được gán vùng quản lý.",
            )
        if requested_province and requested_province.strip():
            req_norm = normalize_province_name(requested_province)
            if not req_norm or req_norm.lower() != user_province.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Quản trị viên cấp tỉnh ({user_province}) không có quyền truy cập hoặc thao tác dữ liệu ngoài vùng quản lý.",
                )
        return user_province

    return normalize_province_name(requested_province) or ((requested_province or "").strip() or None)


def enforce_spatial_district_access(
    current_user: AuthUser,
    requested_district: str | None,
) -> str | None:
    """
    Enforces spatial access control based on user role and managed district/province:
    - If user is system_admin: no restriction.
    - If user is province_officer: can access any district within their managed_province,
      but raises 403 if requested_district belongs to a different province.
    - If user is district_officer: restricted strictly to managed_district.
    """
    if is_system_admin(current_user):
        return (requested_district or "").strip() or None

    if is_user_province_restricted(current_user):
        user_province = get_user_managed_province(current_user)
        if not user_province:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản Quản trị viên cấp tỉnh chưa được gán vùng quản lý.",
            )
        if requested_district and requested_district.strip():
            inferred_prov = _infer_province_from_district(requested_district)
            if inferred_prov and inferred_prov.lower() != user_province.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Quản trị viên cấp tỉnh ({user_province}) không có quyền truy cập địa bàn '{requested_district.strip()}' thuộc tỉnh khác.",
                )
        return (requested_district or "").strip() or None

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
    report_province: str | None = None,
    action_description: str = "truy cập",
) -> None:
    """
    Verifies that the current user has permission to access or modify a report in report_province / report_district.
    Raises 403 Forbidden if the user is restricted to a different province or district.
    """
    if is_system_admin(current_user):
        return

    if is_user_province_restricted(current_user):
        user_province = get_user_managed_province(current_user)
        if not user_province:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản Quản trị viên cấp tỉnh chưa được gán vùng quản lý.",
            )
        effective_report_province = normalize_province_name(report_province) or _infer_province_from_district(
            report_district
        )
        if not effective_report_province or effective_report_province.lower() != user_province.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Không có quyền {action_description} hồ sơ phản ánh nằm ngoài vùng quản lý ({user_province}).",
            )
        return

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
