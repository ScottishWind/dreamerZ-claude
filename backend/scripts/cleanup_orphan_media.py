"""
Find and optionally delete Cloudinary blobs that no longer have a
matching MediaAsset row.

When a lesson is deleted, cascade DELETE removes the MediaAsset row but
leaves the file in Cloudinary. Running this periodically (or by hand)
reclaims that storage so you stay under the free-tier quota.

Usage (dry run by default — only lists orphans, deletes nothing):

    CLOUDINARY_URL='cloudinary://key:secret@cloud' \
    DATABASE_URL_REMOTE='postgresql://...' \
        venv/Scripts/python scripts/cleanup_orphan_media.py

Pass `--delete` to actually destroy the orphan blobs:

    ... scripts/cleanup_orphan_media.py --delete
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from models.sql_models import MediaAsset

REMOTE_URL = os.environ.get("DATABASE_URL_REMOTE", "").strip()
if not REMOTE_URL:
    print("ERROR: Set DATABASE_URL_REMOTE to your remote Postgres URL.", file=sys.stderr)
    sys.exit(1)

for _prefix in ("postgres://", "postgresql://"):
    if REMOTE_URL.startswith(_prefix):
        REMOTE_URL = "postgresql+asyncpg://" + REMOTE_URL[len(_prefix):]
        break

CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL", "").strip()
if not CLOUDINARY_URL:
    print("ERROR: Set CLOUDINARY_URL (cloudinary://key:secret@cloud).", file=sys.stderr)
    sys.exit(1)


async def list_cloudinary_blobs(prefix: str = "dreamerz/") -> list[dict]:
    """Walk all resource_types and return [{public_id, resource_type, bytes}]."""
    import cloudinary
    import cloudinary.api
    cloudinary.config(cloudinary_url=CLOUDINARY_URL)

    blobs: list[dict] = []
    for resource_type in ("image", "video", "raw"):
        next_cursor = None
        while True:
            kwargs = {"type": "upload", "prefix": prefix, "max_results": 500}
            if next_cursor:
                kwargs["next_cursor"] = next_cursor
            resp = await asyncio.to_thread(
                cloudinary.api.resources, resource_type=resource_type, **kwargs
            )
            for r in resp.get("resources", []):
                blobs.append({
                    "public_id": r.get("public_id"),
                    "resource_type": r.get("resource_type") or resource_type,
                    "bytes": r.get("bytes", 0),
                })
            next_cursor = resp.get("next_cursor")
            if not next_cursor:
                break
    return blobs


async def list_db_public_ids() -> set[str]:
    engine = create_async_engine(REMOTE_URL)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with Session() as session:
            result = await session.execute(select(MediaAsset.cloudinary_public_id))
            return {row[0] for row in result.all() if row[0]}
    finally:
        await engine.dispose()


async def destroy_blob(public_id: str, resource_type: str) -> bool:
    import cloudinary
    import cloudinary.uploader
    cloudinary.config(cloudinary_url=CLOUDINARY_URL)
    try:
        resp = await asyncio.to_thread(
            cloudinary.uploader.destroy, public_id, resource_type=resource_type
        )
        return resp.get("result") == "ok"
    except Exception as exc:
        print(f"    delete failed for {public_id}: {exc}", file=sys.stderr)
        return False


async def main(do_delete: bool) -> None:
    print("Inventorying Cloudinary...")
    blobs = await list_cloudinary_blobs()
    print(f"  Cloudinary: {len(blobs)} blobs under 'dreamerz/' prefix")

    print("Inventorying DB...")
    db_ids = await list_db_public_ids()
    print(f"  Postgres : {len(db_ids)} MediaAsset rows with cloudinary_public_id")

    orphans = [b for b in blobs if b["public_id"] not in db_ids]
    total_orphan_bytes = sum(b["bytes"] for b in orphans)
    print()
    print(f"Orphans: {len(orphans)} blobs ({total_orphan_bytes / 1024 / 1024:.1f} MB)")
    for b in orphans:
        print(f"  - {b['resource_type']:6s} {b['public_id']:60s} {b['bytes']:>10} B")

    if not orphans:
        print("\nNothing to do.")
        return

    if not do_delete:
        print("\nDry run. Pass --delete to actually destroy these blobs.")
        return

    print("\nDeleting...")
    deleted = 0
    for b in orphans:
        ok = await destroy_blob(b["public_id"], b["resource_type"])
        if ok:
            deleted += 1
            print(f"  destroyed {b['public_id']}")
    print(f"\nDone. Deleted {deleted}/{len(orphans)} orphans.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--delete", action="store_true", help="Actually delete orphans (default: dry run)")
    args = parser.parse_args()
    asyncio.run(main(do_delete=args.delete))
