"""SQLAlchemy async engine, session factory, and data seeding."""

import json
import logging
from collections import defaultdict
from copy import deepcopy

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from config import DATABASE_URL, CURRICULUM_JSON_PATH, SITE_CONFIG_JSON_PATH
from models.sql_models import (
    Base,
    Category,
    Course,
    Module,
    Lesson,
    LessonContent,
    Quiz,
    QuizQuestion,
    PricingPlan,
    FAQ,
)

# ── Engine & Session Factory ─────────────────────────────

_connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}

engine = create_async_engine(DATABASE_URL, echo=False, connect_args=_connect_args)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

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


# ── Database Initialization ──────────────────────────────

async def init_db(drop_first: bool = False):
    """Create all tables defined in Base.metadata.

    Args:
        drop_first: If True, drops all existing tables before creating.
                    Useful for local dev when the schema changes.
                    The seed_local.py script sets this to True automatically
                    for SQLite databases.
    """
    async with engine.begin() as conn:
        if drop_first:
            await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """FastAPI dependency that yields an async database session."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


# ── Helpers ───────────────────────────────────────────────

async def _get_or_create_category(
    session: AsyncSession, slug: str, name: str, description: str
) -> Category:
    """Return existing category by slug or create a new one."""
    result = await session.execute(select(Category).where(Category.slug == slug))
    cat = result.scalars().first()
    if cat:
        return cat
    cat = Category(slug=slug, name=name, description=description)
    session.add(cat)
    await session.flush()
    return cat


async def _get_or_create_course(
    session: AsyncSession, slug: str, category_id: int, **kwargs
) -> Course:
    """Return existing course by slug or create a new one."""
    result = await session.execute(select(Course).where(Course.slug == slug))
    course = result.scalars().first()
    if course:
        for k, v in kwargs.items():
            setattr(course, k, v)
        course.category_id = category_id
        await session.flush()
        return course
    course = Course(slug=slug, category_id=category_id, **kwargs)
    session.add(course)
    await session.flush()
    return course


async def _get_or_create_module(
    session: AsyncSession, slug: str, course_id: int, **kwargs
) -> Module:
    """Return existing module by slug or create a new one."""
    result = await session.execute(select(Module).where(Module.slug == slug))
    mod = result.scalars().first()
    if mod:
        for k, v in kwargs.items():
            setattr(mod, k, v)
        mod.course_id = course_id
        await session.flush()
        return mod
    mod = Module(slug=slug, course_id=course_id, **kwargs)
    session.add(mod)
    await session.flush()
    return mod


async def _get_or_create_lesson(
    session: AsyncSession, slug: str, module_id: int, **kwargs
) -> Lesson:
    """Return existing lesson by slug or create a new one."""
    result = await session.execute(select(Lesson).where(Lesson.slug == slug))
    lesson = result.scalars().first()
    if lesson:
        for k, v in kwargs.items():
            setattr(lesson, k, v)
        lesson.module_id = module_id
        await session.flush()
        return lesson
    lesson = Lesson(slug=slug, module_id=module_id, **kwargs)
    session.add(lesson)
    await session.flush()
    return lesson


# ── Seed Data ─────────────────────────────────────────────

async def seed_data():
    """Idempotent seeding of categories, courses, modules, lessons, content,
    quizzes, pricing plans, and FAQs from JSON seed files."""
    async with async_session() as session:
        async with session.begin():
            # ── 1. Categories ──
            cat_map: dict[str, Category] = {}
            for cat_data in CATEGORIES_DATA:
                cat = await _get_or_create_category(
                    session,
                    slug=cat_data["id"],
                    name=cat_data["name"],
                    description=cat_data.get("description", ""),
                )
                cat_map[cat_data["id"]] = cat

            # ── 2. Courses (from curriculum tools) ──
            tools = CURRICULUM_DATA.get("tools", [])
            journeys = CURRICULUM_DATA.get("journeys", {})
            course_map: dict[str, Course] = {}

            for sort_idx, tool in enumerate(tools):
                tool_slug = tool["id"]
                category_slug = tool.get("category_id", "ai-learning")
                # Ensure the category exists (create if referenced but not in CATEGORIES_DATA)
                if category_slug not in cat_map:
                    cat_map[category_slug] = await _get_or_create_category(
                        session, slug=category_slug, name=category_slug, description=""
                    )
                cat = cat_map[category_slug]

                course = await _get_or_create_course(
                    session,
                    slug=tool_slug,
                    category_id=cat.id,
                    name=tool.get("name", tool_slug),
                    description=tool.get("description", ""),
                    tagline=tool.get("tagline", ""),
                    icon=tool.get("icon", ""),
                    theme_color=tool.get("theme", {}).get("color", "#10A37F"),
                    total_xp=tool.get("totalXP", 0),
                    sort_order=sort_idx,
                    status="published",
                    available_languages=["en"],
                    # /api/content/courses filters on this tag; without it
                    # the learner-facing site shows zero courses.
                    tags=["ai-generated"],
                    created_by="system",
                )
                course_map[tool_slug] = course

                # ── 3. Modules (grouped from journey items) ──
                items = journeys.get(tool_slug, [])

                # Determine grouping strategy: week-based or single default module
                has_weeks = any(item.get("week") is not None for item in items)

                if has_weeks:
                    # Group items by week number
                    week_groups: dict[int, list] = defaultdict(list)
                    for item in items:
                        week_num = item.get("week", 1)
                        week_groups[week_num].append(item)

                    for mod_idx, week_num in enumerate(sorted(week_groups.keys())):
                        mod_slug = f"{tool_slug}-week-{week_num}"
                        mod = await _get_or_create_module(
                            session,
                            slug=mod_slug,
                            course_id=course.id,
                            title=f"Week {week_num}",
                            sort_order=mod_idx,
                        )

                        # ── 4. Lessons within this module ──
                        for lesson_idx, item in enumerate(week_groups[week_num]):
                            await _seed_lesson(session, mod, item, lesson_idx)
                else:
                    # Single default module for tools without week grouping
                    mod_slug = f"{tool_slug}-core"
                    mod = await _get_or_create_module(
                        session,
                        slug=mod_slug,
                        course_id=course.id,
                        title="Core Modules",
                        sort_order=0,
                    )

                    for lesson_idx, item in enumerate(items):
                        await _seed_lesson(session, mod, item, lesson_idx)

            # ── 6. Pricing Plans ──
            for idx, plan_data in enumerate(deepcopy(SITE_CONFIG_SEED.get("pricing_plans", []))):
                plan_slug = plan_data["id"]
                result = await session.execute(
                    select(PricingPlan).where(PricingPlan.slug == plan_slug)
                )
                plan = result.scalars().first()
                plan_kwargs = dict(
                    name=plan_data.get("name", ""),
                    tagline=plan_data.get("tagline"),
                    price=plan_data.get("price", 0),
                    original_price=plan_data.get("original_price"),
                    currency=plan_data.get("currency", "INR"),
                    emoji=plan_data.get("emoji"),
                    color=plan_data.get("color"),
                    gradient=plan_data.get("gradient"),
                    light_bg=plan_data.get("light_bg"),
                    badge=plan_data.get("badge"),
                    popular=plan_data.get("popular", False),
                    highlights=plan_data.get("highlights"),
                    cta=plan_data.get("cta"),
                    payment_link=plan_data.get("payment_link"),
                    course_path=plan_data.get("course_path"),
                    sort_order=plan_data.get("sort_order", idx),
                    is_active=plan_data.get("is_active", True),
                )
                if plan:
                    for k, v in plan_kwargs.items():
                        setattr(plan, k, v)
                else:
                    plan = PricingPlan(slug=plan_slug, **plan_kwargs)
                    session.add(plan)

            # ── 7. FAQs ──
            for idx, faq_data in enumerate(deepcopy(SITE_CONFIG_SEED.get("faqs", []))):
                faq_slug = faq_data["id"]
                # Match by question text for idempotency
                result = await session.execute(
                    select(FAQ).where(FAQ.question == faq_data["question"])
                )
                faq = result.scalars().first()
                if faq:
                    faq.answer = faq_data.get("answer", "")
                    faq.sort_order = faq_data.get("sort_order", idx)
                    faq.is_active = faq_data.get("is_active", True)
                else:
                    faq = FAQ(
                        question=faq_data["question"],
                        answer=faq_data.get("answer", ""),
                        sort_order=faq_data.get("sort_order", idx),
                        is_active=faq_data.get("is_active", True),
                    )
                    session.add(faq)

            await session.flush()

    logging.info("Seed data loaded successfully.")


async def _seed_lesson(
    session: AsyncSession, module: Module, item: dict, sort_idx: int
):
    """Seed a single lesson, its content, and quiz from a journey item dict."""
    lesson_slug = item["id"]
    explanation = item.get("explanation", "")
    first_line = explanation.split("\n")[0] if explanation else ""

    lesson = await _get_or_create_lesson(
        session,
        slug=lesson_slug,
        module_id=module.id,
        title=item.get("title", ""),
        description=first_line,
        sort_order=item.get("day", sort_idx),
        level=item.get("level", "beginner"),
        estimated_minutes=item.get("minutes", 10),
        xp_reward=100,
        week=item.get("week"),
        day=item.get("day"),
        is_weekly_test=item.get("is_weekly_test", False),
        status="published",
    )

    # ── LessonContent (English) ──
    result = await session.execute(
        select(LessonContent).where(
            LessonContent.lesson_id == lesson.id,
            LessonContent.language == "en",
        )
    )
    lc = result.scalars().first()
    lc_kwargs = dict(
        explanation=item.get("explanation", ""),
        explanation_format="markdown",
        example=item.get("example", ""),
        activity=item.get("activity", ""),
        bengali_tip=item.get("bengali_tip"),
        micro_grammar=item.get("micro_grammar", ""),
        speaking_task=item.get("speaking_task", ""),
        vocab=item.get("vocab"),
        dialogue=item.get("dialogue"),
        status="published",
    )
    if lc:
        for k, v in lc_kwargs.items():
            setattr(lc, k, v)
    else:
        lc = LessonContent(
            lesson_id=lesson.id,
            language="en",
            **lc_kwargs,
        )
        session.add(lc)

    # ── Quiz + QuizQuestions ──
    quiz_data = item.get("quiz", {})
    questions = quiz_data.get("questions", [])
    if questions:
        result = await session.execute(
            select(Quiz).where(Quiz.lesson_id == lesson.id)
        )
        quiz = result.scalars().first()
        if not quiz:
            quiz = Quiz(
                lesson_id=lesson.id,
                title=f"Quiz — {item.get('title', '')}",
                passing_score=quiz_data.get("passingScore", 70),
                max_attempts=3,
                shuffle_questions=False,
                shuffle_options=True,
                status="published",
            )
            session.add(quiz)
            await session.flush()

            for q_idx, q in enumerate(questions):
                # Normalise correctAnswer to string
                correct = q.get("correctAnswer", "")
                if isinstance(correct, bool):
                    correct = str(correct).lower()
                elif isinstance(correct, int):
                    correct = str(correct)
                else:
                    correct = str(correct)

                qq = QuizQuestion(
                    quiz_id=quiz.id,
                    question_text=q.get("question", ""),
                    question_type=q.get("type", "mcq"),
                    options=q.get("options"),
                    correct_answer=correct,
                    hint=q.get("explanation", ""),
                    feedback=None,
                    sort_order=q_idx,
                )
                session.add(qq)
