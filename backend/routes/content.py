"""Content routes — tools, modules, categories, media serve, language support.

Rewritten to use the 4-level hierarchy: Category → Course → Module → Lesson.
API response shapes kept compatible with the frontend:
  - "tool" in response = Course in DB
  - "module" in response = Lesson in DB (flattened from Course→Module→Lesson)
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import DEFAULT_LANGUAGE
from database import get_db, CATEGORIES_DATA
from models.sql_models import (
    Category,
    Course,
    Module,
    Lesson,
    LessonContent,
    Quiz,
    QuizQuestion,
    MediaAsset,
)
from utils.sanitizers import sanitize_id

router = APIRouter(prefix="/content", tags=["content"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_media_asset(asset: MediaAsset) -> dict:
    """Convert a MediaAsset ORM object to a frontend-compatible dict."""
    return {
        "id": str(asset.id),
        "asset_type": asset.asset_type,
        "cloudinary_url": asset.cloudinary_url,
        "cloudinary_public_id": asset.cloudinary_public_id,
        "original_filename": asset.original_filename,
        "mime_type": asset.mime_type,
        "file_size_bytes": asset.file_size_bytes,
        "alt_text": asset.alt_text,
        "duration_seconds": asset.duration_seconds,
        "sort_order": asset.sort_order,
        "tags": asset.tags,
    }


def _serialize_quiz(quiz: Quiz) -> dict:
    """Convert a Quiz ORM object (with eager-loaded questions) to dict."""
    return {
        "id": str(quiz.id),
        "title": quiz.title,
        "passingScore": quiz.passing_score,
        "max_attempts": quiz.max_attempts,
        "shuffle_questions": quiz.shuffle_questions,
        "shuffle_options": quiz.shuffle_options,
        "questions": [
            {
                "question": q.question_text,
                "type": q.question_type,
                "options": q.options,
                "correctAnswer": q.correct_answer,
                "explanation": q.hint,
            }
            for q in sorted(quiz.questions, key=lambda q: q.sort_order)
        ],
    }


def _serialize_lesson_summary(lesson: Lesson) -> dict:
    """Serialize a lesson for the tool/module listing (no full content).

    The frontend expects these items under the ``modules`` key, so the
    field names are kept unchanged from the old Section-based serializer.
    """
    quiz_dict: dict = {}
    if lesson.quizzes:
        quiz_dict = _serialize_quiz(lesson.quizzes[0])

    media = [_serialize_media_asset(a) for a in sorted(lesson.media_assets, key=lambda a: a.sort_order)]

    # Resolve tool_id (= Course slug) by walking lesson → module → course
    tool_id = None
    if lesson.module and lesson.module.course:
        tool_id = lesson.module.course.slug

    return {
        "id": lesson.slug,
        "tool_id": tool_id,
        "title": lesson.title,
        "description": lesson.description or "",
        "level": lesson.level,
        "minutes": lesson.estimated_minutes,
        "isAdvanced": lesson.level == "advanced",
        "sort_order": lesson.sort_order,
        "week": lesson.week,
        "day": lesson.day,
        "is_weekly_test": lesson.is_weekly_test,
        "xp_reward": lesson.xp_reward,
        "quiz": quiz_dict,
        "media_assets": media,
    }


def _serialize_lesson_full(lesson: Lesson, lc: Optional[LessonContent]) -> dict:
    """Serialize a lesson with full text content for the player."""
    base = _serialize_lesson_summary(lesson)
    content = {}
    if lc:
        content = {
            "explanation": lc.explanation or "",
            "example": lc.example or "",
            "activity": lc.activity or "",
        }
        for field in ("bengali_tip", "micro_grammar", "speaking_task", "vocab", "dialogue"):
            val = getattr(lc, field, None)
            if val:
                content[field] = val
    base["content"] = content
    return base


def _serialize_tool(course: Course) -> dict:
    """Serialize a Course ORM object as a 'tool' for the frontend."""
    return {
        "id": course.slug,
        "name": course.name,
        "tagline": course.tagline or "",
        "icon": course.icon or "",
        "theme": {"color": course.theme_color or "#10A37F"},
        "totalXP": course.total_xp,
        "color": course.theme_color or "#10A37F",
        "category_id": course.category.slug if course.category else None,
        "sort_order": course.sort_order,
        "status": course.status,
    }


def _collect_lessons_from_course(course: Course) -> list[Lesson]:
    """Flatten Course → Modules → Lessons into a single sorted list."""
    lessons: list[Lesson] = []
    for mod in sorted(course.modules, key=lambda m: m.sort_order):
        for lesson in sorted(mod.lessons, key=lambda l: l.sort_order):
            lessons.append(lesson)
    return lessons


def _eager_load_course_options():
    """Common selectinload chain for Course → Module → Lesson → children."""
    return [
        selectinload(Course.category),
        selectinload(Course.modules)
        .selectinload(Module.lessons)
        .selectinload(Lesson.quizzes)
        .selectinload(Quiz.questions),
        selectinload(Course.modules)
        .selectinload(Module.lessons)
        .selectinload(Lesson.media_assets),
        selectinload(Course.modules)
        .selectinload(Module.lessons)
        .selectinload(Lesson.module),
    ]


def _eager_load_course_with_content():
    """Eager-load chain that also includes LessonContent (for full view)."""
    return [
        selectinload(Course.category),
        selectinload(Course.modules)
        .selectinload(Module.lessons)
        .selectinload(Lesson.quizzes)
        .selectinload(Quiz.questions),
        selectinload(Course.modules)
        .selectinload(Module.lessons)
        .selectinload(Lesson.media_assets),
        selectinload(Course.modules)
        .selectinload(Module.lessons)
        .selectinload(Lesson.lesson_contents),
        selectinload(Course.modules)
        .selectinload(Module.lessons)
        .selectinload(Lesson.module)
        .selectinload(Module.course),
    ]


async def _overlay_localized_content(
    modules_list: list[dict],
    lang: str,
    session: AsyncSession,
) -> list[dict]:
    """Overlay translated text content onto module dicts for non-English lang.

    Looks up LessonContent rows for each lesson slug in the requested language
    and overwrites content fields. Falls back to English if no translation.
    """
    if lang == "en" or not lang:
        return modules_list

    lesson_slugs = [m["id"] for m in modules_list]
    if not lesson_slugs:
        return modules_list

    stmt = (
        select(LessonContent, Lesson.slug.label("lesson_slug"))
        .join(Lesson, LessonContent.lesson_id == Lesson.id)
        .where(Lesson.slug.in_(lesson_slugs), LessonContent.language == lang)
    )
    result = await session.execute(stmt)
    rows = result.all()

    trans_map: dict[str, LessonContent] = {}
    for lc, les_slug in rows:
        trans_map[les_slug] = lc

    content_fields = [
        "explanation", "example", "activity", "bengali_tip",
        "micro_grammar", "speaking_task", "vocab", "dialogue",
    ]

    for mod in modules_list:
        lc = trans_map.get(mod["id"])
        if not lc:
            continue

        if "content" in mod and isinstance(mod["content"], dict):
            for field in content_fields:
                val = getattr(lc, field, None)
                if val:
                    mod["content"][field] = val

        for field in content_fields:
            val = getattr(lc, field, None)
            if val and field in mod:
                mod[field] = val

        mod["_display_language"] = lang
        mod["_translation_status"] = lc.status or "draft"

    return modules_list


# ---------------------------------------------------------------------------
# 1. GET /content/tools — all courses with their lessons (flattened)
# ---------------------------------------------------------------------------

@router.get("/tools")
async def get_content_tools(session: AsyncSession = Depends(get_db)):
    """Get all tools (courses) with their lessons flattened into 'modules'."""
    stmt = (
        select(Course)
        .options(*_eager_load_course_options())
        .order_by(Course.sort_order)
    )
    result = await session.execute(stmt)
    courses = result.scalars().unique().all()

    tools = []
    for course in courses:
        tool = _serialize_tool(course)
        lessons = _collect_lessons_from_course(course)
        tool["modules"] = [
            _serialize_lesson_summary(les)
            for les in lessons
        ]
        tools.append(tool)

    return tools


# ---------------------------------------------------------------------------
# 2. GET /content/tools/{tool_id} — single course with full content
# ---------------------------------------------------------------------------

@router.get("/tools/{tool_id}")
async def get_content_tool(
    tool_id: str,
    lang: str = Query(default="en", max_length=5),
    session: AsyncSession = Depends(get_db),
):
    tool_id = sanitize_id(tool_id, "tool_id")

    stmt = (
        select(Course)
        .options(*_eager_load_course_with_content())
        .where(Course.slug == tool_id)
    )
    result = await session.execute(stmt)
    course = result.scalars().unique().first()
    if not course:
        raise HTTPException(status_code=404, detail="Tool not found")

    lang = lang.strip().lower()

    lesson_dicts = []
    for lesson in _collect_lessons_from_course(course):
        # Pick lesson content for the requested language, fallback to English
        lc = None
        en_lc = None
        for t in lesson.lesson_contents:
            if t.language == lang:
                lc = t
            if t.language == "en":
                en_lc = t
        lc = lc or en_lc

        lesson_dict = _serialize_lesson_full(lesson, lc)
        lesson_dict["tool_id"] = course.slug
        lesson_dicts.append(lesson_dict)

    # Overlay additional localized content (handles extra fields)
    lesson_dicts = await _overlay_localized_content(lesson_dicts, lang, session)

    tool = _serialize_tool(course)
    tool["modules"] = lesson_dicts
    return tool


# ---------------------------------------------------------------------------
# 3. GET /content/courses — published AI-generated courses
# ---------------------------------------------------------------------------

@router.get("/courses")
async def get_published_courses(session: AsyncSession = Depends(get_db)):
    """Get published courses filtered for AI-generated (tagged 'ai-generated')."""
    stmt = (
        select(Course)
        .options(*_eager_load_course_options())
        .where(Course.status == "published")
        .order_by(Course.created_at.desc())
    )
    result = await session.execute(stmt)
    all_courses = result.scalars().unique().all()

    courses_out = []
    for course in all_courses:
        is_ai_course = False
        if course.tags and isinstance(course.tags, list) and "ai-generated" in course.tags:
            is_ai_course = True
        if not is_ai_course:
            continue

        tool = _serialize_tool(course)

        # Build sections from modules, with lessons inside
        sections_out = []
        for mod in sorted(course.modules, key=lambda m: m.sort_order):
            mod_lessons = sorted(mod.lessons, key=lambda l: l.sort_order)
            lesson_summaries = [_serialize_lesson_summary(les) for les in mod_lessons]
            sections_out.append({
                "id": mod.slug,
                "title": mod.title,
                "sort_order": mod.sort_order,
                "lessons": lesson_summaries,
            })

        tool["sections"] = sections_out
        # Flatten lessons into "modules" for dual compat
        tool["modules"] = [
            _serialize_lesson_summary(les)
            for les in _collect_lessons_from_course(course)
        ]
        courses_out.append(tool)

    return courses_out


# ---------------------------------------------------------------------------
# 4. GET /content/courses/{course_id} — single course with full content
# ---------------------------------------------------------------------------

@router.get("/courses/{course_id}")
async def get_published_course(
    course_id: str,
    lang: str = Query(default="en", max_length=5),
    session: AsyncSession = Depends(get_db),
):
    """Get a single published course with full content for the JourneyPlayer."""
    course_id = sanitize_id(course_id, "course_id")
    lang = lang.strip().lower()

    stmt = (
        select(Course)
        .options(*_eager_load_course_with_content())
        .where(Course.slug == course_id, Course.status == "published")
    )
    result = await session.execute(stmt)
    course = result.scalars().unique().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    course_dict = _serialize_tool(course)

    sections_with_lessons = []
    for mod in sorted(course.modules, key=lambda m: m.sort_order):
        mod_lessons = []
        for lesson in sorted(mod.lessons, key=lambda l: l.sort_order):
            # Pick lesson content for language
            lc = None
            en_lc = None
            for t in lesson.lesson_contents:
                if t.language == lang:
                    lc = t
                if t.language == "en":
                    en_lc = t
            lc = lc or en_lc

            lesson_dict = {
                "id": lesson.slug,
                "tool_id": course_id,
                "title": lesson.title,
                "level": lesson.level,
                "minutes": lesson.estimated_minutes,
                "week": lesson.week,
                "day": lesson.day or lesson.sort_order,
                "isAdvanced": lesson.level == "advanced",
                "is_weekly_test": lesson.is_weekly_test,
                "description": ((lc.explanation or "")[:120]) if lc else "",
                "content": {
                    "explanation": lc.explanation or "" if lc else "",
                    "example": lc.example or "" if lc else "",
                    "activity": lc.activity or "" if lc else "",
                },
                "quiz": _serialize_quiz(lesson.quizzes[0]) if lesson.quizzes else {},
                # Exclude quiz-question images from study materials — those belong
                # to the quiz, not the learner-facing media list.
                "media_assets": [
                    _serialize_media_asset(a)
                    for a in sorted(lesson.media_assets, key=lambda a: a.sort_order)
                    if "quiz-question" not in (a.tags or [])
                ],
            }
            mod_lessons.append(lesson_dict)

        sections_with_lessons.append({
            "id": mod.slug,
            "title": mod.title,
            "sort_order": mod.sort_order,
            "lessons": mod_lessons,
        })

    course_dict["id"] = course_id
    course_dict["sections"] = sections_with_lessons
    return course_dict


# ---------------------------------------------------------------------------
# 5. GET /content/modules — list lessons (backward compat)
# ---------------------------------------------------------------------------

@router.get("/modules")
async def get_content_modules(
    tool_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """Return lesson-level items. For backward compat the endpoint is still /modules."""
    stmt = select(Lesson).options(
        selectinload(Lesson.module).selectinload(Module.course),
    )
    if tool_id:
        tool_id = sanitize_id(tool_id, "tool_id")
        stmt = (
            stmt.join(Module, Lesson.module_id == Module.id)
            .join(Course, Module.course_id == Course.id)
            .where(Course.slug == tool_id)
        )
    stmt = stmt.order_by(Lesson.sort_order)

    result = await session.execute(stmt)
    lessons = result.scalars().unique().all()

    return [
        {
            "id": les.slug,
            "tool_id": les.module.course.slug if les.module and les.module.course else None,
            "title": les.title,
            "description": les.description or "",
            "level": les.level,
            "minutes": les.estimated_minutes,
            "isAdvanced": les.level == "advanced",
            "sort_order": les.sort_order,
            "week": les.week,
            "day": les.day,
        }
        for les in lessons
    ]


# ---------------------------------------------------------------------------
# 6. GET /content/categories — list categories
# ---------------------------------------------------------------------------

@router.get("/categories")
async def get_content_categories(session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(Category).where(Category.is_active == True).order_by(Category.sort_order)  # noqa: E712
    )
    categories = result.scalars().all()
    if not categories:
        return CATEGORIES_DATA
    return [
        {
            "id": cat.slug,
            "name": cat.name,
            "description": cat.description,
            "icon": cat.icon,
            "sort_order": cat.sort_order,
        }
        for cat in categories
    ]


# ---------------------------------------------------------------------------
# 7. GET /content/categories/{category_id}/tools — courses by category
# ---------------------------------------------------------------------------

@router.get("/categories/{category_id}/tools")
async def get_content_tools_by_category(
    category_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Get tools (courses) filtered by category slug, with lessons."""
    category_id = sanitize_id(category_id, "category_id")

    stmt = (
        select(Course)
        .join(Category, Course.category_id == Category.id)
        .options(*_eager_load_course_options())
        .where(Category.slug == category_id)
        .order_by(Course.sort_order)
    )
    result = await session.execute(stmt)
    courses = result.scalars().unique().all()

    tools = []
    for course in courses:
        tool = _serialize_tool(course)
        lessons = _collect_lessons_from_course(course)
        tool["modules"] = [
            _serialize_lesson_summary(les)
            for les in lessons
        ]
        tools.append(tool)

    return tools


# ---------------------------------------------------------------------------
# 8. GET /content/media/{asset_id} — redirect to cloudinary URL
# ---------------------------------------------------------------------------

@router.get("/media/{asset_id}")
async def get_media(asset_id: str, session: AsyncSession = Depends(get_db)):
    """Redirect to the Cloudinary URL for the given media asset."""
    try:
        asset_pk = int(asset_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid asset ID")

    result = await session.execute(
        select(MediaAsset).where(MediaAsset.id == asset_pk)
    )
    asset = result.scalars().first()
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")

    return RedirectResponse(url=asset.cloudinary_url)
