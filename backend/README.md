# Backend (FastAPI)

## Requisitos

- Python 3.11+
- Entorno virtual (`python -m venv .venv && source .venv/bin/activate`)
- `pip install -r requirements` (ver instrucciones más abajo con `pyproject`)

## Instalación

```bash
cd backend
pip install .[dev]
```

## Ejecutar servidor local

```bash
uvicorn app.main:app --reload
```

### Docker

```bash
docker build -t parking-backend .
docker run --rm -e DATABASE_URL=postgresql+asyncpg://postgres:postgres@host.docker.internal:5432/parking -p 8000:8000 parking-backend
```

### Migraciones (Alembic)

```bash
alembic upgrade head          # aplica la última migración
alembic heads                 # comprueba la versión actual
alembic revision --autogenerate -m "mensaje"  # crear nueva migración
```

> Ajusta `DATABASE_URL` en `.env` antes de ejecutar las migraciones (soporta SQLite y Postgres).

### Datos de ejemplo

```bash
python -m app.db.seed
```

### Endpoints destacados

- `POST /api/allocations/bulk`: asignaciones por rango de fechas.
- `PATCH /api/allocations/{id}` / `DELETE /api/allocations/{id}`: reubicar o cancelar reservas.
- `GET /api/allocations/employees/{id}/ics`: descarga convocatorias `.ics` individuales.
- `GET /api/allocations/ics/export`: exporta todas las convocatorias en un ZIP estructurado por empleado.

## Tests

```bash
pytest
```

## Estructura relevante

- `app/core`: configuración y utilidades.
- `app/models`: modelos SQLModel.
- `app/schemas`: DTOs que exponen las rutas.
- `app/api/routes`: endpoints agrupados por dominio.
- `alembic/`: configuración y migraciones de base de datos.
- `tests`: tests asíncronos con httpx.
