"""Enrollment Pydantic models."""

from typing import Optional

from pydantic import BaseModel, Field, field_validator


class EnrollmentCreate(BaseModel):
    plan_id: str = Field(..., max_length=100)
    payment_id: Optional[str] = Field(None, max_length=200)

    @field_validator("plan_id", "payment_id", mode="before")
    @classmethod
    def reject_non_string(cls, v):
        if v is not None and not isinstance(v, str):
            raise ValueError("must be a string")
        return v
