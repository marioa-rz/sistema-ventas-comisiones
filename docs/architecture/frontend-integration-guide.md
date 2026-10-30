# Guía de integración para Next.js (Frontend)

Este documento define las reglas comerciales, contratos HTTP, flujo de sesiones y mejores prácticas para conectar la futura aplicación web en `apps/web` (Next.js + React) con la API REST de NestJS.

---

## 1. Principios arquitectónicos obligatorios

1. **El cliente web no es confiable:**
   - El frontend **nunca** calcula precios unitarios, comisiones, subtotales ni totales finales de forma autoritativa.
   - El carrito en el navegador es solo una vista temporal de conveniencia. Al enviar `POST /api/orders`, el backend relee el catálogo real de la base de datos y calcula los importes con precisión monetaria exacta (`Decimal`).
   - La identidad del vendedor y sus permisos provienen estrictamente del token JWT y de la tabla `app_users` en base de datos, nunca de un identificador enviado en el cuerpo de la petición.

2. **Seguridad y secretos:**
   - En Next.js únicamente se configuran variables públicas con prefijo `NEXT_PUBLIC_` (ej. `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
   - La clave `SUPABASE_SECRET_KEY` (iniciada con `sb_secret_`) es **exclusiva del backend NestJS**. Jamás debe incluirse en variables de entorno del frontend ni exponerse en el bundle de JavaScript del navegador.

3. **Zona horaria y visualización:**
   - El backend almacena todas las marcas de tiempo en UTC (`TIMESTAMPTZ`).
   - El frontend debe formatear y agrupar las fechas operativas en la zona horaria del negocio físico: `America/Guatemala` (constante UTC-6).

---

## 2. Flujo de Autenticación y Sesión

- La autenticación de **Vendedores** y **Administradoras** se realiza mediante el cliente `@supabase/supabase-js` en el frontend:
  ```typescript
  import { createClient } from '@supabase/supabase-js';

  export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  ```
- Tras el inicio de sesión (`supabase.auth.signInWithPassword`), el frontend obtiene el token de acceso (`session.access_token`).
- Todas las peticiones autenticadas hacia la API NestJS deben incluir la cabecera:
  ```http
  Authorization: Bearer <access_token>
  ```
- **Verificación de rol y estado activo:** Al iniciar la app o refrescar la sesión, el frontend consulta:
  ```http
  GET /api/auth/me
  ```
  Respuesta:
  ```json
  {
    "id": "uuid-perfil-comercial",
    "authUserId": "uuid-supabase-auth",
    "displayName": "Nombre Vendedor",
    "role": "SELLER" // o "ADMIN"
  }
  ```
  Si el usuario fue desactivado administrativamente, la API devuelve `403 Forbidden` y el frontend debe cerrar la sesión inmediatamente.

---

## 3. Contratos de la API por Rol

### A. Experiencia Pública: Catálogo y Checkout (Cliente)

El cliente público no requiere autenticación ni registro.

1. **Consultar categorías activas:**
   ```http
   GET /api/categories
   ```
2. **Consultar productos y tonos/variantes:**
   ```http
   GET /api/products?search=labial&category=labiales&limit=20&offset=0
   GET /api/products/:id
   ```
3. **Estructura recomendada del Carrito (Estado local en navegador):**
   ```typescript
   interface CartItem {
     variantId: string;
     sku: string;
     productName: string;
     variantName: string;
     price: string; // Para referencia visual en UI
     quantity: number;
   }
   ```
4. **Finalizar Pedido (Checkout):**
   - **Generar Idempotency-Key:** El cliente genera un UUID v4 antes de enviar la petición. Si hay un error de red y se reintenta, **debe enviar la misma clave** para no duplicar la orden.
   
   - **Pago en Efectivo (`application/json`):**
     ```http
     POST /api/orders
     Idempotency-Key: 7b8e1f2a-9c4d-4e5f-8a1b-2c3d4e5f6a7b
     Content-Type: application/json

     {
       "customerName": "Maria Lopez",
       "customerPhone": "55551234",
       "paymentMethod": "CASH",
       "items": [
         { "variantId": "uuid-variante", "quantity": 2, "unitPrice": "125.00" }
       ]
     }
     ```

   - **Pago por Transferencia (`multipart/form-data`):**
     - Campo `customerName`: texto.
     - Campo `customerPhone`: texto.
     - Campo `paymentMethod`: `TRANSFER`.
     - Campo `items`: string JSON serializado con el array de ítems.
     - Campo `paymentProof`: archivo binario (JPEG, PNG o PDF, máximo 5 MB).
   
   - **Respuesta de confirmación exitosa (201 Created):**
     ```json
     {
       "id": "uuid-orden",
       "publicCode": "VNT-8F2K91",
       "status": "PENDING",
       "total": "250.00",
       "commission": "50.00",
       "payment": {
         "method": "TRANSFER",
         "status": "PENDING"
       },
       "createdAt": "2026-10-23T05:00:00.000Z"
     }
     ```
   - La pantalla de confirmación debe mostrar en grande el código `VNT-8F2K91` con un botón "Copiar código" o "Compartir por WhatsApp con mi vendedora".

---

### B. Portal de Vendedor (`/seller`)

Requiere rol `SELLER`.

1. **Reclamar un pedido mediante código público:**
   ```http
   POST /api/seller/orders/claim
   Authorization: Bearer <token>
   Content-Type: application/json

   {
     "publicCode": "VNT-8F2K91"
   }
   ```
   *(Protegido con rate limit de 10 intentos por minuto para prevenir ataques de fuerza bruta).*

2. **Listar pedidos asignados:**
   ```http
   GET /api/seller/orders?status=PENDING&limit=20&offset=0
   ```

3. **Marcar pago en efectivo como recibido:**
   ```http
   POST /api/seller/orders/:id/cash-received
   Authorization: Bearer <token>
   ```
   *(Aviso: Esto registra la fecha y vendedor que recibió el dinero; no confirma la venta todavía).*

4. **Historial de comisiones y balances:**
   ```http
   GET /api/seller/commissions?status=APPROVED
   ```
   Respuesta:
   ```json
   {
     "summary": {
       "pendingAmount": "20.00",
       "approvedAmount": "50.00",
       "paidAmount": "180.00",
       "totalAmount": "250.00",
       "pendingCount": 1,
       "approvedCount": 2,
       "paidCount": 5
     },
     "items": [
       {
         "id": "uuid-comision",
         "orderPublicCode": "VNT-8F2K91",
         "orderTotal": "250.00",
         "amount": "50.00",
         "status": "APPROVED",
         "approvedAt": "2026-10-23T05:30:00.000Z",
         "paidAt": null
       }
     ]
   }
   ```

---

### C. Panel de Administradora (`/admin`)

Requiere rol `ADMIN`.

1. **Dashboard ejecutivo en tiempo real:**
   ```http
   GET /api/admin/dashboard
   Authorization: Bearer <token>
   ```
   Retorna ventas confirmadas (hoy, semana, mes, año), pedidos por estado y resumen general de comisiones.

2. **Gestión de pedidos:**
   ```http
   GET /api/admin/orders?status=PENDING&paymentStatus=PENDING
   GET /api/admin/orders/:id
   ```

3. **Verificación de comprobante de transferencia privado:**
   - La administradora solicita una URL firmada de corta duración (5 minutos):
     ```http
     GET /api/admin/orders/:id/payment-proof-url
     ```
     Respuesta:
     ```json
     {
       "proofId": "uuid-proof",
       "signedUrl": "https://<supabase-url>/storage/v1/object/sign/payment-proofs/...",
       "expiresInSeconds": 300
     }
     ```
   - El frontend renderiza la imagen o muestra un enlace para previsualizar el PDF.

4. **Confirmación o Rechazo de Pago:**
   ```http
   PATCH /api/admin/orders/:id/verify-payment
   Content-Type: application/json

   { "decision": "VERIFIED" }
   ```
   *(La verificación aprueba atómicamente la comisión y confirma la venta).*

   Para rechazo:
   ```http
   PATCH /api/admin/orders/:id/verify-payment
   Content-Type: application/json

   {
     "decision": "REJECTED",
     "rejectionReason": "El monto transferido no coincide"
   }
   ```

5. **Liquidación de comisiones aprobadas:**
   ```http
   POST /api/admin/commission-payouts
   Content-Type: multipart/form-data

   sellerId=uuid-vendedor
   commissionIds=["uuid-comision-1","uuid-comision-2"]
   method=TRANSFER
   proof=<imagen JPEG o PNG>
   note=Liquidación quincenal
   idempotencyKey=payout-oct-seller-1
   ```
   Para efectivo se envía `method=CASH` sin `proof`. La vendedora administra su destino
   bancario con `GET/PATCH /api/seller/commissions/payout-settings`; una transferencia
   conserva una copia histórica del banco, cuenta y comprobante privado usados.

6. **Reportes analíticos de ventas:**
   - JSON:
     ```http
     GET /api/admin/reports/sales?startDate=2026-10-01&endDate=2026-10-31&format=json
     ```
   - Exportación directa CSV:
     ```http
     GET /api/admin/reports/sales?startDate=2026-10-01&endDate=2026-10-31&format=csv
     ```
     *(El frontend puede invocar este endpoint con un `<a href="...">` o fetch con blob para descarga inmediata).*

7. **Administración de vendedores y usuarios:**
   - Listar usuarios: `GET /api/admin/users?role=SELLER`
   - Crear / Vincular vendedor: `POST /api/admin/users`
   - Desactivar vendedor: `PATCH /api/admin/users/:id` con `{ "isActive": false }`
   - Historial de ventas individual: `GET /api/admin/users/:id/sales`

---

## 4. Formato uniforme de errores de la API

Cuando una petición no es exitosa, la API responde con un formato estándar:

```json
{
  "statusCode": 409,
  "message": "Order was already claimed by another seller",
  "error": "Conflict",
  "timestamp": "2026-10-23T05:50:00.000Z",
  "path": "/api/seller/orders/claim"
}
```

El cliente web debe capturar `error.response?.data?.message` para mostrar notificaciones legibles al usuario mediante alertas o componentes de toast/snackbar.
