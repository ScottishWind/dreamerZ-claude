"""MongoDB connection, index creation, and data seeding."""

import json
import logging
from copy import deepcopy
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient

from config import MONGO_URL, DB_NAME, CURRICULUM_JSON_PATH, SITE_CONFIG_JSON_PATH

# ── Connection ────────────────────────────────────────────
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# GridFS for file storage
from motor.motor_asyncio import AsyncIOMotorGridFSBucket
fs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="media")

# ── Seed Data (loaded once at import) ─────────────────────
try:
    with open(CURRICULUM_JSON_PATH, "r", encoding="utf-8") as f:
        CURRICULUM_DATA = json.load(f)
except FileNotFoundError:
    logging.warning("Curriculum seed file not found: %s", CURRICULUM_JSON_PATH)
    CURRICULUM_DATA = {"tools": [], "journeys": {}}

try:
    with open(SITE_CONFIG_JSON_PATH, "r", encoding="utf-8") as f:
        SITE_CONFIG_SEED = json.load(f)
except FileNotFoundError:
    logging.warning("Site config seed file not found: %s", SITE_CONFIG_JSON_PATH)
    SITE_CONFIG_SEED = {}

# Static categories (fallback-safe)
CATEGORIES_DATA = [
    {
        "id": "spoken-writing-english",
        "name": "Spoken and Writing English",
        "description": (
            "Spoken and Writing English for West Bengal teens with "
            "story-based lessons, voice read-aloud practice, and quizzes."
        ),
    },
    {
        "id": "ai-learning",
        "name": "AI Learning",
        "description": "AI learning tools and curriculum.",
    },
]


