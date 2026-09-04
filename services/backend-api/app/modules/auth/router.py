import sqlite3
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.config import Settings, get_settings
from app.database import get_connection
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas import (
    AuthResponse,
    AuthUser,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
)
from app.modules.auth.security import (
    ACCESS_TOKEN_TYPE,
    REFRESH_TOKEN_TYPE,
    TokenValidationError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_token,
    verify_password,
)


router = APIRouter(prefix="/auth", tags=["auth"])
ADMIN_ROLES = {"admin", "manager", "staff", "officer", "can_bo"}
ADMIN_AUTH_CONTEXT_HEADER = "X-Auth-Context"
ADMIN_AUTH_CONTEXT_VALUE = "web-admin"


def _is_admin_web_auth_request(request: Request | None) -> bool:
    if request is None:
        return False

    return (
        request.headers.get(ADMIN_AUTH_CONTEXT_HEADER, "").strip().lower()
        == ADMIN_AUTH_CONTEXT_VALUE
    )


def _ensure_admin_role_for_web_auth(
    *,
    request: Request | None,
    user: AuthUser,
    response: Response,
    settings: Settings,
) -> None:
    if not _is_admin_web_auth_request(request):
        return

    if user.role.strip().lower() in ADMIN_ROLES:
        return

    _clear_auth_cookies(response, settings=settings)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Tài khoản không có quyền truy cập hệ thống quản trị.",
    )


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
