# Supabase: conexión y seguridad

## Conexiones

- Runtime persistente: conexión directa si hay IPv6, o Supavisor en modo sesión si solo hay IPv4.
- Migraciones: `DIRECT_URL`, nunca transaction pooler.
- Prisma 7 usa `@prisma/adapter-pg`; los límites del pool pertenecen a `pg` y deben ajustarse al tamaño del proyecto.

## RLS y permisos

La migración habilita RLS en todas las tablas comerciales y no crea políticas para `anon` ni `authenticated`; por tanto PostgREST no ofrece acceso directo. La API se conecta con un rol de base de datos privado y aplica además autorización por recurso. RLS es defensa adicional, no la regla de negocio principal.

## Auth

NestJS verifica tokens con el JWKS asimétrico publicado por Supabase. Se validan firma, algoritmo permitido, `iss`, `aud`, `exp` y `sub`. La URL JWKS debe derivar exactamente del emisor configurado para impedir sustitución de claves. Los claims modificables y el claim `role` no conceden permisos comerciales: después de la verificación se consulta `app_users` por `auth_user_id`, exigiendo `is_active = true`.

## Storage

- `product-images`: público solo para recursos publicados.
- `payment-proofs`: privado, rutas aleatorias, MIME permitido (`image/jpeg`, `image/png`, `application/pdf`) y límite inicial de 5 MiB.
- La API genera una URL firmada de cinco minutos únicamente para administración autenticada.
- Storage y PostgreSQL no comparten transacción: subir primero a una ruta temporal, persistir metadatos y promover; si falla la base, intentar borrar el objeto y registrar la limpieza pendiente sin incluir datos sensibles.
- La API usa `SUPABASE_SECRET_KEY` exclusivamente en backend para escribir comprobantes privados; mantiene compatibilidad temporal con `SUPABASE_SERVICE_ROLE_KEY`. La clave publicable no sustituye esta credencial y no concede acceso administrativo.
- `POST /api/orders` acepta el comprobante dentro de la misma solicitud `multipart/form-data`; se valida MIME y un máximo de 5 MiB antes de subirlo. Si la transacción SQL falla, la API intenta eliminar el objeto temporal.

Las políticas de Storage se aplicarán cuando existan los buckets autorizados; no se simula su ejecución en la migración comercial.
