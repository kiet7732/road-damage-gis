import sqlite3
from datetime import datetime, timezone
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
from app.modules.auth.dependencies import get_admin_user
from app.modules.auth.schemas import AuthUser
from app.modules.auth.security import hash_password


router = APIRouter(prefix="/admin/users", tags=["admin-users"])


def _row_to_user_item(row: sqlite3.Row) -> AdminUserItemResponse:
    keys = row.keys() if hasattr(row, "keys") else []
    is_active_raw = row["is_active"] if "is_active" in keys else 1
    is_active = bool(is_active_raw) if is_active_raw is not None else True

    return AdminUserItemResponse(
        id=row["id"],
        fullName=row["full_name"],
        full_name=row["full_name"],
        email=row["email"],
        phone=row["phone"] if "phone" in keys else None,
        role=row["role"],
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


@router.get("", response_model=AdminUserListResponse)
def list_users(
    role: str | None = Query(default=None),
    district: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: AuthUser = Depends(get_admin_user),
) -> AdminUserListResponse:
    with get_connection() as connection:
        # Calculate stats across the entire table
        stats_rows = connection.execute(
            """
            SELECT
                count(*) as total_users,
                sum(CASE WHEN lower(role) = 'field_engineer' THEN 1 ELSE 0 END) as total_engineers,
                sum(CASE WHEN lower(role) = 'reporter' THEN 1 ELSE 0 END) as total_reporters,
                sum(CASE WHEN lower(role) IN ('district_officer', 'officer', 'can_bo') THEN 1 ELSE 0 END) as total_officers,
                sum(CASE WHEN lower(role) IN ('admin', 'super_admin', 'manager') THEN 1 ELSE 0 END) as total_admins,
                sum(CASE WHEN is_active = 1 OR is_active IS NULL THEN 1 ELSE 0 END) as total_active,
                sum(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as total_locked
            FROM users
            """
        ).fetchone()

        stats = AdminUserStatsResponse(
            total_users=stats_rows["total_users"] or 0,
            total_engineers=stats_rows["total_engineers"] or 0,
            total_reporters=stats_rows["total_reporters"] or 0,
            total_officers=stats_rows["total_officers"] or 0,
            total_admins=stats_rows["total_admins"] or 0,
            total_active=stats_rows["total_active"] or 0,
            total_locked=stats_rows["total_locked"] or 0,
        )

        # Build dynamic query
        conditions: list[str] = ["1=1"]
        params: list[object] = []

        if role and role.strip() and role.strip().lower() != "all":
            clean_role = role.strip().lower()
            if clean_role == "officer":
                conditions.append("lower(role) IN ('district_officer', 'officer', 'can_bo')")
            elif clean_role == "admin":
                conditions.append("lower(role) IN ('admin', 'super_admin', 'manager')")
            else:
                conditions.append("lower(role) = lower(?)")
                params.append(clean_role)

        if district and district.strip():
            conditions.append("lower(managed_district) LIKE lower(?)")
            params.append(f"%{district.strip()}%")

        if status_filter and status_filter.strip():
            st = status_filter.strip().lower()
            if st == "active":
                conditions.append("(is_active = 1 OR is_active IS NULL)")
            elif st in ("locked", "inactive"):
                conditions.append("is_active = 0")

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
        role = payload.role.strip().lower()
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
                managed_district,
                managed_ward,
                is_active,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
            """,
            (
                user_id,
                payload.fullName,
                payload.email,
                phone,
                hash_password(payload.password),
                role,
                district,
                ward,
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

        now = datetime.now(timezone.utc).isoformat()
        full_name = payload.fullName if payload.fullName is not None else row["full_name"]
        phone = payload.phone if payload.phone is not None else row["phone"]
        role = payload.role if payload.role is not None else row["role"]
        district = payload.managedDistrict if payload.managedDistrict is not None else row["managed_district"]
        ward = payload.managedWard if payload.managedWard is not None else row["managed_ward"]

        connection.execute(
            """
            UPDATE users
            SET full_name = ?,
                phone = ?,
                role = ?,
                managed_district = ?,
                managed_ward = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (full_name, phone, role, district, ward, now, user_id),
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

        now = datetime.now(timezone.utc).isoformat()
        is_active_int = 1 if payload.isActive else 0

        if not payload.isActive:
            # Revoke auth sessions immediately
            connection.execute(
                """
                UPDATE users
                SET is_active = ?, auth_revoked_at = ?, updated_at = ?
                WHERE id = ?
                """,
                (is_active_int, now, now, user_id),
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
                (is_active_int, now, user_id),
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
