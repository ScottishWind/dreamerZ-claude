"""
One-shot script: wipe-and-replace remote content tables with local SQLite data.

Usage (from the backend/ directory):

    DATABASE_URL_REMOTE='postgresql+asyncpg://user:pass@host:5432/db' \
        venv/Scripts/python scripts/sync_to_remote.py

Get the remote URL from the Render dashboard:
    dreamerz-db -> Connect -> External Database URL

The script accepts both `postgres://` and `postgresql://` prefixes and
rewrites them to `postgresql+asyncpg://`.

Tables synced (full mirror, in this order):
    categories -> courses -> modules -> lessons -> lesson_contents
    -> quizzes -> quiz_questions

Tables NOT synced (intentionally):
    - users, enrollments        (authentication is per-environment)
    - status_checks             (operational, environment-specific)
    - pricing_plans, faqs       (already populated via seed_data on boot)
    - media_assets              (references local Cloudinary state)

Timestamps are not copied; the remote DB's server_default = now() fills
created_at / updated_at on insert. Loses original creation times in
exchange for not having to coerce SQLite-naive datetimes into Postgres
TIMESTAMPTZ.

Idempotent: every run wipes the 7 content tables on the remote first,
then re-inserts the local rows.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# Make sibling packages (models, config, ...) importable when this file
# is invoked as `python scripts/sync_to_remote.py` from backend/.
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from models.sql_models import (
    Category, Course, Module, Lesson, LessonContent, Quiz, QuizQuestion,
)


LOCAL_URL = "sqlite+aiosqlite:///./dreamerz.db"

REMOTE_URL = os.environ.get("DATABASE_URL_REMOTE", "").strip()
if not REMOTE_URL:
    print("ERROR: Set DATABASE_URL_REMOTE to your remote Postgres URL.", file=sys.stderr)
    print("       Get it from Render -> dreamerz-db -> External Database URL.", file=sys.stderr)
    sys.exit(1)

# Normalise to the async driver SQLAlchemy needs.
for _prefix in ("postgres://", "postgresql://"):
    if REMOTE_URL.startswith(_prefix):
        REMOTE_URL = "postgresql+asyncpg://" + REMOTE_URL[len(_prefix):]
        break


async def main() -> None:
    safe_remote = REMOTE_URL.split("@")[-1] if "@" in REMOTE_URL else REMOTE_URL
    print(f"Local : {LOCAL_URL}")
    print(f"Remote: {safe_remote}")
    print()

    local_engine = create_async_engine(LOCAL_URL)
    remote_engine = create_async_engine(REMOTE_URL)
    LocalSession = async_sessionmaker(local_engine, expire_on_commit=False)
    RemoteSession = async_sessionmaker(remote_engine, expire_on_commit=False)

    try:
        async with LocalSession() as local, RemoteSession() as remote:
            # 1. Wipe remote content tables in reverse FK order.
            print("Wiping remote content tables...")
            for model in (QuizQuestion, Quiz, LessonContent, Lesson, Module, Course, Category):
                await remote.execute(delete(model))
            await remote.commit()

            # 2. Categories.
            cats = (await local.execute(select(Category).order_by(Category.id))).scalars().all()
            cat_id_map: dict[int, Category] = {}
            for c in cats:
                new = Category(
                    slug=c.slug, name=c.name, description=c.description,
                    icon=c.icon, sort_order=c.sort_order,
                    is_active=c.is_active, status=c.status,
                )
                remote.add(new)
                await remote.flush()
                cat_id_map[c.id] = new
            await remote.commit()
            print(f"  categories      : {len(cats)}")

            # 3. Courses.
            courses = (await local.execute(select(Course).order_by(Course.id))).scalars().all()
            course_id_map: dict[int, Course] = {}
            for c in courses:
                remote_cat = cat_id_map.get(c.category_id)
                new = Course(
                    category_id=remote_cat.id if remote_cat else None,
                    slug=c.slug, name=c.name, description=c.description,
                    tagline=c.tagline, icon=c.icon, theme_color=c.theme_color,
                    difficulty=c.difficulty, total_xp=c.total_xp,
                    sort_order=c.sort_order, status=c.status,
                    available_languages=c.available_languages, tags=c.tags,
                    blueprint_json=c.blueprint_json, created_by=c.created_by,
                )
                remote.add(new)
                await remote.flush()
                course_id_map[c.id] = new
            await remote.commit()
            print(f"  courses         : {len(courses)}")

            # 4. Modules.
            modules = (await local.execute(select(Module).order_by(Module.id))).scalars().all()
            module_id_map: dict[int, Module] = {}
            inserted_modules = 0
            for m in modules:
                remote_course = course_id_map.get(m.course_id)
                if not remote_course:
                    continue
                new = Module(
                    course_id=remote_course.id,
                    slug=m.slug, title=m.title, description=m.description,
                    sort_order=m.sort_order, is_active=m.is_active, status=m.status,
                )
                remote.add(new)
                await remote.flush()
                module_id_map[m.id] = new
                inserted_modules += 1
            await remote.commit()
            print(f"  modules         : {inserted_modules}")

            # 5. Lessons.
            lessons = (await local.execute(select(Lesson).order_by(Lesson.id))).scalars().all()
            lesson_id_map: dict[int, Lesson] = {}
            inserted_lessons = 0
            for les in lessons:
                remote_module = module_id_map.get(les.module_id)
                if not remote_module:
                    continue
                new = Lesson(
                    module_id=remote_module.id,
                    slug=les.slug, title=les.title, description=les.description,
                    sort_order=les.sort_order, level=les.level,
                    estimated_minutes=les.estimated_minutes, xp_reward=les.xp_reward,
                    week=les.week, day=les.day, is_weekly_test=les.is_weekly_test,
                    status=les.status,
                )
                remote.add(new)
                await remote.flush()
                lesson_id_map[les.id] = new
                inserted_lessons += 1
            await remote.commit()
            print(f"  lessons         : {inserted_lessons}")

            # 6. Lesson contents.
            contents = (await local.execute(select(LessonContent).order_by(LessonContent.id))).scalars().all()
            inserted_contents = 0
            for lc in contents:
                remote_lesson = lesson_id_map.get(lc.lesson_id)
                if not remote_lesson:
                    continue
                remote.add(LessonContent(
                    lesson_id=remote_lesson.id, language=lc.language,
                    explanation=lc.explanation,
                    explanation_format=lc.explanation_format,
                    example=lc.example, activity=lc.activity,
                    bengali_tip=lc.bengali_tip, micro_grammar=lc.micro_grammar,
                    speaking_task=lc.speaking_task,
                    vocab=lc.vocab, dialogue=lc.dialogue,
                    sort_order=lc.sort_order, translated_by=lc.translated_by,
                    status=lc.status,
                ))
                inserted_contents += 1
            await remote.commit()
            print(f"  lesson_contents : {inserted_contents}")

            # 7. Quizzes.
            quizzes = (await local.execute(select(Quiz).order_by(Quiz.id))).scalars().all()
            quiz_id_map: dict[int, Quiz] = {}
            inserted_quizzes = 0
            for q in quizzes:
                remote_lesson = lesson_id_map.get(q.lesson_id)
                if not remote_lesson:
                    continue
                new = Quiz(
                    lesson_id=remote_lesson.id, title=q.title,
                    passing_score=q.passing_score, max_attempts=q.max_attempts,
                    shuffle_questions=q.shuffle_questions,
                    shuffle_options=q.shuffle_options,
                    sort_order=q.sort_order, status=q.status,
                )
                remote.add(new)
                await remote.flush()
                quiz_id_map[q.id] = new
                inserted_quizzes += 1
            await remote.commit()
            print(f"  quizzes         : {inserted_quizzes}")

            # 8. Quiz questions.
            questions = (await local.execute(select(QuizQuestion).order_by(QuizQuestion.id))).scalars().all()
            inserted_questions = 0
            for qq in questions:
                remote_quiz = quiz_id_map.get(qq.quiz_id)
                if not remote_quiz:
                    continue
                remote.add(QuizQuestion(
                    quiz_id=remote_quiz.id,
                    question_text=qq.question_text,
                    question_type=qq.question_type,
                    options=qq.options,
                    correct_answer=qq.correct_answer,
                    hint=qq.hint, feedback=qq.feedback,
                    sort_order=qq.sort_order,
                ))
                inserted_questions += 1
            await remote.commit()
            print(f"  quiz_questions  : {inserted_questions}")

    finally:
        await local_engine.dispose()
        await remote_engine.dispose()

    print("\nSync complete.")


if __name__ == "__main__":
    asyncio.run(main())
