---
name: deployment
description: Prepara Docker, configuración, migraciones de release, observabilidad y despliegue; no usar para desarrollo local ordinario.
---
# Despliegue
## Objetivo
Producir artefactos reproducibles y releases seguros para NestJS.
## Cuándo utilizarla
Al crear imagen, pipeline, health checks, migraciones de release o plataforma.
## Archivos a consultar
Dockerfile, workflow, `.env.example`, health y docs del proveedor.
## Convenciones
Multi-stage, usuario no root, dependencias fijadas, migración única antes del rollout, logs sin PII.
## Procedimiento recomendado
Construir, revisar dependencias, probar arranque/health/shutdown y documentar rollback.
## Checklist de validación
- [ ] Config validada al inicio.
- [ ] Migración/rollback definidos.
- [ ] Secretos provienen de plataforma.
## Errores comunes
Empaquetar `.env`, migrar por réplica o usar tags flotantes.
## Referencias
https://docs.docker.com/guides/nodejs/
