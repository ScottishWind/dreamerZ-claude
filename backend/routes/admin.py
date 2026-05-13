"""Admin routes — user management, content management, media uploads (admin-only).

Migrated to 4-level hierarchy: Category → Course → Module → Lesson.
"""

import logging
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import select, func, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import ADMIN_EMAILS
from database import get_db
from models.sql_models import (
    User, Course, Module, Lesson, LessonContent, Quiz, QuizQuestion,
    MediaAsset, Category, PricingPlan, FAQ, StudentCourseEnrollment, SupervisorAssignment,
)
from models.user import AdminUserResponse, RoleUpdate, AIFeatureUpdate
from services.auth_service import get_current_admin, get_current_creator, get_current_supervisor, has_role, require_ai_generation_enabled
from services import media_service
from services import translation_service

# Admin-only router for user management and overview
admin_router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])

# Creator+Admin router for course management
content_router = APIRouter(prefix="/admin", tags=["content"], dependencies=[Depends(get_current_creator)])

# Supervisor+Admin router for supervisor features
supervisor_router = APIRouter(prefix="/admin", tags=["supervisor"], dependencies=[Depends(get_current_supervisor)])


async def _ensure_lesson_editable(session: "AsyncSession", lesson: "Lesson") -> None:
    """Raise 403 if a lesson belongs to a published course.

    Edits to published courses are not allowed; users must create a draft
    version first and modify the draft instead.
    """
    if not lesson or not lesson.module_id:
        return
    mod_result = await session.execute(select(Module).where(Module.id == lesson.module_id))
    module = mod_result.scalars().first()
    if not module or not module.course_id:
        return
    course_result = await session.execute(select(Course).where(Course.id == module.course_id))
    course = course_result.scalars().first()
    if course and course.status == "published":
        raise HTTPException(
            status_code=403,
            detail="This lesson belongs to a published course and is read-only. Create a draft version to make changes.",
        )


# ── Pydantic Models ──────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


class CourseCreate(BaseModel):
    name: str
    description: str
    # Accept either the integer primary key or the slug string
    category_id: int | str
    difficulty: Optional[str] = "beginner"
    tags: Optional[list[str]] = None
    passing_score: Optional[int] = 70


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    difficulty: Optional[str] = None
    status: Optional[str] = None


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    level: Optional[str] = None
    estimated_minutes: Optional[int] = None
    explanation: Optional[str] = None
    example: Optional[str] = None
    activity: Optional[str] = None


class AssetAttach(BaseModel):
    lesson_id: str


class TranslateRequest(BaseModel):
    target_language: str = "bn"


class ToolModuleUpdate(BaseModel):
    """Update payload for legacy PUT /tools/{tool_id}/modules/{module_id}."""
    title: Optional[str] = None
    level: Optional[str] = None
    estimated_minutes: Optional[int] = None
    explanation: Optional[str] = None
    example: Optional[str] = None
    activity: Optional[str] = None


class QuizQuestionPayload(BaseModel):
    """One quiz question, supporting multiple types.

    type:
      - "mcq"          : single-answer multiple choice (correctAnswer = int index)
      - "multi-select" : checkbox multiple choice (correctAnswers = [int, ...])
      - "true-false"   : correctAnswer = bool
      - "short-answer" : descriptive (correctAnswer = string)
    """
    id: Optional[str] = None
    type: str = "mcq"
    question: str = ""
    options: Optional[list[str]] = None
    correctAnswer: Optional[object] = None
    correctAnswers: Optional[list[int]] = None
    explanation: Optional[str] = ""
    image_asset_id: Optional[int | str] = None
    image_url: Optional[str] = None


class QuizUpdate(BaseModel):
    questions: list[QuizQuestionPayload] = []
    passing_score: Optional[int] = None
    title: Optional[str] = None


class LessonCreatePayload(BaseModel):
    title: str
    description: Optional[str] = None
    level: Optional[str] = "beginner"
    estimated_minutes: Optional[int] = 10


class SectionCreatePayload(BaseModel):
    title: str
    description: Optional[str] = None


class SectionUpdatePayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None


class LessonContentUpdatePayload(BaseModel):
    explanation: Optional[str] = None
    example: Optional[str] = None
    activity: Optional[str] = None
    bengali_tip: Optional[str] = None
    micro_grammar: Optional[str] = None
    speaking_task: Optional[str] = None
    vocab: Optional[dict] = None
    dialogue: Optional[dict] = None


class LessonRegeneratePayload(BaseModel):
    instructions: Optional[str] = None
    source_text: Optional[str] = None


# ══════════════════════════════════════════════════════════
# CATEGORIES
# ══════════════════════════════════════════════════════════

@content_router.post("/categories")
async def create_category(
    payload: CategoryCreate,
    session: AsyncSession = Depends(get_db),
):
    """Create a new category. Auto-generates slug from name."""
    slug = re.sub(r"[^a-z0-9]+", "-", payload.name.lower()).strip("-")
    if not slug:
        raise HTTPException(status_code=400, detail="Invalid category name")

    # Check if already exists
    result = await session.execute(select(Category).where(Category.slug == slug))
    existing = result.scalars().first()
    if existing:
        return existing.to_dict()

    cat = Category(
        slug=slug,
        name=payload.name,
        description=payload.description or "",
    )
    session.add(cat)
    await session.commit()
    await session.refresh(cat)
    return cat.to_dict()


@content_router.get("/categories")
async def list_categories(session: AsyncSession = Depends(get_db)):
    """List all categories (admin view)."""
    result = await session.execute(
        select(Category).order_by(Category.sort_order)
    )
    return [c.to_dict() for c in result.scalars().all()]


@content_router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Delete a category. Refuses if any courses are still attached.

    `category_id` may be either the integer primary key or the slug.
    """
    if category_id.isdigit():
        stmt = select(Category).where(Category.id == int(category_id))
    else:
        stmt = select(Category).where(Category.slug == category_id)
    result = await session.execute(stmt)
    category = result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Refuse if any courses still reference this category
    course_count = await session.execute(
        select(func.count(Course.id)).where(Course.category_id == category.id)
    )
    n_courses = course_count.scalar_one()
    if n_courses > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Category has {n_courses} course(s). Delete or move them first.",
        )

    await session.delete(category)
    await session.commit()
    return {"detail": f"Category '{category.slug}' deleted"}


# ══════════════════════════════════════════════════════════
# USER MANAGEMENT
# ══════════════════════════════════════════════════════════

@admin_router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    search: Optional[str] = Query(None, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
):
    """List all registered users with optional search."""
    stmt = select(User)
    if search:
        search = search.strip()
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                User.username.ilike(pattern),
                User.email.ilike(pattern),
            )
        )
    stmt = stmt.order_by(User.created_at.desc()).offset(skip).limit(limit)
    result = await session.execute(stmt)
    users = result.scalars().all()

    # Build a mapping of learner_id -> [supervisor usernames] for learners in this page
    learner_ids = [u.id for u in users if (u.role or "learner") == "learner"]
    supervisors_map: dict[int, list[str]] = {}
    if learner_ids:
        assignment_result = await session.execute(
            select(SupervisorAssignment, User)
            .join(User, SupervisorAssignment.supervisor_user_id == User.id)
            .where(SupervisorAssignment.learner_user_id.in_(learner_ids))
        )
        for assignment, supervisor_user in assignment_result.all():
            supervisors_map.setdefault(assignment.learner_user_id, []).append(
                supervisor_user.username
            )

    out = []
    for u in users:
        email = (u.email or "").lower()
        is_super = email in ADMIN_EMAILS
        out.append({
            "username": u.username,
            "email": u.email,
            "created_at": u.created_at.isoformat() if u.created_at else "",
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "is_super_admin": is_super,
            "is_active": u.is_active,
            "role": u.role or "learner",
            "ai_generation_enabled": u.ai_generation_enabled or False,
            "preferred_language": u.preferred_language or "en",
            "supervisors": supervisors_map.get(u.id, []),
        })
    return out


@admin_router.get("/users/count")
async def user_count(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(func.count(User.id)))
    total = result.scalar_one()
    return {"total": total}


@admin_router.put("/users/{username}/role")
async def update_user_role(
    username: str,
    body: RoleUpdate,
    current_admin: dict = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db),
):
    """Change a user's role (learner/creator/supervisor/admin)."""
    caller_email = current_admin.get("email", "").lower()

    username = username.strip().lower()
    result = await session.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-demotion
    if user.email == caller_email:
        raise HTTPException(
            status_code=403,
            detail="You cannot change your own role",
        )

    user_email = (user.email or "").lower()
    if user_email in ADMIN_EMAILS and body.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Cannot change role of a super-admin (remove from ADMIN_EMAILS env var instead)",
        )

    user.role = body.role
    user.updated_at = datetime.now(timezone.utc)
    await session.commit()

    return {"detail": f"User '{username}' role changed to '{body.role}'"}


