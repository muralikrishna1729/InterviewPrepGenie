"""add difficulty to interviews and model_answers to feedback

Revision ID: 30c89f92093e
Revises: b7e3a1c2d4f5
Create Date: 2026-08-01 00:00:00.000000

These columns already exist on the SQLAlchemy models (Interview.difficulty,
Feedback.model_answers) but were never added to the DB via a migration, so the
live Postgres schema is out of sync with the ORM. Without them, interview
creation fails (create_interview passes difficulty=) and model answers are
silently dropped.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision: str = "30c89f92093e"
down_revision: Union[str, None] = "b7e3a1c2d4f5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Server defaults backfill existing rows so the NOT NULL adds succeed.
    op.add_column(
        "interviews",
        sa.Column("difficulty", sa.String(), nullable=False, server_default="Medium"),
    )
    op.add_column(
        "feedback",
        sa.Column("model_answers", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )


def downgrade() -> None:
    op.drop_column("feedback", "model_answers")
    op.drop_column("interviews", "difficulty")
