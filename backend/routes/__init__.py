"""API routes — all sub-routers combined into a single api_router."""

from fastapi import APIRouter

from routes.auth import router as auth_router
from routes.content import router as content_router
from routes.ai import router as ai_router
from routes.site import router as site_router
from routes.status import router as status_router
from routes.admin import admin_router, content_router as admin_content_router, supervisor_router
from routes.course_generation import router as course_gen_router
from routes.progress import router as progress_router
from routes.assessments import router as assessments_router
from routes.parent import router as parent_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(content_router)
api_router.include_router(ai_router)
api_router.include_router(site_router)
api_router.include_router(status_router)
api_router.include_router(admin_router)
api_router.include_router(admin_content_router)
api_router.include_router(supervisor_router)
api_router.include_router(course_gen_router)
api_router.include_router(progress_router)
api_router.include_router(assessments_router)
api_router.include_router(parent_router)