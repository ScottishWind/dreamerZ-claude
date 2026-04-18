"""Input sanitization utilities for NoSQL injection protection."""

import re

from fastapi import HTTPException

SAFE_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]{1,100}$")

# MongoDB operators that should never appear in user input
NOSQL_OPERATORS = frozenset([
    "$gt", "$gte", "$lt", "$lte", "$ne", "$in", "$nin",
    "$or", "$and", "$not", "$nor", "$exists", "$type",
    "$regex", "$where", "$expr", "$elemMatch",
])


def sanitize_str(value, field_name: str = "input") -> str:
    """Reject any value that is not a plain string (blocks operator injection)."""
    if not isinstance(value, str):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name}: must be a string",
        )
    # Defence-in-depth: reject strings that look like MongoDB operators
    stripped = value.strip()
    if stripped.startswith("$") and stripped in NOSQL_OPERATORS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid {field_name}: disallowed characters",
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


def sanitize_query_dict(d: dict) -> dict:
    """Strip any keys starting with $ from a dict (defence-in-depth)."""
    return {k: v for k, v in d.items() if not str(k).startswith("$")}
