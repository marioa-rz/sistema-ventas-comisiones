# ADR-0002: Prisma 7 y conexiones Supabase

Estado: aceptada — 2026-10-22

## Decisión

Fijar Prisma 7.10.1 con `@prisma/adapter-pg`. Separar `DATABASE_URL` de runtime y `DIRECT_URL` para migraciones. La referencia a `auth.users` vive en SQL nativo versionado.

## Consecuencias

La aplicación usa el driver PostgreSQL estándar y controla su pool. Las migraciones no dependen de transaction pooling. Prisma conserva dominio sobre tablas comerciales, no sobre esquemas internos de Supabase.
