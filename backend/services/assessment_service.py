"""Assessment service — quiz/assignment attempts and scoring."""

import logging
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from database import async_session
from models.sql_models import (
    AssessmentAttempt,
    AssessmentAttemptAnswer,
    StudentLessonProgress,
)
from models.progress import (
    AssessmentAttemptCreate,
    AssessmentAttemptUpdate,
    AssessmentAttemptAnswerCreate,
)

logger = logging.getLogger(__name__)


async def _get_session_if_needed(session):
    """Return (session, should_close) tuple."""
    if session is not None:
        return session, False
    return async_session(), True


# ---------------------------------------------------------------------------
# Assessment Attempts
# ---------------------------------------------------------------------------

async def start_assessment_attempt(
    student_user_id: int,
    course_id: int,
    assessment_type: str,
    assessment_id: int,
    attempt_number: int,
    module_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    session: AsyncSession = None,
) -> dict:
    """Create a new assessment attempt (quiz or assignment)."""
    sess, close = await _get_session_if_needed(session)

    try:
        now = datetime.now(timezone.utc)
        new_attempt = AssessmentAttempt(
            student_user_id=student_user_id,
            course_id=course_id,
            module_id=module_id,
            lesson_id=lesson_id,
            assessment_type=assessment_type,
            assessment_id=assessment_id,
            attempt_number=attempt_number,
            status="started",
            started_at=now,
            time_spent_seconds=0,
        )
        sess.add(new_attempt)
        await sess.commit()
        await sess.refresh(new_attempt)
        return new_attempt.to_dict()

    except Exception as e:
        await sess.rollback()
        logger.error("Error starting assessment attempt: %s", e)
        raise
    finally:
        if close:
            await sess.close()


async def submit_assessment_attempt(
    attempt_id: int,
    raw_score: float,
    max_score: float,
    passed: bool,
    time_spent_seconds: int = 0,
    feedback_summary: Optional[str] = None,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Submit and score an assessment attempt."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
        )
        attempt = result.scalars().first()

        if not attempt:
            return None

        # Calculate percentage score
        percentage_score = (raw_score / max_score * 100) if max_score > 0 else 0

        attempt.status = "submitted"
        attempt.submitted_at = datetime.now(timezone.utc)
        attempt.raw_score = raw_score
        attempt.max_score = max_score
        attempt.percentage_score = percentage_score
        attempt.passed = passed
        attempt.time_spent_seconds = time_spent_seconds
        attempt.feedback_summary = feedback_summary
        attempt.grader_type = "auto"  # Default to auto-graded

        await sess.commit()
        await sess.refresh(attempt)
        return attempt.to_dict()

    except Exception as e:
        await sess.rollback()
        logger.error("Error submitting assessment attempt: %s", e)
        raise
    finally:
        if close:
            await sess.close()


async def grade_assessment_attempt(
    attempt_id: int,
    graded_by_user_id: int,
    grader_type: str,
    raw_score: Optional[float] = None,
    max_score: Optional[float] = None,
    passed: Optional[bool] = None,
    feedback_summary: Optional[str] = None,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Teacher or AI grading for an assessment attempt."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
        )
        attempt = result.scalars().first()

        if not attempt:
            return None

        # Update provided fields
        if raw_score is not None:
            attempt.raw_score = raw_score
        if max_score is not None:
            attempt.max_score = max_score
        if passed is not None:
            attempt.passed = passed

        # Recalculate percentage if both raw and max scores are provided
        if raw_score is not None and max_score is not None and max_score > 0:
            attempt.percentage_score = (raw_score / max_score * 100)

        attempt.status = "graded"
        attempt.graded_at = datetime.now(timezone.utc)
        attempt.grader_type = grader_type
        attempt.graded_by_user_id = graded_by_user_id
        if feedback_summary:
            attempt.feedback_summary = feedback_summary

        await sess.commit()
        await sess.refresh(attempt)
        return attempt.to_dict()

    except Exception as e:
        await sess.rollback()
        logger.error("Error grading assessment attempt: %s", e)
        raise
    finally:
        if close:
            await sess.close()


async def get_assessment_attempt(
    attempt_id: int,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Get a specific assessment attempt."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
        )
        attempt = result.scalars().first()
        return attempt.to_dict() if attempt else None
    finally:
        if close:
            await sess.close()


async def get_student_assessment_attempts(
    student_user_id: int,
    assessment_type: Optional[str] = None,
    assessment_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    session: AsyncSession = None,
) -> List[dict]:
    """Get assessment attempts for a student with optional filters."""
    sess, close = await _get_session_if_needed(session)

    try:
        query = select(AssessmentAttempt).where(
            AssessmentAttempt.student_user_id == student_user_id
        )

        if assessment_type:
            query = query.where(AssessmentAttempt.assessment_type == assessment_type)
        if assessment_id:
            query = query.where(AssessmentAttempt.assessment_id == assessment_id)
        if lesson_id:
            query = query.where(AssessmentAttempt.lesson_id == lesson_id)

        query = query.order_by(AssessmentAttempt.started_at.desc())

        result = await sess.execute(query)
        attempts = result.scalars().all()
        return [a.to_dict() for a in attempts]

    finally:
        if close:
            await sess.close()


