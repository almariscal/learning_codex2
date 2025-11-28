# Parking Allocator Web App

Proyecto en proceso de migración desde un script local de Tkinter a una plataforma web completa para gestionar plazas de parking corporativas.

## Objetivo general

Ofrecer a RRHH una consola para:
- Administrar empleados y plazas (incluyendo atributos como cargador eléctrico).
- Asignar manualmente las plazas en un calendario visual.
- Invitar a empleados a la plataforma y gestionar sus roles.

Al mismo tiempo, permitir a cada empleado:
- Consultar sus asignaciones confirmadas.
- Exportar o sincronizar su calendario con Outlook/Teams.

## MVP inicial

1. Backend con FastAPI y Postgres (SQLModel/SQLAlchemy) para exponer APIs REST.
2. Frontend React + TypeScript (Vite) con dos superficies: portal RRHH y vista empleado.
3. Autenticación básica (mock) pendiente de integrar con AWS Cognito.
4. Servicio batch diario para preparar asignaciones y generar notificaciones (simulado por ahora).

## Estado actual

- `main.py` mantiene la lógica heredada basada en Excel/ICS.
- Se está montando la estructura web (backend y frontend) en el repositorio.

## Próximos pasos inmediatos

- Inicializar el backend con FastAPI, estructura modular y modelos iniciales (Empleado, Plaza, Asignación).
- Configurar pruebas básicas (pytest) y scripts de arranque (uvicorn).
- Bootstrapping del frontend (React, Vite, TypeScript, Tailwind o Chakra).
- Definir pipeline futuro de despliegue en AWS (Terraform/CDK + ECS/Fargate o Lambda).

## Ejecutar en local

1. **Backend**
   ```bash
   cd backend
   python3 -m venv .venv
   source .venv/bin/activate
   pip install .[dev]
   cp .env.example .env  # Ajusta DATABASE_URL si usas Postgres
   uvicorn app.main:app --reload
   ```
   - Health check: `http://localhost:8000/api/health`
   - CRUD disponibles: `/api/employees/`, `/api/spots/`, `/api/allocations/`
   - Migraciones: `alembic upgrade head`
   - Semilla de datos demo: `python -m app.db.seed`
   - Tests: `pytest`

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   - Vite expone `http://localhost:5173` (proxy al backend en `/api`)
   - El portal de empleados muestra las reservas en un calendario interactivo (react-big-calendar).
   - El panel de RRHH ofrece una matriz drag & drop para asignar plazas, formularios de alta rápida y exportación masiva de invitaciones.
   - Las convocatorias se pueden descargar en formato `.ics` por empleado o en ZIP masivo.
   - Incluye modo claro/oscuro conmutables desde la barra superior.

3. **Docker Compose (recomendado)**
   ```bash
   docker compose up --build
   ```
   - Frontend disponible en `http://localhost:8080`
   - Backend expuesto en `http://localhost:8000`
   - Postgres se levanta automáticamente (`postgres/postgres`)
   - Ajusta `SEED_DATA=true` en `docker-compose.yml` si quieres cargar datos demo al arrancar.

## Aplicación de escritorio (Windows/Ubuntu)

El repositorio incluye una envoltura con Tauri para ejecutar el frontend y el backend sin depender de Docker.

1. **Empaquetar backend**
   ```bash
   cd backend
   ./scripts/build_backend_exe.sh        # Linux / Ubuntu
   # o
   pwsh ./scripts/build_backend_exe.ps1  # Windows
   ```
   El binario (`parking-backend`) queda en `backend/dist/parking-backend/`.

2. **Ejecutar Tauri en desarrollo**
   ```bash
   cd desktop/tauri
   npm install
   export PARKING_BACKEND_DEV_COMMAND="python -m app.desktop.server"
   npm run dev
   ```
   Tauri abrirá una ventana y pedirá la carpeta donde guardar la base de datos (se persiste en `~/.parking-allocator/desktop/config.json`).

3. **Generar instaladores**
   ```bash
   cd desktop/tauri
   npm run build
   ```
   Produce `.msi` (Windows) y `.AppImage/.deb` (Ubuntu), incluyendo el binario generado por PyInstaller dentro de `desktop/tauri/src-tauri/backend/`.

Consulta `docs/desktop.md` para más detalles, variables de entorno y pasos de validación.

### Build automático con Docker

Para obtener la AppImage sin instalar Rust/Node/Python en tu host Linux:

```bash
./scripts/build_appimage_via_docker.sh
```

El script utiliza `docker/appimage.Dockerfile`, compila backend + frontend + wrapper dentro del contenedor y copia el artefacto final a `dist/appimage/`.

## Próximos pasos hacia AWS

- Sustituir SQLite por Postgres (Docker local → RDS) y añadir migraciones Alembic.
- Empaquetar backend/frontend con Docker y validar con `docker compose`.
- Autenticación real: AWS Cognito (pool + app client) e integración en FastAPI/React.
- Infraestructura como código con Terraform o AWS CDK (VPC, ECS/Fargate o Lambda, RDS, S3, CloudFront).
- CI/CD en GitHub Actions con tests, builds y despliegues automáticos.
