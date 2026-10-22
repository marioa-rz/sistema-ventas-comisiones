# Supabase: conexión y seguridad

## Conexiones

- Runtime persistente: conexión directa si hay IPv6, o Supavisor en modo sesión si solo hay IPv4.
- Migraciones: `DIRECT_URL`, nunca transaction pooler.
- Prisma 7 usa `@prisma/adapter-pg`; los límites del pool pertenecen a `pg` y deben ajustarse al tamaño del proyecto.

## RLS y permisos

La migración habilita RLS en todas las tablas comerciales y no crea políticas para `anon` ni `authenticated`; por tanto PostgREST no ofrece acceso directo. La API se conecta con un rol de base de datos privado y aplica además autorización por recurso. RLS es defensa adicional, no la regla de negocio principal.

## Storage

- `product-images`: público solo para recursos publicados.
- `payment-proofs`: privado, rutas aleatorias, MIME permitido (`image/jpeg`, `image/png`, `application/pdf`) y límite inicial de 5 MiB.
- La API genera URL firmada corta solo para vendedor propietario o administración.
- Storage y PostgreSQL no comparten transacción: subir primero a una ruta temporal, persistir metadatos y promover; si falla la base, intentar borrar el objeto y registrar la limpieza pendiente sin incluir datos sensibles.

Las políticas de Storage se aplicarán cuando existan los buckets autorizados; no se simula su ejecución en la migración comercial.
