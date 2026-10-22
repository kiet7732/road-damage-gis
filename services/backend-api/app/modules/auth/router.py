import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.config import Settings, get_settings
from app.database import get_connection
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.email_service import EmailDeliveryError, send_password_reset_otp_email
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import (
    AuthResponse,
    AuthUser,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    ResetPasswordRequest,
    VerifyOtpRequest,
)
from app.modules.auth.security import (
    ACCESS_TOKEN_TYPE,
    REFRESH_TOKEN_TYPE,
    TokenValidationError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)


router = APIRouter(prefix="/auth", tags=["auth"])
ADMIN_ROLES = {"admin", "super_admin", "manager", "staff", "officer", "can_bo", "district_officer"}
APP_ROLES = {"reporter", "citizen", "user", "field_engineer", "engineer", "engineer_staff"}

AUTH_CONTEXT_HEADER = "X-Auth-Context"
AUTH_CONTEXT_WEB_ADMIN = "web-admin"
AUTH_CONTEXT_MOBILE_APP = "mobile-app"

# Backward-compatibility aliases
ADMIN_AUTH_CONTEXT_HEADER = AUTH_CONTEXT_HEADER
ADMIN_AUTH_CONTEXT_VALUE = AUTH_CONTEXT_WEB_ADMIN


def _get_auth_context(request: Request | None) -> str:
    if request is None:
        return ""
    return request.headers.get(AUTH_CONTEXT_HEADER, "").strip().lower()


def _is_admin_web_auth_request(request: Request | None) -> bool:
    return _get_auth_context(request) == AUTH_CONTEXT_WEB_ADMIN


def _ensure_role_for_auth_context(
    *,
    request: Request | None,
    user: AuthUser,
    response: Response,
    settings: Settings,
) -> None:
    context = _get_auth_context(request)
    normalized_role = user.role.strip().lower()

    if context == AUTH_CONTEXT_WEB_ADMIN:
        if normalized_role not in ADMIN_ROLES:
            _clear_auth_cookies(response, settings=settings)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản này là tài khoản Ứng dụng Di động (Người dân/Kỹ sư), không được phép đăng nhập vào Web Quản lý. Vui lòng sử dụng Ứng dụng Di động.",
            )
    elif context == AUTH_CONTEXT_MOBILE_APP:
        if normalized_role in ADMIN_ROLES:
            _clear_auth_cookies(response, settings=settings)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản Quản trị viên chỉ được phép đăng nhập trên Cổng Web Quản lý (Web Admin). Vui lòng sử dụng trình duyệt để truy cập Web Admin.",
            )


_ensure_admin_role_for_web_auth = _ensure_role_for_auth_context


def _revoke_refresh_token_session_if_exists(
    repository: AuthRepository,
    token_id: str | None,
) -> None:
    if token_id:
        repository.revoke_refresh_token(token_id)


def _extract_bearer_token(request: Request | None) -> str | None:
    if request is None:
        return None

    authorization = request.headers.get("Authorization", "").strip()
    if not authorization:
        return None

    scheme, _, credentials = authorization.partition(" ")
    if scheme.lower() != "bearer" or not credentials.strip():
        return None

    return credentials.strip()


def _set_auth_cookies(
    response: Response,
    *,
    settings: Settings,
    access_token: str,
    refresh_token: str,
) -> None:
    response.set_cookie(
        key=settings.web_access_cookie_name,
        value=access_token,
        httponly=True,
        secure=settings.cookie_secure_enabled,
        samesite=settings.normalized_cookie_same_site,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )
    response.set_cookie(
        key=settings.web_refresh_cookie_name,
        value=refresh_token,
        httponly=True,
        secure=settings.cookie_secure_enabled,
        samesite=settings.normalized_cookie_same_site,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        path="/",
    )


def _clear_auth_cookies(
    response: Response,
    *,
    settings: Settings,
) -> None:
    response.delete_cookie(
        settings.web_access_cookie_name,
        path="/",
        secure=settings.cookie_secure_enabled,
        samesite=settings.normalized_cookie_same_site,
    )
    response.delete_cookie(
        settings.web_refresh_cookie_name,
        path="/",
        secure=settings.cookie_secure_enabled,
        samesite=settings.normalized_cookie_same_site,
    )


