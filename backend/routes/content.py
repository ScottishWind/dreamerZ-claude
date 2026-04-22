"""Content routes — tools, modules, categories, media serve, language support."""

import io
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from config import DEFAULT_LANGUAGE
from database import db, fs_bucket, CATEGORIES_DATA
from utils.sanitizers import sanitize_id

router = APIRouter(prefix="/content", tags=["content"])


async def _overlay_localized_content(modules: list, lang: str) -> list:
    """Overlay translated content onto modules if a non-English language is requested.

    For each module, look up the lesson_contents entry for the requested language.
    If found and published (or draft), overwrite the module's content fields.
    Falls back to English if no translation exists.
    """
    if lang == "en" or not lang:
        return modules

    module_ids = [m["id"] for m in modules]
    if not module_ids:
        return modules

    # Batch-load translated content for all modules in this language
    translated = await db.lesson_contents.find(
        {"lesson_id": {"$in": module_ids}, "language": lang},
        {"_id": 0},
    ).to_list(1000)

    # Build lookup by lesson_id
    trans_map = {t["lesson_id"]: t for t in translated}

    content_fields = [
        "explanation", "example", "activity", "bengali_tip",
        "micro_grammar", "speaking_task", "vocab", "dialogue",
    ]

    for mod in modules:
        tc = trans_map.get(mod["id"])
        if not tc:
            continue  # No translation — keep English

        # Overlay content fields
        if "content" in mod and isinstance(mod["content"], dict):
            for field in content_fields:
                if field in tc and tc[field]:
                    mod["content"][field] = tc[field]
        # Also set top-level fields for flat-format modules
        for field in content_fields:
            if field in tc and tc[field] and field in mod:
                mod[field] = tc[field]

        # Add language metadata
        mod["_display_language"] = lang
        mod["_translation_status"] = tc.get("status", "draft")

    return modules


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

    # Collect all module IDs for media lookup
    all_module_ids = []
    for tool in tools:
        tool["modules"] = [
            {k: v for k, v in m.items() if k != "_id"}
            for m in tool.get("modules", [])
        ]
        all_module_ids.extend(m["id"] for m in tool["modules"])

    # Batch-load media assets for all modules
    asset_map = {}
    if all_module_ids:
        all_assets = await db.media_assets.find(
            {"used_in_lessons": {"$in": all_module_ids}},
            {"_id": 0},
        ).to_list(2000)
        for asset in all_assets:
            for lid in asset.get("used_in_lessons", []):
                asset_map.setdefault(lid, []).append(asset)

    for tool in tools:
        for mod in tool["modules"]:
            mod["media_assets"] = asset_map.get(mod["id"], [])

    return tools


@router.get("/tools/{tool_id}")
async def get_content_tool(tool_id: str, lang: str = Query(default="en", max_length=5)):
    tool_id = sanitize_id(tool_id, "tool_id")
    tool = await db.tools.find_one({"id": tool_id}, {"_id": 0})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    modules = await db.modules.find(
        {"tool_id": tool_id}, {"_id": 0}
    ).to_list(1000)

    # Attach media assets for each module (via lessons collection)
    module_ids = [m["id"] for m in modules]
    if module_ids:
        # Get all media assets linked to any of these modules/lessons
        all_assets = await db.media_assets.find(
            {"used_in_lessons": {"$in": module_ids}},
            {"_id": 0},
        ).to_list(500)

        # Group assets by lesson/module id
        asset_map = {}
        for asset in all_assets:
            for lid in asset.get("used_in_lessons", []):
                asset_map.setdefault(lid, []).append(asset)

        for mod in modules:
            mod["media_assets"] = asset_map.get(mod["id"], [])

    # Overlay translated content if a non-English language is requested
    modules = await _overlay_localized_content(modules, lang.strip().lower())

    return {**tool, "modules": modules}


# ── Published Courses (LMS / AI-generated) ──────────────

