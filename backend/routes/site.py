"""Site config routes — pricing, FAQs, landing page data."""

from fastapi import APIRouter

from database import db, SITE_CONFIG_SEED

router = APIRouter(prefix="/site", tags=["site"])

# Static site content (presentation data — lives in code, not DB)
TRUST_POINTS = [
    {"id": "tp-safe", "icon": "Shield", "text": "Safe for teens (12-18)", "color": "text-emerald-500"},
    {"id": "tp-lifetime", "icon": "Clock", "text": "Lifetime access", "color": "text-blue-500"},
    {"id": "tp-cert", "icon": "Award", "text": "Certificates on completion", "color": "text-amber-500"},
    {"id": "tp-bengali", "icon": "Users", "text": "Built for Bengali students", "color": "text-violet-500"},
]

AI_TOOLS_LIST = [
    {"id": "aitool-chatgpt", "name": "ChatGPT", "modules": 7, "description": "Conversations & prompts"},
    {"id": "aitool-claude", "name": "Claude", "modules": 3, "description": "Analysis & reasoning"},
    {"id": "aitool-gemini", "name": "Gemini", "modules": 3, "description": "Multimodal AI"},
    {"id": "aitool-canva", "name": "Canva", "modules": 3, "description": "AI-powered design"},
    {"id": "aitool-syllaby", "name": "Syllaby", "modules": 2, "description": "Video & content"},
]

ENGLISH_WEEKS = [
    {"id": "ew-1", "week": "Week 1", "title": "Foundations", "topics": "Greetings, introductions, daily routines"},
    {"id": "ew-2", "week": "Week 2", "title": "Social Skills", "topics": "School talk, hobbies, food & restaurants"},
    {"id": "ew-3", "week": "Week 3", "title": "Real World", "topics": "Shopping, directions, phone calls"},
    {"id": "ew-4", "week": "Week 4", "title": "Confidence", "topics": "Interviews, debates, storytelling"},
]

BENEFITS = [
    {"id": "ben-safe", "icon": "Shield", "title": "Safe & Age-Appropriate", "description": "Content filters, safety guidelines, no ads — designed for teens.", "color": "text-emerald-600 bg-emerald-50"},
    {"id": "ben-future", "icon": "Brain", "title": "Future-Ready Skills", "description": "AI prompt engineering + English fluency — skills that matter.", "color": "text-indigo-600 bg-indigo-50"},
    {"id": "ben-path", "icon": "Target", "title": "Structured Path", "description": "Day-by-day modules, quizzes, XP tracking — never feel lost.", "color": "text-amber-600 bg-amber-50"},
    {"id": "ben-bengali", "icon": "Languages", "title": "Bengali Context", "description": "Tips for common Bengali mistakes, vocab with Bangla meanings.", "color": "text-rose-600 bg-rose-50"},
]

STATS = [
    {"id": "stat-modules", "value": "48+", "label": "Total Modules"},
    {"id": "stat-tools", "value": "6", "label": "Learning Tools"},
    {"id": "stat-english", "value": "30", "label": "Day English Journey"},
    {"id": "stat-roleplay", "value": "5", "label": "AI Roleplay Characters"},
]


@router.get("/pricing")
async def get_pricing_plans():
    """Return active pricing plans from DB, sorted by sort_order."""
    plans = await db.pricing_plans.find(
        {"is_active": True}, {"_id": 0}
    ).sort("sort_order", 1).to_list(100)
    if not plans:
        plans = SITE_CONFIG_SEED.get("pricing_plans", [])
    bundle_link = SITE_CONFIG_SEED.get("bundle_payment_link", "#payment-bundle")
    return {"plans": plans, "bundle_payment_link": bundle_link}


@router.get("/faqs")
async def get_faqs():
    """Return active FAQs from DB, sorted by sort_order."""
    faqs = await db.faqs.find(
        {"is_active": True}, {"_id": 0}
    ).sort("sort_order", 1).to_list(100)
    if not faqs:
        faqs = SITE_CONFIG_SEED.get("faqs", [])
    return faqs


@router.get("/config")
async def get_full_site_config():
    """Single call for all landing-page data."""
    plans_data = await get_pricing_plans()
    return {
        "pricing": plans_data,
        "faqs": await get_faqs(),
        "trust_points": TRUST_POINTS,
        "benefits": BENEFITS,
        "stats": STATS,
        "ai_tools": AI_TOOLS_LIST,
        "english_weeks": ENGLISH_WEEKS,
    }
