"""Authentication routes — register, login, profile, change password."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from config import USERNAME_REGEX, EMAIL_REGEX, ADMIN_EMAILS, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE
from database import get_db
from models.sql_models import User
from models.user import UserCreate, UserLogin, TokenResponse, UserInfoResponse, LanguageUpdate
from services.auth_service import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
    is_admin,
)
from services.email_service import send_welcome_email
from middleware.rate_limit import check_auth_rate_limit

logger = logging.getLogger(__name__)

_VALID_LANG_CODES = {lang["code"] for lang in SUPPORTED_LANGUAGES}

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserInfoResponse)
async def register_user(user: UserCreate, session: AsyncSession = Depends(get_db)):
    username = user.username.strip().lower()
    email = user.email.strip().lower()
    password = user.password.strip()

    if not USERNAME_REGEX.match(username):
        raise HTTPException(
            status_code=400,
            detail="Username must be 3-30 characters and can only contain "
            "letters, numbers, and underscores.",
        )
    if not EMAIL_REGEX.match(email):
        raise HTTPException(
            status_code=400, detail="Please provide a valid email address."
        )
    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long.",
        )

    result = await session.execute(
        select(User).where(or_(User.username == username, User.email == email))
    )
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=400, detail="Username or email is already in use."
        )

    lang = user.preferred_language.strip().lower()
    if lang not in _VALID_LANG_CODES:
        lang = DEFAULT_LANGUAGE

    hashed_password = get_password_hash(password)
    now = datetime.now(timezone.utc)

    new_user = User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        preferred_language=lang,
        created_at=now,
        updated_at=now,
        last_login=None,
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)

    created_at = now.isoformat()

    # Send welcome email (fire-and-forget — don't block registration on email failure)
    try:
        send_welcome_email(to_email=email, username=username)
    except Exception:
        pass  # Email failure should never block registration

    return {
        "username": username,
        "email": email,
        "created_at": created_at,
        "is_admin": email.lower() in ADMIN_EMAILS,
        "preferred_language": lang,
    }


@router.post("/login", response_model=TokenResponse)
async def login_user(credentials: UserLogin, request: Request, session: AsyncSession = Depends(get_db)):
    # Rate-limit login attempts per IP to prevent brute force
    client_ip = request.client.host if request.client else "unknown"
    check_auth_rate_limit(client_ip)

    username = credentials.username.strip().lower() if credentials.username else None
    email = credentials.email.strip().lower() if credentials.email else None

    if not username and not email:
        raise HTTPException(
            status_code=400, detail="Please provide a username or email."
        )

    user = await authenticate_user(username, email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=401, detail="Invalid username, email, or password."
        )

    admin = is_admin(user)
    user_lang = user.get("preferred_language", DEFAULT_LANGUAGE)
    token = create_access_token(
        {"sub": user["username"], "email": user["email"], "is_admin": admin, "lang": user_lang}
    )

    # Update last_login via SQLAlchemy
    result = await session.execute(
        select(User).where(User.username == user["username"])
    )
    db_user = result.scalars().first()
    if db_user:
        db_user.last_login = datetime.now(timezone.utc)
        await session.commit()

    return {
        "access_token": token,
        "username": user["username"],
        "email": user["email"],
        "created_at": user["created_at"],
        "is_admin": admin,
        "preferred_language": user_lang,
    }


@router.get("/me", response_model=UserInfoResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "email": current_user["email"],
        "created_at": current_user["created_at"],
        "is_admin": is_admin(current_user),
        "preferred_language": current_user.get("preferred_language", DEFAULT_LANGUAGE),
    }


@router.put("/language")
async def update_language(
    body: LanguageUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Update the authenticated user's preferred language."""
    lang = body.preferred_language.strip().lower()
    if lang not in _VALID_LANG_CODES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{lang}'. Supported: {', '.join(_VALID_LANG_CODES)}",
        )

    result = await session.execute(
        select(User).where(User.username == current_user["username"])
    )
    db_user = result.scalars().first()
    if db_user:
        db_user.preferred_language = lang
        db_user.updated_at = datetime.now(timezone.utc)
        await session.commit()

    return {"preferred_language": lang}


@router.get("/languages")
async def get_supported_languages():
    """Return the list of supported languages."""
    return SUPPORTED_LANGUAGES


# ── Change password (authenticated) ──────────────────────

class ChangePasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)


@router.post("/change-password", response_model=TokenResponse)
async def change_password(
    body: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Set a new password for the currently authenticated user.

    Returns a fresh JWT signed against the new password hash so the user
    stays logged in seamlessly without having to re-enter credentials.
    """
    new_password = body.new_password.strip()
    confirm = body.confirm_password.strip()

    if new_password != confirm:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long.",
        )

    result = await session.execute(
        select(User).where(User.username == current_user["username"])
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    user.hashed_password = get_password_hash(new_password)
    user.updated_at = datetime.now(timezone.utc)
    await session.commit()

    admin = is_admin(current_user)
    user_lang = current_user.get("preferred_language", DEFAULT_LANGUAGE)
    new_token = create_access_token(
        {"sub": user.username, "email": user.email, "is_admin": admin, "lang": user_lang}
    )

    return {
        "access_token": new_token,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "is_admin": admin,
        "preferred_language": user_lang,
    }


# ── Forgot password (no auth, no email) ──────────────────
#
# Self-serve unlock for users who can't sign in. Per product
# spec, identity is verified only by knowing the username/email —
# no email link, no security questions. This means anyone who
# knows your login id can overwrite your password. Rate-limited
# per client IP to slow down brute-force enumeration.

class ForgotPasswordRequest(BaseModel):
    login_id: str = Field(..., max_length=255, description="username or email")
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8, max_length=128)


@router.post("/forgot-password", response_model=TokenResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
):
    """Reset a forgotten password without going through email.

    The user identifies themselves by username or email; the new
    password replaces the old one immediately. A fresh JWT is
    returned so the frontend can log them in straight away.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_auth_rate_limit(client_ip)

    new_password = body.new_password.strip()
    confirm = body.confirm_password.strip()
    login_id = body.login_id.strip().lower()

    if new_password != confirm:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long.",
        )
    if not login_id:
        raise HTTPException(
            status_code=400,
            detail="Enter your username or email.",
        )

    is_email = "@" in login_id
    if is_email:
        stmt = select(User).where(User.email == login_id)
    else:
        stmt = select(User).where(User.username == login_id)

    result = await session.execute(stmt)
    user = result.scalars().first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found with that username or email.",
        )

    user.hashed_password = get_password_hash(new_password)
    user.updated_at = datetime.now(timezone.utc)
    await session.commit()

    admin_flag = (user.email or "").lower() in ADMIN_EMAILS or bool(user.is_admin)
    user_lang = user.preferred_language or DEFAULT_LANGUAGE
    new_token = create_access_token(
        {"sub": user.username, "email": user.email, "is_admin": admin_flag, "lang": user_lang}
    )

    logger.info("Password reset via forgot-password for user %s", user.username)

    return {
        "access_token": new_token,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "is_admin": admin_flag,
        "preferred_language": user_lang,
    }
