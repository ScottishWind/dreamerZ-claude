"""Media service — Cloudinary / local-fallback file upload, download, and management.

Stores asset metadata as MediaAsset rows. If CLOUDINARY_URL is set, uploads
go to Cloudinary; otherwise files are stored locally under ./uploads/ and
cloudinary_url is set to the local path.
"""

import logging
import os
import pathlib
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from models.sql_models import MediaAsset, Lesson

# ── Cloudinary setup (optional) ─────────────────────────
CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL", "")

UPLOADS_DIR = pathlib.Path(__file__).resolve().parent.parent / "uploads"

# ── Allowed file types ───────────────────────────────────
ALLOWED_TYPES = {
    # Documents
    "application/pdf": {"ext": "pdf", "category": "document"},
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        "ext": "docx", "category": "document",
    },
    "application/msword": {"ext": "doc", "category": "document"},
    # Images
    "image/png": {"ext": "png", "category": "image"},
    "image/jpeg": {"ext": "jpg", "category": "image"},
    "image/webp": {"ext": "webp", "category": "image"},
    "image/svg+xml": {"ext": "svg", "category": "image"},
    # Spreadsheets
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        "ext": "xlsx", "category": "document",
    },
    # Presentations
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
        "ext": "pptx", "category": "document",
    },
}

MAX_FILE_SIZE = 16 * 1024 * 1024  # 16 MB


def validate_upload(filename: str, content_type: str, size: int) -> dict:
    """Validate file type and size. Returns type info or raises ValueError."""
    if content_type not in ALLOWED_TYPES:
        raise ValueError(
            f"File type '{content_type}' is not allowed. "
            f"Accepted: PDF, DOCX, PNG, JPG, WEBP, SVG, XLSX, PPTX"
        )
    if size > MAX_FILE_SIZE:
        raise ValueError(
            f"File size ({size // 1024 // 1024}MB) exceeds the "
            f"{MAX_FILE_SIZE // 1024 // 1024}MB limit."
        )
    return ALLOWED_TYPES[content_type]


async def upload_file(
    session: AsyncSession,
    file_data: bytes,
    filename: str,
    content_type: str,
    uploaded_by: str,
    lesson_id: int = None,
    tags: list = None,
) -> dict:
    """Upload a file to Cloudinary (or local disk) and create a MediaAsset record.

    Returns the created media asset as a dict.
    """
    type_info = validate_upload(filename, content_type, len(file_data))
    public_id = f"dreamerz/{uuid.uuid4().hex[:16]}"
    ext = type_info["ext"]

    if CLOUDINARY_URL:
        # Upload to Cloudinary
        import cloudinary
        import cloudinary.uploader

        cloudinary.config(cloudinary_url=CLOUDINARY_URL)
        result = cloudinary.uploader.upload(
            file_data,
            public_id=public_id,
            resource_type="auto",
            folder="dreamerz",
        )
        url = result["secure_url"]
        cloud_public_id = result["public_id"]
    else:
        # Local fallback: save to ./uploads/
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        local_filename = f"{uuid.uuid4().hex[:16]}.{ext}"
        local_path = UPLOADS_DIR / local_filename
        local_path.write_bytes(file_data)
        url = f"uploads/{local_filename}"
        cloud_public_id = local_filename

    asset = MediaAsset(
        lesson_id=lesson_id,
        asset_type=type_info["category"],
        cloudinary_url=url,
        cloudinary_public_id=cloud_public_id,
        original_filename=filename,
        mime_type=content_type,
        file_size_bytes=len(file_data),
        alt_text="",
        tags=tags or [],
        uploaded_by=uploaded_by,
    )
    session.add(asset)
    await session.flush()

    return asset.to_dict()


async def get_file_data(session: AsyncSession, asset_id: int) -> tuple:
    """Retrieve file info for an asset.

    Returns (file_bytes_or_None, filename, content_type, cloudinary_url).
    - If cloudinary_url starts with "http", caller should redirect to it.
    - If it is a local path, caller should serve from disk.
    """
    result = await session.execute(
        select(MediaAsset).where(MediaAsset.id == asset_id)
    )
    asset = result.scalars().first()
    if not asset:
        raise ValueError("Media asset not found")

    url = asset.cloudinary_url
    if url.startswith("http"):
        # Cloudinary-hosted: return None for bytes, caller redirects
        return None, asset.original_filename, asset.mime_type, url
    else:
        # Local file
        local_path = UPLOADS_DIR.parent / url
        if not local_path.exists():
            raise ValueError("Local file not found on disk")
        file_bytes = local_path.read_bytes()
        return file_bytes, asset.original_filename, asset.mime_type, url


async def delete_file(session: AsyncSession, asset_id: int) -> bool:
    """Delete a file from Cloudinary (or local disk) and its DB record."""
    result = await session.execute(
        select(MediaAsset).where(MediaAsset.id == asset_id)
    )
    asset = result.scalars().first()
    if not asset:
        raise ValueError("Media asset not found")

    url = asset.cloudinary_url
    if url.startswith("http") and CLOUDINARY_URL:
        # Delete from Cloudinary
        try:
            import cloudinary
            import cloudinary.uploader

            cloudinary.config(cloudinary_url=CLOUDINARY_URL)
            cloudinary.uploader.destroy(asset.cloudinary_public_id)
        except Exception as e:
            logging.warning("Cloudinary delete failed: %s", e)
    else:
        # Delete local file
        local_path = UPLOADS_DIR.parent / url
        if local_path.exists():
            local_path.unlink()

    await session.delete(asset)
    await session.flush()
    return True


async def list_assets(
    session: AsyncSession,
    asset_type: str = None,
    lesson_id: int = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple:
    """List media assets with optional filters. Returns (assets, total)."""
    query = select(MediaAsset)
    count_query = select(func.count(MediaAsset.id))

    if asset_type:
        query = query.where(MediaAsset.asset_type == asset_type)
        count_query = count_query.where(MediaAsset.asset_type == asset_type)
    if lesson_id is not None:
        query = query.where(MediaAsset.lesson_id == lesson_id)
        count_query = count_query.where(MediaAsset.lesson_id == lesson_id)

    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(MediaAsset.uploaded_at.desc()).offset(skip).limit(limit)
    result = await session.execute(query)
    assets = [a.to_dict() for a in result.scalars().all()]

    return assets, total


async def attach_to_lesson(session: AsyncSession, asset_id: int, lesson_id: int) -> bool:
    """Link a media asset to a lesson."""
    result = await session.execute(
        select(MediaAsset).where(MediaAsset.id == asset_id)
    )
    asset = result.scalars().first()
    if not asset:
        raise ValueError("Media asset not found")

    result = await session.execute(
        select(Lesson).where(Lesson.id == lesson_id)
    )
    lesson = result.scalars().first()
    if not lesson:
        raise ValueError("Lesson not found")

    asset.lesson_id = lesson_id
    await session.flush()
    return True
