"""Site config routes — pricing, FAQs, landing page data."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db, SITE_CONFIG_SEED
from models.sql_models import PricingPlan, FAQ

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


def _plan_to_dict(plan: PricingPlan) -> dict:
    """Convert a PricingPlan ORM object to the dict shape exposed by the public API."""
    return {
        "id": plan.slug,
        "name": plan.name,
        "tagline": plan.tagline,
        "price": plan.price,
        "original_price": plan.original_price,
        "currency": plan.currency,
        "emoji": plan.emoji,
        "color": plan.color,
        "gradient": plan.gradient,
        "light_bg": plan.light_bg,
        "badge": plan.badge,
        "popular": plan.popular,
        "highlights": plan.highlights,
        "cta": plan.cta,
        "payment_link": plan.payment_link,
        "course_path": plan.course_path,
        "sort_order": plan.sort_order,
        "is_active": plan.is_active,
    }


def _faq_to_dict(faq: FAQ) -> dict:
    """Convert a FAQ ORM object to the dict shape exposed by the public API."""
    return {
        "id": faq.id,
        "question": faq.question,
        "answer": faq.answer,
        "sort_order": faq.sort_order,
        "is_active": faq.is_active,
    }


@router.get("/pricing")
async def get_pricing_plans(session: AsyncSession = Depends(get_db)):
    """Return active pricing plans from DB, sorted by sort_order."""
    result = await session.execute(
        select(PricingPlan)
        .where(PricingPlan.is_active == True)
        .order_by(PricingPlan.sort_order)
    )
    plans = [_plan_to_dict(p) for p in result.scalars().all()]
    if not plans:
        plans = SITE_CONFIG_SEED.get("pricing_plans", [])
    bundle_link = SITE_CONFIG_SEED.get("bundle_payment_link", "#payment-bundle")
    return {"plans": plans, "bundle_payment_link": bundle_link}


@router.get("/faqs")
async def get_faqs(session: AsyncSession = Depends(get_db)):
    """Return active FAQs from DB, sorted by sort_order."""
    result = await session.execute(
        select(FAQ)
        .where(FAQ.is_active == True)
        .order_by(FAQ.sort_order)
    )
    faqs = [_faq_to_dict(f) for f in result.scalars().all()]
    if not faqs:
        faqs = SITE_CONFIG_SEED.get("faqs", [])
    return faqs


@router.get("/config")
async def get_full_site_config(session: AsyncSession = Depends(get_db)):
    """Single call for all landing-page data."""
    plans_data = await get_pricing_plans(session)
    return {
        "pricing": plans_data,
        "faqs": await get_faqs(session),
        "trust_points": TRUST_POINTS,
        "benefits": BENEFITS,
        "stats": STATS,
        "ai_tools": AI_TOOLS_LIST,
        "english_weeks": ENGLISH_WEEKS,
    }
