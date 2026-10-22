---
name: supabase
description: Configura Supabase PostgreSQL, Auth, Storage, RLS, poolers y separación de credenciales.
---
# Supabase
## Objetivo
Integrar servicios administrados sin exponer tablas comerciales ni secretos.
## Cuándo utilizarla
Para conexiones, JWT/JWKS, buckets, RLS o despliegues conectados a Supabase.
## Archivos a consultar
`.env.example`, `prisma.config.ts`, migraciones y seguridad Supabase.
## Convenciones
URLs separadas para runtime/migración; secretos solo servidor; comprobantes privados; cambios reproducibles.
## Procedimiento recomendado
Elegir modo según persistencia/IPv4, verificar TLS, aplicar mínimo privilegio y probar fuera de producción.
## Checklist de validación
- [ ] `anon`/`authenticated` sin acceso comercial directo.
- [ ] MIME/tamaño y limpieza de huérfanos definidos.
- [ ] Operación real verificada.
## Errores comunes
Transaction pooler para migraciones, confiar solo en RLS o verificar pago por existir archivo.
## Referencias
https://supabase.com/docs/guides/database/connecting-to-postgres
