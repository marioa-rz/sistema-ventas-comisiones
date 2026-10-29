# Sistema de ventas por comisiones

## Contexto

Monolito modular para catálogo público, pedidos, asignación a vendedores, verificación de pagos, comisiones y reportes. La API NestJS es la única capa que aplica reglas comerciales. Supabase aporta PostgreSQL, Auth y Storage.

## Stack fijado

- Node.js 24 LTS, TypeScript 5.9.3 y npm workspaces.
- NestJS 11.2.7, REST, DTOs y OpenAPI.
- PostgreSQL en Supabase y Prisma ORM 7.10.1 con `@prisma/adapter-pg`.
- Vitest para pruebas unitarias e integración; GitHub Actions para CI.

## Estructura

- `apps/api`: API NestJS y Prisma.
- `apps/web`: reservado para Next.js; no implementarlo sin una tarea explícita.
- `docs/architecture`: arquitectura, modelo de datos y seguridad.
- `docs/decisions`: ADRs.
- `.agents/skills`: instrucciones especializadas del repositorio.

## Reglas globales

1. Nunca confiar en precios, totales, vendedor o roles recibidos del cliente.
2. Obtener identidad del JWT y rol/estado desde `app_users`.
3. Usar `Decimal`/`NUMERIC`, snapshots históricos y transacciones para operaciones financieras.
4. Tratar `confirmed_at` como fecha de venta y almacenar instantes en UTC.
5. Añadir migraciones versionadas; nunca depender de cambios manuales del panel.
6. No exponer secretos ni usar datos reales en seeds, pruebas o logs.
7. Aplicar TDD a reglas y comportamiento. Las pruebas destructivas solo usan una base aislada.
8. Preservar historial financiero: desactivar registros en vez de borrarlos.

## Enrutamiento de skills

Carga solo las skills necesarias:

- `efficient-delivery`: cambios de código de varias piezas, trabajo con riesgo o solicitudes de reducir complejidad/coste; selecciona la ruta mínima completa y la escalera de verificación.
- `architecture`: límites de módulos, ADRs y evolución futura.
- `database`: Prisma, SQL, migraciones, integridad y rendimiento.
- `nestjs-backend`: módulos, controladores, servicios, DTOs y errores.
- `supabase`: PostgreSQL administrado, Auth, Storage, conexiones y RLS.
- `authentication-security`: JWT, RBAC, propiedad de recursos y OWASP.
- `business-rules`: pedidos, pagos, comisiones, estados e idempotencia.
- `testing`: estrategia TDD, pruebas unitarias, integración y E2E.
- `github-workflow`: ramas, commits, PR y CI.
- `deployment`: Docker y despliegues posteriores.
- `frontend-integration`: contrato API y futura aplicación Next.js.

Precedencia: solicitud humana > este archivo > skill aplicable > documentación general. Las instrucciones más cercanas al archivo modificado ganan si no contradicen niveles superiores.

## Modelo operativo

1. Inspeccionar antes de editar: reglas cercanas, estado Git, código afectado, consumidores y pruebas vecinas.
2. Trabajar en línea por defecto. Usar agentes paralelos solo cuando se soliciten o exista una razón explícita y las superficies de escritura sean independientes; no separar pruebas, código y documentación de un mismo comportamiento.
3. Elegir el cambio completo más pequeño: reutilizar patrones locales, después plataforma/estándar y por último dependencias nuevas. No añadir abstracciones, configuración o flexibilidad especulativa.
4. Aplicar TDD a comportamiento y reglas. Durante la iteración ejecutar primero la prueba enfocada; antes de cerrar, ampliar la verificación según el riesgo y ejecutar `npm run verify` cuando el cambio pueda afectar el conjunto.
5. Consultar documentación oficial cuando una decisión dependa de APIs, versiones o comportamiento externo susceptible de cambio. Registrar ADR solo si la decisión es costosa de revertir.
6. Escalar herramientas por necesidad: `rg` y lectura dirigida antes de indexadores; Postman CLI para contratos/colecciones API cuando aporte evidencia; grafos, proxies de inferencia y servicios auxiliares solo tras justificar su coste operativo.
7. Entregar evidencia, no actividad: cambios concretos, comandos realmente ejecutados, resultados, riesgos residuales y pendientes. No crear commits, ramas, PR ni despliegues sin solicitud.

La evaluación de herramientas externas y el criterio de adopción están en `docs/agent-workflow-audit.md`.

## Validación habitual

```bash
npm ci
npm run verify
npm run test:integration
```

`test:integration` requiere `TEST_DATABASE_URL` de una base desechable. Para cambios de esquema también ejecutar `npm run prisma:generate` y revisar el SQL de migración.

## Entrega

Indicar fase, estado real, cambios, archivos clave, comandos ejecutados, resultados, Git/PR, decisiones, aprendizaje, pendientes y siguiente fase. No afirmar migraciones, conexión, push o pruebas sin evidencia del comando correspondiente.