@router.get("/courses")
async def get_published_courses():
    """Get all published courses with section/lesson counts for the learn hub."""
    pipeline = [
        {"$match": {"status": "published"}},
        {
            "$lookup": {
                "from": "sections",
                "localField": "id",
                "foreignField": "course_id",
                "as": "sections",
            }
        },
        {
            "$lookup": {
                "from": "lessons",
                "localField": "id",
                "foreignField": "course_id",
                "as": "all_lessons",
            }
        },
        {"$project": {"_id": 0}},
        {"$sort": {"created_at": -1}},
    ]
    courses = await db.courses.aggregate(pipeline).to_list(100)

    for course in courses:
        # Clean up _id from sub-docs
        course["sections"] = [
            {k: v for k, v in s.items() if k != "_id"}
            for s in course.get("sections", [])
        ]
        lessons = [
            {k: v for k, v in l.items() if k != "_id"}
            for l in course.get("all_lessons", [])
        ]
        # Nest lessons under their sections
        for section in course["sections"]:
            section["lessons"] = sorted(
                [l for l in lessons if l.get("section_id") == section["id"]],
                key=lambda l: l.get("sort_order", 0),
            )
        del course["all_lessons"]

    return courses


@router.get("/courses/{course_id}")
async def get_published_course(
    course_id: str,
    lang: str = Query(default="en", max_length=5),
):
    """Get a single published course with full content (for the player)."""
    course_id = sanitize_id(course_id, "course_id")
    course = await db.courses.find_one(
        {"id": course_id, "status": "published"}, {"_id": 0}
    )
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Sections
    sections = await db.sections.find(
        {"course_id": course_id}, {"_id": 0}
    ).sort("sort_order", 1).to_list(100)

    # All lessons for this course
    lessons = await db.lessons.find(
        {"course_id": course_id}, {"_id": 0}
    ).sort("sort_order", 1).to_list(1000)

    # Batch-load lesson content for requested language
    lesson_ids = [l["id"] for l in lessons]
    contents = await db.lesson_contents.find(
        {"lesson_id": {"$in": lesson_ids}, "language": lang}, {"_id": 0}
    ).to_list(1000)
    content_map = {c["lesson_id"]: c for c in contents}

    # Fall back to English if requested language content missing
    if lang != "en":
        en_contents = await db.lesson_contents.find(
            {"lesson_id": {"$in": lesson_ids}, "language": "en"}, {"_id": 0}
        ).to_list(1000)
        en_map = {c["lesson_id"]: c for c in en_contents}
    else:
        en_map = {}

    # Batch-load assessments
    assessments = await db.assessments.find(
        {"course_id": course_id}, {"_id": 0}
    ).to_list(500)
    assess_map = {a["lesson_id"]: a for a in assessments}

    # Assemble: convert LMS structure → tool-like flat module list for the player
    modules = []
    for lesson in lessons:
        lid = lesson["id"]
        lc = content_map.get(lid) or en_map.get(lid, {})
        quiz = assess_map.get(lid)

        module = {
            "id": lid,
            "tool_id": course_id,
            "title": lesson.get("title", ""),
            "level": lesson.get("level", "beginner"),
            "minutes": lesson.get("estimated_minutes", 10),
            "week": lesson.get("week"),
            "day": lesson.get("sort_order"),
            "isAdvanced": lesson.get("level") == "advanced",
            "is_weekly_test": lesson.get("is_weekly_test", False),
            "description": (lc.get("explanation") or "")[:120],
            "content": {
                "explanation": lc.get("explanation", ""),
                "example": lc.get("example", ""),
                "activity": lc.get("activity", ""),
            },
            "quiz": quiz if quiz else {},
            "media_assets": [],
        }
        modules.append(module)

    return {
        **course,
        "id": course_id,
        "modules": modules,
    }


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

    all_module_ids = []
    for tool in tools:
        tool["modules"] = [
            {k: v for k, v in m.items() if k != "_id"}
            for m in tool.get("modules", [])
        ]
        all_module_ids.extend(m["id"] for m in tool["modules"])

    # Batch-load media assets
    asset_map = {}
    if all_module_ids:
        all_assets = await db.media_assets.find(
            {"used_in_lessons": {"$in": all_module_ids}},
            {"_id": 0},
        ).to_list(2000)
        for asset in all_assets:
            for lid in asset.get("used_in_lessons", []):
                asset_map.setdefault(lid, []).append(asset)

    for tool in tools:
        for mod in tool["modules"]:
            mod["media_assets"] = asset_map.get(mod["id"], [])

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