@admin_router.put("/users/{username}/ai-generation")
async def update_user_ai_generation(
    username: str,
    body: AIFeatureUpdate,
    current_admin: dict = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db),
):
    """Enable or disable AI course generation for a creator."""
    username = username.strip().lower()
    result = await session.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.ai_generation_enabled = body.enabled
    user.updated_at = datetime.now(timezone.utc)
    await session.commit()

    return {"detail": f"AI generation {'enabled' if body.enabled else 'disabled'} for user '{username}'"}


@admin_router.put("/users/{username}/active")
async def update_user_active(
    username: str,
    body: AIFeatureUpdate,  # Reuse AIFeatureUpdate for enabled field
    current_admin: dict = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db),
):
    """Enable or disable a user account."""
    username = username.strip().lower()
    result = await session.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = body.enabled
    user.updated_at = datetime.now(timezone.utc)
    await session.commit()

    return {"detail": f"User account {'enabled' if body.enabled else 'disabled'} for '{username}'"}


# ── Supervisor Management Routes ─────────────────────────────────

@supervisor_router.get("/supervisor/learners")
async def get_supervisor_learners(
    current_user: dict = Depends(get_current_supervisor),
    session: AsyncSession = Depends(get_db),
):
    """Get list of learners assigned to current supervisor (or all for admin)."""
    # If admin, return all assignments; if supervisor, return only theirs
    if has_role(current_user, "admin"):
        # Admin sees all assignments
        result = await session.execute(
            select(SupervisorAssignment, User)
            .join(User, SupervisorAssignment.learner_user_id == User.id)
        )
    else:
        # Supervisor sees only their assignments
        supervisor_result = await session.execute(
            select(User).where(User.username == current_user["username"].lower())
        )
        supervisor = supervisor_result.scalars().first()
        if not supervisor:
            return []

        result = await session.execute(
            select(SupervisorAssignment, User)
            .join(User, SupervisorAssignment.learner_user_id == User.id)
            .where(SupervisorAssignment.supervisor_user_id == supervisor.id)
        )

    assignments = result.all()

    # Dedupe by learner_id so a learner with multiple supervisors only
    # appears once (admins would otherwise see duplicate cards).
    seen: set[int] = set()
    out: list[dict] = []
    for assignment, learner in assignments:
        if learner.id in seen:
            continue
        seen.add(learner.id)
        out.append({
            "assignment_id": assignment.id,
            "learner_id": learner.id,
            "learner_username": learner.username,
            "learner_email": learner.email,
            "learner_role": learner.role,
            "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
        })
    return out


class SupervisorSelfLinkPayload(BaseModel):
    """Body for POST /supervisor/me/learners — the supervisor identifies the
    learner they want to track by username OR email."""
    learner_identifier: str


@supervisor_router.post("/supervisor/me/learners")
async def supervisor_self_link_learner(
    body: SupervisorSelfLinkPayload,
    current_user: dict = Depends(get_current_supervisor),
    session: AsyncSession = Depends(get_db),
):
    """Let a supervisor link a learner to themselves by username or email.

    Mirrors the existing admin-only POST .../supervisor/<user>/learners/<user>
    but is callable by the supervisor for their own assignments. Admins can
    still call this — they're effectively a super-supervisor.
    """
    identifier = (body.learner_identifier or "").strip().lower()
    if not identifier:
        raise HTTPException(status_code=400, detail="Learner username or email is required.")

    # Resolve current user (the supervisor making the request)
    sup_result = await session.execute(
        select(User).where(User.username == current_user["username"].lower())
    )
    supervisor = sup_result.scalars().first()
    if not supervisor:
        raise HTTPException(status_code=404, detail="Supervisor user not found.")

    # Find learner by username or email
    learner_result = await session.execute(
        select(User).where(or_(User.username == identifier, User.email == identifier))
    )
    learner = learner_result.scalars().first()
    if not learner:
        raise HTTPException(status_code=404, detail="Learner account not found.")

    if learner.id == supervisor.id:
        raise HTTPException(status_code=400, detail="You cannot link your own account as a learner.")

    # Idempotent: if assignment already exists, just return it
    existing_result = await session.execute(
        select(SupervisorAssignment).where(
            SupervisorAssignment.supervisor_user_id == supervisor.id,
            SupervisorAssignment.learner_user_id == learner.id,
        )
    )
    existing = existing_result.scalars().first()
    if existing:
        return {
            "assignment_id": existing.id,
            "learner_id": learner.id,
            "learner_username": learner.username,
            "learner_email": learner.email,
            "learner_role": learner.role,
            "created_at": existing.created_at.isoformat() if existing.created_at else None,
            "already_linked": True,
        }

    assignment = SupervisorAssignment(
        supervisor_user_id=supervisor.id,
        learner_user_id=learner.id,
    )
    session.add(assignment)
    await session.commit()
    await session.refresh(assignment)

    return {
        "assignment_id": assignment.id,
        "learner_id": learner.id,
        "learner_username": learner.username,
        "learner_email": learner.email,
        "learner_role": learner.role,
        "created_at": assignment.created_at.isoformat() if assignment.created_at else None,
        "already_linked": False,
    }


@admin_router.post("/supervisor/{supervisor_username}/learners/{learner_username}")
async def assign_learner_to_supervisor(
    supervisor_username: str,
    learner_username: str,
    current_admin: dict = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db),
):
    """Assign a learner to a supervisor (admin only)."""
    supervisor_username = supervisor_username.strip().lower()
    learner_username = learner_username.strip().lower()
    
    # Get supervisor
    supervisor_result = await session.execute(
        select(User).where(User.username == supervisor_username)
    )
    supervisor = supervisor_result.scalars().first()
    if not supervisor:
        raise HTTPException(status_code=404, detail="Supervisor not found")
    
    if supervisor.role != "supervisor" and not (supervisor.email or "").lower() in ADMIN_EMAILS:
        raise HTTPException(status_code=400, detail="User is not a supervisor")
    
    # Get learner
    learner_result = await session.execute(
        select(User).where(User.username == learner_username)
    )
    learner = learner_result.scalars().first()
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found")
    
    # Check if assignment already exists
    existing_result = await session.execute(
        select(SupervisorAssignment).where(
            SupervisorAssignment.supervisor_user_id == supervisor.id,
            SupervisorAssignment.learner_user_id == learner.id
        )
    )
    if existing_result.scalars().first():
        raise HTTPException(status_code=400, detail="Assignment already exists")
    
    # Create assignment
    assignment = SupervisorAssignment(
        supervisor_user_id=supervisor.id,
        learner_user_id=learner.id
    )
    session.add(assignment)
    await session.commit()
    
    return {"detail": f"Learner '{learner_username}' assigned to supervisor '{supervisor_username}'"}


@admin_router.delete("/supervisor/{supervisor_username}/learners/{learner_username}")
async def remove_learner_from_supervisor(
    supervisor_username: str,
    learner_username: str,
    current_admin: dict = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db),
):
    """Remove a learner from a supervisor (admin only)."""
    supervisor_username = supervisor_username.strip().lower()
    learner_username = learner_username.strip().lower()
    
    # Get supervisor
    supervisor_result = await session.execute(
        select(User).where(User.username == supervisor_username)
    )
    supervisor = supervisor_result.scalars().first()
    if not supervisor:
        raise HTTPException(status_code=404, detail="Supervisor not found")
    
    # Get learner
    learner_result = await session.execute(
        select(User).where(User.username == learner_username)
    )
    learner = learner_result.scalars().first()
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found")
    
    # Delete assignment
    delete_result = await session.execute(
        select(SupervisorAssignment).where(
            SupervisorAssignment.supervisor_user_id == supervisor.id,
            SupervisorAssignment.learner_user_id == learner.id
        )
    )
    assignment = delete_result.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    await session.delete(assignment)
    await session.commit()
    
    return {"detail": f"Learner '{learner_username}' removed from supervisor '{supervisor_username}'"}


