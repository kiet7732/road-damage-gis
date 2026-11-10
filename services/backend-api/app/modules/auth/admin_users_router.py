import sqlite3
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_connection
from app.modules.auth.admin_users_schemas import (
    AdminUserItemResponse,
    AdminUserListResponse,
    AdminUserStatsResponse,
    CreateAdminUserRequest,
    ResetUserPasswordRequest,
    ToggleUserStatusRequest,
    UpdateAdminUserRequest,
)
from app.modules.auth.dependencies import (
    get_admin_user,
    get_user_managed_province,
    is_system_admin,
    is_user_province_restricted,
)
from app.modules.auth.schemas import AuthUser
from app.modules.auth.security import hash_password
from app.provinces_data import (
    PROVINCE_DISTRICT_HIERARCHY,
    get_province_sql_variants,
    normalize_province_name,
)


router = APIRouter(prefix="/admin/users", tags=["admin-users"])


def _row_to_user_item(row: sqlite3.Row) -> AdminUserItemResponse:
    keys = row.keys() if hasattr(row, "keys") else []
    is_active_raw = row["is_active"] if "is_active" in keys else 1
    is_active = bool(is_active_raw) if is_active_raw is not None else True
    raw_prov = row["managed_province"] if "managed_province" in keys else None
    norm_prov = normalize_province_name(raw_prov) or raw_prov

    return AdminUserItemResponse(
        id=row["id"],
        fullName=row["full_name"],
        full_name=row["full_name"],
        email=row["email"],
        phone=row["phone"] if "phone" in keys else None,
        role=row["role"],
        managedProvince=norm_prov,
        managed_province=norm_prov,
        managedDistrict=row["managed_district"] if "managed_district" in keys else None,
        managed_district=row["managed_district"] if "managed_district" in keys else None,
        managedWard=row["managed_ward"] if "managed_ward" in keys else None,
        managed_ward=row["managed_ward"] if "managed_ward" in keys else None,
        isActive=is_active,
        is_active=is_active,
        createdAt=row["created_at"],
        created_at=row["created_at"],
        updatedAt=row["updated_at"],
        updated_at=row["updated_at"],
    )


def _ensure_province_user_access(current_user: AuthUser, target_row: Any) -> None:
    if is_system_admin(current_user):
        return
    if is_user_province_restricted(current_user):
        user_prov = get_user_managed_province(current_user)
        keys = target_row.keys() if hasattr(target_row, "keys") else []
        target_role = (target_row["role"] or "").strip().lower()
        if target_role in ("admin", "system_admin", "super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Quản trị viên cấp tỉnh không có quyền thao tác trên tài khoản Quản trị viên hệ thống.",
            )
        target_prov = normalize_province_name(
            target_row["managed_province"] if "managed_province" in keys else None
        )
        target_dist = (target_row["managed_district"] if "managed_district" in keys else None) or ""
        allowed_districts = {d.lower() for d in PROVINCE_DISTRICT_HIERARCHY.get(user_prov or "", [])}
        dist_short_matches = any(
            target_dist.strip().lower() in (d, d.replace("thành phố ", "").replace("quận ", "").replace("huyện ", ""))
            for d in allowed_districts
        )
        if target_prov and user_prov and target_prov.lower() == user_prov.lower():
            return
        if target_dist.strip() and dist_short_matches:
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Không có quyền thao tác với tài khoản ngoài vùng quản lý ({user_prov}).",
        )


