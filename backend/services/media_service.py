"""Media service — GridFS-based file upload, download, and management."""

import io
import logging
import uuid
from datetime import datetime, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorGridFSBucket

from database import db, fs_bucket

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

MAX_FILE_SIZE = 16 * 1024 * 1024  # 16 MB (GridFS works well up to this)


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
    file_data: bytes,
    filename: str,
    content_type: str,
    uploaded_by: str,
    course_id: str = None,
    lesson_id: str = None,
    tags: list = None,
) -> dict:
    """Upload a file to GridFS and create a media_assets document.

    Returns the created media asset document.
    """
    type_info = validate_upload(filename, content_type, len(file_data))
    asset_id = f"asset-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()

    # Upload to GridFS
    grid_in = fs_bucket.open_upload_stream(
        filename,
        metadata={
            "asset_id": asset_id,
            "content_type": content_type,
            "uploaded_by": uploaded_by,
        },
    )
    await grid_in.write(file_data)
    await grid_in.close()
    gridfs_id = grid_in._id

    # Create media_assets document
    asset_doc = {
        "id": asset_id,
        "type": type_info["category"],
        "original_filename": filename,
        "mime_type": content_type,
        "file_extension": type_info["ext"],
        "file_size_bytes": len(file_data),
        "gridfs_id": str(gridfs_id),
        "course_id": course_id,
        "lesson_id": lesson_id,
        "used_in_lessons": [lesson_id] if lesson_id else [],
        "alt_text": "",
        "tags": tags or [],
        "uploaded_by": uploaded_by,
        "uploaded_at": now,
        "updated_at": now,
    }
    await db.media_assets.insert_one(asset_doc)

    # Return clean doc (no MongoDB _id)
    asset_doc.pop("_id", None)
    return asset_doc


async def get_file_data(asset_id: str) -> tuple:
    """Retrieve file bytes and metadata from GridFS.

    Returns (file_bytes, filename, content_type) or raises ValueError.
    """
    asset = await db.media_assets.find_one({"id": asset_id})
    if not asset:
        raise ValueError("Media asset not found")

    gridfs_id = ObjectId(asset["gridfs_id"])

    # Download from GridFS
    grid_out = await fs_bucket.open_download_stream(gridfs_id)
    file_data = await grid_out.read()

    return file_data, asset["original_filename"], asset["mime_type"]


async def delete_file(asset_id: str) -> bool:
    """Delete a file from GridFS and its media_assets document."""
    asset = await db.media_assets.find_one({"id": asset_id})
    if not asset:
        raise ValueError("Media asset not found")

    # Delete from GridFS
    gridfs_id = ObjectId(asset["gridfs_id"])
    await fs_bucket.delete(gridfs_id)

    # Delete the asset document
    await db.media_assets.delete_one({"id": asset_id})

    # Remove references from lessons
    if asset.get("used_in_lessons"):
        await db.lessons.update_many(
            {"id": {"$in": asset["used_in_lessons"]}},
            {"$pull": {"media_asset_ids": asset_id}},
        )

    return True


async def list_assets(
    asset_type: str = None,
    course_id: str = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple:
    """List media assets with optional filters. Returns (assets, total)."""
    query = {}
    if asset_type:
        query["type"] = asset_type
    if course_id:
        query["course_id"] = course_id

    total = await db.media_assets.count_documents(query)
    assets = await (
        db.media_assets.find(query, {"_id": 0})
        .sort("uploaded_at", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return assets, total


async def attach_to_lesson(asset_id: str, lesson_id: str) -> bool:
    """Link a media asset to a lesson."""
    asset = await db.media_assets.find_one({"id": asset_id})
    if not asset:
        raise ValueError("Media asset not found")

    lesson = await db.lessons.find_one({"id": lesson_id})
    if not lesson:
        raise ValueError("Lesson not found")

    await db.media_assets.update_one(
        {"id": asset_id},
        {"$addToSet": {"used_in_lessons": lesson_id}},
    )
    await db.lessons.update_one(
        {"id": lesson_id},
        {"$addToSet": {"media_asset_ids": asset_id}},
    )
    return True
