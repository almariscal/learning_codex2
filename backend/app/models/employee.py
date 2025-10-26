from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class Employee(SQLModel, table=True):
    __tablename__ = "employees"

    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str = Field(index=True, nullable=False, max_length=150)
    email: str = Field(unique=True, index=True, nullable=False, max_length=255)
    initials: Optional[str] = Field(default=None, max_length=10)
    is_active: bool = Field(default=True, nullable=False)
    is_admin: bool = Field(default=False, nullable=False)
    has_ev_car: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
