# Frontend (React + Vite)

## Requisitos

- Node 20+
- `npm install`

## Scripts útiles

- `npm run dev`: levanta el servidor de desarrollo en `http://localhost:5173`.
- `npm run build`: genera la build de producción.
- `npm run preview`: sirve la build generada.
- `npm run lint`: ejecuta ESLint.
- `npm run typecheck`: verifica tipos sin generar output.

### Dependencias clave

- `react-big-calendar` + `date-fns`: renderiza calendarios interactivos tanto para empleados (vista mensual) como para RRHH.
- `@heroicons/react`: iconografía para la barra de navegación y el modo noche.
- `clsx`: composición de clases condicionales.
- TailwindCSS en modo `class` para alternar entre tema claro/oscuro.

## Docker

```bash
docker build -t parking-frontend .
docker run --rm -p 8080:80 parking-frontend
```

En `docker-compose.yml` ya se define un proxy `/api` hacia el backend para el despliegue conjunto.

## Modo escritorio (Tauri)

El frontend se empaqueta dentro del wrapper Tauri ubicado en `desktop/tauri`. Para desarrollarlo junto con la aplicación nativa:

```bash
# Desde la raíz del repo
cd desktop/tauri
npm install
export PARKING_BACKEND_DEV_COMMAND="python -m app.desktop.server"
npm run dev
```

La barra superior muestra el estado de la carpeta de datos cuando se ejecuta en el wrapper de escritorio, permitiendo cambiarla desde la interfaz.

## Estructura destacada

- `src/pages`: vistas principales (RRHH, empleado, login simulado).
- `src/components/AssignmentMatrix`: matriz drag & drop para asignar plazas evitando conflictos.
- `src/components/EmployeeCalendar`: calendario mensual/semanal con colores por plaza.
- `src/context/ThemeContext`: proveedor global para modo claro/oscuro persistente.
- `src/lib/api`: cliente axios para consumir el backend FastAPI y exportar convocatorias (`.ics`).
- `src/styles.css`: Tailwind + overrides para react-big-calendar y soporte dark.

Autenticación real se integrará más adelante con AWS Cognito; por ahora hay un flujo mock para navegar por los roles y validar la estructura.
