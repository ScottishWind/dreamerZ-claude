"""Security middleware — headers, CORS setup."""

import logging

from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS


def setup_cors(app: FastAPI):
    """Configure CORS middleware with strict allowlist."""
    if "*" in CORS_ORIGINS:
        logging.warning(
            "CORS_ORIGINS contains '*'. This is acceptable for local dev "
            "but MUST be replaced with explicit origins before deploying."
        )

    app.add_middleware(
        CORSMiddleware,
        allow_credentials=True,
        allow_origins=CORS_ORIGINS,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
        expose_headers=["X-RateLimit-Remaining"],
        max_age=600,
    )


async def add_security_headers(request: Request, call_next):
    """Add security headers to every response.

    Includes HSTS and CSP headers (previously missing).
    """
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    # NEW: HSTS and CSP headers
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains; preload"
    )
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline' fonts.googleapis.com; "
        "font-src fonts.gstatic.com; "
        "img-src 'self' data: https:; "
        "frame-src https://www.youtube.com https://youtube.com"
    )
    return response
