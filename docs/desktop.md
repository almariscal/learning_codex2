# Aplicación de escritorio

Esta guía describe cómo construir y empaquetar la versión de escritorio (Windows y Ubuntu) sin depender de Docker.

## Componentes

- **Backend (`backend/`)**: FastAPI + SQLModel ejecutado mediante `app.desktop.server`. El binario empaquetado (PyInstaller) escribe los datos persistentes en una carpeta seleccionada por el usuario.
- **Frontend (`frontend/`)**: React + Vite. Se compila igual que para la versión web.
- **Wrapper (`desktop/tauri/`)**: Shell nativa construida con Tauri (Rust). Arranca el backend local, pide la carpeta de datos y expone el frontend en una ventana nativa.

## Requisitos previos

- Python 3.11+
- Node.js 20+ y npm
- Rust/Cargo + Tauri CLI (`npm install` dentro de `desktop/tauri`)

## 1. Empaquetar el backend

```bash
cd backend
./scripts/build_backend_exe.sh        # Linux / Ubuntu
# o
pwsh ./scripts/build_backend_exe.ps1  # Windows
```

El artefacto queda en `backend/dist/parking-backend/`. Copia ese directorio dentro de `desktop/tauri/src-tauri/backend/` si quieres que el binario quede embebido en el instalador de Tauri.

## 2. Ejecutar en desarrollo

1. Instala dependencias del wrapper:
   ```bash
   cd desktop/tauri
   npm install
   ```
2. Desde otra terminal, arranca el backend en modo CLI:
   ```bash
   cd backend
   uvicorn app.main:app --reload  # o python -m app.desktop.server
   ```
3. Exporta `PARKING_BACKEND_DEV_COMMAND="python -m app.desktop.server"` para que Tauri arranque el backend automáticamente.
4. Finalmente, arranca el shell:
   ```bash
   cd desktop/tauri
   npm run dev    # abre la ventana de Tauri
   ```

Tauri lanzará el backend con un puerto libre y esperará a que responda el healthcheck en `http://127.0.0.1:<puerto>/api`.

## 3. Generar instaladores

```bash
cd desktop/tauri
npm run build  # genera .msi para Windows y .AppImage/.deb para Linux
```

El comando:
- Ejecuta `npm --prefix ../../frontend run build`.
- Llama a `tauri build`, que a su vez empaqueta el binario generado por PyInstaller (si existe dentro de `src-tauri/backend/`).

## Carpeta de datos externa

Al primer arranque, la aplicación solicitará la carpeta donde se guardará la base de datos y los archivos exportados. Esa ruta se almacena en `~/.parking-allocator/desktop/config.json` (Windows: `%USERPROFILE%\.parking-allocator\desktop\config.json`). Puedes cambiarla más tarde desde la interfaz (`Cambiar…` en la barra superior) o pasando `--data-dir` al backend.

### Variables de entorno útiles

- `PARKING_DATA_DIR`: fuerza una ruta concreta.
- `PARKING_BACKEND_DEV_COMMAND`: comando que utilizará Tauri cuando no encuentre el binario empaquetado (p. ej. `python -m app.desktop.server`).

## Verificaciones recomendadas

- `backend/tests` con `pytest` siguen pasando.
- `npm run lint && npm run typecheck` en `frontend/`.
- `npm run tauri build` genera los instaladores y arranca sin errores críticos en ambas plataformas objetivo.

## Construcción automatizada con Docker

Si prefieres evitar instalar todas las dependencias en tu host Linux, utiliza la imagen preparada en `docker/appimage.Dockerfile`. El siguiente script construye la AppImage dentro del contenedor y copia el resultado a `dist/appimage/`:

```bash
./scripts/build_appimage_via_docker.sh
# Resultado: dist/appimage/Parking_Allocator_*_amd64.AppImage
```

El Dockerfile incluye:
- Python 3.11 + PyInstaller para el backend.
- Node.js 20 + npm para frontend y Tauri CLI.
- Rust toolchain para compilar el wrapper.
- Librerías de sistema requeridas por Tauri (`libgtk-3-dev`, `libayatana-appindicator3-dev`, `libwebkit2gtk-4.0-dev`, etc.).
