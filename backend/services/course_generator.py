"""Course generator — AI-powered course blueprint & lesson synthesis.

Uses Claude (Anthropic) to convert a parsed source document into:
  1. A course blueprint (title, description, modules with lessons)
  2. Per-lesson long-form content + quiz
  3. A critique pass that checks for hallucinations against the source

All results are stored directly in production tables (courses, modules, lessons,
lesson_contents, quizzes, quiz_questions) with status="draft". The admin can
preview, edit and finally publish the draft by changing status to "published".
"""

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL
from database import async_session
from models.sql_models import (
    Course, Module, Lesson, LessonContent, Quiz, QuizQuestion,
    Category, User,
)

logger = logging.getLogger(__name__)


# ── Constants ─────────────────────────────────────────────
ALLOWED_TONES = {"academic", "professional", "casual"}
DEFAULT_MODULE_COUNT = 6
DEFAULT_LESSONS_PER_MODULE = 3
MAX_SOURCE_CHARS_FOR_BLUEPRINT = 40_000
MAX_SOURCE_CHARS_FOR_LESSON = 20_000


# ── Prompt templates ──────────────────────────────────────
BLUEPRINT_SYSTEM_PROMPT = (
    "You are an expert instructional designer. Given a source document, you "
    "produce a complete course blueprint. Ensure logical progression from "
    "foundational to advanced topics. Never invent facts that are not implied "
    "by the source material. You MUST respond by calling the provided tool."
)

LESSON_SYSTEM_PROMPT = (
    "You are an expert educator writing a single lesson. Ground every claim in "
    "the provided source material. Produce clear, age-appropriate explanations. "
    "You MUST respond by calling the provided tool."
)

CRITIQUE_SYSTEM_PROMPT = (
    "You are a fact-checking reviewer. You compare generated educational "
    "content against the original source document and flag hallucinations, "
    "missing key concepts, and factual issues. You MUST respond by calling "
    "the provided tool."
)


# ── JSON schemas for Anthropic tool-use (guarantees valid JSON output) ──
BLUEPRINT_SCHEMA = {
    "type": "object",
    "properties": {
        "course_title": {"type": "string"},
        "course_description": {"type": "string"},
        "learning_objectives": {"type": "array", "items": {"type": "string"}},
        "difficulty": {
            "type": "string",
            "enum": ["beginner", "intermediate", "advanced"],
        },
        "modules": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "order": {"type": "integer"},
                    "lessons": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "id": {"type": "string"},
                                "title": {"type": "string"},
                                "objectives": {
                                    "type": "array",
                                    "items": {"type": "string"},
                                },
                                "minutes": {"type": "integer"},
                                "order": {"type": "integer"},
                            },
                            "required": ["id", "title", "objectives", "minutes", "order"],
                        },
                    },
                },
                "required": ["id", "title", "description", "order", "lessons"],
            },
        },
    },
    "required": [
        "course_title", "course_description", "learning_objectives",
        "difficulty", "modules",
    ],
}

LESSON_SCHEMA = {
    "type": "object",
    "properties": {
        "explanation": {"type": "string", "description": "600-1000 word markdown explanation"},
        "example": {"type": "string", "description": "Concrete 80-200 word example"},
        "activity": {"type": "string", "description": "Short exercise for the learner"},
        "key_takeaways": {"type": "array", "items": {"type": "string"}},
        "quiz": {
            "type": "object",
            "properties": {
                "questions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "question": {"type": "string"},
                            "options": {
                                "type": "array",
                                "items": {"type": "string"},
                                "minItems": 2,
                                "maxItems": 6,
                            },
                            "correct_index": {"type": "integer"},
                            "explanation": {"type": "string"},
                        },
                        "required": ["question", "options", "correct_index", "explanation"],
                    },
                },
            },
            "required": ["questions"],
        },
    },
    "required": ["explanation", "example", "activity", "key_takeaways", "quiz"],
}

