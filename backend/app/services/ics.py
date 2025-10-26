from __future__ import annotations

from datetime import datetime, time
from io import BytesIO
from typing import Iterable
from zipfile import ZIP_DEFLATED, ZipFile

from icalendar import Calendar, Event

from app.models import Allocation, Employee, ParkingSpot

DEFAULT_START_TIME = time(hour=8, minute=0)
DEFAULT_END_TIME = time(hour=8, minute=15)


def build_calendar(
    allocations: Iterable[Allocation],
    employee: Employee,
    spots: dict[int, ParkingSpot],
) -> bytes:
    calendar = Calendar()
    calendar.add("prodid", "-//Parking Allocator//ES")
    calendar.add("version", "2.0")
    calendar.add("x-wr-calname", f"Parking {employee.full_name}")

    for allocation in allocations:
        day = allocation.day
        start_dt = datetime.combine(day, DEFAULT_START_TIME)
        end_dt = datetime.combine(day, DEFAULT_END_TIME)
        spot = spots.get(allocation.spot_id)
        spot_label = spot.label if spot else "Plaza"

        event = Event()
        event.add("summary", f"Parking {spot_label}")
        event.add("dtstart", start_dt)
        event.add("dtend", end_dt)
        event.add("location", spot.location or "Parking empresa")
        event.add("description", f"Reserva de plaza {spot_label} para {employee.full_name}")
        event.add("uid", f"{employee.id}-{spot_label}-{allocation.day}")
        event.add("transp", "TRANSPARENT")
        event.add("X-MICROSOFT-CDO-BUSYSTATUS", "FREE")
        calendar.add_component(event)

    return calendar.to_ical()


def build_zip_bundle(
    bundle: dict[int, list[Allocation]],
    employees: dict[int, Employee],
    spots: dict[int, ParkingSpot],
) -> bytes:
    buffer = BytesIO()
    with ZipFile(buffer, mode="w", compression=ZIP_DEFLATED) as zip_file:
        for employee_id, allocations in bundle.items():
            if not allocations:
                continue
            employee = employees.get(employee_id)
            if employee is None:
                continue
            ics_bytes = build_calendar(allocations, employee, spots)
            initials = (employee.initials or employee.full_name[:2]).upper()
            folder = initials.replace(" ", "_")
            filename = f"{folder}/{employee.full_name.replace(' ', '_')}.ics"
            zip_file.writestr(filename, ics_bytes)
    buffer.seek(0)
    return buffer.getvalue()
