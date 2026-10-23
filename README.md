# Sistema de ventas por comisiones

Base profesional del MVP para catálogo, pedidos públicos, vendedores, pagos, comisiones y reportes de Sakura Nails.

## Estado actual

Las fases 0–4 preparan la estructura, el modelo relacional, la API NestJS y la autenticación con Supabase. La fase 5 incorpora catálogo y pedidos; la fase 6 añade reclamo atómico por vendedores, propiedad de pedidos, revisión de pagos, confirmación de ventas, cancelaciones y corrección controlada de comprobantes. No se incluyen todavía las pantallas de Next.js.

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

## Autenticación

La API valida tokens de Supabase Auth mediante el JWKS asimétrico del proyecto. Configura `SUPABASE_JWT_ISSUER`, `SUPABASE_JWT_AUDIENCE` y `SUPABASE_JWKS_URL`; esta última debe ser exactamente el discovery endpoint del emisor. El endpoint `GET /api/auth/me` comprueba la firma y después obtiene rol y estado activo desde `app_users`.

Los proyectos que todavía firman exclusivamente con el secreto legado HS256 deben migrar a signing keys asimétricas antes de usar esta integración; el backend no recibe ni almacena el secreto JWT.

## Catálogo y pedidos

El catálogo público está disponible en `GET /api/categories`, `GET /api/products` y `GET /api/products/:id`. La administración usa rutas bajo `/api/admin` y exige un JWT cuyo perfil activo tenga rol `ADMIN`.

`POST /api/orders` exige `Idempotency-Key` de 16 a 128 caracteres seguros. La misma clave solo puede reutilizarse con el mismo cliente, carrito, método y comprobante. Los precios enviados por el cliente no se consideran confiables: la API vuelve a leer las variantes disponibles y conserva precio, nombre, SKU y comisión como snapshots. Efectivo acepta JSON; transferencia usa `multipart/form-data` y exige el archivo `paymentProof` (JPEG, PNG o PDF, máximo 5 MiB).

La API limita por IP las rutas públicas a 120 solicitudes por minuto y el checkout a 10 solicitudes por minuto. El contador en memoria corresponde al despliegue MVP de una sola instancia; un despliegue horizontal deberá usar almacenamiento compartido para el throttling.

En producción configure explícitamente `TRUST_PROXY_HOPS` con la cantidad de proxies confiables delante de NestJS (`0` si recibe tráfico directo). Esto permite que el límite por IP use la dirección correcta sin confiar ciegamente en encabezados reenviados.

La subida privada de comprobantes requiere `SUPABASE_SECRET_KEY`, disponible solo en el proceso backend. `SUPABASE_SERVICE_ROLE_KEY` se acepta temporalmente para proyectos antiguos. Nunca exponga estas credenciales en Next.js ni las incluya en el repositorio.

## Vendedores y pagos

Las rutas `/api/seller/orders` exigen un perfil activo con rol `SELLER`. El vendedor se obtiene siempre del JWT validado y puede reclamar un código pendiente, consultar únicamente pedidos propios y marcar efectivo recibido sin confirmar la venta.

Las rutas `/api/admin/orders` exigen rol `ADMIN`. La verificación confirma en una sola transacción el pago, el pedido y la comisión; el rechazo conserva la venta pendiente. Un comprobante rechazado puede reemplazarse de forma controlada y su consulta utiliza una URL firmada de cinco minutos. Las cancelaciones solo se permiten mientras el pedido está pendiente.

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
- [Ejemplos HTTP](docs/api/requests.http)
- [Decisiones](docs/decisions/README.md)

## Flujo Git

Trabaje en ramas `feat/*`, `fix/*`, `docs/*` o `chore/*`, use commits semánticos y abra PR hacia `main`. CI exige validación Prisma, tipos, pruebas y build.