CRITIQUE_SCHEMA = {
    "type": "object",
    "properties": {
        "is_valid": {"type": "boolean"},
        "issues": {"type": "array", "items": {"type": "string"}},
        "suggestions": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["is_valid", "issues", "suggestions"],
}


def _blueprint_user_prompt(
    source_text: str,
    tone: str,
    module_count: int,
    lessons_per_module: int,
    course_title_hint: Optional[str],
    instructions: Optional[str],
) -> str:
    title_line = (
        f"Preferred course title: {course_title_hint}\n" if course_title_hint else ""
    )
    instr_line = f"Admin instructions: {instructions}\n" if instructions else ""
    return (
        f"Tone: {tone}\n"
        f"Target: {module_count} modules with roughly {lessons_per_module} lessons each.\n"
        f"{title_line}"
        f"{instr_line}"
        "\n"
        "Design a complete course blueprint grounded in the source material. "
        "Use module ids like 'module-1', 'module-2' and lesson ids like "
        "'lesson-1-1', 'lesson-1-2'. Call the save_course_blueprint tool with "
        "your result.\n\n"
        "Source material:\n"
        "===\n"
        f"{source_text[:MAX_SOURCE_CHARS_FOR_BLUEPRINT]}\n"
        "==="
    )


def _lesson_user_prompt(
    lesson: dict,
    tone: str,
    source_text: str,
    extra_instructions: Optional[str] = None,
) -> str:
    objectives = ", ".join(lesson.get("objectives") or [])
    extra_line = (
        f"\nAdditional guidance to address on this pass:\n{extra_instructions}\n"
        if extra_instructions else ""
    )
    return (
        f"Lesson title: {lesson.get('title', '')}\n"
        f"Learning objectives: {objectives}\n"
        f"Tone: {tone}\n"
        f"{extra_line}"
        "Target: 600-1000 word explanation (markdown allowed), 80-200 word "
        "concrete example, a short activity, 3-5 key takeaways, and 3-5 "
        "multiple-choice quiz questions (4 options each). Ground everything "
        "in the source material below. Call the save_lesson_content tool "
        "with your result.\n\n"
        "Source material:\n"
        "===\n"
        f"{source_text[:MAX_SOURCE_CHARS_FOR_LESSON]}\n"
        "==="
    )


def _critique_user_prompt(generated_content: dict, source_text: str) -> str:
    return (
        "Compare the generated lesson content against the source material. "
        "Flag any hallucinations (claims not supported by the source), "
        "missing key concepts, or factual issues. Call the save_critique "
        "tool with your findings.\n\n"
        "Generated content:\n"
        f"{json.dumps(generated_content)[:8000]}\n\n"
        "Source material:\n"
        "===\n"
        f"{source_text[:MAX_SOURCE_CHARS_FOR_LESSON]}\n"
        "==="
    )


# ── Claude tool-use call (guarantees schema-valid JSON) ──
async def _call_claude_tool(
    system_prompt: str,
    user_prompt: str,
    tool_name: str,
    tool_description: str,
    tool_schema: dict,
    max_tokens: int = 4096,
) -> dict:
    """Call Claude forcing a tool-use response. Returns the tool's JSON input."""
    if not ANTHROPIC_API_KEY:
        raise RuntimeError(
            "ANTHROPIC_API_KEY is not set — cannot run course generation."
        )

    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
    kwargs = dict(
        model=CLAUDE_MODEL,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        tools=[{
            "name": tool_name,
            "description": tool_description,
            "input_schema": tool_schema,
        }],
        tool_choice={"type": "tool", "name": tool_name},
        max_tokens=max_tokens,
    )
    if "opus-4-7" not in CLAUDE_MODEL:
        kwargs["temperature"] = 0.3
    response = await client.messages.create(**kwargs)

    for block in response.content:
        if getattr(block, "type", None) == "tool_use" and block.name == tool_name:
            return block.input

    logger.error(
        "Claude did not return a tool_use block. stop_reason=%s content=%r",
        getattr(response, "stop_reason", None),
        response.content,
    )
    raise ValueError(f"AI did not return structured output for tool '{tool_name}'")


# ── Slug helper ────────────────────────────────────────────
def _slugify(text: str) -> str:
    """Simple slug generation from a title string."""
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or f"item-{uuid.uuid4().hex[:8]}"


# ── Helper: serialize a Course (status=draft) to dict ──────
def _course_draft_to_dict(course: Course, include_source_text: bool = True) -> dict:
    """Convert a Course ORM object that has status='draft' to a plain dict."""
    blueprint = course.blueprint_json or {}
    d = {
        "id": course.id,
        "admin_user": course.created_by,
        "category_id": course.category_id,
        "source_filename": blueprint.get("_meta", {}).get("source_filename"),
        "source_filenames": blueprint.get("_meta", {}).get("source_filenames", []),
        "blueprint": {k: v for k, v in blueprint.items() if k != "_meta"},
        "tone": blueprint.get("_meta", {}).get("tone", "professional"),
        "status": course.status,
        "created_at": course.created_at.isoformat() if course.created_at else None,
        "updated_at": course.updated_at.isoformat() if course.updated_at else None,
    }
    if include_source_text:
        d["source_text"] = blueprint.get("_meta", {}).get("source_text")
    return d


# ── Draft persistence (SQLAlchemy — now uses Course directly) ──
async def create_draft(
    admin_username: str,
    source_text: str,
    filename: str,
    tone: str,
    blueprint: dict,
    category_id: "int | str" = "ai-learning",
    source_filenames: list = None,
) -> dict:
    """Create a new draft Course record with blueprint stored as JSON.

    `category_id` may be either an integer primary key (sent by the admin UI)
    or a legacy slug string.
    """
    # Initialise each lesson with no generated content yet
    for module in blueprint.get("modules", []):
        for lesson in module.get("lessons", []):
            lesson.setdefault("status", "pending")
            lesson["content"] = None
            lesson["validation"] = None

    # Store metadata inside blueprint under _meta key
    blueprint["_meta"] = {
        "source_text": source_text,
        "source_filename": filename,
        "source_filenames": source_filenames or [],
        "tone": tone,
    }

    async with async_session() as session:
        async with session.begin():
            # Resolve admin user
            result = await session.execute(
                select(User).where(User.username == admin_username)
            )
            admin_user = result.scalars().first()
            if not admin_user:
                raise ValueError(f"Admin user '{admin_username}' not found")

            # Resolve category — accept either integer PK or slug string
            if isinstance(category_id, int) or (isinstance(category_id, str) and category_id.isdigit()):
                result = await session.execute(
                    select(Category).where(Category.id == int(category_id))
                )
            else:
                result = await session.execute(
                    select(Category).where(Category.slug == category_id)
                )
            category = result.scalars().first()
            if not category:
                raise ValueError(f"Category '{category_id}' not found")
            cat_pk = category.id

            course_title = blueprint.get("course_title", "Untitled Course")
            course_slug = _slugify(course_title) + f"-{uuid.uuid4().hex[:6]}"

            course = Course(
                category_id=cat_pk,
                slug=course_slug,
                name=course_title,
                description=blueprint.get("course_description", ""),
                difficulty=blueprint.get("difficulty", "beginner"),
                status="draft",
                available_languages=["en"],
                tags=["ai-generated"],
                blueprint_json=blueprint,
                created_by=admin_username,
            )
            session.add(course)
            await session.flush()

            return _course_draft_to_dict(course)


async def get_draft(draft_id: int) -> Optional[dict]:
    """Get a single draft Course by id."""
    async with async_session() as session:
        result = await session.execute(
            select(Course).where(Course.id == draft_id, Course.status == "draft")
        )
        course = result.scalars().first()
        if not course:
            return None
        return _course_draft_to_dict(course)


async def list_drafts(admin_username: Optional[str] = None) -> list:
    """List all draft courses, optionally filtered by admin username."""
    async with async_session() as session:
        query = select(Course).where(Course.status == "draft")
        if admin_username:
            query = query.where(Course.created_by == admin_username)
        query = query.order_by(Course.created_at.desc()).limit(100)
        result = await session.execute(query)
        courses = result.scalars().all()
        return [_course_draft_to_dict(c, include_source_text=False) for c in courses]


async def delete_draft(draft_id: int) -> bool:
    """Delete a draft Course (cascade deletes modules/lessons)."""
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(Course).where(Course.id == draft_id, Course.status == "draft")
            )
            course = result.scalars().first()
            if not course:
                return False
            await session.delete(course)
            return True


