import re
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

EMAIL_PATTERN = re.compile(r"^\S+@\S+\.\S+$")
PHONE_PATTERN = re.compile(r"^(\+84|0)[0-9]{9,10}$")
ALLOWED_ROLES = {"admin", "district_officer", "field_engineer", "reporter"}


class AdminUserItemResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    fullName: str
    full_name: str
    email: str
    phone: str | None = None
    role: str
    managedDistrict: str | None = None
    managed_district: str | None = None
    managedWard: str | None = None
    managed_ward: str | None = None
    isActive: bool = True
    is_active: bool = True
    createdAt: str
    created_at: str
    updatedAt: str
    updated_at: str

    @model_validator(mode="before")
    @classmethod
    def sync_field_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            full_name = data.get("fullName") or data.get("full_name") or ""
            district = data.get("managedDistrict") or data.get("managed_district")
            ward = data.get("managedWard") or data.get("managed_ward")
            is_active_val = data.get("isActive") if "isActive" in data else data.get("is_active")
            is_active_bool = bool(is_active_val) if is_active_val is not None else True
            created_at = data.get("createdAt") or data.get("created_at") or ""
            updated_at = data.get("updatedAt") or data.get("updated_at") or ""

            data["fullName"] = full_name
            data["full_name"] = full_name
            data["managedDistrict"] = district
            data["managed_district"] = district
            data["managedWard"] = ward
            data["managed_ward"] = ward
            data["isActive"] = is_active_bool
            data["is_active"] = is_active_bool
            data["createdAt"] = created_at
            data["created_at"] = created_at
            data["updatedAt"] = updated_at
            data["updated_at"] = updated_at
        return data


class AdminUserStatsResponse(BaseModel):
    total_users: int = 0
    total_engineers: int = 0
    total_reporters: int = 0
    total_officers: int = 0
    total_admins: int = 0
    total_active: int = 0
    total_locked: int = 0


class AdminUserListResponse(BaseModel):
    items: list[AdminUserItemResponse]
    total: int
    page: int
    page_size: int
    stats: AdminUserStatsResponse


class CreateAdminUserRequest(BaseModel):
    fullName: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=6, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    role: str = Field(default="field_engineer")
    managedDistrict: str | None = Field(default=None, max_length=100)
    managedWard: str | None = Field(default=None, max_length=100)

    @field_validator("fullName")
    @classmethod
    def validate_name(cls, value: str) -> str:
        clean = value.strip()
        if len(clean) < 2:
            raise ValueError("Họ tên phải có ít nhất 2 ký tự.")
        return clean

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        clean = value.strip().lower()
        if not EMAIL_PATTERN.fullmatch(clean):
            raise ValueError("Email không hợp lệ.")
        return clean

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if not value:
            return None
        clean = value.strip()
        if not clean:
            return None
        if not PHONE_PATTERN.fullmatch(clean):
            raise ValueError("Số điện thoại không hợp lệ (VD: 0912345678).")
        return clean

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        clean = value.strip().lower()
        if clean not in ALLOWED_ROLES:
            raise ValueError(f"Vai trò không hợp lệ. Các vai trò được phép: {', '.join(ALLOWED_ROLES)}")
        return clean


class UpdateAdminUserRequest(BaseModel):
    fullName: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=20)
    role: str | None = None
    managedDistrict: str | None = Field(default=None, max_length=100)
    managedWard: str | None = Field(default=None, max_length=100)

    @field_validator("fullName")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        clean = value.strip()
        if len(clean) < 2:
            raise ValueError("Họ tên phải có ít nhất 2 ký tự.")
        return clean

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if not value:
            return None
        clean = value.strip()
        if not clean:
            return None
        if not PHONE_PATTERN.fullmatch(clean):
            raise ValueError("Số điện thoại không hợp lệ.")
        return clean

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str | None) -> str | None:
        if value is None:
            return None
        clean = value.strip().lower()
        if clean not in ALLOWED_ROLES:
            raise ValueError(f"Vai trò không hợp lệ: {clean}")
        return clean


class ResetUserPasswordRequest(BaseModel):
    newPassword: str = Field(min_length=6, max_length=120)


class ToggleUserStatusRequest(BaseModel):
    isActive: bool
