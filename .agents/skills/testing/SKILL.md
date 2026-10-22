---
name: testing
description: Diseña pruebas unitarias, integración PostgreSQL y E2E con TDD para reglas y concurrencia.
---
# Pruebas
## Objetivo
Probar comportamiento e invariantes con evidencia repetible.
## Cuándo utilizarla
Antes de implementar features, correcciones o cambios de reglas.
## Archivos a consultar
Pruebas vecinas, Vitest, migraciones y contrato del caso de uso.
## Convenciones
Observar RED correcto; GREEN mínimo; integración crítica en PostgreSQL desechable; concurrencia realmente paralela.
## Procedimiento recomendado
Elegir el nivel más bajo realista, aislar datos, verificar fallo esperado y conservar salida limpia.
## Checklist de validación
- [ ] RED observado.
- [ ] Q99.99/Q100/Q100.01 cubiertos.
- [ ] Reintentos, propiedad y carreras cubiertos.
- [ ] Recursos cerrados.
## Errores comunes
Mockear integridad DB, probar internals o usar producción.
## Referencias
https://vitest.dev/guide/
