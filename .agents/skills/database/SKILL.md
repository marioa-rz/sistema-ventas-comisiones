---
name: database
description: Implementa o revisa Prisma, migraciones PostgreSQL, restricciones, índices, seeds y consultas financieras.
---
# Base de datos
## Objetivo
Garantizar integridad relacional, historial financiero inmutable y migraciones reproducibles.
## Cuándo utilizarla
Ante cambios en modelos, SQL, datos, reportes o rendimiento.
## Archivos a consultar
`apps/api/prisma/schema.prisma`, migraciones, modelo de datos y ADR de dinero.
## Convenciones
UUID, `TIMESTAMPTZ`, `NUMERIC(12,2)`, FKs e índices explícitos; intervalos `[inicio, fin)`; `confirmed_at` para ventas; SQL nativo si Prisma no expresa una restricción.
## Procedimiento recomendado
Escribir una prueba de integración, cambiar modelo/migración, inspeccionar SQL, validar/generar y probar en DB desechable.
## Checklist de validación
- [ ] Nulabilidad, unicidad, checks y `ON DELETE` revisados.
- [ ] Índices respaldan filtros reales.
- [ ] Riesgo de migración documentado.
- [ ] Seed solo ficticio.
## Errores comunes
`Float` para dinero, cambios manuales, confiar solo en DTOs o borrar historia financiera.
## Referencias
https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7