@router.get("", response_model=AdminUserListResponse)
def list_users(
    role: str | None = Query(default=None),
    province: str | None = Query(default=None),
    district: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: AuthUser = Depends(get_admin_user),
) -> AdminUserListResponse:
    with get_connection() as connection:
        # Build scope filter if current_user is province_officer
        scope_conditions: list[str] = ["1=1"]
        scope_params: list[object] = []

        effective_province = normalize_province_name(province)
        if is_user_province_restricted(current_user):
            user_prov = get_user_managed_province(current_user)
            if not user_prov:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tài khoản Quản trị viên cấp tỉnh chưa được gán vùng quản lý.",
                )
            if effective_province and effective_province.lower() != user_prov.lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Quản trị viên cấp tỉnh ({user_prov}) không có quyền xem người dùng ngoài vùng quản lý.",
                )
            effective_province = user_prov
            scope_conditions.append("lower(role) NOT IN ('admin', 'system_admin', 'super_admin')")

        if effective_province:
            prov_variants = [v.lower() for v in get_province_sql_variants(effective_province)]
            prov_districts = PROVINCE_DISTRICT_HIERARCHY.get(effective_province, [])
            dist_variants: list[str] = []
            for d in prov_districts:
                dist_variants.append(d.lower())
                short_d = (
                    d.lower()
                    .replace("thành phố ", "")
                    .replace("thị xã ", "")
                    .replace("quận ", "")
                    .replace("huyện ", "")
                    .strip()
                )
                if short_d not in dist_variants:
                    dist_variants.append(short_d)

            or_parts: list[str] = []
            if prov_variants:
                placeholders = ", ".join(["?" for _ in prov_variants])
                or_parts.append(f"lower(TRIM(COALESCE(managed_province, ''))) IN ({placeholders})")
                scope_params.extend(prov_variants)
            if dist_variants:
                d_placeholders = ", ".join(["?" for _ in dist_variants])
                or_parts.append(f"lower(TRIM(COALESCE(managed_district, ''))) IN ({d_placeholders})")
                scope_params.extend(dist_variants)
            if or_parts:
                scope_conditions.append(f"({' OR '.join(or_parts)})")

        scope_where = " AND ".join(scope_conditions)

        # Calculate stats across the scoped table (PostgreSQL & SQLite boolean-safe)
        stats_rows = connection.execute(
            f"""
            SELECT
                count(*) as total_users,
                sum(CASE WHEN lower(role) = 'field_engineer' THEN 1 ELSE 0 END) as total_engineers,
                sum(CASE WHEN lower(role) = 'reporter' THEN 1 ELSE 0 END) as total_reporters,
                sum(CASE WHEN lower(role) IN ('district_officer', 'officer', 'can_bo') THEN 1 ELSE 0 END) as total_officers,
                sum(CASE WHEN lower(role) IN ('province_officer', 'provincial_admin', 'provincial_manager') THEN 1 ELSE 0 END) as total_province_officers,
                sum(CASE WHEN lower(role) IN ('admin', 'system_admin', 'super_admin', 'manager') THEN 1 ELSE 0 END) as total_admins,
                sum(CASE WHEN CAST(COALESCE(is_active, TRUE) AS TEXT) IN ('1', 'true', 't', 'True') THEN 1 ELSE 0 END) as total_active,
                sum(CASE WHEN CAST(is_active AS TEXT) IN ('0', 'false', 'f', 'False') THEN 1 ELSE 0 END) as total_locked
            FROM users
            WHERE {scope_where}
            """,
            scope_params,
        ).fetchone()

        stats = AdminUserStatsResponse(
            total_users=stats_rows["total_users"] or 0,
            total_engineers=stats_rows["total_engineers"] or 0,
            total_reporters=stats_rows["total_reporters"] or 0,
            total_officers=stats_rows["total_officers"] or 0,
            total_province_officers=stats_rows["total_province_officers"] or 0,
            total_admins=stats_rows["total_admins"] or 0,
            total_active=stats_rows["total_active"] or 0,
            total_locked=stats_rows["total_locked"] or 0,
        )

        # Build dynamic query
        conditions: list[str] = list(scope_conditions)
        params: list[object] = list(scope_params)

        if role and role.strip() and role.strip().lower() != "all":
            clean_role = role.strip().lower()
            if clean_role in ("officer", "district_officer"):
                conditions.append("lower(role) IN ('district_officer', 'officer', 'can_bo')")
            elif clean_role in ("province_officer", "provincial_admin"):
                conditions.append("lower(role) IN ('province_officer', 'provincial_admin', 'provincial_manager')")
            elif clean_role in ("admin", "system_admin"):
                conditions.append("lower(role) IN ('admin', 'system_admin', 'super_admin', 'manager')")
            else:
                conditions.append("lower(role) = lower(?)")
                params.append(clean_role)

        if district and district.strip() and district.strip().lower() != "all":
            conditions.append("lower(managed_district) LIKE lower(?)")
            params.append(f"%{district.strip()}%")

        if status_filter and status_filter.strip() and status_filter.strip().lower() != "all":
            st = status_filter.strip().lower()
            if st == "active":
                conditions.append("CAST(COALESCE(is_active, TRUE) AS TEXT) IN ('1', 'true', 't', 'True')")
            elif st in ("locked", "inactive"):
                conditions.append("CAST(is_active AS TEXT) IN ('0', 'false', 'f', 'False')")

        if search and search.strip():
            kw = f"%{search.strip()}%"
            conditions.append("(lower(full_name) LIKE lower(?) OR lower(email) LIKE lower(?) OR phone LIKE ?)")
            params.extend([kw, kw, kw])

        where_clause = " AND ".join(conditions)

        # Count filtered items
        count_sql = f"SELECT count(*) as count FROM users WHERE {where_clause}"
        total_count = connection.execute(count_sql, params).fetchone()["count"]

        # Fetch items
        offset = (page - 1) * page_size
        items_sql = f"""
            SELECT *
            FROM users
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """
        rows = connection.execute(items_sql, [*params, page_size, offset]).fetchall()
        items = [_row_to_user_item(r) for r in rows]

        return AdminUserListResponse(
            items=items,
            total=total_count,
            page=page,
            page_size=page_size,
            stats=stats,
        )


