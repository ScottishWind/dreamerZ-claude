"""Progress service — course enrollment, lesson progress, and lifecycle management."""

import logging
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from database import async_session
from models.sql_models import (
    StudentCourseEnrollment,
    StudentLessonProgress,
    Course,
    Module,
    Lesson,
    User,
)
from models.progress import (
    StudentCourseEnrollmentCreate,
    StudentCourseEnrollmentUpdate,
    StudentLessonProgressCreate,
    StudentLessonProgressUpdate,
)

logger = logging.getLogger(__name__)


async def _get_session_if_needed(session):
    """Return (session, should_close) tuple."""
    if session is not None:
        return session, False
    return async_session(), True


# ---------------------------------------------------------------------------
# Course Enrollment Progress
# ---------------------------------------------------------------------------

async def start_course_enrollment(
    student_user_id: int,
    course_id: int,
    session: AsyncSession = None,
) -> dict:
    """Create or update a course enrollment when a student starts a course."""
    sess, close = await _get_session_if_needed(session)

    try:
        # Check if enrollment already exists
        result = await sess.execute(
            select(StudentCourseEnrollment).where(
                and_(
                    StudentCourseEnrollment.student_user_id == student_user_id,
                    StudentCourseEnrollment.course_id == course_id,
                )
            )
        )
        enrollment = result.scalars().first()

        if enrollment:
            # Update existing enrollment
            if enrollment.status == "not_started":
                enrollment.status = "in_progress"
                enrollment.started_at = datetime.now(timezone.utc)
            enrollment.last_accessed_at = datetime.now(timezone.utc)
            enrollment.is_active = True
            await sess.commit()
            await sess.refresh(enrollment)
            return enrollment.to_dict()
        else:
            # Get total lesson count for the course
            lesson_count_result = await sess.execute(
                select(Lesson.id)
                .join(Module, Lesson.module_id == Module.id)
                .join(Course, Module.course_id == Course.id)
                .where(Course.id == course_id, Lesson.status == "published")
            )
            total_lessons = len(lesson_count_result.scalars().all())

            # Create new enrollment
            now = datetime.now(timezone.utc)
            new_enrollment = StudentCourseEnrollment(
                student_user_id=student_user_id,
                course_id=course_id,
                status="in_progress",
                started_at=now,
                last_accessed_at=now,
                total_lessons_count=total_lessons,
                lessons_completed_count=0,
                completion_percent=0.0,
                is_active=True,
            )
            sess.add(new_enrollment)
            await sess.commit()
            await sess.refresh(new_enrollment)
            return new_enrollment.to_dict()

    except Exception as e:
        await sess.rollback()
        logger.error("Error starting course enrollment: %s", e, exc_info=True)
        raise
    finally:
        if close:
            await sess.close()


async def get_course_enrollment(
    student_user_id: int,
    course_id: int,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Get a student's enrollment for a specific course."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(StudentCourseEnrollment).where(
                and_(
                    StudentCourseEnrollment.student_user_id == student_user_id,
                    StudentCourseEnrollment.course_id == course_id,
                )
            )
        )
        enrollment = result.scalars().first()
        return enrollment.to_dict() if enrollment else None
    finally:
        if close:
            await sess.close()


async def update_course_enrollment(
    student_user_id: int,
    course_id: int,
    updates: StudentCourseEnrollmentUpdate,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Update course enrollment progress."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(StudentCourseEnrollment).where(
                and_(
                    StudentCourseEnrollment.student_user_id == student_user_id,
                    StudentCourseEnrollment.course_id == course_id,
                )
            )
        )
        enrollment = result.scalars().first()

        if not enrollment:
            return None

        # Update fields
        for field, value in updates.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(enrollment, field, value)

        enrollment.last_accessed_at = datetime.now(timezone.utc)

        # Auto-calculate completion if lessons_completed_count and total_lessons_count are set
        if enrollment.lessons_completed_count is not None and enrollment.total_lessons_count > 0:
            enrollment.completion_percent = (
                enrollment.lessons_completed_count / enrollment.total_lessons_count
            ) * 100

        # Mark as completed if 100%
        if enrollment.completion_percent >= 100 and enrollment.status != "completed":
            enrollment.status = "completed"
            enrollment.completed_at = datetime.now(timezone.utc)

        await sess.commit()
        await sess.refresh(enrollment)
        return enrollment.to_dict()

    except Exception as e:
        await sess.rollback()
        logger.error("Error updating course enrollment: %s", e)
        raise
    finally:
        if close:
            await sess.close()


async def get_student_course_enrollments(
    student_user_id: int,
    session: AsyncSession = None,
) -> List[dict]:
    """Get all course enrollments for a student."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(StudentCourseEnrollment).where(
                StudentCourseEnrollment.student_user_id == student_user_id
            )
        )
        enrollments = result.scalars().all()
        return [e.to_dict() for e in enrollments]
    finally:
        if close:
            await sess.close()


async def complete_course_enrollment(
    student_user_id: int,
    course_id: int,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Mark a course enrollment as completed."""
    return await update_course_enrollment(
        student_user_id,
        course_id,
        StudentCourseEnrollmentUpdate(status="completed"),
        session,
    )


