"""Content and AI-related Pydantic models."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class AIRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    context: Optional[str] = Field(None, max_length=2000)
    mode: str = Field("default", max_length=50)
    session_id: Optional[str] = Field(None, max_length=100)

    @field_validator("prompt", "context", "mode", "session_id", mode="before")
    @classmethod
    def reject_non_string(cls, v):
        if v is not None and not isinstance(v, str):
            raise ValueError("must be a string")
        return v


class AIResponse(BaseModel):
    response: str
    is_demo: bool = False
    tokens_used: Optional[int] = None


class HistoryMessage(BaseModel):
    """Typed message for roleplay history (replaces unvalidated dict)."""

    from_field: str = Field(..., alias="from", pattern="^(user|assistant)$")
    text: str = Field(..., min_length=1, max_length=1000)

    model_config = ConfigDict(populate_by_name=True)


class RoleplayMessage(BaseModel):
    tool_id: str = Field(..., max_length=100)
    module_id: str = Field(..., max_length=100)
    user_message: str = Field(..., min_length=1, max_length=1000)
    role: str = Field("friend", max_length=30)
    history: List[HistoryMessage] = Field(default_factory=list, max_length=20)

    @field_validator("tool_id", "module_id", "user_message", "role", mode="before")
    @classmethod
    def reject_non_string(cls, v):
        if not isinstance(v, str):
            raise ValueError("must be a string")
        return v
