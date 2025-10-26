import asyncio
from datetime import date, timedelta

from sqlmodel import select

from app.db.session import async_session_factory
from app.models import Allocation, Employee, ParkingSpot


async def seed() -> None:
    async with async_session_factory() as session:
        employees_payload = [
            {"full_name": "Ana Pérez", "email": "ana.perez@example.com", "initials": "AP", "is_admin": True},
            {"full_name": "Luis García", "email": "luis.garcia@example.com", "initials": "LG"},
            {"full_name": "Marta Fernández", "email": "marta.fernandez@example.com", "initials": "MF"},
        ]

        for payload in employees_payload:
            exists = await session.execute(select(Employee).where(Employee.email == payload["email"]))
            if exists.scalars().first() is None:
                session.add(Employee(**payload))

        spots_payload = [
            {"label": "A-01", "location": "Planta -1", "has_ev_charger": True},
            {"label": "A-02", "location": "Planta -1"},
            {"label": "B-05", "location": "Planta -2", "notes": "Cerca del ascensor"},
        ]

        for payload in spots_payload:
            exists = await session.execute(select(ParkingSpot).where(ParkingSpot.label == payload["label"]))
            if exists.scalars().first() is None:
                session.add(ParkingSpot(**payload))

        await session.commit()

        employees = (await session.execute(select(Employee))).scalars().all()
        spots = (await session.execute(select(ParkingSpot))).scalars().all()

        if not employees or not spots:
            return

        today = date.today()
        allocations_payload = [
            {"day": today, "employee_id": employees[0].id, "spot_id": spots[0].id},
            {"day": today + timedelta(days=1), "employee_id": employees[1].id, "spot_id": spots[1].id},
            {"day": today + timedelta(days=2), "employee_id": employees[2].id, "spot_id": spots[2].id},
        ]

        for payload in allocations_payload:
            exists = await session.execute(
                select(Allocation).where(
                    Allocation.day == payload["day"],
                    Allocation.employee_id == payload["employee_id"],
                    Allocation.spot_id == payload["spot_id"],
                )
            )
            if exists.scalars().first() is None:
                session.add(Allocation(**payload))

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
