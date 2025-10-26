from datetime import date, datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Allocation(SQLModel, table=True):
    __tablename__ = "allocations"

    id: Optional[int] = Field(default=None, primary_key=True)
    day: date = Field(index=True, nullable=False)
    employee_id: int = Field(foreign_key="employees.id", nullable=False)
    spot_id: int = Field(foreign_key="parking_spots.id", nullable=False)
    status: str = Field(default="confirmed", nullable=False, max_length=30)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
