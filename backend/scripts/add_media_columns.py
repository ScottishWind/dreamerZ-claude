"""
One-shot Postgres migration: add the new MediaAsset columns introduced
by the direct-to-Cloudinary upload flow.

New columns on `media_assets`:
    width            INTEGER     NULL
    height           INTEGER     NULL
    poster_url       VARCHAR(500) NULL
    streaming_url    VARCHAR(500) NULL
    upload_status    VARCHAR(30) NOT NULL DEFAULT 'ready'

Usage (from backend/):

    DATABASE_URL_REMOTE='postgresql://...' \
        venv/Scripts/python scripts/add_media_columns.py

Idempotent: each ADD COLUMN uses `IF NOT EXISTS`, so re-running is safe.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


REMOTE_URL = os.environ.get("DATABASE_URL_REMOTE", "").strip()
if not REMOTE_URL:
    print("ERROR: Set DATABASE_URL_REMOTE to your remote Postgres URL.", file=sys.stderr)
    sys.exit(1)

for _prefix in ("postgres://", "postgresql://"):
    if REMOTE_URL.startswith(_prefix):
        REMOTE_URL = "postgresql+asyncpg://" + REMOTE_URL[len(_prefix):]
        break


STATEMENTS = [
    'ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS width INTEGER',
    'ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS height INTEGER',
    'ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS poster_url VARCHAR(500)',
    'ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS streaming_url VARCHAR(500)',
    "ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS upload_status VARCHAR(30) NOT NULL DEFAULT 'ready'",
]


async def main() -> None:
    safe_remote = REMOTE_URL.split("@")[-1] if "@" in REMOTE_URL else REMOTE_URL
    print(f"Remote: {safe_remote}\n")
    engine = create_async_engine(REMOTE_URL)
    try:
        async with engine.begin() as conn:
            for stmt in STATEMENTS:
                try:
                    await conn.execute(text(stmt))
                    print(f"  ok  {stmt}")
                except Exception as exc:
                    print(f"  FAIL  {stmt}: {exc}")
                    raise
    finally:
        await engine.dispose()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
