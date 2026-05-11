"""DreamerZ API — FastAPI application entry point.

Replaces the 1,032-line server.py monolith with a modular architecture.
"""

import logging
import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from database import (
    engine,
    init_db,
    read_applied_reset_token,
    seed_data,
    write_applied_reset_token,
)
from middleware.security import setup_cors, add_security_headers
from middleware.logging_mw import log_requests
from routes import api_router

# ── Logging ───────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ───────────────────────────────────────────────────
app = FastAPI(
    title="DreamerZ API",
    description="Backend API for DreamerZ AI & English Learning Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware (order matters: last added = first executed) ──
setup_cors(app)
app.middleware("http")(add_security_headers)
app.middleware("http")(log_requests)

# ── Routes ────────────────────────────────────────────────
app.include_router(api_router)


# ── Startup / Shutdown ────────────────────────────────────
@app.on_event("startup")
async def startup():
    # DB_RESET is an idempotent one-shot token: its *value* (any non-empty
    # string) requests one schema wipe. After a successful wipe the value
    # is recorded in a Postgres COMMENT on the database (survives DROP
    # SCHEMA CASCADE), so subsequent cold starts with the same value
    # short-circuit and don't wipe again. To trigger another reset later,
    # change the value (e.g. DB_RESET=v2). Leave it unset for no-op boots.
    reset_token = os.environ.get("DB_RESET", "").strip()
    drop_first = False

    if reset_token:
        applied = await read_applied_reset_token()
        if applied == reset_token:
            logger.info(
                "DB_RESET=%r already applied; skipping wipe. "
                "Change the value to trigger another reset.",
                reset_token,
            )
        else:
            logger.warning(
                "DB_RESET=%r differs from last applied (%r) — "
                "dropping and recreating all tables.",
                reset_token, applied,
            )
            drop_first = True

    await init_db(drop_first=drop_first)

    if drop_first:
        # Record the token only after the wipe + recreate succeeds.
        await write_applied_reset_token(reset_token)

    await seed_data()
    logger.info("Database tables ensured and seed data refreshed.")


@app.on_event("shutdown")
async def shutdown():
    await engine.dispose()


# ── Global Exception Handler ─────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url.path, type(exc).__name__)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred. Please try again later."},
    )
