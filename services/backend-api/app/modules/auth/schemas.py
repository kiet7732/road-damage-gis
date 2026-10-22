import re

from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


EMAIL_PATTERN = re.compile(r"^\S+@\S+\.\S+$")
PHONE_PATTERN = re.compile(r"^(\+84|0)[0-9]{9,10}$")


class AuthUser(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    fullName: str
    email: str
    phone: str | None = None
    role: str
    managedDistrict: str | None = None
    managedWard: str | None = None
    managed_district: str | None = None
    managed_ward: str | None = None
    isActive: bool = True
    is_active: bool = True

    @model_validator(mode="before")
    @classmethod
    def sync_district_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            district = data.get("managedDistrict") or data.get("managed_district")
            ward = data.get("managedWard") or data.get("managed_ward")
            is_active_val = data.get("isActive") if "isActive" in data else data.get("is_active")
            is_active_bool = bool(is_active_val) if is_active_val is not None else True
            data["managedDistrict"] = district
            data["managed_district"] = district
            data["managedWard"] = ward
            data["managed_ward"] = ward
            data["isActive"] = is_active_bool
            data["is_active"] = is_active_bool
        return data


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=6)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()

        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Email không hợp lệ.")

        return normalized


class RegisterRequest(BaseModel):
    fullName: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    phone: str | None = Field(default=None, max_length=20)
    password: str = Field(min_length=6, max_length=120)

    @field_validator("fullName")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        normalized = value.strip()

        if len(normalized) < 2:
            raise ValueError("Họ tên phải có ít nhất 2 ký tự.")

        return normalized

    @field_validator("email")
    @classmethod
    def validate_register_email(cls, value: str) -> str:
        normalized = value.strip().lower()

        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Email không hợp lệ.")

        return normalized

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return None

        normalized = value.strip()
        if not normalized:
            return None

        if not PHONE_PATTERN.fullmatch(normalized):
            raise ValueError("Số điện thoại không hợp lệ.")

        return normalized


class ChangePasswordRequest(BaseModel):
    currentPassword: str | None = Field(default=None, min_length=6, max_length=120)
    current_password: str | None = Field(default=None, min_length=6, max_length=120)
    newPassword: str | None = Field(default=None, min_length=6, max_length=120)
    new_password: str | None = Field(default=None, min_length=6, max_length=120)

    @property
    def resolved_current_password(self) -> str:
        val = self.currentPassword or self.current_password
        if not val or not val.strip():
            raise ValueError("Mật khẩu hiện tại không được để trống.")
        return val.strip()

    @property
    def resolved_new_password(self) -> str:
        val = self.newPassword or self.new_password
        if not val or not val.strip():
            raise ValueError("Mật khẩu mới không được để trống.")
        return val.strip()


class AuthResponse(BaseModel):
    accessToken: str
    refreshToken: str
    user: AuthUser


class RefreshTokenRequest(BaseModel):
    refreshToken: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=3, max_length=160)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.fullmatch(normalized):
            raise ValueError("Email không hợp lệ.")
        return normalized


class VerifyOtpRequest(BaseModel):
    email: str = Field(min_length=3, max_length=160)
    otp: str = Field(min_length=4, max_length=10)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, value: str) -> str:
        return value.strip()


class ResetPasswordRequest(BaseModel):
    email: str = Field(min_length=3, max_length=160)
    otp: str = Field(min_length=4, max_length=10)
    newPassword: str | None = Field(default=None, min_length=6, max_length=120)
    new_password: str | None = Field(default=None, min_length=6, max_length=120)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, value: str) -> str:
        return value.strip()

    @property
    def resolved_new_password(self) -> str:
        val = self.newPassword or self.new_password
        if not val or not val.strip():
            raise ValueError("Mật khẩu mới không được để trống.")
        return val.strip()


class ForgotPasswordResponse(BaseModel):
    success: bool = True
    message: str
    email: str
    expiresIn: int

