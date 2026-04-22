"""Authentication service — password hashing, JWT tokens, user lookup."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Header, HTTPException
from jwt import ExpiredSignatureError, InvalidTokenError
from passlib.context import CryptContext

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_MINUTES, ADMIN_EMAILS
from database import db
from utils.sanitizers import sanitize_str

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Dummy hash for constant-time comparison when user is not found
_DUMMY_HASH = pwd_context.hash("dummy-password-for-timing-safety")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=JWT_EXPIRATION_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_user_by_login_identifier(
    username: Optional[str], email: Optional[str]
):
    """Look up a user by email or username. Returns user document or None.

    FIXED: This function is now async and properly awaits Motor queries.
    """
    if email:
        email = sanitize_str(email, "email").lower()
        return await db.users.find_one({"email": email})
    if username:
        username = sanitize_str(username, "username").lower()
        return await db.users.find_one({"username": username})
    return None


async def get_current_user(authorization: Optional[str] = Header(None)):
    """FastAPI dependency — extract and validate current user from JWT."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Authorization header missing"
        )
    token = authorization.split(" ", 1)[1]
    payload = decode_access_token(token)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    user = await db.users.find_one(
        {"username": username.lower()}, {"hashed_password": 0}
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def is_admin(user: dict) -> bool:
    """Check if a user has admin privileges.

    A user is an admin if their email is in the ADMIN_EMAILS env-var list
    (super-admins) OR if they have been promoted via the admin panel
    (is_admin flag stored in the DB).
    """
    if user.get("email", "").lower() in ADMIN_EMAILS:
        return True
    return bool(user.get("is_admin", False))


async def get_current_admin(authorization: Optional[str] = Header(None)):
    """FastAPI dependency — require admin privileges."""
    user = await get_current_user(authorization)
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def authenticate_user(username: Optional[str], email: Optional[str], password: str):
    """Authenticate a user by credentials. Returns user dict or None.

    Uses constant-time comparison to prevent timing-based user enumeration.
    """
    user = await get_user_by_login_identifier(username, email)

    if not user:
        # Always run bcrypt to prevent timing attacks that reveal user existence
        verify_password(password, _DUMMY_HASH)
        return None

    if not verify_password(password, user.get("hashed_password", "")):
        return None

    return user
