"""Translation service — auto-translate lesson content using Claude API."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL, SUPPORTED_LANGUAGES
from models.sql_models import Lesson, LessonContent, Course, Module

_LANG_NAMES = {lang["code"]: lang["name"] for lang in SUPPORTED_LANGUAGES}

TRANSLATION_SYSTEM_PROMPT = (
    "You are a professional translator for an educational platform for Indian teenagers. "
    "Translate the content accurately while keeping it natural, age-appropriate, and "
    "culturally relevant. Preserve all markdown formatting, code blocks, and special "
    "characters. Do NOT translate technical terms, brand names, or proper nouns. "
    "Return ONLY the translated text — no explanations, no preamble."
)


async def translate_text(text: str, target_lang: str) -> str:
    """Translate a single text string to the target language using Claude API.

    Returns the translated text, or the original text if translation fails.
    """
    if not text or not text.strip():
        return text

    if not ANTHROPIC_API_KEY:
        logging.warning("No ANTHROPIC_API_KEY set — skipping translation")
        return text

    target_name = _LANG_NAMES.get(target_lang, target_lang)

    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model=CLAUDE_MODEL,
            system=TRANSLATION_SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": f"Translate the following English text to {target_name}:\n\n{text}",
                }
            ],
            max_tokens=4096,
        )
        return response.content[0].text.strip()

    except Exception as e:
        logging.error("Translation API error: %s", e)
        return text


async def translate_lesson(
    session: AsyncSession,
    lesson_id: int,
    target_lang: str,
    translated_by: str = "auto",
) -> dict:
    """Auto-translate a lesson's English content to the target language.

    Creates or updates a LessonContent entry for the target language with status='draft'.
    Returns the translated content as a dict.
    """
    # Fetch the English source content
    result = await session.execute(
        select(LessonContent).where(
            LessonContent.lesson_id == lesson_id,
            LessonContent.language == "en",
        )
    )
    en_content = result.scalars().first()
    if not en_content:
        raise ValueError(f"No English content found for lesson {lesson_id}")

    # Fields to translate
    text_fields = ["explanation", "example", "activity", "bengali_tip", "micro_grammar", "speaking_task"]
    translated = {}

    for field in text_fields:
        original = getattr(en_content, field, None) or ""
        if original.strip():
            translated[field] = await translate_text(original, target_lang)
        else:
            translated[field] = ""

    # Translate vocab items (stored as JSON list)
    source_vocab = en_content.vocab or []
    translated_vocab = []
    for item in source_vocab:
        t_item = dict(item)
        if item.get("meaning"):
            t_item["meaning"] = await translate_text(item["meaning"], target_lang)
        if item.get("example_sentence"):
            t_item["example_sentence"] = await translate_text(
                item["example_sentence"], target_lang
            )
        translated_vocab.append(t_item)

    # Translate dialogue lines (only the 'line' field, keep 'speaker')
    source_dialogue = en_content.dialogue or []
    translated_dialogue = []
    for line in source_dialogue:
        t_line = dict(line)
        if line.get("line"):
            t_line["line"] = await translate_text(line["line"], target_lang)
        translated_dialogue.append(t_line)

    # Check if a translated LessonContent already exists for this language
    result = await session.execute(
        select(LessonContent).where(
            LessonContent.lesson_id == lesson_id,
            LessonContent.language == target_lang,
        )
    )
    existing = result.scalars().first()

    if existing:
        # Update existing translation
        for field in text_fields:
            setattr(existing, field, translated[field])
        existing.explanation_format = en_content.explanation_format or "markdown"
        existing.vocab = translated_vocab
        existing.dialogue = translated_dialogue
        existing.status = "draft"
        existing.translated_by = translated_by
        tc = existing
    else:
        # Create new translated LessonContent
        tc = LessonContent(
            lesson_id=lesson_id,
            language=target_lang,
            explanation_format=en_content.explanation_format or "markdown",
            vocab=translated_vocab,
            dialogue=translated_dialogue,
            status="draft",
            translated_by=translated_by,
            **translated,
        )
        session.add(tc)

    await session.flush()
    return tc.to_dict()


async def translate_course(
    session: AsyncSession,
    course_id: int,
    target_lang: str,
    translated_by: str = "auto",
) -> dict:
    """Translate all lessons in a course to the target language.

    Navigates Course -> Modules -> Lessons and translates each LessonContent.
    Returns a summary with counts.
    """
    # Get all modules in this course
    result = await session.execute(
        select(Module).where(Module.course_id == course_id)
    )
    modules = result.scalars().all()

    translated_count = 0
    skipped_count = 0
    error_count = 0

    for module in modules:
        # Get all lessons in this module
        result = await session.execute(
            select(Lesson).where(Lesson.module_id == module.id)
        )
        lessons = result.scalars().all()

        for lesson in lessons:
            try:
                # Check if English content exists
                result = await session.execute(
                    select(LessonContent).where(
                        LessonContent.lesson_id == lesson.id,
                        LessonContent.language == "en",
                    )
                )
                en = result.scalars().first()
                if not en:
                    skipped_count += 1
                    continue

                await translate_lesson(session, lesson.id, target_lang, translated_by)
                translated_count += 1
            except Exception as e:
                logging.error("Failed to translate lesson %s: %s", lesson.id, e)
                error_count += 1

    return {
        "course_id": course_id,
        "target_language": target_lang,
        "translated": translated_count,
        "skipped": skipped_count,
        "errors": error_count,
    }


async def get_translation_status(session: AsyncSession, course_id: int) -> dict:
    """Get translation coverage for a course across all supported languages.

    Counts LessonContent records per language for all lessons in the course.
    """
    # Get all lesson IDs for this course by joining Module -> Lesson
    result = await session.execute(
        select(Lesson.id)
        .join(Module, Lesson.module_id == Module.id)
        .where(Module.course_id == course_id)
    )
    lesson_ids = [row[0] for row in result.all()]
    total = len(lesson_ids)

    if not lesson_ids:
        return {}

    status = {}
    for lang_info in SUPPORTED_LANGUAGES:
        lang = lang_info["code"]
        if lang == "en":
            status[lang] = {"total": total, "translated": total, "published": total, "draft": 0}
            continue

        # Count LessonContent records for this language across all lessons
        result = await session.execute(
            select(LessonContent.status, func.count(LessonContent.id)).where(
                LessonContent.lesson_id.in_(lesson_ids),
                LessonContent.language == lang,
            ).group_by(LessonContent.status)
        )
        rows = result.all()
        status_counts = {row[0]: row[1] for row in rows}

        published = status_counts.get("published", 0)
        draft = status_counts.get("draft", 0)
        translated_total = sum(status_counts.values())

        status[lang] = {
            "total": total,
            "translated": translated_total,
            "published": published,
            "draft": draft,
        }

    return status
