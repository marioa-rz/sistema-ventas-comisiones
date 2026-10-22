# ADR-0001: monolito modular

Estado: aceptada — 2026-10-22

## Decisión

Usar un monorepo ligero y una API NestJS monolítica dividida por módulos de negocio.

## Consecuencias

Las transacciones críticas permanecen locales y el despliegue es simple. Los límites de módulo permiten separar servicios después si la escala lo exige. Se descartan microservicios y mensajería para el MVP.
