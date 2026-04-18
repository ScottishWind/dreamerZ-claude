"""User-related Pydantic models."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: str = Field(..., max_length=254)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("username", "email", "password", mode="before")
    @classmethod
    def reject_non_string(cls, v):
        if not isinstance(v, str):
            raise ValueError("must be a string")
        return v


class UserLogin(BaseModel):
    username: Optional[str] = Field(None, max_length=30)
    email: Optional[str] = Field(None, max_length=254)
    password: str = Field(..., max_length=128)

    @field_validator("username", "email", "password", mode="before")
    @classmethod
    def reject_non_string(cls, v):
        if v is not None and not isinstance(v, str):
            raise ValueError("must be a string")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    email: str
    created_at: str
    is_admin: bool = False


class UserInfoResponse(BaseModel):
    username: str
    email: str
    created_at: str
    is_admin: bool = False


class AdminUserResponse(BaseModel):
    """Extended user info visible only to admins."""
    username: str
    email: str
    created_at: str
    last_login: Optional[str] = None
    is_admin: bool = False
