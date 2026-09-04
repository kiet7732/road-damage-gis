import re

from pydantic import BaseModel, Field, field_validator


EMAIL_PATTERN = re.compile(r"^\S+@\S+\.\S+$")
PHONE_PATTERN = re.compile(r"^(\+84|0)[0-9]{9,10}$")


class AuthUser(BaseModel):
    id: str
    fullName: str
    email: str
    phone: str | None = None
    role: str


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


class AuthResponse(BaseModel):
    accessToken: str
    refreshToken: str
    user: AuthUser


class RefreshTokenRequest(BaseModel):
    refreshToken: str | None = None
