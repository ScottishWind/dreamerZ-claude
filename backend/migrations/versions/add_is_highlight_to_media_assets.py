"""Add is_highlight field to media_assets

Revision ID: add_is_highlight_to_media_assets
Revises: add_trial_expires_at
Create Date: 2026-05-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_is_highlight_to_media_assets'
down_revision: Union[str, Sequence[str], None] = 'add_trial_expires_at'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema.

    Idempotent: only adds column if it doesn't already exist.
    """
    from sqlalchemy import inspect

    inspector = inspect(op.get_bind())
    existing = {col["name"] for col in inspector.get_columns("media_assets")}

    if "is_highlight" not in existing:
        op.add_column("media_assets", sa.Column("is_highlight", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    """Downgrade schema."""
    from sqlalchemy import inspect

    inspector = inspect(op.get_bind())
    existing = {col["name"] for col in inspector.get_columns("media_assets")}

    if "is_highlight" in existing:
        op.drop_column("media_assets", "is_highlight")
