"""DreamerZ API — FastAPI application entry point.

Replaces the 1,032-line server.py monolith with a modular architecture.
"""

import logging
import os

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from database import init_db, seed_data, engine
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
    # Set DB_RESET=true once in the dashboard to drop and recreate the schema
    # (e.g. after a non-backwards-compatible model change). Unset it after the
    # first successful boot so subsequent restarts don't wipe data.
    drop_first = os.environ.get("DB_RESET", "").lower() in ("true", "1", "yes")
    if drop_first:
        logger.warning("DB_RESET is set — dropping and recreating all tables.")
    await init_db(drop_first=drop_first)
    await seed_data()
    logger.info("Database tables created and seeded.")


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
