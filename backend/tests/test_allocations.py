from datetime import date, timedelta

import pytest


async def prepare_employee(async_client, idx=1):
    response = await async_client.post(
        "/api/employees/",
        json={"full_name": f"Empleado {idx}", "email": f"empleado{idx}@example.com"},
    )
    assert response.status_code == 201
    return response.json()["id"]


async def prepare_spot(async_client, idx=1):
    response = await async_client.post(
        "/api/spots/", json={"label": f"A-{idx:02d}", "location": "Planta -1"}
    )
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_allocation_bulk_and_update(async_client):
    employee_id = await prepare_employee(async_client, 1)
    spot_id = await prepare_spot(async_client, 1)

    today = date.today()
    end_day = today + timedelta(days=1)

    bulk_response = await async_client.post(
        "/api/allocations/bulk",
        json={
            "employee_id": employee_id,
            "spot_id": spot_id,
            "start_day": today.isoformat(),
            "end_day": end_day.isoformat(),
        },
    )
    assert bulk_response.status_code == 200
    data = bulk_response.json()
    assert data["created"] == 2
    assert data["skipped"] == 0

    list_response = await async_client.get(f"/api/allocations/?employee_id={employee_id}")
    assert list_response.status_code == 200
    allocations = list_response.json()
    assert len(allocations) == 2

    allocation_id = allocations[0]["id"]

    second_employee = await prepare_employee(async_client, 2)

    update_response = await async_client.patch(
        f"/api/allocations/{allocation_id}",
        json={"employee_id": second_employee},
    )
    assert update_response.status_code == 200
    assert update_response.json()["employee_id"] == second_employee

    delete_response = await async_client.delete(f"/api/allocations/{allocation_id}")
    assert delete_response.status_code == 204
