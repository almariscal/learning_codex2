from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ParkingSpotBase(BaseModel):
    label: str
    location: Optional[str] = None
    has_ev_charger: bool = False
    is_reserved: bool = False
    is_active: bool = True
    notes: Optional[str] = None


class ParkingSpotCreate(ParkingSpotBase):
    pass


class ParkingSpotUpdate(BaseModel):
    label: Optional[str] = None
    location: Optional[str] = None
    has_ev_charger: Optional[bool] = None
    is_reserved: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class ParkingSpotRead(ParkingSpotBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
