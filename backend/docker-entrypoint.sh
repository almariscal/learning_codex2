#!/usr/bin/env bash
set -euo pipefail

function wait_for_db() {
  local url="${DATABASE_URL:-}"
  if [[ -z "${url}" ]]; then
    echo "DATABASE_URL no definido, saltando espera de base de datos."
    return
  fi

  if [[ "${url}" == sqlite* ]]; then
    echo "Usando SQLite, no se requiere espera de base de datos."
    return
  fi

  echo "Esperando a la base de datos..."
  python <<'PY'
import asyncio
import os
import sys

import asyncpg

url = os.environ["DATABASE_URL"].replace("+asyncpg", "")


async def probe() -> None:
    for attempt in range(20):
        try:
            conn = await asyncpg.connect(url)
        except Exception:
            await asyncio.sleep(1)
        else:
            await conn.close()
            return
    raise RuntimeError("Database not ready after multiple attempts")


asyncio.run(probe())
PY
  echo "Base de datos disponible."
}

wait_for_db

if [[ "${RUN_MIGRATIONS:-true}" == "true" ]]; then
  echo "Ejecutando migraciones..."
  alembic upgrade head
fi

if [[ "${SEED_DATA:-false}" == "true" ]]; then
  echo "Cargando datos de ejemplo..."
  python -m app.db.seed || echo "Seed fallo (continuando): $?"
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
