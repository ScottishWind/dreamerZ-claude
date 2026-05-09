"""Course generation routes — AI-powered course creation from documents.

All endpoints are admin-only (mounted at /api/admin/course-gen).
Workflow:
  1. POST /parse          — upload a doc, get parsed text back
  2. POST /blueprint      — generate a course outline via Claude
  3. POST /lesson         — generate full content + quiz for one lesson
  4. POST /lesson/bulk    — generate all remaining lessons for a draft
  5. PUT  /drafts/{id}    — update a draft's blueprint (manual edits)
  6. POST /publish/{id}   — publish the draft course (change status to published)
  7. GET  /drafts         — list drafts
  8. GET  /drafts/{id}    — read a single draft
  9. DELETE /drafts/{id}  — discard a draft

Draft courses are stored directly in the courses table with status="draft".
Publishing changes status from "draft" to "published" and materialises
Module/Lesson/LessonContent/Quiz records from the blueprint JSON.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from pydantic import BaseModel, Field

from services.auth_service import get_current_admin
from services import document_parser, course_generator

router = APIRouter(
    prefix="/admin/course-gen",
    tags=["course-generation"],
    dependencies=[Depends(get_current_admin)],
)

logger = logging.getLogger(__name__)


# ── Models ────────────────────────────────────────────────
class BlueprintRequest(BaseModel):
    source_text: str
    filename: str = "admin-upload.txt"
    source_filenames: list[str] = []
    # Accept either the integer primary key (sent by the admin UI's category
    # dropdown) or the legacy slug string ("ai-learning").
    category_id: int | str = "ai-learning"
    tone: str = "professional"
    module_count: int = 6
    lessons_per_module: int = 3
    difficulty: Optional[str] = None
    course_title_hint: Optional[str] = None
    instructions: Optional[str] = None


class LessonRequest(BaseModel):
    module_id: str
    lesson_id: str
    run_critique: bool = True
    extra_instructions: Optional[str] = Field(
        None,
        description="Optional extra guidance appended to the lesson prompt.",
    )


class BlueprintUpdate(BaseModel):
    blueprint: dict = Field(..., description="Full blueprint JSON to save")


class ValidationUpdate(BaseModel):
    module_id: str
    lesson_id: str
    validation: Optional[dict] = Field(
        None,
        description="New validation payload, or null to clear.",
    )


# ── 1. Parse uploaded document ────────────────────────────
@router.post("/parse")
async def parse_upload(file: UploadFile = File(...)):
    """Upload a PDF/DOCX/TXT file and return the parsed plain text."""
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        parsed = document_parser.parse_document(
            data=data,
            filename=file.filename or "upload",
            content_type=file.content_type,
        )
    except document_parser.UnsupportedFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to parse uploaded document")
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {exc}")

    return {
        "filename": file.filename,
        "content_type": file.content_type,
        **parsed,
    }


# ── 2. Generate blueprint ─────────────────────────────────
@router.post("/blueprint")
async def create_blueprint(
    request: Request,
    payload: BlueprintRequest,
    current_admin: dict = Depends(get_current_admin),
):
    """Run Claude to produce a course blueprint, then persist it as a draft Course."""
    try:
        blueprint = await course_generator.generate_blueprint(
            source_text=payload.source_text,
            tone=payload.tone,
            module_count=payload.module_count,
            lessons_per_module=payload.lessons_per_module,
            difficulty=payload.difficulty,
            course_title_hint=payload.course_title_hint,
            instructions=payload.instructions,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Blueprint generation failed")
        raise HTTPException(status_code=500, detail=f"Blueprint generation failed: {exc}")

    try:
        draft = await course_generator.create_draft(
            admin_username=current_admin.get("username", "admin"),
            source_text=payload.source_text,
            filename=payload.filename,
            tone=payload.tone,
            blueprint=blueprint,
            category_id=payload.category_id,
            source_filenames=payload.source_filenames,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return draft


# ── 3. Generate a single lesson ───────────────────────────
@router.post("/drafts/{draft_id}/lesson")
async def generate_lesson(draft_id: int, payload: LessonRequest):
    draft = await course_generator.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    # Find the lesson skeleton inside the blueprint
    target_lesson = None
    for module in draft["blueprint"].get("modules", []):
        if module.get("id") != payload.module_id:
            continue
        for lesson in module.get("lessons", []):
            if lesson.get("id") == payload.lesson_id:
                target_lesson = lesson
                break
    if not target_lesson:
        raise HTTPException(status_code=404, detail="Lesson not found in draft")

    try:
        content = await course_generator.generate_lesson_content(
            lesson=target_lesson,
            source_text=draft["source_text"],
            tone=draft.get("tone", "professional"),
            extra_instructions=payload.extra_instructions,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Lesson generation failed")
        raise HTTPException(status_code=500, detail=f"Lesson generation failed: {exc}")

    validation = None
    if payload.run_critique:
        validation = await course_generator.critique_lesson_content(
            generated_content=content,
            source_text=draft["source_text"],
        )

    await course_generator.update_lesson_in_draft(
        draft_id=draft_id,
        module_id=payload.module_id,
        lesson_id=payload.lesson_id,
        lesson_content=content,
        validation=validation,
    )

    return {"content": content, "validation": validation}


# ── 4. Bulk generate all remaining lessons ────────────────
@router.post("/drafts/{draft_id}/generate-all")
async def generate_all_lessons(draft_id: int, run_critique: bool = False):
    draft = await course_generator.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    generated = 0
    errors = 0
    for module in draft["blueprint"].get("modules", []):
        for lesson in module.get("lessons", []):
            if lesson.get("status") == "generated":
                continue
            try:
                content = await course_generator.generate_lesson_content(
                    lesson=lesson,
                    source_text=draft["source_text"],
                    tone=draft.get("tone", "professional"),
                )
                validation = None
                if run_critique:
                    validation = await course_generator.critique_lesson_content(
                        generated_content=content,
                        source_text=draft["source_text"],
                    )
                await course_generator.update_lesson_in_draft(
                    draft_id=draft_id,
                    module_id=module["id"],
                    lesson_id=lesson["id"],
                    lesson_content=content,
                    validation=validation,
                )
                generated += 1
            except Exception as exc:  # noqa: BLE001
                logger.exception("Bulk lesson generation error")
                errors += 1

    return {"generated": generated, "errors": errors}


# ── 5. Update draft blueprint (manual edits) ──────────────
@router.put("/drafts/{draft_id}")
async def update_draft(draft_id: int, payload: BlueprintUpdate):
    ok = await course_generator.update_draft_blueprint(draft_id, payload.blueprint)
    if not ok:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"detail": "Draft updated"}


# ── 5b. Update validation on a single lesson ──────────────
@router.put("/drafts/{draft_id}/validation")
async def update_lesson_validation(draft_id: int, payload: ValidationUpdate):
    """Overwrite or clear the validation payload for one lesson (no regen)."""
    ok = await course_generator.update_lesson_validation(
        draft_id=draft_id,
        module_id=payload.module_id,
        lesson_id=payload.lesson_id,
        validation=payload.validation,
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Draft or lesson not found")
    return {"detail": "Validation updated"}


# ── 6. Publish draft -> published course ─────────────────
@router.post("/drafts/{draft_id}/publish")
async def publish_draft_endpoint(
    draft_id: int,
    current_admin: dict = Depends(get_current_admin),
):
    """Publish a draft course by changing status to 'published'.

    The course_generator.publish_draft service is responsible for:
      - Materialising Module/Lesson/LessonContent/Quiz records from blueprint
      - Updating course.status and all child records to 'published'
    """
    try:
        result = await course_generator.publish_draft(
            draft_id=draft_id,
            admin_username=current_admin.get("username", "admin"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:  # noqa: BLE001
        logger.exception("Publish failed")
        raise HTTPException(status_code=500, detail=f"Publish failed: {exc}")

    return result


# ── 7. List drafts ────────────────────────────────────────
@router.get("/drafts")
async def get_drafts(current_admin: dict = Depends(get_current_admin)):
    drafts = await course_generator.list_drafts(
        admin_username=current_admin.get("username"),
    )
    return drafts


# ── 8. Get single draft ──────────────────────────────────
@router.get("/drafts/{draft_id}")
async def get_draft(draft_id: int):
    draft = await course_generator.get_draft(draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft


# ── 9. Delete draft ──────────────────────────────────────
@router.delete("/drafts/{draft_id}")
async def delete_draft(draft_id: int):
    ok = await course_generator.delete_draft(draft_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Draft not found")
    return {"detail": "Draft deleted"}
