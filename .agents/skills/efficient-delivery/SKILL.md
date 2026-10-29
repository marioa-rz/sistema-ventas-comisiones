---
name: efficient-delivery
description: Ejecuta cambios de código de varias piezas o con riesgo usando la solución completa más pequeña, TDD y verificación proporcional. Úsala también cuando se pida reducir coste, tokens, complejidad, dependencias o sobreingeniería; no usar para respuestas informativas ni revisiones sin cambios.
---

# Entrega eficiente

## Resultado

Resolver todo lo solicitado con el menor cambio mantenible y con evidencia proporcional al riesgo. Ser austero con código, herramientas y contexto; nunca con seguridad, integridad financiera, accesibilidad, manejo de errores ni pruebas que protegen reglas.

## Antes de escribir

1. Leer `AGENTS.md`, el estado Git y las instrucciones cercanas.
2. Trazar entrada, persistencia y salida del comportamiento. Buscar consumidores, pruebas, fixtures, contratos y configuración afectados.
3. Identificar el fallo o resultado observable y los riesgos: dinero, autenticación/autorización, datos, concurrencia, migraciones, contrato público y entrega.
4. Si una API o versión externa decide el diseño, consultar su fuente oficial antes de implementar.

## Ruta mínima completa

Elegir la primera opción que resuelva el caso sin romper convenciones:

1. Eliminar trabajo que no corresponde al resultado pedido.
2. Reutilizar una abstracción o patrón existente del repositorio.
3. Usar una capacidad de la plataforma o biblioteca estándar.
4. Usar una dependencia ya instalada.
5. Añadir código o una dependencia solo cuando las opciones anteriores no cubran el requisito.

No crear wrappers, opciones, capas, flags o generalizaciones para un único caso futuro. Una diferencia corta pero críptica no es una solución simple. Corregir la causa compartida una vez y actualizar todos los consumidores afectados.

## Implementación y coste

- Mantener juntos comportamiento, prueba y documentación asociada.
- Para reglas o correcciones, observar RED, implementar GREEN mínimo y refactorizar conservando verde.
- Ejecutar comprobaciones enfocadas durante la iteración. Evitar repetir la suite completa sin nueva evidencia; ejecutarla al cierre cuando el alcance pueda producir regresiones.
- Trabajar en línea por defecto. Delegar solo cuando esté autorizado y exista exploración amplia, unidades realmente independientes o necesidad de verificación independiente por alto riesgo.
- No introducir indexadores, servicios persistentes, proxies de modelos o nuevas credenciales para resolver una búsqueda o cambio local.

## Escalera de verificación

1. Prueba o reproducción que demuestre el comportamiento cambiado.
2. Lint y typecheck del workspace afectado.
3. Suite del proyecto y build cuando el cambio cruza módulos, contratos o configuración.
4. Integración PostgreSQL para persistencia, restricciones, transacciones, idempotencia o concurrencia; solo con `TEST_DATABASE_URL` desechable.
5. `prisma:generate` y revisión del SQL para cambios de esquema.

Si un nivel aplicable no puede ejecutarse, indicarlo como riesgo pendiente; nunca inferir que pasó.

## Cierre

Informar la fase y el estado real, el cambio mínimo elegido, archivos clave, evidencia fresca, riesgo residual y siguiente paso. Mencionar explícitamente lo que se descartó cuando evita coste o complejidad relevante.
