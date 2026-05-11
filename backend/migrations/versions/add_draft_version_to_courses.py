"""Add draft_version_id to courses table for versioning support

Revision ID: add_draft_version_to_courses
Revises: add_role_based_access
Create Date: 2026-05-11 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_draft_version_to_courses'
down_revision: Union[str, Sequence[str], None] = 'add_role_based_access'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('courses')]

    # Add draft_version_id column if not exists
    if 'draft_version_id' not in columns:
        # Use batch mode for SQLite (it recreates the table)
        with op.batch_alter_table('courses', copy_from=op.get_bind()) as batch_op:
            batch_op.add_column(sa.Column('draft_version_id', sa.Integer(), nullable=True))
            # Foreign key will be handled by the model, SQLite doesn't support adding FKs directly


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('courses')]

    # Drop column using batch mode for SQLite
    if 'draft_version_id' in columns:
        with op.batch_alter_table('courses', copy_from=op.get_bind()) as batch_op:
            batch_op.drop_column('draft_version_id')
