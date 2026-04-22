"""Admin routes — user management, content management, media uploads (admin-only)."""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io

from config import ADMIN_EMAILS
from database import db
from models.user import AdminUserResponse
from services.auth_service import get_current_admin, is_admin
from services import media_service
from services import translation_service

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


# ── Pydantic Models ──────────────────────────────────────
class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    level: Optional[str] = None
    minutes: Optional[int] = None
    day: Optional[int] = None
    week: Optional[int] = None
    description: Optional[str] = None


class ModuleCreate(BaseModel):
    id: str
    tool_id: str
    title: str
    level: str = "beginner"
    minutes: int = 10
    day: Optional[int] = None
    week: Optional[int] = None
    description: str = ""


class ToolUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None


class ModuleReorder(BaseModel):
    module_ids: list[str]


class CourseUpdate(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[str] = None
    difficulty: Optional[str] = None
    status: Optional[str] = None


class LessonUpdate(BaseModel):
    title: Optional[str] = None
    level: Optional[str] = None
    estimated_minutes: Optional[int] = None
    content_type: Optional[str] = None
    day: Optional[int] = None
    week: Optional[int] = None
    status: Optional[str] = None


class LessonContentUpdate(BaseModel):
    explanation: Optional[str] = None
    example: Optional[str] = None
    activity: Optional[str] = None
    bengali_tip: Optional[str] = None
    micro_grammar: Optional[str] = None
    speaking_task: Optional[str] = None


class AssetAttach(BaseModel):
    lesson_id: str


class TranslateRequest(BaseModel):
    target_language: str = "bn"


# ══════════════════════════════════════════════════════════
# USER MANAGEMENT
# ══════════════════════════════════════════════════════════

@router.get("/users", response_model=list[AdminUserResponse])
async def list_users(
    search: Optional[str] = Query(None, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List all registered users with optional search."""
    query = {}
    if search:
        search = search.strip()
        query = {
            "$or": [
                {"username": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
            ]
        }

    users = await db.users.find(
        query, {"_id": 0, "hashed_password": 0}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    total = await db.users.count_documents(query)

    for u in users:
        email = u.get("email", "").lower()
        is_super = email in ADMIN_EMAILS
        u["is_admin"] = is_super or bool(u.get("is_admin", False))
        u["is_super_admin"] = is_super  # UI uses this to prevent demoting super-admins

    return users


@router.get("/users/count")
async def user_count():
    total = await db.users.count_documents({})
    return {"total": total}


class RoleUpdate(BaseModel):
    is_admin: bool


@router.put("/users/{username}/role")
async def update_user_role(
    username: str,
    body: RoleUpdate,
    current_admin: dict = Depends(get_current_admin),
):
    """Promote or demote a user to/from admin role.

    Only super-admins (those in ADMIN_EMAILS) can change roles.
    Super-admin accounts cannot be demoted.
    """
    # Only super-admins (env-var list) can manage roles
    caller_email = current_admin.get("email", "").lower()
    if caller_email not in ADMIN_EMAILS:
        raise HTTPException(
            status_code=403,
            detail="Only super-admins can manage admin roles",
        )

    username = username.strip().lower()
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent demoting a super-admin
    user_email = user.get("email", "").lower()
    if user_email in ADMIN_EMAILS and not body.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Cannot demote a super-admin (remove from ADMIN_EMAILS env var instead)",
        )

    await db.users.update_one(
        {"username": username},
        {"$set": {
            "is_admin": body.is_admin,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    action = "promoted to admin" if body.is_admin else "demoted to regular user"
    return {"detail": f"User '{username}' {action}"}


@router.delete("/users/{username}")
async def delete_user(username: str):
    username = username.strip().lower()
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("email", "").lower() in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Cannot delete an admin account")

    await db.users.delete_one({"username": username})
    await db.enrollments.delete_many({"username": username})

    return {"detail": f"User '{username}' deleted successfully"}


# ══════════════════════════════════════════════════════════
# LEGACY CONTENT MANAGEMENT (tools/modules — kept for compatibility)
# ══════════════════════════════════════════════════════════

@router.get("/tools")
async def admin_list_tools():
    pipeline = [
        {"$lookup": {"from": "modules", "localField": "id", "foreignField": "tool_id", "as": "modules"}},
        {"$addFields": {"module_count": {"$size": "$modules"}}},
        {"$project": {"_id": 0, "modules": 0}},
    ]
    return await db.tools.aggregate(pipeline).to_list(100)


@router.put("/tools/{tool_id}")
async def update_tool(tool_id: str, update: ToolUpdate):
    existing = await db.tools.find_one({"id": tool_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Tool not found")
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tools.update_one({"id": tool_id}, {"$set": update_data})
    return {"detail": f"Tool '{tool_id}' updated", **update_data}


@router.get("/tools/{tool_id}/modules")
async def admin_list_modules(tool_id: str):
    return await db.modules.find(
        {"tool_id": tool_id}, {"_id": 0}
    ).sort([("week", 1), ("day", 1)]).to_list(1000)


@router.post("/modules")
async def create_module(module: ModuleCreate):
    existing = await db.modules.find_one({"id": module.id})
    if existing:
        raise HTTPException(status_code=409, detail="Module ID already exists")
    tool = await db.tools.find_one({"id": module.tool_id})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    doc = {
        "id": module.id, "tool_id": module.tool_id, "title": module.title,
        "level": module.level, "minutes": module.minutes,
        "day": module.day, "week": module.week, "description": module.description,
        "isAdvanced": module.level == "advanced", "is_weekly_test": False,
        "content": {"explanation": "", "example": "", "activity": ""},
        "quiz": {}, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.modules.insert_one(doc)
    del doc["_id"]
    return doc


@router.put("/modules/{module_id}")
async def update_module(module_id: str, update: ModuleUpdate):
    existing = await db.modules.find_one({"id": module_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Module not found")
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if "level" in update_data:
        update_data["isAdvanced"] = update_data["level"] == "advanced"
    await db.modules.update_one({"id": module_id}, {"$set": update_data})
    return {"detail": f"Module '{module_id}' updated", **update_data}


@router.delete("/modules/{module_id}")
async def delete_module(module_id: str):
    result = await db.modules.delete_one({"id": module_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    return {"detail": f"Module '{module_id}' deleted"}


@router.put("/tools/{tool_id}/modules/reorder")
async def reorder_modules(tool_id: str, reorder: ModuleReorder):
    tool = await db.tools.find_one({"id": tool_id})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    for idx, module_id in enumerate(reorder.module_ids, start=1):
        await db.modules.update_one(
            {"id": module_id, "tool_id": tool_id}, {"$set": {"day": idx}}
        )
    return {"detail": f"Reordered {len(reorder.module_ids)} modules"}


# ══════════════════════════════════════════════════════════
# LMS — COURSES
# ══════════════════════════════════════════════════════════

@router.get("/courses")
async def list_courses(status: Optional[str] = None):
    """List all LMS courses with lesson counts."""
    match = {}
    if status:
        match["status"] = status
    pipeline = [
        {"$match": match},
        {"$lookup": {"from": "lessons", "localField": "id", "foreignField": "course_id", "as": "lessons_list"}},
        {"$addFields": {"lesson_count": {"$size": "$lessons_list"}}},
        {"$project": {"_id": 0, "lessons_list": 0}},
        {"$sort": {"created_at": -1}},
    ]
    return await db.courses.aggregate(pipeline).to_list(100)


@router.get("/courses/{course_id}")
async def get_course(course_id: str):
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/courses/{course_id}")
async def update_course(course_id: str, update: CourseUpdate):
    existing = await db.courses.find_one({"id": course_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.courses.update_one({"id": course_id}, {"$set": update_data})
    return {"detail": f"Course '{course_id}' updated", **update_data}


# ══════════════════════════════════════════════════════════
# LMS — LESSONS
# ══════════════════════════════════════════════════════════

@router.get("/courses/{course_id}/lessons")
async def list_lessons(course_id: str):
    """List all lessons for a course, ordered by sort_order."""
    lessons = await db.lessons.find(
        {"course_id": course_id}, {"_id": 0}
    ).sort([("week", 1), ("sort_order", 1)]).to_list(1000)

    # Attach media asset count for each lesson
    for lesson in lessons:
        lesson["media_count"] = await db.media_assets.count_documents(
            {"id": {"$in": lesson.get("media_asset_ids", [])}}
        )

    return lessons


@router.get("/lessons/{lesson_id}")
async def get_lesson(lesson_id: str):
    lesson = await db.lessons.find_one({"id": lesson_id}, {"_id": 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Attach content for all languages
    contents = await db.lesson_contents.find(
        {"lesson_id": lesson_id}, {"_id": 0}
    ).to_list(10)
    lesson["contents"] = {c["language"]: c for c in contents}

    # Attach assessment if exists
    assessment = await db.assessments.find_one(
        {"lesson_id": lesson_id}, {"_id": 0}
    )
    lesson["assessment"] = assessment

    # Attach media assets
    asset_ids = lesson.get("media_asset_ids", [])
    if asset_ids:
        assets = await db.media_assets.find(
            {"id": {"$in": asset_ids}}, {"_id": 0}
        ).to_list(100)
        lesson["media_assets"] = assets
    else:
        lesson["media_assets"] = []

    return lesson


@router.put("/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, update: LessonUpdate):
    existing = await db.lessons.find_one({"id": lesson_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Lesson not found")
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.lessons.update_one({"id": lesson_id}, {"$set": update_data})
    return {"detail": f"Lesson '{lesson_id}' updated", **update_data}


# ── Lesson Content (per-language) ────────────────────────

@router.get("/lessons/{lesson_id}/content/{language}")
async def get_lesson_content(lesson_id: str, language: str):
    content = await db.lesson_contents.find_one(
        {"lesson_id": lesson_id, "language": language}, {"_id": 0}
    )
    if not content:
        raise HTTPException(status_code=404, detail=f"No {language} content for this lesson")
    return content


@router.put("/lessons/{lesson_id}/content/{language}")
async def update_lesson_content(lesson_id: str, language: str, update: LessonContentUpdate):
    lesson = await db.lessons.find_one({"id": lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.lesson_contents.update_one(
        {"lesson_id": lesson_id, "language": language},
        {"$set": update_data},
        upsert=True,
    )

    # Ensure language is in lesson's available_languages
    await db.lessons.update_one(
        {"id": lesson_id},
        {"$addToSet": {"available_languages": language}},
    )

    return {"detail": f"Content updated for lesson '{lesson_id}' ({language})"}


# ══════════════════════════════════════════════════════════
# LMS — ASSESSMENTS
# ══════════════════════════════════════════════════════════

@router.get("/courses/{course_id}/assessments")
async def list_assessments(course_id: str):
    return await db.assessments.find(
        {"course_id": course_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)


@router.get("/assessments/{assessment_id}")
async def get_assessment(assessment_id: str):
    assessment = await db.assessments.find_one({"id": assessment_id}, {"_id": 0})
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


# ══════════════════════════════════════════════════════════
# MEDIA — UPLOAD / DOWNLOAD / MANAGE
# ══════════════════════════════════════════════════════════

@router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    course_id: Optional[str] = Form(None),
    lesson_id: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_admin: dict = Depends(get_current_admin),
):
    """Upload a document or image file (max 16MB).

    Accepted formats: PDF, DOCX, DOC, PNG, JPG, WEBP, SVG, XLSX, PPTX
    """
    file_data = await file.read()
    tag_list = [t.strip() for t in (tags or "").split(",") if t.strip()]

    try:
        asset = await media_service.upload_file(
            file_data=file_data,
            filename=file.filename or "untitled",
            content_type=file.content_type or "application/octet-stream",
            uploaded_by=current_admin.get("username", "admin"),
            course_id=course_id,
            lesson_id=lesson_id,
            tags=tag_list,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return asset


@router.get("/media")
async def list_media(
    type: Optional[str] = Query(None, max_length=20),
    course_id: Optional[str] = Query(None, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """List uploaded media assets with optional filters."""
    assets, total = await media_service.list_assets(
        asset_type=type, course_id=course_id, skip=skip, limit=limit
    )
    return {"assets": assets, "total": total}


@router.get("/media/{asset_id}")
async def get_media_info(asset_id: str):
    """Get media asset metadata."""
    asset = await db.media_assets.find_one({"id": asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Media asset not found")
    return asset


@router.get("/media/{asset_id}/download")
async def download_media(asset_id: str):
    """Download the actual file."""
    try:
        file_data, filename, content_type = await media_service.get_file_data(asset_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Media asset not found")

    return StreamingResponse(
        io.BytesIO(file_data),
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.delete("/media/{asset_id}")
async def delete_media(asset_id: str):
    """Delete a media asset and its file."""
    try:
        await media_service.delete_file(asset_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Media asset not found")
    return {"detail": f"Media asset '{asset_id}' deleted"}


@router.post("/media/{asset_id}/attach")
async def attach_media_to_lesson(asset_id: str, body: AssetAttach):
    """Attach a media asset to a lesson."""
    try:
        await media_service.attach_to_lesson(asset_id, body.lesson_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"detail": f"Asset '{asset_id}' attached to lesson '{body.lesson_id}'"}


# ══════════════════════════════════════════════════════════
# TRANSLATION
# ══════════════════════════════════════════════════════════

@router.post("/lessons/{lesson_id}/translate")
async def translate_lesson(
    lesson_id: str,
    body: TranslateRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Auto-translate a single lesson's content to the target language."""
    try:
        result = await translation_service.translate_lesson_content(
            lesson_id=lesson_id,
            target_lang=body.target_language,
            translated_by=current_admin.get("username", "admin"),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return {"detail": f"Lesson '{lesson_id}' translated to {body.target_language}", "content": result}


@router.post("/courses/{course_id}/translate")
async def translate_course(
    course_id: str,
    body: TranslateRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Auto-translate all lessons in a course to the target language."""
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    result = await translation_service.translate_course(
        course_id=course_id,
        target_lang=body.target_language,
        translated_by=current_admin.get("username", "admin"),
    )
    return result


@router.get("/courses/{course_id}/translation-status")
async def course_translation_status(course_id: str):
    """Get translation coverage for a course across all supported languages."""
    course = await db.courses.find_one({"id": course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return await translation_service.get_translation_status(course_id)


@router.put("/lessons/{lesson_id}/content/{language}/publish")
async def publish_translation(lesson_id: str, language: str):
    """Mark a translated lesson content as published (approve after review)."""
    result = await db.lesson_contents.update_one(
        {"lesson_id": lesson_id, "language": language},
        {"$set": {"status": "published", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"No {language} content for lesson '{lesson_id}'")
    return {"detail": f"Translation for '{lesson_id}' ({language}) published"}


# ══════════════════════════════════════════════════════════
# STATS
# ══════════════════════════════════════════════════════════

@router.get("/stats")
async def admin_stats():
    """Platform overview stats for the admin dashboard."""
    users_count = await db.users.count_documents({})
    tools_count = await db.tools.count_documents({})
    modules_count = await db.modules.count_documents({})
    enrollments_count = await db.enrollments.count_documents({})
    courses_count = await db.courses.count_documents({})
    lessons_count = await db.lessons.count_documents({})
    media_count = await db.media_assets.count_documents({})

    return {
        "users": users_count,
        "tools": tools_count,
        "modules": modules_count,
        "enrollments": enrollments_count,
        "courses": courses_count,
        "lessons": lessons_count,
        "media_assets": media_count,
    }
