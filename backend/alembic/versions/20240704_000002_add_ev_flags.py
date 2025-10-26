"""add ev flags and active columns

Revision ID: 20240704_000002
Revises: 20240704_000001
Create Date: 2024-07-04 01:00:00.000000
"""

from collections.abc import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa


revision: str = "20240704_000002"
down_revision: Union[str, None] = "20240704_000001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("employees", sa.Column("has_ev_car", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("parking_spots", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))


def downgrade() -> None:
    op.drop_column("parking_spots", "is_active")
    op.drop_column("employees", "has_ev_car")
