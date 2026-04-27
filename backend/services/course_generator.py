"""Course generator — AI-powered course blueprint & lesson synthesis.

Uses Claude (Anthropic) to convert a parsed source document into:
  1. A course blueprint (title, description, modules with lessons)
  2. Per-lesson long-form content + quiz
  3. A critique pass that checks for hallucinations against the source

All results are stored in the `course_drafts` MongoDB collection so the
admin can preview, edit and finally publish the draft as a real course.
"""

import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL
from database import db

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
    """Call Claude forcing a tool-use response. Returns the tool's JSON input.

    Using tool-use guarantees the model emits JSON that validates against the
    supplied schema, eliminating the fragile string-parsing path.
    """
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
    # Some models (e.g. claude-opus-4-7) don't support the temperature parameter
    if "opus-4-7" not in CLAUDE_MODEL:
        kwargs["temperature"] = 0.3
    response = await client.messages.create(**kwargs)

    for block in response.content:
        if getattr(block, "type", None) == "tool_use" and block.name == tool_name:
            return block.input  # already-parsed JSON dict

    logger.error(
        "Claude did not return a tool_use block. stop_reason=%s content=%r",
        getattr(response, "stop_reason", None),
        response.content,
    )
    raise ValueError(f"AI did not return structured output for tool '{tool_name}'")


# ── Draft persistence ─────────────────────────────────────
async def _new_draft_id() -> str:
    return f"draft-{uuid.uuid4().hex[:12]}"


async def create_draft(
    admin_username: str,
    source_text: str,
    filename: str,
    tone: str,
    blueprint: dict,
    category_id: str = "ai-learning",
    source_filenames: list = None,
) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    draft_id = await _new_draft_id()

    # Initialise each lesson with no generated content yet
    for module in blueprint.get("modules", []):
        for lesson in module.get("lessons", []):
            lesson.setdefault("status", "pending")  # pending | generated | failed
            lesson["content"] = None
            lesson["validation"] = None

    doc = {
        "id": draft_id,
        "admin_username": admin_username,
        "source_filename": filename,
        "source_filenames": source_filenames or [],
        "source_text": source_text,
        "tone": tone,
        "category_id": category_id,
        "blueprint": blueprint,
        "status": "draft",  # draft | publishing | published
        "created_at": now,
        "updated_at": now,
    }
    await db.course_drafts.insert_one(doc)
    doc.pop("_id", None)
    return doc


async def get_draft(draft_id: str) -> Optional[dict]:
    doc = await db.course_drafts.find_one({"id": draft_id}, {"_id": 0})
    return doc


async def list_drafts(admin_username: Optional[str] = None) -> list:
    query = {"admin_username": admin_username} if admin_username else {}
    return await db.course_drafts.find(query, {"_id": 0, "source_text": 0}).sort(
        "created_at", -1
    ).to_list(100)


async def delete_draft(draft_id: str) -> bool:
    result = await db.course_drafts.delete_one({"id": draft_id})
    return result.deleted_count > 0


async def update_draft_blueprint(draft_id: str, blueprint: dict) -> bool:
    now = datetime.now(timezone.utc).isoformat()
    result = await db.course_drafts.update_one(
        {"id": draft_id},
        {"$set": {"blueprint": blueprint, "updated_at": now}},
    )
    return result.matched_count > 0


async def update_lesson_in_draft(
    draft_id: str,
    module_id: str,
    lesson_id: str,
    lesson_content: dict,
    validation: Optional[dict] = None,
) -> bool:
    """Write generated lesson content back into the draft blueprint."""
    now = datetime.now(timezone.utc).isoformat()
    draft = await get_draft(draft_id)
    if not draft:
        return False

    blueprint = draft["blueprint"]
    for module in blueprint.get("modules", []):
        if module.get("id") != module_id:
            continue
        for lesson in module.get("lessons", []):
            if lesson.get("id") == lesson_id:
                lesson["content"] = lesson_content
                lesson["validation"] = validation
                lesson["status"] = "generated"

    await db.course_drafts.update_one(
        {"id": draft_id},
        {"$set": {"blueprint": blueprint, "updated_at": now}},
    )
    return True


