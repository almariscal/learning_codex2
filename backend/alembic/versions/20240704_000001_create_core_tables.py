"""create core tables

Revision ID: 20240704_000001
Revises:
Create Date: 2024-07-04 00:00:01.000000
"""

from collections.abc import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa


revision: str = "20240704_000001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "employees",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(length=150), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("initials", sa.String(length=10), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_employees_full_name", "employees", ["full_name"], unique=False)
    op.create_index("ix_employees_email", "employees", ["email"], unique=True)

    op.create_table(
        "parking_spots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("label", sa.String(length=50), nullable=False),
        sa.Column("location", sa.String(length=150), nullable=True),
        sa.Column("has_ev_charger", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_reserved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("notes", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_parking_spots_label", "parking_spots", ["label"], unique=False)

    op.create_table(
        "allocations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("employee_id", sa.Integer(), sa.ForeignKey("employees.id"), nullable=False),
        sa.Column("spot_id", sa.Integer(), sa.ForeignKey("parking_spots.id"), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="confirmed"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_allocations_day", "allocations", ["day"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_allocations_day", table_name="allocations")
    op.drop_table("allocations")
    op.drop_index("ix_parking_spots_label", table_name="parking_spots")
    op.drop_table("parking_spots")
    op.drop_index("ix_employees_email", table_name="employees")
    op.drop_index("ix_employees_full_name", table_name="employees")
    op.drop_table("employees")
