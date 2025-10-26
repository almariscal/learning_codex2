from datetime import date, datetime

from pydantic import BaseModel


class AllocationBase(BaseModel):
    day: date
    employee_id: int
    spot_id: int
    status: str = "confirmed"


class AllocationCreate(AllocationBase):
    pass


class AllocationUpdate(BaseModel):
    day: date | None = None
    employee_id: int | None = None
    spot_id: int | None = None
    status: str | None = None


class AllocationBulkCreate(BaseModel):
    employee_id: int
    spot_id: int
    start_day: date
    end_day: date


class AllocationBulkResult(BaseModel):
    created: int
    skipped: int
    conflicts: list[date]


class AllocationRead(AllocationBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
