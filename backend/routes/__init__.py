"""API routes — all sub-routers combined into a single api_router."""

from fastapi import APIRouter

from routes.auth import router as auth_router
from routes.content import router as content_router
from routes.ai import router as ai_router
from routes.enrollment import router as enrollment_router
from routes.site import router as site_router
from routes.status import router as status_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(content_router)
api_router.include_router(ai_router)
api_router.include_router(enrollment_router)
api_router.include_router(site_router)
api_router.include_router(status_router)