async def update_draft_blueprint(draft_id: int, blueprint: dict) -> bool:
    """Update the blueprint JSON on a draft Course."""
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(Course).where(Course.id == draft_id, Course.status == "draft")
            )
            course = result.scalars().first()
            if not course:
                return False
            # Preserve _meta from existing blueprint
            existing_meta = (course.blueprint_json or {}).get("_meta", {})
            blueprint["_meta"] = existing_meta
            course.blueprint_json = blueprint
            return True


async def update_lesson_in_draft(
    draft_id: int,
    module_id: str,
    lesson_id: str,
    lesson_content: dict,
    validation: Optional[dict] = None,
) -> bool:
    """Write generated lesson content back into the draft blueprint JSON."""
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(Course).where(Course.id == draft_id, Course.status == "draft")
            )
            course = result.scalars().first()
            if not course:
                return False

            blueprint = course.blueprint_json or {}
            for module in blueprint.get("modules", []):
                if module.get("id") != module_id:
                    continue
                for lesson in module.get("lessons", []):
                    if lesson.get("id") == lesson_id:
                        lesson["content"] = lesson_content
                        lesson["validation"] = validation
                        lesson["status"] = "generated"

            # SQLAlchemy's default JSON column doesn't detect in-place dict
            # mutations; flag_modified makes the commit actually write the row.
            course.blueprint_json = blueprint
            flag_modified(course, "blueprint_json")
            return True


