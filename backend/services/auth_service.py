"""Authentication service — password hashing, JWT tokens, user lookup."""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Header, HTTPException
from jwt import ExpiredSignatureError, InvalidTokenError
from passlib.context import CryptContext
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_MINUTES, ADMIN_EMAILS
from database import async_session
from models.sql_models import User
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


def _user_to_dict(user: User) -> dict:
    """Convert a User ORM instance to the dict shape exposed by the auth API."""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "hashed_password": user.hashed_password,
        "preferred_language": user.preferred_language or "en",
        "is_admin": user.is_admin,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
    }


async def get_user_by_login_identifier(
    username: Optional[str], email: Optional[str], session: Optional[AsyncSession] = None,
):
    """Look up a user by email or username. Returns user dict or None."""
    close_session = False
    if session is None:
        session = async_session()
        close_session = True

    try:
        if email:
            email = sanitize_str(email, "email").lower()
            result = await session.execute(
                select(User).where(User.email == email)
            )
        elif username:
            username = sanitize_str(username, "username").lower()
            result = await session.execute(
                select(User).where(User.username == username)
            )
        else:
            return None

        user = result.scalars().first()
        return _user_to_dict(user) if user else None
    finally:
        if close_session:
            await session.close()


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

    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.username == username.lower())
        )
        user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Return dict without hashed_password
    d = _user_to_dict(user)
    d.pop("hashed_password", None)
    return d


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
