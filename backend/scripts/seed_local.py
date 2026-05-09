"""
Seed a local SQLite database with static curriculum data for development.

Usage:
    python scripts/seed_local.py

Uses the JSON seed files bundled in the repo.
"""

from __future__ import annotations

import asyncio
import os
import sys

# Ensure the backend package root is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Set default DATABASE_URL before importing config/database (they read env at import time)
if "DATABASE_URL" not in os.environ:
    os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./dreamerz.db"

from sqlalchemy import select, func as sqla_func

from database import init_db, seed_data, async_session, engine
from models.sql_models import (
    User,
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


async def _create_test_user(session) -> None:
    """Create a test user if one does not already exist."""
    from services.auth_service import get_password_hash

    result = await session.execute(
        select(User).where(User.username == "testuser")
    )
    if result.scalars().first():
        print("  Test user 'testuser' already exists — skipped.")
        return

    user = User(
        username="testuser",
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        preferred_language="en",
        is_admin=False,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    print("  Test user created: username=testuser, email=test@example.com, password=password123")


async def _print_summary(session) -> None:
    """Print row counts for seeded tables."""
    tables = [
        ("categories", Category),
        ("courses", Course),
        ("modules", Module),
        ("lessons", Lesson),
        ("lesson_contents", LessonContent),
        ("quizzes", Quiz),
        ("quiz_questions", QuizQuestion),
        ("pricing_plans", PricingPlan),
        ("faqs", FAQ),
        ("users", User),
    ]
    print("\n--- Seed summary ---")
    for label, model in tables:
        result = await session.execute(select(sqla_func.count()).select_from(model))
        count = result.scalar()
        print(f"  {label:20s} {count}")
    print()


async def main() -> None:
    db_url = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./dreamerz.db")
    print(f"Database: {db_url}\n")

    print("Dropping old tables and creating fresh schema ...")
    await init_db(drop_first=True)

    print("Seeding curriculum data ...")
    await seed_data()

    print("Creating test user ...")
    async with async_session() as session:
        async with session.begin():
            await _create_test_user(session)

    async with async_session() as session:
        await _print_summary(session)

    await engine.dispose()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
