# Hoja de ruta Parking Allocator

## Fase 0 — Migración desde Excel (completada)
- Auditoría del script `main.py` y definición de requisitos.
- Diseño de arquitectura objetivo (FastAPI + React + AWS).
- Skeleton backend y frontend en marcha.

## Fase 1 — MVP web funcional
1. **Persistencia**: conectar FastAPI a Postgres (local & AWS RDS), configurar Alembic para migraciones.
2. **CRUD completo**: crear endpoints para plazas, empleados y asignaciones con validaciones adicionales (plazas reservadas, disponibilidad).
3. **UI**: añadir formularios para creación/edición de entidades, calendario interactivo (FullCalendar o react-big-calendar) para RRHH.
4. **Notificaciones**: endpoint para generar invitaciones ICS y descargar ZIP, preparando transición hacia sincronización automática.
5. **Tests**: ampliar suite pytest y añadir pruebas e2e ligeras (Playwright o Cypress).

## Fase 2 — Autenticación y roles
1. Integrar AWS Cognito (user pools separados o grupos) y reemplazar login simulado.
2. Guardar tokens en cookies seguras; refresco automático en frontend.
3. Aplicar autorización en backend (dependencias FastAPI + scopes).

## Fase 3 — Automatización y calendario
1. Servicio programado (AWS EventBridge + Lambda) para generar asignaciones y enviar notificaciones diarias.
2. Integración con Microsoft Graph API para sincronizar con Outlook/Teams (OAuth 2.0, calendarios compartidos).
3. Exposición de feeds ICS por usuario.

## Fase 4 — Preferencias y asignación inteligente
1. Modelo de preferencias y pesos por empleado/plaza.
2. Algoritmo de asignación (por ejemplo, weighted matching) ejecutado en background.
3. Integración con Factorial para bloquear días de vacaciones.

## Fase 5 — Infraestructura y despliegue
1. Automatizar infraestructura con Terraform o AWS CDK (VPC, RDS, ECS/Fargate o Lambda, CloudFront, S3).
2. Pipelines CI/CD (GitHub Actions) con test, build e IaC plan/apply.
3. Observabilidad (CloudWatch Logs, métricas, dashboards) y alertas SNS/Slack.

## Fase 6 — Pulido y analítica
1. Auditoría de accesibilidad y localización.
2. Analítica de uso (Amplitude, Plausible, etc.) para RRHH.
3. Documentación de onboarding, manual de usuario y runbook operativo.
