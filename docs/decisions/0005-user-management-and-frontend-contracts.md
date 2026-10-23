# ADR-0005: Gestión de perfiles comerciales y desacoplamiento con Supabase Auth

## Contexto

El sistema utiliza Supabase Auth para la autenticación de identidad (gestión de contraseñas, tokens JWT, recuperación de acceso), pero las reglas de negocio, roles (`ADMIN`, `SELLER`), estados (`isActive`) e historiales comerciales pertenecen exclusivamente al modelo de dominio de Sakura Nails en la base de datos PostgreSQL (`app_users`).

Para la administración de usuarios y la futura integración de Next.js, se requería una estrategia clara para:
1. Vincular identidades de Supabase Auth con perfiles de dominio sin exponer credenciales administrativas en el cliente.
2. Permitir a administradores crear, listar, desactivar y consultar el rendimiento comercial de vendedores.
3. Desactivar usuarios inmediatamente impidiendo cualquier operación comercial posterior sin destruir su historial financiero previo (comisiones, órdenes pasadas).
4. Proveer un contrato claro de integración frontend (`frontend-integration-guide.md`) que sirva de guía inmutable para la futura implementación de `apps/web`.

## Decisión

1. **Desacoplamiento Identidad/Perfil:**
   - La tabla `app_users` mantiene una relación única con `auth_user_id` (UUID generado por Supabase Auth).
   - NestJS nunca gestiona contraseñas directamente. La administradora registra al vendedor en Supabase Auth y luego lo vincula en la API mediante `POST /api/admin/users`.
   - La verificación de permisos en la API (`SupabaseAuthGuard` + `RolesGuard`) siempre resuelve el perfil comercial desde `app_users` en base de datos. Si `isActive` es `false`, la API responde de inmediato con `403 Forbidden`, invalidando efectivamente la sesión operativa aunque el JWT siga técnicamente vigente.

2. **Auditoría inmutable de cambios de estado:**
   - Cada creación (`USER_CREATED`) y modificación (`USER_UPDATED`) de usuarios genera un registro en `audit_logs` con el identificador de la administradora y snapshot de los campos alterados (`previous` vs `updated`).
   - Los registros de usuarios nunca se eliminan físicamente (`DELETE`); únicamente se desactivan (`isActive = false`) para preservar la integridad referencial histórica de ventas y comisiones.

3. **Historial de ventas y comisiones individual por vendedor:**
   - Se expone `GET /api/admin/users/:id/sales`, agregando métricas de ventas confirmadas y desglose de comisiones (`PENDING`, `APPROVED`, `PAID`) calculadas con precisión `Decimal`.

4. **Contrato de integración formal para Next.js:**
   - Se formalizó `docs/architecture/frontend-integration-guide.md` detallando la interacción para los tres roles (Público, Vendedor, Administradora), manejo de idempotencia, subida de comprobantes y manejo uniforme de errores.

## Consecuencias

- **Positivas:** Seguridad robusta, separación estricta de responsabilidades (Auth vs Dominio), trazabilidad total de auditoría y base sólida para el desarrollo frontend sin dependencias circulares.
- **Compromisos:** La administradora vincula el usuario a través de su `auth_user_id`. En el futuro, un webhook o Edge Function de Supabase podría automatizar este paso si se desea auto-aprovisionamiento.