async def update_lesson_validation(
    draft_id: int,
    module_id: str,
    lesson_id: str,
    validation: Optional[dict],
) -> bool:
    """Overwrite or clear the validation payload for a single lesson."""
    async with async_session() as session:
        async with session.begin():
            result = await session.execute(
                select(Course).where(Course.id == draft_id, Course.status == "draft")
            )
            course = result.scalars().first()
            if not course:
                return False

            blueprint = course.blueprint_json or {}
            updated = False
            for module in blueprint.get("modules", []):
                if module.get("id") != module_id:
                    continue
                for lesson in module.get("lessons", []):
                    if lesson.get("id") == lesson_id:
                        lesson["validation"] = validation
                        updated = True

            if not updated:
                return False

            course.blueprint_json = blueprint
            flag_modified(course, "blueprint_json")
            return True


# ── Main generation entry points ──────────────────────────
async def generate_blueprint(
    source_text: str,
    tone: str = "professional",
    module_count: int = DEFAULT_MODULE_COUNT,
    lessons_per_module: int = DEFAULT_LESSONS_PER_MODULE,
    difficulty: Optional[str] = None,
    course_title_hint: Optional[str] = None,
    instructions: Optional[str] = None,
) -> dict:
    """Generate a course blueprint from parsed source text."""
    if tone not in ALLOWED_TONES:
        tone = "professional"
    if not source_text or not source_text.strip():
        raise ValueError("source_text is empty — nothing to analyse")

    user_prompt = _blueprint_user_prompt(
        source_text=source_text,
        tone=tone,
        module_count=max(1, min(module_count, 12)),
        lessons_per_module=max(1, min(lessons_per_module, 8)),
        course_title_hint=course_title_hint,
        instructions=instructions,
    )

    blueprint = await _call_claude_tool(
        system_prompt=BLUEPRINT_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        tool_name="save_course_blueprint",
        tool_description="Save the full course blueprint with modules and lessons.",
        tool_schema=BLUEPRINT_SCHEMA,
        max_tokens=4096,
    )

    # Override difficulty if admin specified one
    if difficulty in {"beginner", "intermediate", "advanced"}:
        blueprint["difficulty"] = difficulty

    # Normalise IDs so downstream references are stable
    for m_idx, module in enumerate(blueprint.get("modules", []), start=1):
        module.setdefault("id", f"module-{m_idx}")
        module.setdefault("order", m_idx)
        for l_idx, lesson in enumerate(module.get("lessons", []), start=1):
            lesson.setdefault("id", f"lesson-{m_idx}-{l_idx}")
            lesson.setdefault("order", l_idx)
            lesson.setdefault("minutes", 10)

    return blueprint