@router.post("", response_model=AdminUserItemResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: CreateAdminUserRequest,
    current_user: AuthUser = Depends(get_admin_user),
) -> AdminUserItemResponse:
    role = payload.role.strip().lower()
    if role == "system_admin":
        role = "admin"

    if role in ("admin", "province_officer") and not is_system_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ Quản trị viên hệ thống mới có quyền tạo tài khoản Quản trị viên hệ thống hoặc Quản trị viên cấp tỉnh.",
        )

    with get_connection() as connection:
        existing = connection.execute(
            "SELECT id FROM users WHERE lower(email) = lower(?)",
            (payload.email,),
        ).fetchone()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email đã được sử dụng.",
            )

        now = datetime.now(timezone.utc).isoformat()
        user_id = str(uuid4())
        phone = payload.phone.strip() if payload.phone else None

        if role in ("reporter", "admin"):
            province = None
            district = None
            ward = None
        elif role == "province_officer":
            province = normalize_province_name(payload.managedProvince)
            if not province:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vui lòng chọn Tỉnh/Thành phố quản lý cho tài khoản Quản trị viên cấp tỉnh.",
                )
            district = None
            ward = None
        else:
            province = normalize_province_name(payload.managedProvince)
            if is_user_province_restricted(current_user):
                province = get_user_managed_province(current_user)
            district = payload.managedDistrict.strip() if payload.managedDistrict else None
            ward = payload.managedWard.strip() if payload.managedWard else None

        connection.execute(
            """
            INSERT INTO users (
                id,
                full_name,
                email,
                phone,
                password_hash,
                role,
                managed_province,
                managed_district,
                managed_ward,
                is_active,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                payload.fullName,
                payload.email,
                phone,
                hash_password(payload.password),
                role,
                province,
                district,
                ward,
                True,
                now,
                now,
            ),
        )
        connection.commit()

        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _row_to_user_item(row)


@router.get("/{user_id}", response_model=AdminUserItemResponse)
def get_user_detail(
    user_id: str,
    current_user: AuthUser = Depends(get_admin_user),
) -> AdminUserItemResponse:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng.",
            )
        _ensure_province_user_access(current_user, row)
        return _row_to_user_item(row)


@router.put("/{user_id}", response_model=AdminUserItemResponse)
def update_user(
    user_id: str,
    payload: UpdateAdminUserRequest,
    current_user: AuthUser = Depends(get_admin_user),
) -> AdminUserItemResponse:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng.",
            )

        _ensure_province_user_access(current_user, row)

        now = datetime.now(timezone.utc).isoformat()
        full_name = payload.fullName if payload.fullName is not None else row["full_name"]
        phone = payload.phone if payload.phone is not None else row["phone"]
        role = payload.role if payload.role is not None else row["role"]
        if role:
            role = role.strip().lower()
            if role == "system_admin":
                role = "admin"

        if role in ("admin", "province_officer") and not is_system_admin(current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ Quản trị viên hệ thống mới có quyền gán vai trò Quản trị viên hệ thống hoặc Quản trị viên cấp tỉnh.",
            )

        row_keys = row.keys() if hasattr(row, "keys") else []
        existing_province = row["managed_province"] if "managed_province" in row_keys else None

        if role in ("reporter", "admin"):
            province = None
            district = None
            ward = None
        elif role == "province_officer":
            raw_prov = payload.managedProvince if payload.managedProvince is not None else existing_province
            province = normalize_province_name(raw_prov)
            if not province:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vui lòng chọn Tỉnh/Thành phố quản lý cho tài khoản Quản trị viên cấp tỉnh.",
                )
            district = None
            ward = None
        else:
            raw_prov = payload.managedProvince if payload.managedProvince is not None else existing_province
            province = normalize_province_name(raw_prov)
            if is_user_province_restricted(current_user):
                province = get_user_managed_province(current_user)
            district = payload.managedDistrict if payload.managedDistrict is not None else row["managed_district"]
            ward = payload.managedWard if payload.managedWard is not None else row["managed_ward"]

        connection.execute(
            """
            UPDATE users
            SET full_name = ?,
                phone = ?,
                role = ?,
                managed_province = ?,
                managed_district = ?,
                managed_ward = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (full_name, phone, role, province, district, ward, now, user_id),
        )
        connection.commit()

        updated_row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _row_to_user_item(updated_row)


