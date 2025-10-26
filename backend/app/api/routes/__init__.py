from fastapi import APIRouter

from . import allocations, employees, health, spots

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(employees.router, prefix="/employees", tags=["employees"])
api_router.include_router(spots.router, prefix="/spots", tags=["spots"])
api_router.include_router(allocations.router, prefix="/allocations", tags=["allocations"])

__all__ = ["api_router"]
