"""Translation service — auto-translate lesson content using Claude API."""

import json
import logging
from datetime import datetime, timezone

from config import ANTHROPIC_API_KEY, CLAUDE_MODEL, SUPPORTED_LANGUAGES
from database import db

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


async def translate_lesson_content(
    lesson_id: str,
    target_lang: str,
    translated_by: str = "auto",
) -> dict:
    """Auto-translate a lesson's English content to the target language.

    Creates or updates a lesson_contents entry with status='draft'.
    Returns the translated content document.
    """
    # Fetch the English source content
    en_content = await db.lesson_contents.find_one(
        {"lesson_id": lesson_id, "language": "en"}, {"_id": 0}
    )
    if not en_content:
        raise ValueError(f"No English content found for lesson '{lesson_id}'")

    # Fields to translate
    text_fields = ["explanation", "example", "activity", "bengali_tip", "micro_grammar", "speaking_task"]
    translated = {}

    for field in text_fields:
        original = en_content.get(field) or ""
        if original.strip():
            translated[field] = await translate_text(original, target_lang)
        else:
            translated[field] = ""

    # Translate vocab items
    source_vocab = en_content.get("vocab", [])
    translated_vocab = []
    for item in source_vocab:
        t_item = dict(item)
        # Translate meaning and example sentence
        if item.get("meaning"):
            t_item["meaning"] = await translate_text(item["meaning"], target_lang)
        if item.get("example_sentence"):
            t_item["example_sentence"] = await translate_text(
                item["example_sentence"], target_lang
            )
        translated_vocab.append(t_item)

    # Translate dialogue lines (only the 'line' field, keep 'speaker')
    source_dialogue = en_content.get("dialogue", [])
    translated_dialogue = []
    for line in source_dialogue:
        t_line = dict(line)
        if line.get("line"):
            t_line["line"] = await translate_text(line["line"], target_lang)
        translated_dialogue.append(t_line)

    now = datetime.now(timezone.utc).isoformat()
    version = en_content.get("version", 1)

    content_doc = {
        "lesson_id": lesson_id,
        "language": target_lang,
        "version": version,
        **translated,
        "explanation_format": en_content.get("explanation_format", "markdown"),
        "vocab": translated_vocab,
        "dialogue": translated_dialogue,
        "media_assets": en_content.get("media_assets", []),
        "downloadable_assets": en_content.get("downloadable_assets", []),
        "status": "draft",
        "translated_by": translated_by,
        "source_language": "en",
        "created_at": now,
        "updated_at": now,
    }

    # Upsert into lesson_contents
    await db.lesson_contents.update_one(
        {"lesson_id": lesson_id, "language": target_lang},
        {"$set": content_doc},
        upsert=True,
    )

    # Ensure language is in lesson's available_languages
    await db.lessons.update_one(
        {"id": lesson_id},
        {"$addToSet": {"available_languages": target_lang}},
    )

    return content_doc


async def translate_course(
    course_id: str,
    target_lang: str,
    translated_by: str = "auto",
) -> dict:
    """Translate all lessons in a course to the target language.

    Returns a summary with counts.
    """
    lessons = await db.lessons.find(
        {"course_id": course_id}, {"id": 1, "_id": 0}
    ).to_list(1000)

    translated_count = 0
    skipped_count = 0
    error_count = 0

    for lesson in lessons:
        try:
            # Check if English content exists
            en = await db.lesson_contents.find_one(
                {"lesson_id": lesson["id"], "language": "en"}
            )
            if not en:
                skipped_count += 1
                continue

            await translate_lesson_content(lesson["id"], target_lang, translated_by)
            translated_count += 1
        except Exception as e:
            logging.error("Failed to translate lesson %s: %s", lesson["id"], e)
            error_count += 1

    return {
        "course_id": course_id,
        "target_language": target_lang,
        "translated": translated_count,
        "skipped": skipped_count,
        "errors": error_count,
    }


async def get_translation_status(course_id: str) -> dict:
    """Get translation coverage for a course across all supported languages."""
    lessons = await db.lessons.find(
        {"course_id": course_id}, {"id": 1, "_id": 0}
    ).to_list(1000)
    lesson_ids = [l["id"] for l in lessons]
    total = len(lesson_ids)

    status = {}
    for lang_info in SUPPORTED_LANGUAGES:
        lang = lang_info["code"]
        if lang == "en":
            status[lang] = {"total": total, "translated": total, "published": total, "draft": 0}
            continue

        contents = await db.lesson_contents.find(
            {"lesson_id": {"$in": lesson_ids}, "language": lang},
            {"status": 1, "_id": 0},
        ).to_list(1000)

        published = sum(1 for c in contents if c.get("status") == "published")
        draft = sum(1 for c in contents if c.get("status") == "draft")
        status[lang] = {
            "total": total,
            "translated": len(contents),
            "published": published,
            "draft": draft,
        }

    return status
