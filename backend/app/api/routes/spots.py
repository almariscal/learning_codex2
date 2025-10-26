from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.api.deps import get_db_session
from app.models import ParkingSpot
from app.schemas import ParkingSpotCreate, ParkingSpotRead, ParkingSpotUpdate

router = APIRouter()


@router.get("/", response_model=list[ParkingSpotRead])
async def list_spots(session: AsyncSession = Depends(get_db_session)) -> list[ParkingSpot]:
    result = await session.execute(select(ParkingSpot).order_by(ParkingSpot.label))
    return list(result.scalars().all())


@router.post("/", response_model=ParkingSpotRead, status_code=status.HTTP_201_CREATED)
async def create_spot(
    payload: ParkingSpotCreate, session: AsyncSession = Depends(get_db_session)
) -> ParkingSpot:
    spot = ParkingSpot(**payload.model_dump())
    session.add(spot)
    await session.commit()
    await session.refresh(spot)
    return spot


@router.get("/{spot_id}", response_model=ParkingSpotRead)
async def get_spot(spot_id: int, session: AsyncSession = Depends(get_db_session)) -> ParkingSpot:
    spot = await session.get(ParkingSpot, spot_id)
    if not spot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parking spot not found")
    return spot


@router.patch("/{spot_id}", response_model=ParkingSpotRead)
async def update_spot(
    spot_id: int, payload: ParkingSpotUpdate, session: AsyncSession = Depends(get_db_session)
) -> ParkingSpot:
    spot = await session.get(ParkingSpot, spot_id)
    if not spot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parking spot not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(spot, key, value)

    session.add(spot)
    await session.commit()
    await session.refresh(spot)
    return spot


@router.delete("/{spot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_spot(spot_id: int, session: AsyncSession = Depends(get_db_session)) -> None:
    spot = await session.get(ParkingSpot, spot_id)
    if not spot:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parking spot not found")
    await session.delete(spot)
    await session.commit()
