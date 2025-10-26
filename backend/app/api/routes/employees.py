from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_db_session
from app.models import Employee
from app.schemas import EmployeeCreate, EmployeeRead, EmployeeUpdate

router = APIRouter()


@router.get("/", response_model=list[EmployeeRead])
async def list_employees(session: AsyncSession = Depends(get_db_session)) -> list[Employee]:
    result = await session.execute(select(Employee).order_by(Employee.full_name))
    return list(result.scalars().all())


@router.post("/", response_model=EmployeeRead, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate, session: AsyncSession = Depends(get_db_session)
) -> Employee:
    employee = Employee(**payload.model_dump())
    session.add(employee)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        ) from exc
    await session.refresh(employee)
    return employee


@router.get("/{employee_id}", response_model=EmployeeRead)
async def get_employee(employee_id: int, session: AsyncSession = Depends(get_db_session)) -> Employee:
    employee = await session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


@router.patch("/{employee_id}", response_model=EmployeeRead)
async def update_employee(
    employee_id: int, payload: EmployeeUpdate, session: AsyncSession = Depends(get_db_session)
) -> Employee:
    employee = await session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(employee, key, value)

    session.add(employee)
    await session.commit()
    await session.refresh(employee)
    return employee


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_employee(employee_id: int, session: AsyncSession = Depends(get_db_session)) -> None:
    employee = await session.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    await session.delete(employee)
    await session.commit()
