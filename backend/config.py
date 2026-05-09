"""Application configuration — all settings from environment variables and constants."""

import os
import re
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ── Database ──────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./dreamerz.db")
# Fix Render's postgres:// prefix for SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)

# ── Authentication ────────────────────────────────────────
JWT_SECRET = os.environ.get("JWT_SECRET", "")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_MINUTES = int(os.environ.get("JWT_EXPIRATION_MINUTES", "1440"))

# Fail-fast: reject weak/default secrets in production
if not JWT_SECRET or JWT_SECRET == "change-this-secret":
    import warnings
    warnings.warn(
        "JWT_SECRET is missing or set to the insecure default. "
        "Set a strong random secret via environment variable.",
        stacklevel=2,
    )
    # Allow startup for local dev; production should set a real secret
    JWT_SECRET = JWT_SECRET or "change-this-secret"

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{3,30}$")

# ── Rate Limiting ─────────────────────────────────────────
RATE_LIMIT_REQUESTS = int(os.environ.get("RATE_LIMIT_REQUESTS", 10))
RATE_LIMIT_WINDOW = int(os.environ.get("RATE_LIMIT_WINDOW", 60))
AUTH_RATE_LIMIT_REQUESTS = int(os.environ.get("AUTH_RATE_LIMIT_REQUESTS", 5))
AUTH_RATE_LIMIT_WINDOW = int(os.environ.get("AUTH_RATE_LIMIT_WINDOW", 300))

# ── CORS ──────────────────────────────────────────────────
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
CORS_ORIGINS_RAW = os.environ.get("CORS_ORIGINS", _default_origins)
CORS_ORIGINS = [o.strip() for o in CORS_ORIGINS_RAW.split(",") if o.strip()]

# ── Anthropic (Claude) ────────────────────────────────────
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-opus-4-7")

# ── Request Size ──────────────────────────────────────────
MAX_REQUEST_SIZE = int(os.environ.get("MAX_REQUEST_SIZE", 10_000_000))  # 10 MB

# ── File Paths ────────────────────────────────────────────
CURRICULUM_JSON_PATH = ROOT_DIR / "curriculum_data.json"
SITE_CONFIG_JSON_PATH = ROOT_DIR / "site_config_seed.json"

# ── Admin ─────────────────────────────────────────────────
# Hardcoded admin emails — these accounts automatically get admin privileges.
ADMIN_EMAILS = [
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "purnendu.ju01@gmail.com").split(",")
    if e.strip()
]

# ── Languages ─────────────────────────────────────────────
SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English", "native_name": "English"},
    {"code": "bn", "name": "Bengali", "native_name": "বাংলা"},
]
DEFAULT_LANGUAGE = "en"

# ── Course Access ─────────────────────────────────────────
# All courses are now free — no preview module limits.

COURSE_PREVIEW_VIDEOS = {
    "chatgpt": "https://www.youtube.com/embed/zegMOOKy_6A",
    "claude": "https://www.youtube.com/embed/zegMOOKy_6A",
    "gemini": "https://www.youtube.com/embed/zegMOOKy_6A",
    "canva": "https://www.youtube.com/embed/zegMOOKy_6A",
    "syllaby": "https://www.youtube.com/embed/zegMOOKy_6A",
    "spoken-english-30day": "https://www.youtube.com/embed/zegMOOKy_6A",
}

TOOL_TO_PLAN = {
    "chatgpt": "ai-learning",
    "claude": "ai-learning",
    "gemini": "ai-learning",
    "canva": "ai-learning",
    "syllaby": "ai-learning",
    "spoken-english-30day": "spoken-english",
}
