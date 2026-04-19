"""Content routes — tools, modules, categories, media serve."""

import io
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from database import db, fs_bucket, CATEGORIES_DATA
from utils.sanitizers import sanitize_id

router = APIRouter(prefix="/content", tags=["content"])


@router.get("/tools")
async def get_content_tools():
    """Get all tools with their modules (uses aggregation pipeline to avoid N+1)."""
    pipeline = [
        {
            "$lookup": {
                "from": "modules",
                "localField": "id",
                "foreignField": "tool_id",
                "as": "modules",
            }
        },
        {"$project": {"_id": 0}},
    ]
    tools = await db.tools.aggregate(pipeline).to_list(100)

    # Remove _id from nested modules
    for tool in tools:
        tool["modules"] = [
            {k: v for k, v in m.items() if k != "_id"}
            for m in tool.get("modules", [])
        ]

    return tools


@router.get("/tools/{tool_id}")
async def get_content_tool(tool_id: str):
    tool_id = sanitize_id(tool_id, "tool_id")
    tool = await db.tools.find_one({"id": tool_id}, {"_id": 0})
    if not tool:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Tool not found")

    modules = await db.modules.find(
        {"tool_id": tool_id}, {"_id": 0}
    ).to_list(1000)
    return {**tool, "modules": modules}


@router.get("/modules")
async def get_content_modules(tool_id: Optional[str] = None):
    query = {}
    if tool_id:
        query["tool_id"] = sanitize_id(tool_id, "tool_id")
    return await db.modules.find(query, {"_id": 0}).to_list(1000)


@router.get("/categories")
async def get_content_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    if not categories:
        return CATEGORIES_DATA
    return categories


@router.get("/categories/{category_id}/tools")
async def get_content_tools_by_category(category_id: str):
    """Get tools by category with modules (uses aggregation to avoid N+1)."""
    category_id = sanitize_id(category_id, "category_id")

    pipeline = [
        {"$match": {"category_id": category_id}},
        {
            "$lookup": {
                "from": "modules",
                "localField": "id",
                "foreignField": "tool_id",
                "as": "modules",
            }
        },
        {"$project": {"_id": 0}},
    ]
    tools = await db.tools.aggregate(pipeline).to_list(100)

    for tool in tools:
        tool["modules"] = [
            {k: v for k, v in m.items() if k != "_id"}
            for m in tool.get("modules", [])
        ]

    return tools


# ── Public media serve (no auth required) ────────────────
@router.get("/media/{asset_id}")
async def serve_media(asset_id: str):
    """Serve a media file publicly (for images/docs in lesson content)."""
    asset_id = sanitize_id(asset_id, "asset_id")
    asset = await db.media_assets.find_one({"id": asset_id})
    if not asset:
        raise HTTPException(status_code=404, detail="Media not found")

    gridfs_id = ObjectId(asset["gridfs_id"])
    grid_out = await fs_bucket.open_download_stream(gridfs_id)
    file_data = await grid_out.read()

    return StreamingResponse(
        io.BytesIO(file_data),
        media_type=asset["mime_type"],
        headers={
            "Content-Disposition": f'inline; filename="{asset["original_filename"]}"',
            "Cache-Control": "public, max-age=86400",
        },
    )