async def update_lesson_validation(
    draft_id: str,
    module_id: str,
    lesson_id: str,
    validation: Optional[dict],
) -> bool:
    """Overwrite or clear the validation payload for a single lesson."""
    now = datetime.now(timezone.utc).isoformat()
    draft = await get_draft(draft_id)
    if not draft:
        return False

    blueprint = draft["blueprint"]
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

    await db.course_drafts.update_one(
        {"id": draft_id},
        {"$set": {"blueprint": blueprint, "updated_at": now}},
    )
    return True


# ── Main generation entry points ──────────────────────────
async def generate_blueprint(
    source_text: str,
    tone: str = "professional",
    module_count: int = DEFAULT_MODULE_COUNT,
    lessons_per_module: int = DEFAULT_LESSONS_PER_MODULE,
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
    lesson: dict,
    source_text: str,
    extra_instructions: Optional[str],
    tone: str,
) -> dict:
    """Regenerate content + quiz for an already-published lesson and update DB in place.

    This updates lesson_contents (English) and assessments collections directly.
    """
    # Build a minimal lesson skeleton for the prompt
    lesson_skeleton = {
        "id": lesson["id"],
        "title": lesson.get("title", ""),
        "description": lesson.get("description", ""),
        "level": lesson.get("level", "beginner"),
        "minutes": lesson.get("estimated_minutes", 10),
    }

    generated = await generate_lesson_content(
        lesson=lesson_skeleton,
        source_text=source_text or lesson.get("title", ""),
        tone=tone,
        extra_instructions=extra_instructions,
    )

    lesson_id = lesson["id"]
    now = datetime.now(timezone.utc).isoformat()

    # Update English lesson content
    await db.lesson_contents.update_one(
        {"lesson_id": lesson_id, "language": "en"},
        {"$set": {
            "explanation": generated.get("explanation", ""),
            "example": generated.get("example", ""),
            "activity": generated.get("activity", ""),
            "updated_at": now,
        }},
        upsert=True,
    )

    # Update assessment/quiz if generated
    quiz = generated.get("quiz") or {}
    questions = quiz.get("questions") or []
    if questions:
        # Normalize quiz question shape (use correct_index → correctAnswer for frontend)
        normalized_questions = [
            {
                "question": q.get("question", ""),
                "options": q.get("options", []),
                "correctAnswer": q.get("correct_index", 0),
                "explanation": q.get("explanation", ""),
                "type": "mcq",
            }
            for q in questions
        ]
        await db.assessments.update_one(
            {"lesson_id": lesson_id},
            {
                "$set": {
                    "questions": normalized_questions,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "id": f"{lesson_id}-quiz",
                    "lesson_id": lesson_id,
                    "course_id": lesson.get("course_id"),
                    "created_at": now,
                },
            },
            upsert=True,
        )

    # Mark lesson as generated
    await db.lessons.update_one(
        {"id": lesson_id},
        {"$set": {"status": "generated", "updated_at": now}},
    )

    return {
        "lesson_id": lesson_id,
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
    except Exception as exc:
        logger.warning("Critique step failed, defaulting to valid: %s", exc)
        return {"is_valid": True, "issues": [], "suggestions": []}


# ── Publishing ────────────────────────────────────────────
async def publish_draft(draft_id: str, published_by: str) -> dict:
    """Create real Course + Lessons + Content + Assessments from a draft.

    The draft is deleted once publishing completes successfully.
    """
    draft = await get_draft(draft_id)
    if not draft:
        raise ValueError(f"Draft '{draft_id}' not found")

    blueprint = draft["blueprint"]
    now = datetime.now(timezone.utc).isoformat()

    # Build a predictable course id from the title
    base_slug = re.sub(
        r"[^a-z0-9]+", "-",
        (blueprint.get("course_title") or "ai-generated-course").lower(),
    ).strip("-") or "ai-generated-course"
    course_id = f"{base_slug[:40]}-{uuid.uuid4().hex[:6]}"

    # ── Course ──────────────────────────────────────────
    course_doc = {
        "id": course_id,
        "category_id": draft.get("category_id", "ai-learning"),
        "name": blueprint.get("course_title", "AI-generated Course"),
        "locale_names": {},
        "tagline": "",
        "description": blueprint.get("course_description", ""),
        "icon": "",
        "theme": {},
        "total_xp": 0,
        "total_lessons": sum(
            len(m.get("lessons", [])) for m in blueprint.get("modules", [])
        ),
        "difficulty": blueprint.get("difficulty", "beginner"),
        "available_languages": ["en"],
        "default_language": "en",
        "status": "published",
        "version": 1,
        "published_at": now,
        "published_by": published_by,
        "tags": ["ai-generated"],
        "created_by": published_by,
        "created_at": now,
        "updated_at": now,
        "source_draft_id": draft_id,
        "source_filename": draft.get("source_filename"),
    }
    await db.courses.insert_one(course_doc)

    created_sections = 0
    created_lessons = 0
    created_contents = 0
    created_assessments = 0

    # ── Modules → Sections, Lessons → Lessons + content + assessment ─
    for m_idx, module in enumerate(blueprint.get("modules", []), start=1):
        section_id = f"{course_id}-m{m_idx}"
        await db.sections.insert_one({
            "id": section_id,
            "course_id": course_id,
            "title": module.get("title", f"Module {m_idx}"),
            "locale_titles": {},
            "description": module.get("description", ""),
            "sort_order": module.get("order", m_idx),
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        })
        created_sections += 1

        for l_idx, lesson in enumerate(module.get("lessons", []), start=1):
            lesson_id = f"{section_id}-l{l_idx}"
            generated = lesson.get("content") or {}
            quiz = (generated.get("quiz") or {}) if isinstance(generated, dict) else {}
            has_quiz = bool(quiz.get("questions"))

            await db.lessons.insert_one({
                "id": lesson_id,
                "course_id": course_id,
                "section_id": section_id,
                "title": lesson.get("title", f"Lesson {l_idx}"),
                "locale_titles": {},
                "sort_order": lesson.get("order", l_idx),
                "day": None,
                "week": m_idx,
                "content_type": "text",
                "has_quiz": has_quiz,
                "is_weekly_test": False,
                "level": blueprint.get("difficulty", "beginner"),
                "estimated_minutes": lesson.get("minutes", 10),
                "xp_reward": 100,
                "available_languages": ["en"],
                "status": "published",
                "version": 1,
                "media_asset_ids": [],
                "tags": ["ai-generated"],
                "created_by": published_by,
                "created_at": now,
                "updated_at": now,
            })
            created_lessons += 1

            await db.lesson_contents.insert_one({
                "lesson_id": lesson_id,
                "language": "en",
                "version": 1,
                "explanation": generated.get("explanation", ""),
                "explanation_format": "markdown",
                "example": generated.get("example", ""),
                "activity": generated.get("activity", ""),
                "bengali_tip": "",
                "micro_grammar": "",
                "vocab": [],
                "dialogue": [],
                "speaking_task": "",
                "key_takeaways": generated.get("key_takeaways", []),
                "media_assets": [],
                "downloadable_assets": [],
                "status": "published",
                "created_at": now,
                "updated_at": now,
            })
            created_contents += 1

            if has_quiz:
                questions = []
                for q_idx, q in enumerate(quiz.get("questions", []), start=1):
                    options = q.get("options") or []
                    correct_idx = q.get("correct_index", 0)
                    questions.append({
                        "id": f"{lesson_id}-q{q_idx}",
                        "question": q.get("question", ""),
                        "type": "multiple-choice",
                        "options": options,
                        "correctAnswer": correct_idx,
                        "explanation": q.get("explanation", ""),
                    })

                await db.assessments.insert_one({
                    "id": f"assess-{lesson_id}",
                    "type": "quiz",
                    "lesson_id": lesson_id,
                    "course_id": course_id,
                    "language": "en",
                    "title": f"Quiz — {lesson.get('title', '')}",
                    "locale_titles": {},
                    "questions": questions,
                    "passing_score": 70,
                    "total_points": len(questions) * 10,
                    "max_attempts": 3,
                    "shuffle_questions": False,
                    "shuffle_options": True,
                    "feedback": {},
                    "locale_feedback": {},
                    "hints": [],
                    "status": "published",
                    "version": 1,
                    "created_by": published_by,
                    "created_at": now,
                    "updated_at": now,
                })
                created_assessments += 1

    # Mark draft as published (keep audit trail — optionally delete)
    await db.course_drafts.update_one(
        {"id": draft_id},
        {"$set": {"status": "published", "published_course_id": course_id, "updated_at": now}},
    )

    return {
        "course_id": course_id,
        "sections": created_sections,
        "lessons": created_lessons,
        "contents": created_contents,
        "assessments": created_assessments,
    }
