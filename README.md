# Sistema de ventas por comisiones

Base profesional del MVP para catálogo, pedidos públicos, vendedores, pagos, comisiones y reportes de Sakura Nails.

## Estado actual

Las fases 0–2 preparan la estructura, el modelo relacional y la migración inicial. La base de NestJS incluye configuración, Prisma y un endpoint de salud como siguiente hito. No se incluyen todavía las pantallas de Next.js.

## Requisitos

- Node.js 24.11+ (línea 24 LTS)
- npm 11+
- PostgreSQL 15+ o un proyecto Supabase
- Docker opcional para la base local de integración

## Inicio rápido

```bash
cp .env.example .env
npm ci
npm run prisma:generate
npm run dev
```

Swagger estará disponible en `http://localhost:3000/api/docs` y salud en `GET /api/health`.

## Base de datos

`DATABASE_URL` es la conexión de ejecución y `DIRECT_URL` la conexión usada por Prisma Migrate. En Supabase, una API NestJS persistente puede usar conexión directa o session pooler; transaction mode se reserva para cargas serverless y no debe usarse para migraciones.

```bash
npm run prisma:validate
npm run prisma:migrate:dev -- --name nombre_cambio
npm run prisma:migrate:deploy
npm run db:seed
```

No ejecute migraciones ni pruebas de integración contra producción. El seed solo crea datos ficticios.

## Documentación

- [Arquitectura](docs/architecture/overview.md)
- [Modelo de datos](docs/architecture/data-model.md)
- [Seguridad y Supabase](docs/architecture/supabase-security.md)
- [Decisiones](docs/decisions/README.md)

## Flujo Git

Trabaje en ramas `feat/*`, `fix/*`, `docs/*` o `chore/*`, use commits semánticos y abra PR hacia `main`. CI exige validación Prisma, tipos, pruebas y build.