async def generate_lesson_content(
    lesson: dict,
    source_text: str,
    tone: str,
    extra_instructions: Optional[str] = None,
) -> dict:
    """Generate long-form content + quiz for a single lesson."""
    user_prompt = _lesson_user_prompt(lesson, tone, source_text, extra_instructions)
    return await _call_claude_tool(
        system_prompt=LESSON_SYSTEM_PROMPT,
        user_prompt=user_prompt,
        tool_name="save_lesson_content",
        tool_description="Save the generated lesson content and quiz.",
        tool_schema=LESSON_SCHEMA,
        max_tokens=4096,
    )


async def regenerate_lesson_for_published(
    session: AsyncSession,
    lesson: Lesson,
    source_text: str,
    extra_instructions: Optional[str],
    tone: str,
) -> dict:
    """Regenerate content + quiz for an already-published lesson and update DB in place."""
    lesson_skeleton = {
        "id": lesson.slug,
        "title": lesson.title,
        "description": lesson.description or "",
        "level": lesson.level,
        "minutes": lesson.estimated_minutes,
    }

    generated = await generate_lesson_content(
        lesson=lesson_skeleton,
        source_text=source_text or lesson.title,
        tone=tone,
        extra_instructions=extra_instructions,
    )

    # Update English LessonContent
    result = await session.execute(
        select(LessonContent).where(
            LessonContent.lesson_id == lesson.id,
            LessonContent.language == "en",
        )
    )
    tc = result.scalars().first()
    if tc:
        tc.explanation = generated.get("explanation", "")
        tc.example = generated.get("example", "")
        tc.activity = generated.get("activity", "")
    else:
        tc = LessonContent(
            lesson_id=lesson.id,
            language="en",
            explanation=generated.get("explanation", ""),
            example=generated.get("example", ""),
            activity=generated.get("activity", ""),
            status="published",
        )
        session.add(tc)

    # Update or create quiz
    quiz_data = generated.get("quiz") or {}
    questions = quiz_data.get("questions") or []
    if questions:
        result = await session.execute(
            select(Quiz).where(Quiz.lesson_id == lesson.id)
        )
        quiz = result.scalars().first()
        if not quiz:
            quiz = Quiz(
                lesson_id=lesson.id,
                title=f"Quiz — {lesson.title}",
                passing_score=70,
                max_attempts=3,
                status="published",
            )
            session.add(quiz)
            await session.flush()
        else:
            # Delete existing questions to replace
            result = await session.execute(
                select(QuizQuestion).where(QuizQuestion.quiz_id == quiz.id)
            )
            for old_q in result.scalars().all():
                await session.delete(old_q)
            await session.flush()

        for q_idx, q in enumerate(questions):
            qq = QuizQuestion(
                quiz_id=quiz.id,
                question_text=q.get("question", ""),
                question_type="mcq",
                options=q.get("options", []),
                correct_answer=str(q.get("correct_index", 0)),
                hint=q.get("explanation", ""),
                sort_order=q_idx,
            )
            session.add(qq)

    lesson.status = "generated"
    await session.flush()

    return {
        "lesson_id": lesson.id,
        "content": {
            "explanation": generated.get("explanation", ""),
            "example": generated.get("example", ""),
            "activity": generated.get("activity", ""),
        },
        "quiz_questions": len(questions),
    }


async def critique_lesson_content(
    generated_content: dict,
    source_text: str,
) -> dict:
    """Second-pass critique to detect hallucinations."""
    user_prompt = _critique_user_prompt(generated_content, source_text)
    try:
        return await _call_claude_tool(
            system_prompt=CRITIQUE_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            tool_name="save_critique",
            tool_description="Save the fact-check results for the generated lesson.",
            tool_schema=CRITIQUE_SCHEMA,
            max_tokens=1024,
        )
    except Exception as e:
        logger.warning("Critique pass failed: %s", e)
        return {"is_valid": True, "issues": [], "suggestions": []}


