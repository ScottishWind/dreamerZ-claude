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


async def seed_data():
    """Run all seed operations."""
    await seed_curriculum_collections()
    await seed_site_config()
