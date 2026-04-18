"""Authentication routes — register, login, profile."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from config import USERNAME_REGEX, EMAIL_REGEX
from database import db
from models.user import UserCreate, UserLogin, TokenResponse, UserInfoResponse
from services.auth_service import (
    authenticate_user,
    create_access_token,
    get_current_user,
    get_password_hash,
)
from middleware.rate_limit import check_auth_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserInfoResponse)
async def register_user(user: UserCreate):
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

    existing_user = await db.users.find_one(
        {"$or": [{"username": username}, {"email": email}]}
    )
    if existing_user:
        raise HTTPException(
            status_code=400, detail="Username or email is already in use."
        )

    hashed_password = get_password_hash(password)
    created_at = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "username": username,
        "email": email,
        "hashed_password": hashed_password,
        "created_at": created_at,
        "updated_at": created_at,
        "last_login": None,
    }
    await db.users.insert_one(user_doc)

    return {"username": username, "email": email, "created_at": created_at}


@router.post("/login", response_model=TokenResponse)
async def login_user(credentials: UserLogin, request: Request):
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

    token = create_access_token(
        {"sub": user["username"], "email": user["email"]}
    )
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}},
    )

    return {
        "access_token": token,
        "username": user["username"],
        "email": user["email"],
        "created_at": user["created_at"],
    }


@router.get("/me", response_model=UserInfoResponse)
async def get_profile(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "email": current_user["email"],
        "created_at": current_user["created_at"],
    }
