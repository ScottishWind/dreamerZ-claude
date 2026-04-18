"""Shared Pydantic field validators — eliminates duplication across models."""

from pydantic import field_validator


def reject_non_string_validator(*field_names, allow_none: bool = False):
    """Create a Pydantic field_validator that rejects non-string values.

    Usage in a BaseModel class:
        _validate_strings = reject_non_string_validator('prompt', 'context', allow_none=True)
    """

    @field_validator(*field_names, mode="before")
    @classmethod
    def reject_non_string(cls, v):
        if v is None and allow_none:
            return v
        if not isinstance(v, str):
            raise ValueError("must be a string")
        return v

    return reject_non_string