# ---------------------------------------------------------------------------
# Lesson Progress
# ---------------------------------------------------------------------------

async def start_lesson_progress(
    student_user_id: int,
    course_id: int,
    module_id: int,
    lesson_id: int,
    session: AsyncSession = None,
) -> dict:
    """Create or update lesson progress when a student starts a lesson."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(StudentLessonProgress).where(
                and_(
                    StudentLessonProgress.student_user_id == student_user_id,
                    StudentLessonProgress.lesson_id == lesson_id,
                )
            )
        )
        progress = result.scalars().first()

        now = datetime.now(timezone.utc)

        if progress:
            # Update existing progress
            if progress.status == "not_started":
                progress.status = "in_progress"
                progress.started_at = now
            progress.last_accessed_at = now
            progress.visit_count = (progress.visit_count or 0) + 1
            await sess.commit()
            await sess.refresh(progress)
            return progress.to_dict()
        else:
            # Create new progress
            new_progress = StudentLessonProgress(
                student_user_id=student_user_id,
                course_id=course_id,
                module_id=module_id,
                lesson_id=lesson_id,
                status="in_progress",
                started_at=now,
                last_accessed_at=now,
                visit_count=1,
                time_spent_seconds=0,
                completion_percent=0.0,
            )
            sess.add(new_progress)
            await sess.commit()
            await sess.refresh(new_progress)
            return new_progress.to_dict()

    except Exception as e:
        await sess.rollback()
        logger.error("Error starting lesson progress: %s", e)
        raise
    finally:
        if close:
            await sess.close()


async def update_lesson_progress(
    student_user_id: int,
    lesson_id: int,
    updates: StudentLessonProgressUpdate,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Update lesson progress."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(StudentLessonProgress).where(
                and_(
                    StudentLessonProgress.student_user_id == student_user_id,
                    StudentLessonProgress.lesson_id == lesson_id,
                )
            )
        )
        progress = result.scalars().first()

        if not progress:
            return None

        # Update fields
        for field, value in updates.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(progress, field, value)

        progress.last_accessed_at = datetime.now(timezone.utc)

        # Auto-calculate mastery based on best_score
        if progress.best_score is not None:
            if progress.best_score >= 90:
                progress.mastery_level = "mastered"
            elif progress.best_score >= 75:
                progress.mastery_level = "proficient"
            elif progress.best_score >= 60:
                progress.mastery_level = "developing"
            else:
                progress.mastery_level = "beginner"

        await sess.commit()
        await sess.refresh(progress)
        return progress.to_dict()

    except Exception as e:
        await sess.rollback()
        logger.error("Error updating lesson progress: %s", e)
        raise
    finally:
        if close:
            await sess.close()


async def complete_lesson_progress(
    student_user_id: int,
    lesson_id: int,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Mark a lesson as completed."""
    return await update_lesson_progress(
        student_user_id,
        lesson_id,
        StudentLessonProgressUpdate(status="completed", completed_at=datetime.now(timezone.utc)),
        session,
    )


async def get_lesson_progress(
    student_user_id: int,
    lesson_id: int,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Get progress for a specific lesson."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(StudentLessonProgress).where(
                and_(
                    StudentLessonProgress.student_user_id == student_user_id,
                    StudentLessonProgress.lesson_id == lesson_id,
                )
            )
        )
        progress = result.scalars().first()
        return progress.to_dict() if progress else None
    finally:
        if close:
            await sess.close()


async def get_course_lesson_progress(
    student_user_id: int,
    course_id: int,
    session: AsyncSession = None,
) -> List[dict]:
    """Get all lesson progress for a student in a course."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(StudentLessonProgress).where(
                and_(
                    StudentLessonProgress.student_user_id == student_user_id,
                    StudentLessonProgress.course_id == course_id,
                )
            )
        )
        progress_list = result.scalars().all()
        return [p.to_dict() for p in progress_list]
    finally:
        if close:
            await sess.close()


async def update_lesson_time_spent(
    student_user_id: int,
    lesson_id: int,
    additional_seconds: int,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Increment time spent on a lesson."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(StudentLessonProgress).where(
                and_(
                    StudentLessonProgress.student_user_id == student_user_id,
                    StudentLessonProgress.lesson_id == lesson_id,
                )
            )
        )
        progress = result.scalars().first()

        if not progress:
            return None

        progress.time_spent_seconds = (progress.time_spent_seconds or 0) + additional_seconds
        progress.last_accessed_at = datetime.now(timezone.utc)

        await sess.commit()
        await sess.refresh(progress)
        return progress.to_dict()

    except Exception as e:
        await sess.rollback()
        logger.error("Error updating lesson time spent: %s", e)
        raise
    finally:
        if close:
            await sess.close()
