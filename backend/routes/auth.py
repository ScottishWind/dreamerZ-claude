"""Authentication routes — register, login, profile, password reset."""

import logging
import os
from datetime import datetime, timedelta, timezone

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
    decode_access_token,
    get_current_user,
    get_password_hash,
    is_admin,
)
from services.email_service import send_password_reset_email, send_welcome_email
from middleware.rate_limit import check_auth_rate_limit

logger = logging.getLogger(__name__)

PASSWORD_RESET_TOKEN_EXPIRY_MINUTES = 60

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


# ── Password reset ───────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=255)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., max_length=2048)
    new_password: str = Field(..., min_length=8, max_length=128)


def _password_nonce(hashed_password: str) -> str:
    """Last 8 chars of the bcrypt hash; used to invalidate reset tokens once
    the password changes (the nonce won't match the new hash)."""
    return (hashed_password or "")[-8:]


def _frontend_base_url() -> str:
    """Compute the frontend origin we'll embed in reset emails. Uses the
    first entry of CORS_ORIGINS as a sensible default; FRONTEND_URL env
    var overrides explicitly when set."""
    explicit = os.environ.get("FRONTEND_URL", "").strip()
    if explicit:
        return explicit.rstrip("/")
    cors_raw = os.environ.get("CORS_ORIGINS", "").strip()
    if cors_raw:
        first = cors_raw.split(",")[0].strip().rstrip("/")
        if first:
            return first
    return "http://localhost:3000"


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    request: Request,
    session: AsyncSession = Depends(get_db),
):
    """Send a password-reset link to the user's email if it exists.

    Always returns a generic success message to avoid leaking which
    addresses are registered. Rate-limited per client IP.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_auth_rate_limit(client_ip)

    email = body.email.strip().lower()
    if not EMAIL_REGEX.match(email):
        # Same generic response — don't help attackers enumerate.
        return {"detail": "If that email is registered, a reset link is on its way."}

    result = await session.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if user:
        token = create_access_token(
            {
                "sub": user.username,
                "purpose": "password_reset",
                "pw_nonce": _password_nonce(user.hashed_password),
            },
            expires_delta=timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRY_MINUTES),
        )
        reset_link = f"{_frontend_base_url()}/reset-password?token={token}"
        try:
            send_password_reset_email(
                to_email=user.email,
                username=user.username,
                reset_link=reset_link,
            )
        except Exception:
            # Email delivery shouldn't 500 the request or leak which addresses
            # are real. Log and move on.
            logger.exception("Failed to send password reset email to %s", email)

    return {"detail": "If that email is registered, a reset link is on its way."}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    session: AsyncSession = Depends(get_db),
):
    """Verify a reset token and set a new password.

    The token is a JWT with purpose='password_reset' and a nonce derived
    from the user's current password hash; once the password changes the
    nonce drifts and the token can't be reused.
    """
    payload = decode_access_token(body.token)

    if payload.get("purpose") != "password_reset":
        raise HTTPException(status_code=400, detail="Invalid reset token.")

    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=400, detail="Invalid reset token.")

    result = await session.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset token.")

    if payload.get("pw_nonce") != _password_nonce(user.hashed_password):
        # Password was already changed since the token was issued.
        raise HTTPException(
            status_code=400,
            detail="This reset link has already been used or is no longer valid.",
        )

    new_password = body.new_password.strip()
    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long.",
        )

    user.hashed_password = get_password_hash(new_password)
    user.updated_at = datetime.now(timezone.utc)
    await session.commit()

    return {"detail": "Password has been reset. You can sign in with the new password."}
