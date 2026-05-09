"""Enrollment routes — create, check, list enrollments and course access."""

from typing import Optional

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.enrollment import EnrollmentCreate
from services.auth_service import get_current_user
from services.enrollment_service import (
    create_enrollment,
    check_enrollment,
    get_user_enrollments,
    get_course_access,
)
from utils.sanitizers import sanitize_id

router = APIRouter(tags=["enrollment"])


@router.post("/enrollments")
async def create_enrollment_route(
    payload: EnrollmentCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Record an enrollment after payment verification."""
    return await create_enrollment(
        username=current_user["username"],
        plan_id=payload.plan_id,
        payment_id=payload.payment_id or "",
        session=session,
    )


@router.get("/enrollments/check")
async def check_enrollment_route(
    plan_id: str,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Check if current user is enrolled in a specific plan."""
    plan_id = sanitize_id(plan_id, "plan_id")
    enrolled = await check_enrollment(current_user["username"], plan_id, session=session)
    return {"enrolled": enrolled, "plan_id": plan_id}


@router.get("/enrollments/my")
async def get_my_enrollments(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """List all active enrollments for the current user."""
    return await get_user_enrollments(current_user["username"], session=session)


@router.get("/course-access/{tool_id}")
async def get_course_access_route(
    tool_id: str,
    authorization: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_db),
):
    """Return access info for a tool. Works for both logged-in and anonymous users."""
    return await get_course_access(tool_id, authorization, session=session)
