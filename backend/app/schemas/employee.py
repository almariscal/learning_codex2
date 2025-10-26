from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class EmployeeBase(BaseModel):
    full_name: str
    email: EmailStr
    initials: Optional[str] = None
    is_active: bool = True
    has_ev_car: bool = False


class EmployeeCreate(EmployeeBase):
    is_admin: bool = False


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    initials: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None
    has_ev_car: Optional[bool] = None


class EmployeeRead(EmployeeBase):
    id: int
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True
