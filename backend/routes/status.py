"""Status and health check routes."""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.content import StatusCheck as StatusCheckSchema, StatusCheckCreate
from models.sql_models import StatusCheck as StatusCheckModel

router = APIRouter(tags=["status"])


@router.get("/")
async def root():
    return {"message": "DreamerZ Beta API", "version": "1.0.0"}


@router.post("/status", response_model=StatusCheckSchema)
async def create_status_check(input: StatusCheckCreate, session: AsyncSession = Depends(get_db)):
    status_obj = StatusCheckSchema(client_name=input.client_name)

    db_record = StatusCheckModel(
        client_name=input.client_name,
        timestamp=status_obj.timestamp,
    )
    session.add(db_record)
    await session.commit()

    return status_obj


@router.get("/status", response_model=List[StatusCheckSchema])
async def get_status_checks(session: AsyncSession = Depends(get_db)):
    result = await session.execute(
        select(StatusCheckModel).order_by(StatusCheckModel.id)
    )
    rows = result.scalars().all()

    return [
        StatusCheckSchema(
            id=str(row.id),
            client_name=row.client_name or "",
            timestamp=row.timestamp,
        )
        for row in rows
    ]


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
