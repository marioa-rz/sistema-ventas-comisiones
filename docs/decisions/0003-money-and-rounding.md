# ADR-0003: dinero y redondeo

Estado: aceptada — 2026-10-22

## Decisión

Persistir GTQ en `NUMERIC(12,2)`. Calcular cada comisión como `precio_unitario × cantidad × porcentaje` y redondear la línea a dos decimales con mitad hacia arriba. Sumar líneas ya redondeadas.

## Consecuencias

El total es reproducible, auditable y no depende de coma flotante. Un cambio futuro de moneda requerirá agregar código de moneda y política de decimales, no reinterpretar importes históricos.