async def get_best_assessment_attempt(
    student_user_id: int,
    assessment_type: str,
    assessment_id: int,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Get the best scoring attempt for a specific assessment."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(AssessmentAttempt)
            .where(
                and_(
                    AssessmentAttempt.student_user_id == student_user_id,
                    AssessmentAttempt.assessment_type == assessment_type,
                    AssessmentAttempt.assessment_id == assessment_id,
                    AssessmentAttempt.percentage_score.is_not(None),
                )
            )
            .order_by(AssessmentAttempt.percentage_score.desc())
            .limit(1)
        )
        attempt = result.scalars().first()
        return attempt.to_dict() if attempt else None
    finally:
        if close:
            await sess.close()


async def get_attempt_count(
    student_user_id: int,
    assessment_type: str,
    assessment_id: int,
    session: AsyncSession = None,
) -> int:
    """Get the number of attempts a student has made for an assessment."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(func.count())
            .select_from(AssessmentAttempt)
            .where(
                and_(
                    AssessmentAttempt.student_user_id == student_user_id,
                    AssessmentAttempt.assessment_type == assessment_type,
                    AssessmentAttempt.assessment_id == assessment_id,
                )
            )
        )
        count = result.scalar()
        return count or 0
    finally:
        if close:
            await sess.close()


# ---------------------------------------------------------------------------
# Assessment Attempt Answers (Question-level detail)
# ---------------------------------------------------------------------------

async def create_assessment_answer(
    attempt_id: int,
    question_id: int,
    question_type: str,
    prompt_snapshot: str,
    student_answer_text: Optional[str] = None,
    student_answer_json: Optional[dict] = None,
    correct_answer_json: Optional[dict] = None,
    is_correct: Optional[bool] = None,
    score_awarded: Optional[float] = None,
    max_score: Optional[float] = None,
    feedback: Optional[str] = None,
    session: AsyncSession = None,
) -> dict:
    """Create a question-level answer for an assessment attempt."""
    sess, close = await _get_session_if_needed(session)

    try:
        new_answer = AssessmentAttemptAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            question_type=question_type,
            prompt_snapshot=prompt_snapshot,
            student_answer_text=student_answer_text,
            student_answer_json=student_answer_json,
            correct_answer_json=correct_answer_json,
            is_correct=is_correct,
            score_awarded=score_awarded,
            max_score=max_score,
            feedback=feedback,
        )
        sess.add(new_answer)
        await sess.commit()
        await sess.refresh(new_answer)
        return new_answer.to_dict()

    except Exception as e:
        await sess.rollback()
        logger.error("Error creating assessment answer: %s", e)
        raise
    finally:
        if close:
            await sess.close()


async def get_assessment_answers(
    attempt_id: int,
    session: AsyncSession = None,
) -> List[dict]:
    """Get all question answers for an assessment attempt."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(AssessmentAttemptAnswer).where(
                AssessmentAttemptAnswer.attempt_id == attempt_id
            )
        )
        answers = result.scalars().all()
        return [a.to_dict() for a in answers]

    finally:
        if close:
            await sess.close()


async def update_lesson_best_score(
    student_user_id: int,
    lesson_id: int,
    assessment_type: str,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Update lesson progress with the best score from assessment attempts."""
    sess, close = await _get_session_if_needed(session)

    try:
        # Get the best attempt for this lesson
        result = await sess.execute(
            select(AssessmentAttempt)
            .where(
                and_(
                    AssessmentAttempt.student_user_id == student_user_id,
                    AssessmentAttempt.lesson_id == lesson_id,
                    AssessmentAttempt.assessment_type == assessment_type,
                    AssessmentAttempt.percentage_score.is_not(None),
                )
            )
            .order_by(AssessmentAttempt.percentage_score.desc())
            .limit(1)
        )
        best_attempt = result.scalars().first()

        if not best_attempt:
            return None

        # Update lesson progress with best score
        progress_result = await sess.execute(
            select(StudentLessonProgress).where(
                and_(
                    StudentLessonProgress.student_user_id == student_user_id,
                    StudentLessonProgress.lesson_id == lesson_id,
                )
            )
        )
        progress = progress_result.scalars().first()

        if not progress:
            return None

        if assessment_type == "quiz":
            progress.best_quiz_attempt_id = best_attempt.id
        elif assessment_type == "assignment":
            progress.best_assignment_submission_id = best_attempt.id

        progress.best_score = best_attempt.percentage_score
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
        logger.error("Error updating lesson best score: %s", e)
        raise
    finally:
        if close:
            await sess.close()
