"""DreamerZ API — FastAPI application entry point.

Replaces the 1,032-line server.py monolith with a modular architecture.
"""

import logging

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
    await init_db()
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
