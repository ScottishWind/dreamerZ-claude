"""Progress routes — course enrollment and lesson progress tracking."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.progress import (
    StudentCourseEnrollmentUpdate,
    StudentLessonProgressUpdate,
)
from services.progress_service import (
    start_course_enrollment,
    get_course_enrollment,
    update_course_enrollment,
    get_student_course_enrollments,
    complete_course_enrollment,
    start_lesson_progress,
    update_lesson_progress,
    complete_lesson_progress,
    get_lesson_progress,
    get_course_lesson_progress,
    update_lesson_time_spent,
)
from services.auth_service import get_current_user

router = APIRouter(prefix="/progress", tags=["progress"])


# ---------------------------------------------------------------------------
# Course Enrollment Progress
# ---------------------------------------------------------------------------

@router.post("/courses/{course_id}/start")
async def start_course(
    course_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Start or resume a course enrollment."""
    try:
        # Get user ID from username
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        enrollment = await start_course_enrollment(user_id, course_id, session)
        return enrollment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses/{course_id}")
async def get_enrollment(
    course_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get enrollment status for a specific course."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        enrollment = await get_course_enrollment(user_id, course_id, session)
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        return enrollment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/courses/{course_id}")
async def update_enrollment(
    course_id: int,
    updates: StudentCourseEnrollmentUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Update course enrollment progress."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        enrollment = await update_course_enrollment(user_id, course_id, updates, session)
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        return enrollment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses")
async def list_enrollments(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get all course enrollments for the current user."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        enrollments = await get_student_course_enrollments(user_id, session)
        return enrollments
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/{course_id}/complete")
async def complete_course(
    course_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Mark a course as completed."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        enrollment = await complete_course_enrollment(user_id, course_id, session)
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        return enrollment
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Lesson Progress
# ---------------------------------------------------------------------------

@router.post("/lessons/{lesson_id}/start")
async def start_lesson(
    lesson_id: int,
    course_id: int,
    module_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Start or resume a lesson."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        progress = await start_lesson_progress(
            user_id, course_id, module_id, lesson_id, session
        )
        return progress
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/lessons/{lesson_id}")
async def get_lesson_progress_endpoint(
    lesson_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get progress for a specific lesson."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        progress = await get_lesson_progress(user_id, lesson_id, session)
        if not progress:
            raise HTTPException(status_code=404, detail="Lesson progress not found")
        return progress
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/lessons/{lesson_id}")
async def update_lesson_progress_endpoint(
    lesson_id: int,
    updates: StudentLessonProgressUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Update lesson progress."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        progress = await update_lesson_progress(user_id, lesson_id, updates, session)
        if not progress:
            raise HTTPException(status_code=404, detail="Lesson progress not found")
        return progress
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lessons/{lesson_id}/complete")
async def complete_lesson_endpoint(
    lesson_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Mark a lesson as completed."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        progress = await complete_lesson_progress(user_id, lesson_id, session)
        if not progress:
            raise HTTPException(status_code=404, detail="Lesson progress not found")
        return progress
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses/{course_id}/lessons")
async def list_course_lesson_progress(
    course_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get all lesson progress for a course."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        progress_list = await get_course_lesson_progress(user_id, course_id, session)
        return progress_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/lessons/{lesson_id}/heartbeat")
async def lesson_heartbeat(
    lesson_id: int,
    additional_seconds: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Update time spent on a lesson (heartbeat for tracking engagement)."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        progress = await update_lesson_time_spent(
            user_id, lesson_id, additional_seconds, session
        )
        if not progress:
            raise HTTPException(status_code=404, detail="Lesson progress not found")
        return progress
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
