#!/usr/bin/env python3
"""
Translate all English lesson content to Bengali using Claude API.

Usage:
    pip install pymongo anthropic
    export MONGO_URL="mongodb+srv://..."
    export ANTHROPIC_API_KEY="sk-ant-..."
    python scripts/translate_all_to_bengali.py

This script connects directly to your MongoDB Atlas and translates
all English lesson_contents entries to Bengali. Translations are
saved with status='published' so they show up immediately.
"""

import os
import sys
import time
from datetime import datetime, timezone

# ── Config ───────────────────────────────────────────────
MONGO_URL = os.environ.get("MONGO_URL", "")
DB_NAME = os.environ.get("DB_NAME", "dreamerz_beta")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-20250514")
TARGET_LANG = "bn"
TARGET_LANG_NAME = "Bengali"

if not MONGO_URL:
    print("ERROR: Set MONGO_URL environment variable")
    sys.exit(1)
if not ANTHROPIC_API_KEY:
    print("ERROR: Set ANTHROPIC_API_KEY environment variable")
    sys.exit(1)

# ── Connect ──────────────────────────────────────────────
from pymongo import MongoClient
import anthropic

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
ai = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

SYSTEM_PROMPT = (
    "You are a professional translator for an educational platform for Indian teenagers. "
    "Translate the content accurately while keeping it natural, age-appropriate, and "
    "culturally relevant for Bengali-speaking students in West Bengal. "
    "Preserve all markdown formatting, code blocks, and special characters. "
    "Do NOT translate technical terms, brand names, or proper nouns. "
    "Return ONLY the translated text — no explanations, no preamble."
)


def translate(text: str) -> str:
    """Translate a single text to Bengali using Claude."""
    if not text or not text.strip():
        return text
    try:
        resp = ai.messages.create(
            model=CLAUDE_MODEL,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Translate to {TARGET_LANG_NAME}:\n\n{text}"}],
            max_tokens=4096,
            temperature=0.3,
        )
        return resp.content[0].text.strip()
    except Exception as e:
        print(f"    WARNING: Translation failed: {e}")
        return text


def translate_lesson(en_content: dict) -> dict:
    """Translate all fields of a lesson content document."""
    lesson_id = en_content["lesson_id"]

    # Text fields to translate
    translated = {}
    text_fields = ["explanation", "example", "activity", "bengali_tip", "micro_grammar", "speaking_task"]

    for field in text_fields:
        original = en_content.get(field) or ""
        if original.strip():
            print(f"    Translating {field}...", end=" ", flush=True)
            translated[field] = translate(original)
            print("done")
        else:
            translated[field] = ""

    # Translate vocab
    source_vocab = en_content.get("vocab", [])
    translated_vocab = []
    if source_vocab:
        print(f"    Translating {len(source_vocab)} vocab items...", end=" ", flush=True)
        for item in source_vocab:
            t = dict(item)
            if item.get("meaning"):
                t["meaning"] = translate(item["meaning"])
            if item.get("example_sentence"):
                t["example_sentence"] = translate(item["example_sentence"])
            translated_vocab.append(t)
        print("done")

    # Translate dialogue
    source_dialogue = en_content.get("dialogue", [])
    translated_dialogue = []
    if source_dialogue:
        print(f"    Translating {len(source_dialogue)} dialogue lines...", end=" ", flush=True)
        for line in source_dialogue:
            t = dict(line)
            if line.get("line"):
                t["line"] = translate(line["line"])
            translated_dialogue.append(t)
        print("done")

    now = datetime.now(timezone.utc).isoformat()

    return {
        "lesson_id": lesson_id,
        "language": TARGET_LANG,
        "version": en_content.get("version", 1),
        **translated,
        "explanation_format": en_content.get("explanation_format", "markdown"),
        "vocab": translated_vocab,
        "dialogue": translated_dialogue,
        "media_assets": en_content.get("media_assets", []),
        "downloadable_assets": en_content.get("downloadable_assets", []),
        "status": "published",
        "translated_by": "auto-script",
        "source_language": "en",
        "created_at": now,
        "updated_at": now,
    }