@supervisor_router.get("/supervisor/learners/{learner_id}/progress")
async def get_learner_progress(
    learner_id: int,
    current_user: dict = Depends(get_current_supervisor),
    session: AsyncSession = Depends(get_db),
):
    """Get progress overview for a supervised learner.

    Returns the same shape as the parent dashboard overview so the
    frontend Student/Learner card can render consistently.
    """
    # Verify assignment exists (admins bypass assignment check)
    if not has_role(current_user, "admin"):
        supervisor_result = await session.execute(
            select(User).where(User.username == current_user["username"].lower())
        )
        supervisor = supervisor_result.scalars().first()
        if not supervisor:
            raise HTTPException(status_code=403, detail="Invalid supervisor")

        assignment_result = await session.execute(
            select(SupervisorAssignment).where(
                SupervisorAssignment.supervisor_user_id == supervisor.id,
                SupervisorAssignment.learner_user_id == learner_id,
            )
        )
        if not assignment_result.scalars().first():
            raise HTTPException(status_code=403, detail="Learner not assigned to you")

    # Reuse the same progress service used by the parent overview so the
    # response shape matches what the frontend expects.
    from services.progress_service import get_student_course_enrollments

    learner_result = await session.execute(select(User).where(User.id == learner_id))
    learner = learner_result.scalars().first()
    if not learner:
        raise HTTPException(status_code=404, detail="Learner not found")

    enrollments = await get_student_course_enrollments(learner_id, session)

    total_courses = len(enrollments)
    completed_courses = sum(1 for e in enrollments if e.get("status") == "completed")
    in_progress_courses = sum(1 for e in enrollments if e.get("status") == "in_progress")
    total_time_spent = sum(e.get("total_time_spent_seconds", 0) for e in enrollments)

    return {
        "student": {
            "id": learner.id,
            "username": learner.username,
            "email": learner.email,
            "created_at": learner.created_at.isoformat() if learner.created_at else None,
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


@admin_router.delete("/users/{username}")
async def delete_user(
    username: str,
    session: AsyncSession = Depends(get_db),
):
    username = username.strip().lower()
    result = await session.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if (user.email or "").lower() in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Cannot delete an admin account")

    # Delete user (cascade handles the rest)
    await session.delete(user)
    await session.commit()

    return {"detail": f"User '{username}' deleted successfully"}


# ══════════════════════════════════════════════════════════
# LEGACY CONTENT MANAGEMENT (tools/modules — kept for compatibility)
# ══════════════════════════════════════════════════════════

@content_router.get("/tools")
async def admin_list_tools(session: AsyncSession = Depends(get_db)):
    """List courses with lesson counts (legacy 'tools' endpoint)."""
    stmt = (
        select(
            Course,
            func.count(Lesson.id).label("module_count"),
        )
        .outerjoin(Module, Module.course_id == Course.id)
        .outerjoin(Lesson, Lesson.module_id == Module.id)
        .options(selectinload(Course.category))
        .group_by(Course.id)
        .order_by(Course.sort_order)
    )
    result = await session.execute(stmt)
    rows = result.all()

    out = []
    for course, lesson_count in rows:
        d = course.to_dict()
        d["id"] = course.slug  # frontend expects 'id' = slug
        d["module_count"] = lesson_count
        out.append(d)
    return out


@content_router.get("/tools/{tool_id}")
async def admin_get_tool(
    tool_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Get single course by slug, with its lessons (flattened from modules)."""
    result = await session.execute(
        select(Course).where(Course.slug == tool_id)
    )
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Tool not found")

    # Fetch lessons through modules
    lesson_result = await session.execute(
        select(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .where(Module.course_id == course.id)
        .order_by(Lesson.week.nulls_last(), Lesson.day.nulls_last(), Lesson.sort_order)
    )
    lessons = lesson_result.scalars().all()

    d = course.to_dict()
    d["id"] = course.slug
    d["modules"] = []  # legacy name for lessons within a tool
    for les in lessons:
        ld = les.to_dict()
        ld["id"] = les.slug
        d["modules"].append(ld)
    return d


@content_router.put("/tools/{tool_id}/modules/{module_id}")
async def update_tool_module(
    tool_id: str,
    module_id: str,
    update: ToolModuleUpdate,
    session: AsyncSession = Depends(get_db),
):
    """Update lesson content. tool_id is Course slug, module_id is Lesson slug."""
    # Verify the course exists
    result = await session.execute(select(Course).where(Course.slug == tool_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Tool not found")

    # Find the lesson by slug within this course's modules
    result = await session.execute(
        select(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .where(Lesson.slug == module_id, Module.course_id == course.id)
    )
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Module (lesson) not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Split: lesson-level fields vs content fields
    lesson_fields = {"title", "level", "estimated_minutes"}
    content_fields = {"explanation", "example", "activity"}

    changed_lesson = {k: v for k, v in update_data.items() if k in lesson_fields}
    changed_content = {k: v for k, v in update_data.items() if k in content_fields}

    if changed_lesson:
        for k, v in changed_lesson.items():
            setattr(lesson, k, v)
        lesson.updated_at = datetime.now(timezone.utc)

    if changed_content:
        lc_result = await session.execute(
            select(LessonContent).where(
                LessonContent.lesson_id == lesson.id,
                LessonContent.language == "en",
            )
        )
        lc = lc_result.scalars().first()
        if lc:
            for k, v in changed_content.items():
                setattr(lc, k, v)
            lc.updated_at = datetime.now(timezone.utc)
        else:
            lc = LessonContent(
                lesson_id=lesson.id,
                language="en",
                **changed_content,
            )
            session.add(lc)

    await session.commit()
    return {"detail": f"Module '{module_id}' updated", **update_data}


# ══════════════════════════════════════════════════════════
# LMS — COURSES
# ══════════════════════════════════════════════════════════

@content_router.post("/courses")
async def create_course(
    payload: CourseCreate,
    current_user: dict = Depends(get_current_creator),
    session: AsyncSession = Depends(get_db),
):
    """Create a new course in draft status (manual course creation flow)."""
    import uuid
    import re

    # Validate category exists (accept either int id or slug string)
    cat_lookup = payload.category_id
    if isinstance(cat_lookup, int) or (isinstance(cat_lookup, str) and cat_lookup.isdigit()):
        cat_stmt = select(Category).where(Category.id == int(cat_lookup))
    else:
        cat_stmt = select(Category).where(Category.slug == cat_lookup)
    cat_result = await session.execute(cat_stmt)
    category = cat_result.scalars().first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Generate slug from name
    base_slug = re.sub(r"[^a-z0-9]+", "-", payload.name.lower()).strip("-") or f"course-{uuid.uuid4().hex[:8]}"
    slug = base_slug
    # Handle slug collision by appending random suffix
    existing = await session.execute(select(Course).where(Course.slug == slug))
    if existing.scalars().first():
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

    course = Course(
        category_id=category.id,
        slug=slug,
        name=payload.name,
        description=payload.description,
        difficulty=payload.difficulty or "beginner",
        status="draft",
        available_languages=["en"],
        tags={"tags": payload.tags} if payload.tags else None,
        created_by=current_user.get("username"),
    )
    session.add(course)
    await session.commit()
    await session.refresh(course)

    # Return in same shape as GET /api/admin/courses/{id}
    d = course.to_dict()
    d["id"] = course.slug
    return d


@content_router.get("/courses")
async def list_courses(
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """List all LMS courses with lesson counts."""
    stmt = (
        select(
            Course,
            func.count(Lesson.id).label("lesson_count"),
        )
        .outerjoin(Module, Module.course_id == Course.id)
        .outerjoin(Lesson, Lesson.module_id == Module.id)
        .options(selectinload(Course.category))
        .group_by(Course.id)
    )
    if status:
        stmt = stmt.where(Course.status == status)
    stmt = stmt.order_by(Course.created_at.desc())

    result = await session.execute(stmt)
    rows = result.all()

    out = []
    for course, lesson_count in rows:
        d = course.to_dict()
        d["id"] = course.slug
        d["lesson_count"] = lesson_count
        out.append(d)
    return out


@content_router.get("/courses/{course_id}")
async def get_course(
    course_id: str,
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(select(Course).where(Course.slug == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    d = course.to_dict()
    d["id"] = course.slug
    # Include draft_slug if the course has a draft version
    if course.draft_version_id:
        draft_result = await session.execute(select(Course).where(Course.id == course.draft_version_id))
        draft = draft_result.scalars().first()
        if draft:
            d["draft_slug"] = draft.slug
    return d


@content_router.put("/courses/{course_id}")
async def update_course(
    course_id: str,
    update: CourseUpdate,
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(select(Course).where(Course.slug == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # category_id might come as a slug string from the frontend
    if "category_id" in update_data:
        cat_slug = update_data.pop("category_id")
        cat_result = await session.execute(
            select(Category).where(Category.slug == cat_slug)
        )
        cat = cat_result.scalars().first()
        if cat:
            course.category_id = cat.id

    for k, v in update_data.items():
        if hasattr(course, k):
            setattr(course, k, v)
    course.updated_at = datetime.now(timezone.utc)

    await session.commit()
    return {"detail": f"Course '{course_id}' updated", **update.model_dump(exclude_none=True)}


@content_router.post("/courses/{course_id}/create-draft")
async def create_draft_version(
    course_id: str,
    current_user: dict = Depends(get_current_creator),
    session: AsyncSession = Depends(get_db),
):
    """Create a draft version of a published course for editing."""
    import uuid
    import re

    result = await session.execute(select(Course).where(Course.slug == course_id))
    published = result.scalars().first()
    if not published:
        raise HTTPException(status_code=404, detail="Course not found")

    if published.status != "published":
        raise HTTPException(status_code=400, detail="Only published courses can have draft versions")

    # Check if a draft already exists
    if published.draft_version_id:
        result = await session.execute(select(Course).where(Course.id == published.draft_version_id))
        existing_draft = result.scalars().first()
        if existing_draft:
            return {"detail": "Draft version already exists", "draft_id": existing_draft.id, "draft_slug": existing_draft.slug}

    # Create draft copy
    base_slug = re.sub(r"[^a-z0-9]+", "-", f"{published.slug}-draft").strip("-")
    draft_slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

    draft = Course(
        category_id=published.category_id,
        slug=draft_slug,
        name=published.name,
        description=published.description,
        tagline=published.tagline,
        icon=published.icon,
        theme_color=published.theme_color,
        difficulty=published.difficulty,
        total_xp=published.total_xp,
        sort_order=published.sort_order,
        status="draft",
        available_languages=published.available_languages,
        tags=published.tags,
        blueprint_json=published.blueprint_json,
        created_by=current_user.get("username", "admin"),
    )
    session.add(draft)
    await session.flush()

    # Link published course to draft
    published.draft_version_id = draft.id

    # Copy modules, lessons, content, quizzes
    modules_result = await session.execute(
        select(Module).where(Module.course_id == published.id).order_by(Module.sort_order)
    )
    modules = modules_result.scalars().all()

    for module in modules:
        module_slug = f"{module.slug}-draft-{uuid.uuid4().hex[:6]}"
        draft_module = Module(
            course_id=draft.id,
            slug=module_slug,
            title=module.title,
            description=module.description,
            sort_order=module.sort_order,
            is_active=module.is_active,
            status="draft",
        )
        session.add(draft_module)
        await session.flush()

        # Copy lessons
        lessons_result = await session.execute(
            select(Lesson).where(Lesson.module_id == module.id).order_by(Lesson.sort_order)
        )
        lessons = lessons_result.scalars().all()

        for lesson in lessons:
            lesson_slug = f"{lesson.slug}-draft-{uuid.uuid4().hex[:6]}"
            draft_lesson = Lesson(
                module_id=draft_module.id,
                slug=lesson_slug,
                title=lesson.title,
                description=lesson.description,
                sort_order=lesson.sort_order,
                level=lesson.level,
                estimated_minutes=lesson.estimated_minutes,
                xp_reward=lesson.xp_reward,
                week=lesson.week,
                day=lesson.day,
                is_weekly_test=lesson.is_weekly_test,
                status="draft",
            )
            session.add(draft_lesson)
            await session.flush()

            # Copy lesson content
            content_result = await session.execute(
                select(LessonContent).where(LessonContent.lesson_id == lesson.id)
            )
            contents = content_result.scalars().all()
            for content in contents:
                draft_content = LessonContent(
                    lesson_id=draft_lesson.id,
                    language=content.language,
                    explanation=content.explanation,
                    explanation_format=content.explanation_format,
                    example=content.example,
                    activity=content.activity,
                    bengali_tip=content.bengali_tip,
                    micro_grammar=content.micro_grammar,
                    speaking_task=content.speaking_task,
                    vocab=content.vocab,
                    dialogue=content.dialogue,
                    sort_order=content.sort_order,
                    translated_by=content.translated_by,
                    status="draft",
                )
                session.add(draft_content)

            # Copy quizzes
            quiz_result = await session.execute(
                select(Quiz).where(Quiz.lesson_id == lesson.id)
            )
            quizzes = quiz_result.scalars().all()
            for quiz in quizzes:
                draft_quiz = Quiz(
                    lesson_id=draft_lesson.id,
                    title=quiz.title,
                    passing_score=quiz.passing_score,
                    max_attempts=quiz.max_attempts,
                    shuffle_questions=quiz.shuffle_questions,
                    shuffle_options=quiz.shuffle_options,
                    sort_order=quiz.sort_order,
                    status="draft",
                )
                session.add(draft_quiz)
                await session.flush()

                # Copy quiz questions
                questions_result = await session.execute(
                    select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id)
                )
                questions = questions_result.scalars().all()
                for question in questions:
                    draft_question = QuizQuestion(
                        quiz_id=draft_quiz.id,
                        question_text=question.question_text,
                        question_type=question.question_type,
                        options=question.options,
                        correct_answer=question.correct_answer,
                        feedback=question.feedback,
                        sort_order=question.sort_order,
                    )
                    session.add(draft_question)

    await session.commit()
    return {
        "detail": f"Draft version created for course '{course_id}'",
        "draft_id": draft.id,
        "draft_slug": draft.slug,
    }


@content_router.delete("/courses/{course_id}")
async def delete_course(
    course_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Cascade-delete a course and all its modules, lessons, content, quizzes.

    If this course is a draft version of a published course, also clear the
    published course's `draft_version_id` reference so a fresh draft can be
    created later.
    """
    result = await session.execute(select(Course).where(Course.slug == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # If this is a draft, clear the parent's draft_version_id pointer
    parent_slug: Optional[str] = None
    if course.status == "draft":
        parent_result = await session.execute(
            select(Course).where(Course.draft_version_id == course.id)
        )
        parent = parent_result.scalars().first()
        if parent:
            parent.draft_version_id = None
            parent_slug = parent.slug

    # ORM cascade handles modules -> lessons -> lesson_contents, quizzes, media, etc.
    await session.delete(course)
    await session.commit()
    return {
        "detail": f"Course '{course_id}' and all content deleted",
        "parent_slug": parent_slug,
    }


@content_router.post("/courses/{course_id}/publish")
async def publish_course(
    course_id: str,
    current_user: dict = Depends(get_current_creator),
    session: AsyncSession = Depends(get_db),
):
    """Publish a draft course. If it's a draft version of a published course, copy to published and delete draft."""
    result = await session.execute(select(Course).where(Course.slug == course_id))
    draft = result.scalars().first()
    if not draft:
        raise HTTPException(status_code=404, detail="Course not found")

    if draft.status != "draft":
        raise HTTPException(status_code=400, detail="Course is already published")

    # Validate: course must have at least one module and one lesson
    module_count_result = await session.execute(
        select(func.count(Module.id)).where(Module.course_id == draft.id)
    )
    module_count = module_count_result.scalar_one()
    if module_count == 0:
        raise HTTPException(status_code=422, detail="Cannot publish a course with no modules")

    lesson_count_result = await session.execute(
        select(func.count(Lesson.id))
        .join(Module, Lesson.module_id == Module.id)
        .where(Module.course_id == draft.id)
    )
    lesson_count = lesson_count_result.scalar_one()
    if lesson_count == 0:
        raise HTTPException(status_code=422, detail="Cannot publish a course with no lessons")

    # Check if this is a draft version of a published course
    # Find any published course that references this draft as its draft_version_id
    published_result = await session.execute(
        select(Course).where(Course.draft_version_id == draft.id)
    )
    published = published_result.scalars().first()

    if published:
        # This is a draft version - copy all data to published course
        # Copy course-level fields
        published.name = draft.name
        published.description = draft.description
        published.tagline = draft.tagline
        published.icon = draft.icon
        published.theme_color = draft.theme_color
        published.difficulty = draft.difficulty
        published.tags = draft.tags
        published.updated_at = datetime.now(timezone.utc)

        # Delete existing modules/lessons from published course
        existing_modules_result = await session.execute(
            select(Module).where(Module.course_id == published.id)
        )
        existing_modules = existing_modules_result.scalars().all()
        for mod in existing_modules:
            await session.delete(mod)

        await session.flush()

        # Copy modules from draft to published
        draft_modules_result = await session.execute(
            select(Module).where(Module.course_id == draft.id).order_by(Module.sort_order)
        )
        draft_modules = draft_modules_result.scalars().all()

        for draft_module in draft_modules:
            published_module = Module(
                course_id=published.id,
                slug=f"{draft_module.slug}-published",
                title=draft_module.title,
                description=draft_module.description,
                sort_order=draft_module.sort_order,
                is_active=draft_module.is_active,
                status="published",
            )
            session.add(published_module)
            await session.flush()

            # Copy lessons
            draft_lessons_result = await session.execute(
                select(Lesson).where(Lesson.module_id == draft_module.id).order_by(Lesson.sort_order)
            )
            draft_lessons = draft_lessons_result.scalars().all()

            for draft_lesson in draft_lessons:
                published_lesson = Lesson(
                    module_id=published_module.id,
                    slug=f"{draft_lesson.slug}-published",
                    title=draft_lesson.title,
                    description=draft_lesson.description,
                    sort_order=draft_lesson.sort_order,
                    level=draft_lesson.level,
                    estimated_minutes=draft_lesson.estimated_minutes,
                    xp_reward=draft_lesson.xp_reward,
                    week=draft_lesson.week,
                    day=draft_lesson.day,
                    is_weekly_test=draft_lesson.is_weekly_test,
                    status="published",
                )
                session.add(published_lesson)
                await session.flush()

                # Copy lesson content
                draft_content_result = await session.execute(
                    select(LessonContent).where(LessonContent.lesson_id == draft_lesson.id)
                )
                draft_contents = draft_content_result.scalars().all()
                for draft_content in draft_contents:
                    published_content = LessonContent(
                        lesson_id=published_lesson.id,
                        language=draft_content.language,
                        explanation=draft_content.explanation,
                        explanation_format=draft_content.explanation_format,
                        example=draft_content.example,
                        activity=draft_content.activity,
                        bengali_tip=draft_content.bengali_tip,
                        micro_grammar=draft_content.micro_grammar,
                        speaking_task=draft_content.speaking_task,
                        vocab=draft_content.vocab,
                        dialogue=draft_content.dialogue,
                        sort_order=draft_content.sort_order,
                        translated_by=draft_content.translated_by,
                        status="published",
                    )
                    session.add(published_content)

                # Copy quizzes
                draft_quiz_result = await session.execute(
                    select(Quiz).where(Quiz.lesson_id == draft_lesson.id)
                )
                draft_quizzes = draft_quiz_result.scalars().all()
                for draft_quiz in draft_quizzes:
                    published_quiz = Quiz(
                        lesson_id=published_lesson.id,
                        title=draft_quiz.title,
                        passing_score=draft_quiz.passing_score,
                        max_attempts=draft_quiz.max_attempts,
                        shuffle_questions=draft_quiz.shuffle_questions,
                        shuffle_options=draft_quiz.shuffle_options,
                        sort_order=draft_quiz.sort_order,
                        status="published",
                    )
                    session.add(published_quiz)
                    await session.flush()

                    # Copy quiz questions
                    draft_questions_result = await session.execute(
                        select(QuizQuestion).where(QuizQuestion.quiz_id == draft_quiz.id)
                    )
                    draft_questions = draft_questions_result.scalars().all()
                    for draft_question in draft_questions:
                        published_question = QuizQuestion(
                            quiz_id=published_quiz.id,
                            question_text=draft_question.question_text,
                            question_type=draft_question.question_type,
                            options=draft_question.options,
                            correct_answer=draft_question.correct_answer,
                            feedback=draft_question.feedback,
                            sort_order=draft_question.sort_order,
                        )
                        session.add(published_question)

        # Clear the draft_version_id reference
        published.draft_version_id = None

        # Delete the draft course
        await session.delete(draft)

        await session.commit()
        return {"detail": f"Course updated and published successfully", "course_id": published.slug, "status": "published"}
    else:
        # Standalone draft - just flip status
        draft.status = "published"
        draft.updated_at = datetime.now(timezone.utc)

        # Cascade status to modules
        modules_result = await session.execute(
            select(Module).where(Module.course_id == draft.id)
        )
        modules = modules_result.scalars().all()
        for module in modules:
            module.status = "published"
            module.updated_at = datetime.now(timezone.utc)

        # Cascade status to lessons
        lessons_result = await session.execute(
            select(Lesson).join(Module, Lesson.module_id == Module.id).where(Module.course_id == draft.id)
        )
        lessons = lessons_result.scalars().all()
        lesson_ids = []
        for lesson in lessons:
            lesson.status = "published"
            lesson.updated_at = datetime.now(timezone.utc)
            lesson_ids.append(lesson.id)

        # Flip LessonContent and Quiz status for all lessons in this course
        if lesson_ids:
            await session.execute(
                LessonContent.__table__.update()
                .where(LessonContent.lesson_id.in_(lesson_ids))
                .values(status="published", updated_at=datetime.now(timezone.utc))
            )
            await session.execute(
                Quiz.__table__.update()
                .where(Quiz.lesson_id.in_(lesson_ids))
                .values(status="published")
            )

        await session.commit()
        return {"detail": f"Course '{course_id}' published successfully", "course_id": course_id, "status": "published"}


@content_router.delete("/sections/{section_id}")
async def delete_section(
    section_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Cascade-delete a 'section' (Module row) and all its lessons + content.

    The frontend uses 'section' for what the SQL schema calls Module.
    """
    result = await session.execute(select(Module).where(Module.slug == section_id))
    module = result.scalars().first()
    if not module:
        raise HTTPException(status_code=404, detail="Section not found")

    await session.delete(module)
    await session.commit()
    return {"detail": f"Section '{section_id}' and all lessons deleted"}


# ══════════════════════════════════════════════════════════
# LMS — LESSONS (Lesson model in SQL)
# ══════════════════════════════════════════════════════════

@content_router.post("/courses/{course_id}/sections")
async def create_section(
    course_id: str,
    payload: SectionCreatePayload,
    session: AsyncSession = Depends(get_db),
):
    """Create a new 'section' (Module) under a course."""
    import uuid

    result = await session.execute(select(Course).where(Course.slug == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    count_result = await session.execute(
        select(func.count(Module.id)).where(Module.course_id == course.id)
    )
    sort_order = count_result.scalar_one() + 1

    base_slug = re.sub(r"[^a-z0-9]+", "-", payload.title.lower()).strip("-") or "module"
    slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

    module = Module(
        course_id=course.id,
        slug=slug,
        title=payload.title,
        description=payload.description or "",
        sort_order=sort_order,
        status="draft" if course.status == "draft" else "published",
    )
    session.add(module)
    await session.commit()
    await session.refresh(module)

    return {
        "id": module.slug,
        "course_id": course_id,
        "title": module.title,
        "description": module.description or "",
        "sort_order": module.sort_order,
        "status": module.status,
    }


@content_router.put("/sections/{section_id}")
async def update_section(
    section_id: str,
    payload: SectionUpdatePayload,
    session: AsyncSession = Depends(get_db),
):
    """Rename or update a 'section' (Module)."""
    result = await session.execute(select(Module).where(Module.slug == section_id))
    module = result.scalars().first()
    if not module:
        raise HTTPException(status_code=404, detail="Section not found")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    for k, v in update_data.items():
        setattr(module, k, v)
    module.updated_at = datetime.now(timezone.utc)

    await session.commit()
    return {"detail": f"Section '{section_id}' updated", **update_data}


@content_router.get("/courses/{course_id}/sections")
async def list_sections(
    course_id: str,
    session: AsyncSession = Depends(get_db),
):
    """List all 'sections' (Module rows) for a course, ordered by sort_order.

    The frontend uses 'section' as its display term for what the SQL schema
    calls Module.
    """
    result = await session.execute(select(Course).where(Course.slug == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    mod_result = await session.execute(
        select(Module)
        .where(Module.course_id == course.id)
        .order_by(Module.sort_order)
    )
    modules = mod_result.scalars().all()

    return [
        {
            "id": m.slug,
            "course_id": course_id,
            "title": m.title,
            "description": m.description or "",
            "sort_order": m.sort_order,
            "status": m.status,
        }
        for m in modules
    ]


@content_router.get("/courses/{course_id}/lessons")
async def list_lessons(
    course_id: str,
    session: AsyncSession = Depends(get_db),
):
    """List all lessons for a course, ordered by sort_order."""
    result = await session.execute(select(Course).where(Course.slug == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    lesson_result = await session.execute(
        select(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .where(Module.course_id == course.id)
        .options(selectinload(Lesson.module))
        .order_by(Lesson.week.nulls_last(), Lesson.sort_order)
    )
    lessons = lesson_result.scalars().all()

    out = []
    for les in lessons:
        d = les.to_dict()
        d["id"] = les.slug
        d["course_id"] = course_id
        # Frontend groups lessons by section_id (= Module.slug)
        d["section_id"] = les.module.slug if les.module else None

        # Count attached media
        media_count_result = await session.execute(
            select(func.count(MediaAsset.id)).where(MediaAsset.lesson_id == les.id)
        )
        d["media_count"] = media_count_result.scalar_one()
        out.append(d)
    return out


@content_router.put("/courses/{course_id}/lessons/{lesson_id}")
async def update_lesson(
    course_id: str,
    lesson_id: str,
    update: LessonUpdate,
    session: AsyncSession = Depends(get_db),
):
    """Update a lesson + its English lesson content."""
    # Verify course
    course_result = await session.execute(select(Course).where(Course.slug == course_id))
    course = course_result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Find lesson within course's modules
    result = await session.execute(
        select(Lesson)
        .join(Module, Lesson.module_id == Module.id)
        .where(Lesson.slug == lesson_id, Module.course_id == course.id)
    )
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Lesson-level fields
    lesson_fields = {"title", "level", "estimated_minutes"}
    content_fields = {"explanation", "example", "activity"}

    changed_lesson = {k: v for k, v in update_data.items() if k in lesson_fields}
    changed_content = {k: v for k, v in update_data.items() if k in content_fields}

    if changed_lesson:
        for k, v in changed_lesson.items():
            setattr(lesson, k, v)
        lesson.updated_at = datetime.now(timezone.utc)

    if changed_content:
        lc_result = await session.execute(
            select(LessonContent).where(
                LessonContent.lesson_id == lesson.id,
                LessonContent.language == "en",
            )
        )
        lc = lc_result.scalars().first()
        if lc:
            for k, v in changed_content.items():
                setattr(lc, k, v)
            lc.updated_at = datetime.now(timezone.utc)
        else:
            lc = LessonContent(
                lesson_id=lesson.id,
                language="en",
                **changed_content,
            )
            session.add(lc)

    await session.commit()
    return {"detail": f"Lesson '{lesson_id}' updated", **update_data}


# ── Per-lesson CRUD (matches frontend admin paths) ───────

@content_router.post("/sections/{section_id}/lessons")
async def create_lesson(
    section_id: str,
    payload: LessonCreatePayload,
    session: AsyncSession = Depends(get_db),
):
    """Create an empty lesson under a module ('section' in legacy frontend terms)."""
    import uuid

    result = await session.execute(select(Module).where(Module.slug == section_id))
    module = result.scalars().first()
    if not module:
        raise HTTPException(status_code=404, detail="Section not found")

    count_result = await session.execute(
        select(func.count(Lesson.id)).where(Lesson.module_id == module.id)
    )
    sort_order = count_result.scalar_one() + 1

    base_slug = re.sub(r"[^a-z0-9]+", "-", payload.title.lower()).strip("-") or "lesson"
    slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"

    lesson = Lesson(
        module_id=module.id,
        slug=slug,
        title=payload.title,
        description=payload.description or "",
        level=payload.level or "beginner",
        estimated_minutes=payload.estimated_minutes or 10,
        sort_order=sort_order,
        status="draft",
    )
    session.add(lesson)
    await session.flush()

    # Empty English content row so editors have something to populate
    session.add(LessonContent(
        lesson_id=lesson.id,
        language="en",
        explanation="",
        example="",
        activity="",
    ))

    await session.commit()
    await session.refresh(lesson)

    out = lesson.to_dict()
    out["id"] = lesson.slug
    return out


@content_router.get("/lessons/{lesson_id}")
async def get_lesson(
    lesson_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Get a single lesson with all its content, quiz, and media for the admin editor."""
    result = await session.execute(
        select(Lesson)
        .options(
            selectinload(Lesson.module),
            selectinload(Lesson.lesson_contents),
            selectinload(Lesson.quizzes).selectinload(Quiz.questions),
            selectinload(Lesson.media_assets),
        )
        .where(Lesson.slug == lesson_id)
    )
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    contents = {lc.language: lc.to_dict() for lc in lesson.lesson_contents}

    assessment = None
    if lesson.quizzes:
        quiz = lesson.quizzes[0]
        questions = []
        for q in sorted(quiz.questions, key=lambda x: x.sort_order):
            qtype = q.question_type or "mcq"
            payload = {
                "id": str(q.id),
                "type": qtype,
                "question": q.question_text,
                "options": q.options,
                "explanation": q.hint or "",
                **(q.feedback or {}),
            }
            # Reverse the storage of correct answers (see update_lesson_quiz)
            if qtype == "multi-select":
                try:
                    payload["correctAnswers"] = [
                        int(x) for x in (q.correct_answer or "").split(",") if x != ""
                    ]
                except ValueError:
                    payload["correctAnswers"] = []
            elif qtype == "mcq":
                try:
                    payload["correctAnswer"] = int(q.correct_answer)
                except (TypeError, ValueError):
                    payload["correctAnswer"] = 0
            elif qtype == "true-false":
                payload["correctAnswer"] = (q.correct_answer or "").lower() == "true"
            else:  # short-answer
                payload["correctAnswer"] = q.correct_answer or ""
            questions.append(payload)
        assessment = {
            "id": str(quiz.id),
            "title": quiz.title,
            "passing_score": quiz.passing_score,
            "questions": questions,
        }

    media = [
        {
            "id": str(a.id),
            "asset_type": a.asset_type,
            "cloudinary_url": a.cloudinary_url,
            "original_filename": a.original_filename,
            "mime_type": a.mime_type,
            "file_size_bytes": a.file_size_bytes,
            "alt_text": a.alt_text,
            "sort_order": a.sort_order,
            "tags": a.tags,
        }
        for a in sorted(lesson.media_assets, key=lambda a: a.sort_order)
    ]

    out = lesson.to_dict()
    out["id"] = lesson.slug
    out["section_id"] = lesson.module.slug if lesson.module else None
    out["contents"] = contents
    out["assessment"] = assessment
    out["media_assets"] = media
    return out


@content_router.put("/lessons/{lesson_id}")
async def update_lesson_meta(
    lesson_id: str,
    update: LessonUpdate,
    session: AsyncSession = Depends(get_db),
):
    """Update lesson metadata (title, level, minutes) and/or English content fields.

    Same shape as `PUT /courses/{course_id}/lessons/{lesson_id}` but doesn't
    require the course slug — used by the lesson editor.
    """
    result = await session.execute(select(Lesson).where(Lesson.slug == lesson_id))
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    await _ensure_lesson_editable(session, lesson)

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    lesson_fields = {"title", "level", "estimated_minutes"}
    content_fields = {"explanation", "example", "activity"}

    changed_lesson = {k: v for k, v in update_data.items() if k in lesson_fields}
    changed_content = {k: v for k, v in update_data.items() if k in content_fields}

    if changed_lesson:
        for k, v in changed_lesson.items():
            setattr(lesson, k, v)
        lesson.updated_at = datetime.now(timezone.utc)

    if changed_content:
        lc_result = await session.execute(
            select(LessonContent).where(
                LessonContent.lesson_id == lesson.id,
                LessonContent.language == "en",
            )
        )
        lc = lc_result.scalars().first()
        if lc:
            for k, v in changed_content.items():
                setattr(lc, k, v)
            lc.updated_at = datetime.now(timezone.utc)
        else:
            session.add(LessonContent(
                lesson_id=lesson.id,
                language="en",
                **changed_content,
            ))

    await session.commit()
    return {"detail": f"Lesson '{lesson_id}' updated", **update_data}


@content_router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Cascade-delete a lesson and its content + quiz + media_assets."""
    result = await session.execute(select(Lesson).where(Lesson.slug == lesson_id))
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    await _ensure_lesson_editable(session, lesson)

    await session.delete(lesson)
    await session.commit()
    return {"detail": f"Lesson '{lesson_id}' deleted"}


@content_router.post("/lessons/{lesson_id}/regenerate")
async def regenerate_lesson(
    lesson_id: str,
    payload: LessonRegeneratePayload,
    current_user: dict = Depends(require_ai_generation_enabled),
    session: AsyncSession = Depends(get_db),
):
    """Regenerate lesson content using AI with optional instructions and source text."""
    from services import course_generator

    result = await session.execute(
        select(Lesson)
        .options(selectinload(Lesson.module).selectinload(Module.course))
        .where(Lesson.slug == lesson_id)
    )
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    course = lesson.module.course if lesson.module else None
    tone = "professional"
    if course and course.blueprint_json:
        tone = (course.blueprint_json.get("_meta") or {}).get("tone", "professional")

    try:
        updated = await course_generator.regenerate_lesson_for_published(
            session=session,
            lesson=lesson,
            source_text=payload.source_text or "",
            extra_instructions=payload.instructions,
            tone=tone,
        )
        await session.commit()
        return updated
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        logging.exception("Lesson regeneration failed")
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {exc}")


@content_router.post("/lessons/{lesson_id}/regenerate-with-docs")
async def regenerate_lesson_with_docs(
    lesson_id: str,
    files: list[UploadFile] = File(default=[]),
    instructions: str = Form(""),
    current_user: dict = Depends(require_ai_generation_enabled),
    session: AsyncSession = Depends(get_db),
):
    """Regenerate lesson content with uploaded docs as source + optional instructions."""
    from services import course_generator, document_parser

    result = await session.execute(
        select(Lesson)
        .options(selectinload(Lesson.module).selectinload(Module.course))
        .where(Lesson.slug == lesson_id)
    )
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    source_text = ""
    for f in files:
        data = await f.read()
        if not data:
            continue
        try:
            parsed = document_parser.parse_document(
                data=data,
                filename=f.filename or "upload",
                content_type=f.content_type,
            )
            source_text += f"=== {f.filename} ===\n\n{parsed.get('raw_text', '')}\n\n---\n\n"
        except Exception as exc:  # noqa: BLE001
            logging.warning(f"Failed to parse {f.filename}: {exc}")

    course = lesson.module.course if lesson.module else None
    tone = "professional"
    if course and course.blueprint_json:
        tone = (course.blueprint_json.get("_meta") or {}).get("tone", "professional")

    try:
        updated = await course_generator.regenerate_lesson_for_published(
            session=session,
            lesson=lesson,
            source_text=source_text,
            extra_instructions=instructions or None,
            tone=tone,
        )
        await session.commit()
        return updated
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        logging.exception("Lesson regeneration with docs failed")
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {exc}")


# ── Lesson Content (per-language) ────────────────────────

@content_router.get("/lessons/{lesson_id}/content/{language}")
async def get_lesson_content(
    lesson_id: str,
    language: str,
    session: AsyncSession = Depends(get_db),
):
    """Get lesson content for a specific language."""
    result = await session.execute(
        select(LessonContent)
        .join(Lesson, LessonContent.lesson_id == Lesson.id)
        .where(Lesson.slug == lesson_id, LessonContent.language == language)
    )
    lc = result.scalars().first()
    if not lc:
        raise HTTPException(status_code=404, detail=f"No {language} content for this lesson")
    return lc.to_dict()


@content_router.put("/lessons/{lesson_id}/content/{language}")
async def update_lesson_content(
    lesson_id: str,
    language: str,
    update: LessonContentUpdatePayload,
    session: AsyncSession = Depends(get_db),
):
    """Update or create lesson content for a specific language."""
    result = await session.execute(select(Lesson).where(Lesson.slug == lesson_id))
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    await _ensure_lesson_editable(session, lesson)

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    lc_result = await session.execute(
        select(LessonContent).where(
            LessonContent.lesson_id == lesson.id,
            LessonContent.language == language,
        )
    )
    lc = lc_result.scalars().first()
    if lc:
        for k, v in update_data.items():
            setattr(lc, k, v)
        lc.updated_at = datetime.now(timezone.utc)
    else:
        lc = LessonContent(
            lesson_id=lesson.id,
            language=language,
            **update_data,
        )
        session.add(lc)

    await session.commit()
    return {"detail": f"Content updated for lesson '{lesson_id}' ({language})"}


@content_router.put("/lessons/{lesson_id}/quiz")
async def update_lesson_quiz(
    lesson_id: str,
    payload: QuizUpdate,
    session: AsyncSession = Depends(get_db),
):
    """Replace the quiz questions for a lesson. Upserts the Quiz row.

    Supports question types: mcq, multi-select, true-false, short-answer.
    Each question may carry an optional image_asset_id / image_url, which
    are stashed in QuizQuestion.feedback (no dedicated columns in the SQL schema yet).
    """
    result = await session.execute(select(Lesson).where(Lesson.slug == lesson_id))
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    await _ensure_lesson_editable(session, lesson)

    quiz_result = await session.execute(select(Quiz).where(Quiz.lesson_id == lesson.id))
    quiz = quiz_result.scalars().first()

    title = payload.title or f"Quiz — {lesson.title}"
    passing_score = (
        max(0, min(100, payload.passing_score)) if payload.passing_score is not None else 70
    )

    if quiz is None:
        quiz = Quiz(
            lesson_id=lesson.id,
            title=title,
            passing_score=passing_score,
            max_attempts=3,
            shuffle_questions=False,
            shuffle_options=True,
            status="published",
        )
        session.add(quiz)
        await session.flush()
    else:
        quiz.title = title
        if payload.passing_score is not None:
            quiz.passing_score = passing_score
        old_q_result = await session.execute(
            select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id)
        )
        for old_q in old_q_result.scalars().all():
            await session.delete(old_q)
        await session.flush()

    for idx, q in enumerate(payload.questions):
        qtype = q.type or "mcq"
        # Map answer fields to QuizQuestion's single string column
        if qtype == "multi-select":
            correct = ",".join(str(i) for i in (q.correctAnswers or []))
        elif q.correctAnswer is not None:
            correct = str(q.correctAnswer)
        else:
            correct = ""

        feedback: dict = {}
        if q.image_asset_id:
            feedback["image_asset_id"] = q.image_asset_id
        if q.image_url:
            feedback["image_url"] = q.image_url

        session.add(QuizQuestion(
            quiz_id=quiz.id,
            question_text=q.question or "",
            question_type=qtype,
            options=q.options if q.options is not None else None,
            correct_answer=correct,
            hint=q.explanation or "",
            feedback=feedback or None,
            sort_order=idx,
        ))

    await session.commit()

    refreshed_result = await session.execute(
        select(Quiz)
        .where(Quiz.id == quiz.id)
        .options(selectinload(Quiz.questions))
    )
    refreshed = refreshed_result.scalars().first()
    out = refreshed.to_dict()
    out["lesson_id"] = lesson.slug
    out["questions"] = [
        {
            "id": str(q.id),
            "type": q.question_type,
            "question": q.question_text,
            "options": q.options,
            "correctAnswer": q.correct_answer,
            "explanation": q.hint,
            **(q.feedback or {}),
        }
        for q in sorted(refreshed.questions, key=lambda x: x.sort_order)
    ]
    return out


# ══════════════════════════════════════════════════════════
# ASSESSMENTS
# ══════════════════════════════════════════════════════════

@content_router.get("/courses/{course_id}/assessments")
async def list_assessments(
    course_id: str,
    session: AsyncSession = Depends(get_db),
):
    """List quizzes for all lessons in a course."""
    course_result = await session.execute(select(Course).where(Course.slug == course_id))
    course = course_result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Get all lesson IDs for this course (through modules)
    lesson_result = await session.execute(
        select(Lesson.id, Lesson.slug)
        .join(Module, Lesson.module_id == Module.id)
        .where(Module.course_id == course.id)
    )
    lesson_rows = lesson_result.all()
    lesson_id_to_slug = {row.id: row.slug for row in lesson_rows}

    if not lesson_id_to_slug:
        return []

    # Get quizzes with their questions
    quiz_result = await session.execute(
        select(Quiz)
        .where(Quiz.lesson_id.in_(lesson_id_to_slug.keys()))
        .options(selectinload(Quiz.questions))
        .order_by(Quiz.sort_order)
    )
    quizzes = quiz_result.scalars().all()

    out = []
    for quiz in quizzes:
        d = quiz.to_dict()
        d["lesson_id"] = lesson_id_to_slug.get(quiz.lesson_id, "")
        d["questions"] = [q.to_dict() for q in quiz.questions]
        out.append(d)
    return out


# ══════════════════════════════════════════════════════════
# MEDIA MANAGEMENT
# ══════════════════════════════════════════════════════════

@content_router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    lesson_slug: Optional[str] = Form(None),
    section_slug: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_creator),
    session: AsyncSession = Depends(get_db),
):
    """Upload a media file. Optionally attach to a lesson."""
    file_data = await file.read()

    lesson_id = None
    # Accept either lesson_slug or section_slug (backward compat)
    slug = lesson_slug or section_slug
    if slug:
        result = await session.execute(
            select(Lesson).where(Lesson.slug == slug)
        )
        les = result.scalars().first()
        if les:
            lesson_id = les.id

    tag_list = [t.strip() for t in tags.split(",")] if tags else None

    asset = await media_service.upload_file(
        session=session,
        file_data=file_data,
        filename=file.filename,
        content_type=file.content_type,
        uploaded_by=current_user.get("username", "admin"),
        lesson_id=lesson_id,
        tags=tag_list,
    )
    await session.commit()
    return asset


# ── Direct-to-Cloudinary upload (browser uploads, backend just signs) ──

class SignUploadRequest(BaseModel):
    """Body for /media/sign-upload — the client tells the backend what
    kind of upload it's about to do; the backend produces a signed,
    constrained ticket the browser then sends straight to Cloudinary."""
    resource_type: str = "auto"          # 'image' | 'video' | 'raw' | 'auto'
    lesson_slug: Optional[str] = None    # echoed back, not signed; used on /register
    tags: Optional[list[str]] = None     # namespace, e.g. ['lesson-banner']


_VIDEO_MAX_BYTES = 200 * 1024 * 1024     # 200 MB ceiling
_IMAGE_MAX_BYTES = 25 * 1024 * 1024      # 25 MB ceiling
_VIDEO_FORMATS = "mp4,webm,mov,m4v"
_IMAGE_FORMATS = "jpg,jpeg,png,webp,gif"


@content_router.post("/media/sign-upload")
async def sign_upload(
    body: SignUploadRequest,
    current_user: dict = Depends(get_current_creator),
):
    """Return a Cloudinary signed-upload payload the browser can POST
    directly to api.cloudinary.com/v1_1/<cloud>/<resource_type>/upload.

    The signature locks `folder`, `public_id`, `tags`, and `allowed_formats`
    so the client cannot override them after signing.
    """
    import time
    import uuid as _uuid
    import os as _os

    cloud_name = _os.environ.get("CLOUDINARY_CLOUD_NAME", "")
    api_key = _os.environ.get("CLOUDINARY_API_KEY", "")
    api_secret = _os.environ.get("CLOUDINARY_API_SECRET", "")

    # Fall back to parsing CLOUDINARY_URL (cloudinary://key:secret@cloud)
    cloudinary_url_env = _os.environ.get("CLOUDINARY_URL", "")
    if cloudinary_url_env and (not cloud_name or not api_key or not api_secret):
        # cloudinary://<key>:<secret>@<cloud>
        try:
            no_scheme = cloudinary_url_env.split("://", 1)[1]
            creds, cloud = no_scheme.split("@", 1)
            api_key, api_secret = creds.split(":", 1)
            cloud_name = cloud
        except Exception:
            pass

    if not (cloud_name and api_key and api_secret):
        raise HTTPException(
            status_code=503,
            detail="Cloudinary not configured. Set CLOUDINARY_URL "
            "(or CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).",
        )

    resource_type = (body.resource_type or "auto").lower()
    if resource_type not in {"image", "video", "raw", "auto"}:
        raise HTTPException(status_code=400, detail="Invalid resource_type.")

    timestamp = int(time.time())
    public_id = f"dreamerz/{_uuid.uuid4().hex[:16]}"
    folder = "dreamerz"

    is_video = resource_type == "video"
    max_bytes = _VIDEO_MAX_BYTES if is_video else _IMAGE_MAX_BYTES
    allowed_formats = _VIDEO_FORMATS if is_video else (
        _IMAGE_FORMATS if resource_type == "image" else f"{_IMAGE_FORMATS},{_VIDEO_FORMATS}"
    )
    tags_str = ",".join(body.tags or [])

    # Params included here are signed and cannot be changed by the client.
    params_to_sign = {
        "timestamp": timestamp,
        "folder": folder,
        "public_id": public_id,
        "tags": tags_str,
        "allowed_formats": allowed_formats,
    }

    import cloudinary.utils as _cu
    signature = _cu.api_sign_request(params_to_sign, api_secret)

    return {
        "cloud_name": cloud_name,
        "api_key": api_key,
        "signature": signature,
        "timestamp": timestamp,
        "public_id": public_id,
        "folder": folder,
        "tags": tags_str,
        "allowed_formats": allowed_formats,
        "resource_type": resource_type,
        "max_bytes": max_bytes,
        # Convenience: the URL the browser will POST to.
        "upload_url": f"https://api.cloudinary.com/v1_1/{cloud_name}/{resource_type}/upload",
        # Echoed so /register can re-use them.
        "lesson_slug": body.lesson_slug,
    }


class RegisterUploadRequest(BaseModel):
    """Body for /media/register — the metadata Cloudinary returns after
    a successful direct upload, plus app context (lesson, tags, alt_text)."""
    public_id: str
    secure_url: str
    resource_type: str                   # 'image' | 'video' | 'raw'
    format: Optional[str] = None
    bytes: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    duration: Optional[float] = None
    original_filename: Optional[str] = None
    lesson_slug: Optional[str] = None
    tags: Optional[list[str]] = None
    alt_text: Optional[str] = None


def _mime_from_format(fmt: Optional[str], resource_type: str) -> Optional[str]:
    if not fmt:
        return None
    fmt = fmt.lower()
    overrides = {
        "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
        "webp": "image/webp", "gif": "image/gif", "svg": "image/svg+xml",
        "mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime",
        "m4v": "video/x-m4v",
    }
    if fmt in overrides:
        return overrides[fmt]
    return f"{resource_type}/{fmt}"


def _derive_video_urls(secure_url: str) -> tuple[Optional[str], Optional[str]]:
    """Cloudinary URL transformation: derive poster (thumb) + HLS streaming
    URLs from the base /upload/ URL. Returns (poster_url, streaming_url)."""
    if "/upload/" not in secure_url:
        return None, None
    base_no_ext = secure_url.rsplit(".", 1)[0]
    poster = base_no_ext.replace("/upload/", "/upload/so_0,c_thumb,w_640/") + ".jpg"
    hls = base_no_ext.replace("/upload/", "/upload/sp_auto/") + ".m3u8"
    return poster, hls


@content_router.post("/media/register")
async def register_upload(
    body: RegisterUploadRequest,
    current_user: dict = Depends(get_current_creator),
    session: AsyncSession = Depends(get_db),
):
    """Record a MediaAsset for an upload that just landed in Cloudinary.

    We don't see the file bytes — only the metadata Cloudinary returned.
    The upload was authenticated by the signature we issued, so trusting
    the response is OK; if you want belt-and-braces verification, call
    cloudinary.api.resource(public_id) here.
    """
    # Resolve lesson, if attached
    lesson_id = None
    if body.lesson_slug:
        result = await session.execute(
            select(Lesson).where(Lesson.slug == body.lesson_slug)
        )
        les = result.scalars().first()
        if les:
            lesson_id = les.id

    resource_type = (body.resource_type or "").lower()
    asset_type = (
        "image" if resource_type == "image"
        else "video" if resource_type == "video"
        else "document"
    )

    poster_url, streaming_url = (None, None)
    if asset_type == "video":
        poster_url, streaming_url = _derive_video_urls(body.secure_url)

    asset = MediaAsset(
        lesson_id=lesson_id,
        asset_type=asset_type,
        cloudinary_url=body.secure_url,
        cloudinary_public_id=body.public_id,
        original_filename=body.original_filename,
        mime_type=_mime_from_format(body.format, resource_type),
        file_size_bytes=body.bytes,
        width=body.width,
        height=body.height,
        duration_seconds=body.duration,
        poster_url=poster_url,
        streaming_url=streaming_url,
        upload_status="ready",
        tags=body.tags or [],
        alt_text=body.alt_text,
        uploaded_by=current_user.get("username", "admin"),
    )
    session.add(asset)
    await session.commit()
    await session.refresh(asset)
    return asset.to_dict()


@content_router.get("/media")
async def list_media(
    asset_type: Optional[str] = None,
    lesson_slug: Optional[str] = None,
    section_slug: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """List media assets with optional filters."""
    lesson_id = None
    slug = lesson_slug or section_slug
    if slug:
        result = await session.execute(
            select(Lesson).where(Lesson.slug == slug)
        )
        les = result.scalars().first()
        if les:
            lesson_id = les.id

    assets = await media_service.list_assets(
        session=session,
        asset_type=asset_type,
        lesson_id=lesson_id,
    )
    return assets


@content_router.post("/media/{asset_id}/attach")
async def attach_media(
    asset_id: int,
    body: AssetAttach,
    session: AsyncSession = Depends(get_db),
):
    """Attach a media asset to a lesson."""
    # Resolve lesson_id (slug) to lesson int id
    result = await session.execute(
        select(Lesson).where(Lesson.slug == body.lesson_id)
    )
    les = result.scalars().first()
    if not les:
        raise HTTPException(status_code=404, detail="Lesson not found")

    success = await media_service.attach_to_lesson(
        session=session,
        asset_id=asset_id,
        lesson_id=les.id,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Media asset not found")
    await session.commit()
    return {"detail": f"Asset {asset_id} attached to lesson '{body.lesson_id}'"}


@content_router.delete("/media/{asset_id}")
async def delete_media(
    asset_id: int,
    session: AsyncSession = Depends(get_db),
):
    """Delete a media asset (removes from storage and DB)."""
    success = await media_service.delete_file(session=session, asset_id=asset_id)
    if not success:
        raise HTTPException(status_code=404, detail="Media asset not found")
    await session.commit()
    return {"detail": f"Asset {asset_id} deleted"}


# ══════════════════════════════════════════════════════════
# TRANSLATION
# ══════════════════════════════════════════════════════════

@content_router.post("/courses/{course_id}/translate")
async def translate_course(
    course_id: str,
    body: TranslateRequest,
    session: AsyncSession = Depends(get_db),
):
    """Translate all lessons in a course to the target language."""
    result = await session.execute(select(Course).where(Course.slug == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    translated = await translation_service.translate_course(
        session=session,
        module_id=course.id,
        target_lang=body.target_language,
    )
    return translated


@content_router.get("/courses/{course_id}/translation-status")
async def translation_status(
    course_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Get translation coverage for a course."""
    result = await session.execute(select(Course).where(Course.slug == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    status = await translation_service.get_translation_status(
        session=session,
        module_id=course.id,
    )
    return status


# ══════════════════════════════════════════════════════════
# STATS
# ══════════════════════════════════════════════════════════

@admin_router.get("/stats")
async def admin_stats(session: AsyncSession = Depends(get_db)):
    """Dashboard stats: counts of users, courses, modules, lessons, media, etc."""
    user_count = (await session.execute(select(func.count(User.id)))).scalar_one()
    course_count = (await session.execute(select(func.count(Course.id)))).scalar_one()
    module_count = (await session.execute(select(func.count(Module.id)))).scalar_one()
    lesson_count = (await session.execute(select(func.count(Lesson.id)))).scalar_one()
    media_count = (await session.execute(select(func.count(MediaAsset.id)))).scalar_one()
    quiz_count = (await session.execute(select(func.count(Quiz.id)))).scalar_one()
    enrollment_count = (await session.execute(select(func.count(StudentCourseEnrollment.id)))).scalar_one()
    category_count = (await session.execute(select(func.count(Category.id)))).scalar_one()
    draft_count = (await session.execute(
        select(func.count(Course.id)).where(Course.status == "draft")
    )).scalar_one()

    return {
        "users": user_count,
        "courses": course_count,
        "modules": module_count,
        "lessons": lesson_count,
        "media_assets": media_count,
        "quizzes": quiz_count,
        "enrollments": enrollment_count,
        "categories": category_count,
        "draft_courses": draft_count,
    }
