"""
One-shot Postgres migration: convert progress / enrollment timestamp
columns from TIMESTAMP WITHOUT TIME ZONE to TIMESTAMPTZ.

The model was updated to use DateTime(timezone=True), but
init_db.create_all() never ALTERs existing columns, so production
tables stay naive and reject TZ-aware datetime inserts.

Usage (from the backend/ directory):

    DATABASE_URL_REMOTE='postgresql+asyncpg://user:pass@host:5432/db' \
        venv/Scripts/python scripts/migrate_timestamps_to_tzaware.py

Get the URL from the Render dashboard:
    dreamerz-db -> Connect -> External Database URL

The script is idempotent — running it on already-TIMESTAMPTZ columns
is a no-op (Postgres re-rewrites the column with the same value).
Naive values are interpreted as UTC, which matches what the
application code passes in (datetime.now(timezone.utc) historically
got truncated to naive on the way in).
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

# Allow running from backend/ as `python scripts/...`
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


REMOTE_URL = os.environ.get("DATABASE_URL_REMOTE", "").strip()
if not REMOTE_URL:
    print("ERROR: Set DATABASE_URL_REMOTE to your remote Postgres URL.", file=sys.stderr)
    print("       Get it from Render -> dreamerz-db -> External Database URL.", file=sys.stderr)
    sys.exit(1)

for _prefix in ("postgres://", "postgresql://"):
    if REMOTE_URL.startswith(_prefix):
        REMOTE_URL = "postgresql+asyncpg://" + REMOTE_URL[len(_prefix):]
        break

# (table, column) pairs that need to become TIMESTAMPTZ. Pulled from
# sql_models.py — keep this in sync if you add new timestamp columns.
TARGETS: list[tuple[str, str]] = [
    ("student_course_enrollments", "started_at"),
    ("student_course_enrollments", "completed_at"),
    ("student_course_enrollments", "last_accessed_at"),
    ("student_course_enrollments", "created_at"),
    ("student_course_enrollments", "updated_at"),
    ("student_lesson_progress",    "started_at"),
    ("student_lesson_progress",    "completed_at"),
    ("student_lesson_progress",    "last_accessed_at"),
    ("student_lesson_progress",    "created_at"),
    ("student_lesson_progress",    "updated_at"),
    ("assessment_attempts",        "started_at"),
    ("assessment_attempts",        "submitted_at"),
    ("assessment_attempts",        "graded_at"),
    ("assessment_attempts",        "created_at"),
    ("assessment_attempts",        "updated_at"),
    ("assessment_attempt_answers", "created_at"),
    ("parent_student_links",       "linked_at"),
    ("parent_student_links",       "created_at"),
    ("parent_student_links",       "updated_at"),
]


async def column_exists(conn, table: str, column: str) -> bool:
    result = await conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name=:t AND column_name=:c"
    ), {"t": table, "c": column})
    return result.first() is not None


async def column_type(conn, table: str, column: str) -> str | None:
    result = await conn.execute(text(
        "SELECT data_type FROM information_schema.columns "
        "WHERE table_schema='public' AND table_name=:t AND column_name=:c"
    ), {"t": table, "c": column})
    row = result.first()
    return row[0] if row else None


async def main() -> None:
    safe_remote = REMOTE_URL.split("@")[-1] if "@" in REMOTE_URL else REMOTE_URL
    print(f"Remote: {safe_remote}\n")

    engine = create_async_engine(REMOTE_URL)
    altered = 0
    skipped_missing = 0
    skipped_already = 0
    failed = 0

    try:
        async with engine.begin() as conn:
            for table, column in TARGETS:
                if not await column_exists(conn, table, column):
                    print(f"  skip   {table}.{column} (table or column does not exist)")
                    skipped_missing += 1
                    continue

                ctype = await column_type(conn, table, column)
                if ctype == "timestamp with time zone":
                    print(f"  ok     {table}.{column} (already TIMESTAMPTZ)")
                    skipped_already += 1
                    continue

                # ALTER. Use AT TIME ZONE 'UTC' so any existing naive value
                # is interpreted as UTC (matching the app's intent).
                stmt = text(
                    f'ALTER TABLE "{table}" '
                    f'ALTER COLUMN "{column}" TYPE timestamptz '
                    f'USING "{column}" AT TIME ZONE \'UTC\''
                )
                try:
                    await conn.execute(stmt)
                    print(f"  alter  {table}.{column} ({ctype} -> timestamptz)")
                    altered += 1
                except Exception as exc:
                    print(f"  FAIL   {table}.{column}: {exc}")
                    failed += 1
    finally:
        await engine.dispose()

    print()
    print(f"Altered: {altered}")
    print(f"Already correct: {skipped_already}")
    print(f"Missing (table/column not in schema): {skipped_missing}")
    print(f"Failed: {failed}")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
