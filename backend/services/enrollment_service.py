"""Enrollment service — create enrollments, check access."""

import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from pymongo.errors import DuplicateKeyError

from database import db
from utils.sanitizers import sanitize_id
from services.auth_service import decode_access_token


async def create_enrollment(username: str, plan_id: str, payment_id: str = ""):
    """Record an enrollment after payment verification.

    TODO: In production, verify payment_id with your payment gateway
    (Stripe/Razorpay) before creating the enrollment.
    """
    plan_id = sanitize_id(plan_id, "plan_id")

    plan = await db.pricing_plans.find_one({"id": plan_id, "is_active": True})
    if not plan:
        raise HTTPException(status_code=404, detail="Pricing plan not found")

    # TODO: Verify payment_id with payment gateway here
    if not payment_id:
        logging.warning(
            "Enrollment created without payment verification for user=%s plan=%s",
            username, plan_id,
        )

    now = datetime.now(timezone.utc).isoformat()
    enrollment = {
        "username": username,
        "plan_id": plan_id,
        "payment_id": payment_id or "",
        "enrolled_at": now,
        "is_active": True,
    }

    try:
        await db.enrollments.insert_one(enrollment)
    except DuplicateKeyError:
        return {"status": "already_enrolled", "plan_id": plan_id}
    except Exception as e:
        logging.error("Enrollment DB error: %s", e)
        raise HTTPException(status_code=500, detail="Enrollment failed")

    return {"status": "enrolled", "plan_id": plan_id, "enrolled_at": now}


async def check_enrollment(username: str, plan_id: str) -> bool:
    """Check if a user is enrolled in a specific plan."""
    plan_id = sanitize_id(plan_id, "plan_id")
    enrollment = await db.enrollments.find_one(
        {"username": username, "plan_id": plan_id, "is_active": True},
        {"_id": 0},
    )
    return enrollment is not None


async def get_user_enrollments(username: str) -> list:
    """List all active enrollments for a user."""
    return await db.enrollments.find(
        {"username": username, "is_active": True},
        {"_id": 0, "username": 0},
    ).to_list(50)


async def get_course_access(tool_id: str, authorization: str = None) -> dict:
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
