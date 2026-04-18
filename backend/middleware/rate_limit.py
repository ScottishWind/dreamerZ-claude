"""Rate limiting middleware — in-memory with TTL cleanup."""

import time
from collections import defaultdict

from fastapi import HTTPException

from config import (
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW,
    AUTH_RATE_LIMIT_REQUESTS,
    AUTH_RATE_LIMIT_WINDOW,
)

# In-memory rate limit stores with periodic cleanup
_api_rate_store: dict = defaultdict(list)
_auth_rate_store: dict = defaultdict(list)

# Track last cleanup time to avoid unbounded growth
_last_cleanup = time.time()
_CLEANUP_INTERVAL = 300  # Clean up every 5 minutes


def _cleanup_store(store: dict, window: int):
    """Remove expired entries to prevent memory leak."""
    current_time = time.time()
    expired_keys = []
    for key, timestamps in store.items():
        store[key] = [t for t in timestamps if current_time - t < window]
        if not store[key]:
            expired_keys.append(key)
    for key in expired_keys:
        del store[key]


def _maybe_cleanup():
    """Periodically clean up rate limit stores to prevent unbounded growth."""
    global _last_cleanup
    now = time.time()
    if now - _last_cleanup > _CLEANUP_INTERVAL:
        _cleanup_store(_api_rate_store, RATE_LIMIT_WINDOW)
        _cleanup_store(_auth_rate_store, AUTH_RATE_LIMIT_WINDOW)
        _last_cleanup = now


def _check_limit(store: dict, key: str, max_requests: int, window: int) -> bool:
    """Check if a key has exceeded its rate limit. Returns True if allowed."""
    _maybe_cleanup()
    current_time = time.time()
    store[key] = [t for t in store[key] if current_time - t < window]
    if len(store[key]) >= max_requests:
        return False
    store[key].append(current_time)
    return True


def check_api_rate_limit(client_ip: str):
    """Check rate limit for general API endpoints. Raises 429 if exceeded."""
    if not _check_limit(_api_rate_store, client_ip, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW):
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please wait a minute before trying again.",
        )


def check_auth_rate_limit(client_ip: str):
    """Check rate limit for authentication endpoints. Raises 429 if exceeded."""
    if not _check_limit(_auth_rate_store, client_ip, AUTH_RATE_LIMIT_REQUESTS, AUTH_RATE_LIMIT_WINDOW):
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please try again later.",
        )
