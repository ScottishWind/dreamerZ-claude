"""Enrollment service — create enrollments, check access."""

import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from database import async_session
from models.sql_models import Enrollment, PricingPlan, User
from utils.sanitizers import sanitize_id
from services.auth_service import decode_access_token


async def _get_session_if_needed(session):
    """Return (session, should_close) tuple."""
    if session is not None:
        return session, False
    return async_session(), True


async def create_enrollment(username: str, plan_id: str, payment_id: str = "", session: AsyncSession = None):
    """Record an enrollment after payment verification.

    TODO: In production, verify payment_id with your payment gateway
    (Stripe/Razorpay) before creating the enrollment.
    """
    plan_id = sanitize_id(plan_id, "plan_id")
    sess, close = await _get_session_if_needed(session)

    try:
        # Look up pricing plan by slug
        result = await sess.execute(
            select(PricingPlan).where(PricingPlan.slug == plan_id, PricingPlan.is_active == True)
        )
        plan = result.scalars().first()
        if not plan:
            raise HTTPException(status_code=404, detail="Pricing plan not found")

        # Look up user by username
        result = await sess.execute(
            select(User).where(User.username == username)
        )
        user = result.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # TODO: Verify payment_id with payment gateway here
        if not payment_id:
            logging.warning(
                "Enrollment created without payment verification for user=%s plan=%s",
                username, plan_id,
            )

        now = datetime.now(timezone.utc)
        enrollment = Enrollment(
            user_id=user.id,
            plan_id=plan.id,
            payment_id=payment_id or "",
            enrolled_at=now,
            is_active=True,
        )

        try:
            sess.add(enrollment)
            await sess.commit()
        except IntegrityError:
            await sess.rollback()
            return {"status": "already_enrolled", "plan_id": plan_id}
        except Exception as e:
            await sess.rollback()
            logging.error("Enrollment DB error: %s", e)
            raise HTTPException(status_code=500, detail="Enrollment failed")

        return {"status": "enrolled", "plan_id": plan_id, "enrolled_at": now.isoformat()}
    finally:
        if close:
            await sess.close()


async def check_enrollment(username: str, plan_id: str, session: AsyncSession = None) -> bool:
    """Check if a user is enrolled in a specific plan."""
    plan_id = sanitize_id(plan_id, "plan_id")
    sess, close = await _get_session_if_needed(session)

    try:
        # Resolve user and plan to get their IDs
        user_result = await sess.execute(
            select(User.id).where(User.username == username)
        )
        user_row = user_result.scalars().first()
        if not user_row:
            return False

        plan_result = await sess.execute(
            select(PricingPlan.id).where(PricingPlan.slug == plan_id)
        )
        plan_row = plan_result.scalars().first()
        if not plan_row:
            return False

        result = await sess.execute(
            select(Enrollment).where(
                Enrollment.user_id == user_row,
                Enrollment.plan_id == plan_row,
                Enrollment.is_active == True,
            )
        )
        return result.scalars().first() is not None
    finally:
        if close:
            await sess.close()


async def get_user_enrollments(username: str, session: AsyncSession = None) -> list:
    """List all active enrollments for a user."""
    sess, close = await _get_session_if_needed(session)

    try:
        user_result = await sess.execute(
            select(User.id).where(User.username == username)
        )
        user_id = user_result.scalars().first()
        if not user_id:
            return []

        result = await sess.execute(
            select(Enrollment, PricingPlan.slug).join(
                PricingPlan, Enrollment.plan_id == PricingPlan.id, isouter=True
            ).where(
                Enrollment.user_id == user_id,
                Enrollment.is_active == True,
            )
        )
        rows = result.all()

        enrollments = []
        for enrollment, plan_slug in rows:
            enrollments.append({
                "plan_id": plan_slug or "",
                "payment_id": enrollment.payment_id or "",
                "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
                "is_active": enrollment.is_active,
            })
        return enrollments
    finally:
        if close:
            await sess.close()


async def get_course_access(tool_id: str, authorization: str = None, session: AsyncSession = None) -> dict:
    """Return access info for a tool. All courses are now free — always return enrolled=True."""
    from config import TOOL_TO_PLAN, COURSE_PREVIEW_VIDEOS

    tool_id = sanitize_id(tool_id, "tool_id")
    plan_id = TOOL_TO_PLAN.get(tool_id)
    video_url = COURSE_PREVIEW_VIDEOS.get(tool_id, "")

    return {
        "tool_id": tool_id,
        "plan_id": plan_id,
        "enrolled": True,
        "free_module_count": 999,
        "preview_video_url": video_url,
        "pricing": None,
    }
