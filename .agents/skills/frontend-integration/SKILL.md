---
name: frontend-integration
description: Diseña integración Next.js–NestJS, contratos, sesión, carrito y archivos; no crea pantallas sin solicitud explícita.
---
# Integración frontend
## Objetivo
Mantener al navegador como cliente no confiable de una API estable.
## Cuándo utilizarla
Al definir contratos para Next.js, autenticación, carrito o upload.
## Archivos a consultar
OpenAPI, DTOs, flujo de pedido y arquitectura Storage/Auth.
## Convenciones
Servidor recalcula; Next.js no accede a tablas comerciales; secretos nunca al cliente; UTC persistido y Guatemala mostrada.
## Procedimiento recomendado
Definir contrato/errores, usar cliente tipado cuando aporte valor y manejar idempotency key/reintentos.
## Checklist de validación
- [ ] Precio/rol no confiables.
- [ ] Reintento conserva clave.
- [ ] Upload privado y limitado.
## Errores comunes
Duplicar reglas en React, almacenar tokens mal o usar código como autorización.
## Referencias
https://nextjs.org/docs
