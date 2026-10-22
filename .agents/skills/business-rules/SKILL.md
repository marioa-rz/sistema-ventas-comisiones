---
name: business-rules
description: Implementa pedidos, reclamos, pagos, comisiones, liquidaciones, estados e idempotencia.
---
# Reglas de negocio
## Objetivo
Mantener invariantes financieras explícitas, atómicas y auditables.
## Cuándo utilizarla
En casos de uso desde checkout hasta liquidación o reporte.
## Archivos a consultar
ADR de dinero, modelo, migraciones y pruebas de dominio.
## Convenciones
`< Q100` = 10%; `>= Q100` = 20%; `ROUND_HALF_UP` por línea; servidor relee catálogo; confirmación aprueba comisión en transacción; reclamo condicional.
## Procedimiento recomendado
Expresar transición, escribir RED incluyendo repetición/concurrencia, ejecutar transacción y auditar en ella.
## Checklist de validación
- [ ] Estado y actor permitidos.
- [ ] Reintento no duplica.
- [ ] Snapshot independiente del catálogo.
- [ ] Carrera cubierta por DB.
## Errores comunes
Usar `number`, confirmar efectivo prematuramente, doble pago o reportar por `created_at`.
## Referencias
https://www.postgresql.org/docs/current/tutorial-transactions.html
