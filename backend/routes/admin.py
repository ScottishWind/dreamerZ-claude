"""Admin routes — user management and content management (admin-only)."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from config import ADMIN_EMAILS
from database import db
from models.user import AdminUserResponse
from services.auth_service import get_current_admin, is_admin

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

    # Annotate each user with is_admin flag
    for u in users:
        u["is_admin"] = u.get("email", "").lower() in ADMIN_EMAILS

    return users


@router.get("/users/count")
async def user_count():
    """Get total user count."""
    total = await db.users.count_documents({})
    return {"total": total}


@router.delete("/users/{username}")
async def delete_user(username: str):
    """Delete a user by username. Admins cannot delete themselves."""
    username = username.strip().lower()
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("email", "").lower() in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Cannot delete an admin account")

    await db.users.delete_one({"username": username})
    # Also clean up their enrollments
    await db.enrollments.delete_many({"username": username})

    return {"detail": f"User '{username}' deleted successfully"}


# ══════════════════════════════════════════════════════════
# CONTENT MANAGEMENT
# ══════════════════════════════════════════════════════════

@router.get("/tools")
async def admin_list_tools():
    """List all tools with module counts."""
    pipeline = [
        {
            "$lookup": {
                "from": "modules",
                "localField": "id",
                "foreignField": "tool_id",
                "as": "modules",
            }
        },
        {
            "$addFields": {
                "module_count": {"$size": "$modules"},
            }
        },
        {"$project": {"_id": 0, "modules": 0}},
    ]
    tools = await db.tools.aggregate(pipeline).to_list(100)
    return tools


@router.put("/tools/{tool_id}")
async def update_tool(tool_id: str, update: ToolUpdate):
    """Update a tool's metadata."""
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
    """List all modules for a tool, ordered by day/position."""
    modules = await db.modules.find(
        {"tool_id": tool_id}, {"_id": 0}
    ).sort([("week", 1), ("day", 1)]).to_list(1000)
    return modules


@router.post("/modules")
async def create_module(module: ModuleCreate):
    """Create a new module."""
    existing = await db.modules.find_one({"id": module.id})
    if existing:
        raise HTTPException(status_code=409, detail="Module ID already exists")

    # Verify tool exists
    tool = await db.tools.find_one({"id": module.tool_id})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    doc = {
        "id": module.id,
        "tool_id": module.tool_id,
        "title": module.title,
        "level": module.level,
        "minutes": module.minutes,
        "day": module.day,
        "week": module.week,
        "description": module.description,
        "isAdvanced": module.level == "advanced",
        "is_weekly_test": False,
        "content": {"explanation": "", "example": "", "activity": ""},
        "quiz": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.modules.insert_one(doc)
    del doc["_id"]
    return doc


@router.put("/modules/{module_id}")
async def update_module(module_id: str, update: ModuleUpdate):
    """Update a module's metadata."""
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
    """Delete a module."""
    result = await db.modules.delete_one({"id": module_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Module not found")
    return {"detail": f"Module '{module_id}' deleted"}


@router.put("/tools/{tool_id}/modules/reorder")
async def reorder_modules(tool_id: str, reorder: ModuleReorder):
    """Reorder modules within a tool by setting day values."""
    # Verify tool exists
    tool = await db.tools.find_one({"id": tool_id})
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")

    for idx, module_id in enumerate(reorder.module_ids, start=1):
        await db.modules.update_one(
            {"id": module_id, "tool_id": tool_id},
            {"$set": {"day": idx}},
        )

    return {"detail": f"Reordered {len(reorder.module_ids)} modules"}


# ── Stats ────────────────────────────────────────────────
@router.get("/stats")
async def admin_stats():
    """Platform overview stats for the admin dashboard."""
    users_count = await db.users.count_documents({})
    tools_count = await db.tools.count_documents({})
    modules_count = await db.modules.count_documents({})
    enrollments_count = await db.enrollments.count_documents({})

    return {
        "users": users_count,
        "tools": tools_count,
        "modules": modules_count,
        "enrollments": enrollments_count,
    }