def _build_auth_response(
    *,
    repository: AuthRepository,
    settings: Settings,
    user: AuthUser,
    response: Response,
    refresh_token_id: str | None = None,
) -> AuthResponse:
    refresh_token_id = refresh_token_id or str(uuid4())
    access_token = create_access_token(
        secret_key=settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
        subject=user.id,
        role=user.role,
        expires_minutes=settings.access_token_expire_minutes,
    )
    refresh_token = create_refresh_token(
        secret_key=settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
        subject=user.id,
        role=user.role,
        token_id=refresh_token_id,
        expires_days=settings.refresh_token_expire_days,
    )
    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    ).isoformat()

    repository.store_refresh_token(
        token_id=refresh_token_id,
        user_id=user.id,
        token_hash=hash_token(refresh_token),
        expires_at=expires_at,
    )
    _set_auth_cookies(
        response,
        settings=settings,
        access_token=access_token,
        refresh_token=refresh_token,
    )

    return AuthResponse(
        accessToken=access_token,
        refreshToken=refresh_token,
        user=user,
    )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    response: Response,
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    with get_connection() as connection:
        repository = AuthRepository(connection)

        if repository.get_user_by_email(payload.email):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email đã được sử dụng.",
            )

        try:
            user = repository.create_user(payload)
        except sqlite3.IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email đã được sử dụng.",
            ) from None

        return _build_auth_response(
            repository=repository,
            settings=settings,
            user=user,
            response=response,
        )


@router.post("/login", response_model=AuthResponse)
def login(
    payload: LoginRequest,
    response: Response,
    settings: Settings = Depends(get_settings),
    request: Request = None,
) -> AuthResponse:
    with get_connection() as connection:
        repository = AuthRepository(connection)
        row = repository.get_user_by_email(payload.email)

        if row is None or not verify_password(payload.password, row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Tài khoản hoặc mật khẩu không đúng.",
            )

        if "is_active" in row.keys() and row["is_active"] == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên.",
            )

        user = AuthRepository.row_to_user(row)
        _ensure_admin_role_for_web_auth(
            request=request,
            user=user,
            response=response,
            settings=settings,
        )

        return _build_auth_response(
            repository=repository,
            settings=settings,
            user=user,
            response=response,
        )


@router.post("/refresh", response_model=AuthResponse)
def refresh_token(
    payload: RefreshTokenRequest,
    response: Response,
    settings: Settings = Depends(get_settings),
    request: Request = None,
) -> AuthResponse:
    refresh_cookie = request.cookies.get(settings.web_refresh_cookie_name) if request else None
    raw_refresh_token = payload.refreshToken or refresh_cookie

    if not raw_refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thiếu refresh token.",
        )

    try:
        token_payload = decode_token(
            raw_refresh_token,
            secret_key=settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
            expected_type=REFRESH_TOKEN_TYPE,
        )
    except TokenValidationError as exc:
        _clear_auth_cookies(response, settings=settings)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    token_id = token_payload["jti"]

    with get_connection() as connection:
        repository = AuthRepository(connection)
        session_row = repository.get_refresh_token_session(token_id)

        if session_row is None or session_row["revoked_at"]:
            _clear_auth_cookies(response, settings=settings)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token đã bị thu hồi hoặc không tồn tại.",
            )

        if session_row["token_hash"] != hash_token(raw_refresh_token):
            repository.revoke_refresh_token(token_id)
            _clear_auth_cookies(response, settings=settings)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token không hợp lệ.",
            )

        user_row = repository.get_user_by_id(token_payload["sub"])
        if user_row is None:
            repository.revoke_refresh_token(token_id)
            _clear_auth_cookies(response, settings=settings)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Người dùng không còn tồn tại.",
            )

        new_refresh_token_id = str(uuid4())
        repository.revoke_refresh_token(token_id, replaced_by_token_id=new_refresh_token_id)
        user = AuthRepository.row_to_user(user_row)
        try:
            _ensure_admin_role_for_web_auth(
                request=request,
                user=user,
                response=response,
                settings=settings,
            )
        except HTTPException:
            _revoke_refresh_token_session_if_exists(repository, new_refresh_token_id)
            raise

        return _build_auth_response(
            repository=repository,
            settings=settings,
            user=user,
            response=response,
            refresh_token_id=new_refresh_token_id,
        )


@router.get("/me", response_model=AuthUser)
def get_me(
    request: Request,
    response: Response,
    settings: Settings = Depends(get_settings),
    current_user: AuthUser = Depends(get_current_user),
) -> AuthUser:
    _ensure_admin_role_for_web_auth(
        request=request,
        user=current_user,
        response=response,
        settings=settings,
    )
    return current_user


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> dict[str, str]:
    current_pwd = payload.resolved_current_password
    new_pwd = payload.resolved_new_password

    if len(new_pwd) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có tối thiểu 6 ký tự.",
        )

    if current_pwd == new_pwd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới không được trùng với mật khẩu hiện tại.",
        )

    with get_connection() as connection:
        repository = AuthRepository(connection)
        user_row = repository.get_user_by_id(current_user.id)
        if user_row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy thông tin người dùng.",
            )

        if not verify_password(current_pwd, user_row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu hiện tại không chính xác.",
            )

        new_hash = hash_password(new_pwd)
        repository.update_user_password(current_user.id, new_hash)

    return {"message": "Đổi mật khẩu thành công."}


