from datetime import datetime
from typing import Optional

from sqlmodel import Field, SQLModel


class ParkingSpot(SQLModel, table=True):
    __tablename__ = "parking_spots"

    id: Optional[int] = Field(default=None, primary_key=True)
    label: str = Field(index=True, nullable=False, max_length=50)
    location: Optional[str] = Field(default=None, max_length=150)
    has_ev_charger: bool = Field(default=False, nullable=False)
    is_reserved: bool = Field(default=False, nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    notes: Optional[str] = Field(default=None, max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