@router.patch("/{user_id}/status", response_model=AdminUserItemResponse)
def toggle_user_status(
    user_id: str,
    payload: ToggleUserStatusRequest,
    current_user: AuthUser = Depends(get_admin_user),
) -> AdminUserItemResponse:
    if user_id == current_user.id and not payload.isActive:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn không thể tự khóa tài khoản của chính mình.",
        )

    with get_connection() as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng.",
            )

        _ensure_province_user_access(current_user, row)

        now = datetime.now(timezone.utc).isoformat()
        is_active_bool = bool(payload.isActive)

        if not payload.isActive:
            # Revoke auth sessions immediately
            connection.execute(
                """
                UPDATE users
                SET is_active = ?, auth_revoked_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (is_active_bool, now, now, user_id),
            )
            connection.execute(
                """
                UPDATE refresh_tokens
                SET revoked_at = ?
                WHERE user_id = ? AND revoked_at IS NULL
                """,
                (now, user_id),
            )
        else:
            connection.execute(
                """
                UPDATE users
                SET is_active = ?, updated_at = ?
                WHERE id = ?
                """,
                (is_active_bool, now, user_id),
            )

        connection.commit()

        updated_row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _row_to_user_item(updated_row)


@router.post("/{user_id}/reset-password")
def reset_user_password(
    user_id: str,
    payload: ResetUserPasswordRequest,
    current_user: AuthUser = Depends(get_admin_user),
) -> dict[str, str]:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng.",
            )

        _ensure_province_user_access(current_user, row)

        now = datetime.now(timezone.utc).isoformat()
        new_hash = hash_password(payload.newPassword)

        connection.execute(
            """
            UPDATE users
            SET password_hash = ?, auth_revoked_at = ?, updated_at = ?
            WHERE id = ?
            """,
            (new_hash, now, now, user_id),
        )
        connection.execute(
            """
            UPDATE refresh_tokens
            SET revoked_at = ?
            WHERE user_id = ? AND revoked_at IS NULL
            """,
            (now, user_id),
        )
        connection.commit()

        return {"message": "Mật khẩu đã được đặt lại thành công.", "userId": user_id}