# ── Document Builders ─────────────────────────────────────
def _build_tool_document(tool: dict) -> dict:
    return {
        "id": tool["id"],
        "name": tool.get("name"),
        "tagline": tool.get("tagline"),
        "icon": tool.get("icon"),
        "theme": tool.get("theme", {}),
        "description": tool.get("description"),
        "totalXP": tool.get("totalXP", 0),
        "xpReward": tool.get("totalXP", 0),
        "color": tool.get("theme", {}).get("color", "#10A37F"),
        "category_id": tool.get("category_id", "ai-learning"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _build_category_document(category: dict) -> dict:
    return {
        "id": category["id"],
        "name": category.get("name"),
        "description": category.get("description", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _build_module_document(tool_id: str, module: dict) -> dict:
    explanation = module.get("explanation", "")
    first_line = explanation.split("\n")[0] if explanation else ""
    return {
        "id": module["id"],
        "tool_id": tool_id,
        "title": module.get("title"),
        "minutes": module.get("minutes"),
        "level": module.get("level"),
        "description": first_line,
        "isAdvanced": module.get("level") == "advanced",
        "day": module.get("day"),
        "week": module.get("week"),
        "is_weekly_test": module.get("is_weekly_test", False),
        "content": {
            "explanation": explanation,
            "example": module.get("example", ""),
            "activity": module.get("activity", ""),
            "vocab": module.get("vocab", []),
            "dialogue": module.get("dialogue", []),
            "speaking_task": module.get("speaking_task", ""),
            "bengali_tip": module.get("bengali_tip", ""),
            "micro_grammar": module.get("micro_grammar", ""),
        },
        "quiz": module.get("quiz", {}),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Index Creation ────────────────────────────────────────
async def create_indexes():
    # Legacy indexes
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True)
    await db.tools.create_index("id", unique=True)
    await db.tools.create_index("category_id")
    await db.modules.create_index("id", unique=True)
    await db.modules.create_index("tool_id")
    await db.categories.create_index("id", unique=True)
    await db.pricing_plans.create_index("id", unique=True)
    await db.faqs.create_index("id", unique=True)
    await db.enrollments.create_index(
        [("username", 1), ("plan_id", 1)], unique=True
    )
    await db.enrollments.create_index("username")

    # ── LMS indexes ──────────────────────────────────────
    await db.courses.create_index("id", unique=True)
    await db.courses.create_index("category_id")
    await db.courses.create_index("status")
    await db.sections.create_index("id", unique=True)
    await db.sections.create_index("course_id")
    await db.lessons.create_index("id", unique=True)
    await db.lessons.create_index("course_id")
    await db.lessons.create_index("section_id")
    await db.lessons.create_index([("course_id", 1), ("sort_order", 1)])
    await db.lessons.create_index([("course_id", 1), ("section_id", 1), ("sort_order", 1)])
    await db.lesson_contents.create_index(
        [("lesson_id", 1), ("language", 1)], unique=True
    )
    await db.assessments.create_index("id", unique=True)
    await db.assessments.create_index("lesson_id")
    await db.assessments.create_index("course_id")
    await db.media_assets.create_index("id", unique=True)
    await db.media_assets.create_index("type")
    await db.media_assets.create_index("course_id")
    await db.lesson_versions.create_index(
        [("lesson_id", 1), ("version_number", 1)], unique=True
    )
    await db.content_workflows.create_index("entity_id")
    await db.content_workflows.create_index(
        [("entity_type", 1), ("entity_id", 1)]
    )

    # ── Course Generation (AI-assisted drafts) ───────────
    await db.course_drafts.create_index("id", unique=True)
    await db.course_drafts.create_index("admin_username")
    await db.course_drafts.create_index("status")


# ── Curriculum Seeding ────────────────────────────────────
async def seed_curriculum_collections():
    for category in CATEGORIES_DATA:
        await db.categories.update_one(
            {"id": category["id"]},
            {"$setOnInsert": _build_category_document(category)},
            upsert=True,
        )

    tools = CURRICULUM_DATA.get("tools", [])
    journeys = CURRICULUM_DATA.get("journeys", {})

    for tool in tools:
        await db.tools.replace_one(
            {"id": tool["id"]},
            _build_tool_document(tool),
            upsert=True,
        )

        tool_module_ids = [m["id"] for m in journeys.get(tool["id"], [])]
        if tool_module_ids:
            await db.modules.delete_many(
                {"tool_id": tool["id"], "id": {"$nin": tool_module_ids}}
            )

        for module in journeys.get(tool["id"], []):
            await db.modules.replace_one(
                {"id": module["id"]},
                _build_module_document(tool["id"], module),
                upsert=True,
            )

    # Remove stale tools/modules
    current_tool_ids = [t["id"] for t in tools]
    await db.tools.delete_many({"id": {"$nin": current_tool_ids}})
    await db.modules.delete_many({"tool_id": {"$nin": current_tool_ids}})

    await db.tools.update_many(
        {"category_id": {"$exists": False}},
        {"$set": {"category_id": "ai-learning"}},
    )


async def seed_site_config():
    """Seed pricing_plans and faqs into MongoDB (business-critical data)."""
    now = datetime.now(timezone.utc).isoformat()

    for plan in deepcopy(SITE_CONFIG_SEED.get("pricing_plans", [])):
        plan["updated_at"] = now
        await db.pricing_plans.update_one(
            {"id": plan["id"]}, {"$set": plan}, upsert=True
        )

    for faq in deepcopy(SITE_CONFIG_SEED.get("faqs", [])):
        faq["updated_at"] = now
        await db.faqs.update_one(
            {"id": faq["id"]}, {"$set": faq}, upsert=True
        )


async def migrate_to_lms():
    """Migrate legacy tools/modules into the new LMS collections (idempotent).

    Only runs if the courses collection is empty — safe to call on every startup.
    """
    if await db.courses.count_documents({}) > 0:
        return  # already migrated

    logging.info("Running one-time LMS migration...")
    now = datetime.now(timezone.utc).isoformat()

    tools = CURRICULUM_DATA.get("tools", [])
    journeys = CURRICULUM_DATA.get("journeys", {})

    for tool in tools:
        tool_id = tool["id"]
        modules = journeys.get(tool_id, [])

        # ── Course ──
        course = {
            "id": tool_id,
            "category_id": tool.get("category_id", "ai-learning"),
            "name": tool.get("name", ""),
            "locale_names": {},
            "tagline": tool.get("tagline", ""),
            "description": tool.get("description", ""),
            "icon": tool.get("icon", ""),
            "theme": tool.get("theme", {}),
            "total_xp": tool.get("totalXP", 0),
            "total_lessons": len(modules),
            "difficulty": "beginner",
            "available_languages": ["en"],
            "default_language": "en",
            "status": "published",
            "version": 1,
            "published_at": now,
            "published_by": "system",
            "tags": [],
            "created_by": "system",
            "created_at": now,
            "updated_at": now,
        }
        await db.courses.update_one(
            {"id": course["id"]}, {"$setOnInsert": course}, upsert=True
        )

        # ── Sections (by week if available) ──
        weeks_seen = set()
        for mod in modules:
            wk = mod.get("week")
            if wk and wk not in weeks_seen:
                weeks_seen.add(wk)
                section_id = f"{tool_id}-week-{wk}"
                await db.sections.update_one(
                    {"id": section_id},
                    {"$setOnInsert": {
                        "id": section_id,
                        "course_id": tool_id,
                        "title": f"Week {wk}",
                        "locale_titles": {},
                        "sort_order": wk,
                        "is_active": True,
                        "created_at": now,
                        "updated_at": now,
                    }},
                    upsert=True,
                )

        # ── Lessons + Content + Assessments ──
        for mod in modules:
            content = mod.get("content") or mod
            has_vocab = bool(
                content.get("vocab") if isinstance(content, dict) else mod.get("vocab")
            )
            vocab_data = (
                content.get("vocab", []) if isinstance(content, dict) else mod.get("vocab", [])
            )
            section_id = (
                f"{tool_id}-week-{mod['week']}" if mod.get("week") else None
            )

            lesson = {
                "id": mod["id"],
                "course_id": tool_id,
                "section_id": section_id,
                "title": mod.get("title", ""),
                "locale_titles": {},
                "sort_order": mod.get("day") or 0,
                "day": mod.get("day"),
                "week": mod.get("week"),
                "content_type": "mixed" if has_vocab else "text",
                "has_quiz": bool(mod.get("quiz", {}).get("questions")),
                "is_weekly_test": mod.get("is_weekly_test", False),
                "level": mod.get("level", "beginner"),
                "estimated_minutes": mod.get("minutes", 10),
                "xp_reward": 100,
                "available_languages": ["en"],
                "status": "published",
                "version": 1,
                "media_asset_ids": [],
                "tags": [],
                "created_by": "system",
                "created_at": now,
                "updated_at": now,
            }
            await db.lessons.update_one(
                {"id": lesson["id"]}, {"$setOnInsert": lesson}, upsert=True
            )

            # Resolve content fields (handle flat vs nested)
            expl = content.get("explanation", "") if isinstance(content, dict) else mod.get("explanation", "")
            ex = content.get("example", "") if isinstance(content, dict) else mod.get("example", "")
            act = content.get("activity", "") if isinstance(content, dict) else mod.get("activity", "")
            bt = content.get("bengali_tip", "") if isinstance(content, dict) else mod.get("bengali_tip", "")
            mg = content.get("micro_grammar", "") if isinstance(content, dict) else mod.get("micro_grammar", "")
            dlg = content.get("dialogue", []) if isinstance(content, dict) else mod.get("dialogue", [])
            st = content.get("speaking_task", "") if isinstance(content, dict) else mod.get("speaking_task", "")

            # English content
            lesson_content = {
                "lesson_id": mod["id"],
                "language": "en",
                "version": 1,
                "explanation": expl,
                "explanation_format": "markdown",
                "example": ex,
                "activity": act,
                "bengali_tip": None,
                "micro_grammar": mg,
                "vocab": vocab_data,
                "dialogue": dlg,
                "speaking_task": st,
                "media_assets": [],
                "downloadable_assets": [],
                "status": "published",
                "created_at": now,
                "updated_at": now,
            }
            await db.lesson_contents.update_one(
                {"lesson_id": mod["id"], "language": "en"},
                {"$setOnInsert": lesson_content},
                upsert=True,
            )

            # Bengali content (if tips or vocab exist)
            if bt or has_vocab:
                bn_content = {
                    "lesson_id": mod["id"],
                    "language": "bn",
                    "version": 1,
                    "explanation": "",
                    "explanation_format": "markdown",
                    "example": "",
                    "activity": "",
                    "bengali_tip": bt,
                    "micro_grammar": "",
                    "vocab": vocab_data,
                    "dialogue": [],
                    "speaking_task": "",
                    "media_assets": [],
                    "downloadable_assets": [],
                    "status": "draft",
                    "created_at": now,
                    "updated_at": now,
                }
                await db.lesson_contents.update_one(
                    {"lesson_id": mod["id"], "language": "bn"},
                    {"$setOnInsert": bn_content},
                    upsert=True,
                )
                await db.lessons.update_one(
                    {"id": mod["id"]},
                    {"$addToSet": {"available_languages": "bn"}},
                )

            # Assessment
            quiz = mod.get("quiz", {})
            if quiz.get("questions"):
                assess_id = f"assess-{mod['id']}"
                assessment = {
                    "id": assess_id,
                    "type": "weekly_test" if mod.get("is_weekly_test") else "quiz",
                    "lesson_id": mod["id"],
                    "course_id": tool_id,
                    "language": "en",
                    "title": f"Quiz — {mod.get('title', '')}",
                    "locale_titles": {},
                    "questions": quiz["questions"],
                    "passing_score": quiz.get("passingScore", 70),
                    "total_points": len(quiz["questions"]) * 10,
                    "max_attempts": 3,
                    "shuffle_questions": False,
                    "shuffle_options": True,
                    "feedback": quiz.get("safeFeedback", {}),
                    "locale_feedback": {},
                    "hints": quiz.get("hints", []),
                    "status": "published",
                    "version": 1,
                    "created_by": "system",
                    "created_at": now,
                    "updated_at": now,
                }
                await db.assessments.update_one(
                    {"id": assess_id},
                    {"$setOnInsert": assessment},
                    upsert=True,
                )

    logging.info(
        "LMS migration complete: %d courses, %d lessons, %d assessments",
        await db.courses.count_documents({}),
        await db.lessons.count_documents({}),
        await db.assessments.count_documents({}),
    )


async def seed_data():
    """Run all seed operations."""
    await seed_curriculum_collections()
    await seed_site_config()
    await migrate_to_lms()