@router.post("/logout")
def logout(
    response: Response,
    settings: Settings = Depends(get_settings),
    request: Request = None,
    payload: RefreshTokenRequest | None = None,
) -> dict[str, bool]:
    refresh_cookie = request.cookies.get(settings.web_refresh_cookie_name) if request else None
    raw_refresh_token = payload.refreshToken if payload else None
    raw_refresh_token = raw_refresh_token or refresh_cookie
    access_cookie = request.cookies.get(settings.web_access_cookie_name) if request else None
    raw_access_token = _extract_bearer_token(request) or access_cookie
    user_id: str | None = None

    with get_connection() as connection:
        repository = AuthRepository(connection)

        if raw_refresh_token:
            try:
                token_payload = decode_token(
                    raw_refresh_token,
                    secret_key=settings.jwt_secret_key,
                    algorithm=settings.jwt_algorithm,
                    expected_type=REFRESH_TOKEN_TYPE,
                )
                user_id = token_payload["sub"]
                repository.revoke_refresh_token(token_payload["jti"])
            except TokenValidationError:
                pass

        if raw_access_token:
            try:
                access_payload = decode_token(
                    raw_access_token,
                    secret_key=settings.jwt_secret_key,
                    algorithm=settings.jwt_algorithm,
                    expected_type=ACCESS_TOKEN_TYPE,
                )
                user_id = user_id or access_payload["sub"]
            except TokenValidationError:
                pass

        if user_id:
            revoked_at = datetime.now(timezone.utc).isoformat()
            repository.revoke_all_refresh_tokens_for_user(user_id)
            repository.mark_user_auth_revoked(user_id, revoked_at=revoked_at)

    _clear_auth_cookies(response, settings=settings)
    return {"success": True}


@router.post("/forgot-password/request-otp", response_model=ForgotPasswordResponse)
def request_password_reset_otp(
    payload: ForgotPasswordRequest,
    settings: Settings = Depends(get_settings),
) -> ForgotPasswordResponse:
    email = payload.email.strip().lower()

    with get_connection() as connection:
        repository = AuthRepository(connection)
        user = repository.get_user_by_email(email)

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tài khoản với email này trong hệ thống.",
            )

        if "is_active" in user.keys() and not user["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản của bạn đã bị khóa hoặc tạm ngưng hoạt động. Vui lòng liên hệ quản trị viên.",
            )

        if user["role"] in ADMIN_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tài khoản Quản trị viên vui lòng liên hệ Ban quản trị để cấp lại mật khẩu.",
            )

        otp_code = f"{secrets.randbelow(900000) + 100000}"
        expires_at = (
            datetime.now(timezone.utc) + timedelta(seconds=settings.otp_expire_seconds)
        ).isoformat()

        repository.invalidate_all_otps_for_email(email)
        repository.create_password_reset_otp(
            email=email,
            otp_code=otp_code,
            expires_at=expires_at,
        )

    expires_in_minutes = max(1, settings.otp_expire_seconds // 60)
    try:
        send_password_reset_otp_email(
            email=email,
            otp_code=otp_code,
            expires_in_minutes=expires_in_minutes,
            settings=settings,
        )
    except EmailDeliveryError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        ) from exc

    return ForgotPasswordResponse(
        success=True,
        message=f"Mã xác nhận 6 chữ số đã được gửi tới hộp thư Gmail của bạn (Hiệu lực trong {expires_in_minutes} phút). Vui lòng kiểm tra hộp thư đến hoặc Spam.",
        email=email,
        expiresIn=settings.otp_expire_seconds,
    )


@router.post("/forgot-password/verify-otp")
def verify_password_reset_otp(
    payload: VerifyOtpRequest,
) -> dict[str, object]:
    email = payload.email.strip().lower()
    otp = payload.otp.strip()

    with get_connection() as connection:
        repository = AuthRepository(connection)
        otp_row = repository.get_valid_password_reset_otp(email=email, otp_code=otp)
        if otp_row is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã xác nhận (OTP) không chính xác hoặc đã hết hạn.",
            )

    return {"success": True, "message": "Xác minh mã thành công."}


@router.post("/forgot-password/reset-password")
def reset_password_with_otp(
    payload: ResetPasswordRequest,
) -> dict[str, object]:
    email = payload.email.strip().lower()
    otp = payload.otp.strip()
    new_pwd = payload.resolved_new_password

    if len(new_pwd) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mật khẩu mới phải có tối thiểu 6 ký tự.",
        )

    with get_connection() as connection:
        repository = AuthRepository(connection)
        otp_row = repository.get_valid_password_reset_otp(email=email, otp_code=otp)
        if otp_row is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã xác nhận (OTP) không chính xác hoặc đã hết hạn.",
            )

        user = repository.get_user_by_email(email)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tài khoản để đặt lại mật khẩu.",
            )

        new_hash = hash_password(new_pwd)
        repository.update_user_password(user["id"], new_hash)
        repository.mark_password_reset_otp_used(otp_row["id"])
        repository.revoke_all_refresh_tokens_for_user(user["id"])

    return {
        "success": True,
        "message": "Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.",
    }
