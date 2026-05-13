"""User-related Pydantic models."""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    email: str = Field(..., max_length=254)
    password: str = Field(..., min_length=8, max_length=128)
    preferred_language: str = Field("en", max_length=5)
    role: str = Field("learner", max_length=20)

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


class LanguageUpdate(BaseModel):
    preferred_language: str = Field(..., max_length=5)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    email: str
    created_at: str
    role: str = "learner"
    ai_generation_enabled: bool = False
    preferred_language: str = "en"


class UserInfoResponse(BaseModel):
    username: str
    email: str
    created_at: str
    role: str = "learner"
    ai_generation_enabled: bool = False
    preferred_language: str = "en"


class AdminUserResponse(BaseModel):
    """Extended user info visible only to admins."""
    username: str
    email: str
    created_at: str
    last_login: Optional[str] = None
    is_super_admin: bool = False
    is_active: bool = True
    role: str = "learner"
    ai_generation_enabled: bool = False
    preferred_language: str = "en"
    supervisors: list[str] = []


class RoleUpdate(BaseModel):
    role: Literal["learner", "creator", "supervisor", "admin"]


class AIFeatureUpdate(BaseModel):
    enabled: bool
