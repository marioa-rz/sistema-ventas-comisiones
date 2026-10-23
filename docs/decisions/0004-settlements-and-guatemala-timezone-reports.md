# ADR-0004: liquidaciones idempotentes y reportes con zona horaria

Estado: aceptada — 2026-10-22

## Decisión

1. Registrar liquidaciones de comisiones (`CommissionPayout`) de forma interactiva y transaccional mediante `prisma.$transaction`. Exigir `idempotencyKey` única en base de datos para prevenir pagos duplicados ante reintentos de red o interacción humana.
2. Agrupar y cortar reportes comerciales en `America/Guatemala` (constante UTC-6 sin DST). Las marcas de tiempo operativas (`confirmedAt`) se persisten estrictamente en UTC (`TIMESTAMPTZ`) y las consultas aplican rangos semiabiertos `[startUtc, endUtc)` para evitar el desfasaje diario y la duplicación de registros en períodos consecutivos.
3. Las ventas se reconocen única y exclusivamente en base a pedidos con estado `CONFIRMED` evaluados por `confirmedAt`, excluyendo pedidos pendientes o cancelados.

## Consecuencias

- Se garantiza la propiedad ACID en los desembolsos de comisiones, eliminando condiciones de carrera (*race conditions*).
- Los reportes reflejan exactamente la realidad contable de la tienda física en Guatemala, manteniendo la neutralidad y portabilidad de UTC en PostgreSQL.
