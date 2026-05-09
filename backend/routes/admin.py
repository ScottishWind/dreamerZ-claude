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
    MediaAsset, Category, Enrollment, PricingPlan, FAQ,
)
from models.user import AdminUserResponse
from services.auth_service import get_current_admin
from services import media_service
from services import translation_service

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


# ── Pydantic Models ──────────────────────────────────────

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None


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


class RoleUpdate(BaseModel):
    is_admin: bool


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
    image_asset_id: Optional[str] = None
    image_url: Optional[str] = None


class QuizUpdate(BaseModel):
    questions: list[QuizQuestionPayload] = []
    passing_score: Optional[int] = None
    title: Optional[str] = None


class LessonCreatePayload(BaseModel):
    title: str
    level: Optional[str] = "beginner"
    estimated_minutes: Optional[int] = 10
    description: Optional[str] = ""


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

@router.post("/categories")
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


@router.get("/categories")
async def list_categories(session: AsyncSession = Depends(get_db)):
    """List all categories (admin view)."""
    result = await session.execute(
        select(Category).order_by(Category.sort_order)
    )
    return [c.to_dict() for c in result.scalars().all()]


@router.delete("/categories/{category_id}")
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

@router.get("/users", response_model=list[AdminUserResponse])
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

    out = []
    for u in users:
        email = (u.email or "").lower()
        is_super = email in ADMIN_EMAILS
        out.append({
            "username": u.username,
            "email": u.email,
            "created_at": u.created_at.isoformat() if u.created_at else "",
            "last_login": u.last_login.isoformat() if u.last_login else None,
            "is_admin": is_super or bool(u.is_admin),
            "is_super_admin": is_super,
            "preferred_language": u.preferred_language or "en",
        })
    return out


@router.get("/users/count")
async def user_count(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(func.count(User.id)))
    total = result.scalar_one()
    return {"total": total}


@router.put("/users/{username}/role")
async def update_user_role(
    username: str,
    body: RoleUpdate,
    current_admin: dict = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db),
):
    """Promote or demote a user to/from admin role."""
    caller_email = current_admin.get("email", "").lower()
    if caller_email not in ADMIN_EMAILS:
        raise HTTPException(
            status_code=403,
            detail="Only super-admins can manage admin roles",
        )

    username = username.strip().lower()
    result = await session.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user_email = (user.email or "").lower()
    if user_email in ADMIN_EMAILS and not body.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Cannot demote a super-admin (remove from ADMIN_EMAILS env var instead)",
        )

    user.is_admin = body.is_admin
    user.updated_at = datetime.now(timezone.utc)
    await session.commit()

    action = "promoted to admin" if body.is_admin else "demoted to regular user"
    return {"detail": f"User '{username}' {action}"}


@router.delete("/users/{username}")
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

    # Delete enrollments first, then the user (cascade handles the rest)
    await session.execute(delete(Enrollment).where(Enrollment.user_id == user.id))
    await session.delete(user)
    await session.commit()

    return {"detail": f"User '{username}' deleted successfully"}


# ══════════════════════════════════════════════════════════
# LEGACY CONTENT MANAGEMENT (tools/modules — kept for compatibility)
# ══════════════════════════════════════════════════════════

@router.get("/tools")
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


@router.get("/tools/{tool_id}")
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


@router.put("/tools/{tool_id}/modules/{module_id}")
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

@router.get("/courses")
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


@router.get("/courses/{course_id}")
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
    return d


@router.put("/courses/{course_id}")
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


@router.delete("/courses/{course_id}")
async def delete_course(
    course_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Cascade-delete a course and all its modules, lessons, content, quizzes."""
    result = await session.execute(select(Course).where(Course.slug == course_id))
    course = result.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # ORM cascade handles modules -> lessons -> lesson_contents, quizzes, media, etc.
    await session.delete(course)
    await session.commit()
    return {"detail": f"Course '{course_id}' and all content deleted"}


@router.delete("/sections/{section_id}")
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

@router.get("/courses/{course_id}/sections")
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


@router.get("/courses/{course_id}/lessons")
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


@router.put("/courses/{course_id}/lessons/{lesson_id}")
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

@router.post("/sections/{section_id}/lessons")
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


@router.get("/lessons/{lesson_id}")
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


@router.put("/lessons/{lesson_id}")
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


@router.delete("/lessons/{lesson_id}")
async def delete_lesson(
    lesson_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Cascade-delete a lesson and its content + quiz + media_assets."""
    result = await session.execute(select(Lesson).where(Lesson.slug == lesson_id))
    lesson = result.scalars().first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    await session.delete(lesson)
    await session.commit()
    return {"detail": f"Lesson '{lesson_id}' deleted"}


@router.post("/lessons/{lesson_id}/regenerate")
async def regenerate_lesson(
    lesson_id: str,
    payload: LessonRegeneratePayload,
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


@router.post("/lessons/{lesson_id}/regenerate-with-docs")
async def regenerate_lesson_with_docs(
    lesson_id: str,
    files: list[UploadFile] = File(default=[]),
    instructions: str = Form(""),
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

@router.get("/lessons/{lesson_id}/content/{language}")
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


@router.put("/lessons/{lesson_id}/content/{language}")
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


@router.put("/lessons/{lesson_id}/quiz")
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

@router.get("/courses/{course_id}/assessments")
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

@router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    lesson_slug: Optional[str] = Form(None),
    section_slug: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_admin: dict = Depends(get_current_admin),
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
        uploaded_by=current_admin.get("username", "admin"),
        lesson_id=lesson_id,
        tags=tag_list,
    )
    return asset


@router.get("/media")
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


@router.post("/media/{asset_id}/attach")
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
    return {"detail": f"Asset {asset_id} attached to lesson '{body.lesson_id}'"}


# ══════════════════════════════════════════════════════════
# TRANSLATION
# ══════════════════════════════════════════════════════════

@router.post("/courses/{course_id}/translate")
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


@router.get("/courses/{course_id}/translation-status")
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

@router.get("/stats")
async def admin_stats(session: AsyncSession = Depends(get_db)):
    """Dashboard stats: counts of users, courses, modules, lessons, media, etc."""
    user_count = (await session.execute(select(func.count(User.id)))).scalar_one()
    course_count = (await session.execute(select(func.count(Course.id)))).scalar_one()
    module_count = (await session.execute(select(func.count(Module.id)))).scalar_one()
    lesson_count = (await session.execute(select(func.count(Lesson.id)))).scalar_one()
    media_count = (await session.execute(select(func.count(MediaAsset.id)))).scalar_one()
    quiz_count = (await session.execute(select(func.count(Quiz.id)))).scalar_one()
    enrollment_count = (await session.execute(select(func.count(Enrollment.id)))).scalar_one()
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
