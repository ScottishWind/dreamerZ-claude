"""Assessment routes — quiz/assignment attempts and scoring."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.progress import (
    AssessmentAttemptCreate,
    AssessmentAttemptUpdate,
)
from services.assessment_service import (
    start_assessment_attempt,
    submit_assessment_attempt,
    grade_assessment_attempt,
    get_assessment_attempt,
    get_student_assessment_attempts,
    get_best_assessment_attempt,
    get_attempt_count,
    create_assessment_answer,
    get_assessment_answers,
    update_lesson_best_score,
)
from services.auth_service import get_current_user

router = APIRouter(prefix="/assessments", tags=["assessments"])


# ---------------------------------------------------------------------------
# Assessment Attempts
# ---------------------------------------------------------------------------

@router.post("/start")
async def start_assessment(
    payload: AssessmentAttemptCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Start a new assessment attempt (quiz or assignment)."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        attempt = await start_assessment_attempt(
            student_user_id=user_id,
            course_id=payload.course_id,
            assessment_type=payload.assessment_type,
            assessment_id=payload.assessment_id,
            attempt_number=payload.attempt_number,
            module_id=payload.module_id,
            lesson_id=payload.lesson_id,
            session=session,
        )
        return attempt
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attempts/{attempt_id}/submit")
async def submit_assessment(
    attempt_id: int,
    raw_score: float,
    max_score: float,
    passed: bool,
    time_spent_seconds: int = 0,
    feedback_summary: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Submit and auto-grade an assessment attempt."""
    try:
        attempt = await submit_assessment_attempt(
            attempt_id=attempt_id,
            raw_score=raw_score,
            max_score=max_score,
            passed=passed,
            time_spent_seconds=time_spent_seconds,
            feedback_summary=feedback_summary,
            session=session,
        )
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")

        # Update lesson progress with best score if this is a lesson-linked assessment
        if attempt["lesson_id"]:
            await update_lesson_best_score(
                student_user_id=attempt["student_user_id"],
                lesson_id=attempt["lesson_id"],
                assessment_type=attempt["assessment_type"],
                session=session,
            )

        return attempt
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attempts/{attempt_id}/grade")
async def grade_assessment(
    attempt_id: int,
    graded_by_user_id: int,
    grader_type: str,
    raw_score: Optional[float] = None,
    max_score: Optional[float] = None,
    passed: Optional[bool] = None,
    feedback_summary: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Teacher or AI grading for an assessment attempt."""
    try:
        attempt = await grade_assessment_attempt(
            attempt_id=attempt_id,
            graded_by_user_id=graded_by_user_id,
            grader_type=grader_type,
            raw_score=raw_score,
            max_score=max_score,
            passed=passed,
            feedback_summary=feedback_summary,
            session=session,
        )
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")

        # Update lesson progress with best score if this is a lesson-linked assessment
        if attempt["lesson_id"]:
            await update_lesson_best_score(
                student_user_id=attempt["student_user_id"],
                lesson_id=attempt["lesson_id"],
                assessment_type=attempt["assessment_type"],
                session=session,
            )

        return attempt
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attempts/{attempt_id}")
async def get_attempt(
    attempt_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get a specific assessment attempt."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        attempt = await get_assessment_attempt(attempt_id, session)
        if not attempt:
            raise HTTPException(status_code=404, detail="Attempt not found")

        # Verify user owns this attempt or is admin
        if attempt["student_user_id"] != user_id and not current_user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Access denied")

        return attempt
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attempts")
async def list_attempts(
    assessment_type: Optional[str] = None,
    assessment_id: Optional[int] = None,
    lesson_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get assessment attempts for the current user with optional filters."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        attempts = await get_student_assessment_attempts(
            student_user_id=user_id,
            assessment_type=assessment_type,
            assessment_id=assessment_id,
            lesson_id=lesson_id,
            session=session,
        )
        return attempts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/best")
async def get_best_attempt(
    assessment_type: str,
    assessment_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get the best scoring attempt for a specific assessment."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        attempt = await get_best_assessment_attempt(
            student_user_id=user_id,
            assessment_type=assessment_type,
            assessment_id=assessment_id,
            session=session,
        )
        if not attempt:
            return None
        return attempt
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attempts/count")
async def get_attempts_count(
    assessment_type: str,
    assessment_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get the number of attempts made for an assessment."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        count = await get_attempt_count(
            student_user_id=user_id,
            assessment_type=assessment_type,
            assessment_id=assessment_id,
            session=session,
        )
        return {"count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Assessment Answers (Question-level detail)
# ---------------------------------------------------------------------------

@router.post("/answers")
async def create_answer(
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
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Create a question-level answer for an assessment attempt."""
    try:
        answer = await create_assessment_answer(
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
            session=session,
        )
        return answer
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/attempts/{attempt_id}/answers")
async def list_answers(
    attempt_id: int,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get all question answers for an assessment attempt."""
    try:
        from sqlalchemy import select
        from models.sql_models import User

        result = await session.execute(
            select(User.id).where(User.username == current_user["username"])
        )
        user_id = result.scalar()
        if not user_id:
            raise HTTPException(status_code=404, detail="User not found")

        answers = await get_assessment_answers(attempt_id, session)
        return answers
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
