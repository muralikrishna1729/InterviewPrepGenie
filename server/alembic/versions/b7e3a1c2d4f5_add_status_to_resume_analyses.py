"""add status to resume_analyses

Revision ID: b7e3a1c2d4f5
Revises: af5dccd940cc
Create Date: 2026-07-29 23:10:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7e3a1c2d4f5"
down_revision: Union[str, None] = "af5dccd940cc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "resume_analyses",
        sa.Column("status", sa.String(), nullable=False, server_default="pending"),
    )


def downgrade() -> None:
    op.drop_column("resume_analyses", "status")
