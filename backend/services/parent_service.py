"""Parent service — parent-student linking and access validation."""

import logging
from typing import Optional, List

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from database import async_session
from models.sql_models import ParentStudentLink, User
from models.progress import ParentStudentLinkCreate, ParentStudentLinkUpdate

logger = logging.getLogger(__name__)


async def _get_session_if_needed(session):
    """Return (session, should_close) tuple."""
    if session is not None:
        return session, False
    return async_session(), True


# ---------------------------------------------------------------------------
# Parent-Student Links
# ---------------------------------------------------------------------------

async def create_parent_student_link(
    parent_user_id: int,
    student_user_id: int,
    relationship_type: Optional[str] = None,
    session: AsyncSession = None,
) -> dict:
    """Create a link between a parent and a student."""
    sess, close = await _get_session_if_needed(session)

    try:
        # Verify both users exist
        parent_result = await sess.execute(
            select(User).where(User.id == parent_user_id)
        )
        parent = parent_result.scalars().first()
        if not parent:
            raise ValueError("Parent user not found")

        student_result = await sess.execute(
            select(User).where(User.id == student_user_id)
        )
        student = student_result.scalars().first()
        if not student:
            raise ValueError("Student user not found")

        # Check if link already exists
        existing_result = await sess.execute(
            select(ParentStudentLink).where(
                and_(
                    ParentStudentLink.parent_user_id == parent_user_id,
                    ParentStudentLink.student_user_id == student_user_id,
                )
            )
        )
        existing = existing_result.scalars().first()

        if existing:
            # Reactivate if inactive
            if not existing.is_active:
                existing.is_active = True
                existing.relationship_type = relationship_type
                await sess.commit()
                await sess.refresh(existing)
                return existing.to_dict()
            return existing.to_dict()

        # Create new link
        new_link = ParentStudentLink(
            parent_user_id=parent_user_id,
            student_user_id=student_user_id,
            relationship_type=relationship_type,
            is_active=True,
        )
        sess.add(new_link)
        await sess.commit()
        await sess.refresh(new_link)
        return new_link.to_dict()

    except IntegrityError:
        await sess.rollback()
        logger.error("Parent-student link already exists")
        raise ValueError("Parent-student link already exists")
    except Exception as e:
        await sess.rollback()
        logger.error("Error creating parent-student link: %s", e)
        raise
    finally:
        if close:
            await sess.close()


async def update_parent_student_link(
    link_id: int,
    updates: ParentStudentLinkUpdate,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Update a parent-student link."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(ParentStudentLink).where(ParentStudentLink.id == link_id)
        )
        link = result.scalars().first()

        if not link:
            return None

        for field, value in updates.model_dump(exclude_unset=True).items():
            if value is not None:
                setattr(link, field, value)

        await sess.commit()
        await sess.refresh(link)
        return link.to_dict()

    except Exception as e:
        await sess.rollback()
        logger.error("Error updating parent-student link: %s", e)
        raise
    finally:
        if close:
            await sess.close()


async def deactivate_parent_student_link(
    link_id: int,
    session: AsyncSession = None,
) -> Optional[dict]:
    """Deactivate a parent-student link."""
    return await update_parent_student_link(
        link_id, ParentStudentLinkUpdate(is_active=False), session
    )


async def get_parent_student_links(
    parent_user_id: Optional[int] = None,
    student_user_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    session: AsyncSession = None,
) -> List[dict]:
    """Get parent-student links with optional filters."""
    sess, close = await _get_session_if_needed(session)

    try:
        query = select(ParentStudentLink)

        if parent_user_id:
            query = query.where(ParentStudentLink.parent_user_id == parent_user_id)
        if student_user_id:
            query = query.where(ParentStudentLink.student_user_id == student_user_id)
        if is_active is not None:
            query = query.where(ParentStudentLink.is_active == is_active)

        result = await sess.execute(query)
        links = result.scalars().all()
        return [link.to_dict() for link in links]

    finally:
        if close:
            await sess.close()


async def check_parent_access(
    parent_user_id: int,
    student_user_id: int,
    session: AsyncSession = None,
) -> bool:
    """Check if a parent has access to a student's data."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(ParentStudentLink).where(
                and_(
                    ParentStudentLink.parent_user_id == parent_user_id,
                    ParentStudentLink.student_user_id == student_user_id,
                    ParentStudentLink.is_active == True,
                )
            )
        )
        return result.scalars().first() is not None

    finally:
        if close:
            await sess.close()


async def get_parent_students(
    parent_user_id: int,
    session: AsyncSession = None,
) -> List[dict]:
    """Get all students linked to a parent."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(ParentStudentLink, User)
            .join(User, ParentStudentLink.student_user_id == User.id)
            .where(
                and_(
                    ParentStudentLink.parent_user_id == parent_user_id,
                    ParentStudentLink.is_active == True,
                )
            )
        )
        rows = result.all()

        students = []
        for link, user in rows:
            students.append(
                {
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "relationship_type": link.relationship_type,
                    "linked_at": link.linked_at.isoformat() if link.linked_at else None,
                }
            )

        return students

    finally:
        if close:
            await sess.close()


async def get_student_parents(
    student_user_id: int,
    session: AsyncSession = None,
) -> List[dict]:
    """Get all parents linked to a student."""
    sess, close = await _get_session_if_needed(session)

    try:
        result = await sess.execute(
            select(ParentStudentLink, User)
            .join(User, ParentStudentLink.parent_user_id == User.id)
            .where(
                and_(
                    ParentStudentLink.student_user_id == student_user_id,
                    ParentStudentLink.is_active == True,
                )
            )
        )
        rows = result.all()

        parents = []
        for link, user in rows:
            parents.append(
                {
                    "user_id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "relationship_type": link.relationship_type,
                    "linked_at": link.linked_at.isoformat() if link.linked_at else None,
                }
            )

        return parents

    finally:
        if close:
            await sess.close()
