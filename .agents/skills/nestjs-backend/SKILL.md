---
name: nestjs-backend
description: Implementa endpoints, módulos, DTOs, servicios, errores y OpenAPI de la API NestJS.
---
# Backend NestJS
## Objetivo
Construir casos de uso REST pequeños, validados, documentados y comprobables.
## Cuándo utilizarla
Para cambios HTTP o lógica de aplicación en `apps/api/src`.
## Archivos a consultar
Módulo afectado, OpenAPI, `AGENTS.md` y skills de negocio/seguridad pertinentes.
## Convenciones
DTOs no son modelos Prisma; controladores delgados; servicios inyectables; `ValidationPipe` con whitelist; errores estables sin secretos.
## Procedimiento recomendado
Definir contrato y prueba, implementar lo mínimo, documentar Swagger y verificar tipos/pruebas/build.
## Checklist de validación
- [ ] Entrada validada y salida documentada.
- [ ] Regla fuera del controlador.
- [ ] Autorización por recurso aplicada.
- [ ] Errores probados.
## Errores comunes
Confiar en IDs de actor, devolver entidades crudas o mantener transacciones durante Storage/HTTP.
## Referencias
https://docs.nestjs.com/controllers
