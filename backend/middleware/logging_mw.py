"""Request/response logging middleware."""

import logging
import time

from fastapi import Request

logger = logging.getLogger(__name__)


async def log_requests(request: Request, call_next):
    """Log every request with method, path, status code, and duration."""
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        "%s %s -> %d (%.3fs)",
        request.method,
        request.url.path,
        response.status_code,
        duration,
    )
    return response
