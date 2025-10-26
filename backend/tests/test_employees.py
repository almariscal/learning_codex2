import pytest


@pytest.mark.asyncio
async def test_employee_crud(async_client):
    payload = {"full_name": "Jane Doe", "email": "jane@example.com", "initials": "JD"}
    create_response = await async_client.post("/api/employees/", json=payload)
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["email"] == payload["email"]
    employee_id = created["id"]

    get_response = await async_client.get(f"/api/employees/{employee_id}")
    assert get_response.status_code == 200
    assert get_response.json()["full_name"] == "Jane Doe"

    update_response = await async_client.patch(
        f"/api/employees/{employee_id}", json={"full_name": "Jane Q. Doe"}
    )
    assert update_response.status_code == 200
    assert update_response.json()["full_name"] == "Jane Q. Doe"

    list_response = await async_client.get("/api/employees/")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    delete_response = await async_client.delete(f"/api/employees/{employee_id}")
    assert delete_response.status_code == 204
