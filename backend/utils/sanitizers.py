"""Input sanitization utilities — defence-in-depth on top of SQLAlchemy parameter binding."""

import re

from fastapi import HTTPException

SAFE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]{1,100}$")


def sanitize_str(value, field_name: str = "input") -> str:
    """Reject any value that is not a plain string.

    SQLAlchemy parameter binding handles SQL injection on its own; this is
    here to fail fast on obviously wrong types (lists, dicts, None) reaching
    fields that expect a string.
    """
    if not isinstance(value, str):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name}: must be a string",
        )
    return value


def sanitize_id(value, field_name: str = "id") -> str:
    """Validate an identifier is a safe alphanumeric slug."""
    value = sanitize_str(value, field_name)
    if not SAFE_ID_PATTERN.match(value):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid {field_name}: only letters, numbers, hyphens, "
                "underscores (max 100 chars)"
            ),
        )
    return value
