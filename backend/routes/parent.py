"""Parent routes — parent-student linking and reporting."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.progress import ParentStudentLinkCreate, ParentStudentLinkUpdate
from services.parent_service import (
    create_parent_student_link,
    update_parent_student_link,
    deactivate_parent_student_link,
    get_parent_student_links,
    check_parent_access,
    get_parent_students,
    get_student_parents,
)
from services.progress_service import (
    get_course_enrollment,
    get_student_course_enrollments,
    get_course_lesson_progress,
)
from services.assessment_service import (
    get_student_assessment_attempts,
    get_best_assessment_attempt,
)
from services.auth_service import get_current_user

router = APIRouter(prefix="/parent", tags=["parent"])


class ParentStudentLinkByIdentifierPayload(BaseModel):
    student_identifier: str
    relationship_type: Optional[str] = None


# ---------------------------------------------------------------------------
# Parent-Student Links
# ---------------------------------------------------------------------------

@router.post("/links")
async def create_link(
    student_user_id: int,
    relationship_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Create a link between the current parent and a student."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        parent_user_id = result.scalar()
        if not parent_user_id:
            raise HTTPException(status_code=404, detail="User not found")

        link = await create_parent_student_link(
            parent_user_id=parent_user_id,
            student_user_id=student_user_id,
            relationship_type=relationship_type,
            session=session,
        )
        return link
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/links/by-identifier")
async def create_link_by_identifier(
    payload: ParentStudentLinkByIdentifierPayload,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Create a link between the current parent and a student by username or email."""
    try:
        from sqlalchemy import or_, select
        from models.sql_models import User

        identifier = payload.student_identifier.strip()
        if not identifier:
            raise HTTPException(status_code=400, detail="Student username or email is required")

        parent_result = await session.execute(
            select(User).where(User.username == current_user["username"])
        )
        parent = parent_result.scalars().first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent user not found")

        student_result = await session.execute(
            select(User).where(
                or_(
                    User.username == identifier,
                    User.email == identifier,
                )
            )
        )
        student = student_result.scalars().first()
        if not student:
            raise HTTPException(status_code=404, detail="Student account not found")

        if student.id == parent.id:
            raise HTTPException(status_code=400, detail="You cannot link your own account as a student")

        link = await create_parent_student_link(
            parent_user_id=parent.id,
            student_user_id=student.id,
            relationship_type=payload.relationship_type,
            session=session,
        )
        return link
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/links")
async def list_links(
    student_user_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get parent-student links for the current user."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        links = await get_parent_student_links(
            parent_user_id=user_id,
            student_user_id=student_user_id,
            is_active=is_active,
            session=session,
        )
        return links
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/links/{link_id}")
async def update_link(
    link_id: int,
    updates: ParentStudentLinkUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Update a parent-student link."""
    try:
        link = await update_parent_student_link(link_id, updates, session)
        if not link:
            raise HTTPException(status_code=404, detail="Link not found")

        # Verify user owns this link
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if link["parent_user_id"] != user_id and not current_user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Access denied")

        return link
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/links/{link_id}")
async def delete_link(
    link_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Deactivate a parent-student link."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        link = await deactivate_parent_student_link(link_id, session)
        if not link:
            raise HTTPException(status_code=404, detail="Link not found")

        if link["parent_user_id"] != user_id and not current_user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Access denied")

        return link
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students")
async def list_students(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get all students linked to the current parent."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        parent_user_id = result.scalar()
        if not parent_user_id:
            raise HTTPException(status_code=404, detail="User not found")

        students = await get_parent_students(parent_user_id, session)
        return students
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Parent Reporting
# ---------------------------------------------------------------------------

@router.get("/students/{student_user_id}/overview")
async def get_student_overview(
    student_user_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get overview of a student's learning progress."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        # Get current user ID
        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        parent_user_id = result.scalar()
        if not parent_user_id:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify parent has access to this student
        has_access = await check_parent_access(parent_user_id, student_user_id, session)
        if not has_access and not current_user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Access denied to student data")

        # Get all enrollments for the student
        enrollments = await get_student_course_enrollments(student_user_id, session)

        # Calculate overall stats
        total_courses = len(enrollments)
        completed_courses = sum(1 for e in enrollments if e["status"] == "completed")
        in_progress_courses = sum(1 for e in enrollments if e["status"] == "in_progress")
        total_time_spent = sum(e["total_time_spent_seconds"] for e in enrollments)

        # Get student info
        student_result = await session.execute(
            select(User).where(User.id == student_user_id)
        )
        student = student_result.scalars().first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")

        return {
            "student": {
                "id": student.id,
                "username": student.username,
                "email": student.email,
                "created_at": student.created_at.isoformat() if student.created_at else None,
            },
            "stats": {
                "total_courses": total_courses,
                "completed_courses": completed_courses,
                "in_progress_courses": in_progress_courses,
                "total_time_spent_seconds": total_time_spent,
                "total_time_spent_hours": round(total_time_spent / 3600, 2),
            },
            "enrollments": enrollments,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/{student_user_id}/courses")
async def get_student_courses(
    student_user_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get all course enrollments for a student."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        parent_user_id = result.scalar()
        if not parent_user_id:
            raise HTTPException(status_code=404, detail="User not found")

        has_access = await check_parent_access(parent_user_id, student_user_id, session)
        if not has_access and not current_user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Access denied to student data")

        enrollments = await get_student_course_enrollments(student_user_id, session)
        return enrollments
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/{student_user_id}/courses/{course_id}")
async def get_student_course_report(
    student_user_id: int,
    course_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get detailed report for a student's progress in a specific course."""
    try:
        from sqlalchemy import select
        from models.sql_models import User, Course

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        parent_user_id = result.scalar()
        if not parent_user_id:
            raise HTTPException(status_code=404, detail="User not found")

        has_access = await check_parent_access(parent_user_id, student_user_id, session)
        if not has_access and not current_user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Access denied to student data")

        # Get enrollment
        enrollment = await get_course_enrollment(student_user_id, course_id, session)
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")

        # Get course info
        course_result = await session.execute(
            select(Course).where(Course.id == course_id)
        )
        course = course_result.scalars().first()

        # Get lesson progress
        lesson_progress = await get_course_lesson_progress(student_user_id, course_id, session)

        # Get assessment attempts
        quiz_attempts = await get_student_assessment_attempts(
            student_user_id=student_user_id,
            assessment_type="quiz",
            session=session,
        )
        assignment_attempts = await get_student_assessment_attempts(
            student_user_id=student_user_id,
            assessment_type="assignment",
            session=session,
        )

        # Calculate assessment stats
        quiz_scores = [a["percentage_score"] for a in quiz_attempts if a["percentage_score"] is not None]
        assignment_scores = [a["percentage_score"] for a in assignment_attempts if a["percentage_score"] is not None]

        avg_quiz_score = sum(quiz_scores) / len(quiz_scores) if quiz_scores else None
        avg_assignment_score = sum(assignment_scores) / len(assignment_scores) if assignment_scores else None

        # Identify risk flags
        risk_flags = []
        if avg_quiz_score is not None and avg_quiz_score < 60:
            risk_flags.append("low_quiz_performance")
        if enrollment["last_accessed_at"]:
            from datetime import datetime, timezone, timedelta
            last_active = datetime.fromisoformat(enrollment["last_accessed_at"])
            if datetime.now(timezone.utc) - last_active > timedelta(days=7):
                risk_flags.append("inactive_7_days")

        return {
            "course": {
                "id": course.id,
                "name": course.name,
                "slug": course.slug,
            } if course else None,
            "enrollment": enrollment,
            "lesson_progress": lesson_progress,
            "assessment_stats": {
                "total_quiz_attempts": len(quiz_attempts),
                "total_assignment_attempts": len(assignment_attempts),
                "average_quiz_score": avg_quiz_score,
                "average_assignment_score": avg_assignment_score,
            },
            "risk_flags": risk_flags,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students/{student_user_id}/courses/{course_id}/lessons")
async def get_student_course_lessons(
    student_user_id: int,
    course_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get lesson-by-lesson progress for a student in a course."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        parent_user_id = result.scalar()
        if not parent_user_id:
            raise HTTPException(status_code=404, detail="User not found")

        has_access = await check_parent_access(parent_user_id, student_user_id, session)
        if not has_access and not current_user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Access denied to student data")

        lesson_progress = await get_course_lesson_progress(student_user_id, course_id, session)
        return lesson_progress
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
