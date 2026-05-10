"""Add role-based access control

Revision ID: add_role_based_access
Revises: 9824c358a0e0
Create Date: 2026-05-10 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_role_based_access'
down_revision: Union[str, Sequence[str], None] = '9824c358a0e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add role column to User table with default 'learner' if not exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'role' not in columns:
        op.add_column(
            'users',
            sa.Column('role', sa.String(length=50), nullable=True, server_default='learner')
        )
    
    if 'ai_generation_enabled' not in columns:
        op.add_column(
            'users',
            sa.Column('ai_generation_enabled', sa.Boolean(), nullable=True, server_default='false')
        )
    
    # Create SupervisorAssignment table if not exists
    tables = inspector.get_table_names()
    if 'supervisor_assignments' not in tables:
        op.create_table(
            'supervisor_assignments',
            sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
            sa.Column('supervisor_user_id', sa.Integer(), nullable=False),
            sa.Column('learner_user_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['learner_user_id'], ['users.id'], name=op.f('fk_supervisor_assignments_learner_user_id')),
            sa.ForeignKeyConstraint(['supervisor_user_id'], ['users.id'], name=op.f('fk_supervisor_assignments_supervisor_user_id')),
            sa.PrimaryKeyConstraint('id', name=op.f('pk_supervisor_assignments')),
            sa.UniqueConstraint('supervisor_user_id', 'learner_user_id', name=op.f('uq_supervisor_assignments_supervisor_learner'))
        )
        
        # Create index for faster lookups
        op.create_index(op.f('ix_supervisor_assignments_supervisor_user_id'), 'supervisor_assignments', ['supervisor_user_id'], unique=False)
        op.create_index(op.f('ix_supervisor_assignments_learner_user_id'), 'supervisor_assignments', ['learner_user_id'], unique=False)
    
    # Update existing users: set role to 'learner' and ai_generation_enabled to False for null values
    op.execute("""
        UPDATE users 
        SET role = 'learner' 
        WHERE role IS NULL
    """)
    
    op.execute("""
        UPDATE users 
        SET ai_generation_enabled = false 
        WHERE ai_generation_enabled IS NULL
    """)
    
    # SQLite doesn't support ALTER COLUMN directly, so we use a batch operation
    # For SQLite, we need to recreate the table with the new schema
    # However, since we're just adding constraints, we can skip this for SQLite
    # The columns will remain nullable but have defaults, which is acceptable


def downgrade() -> None:
    """Downgrade schema."""
    # Drop indexes
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    
    if 'supervisor_assignments' in tables:
        # Check if indexes exist before dropping
        indexes = [idx['name'] for idx in inspector.get_indexes('supervisor_assignments')]
        if 'ix_supervisor_assignments_learner_user_id' in indexes:
            op.drop_index(op.f('ix_supervisor_assignments_learner_user_id'), table_name='supervisor_assignments')
        if 'ix_supervisor_assignments_supervisor_user_id' in indexes:
            op.drop_index(op.f('ix_supervisor_assignments_supervisor_user_id'), table_name='supervisor_assignments')
        
        # Drop table
        op.drop_table('supervisor_assignments')
    
    # Drop columns from User table
    columns = [col['name'] for col in inspector.get_columns('users')]
    if 'ai_generation_enabled' in columns:
        op.drop_column('users', 'ai_generation_enabled')
    if 'role' in columns:
        op.drop_column('users', 'role')
