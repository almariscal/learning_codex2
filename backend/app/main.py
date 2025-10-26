from fastapi import FastAPI

from app.api.routes import api_router
from app.core.config import settings
from app.db.session import init_db


def create_app(include_startup_tasks: bool = True) -> FastAPI:
    app = FastAPI(title=settings.project_name, version="0.1.0")
    app.include_router(api_router, prefix=settings.api_prefix)

    if include_startup_tasks:

        @app.on_event("startup")
        async def startup_event() -> None:
            await init_db()

    return app


app = create_app()