def main():
    # Get all English content
    en_contents = list(db.lesson_contents.find({"language": "en"}))
    print(f"\nFound {len(en_contents)} English lessons to translate to Bengali\n")

    if not en_contents:
        # Fallback: check modules collection directly
        modules = list(db.modules.find({}))
        print(f"No lesson_contents found. Found {len(modules)} modules in legacy collection.")
        print("The LMS migration may not have run yet. Translating from modules directly.\n")

        for i, mod in enumerate(modules, 1):
            lesson_id = mod["id"]
            tool_id = mod.get("tool_id", "unknown")

            # Check if Bengali already exists
            existing = db.lesson_contents.find_one(
                {"lesson_id": lesson_id, "language": TARGET_LANG}
            )
            if existing and existing.get("explanation", "").strip():
                print(f"[{i}/{len(modules)}] {tool_id}/{lesson_id}: Already translated, skipping")
                continue

            print(f"[{i}/{len(modules)}] {tool_id}/{lesson_id}: {mod.get('title', '')}")

            # Build a pseudo en_content from the module
            content = mod.get("content", {})
            if isinstance(content, dict):
                en_doc = {
                    "lesson_id": lesson_id,
                    "language": "en",
                    "version": 1,
                    "explanation": content.get("explanation", "") or mod.get("explanation", ""),
                    "example": content.get("example", "") or mod.get("example", ""),
                    "activity": content.get("activity", "") or mod.get("activity", ""),
                    "bengali_tip": content.get("bengali_tip", "") or mod.get("bengali_tip", ""),
                    "micro_grammar": content.get("micro_grammar", "") or mod.get("micro_grammar", ""),
                    "speaking_task": content.get("speaking_task", "") or mod.get("speaking_task", ""),
                    "vocab": content.get("vocab", []) or mod.get("vocab", []),
                    "dialogue": content.get("dialogue", []) or mod.get("dialogue", []),
                }
            else:
                en_doc = {
                    "lesson_id": lesson_id,
                    "language": "en",
                    "version": 1,
                    "explanation": mod.get("explanation", ""),
                    "example": mod.get("example", ""),
                    "activity": mod.get("activity", ""),
                    "bengali_tip": mod.get("bengali_tip", ""),
                    "micro_grammar": mod.get("micro_grammar", ""),
                    "speaking_task": mod.get("speaking_task", ""),
                    "vocab": mod.get("vocab", []),
                    "dialogue": mod.get("dialogue", []),
                }

            bn_doc = translate_lesson(en_doc)
            db.lesson_contents.update_one(
                {"lesson_id": lesson_id, "language": TARGET_LANG},
                {"$set": bn_doc},
                upsert=True,
            )
            # Mark language available on the lesson
            db.lessons.update_one(
                {"id": lesson_id},
                {"$addToSet": {"available_languages": TARGET_LANG}},
            )
            print(f"    Saved!\n")
            time.sleep(0.5)  # Rate limit courtesy

        print(f"\nDone! Translated {len(modules)} modules to Bengali.")
        return

    # Normal path: translate from lesson_contents
    translated = 0
    skipped = 0

    for i, en in enumerate(en_contents, 1):
        lesson_id = en["lesson_id"]

        # Check if Bengali already exists with real content
        existing = db.lesson_contents.find_one(
            {"lesson_id": lesson_id, "language": TARGET_LANG}
        )
        if existing and existing.get("explanation", "").strip():
            print(f"[{i}/{len(en_contents)}] {lesson_id}: Already translated, skipping")
            skipped += 1
            continue

        # Get lesson title for logging
        lesson = db.lessons.find_one({"id": lesson_id})
        title = lesson.get("title", lesson_id) if lesson else lesson_id
        course_id = lesson.get("course_id", "?") if lesson else "?"

        print(f"[{i}/{len(en_contents)}] {course_id}/{title}")

        bn_doc = translate_lesson(en)
        db.lesson_contents.update_one(
            {"lesson_id": lesson_id, "language": TARGET_LANG},
            {"$set": bn_doc},
            upsert=True,
        )
        db.lessons.update_one(
            {"id": lesson_id},
            {"$addToSet": {"available_languages": TARGET_LANG}},
        )
        translated += 1
        print(f"    Saved!\n")
        time.sleep(0.5)

    print(f"\nDone! Translated: {translated}, Skipped: {skipped}")


if __name__ == "__main__":
    main()