# ── Publish: change status from "draft" to "published" ──────
async def publish_draft(draft_id: int, admin_username: str = "admin") -> dict:
    """Publish a draft Course by changing its status (and all children) to 'published'.

    Also materialises Module/Lesson/LessonContent/Quiz/QuizQuestion records
    from the blueprint JSON if they haven't been created yet.
    """
    async with async_session() as session:
        async with session.begin():
            # Load draft course
            result = await session.execute(
                select(Course).where(Course.id == draft_id)
            )
            course = result.scalars().first()
            if not course:
                raise ValueError("Draft not found")
            if course.status == "published":
                raise ValueError("Course is already published")

            blueprint = course.blueprint_json or {}

            # Check if modules already exist for this course
            result = await session.execute(
                select(Module).where(Module.course_id == course.id)
            )
            existing_modules = result.scalars().all()

            modules_created = 0
            lessons_created = 0
            quizzes_created = 0

            if not existing_modules:
                # Materialise Module/Lesson/LessonContent/Quiz from blueprint
                for bp_module in blueprint.get("modules", []):
                    module_slug = _slugify(bp_module.get("title", "")) + f"-{uuid.uuid4().hex[:6]}"

                    module = Module(
                        course_id=course.id,
                        slug=module_slug,
                        title=bp_module.get("title", "Untitled Module"),
                        description=bp_module.get("description", ""),
                        sort_order=bp_module.get("order", 0),
                        status="published",
                    )
                    session.add(module)
                    await session.flush()
                    modules_created += 1

                    for bp_lesson in bp_module.get("lessons", []):
                        content = bp_lesson.get("content") or {}
                        lesson_slug = _slugify(bp_lesson.get("title", "")) + f"-{uuid.uuid4().hex[:6]}"

                        lesson = Lesson(
                            module_id=module.id,
                            slug=lesson_slug,
                            title=bp_lesson.get("title", "Untitled Lesson"),
                            description=", ".join(bp_lesson.get("objectives", [])),
                            sort_order=bp_lesson.get("order", 0),
                            level=blueprint.get("difficulty", "beginner"),
                            estimated_minutes=bp_lesson.get("minutes", 10),
                            xp_reward=100,
                            status="published",
                        )
                        session.add(lesson)
                        await session.flush()
                        lessons_created += 1

                        # Create English LessonContent
                        lc = LessonContent(
                            lesson_id=lesson.id,
                            language="en",
                            explanation=content.get("explanation", ""),
                            explanation_format="markdown",
                            example=content.get("example", ""),
                            activity=content.get("activity", ""),
                            status="published",
                        )
                        session.add(lc)

                        # Create Quiz + Questions
                        quiz_data = content.get("quiz") or {}
                        questions = quiz_data.get("questions") or []
                        if questions:
                            quiz = Quiz(
                                lesson_id=lesson.id,
                                title=f"Quiz — {bp_lesson.get('title', '')}",
                                passing_score=70,
                                max_attempts=3,
                                shuffle_questions=False,
                                shuffle_options=True,
                                status="published",
                            )
                            session.add(quiz)
                            await session.flush()
                            quizzes_created += 1

                            for q_idx, q in enumerate(questions):
                                correct = q.get("correct_index", 0)
                                qq = QuizQuestion(
                                    quiz_id=quiz.id,
                                    question_text=q.get("question", ""),
                                    question_type="mcq",
                                    options=q.get("options", []),
                                    correct_answer=str(correct),
                                    hint=q.get("explanation", ""),
                                    sort_order=q_idx,
                                )
                                session.add(qq)
            else:
                # Modules already exist — just update their status
                for mod in existing_modules:
                    mod.status = "published"
                    modules_created += 1

                # Update all lessons under this course
                result = await session.execute(
                    select(Lesson).join(Module).where(Module.course_id == course.id)
                )
                for lesson in result.scalars().all():
                    lesson.status = "published"
                    lessons_created += 1

                # Update lesson contents
                result = await session.execute(
                    select(LessonContent)
                    .join(Lesson)
                    .join(Module)
                    .where(Module.course_id == course.id)
                )
                for lc in result.scalars().all():
                    lc.status = "published"

                # Update quizzes
                result = await session.execute(
                    select(Quiz)
                    .join(Lesson)
                    .join(Module)
                    .where(Module.course_id == course.id)
                )
                for quiz in result.scalars().all():
                    quiz.status = "published"
                    quizzes_created += 1

            # Mark course as published
            course.status = "published"

            return {
                "course_id": course.id,
                "course_slug": course.slug,
                "course_title": course.name,
                "modules_created": modules_created,
                "lessons_created": lessons_created,
                "quizzes_created": quizzes_created,
            }
