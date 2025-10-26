from datetime import date, timedelta
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import and_, exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db_session
from app.models import Allocation, Employee, ParkingSpot
from app.schemas import (
    AllocationBulkCreate,
    AllocationBulkResult,
    AllocationCreate,
    AllocationRead,
    AllocationUpdate,
)
from app.services.ics import build_calendar, build_zip_bundle

router = APIRouter()


@router.get("/", response_model=list[AllocationRead])
async def list_allocations(
    *,
    day: Optional[date] = Query(default=None),
    employee_id: Optional[int] = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
) -> list[Allocation]:
    statement = select(Allocation)
    if day is not None:
        statement = statement.where(Allocation.day == day)
    if employee_id is not None:
        statement = statement.where(Allocation.employee_id == employee_id)
    statement = statement.order_by(Allocation.day.desc())

    result = await session.execute(statement)
    return list(result.scalars().all())


@router.post("/", response_model=AllocationRead, status_code=status.HTTP_201_CREATED)
async def create_allocation(
    payload: AllocationCreate, session: AsyncSession = Depends(get_db_session)
) -> Allocation:
    employee = await session.get(Employee, payload.employee_id)
    if employee is None or not employee.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid employee")

    spot = await session.get(ParkingSpot, payload.spot_id)
    if spot is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid parking spot")

    duplicate_stmt = select(exists().where(and_(
        Allocation.day == payload.day,
        Allocation.spot_id == payload.spot_id,
    )))
    result = await session.execute(duplicate_stmt)
    if result.scalar():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Parking spot already assigned for that day",
        )

    allocation = Allocation(**payload.model_dump())
    session.add(allocation)
    await session.commit()
    await session.refresh(allocation)
    return allocation


@router.post("/bulk", response_model=AllocationBulkResult)
async def create_allocations_bulk(
    payload: AllocationBulkCreate, session: AsyncSession = Depends(get_db_session)
) -> AllocationBulkResult:
    employee = await session.get(Employee, payload.employee_id)
    if employee is None or not employee.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid employee")

    spot = await session.get(ParkingSpot, payload.spot_id)
    if spot is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid parking spot")

    if payload.end_day < payload.start_day:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date range")

    total_days = (payload.end_day - payload.start_day).days + 1
    created = 0
    skipped = 0
    conflicts: list[date] = []

    for offset in range(total_days):
        current_day = payload.start_day + timedelta(days=offset)
        duplicate_stmt = select(exists().where(and_(
            Allocation.day == current_day,
            Allocation.spot_id == payload.spot_id,
        )))
        result = await session.execute(duplicate_stmt)
        if result.scalar():
            skipped += 1
            conflicts.append(current_day)
            continue

        allocation = Allocation(
            day=current_day,
            employee_id=payload.employee_id,
            spot_id=payload.spot_id,
            status="confirmed",
        )
        session.add(allocation)
        created += 1

    await session.commit()
    return AllocationBulkResult(created=created, skipped=skipped, conflicts=conflicts)


@router.patch("/{allocation_id}", response_model=AllocationRead)
async def update_allocation(
    allocation_id: int,
    payload: AllocationUpdate,
    session: AsyncSession = Depends(get_db_session),
) -> Allocation:
    allocation = await session.get(Allocation, allocation_id)
    if allocation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "employee_id" in update_data:
        employee = await session.get(Employee, update_data["employee_id"])
        if employee is None or not employee.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid employee")

    if "spot_id" in update_data:
        spot = await session.get(ParkingSpot, update_data["spot_id"])
        if spot is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid parking spot")

    for key, value in update_data.items():
        setattr(allocation, key, value)

    duplicate_stmt = select(exists().where(and_(
        Allocation.day == allocation.day,
        Allocation.spot_id == allocation.spot_id,
        Allocation.id != allocation.id,
    )))
    result = await session.execute(duplicate_stmt)
    if result.scalar():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Parking spot already assigned for that day",
        )

    session.add(allocation)
    await session.commit()
    await session.refresh(allocation)
    return allocation


@router.delete("/{allocation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_allocation(allocation_id: int, session: AsyncSession = Depends(get_db_session)) -> None:
    allocation = await session.get(Allocation, allocation_id)
    if allocation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Allocation not found")
    await session.delete(allocation)
    await session.commit()


@router.get("/employees/{employee_id}/ics")
async def download_employee_ics(
    employee_id: int,
    start_date: date = Query(..., description="Inclusive start date"),
    end_date: date = Query(..., description="Inclusive end date"),
    session: AsyncSession = Depends(get_db_session),
) -> StreamingResponse:
    if end_date < start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date range")

    employee = await session.get(Employee, employee_id)
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    statement = select(Allocation).where(
        Allocation.employee_id == employee_id,
        Allocation.day >= start_date,
        Allocation.day <= end_date,
    )
    allocations = (await session.execute(statement)).scalars().all()
    if not allocations:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No allocations in range")

    spot_ids = {allocation.spot_id for allocation in allocations}
    spots = {
        spot.id: spot
        for spot in (await session.execute(select(ParkingSpot).where(ParkingSpot.id.in_(spot_ids)))).scalars().all()
    }

    calendar_bytes = build_calendar(allocations, employee, spots)
    buffer = BytesIO(calendar_bytes)
    safe_name = (employee.initials or employee.full_name).replace(" ", "_")
    filename = f"parking-{safe_name}.ics"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return StreamingResponse(buffer, media_type="text/calendar", headers=headers)


@router.get("/ics/export")
async def download_bulk_ics(
    start_date: date = Query(..., description="Inclusive start date"),
    end_date: date = Query(..., description="Inclusive end date"),
    session: AsyncSession = Depends(get_db_session),
) -> StreamingResponse:
    if end_date < start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date range")

    allocations = (
        await session.execute(
            select(Allocation)
            .where(Allocation.day >= start_date, Allocation.day <= end_date)
            .order_by(Allocation.employee_id, Allocation.day)
        )
    ).scalars().all()

    if not allocations:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No allocations in range")

    employee_ids = {allocation.employee_id for allocation in allocations}
    spot_ids = {allocation.spot_id for allocation in allocations}

    employees = {
        employee.id: employee
        for employee in (await session.execute(select(Employee).where(Employee.id.in_(employee_ids)))).scalars().all()
    }
    spots = {
        spot.id: spot
        for spot in (await session.execute(select(ParkingSpot).where(ParkingSpot.id.in_(spot_ids)))).scalars().all()
    }

    bundle: dict[int, list[Allocation]] = {}
    for allocation in allocations:
        employee = employees.get(allocation.employee_id)
        if employee is None:
            continue
        bundle.setdefault(employee.id, []).append(allocation)

    zip_bytes = build_zip_bundle(bundle, employees, spots)
    buffer = BytesIO(zip_bytes)
    filename = f"parking-allocations-{start_date.isoformat()}_{end_date.isoformat()}.zip"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return StreamingResponse(buffer, media_type="application/zip", headers=headers)
