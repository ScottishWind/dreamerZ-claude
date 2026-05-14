"""Remove isAdmin column from users table

Revision ID: 78645d620170
Revises: afdd2b7225c8
Create Date: 2026-05-13 13:49:01.883784

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '78645d620170'
down_revision: Union[str, Sequence[str], None] = 'afdd2b7225c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Idempotent: uses DROP COLUMN IF EXISTS so re-running (or running on a
    DB where the column was already dropped manually) is a safe no-op.
    The model abandoned is_admin in favour of the `role` column; leaving
    is_admin as NOT NULL caused ORM inserts to fail with a
    NotNullViolationError because nothing sets it any more.
    """
    op.execute('ALTER TABLE users DROP COLUMN IF EXISTS is_admin')


def downgrade() -> None:
    """Downgrade schema — intentionally a no-op.

    `is_admin` is permanently retired in favour of the `role` column.
    Re-adding it on downgrade would resurrect a dead column that no
    model or code path populates — exactly the NotNullViolationError
    this migration was written to kill. There is no scenario where we
    want it back, so downgrade does nothing.
    """
    pass
