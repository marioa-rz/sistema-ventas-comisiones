# Preparación para lanzamiento web — Sakura Makeup

Fecha de revisión: 28 de octubre de 2026. Este documento es la checklist única derivada de la auditoría de lanzamiento y verificada contra el repositorio actual.

## Estado general

El repositorio queda preparado hasta el límite seguro para un lanzamiento público, pero **no debe publicarse todavía**. Faltan decisiones y acciones externas: dominio, proveedor de hosting, TLS/redirección HTTPS en edge, revisión jurídica de los textos, configuración de orígenes reales y creación/verificación de Google Business Profile. Las rutas privadas y cabeceras de seguridad quedan protegidas a nivel de servidor mediante `middleware.ts` sincronizado con cookies de sesión y respaldado por la autorización RBAC de la API.

## Checklist de 29 requisitos

| # | Estado | Requisito | Evidencia actual |
|---|---|---|---|
| 1 | Cumplido | Aviso legal | `apps/web/src/app/aviso-legal/page.tsx` y enlace persistente en el footer; solo usa datos autorizados. Pendiente revisión jurídica externa. |
| 2 | No aplicable | View source vacío | Ocultar HTML/JS entregado al navegador no es un control posible. El build de producción no genera source maps públicos. |
| 3 | Cumplido | Rutas y protección | Middleware de servidor implementado en `apps/web/src/middleware.ts` con redirección HTTP 307 de rutas privadas (`/admin`, `/seller`) ante sesiones ausentes o expiradas; cookies sincronizadas (`sakura_token`, `sakura_role`); control de sondas maliciosas; cabeceras `X-Robots-Tag: noindex, nofollow`, `Cache-Control: private, no-store` y CSP/HSTS; la API conserva JWT y RBAC en NestJS. |
| 4 | Cumplido | OG image | `opengraph-image.tsx`, Open Graph y Twitter metadata en el layout raíz. |
| 5 | Cumplido | H1 correcto | Catálogo, login, carrito vacío/lleno, confirmación, legales y 404 tienen H1 orientado a la tarea. |
| 6 | Bloqueado externamente | Canonical | Implementado con `NEXT_PUBLIC_SITE_URL`; falta el dominio definitivo para producir URLs canónicas reales. |
| 7 | Cumplido | `llms.txt` | `apps/web/public/llms.txt` contiene alcance público, rutas y límites; no expone rutas internas como contenido indexable. |
| 8 | Cumplido | Alt | Imágenes informativas tienen texto alternativo y las decorativas usan `alt=""`. |
| 9 | Cumplido | Idioma | `<html lang="es-GT">`. |
| 10 | Cumplido | Source maps | `find apps/web/.next/static -name '*.map'` devuelve 0 después del build de producción. |
| 11 | Cumplido | Bundle JS | El shell público usa carga dinámica del shell privado; los chunks que contienen Supabase aparecen solo en login/admin/seller. |
| 12 | Bloqueado externamente | Privacidad | `apps/web/src/app/privacidad/page.tsx` y enlace en footer explican datos, finalidad, acceso y contacto sin inventar plazos ni identidad fiscal. Para cerrar el requisito faltan revisión jurídica y verificación externa de que `payment-proofs` sea privado. |
| 13 | Cumplido | Cookies/consentimiento | No se carga analítica ni tecnología no esencial; la página `/cookies` documenta almacenamiento necesario y exige consentimiento previo antes de introducir usos no esenciales. No se muestra un banner engañoso. |
| 14 | Bloqueado externamente | HTTPS | HSTS preparado; TLS y redirección HTTP→HTTPS deben activarse y comprobarse en el hosting elegido. |
| 15 | Cumplido | Títulos/descripciones | Metadata específica para catálogo, legales, login, carrito, confirmación, admin, seller y 404. |
| 16 | Cumplido | Datos estructurados | JSON-LD `Organization` + `LocalBusiness` con nombre legal/comercial, ubicación, teléfono e Instagram autorizados. |
| 17 | Cumplido | Sitemap/robots | `/robots.txt` permite que los crawlers lean el `noindex` de rutas privadas; `/sitemap.xml` solo contiene catálogo y páginas legales. Las privadas no se bloquean en robots porque eso impediría procesar su `noindex`. |
| 18 | Bloqueado externamente | Google Business Profile | No existe una ficha. Requiere cuenta empresarial, creación y verificación por parte del negocio. |
| 19 | Cumplido | Favicon | `app/icon.svg`, cuadrado y escalable, integrado por la convención de metadata de Next.js. |
| 20 | Cumplido | Texto alternativo | Ver requisito 8; comprobado en las superficies visibles. |
| 21 | Cumplido | Imágenes comprimidas/responsivas | Productos migrados a `next/image` con `fill` y `sizes`; host de Supabase limitado por `NEXT_PUBLIC_SUPABASE_URL`. |
| 22 | Cumplido | Velocidad | Build estático aprobado. Catálogo conserva 117 kB iniciales; Supabase/Auth no está en sus chunks. No hubo regresión de tamaño inicial respecto de la auditoría. |
| 23 | Cumplido | Contraste | Acciones con texto blanco usan `sakura-700`; placeholders y estados vacíos usan tonos legibles; catálogo usa `#c2186a`/`#9e0f55`. |
| 24 | Cumplido | Responsive | Navegador real a viewport móvil: catálogo, carrito, login y legales sin overflow horizontal; navbar privado corregido tras detectar una regresión. |
| 25 | Cumplido | 404 personalizada | `not-found.tsx`, respuesta HTTP 404, contenido en español y `noindex`. |
| 26 | Cumplido | Enlaces rotos | Navegación real de catálogo, legales, login, carrito y 404; endpoints estáticos responden. Debe repetirse con el dominio final. |
| 27 | Cumplido | Protección contra spam | Pedidos conservan rate limit e idempotencia; no existe formulario público de contacto. CAPTCHA/honeypot no aporta valor actual. |
| 28 | No aplicable por decisión actual | Analítica | El negocio eligió “sin analítica”. No se cargan scripts ni cookies analíticas; `/cookies` define el gate para un cambio futuro. |
| 29 | Cumplido | CTA y jerarquía | Hero conserva una CTA primaria; acciones secundarias usan estilos ghost/neutros y las decisiones financieras usan jerarquía primaria/cancelar. |

## Seguridad y dependencias

- La API exige `CORS_ORIGIN` explícito en producción, solo acepta orígenes HTTPS y deja de usar `origin: true`.
- Frontend y API envían CSP, anti-frame, `nosniff`, referrer policy y permissions policy. Next elimina `X-Powered-By`; el frontend prepara HSTS.
- Swagger no se expone en producción.
- `body-parser` se actualizó de 2.3.0 a 2.4.0; PostCSS directo/de desarrollo quedó en 8.5.32.
- Permanecen 6 avisos de `npm audit --omit=dev` (3 altos y 3 moderados) porque Nest 11.2.7, Swagger 11.4.7 y Next 15.5.28 fijan `multer 2.4.0`, `js-yaml 5.3.0` y PostCSS 8.4.31. npm solo ofrece Nest 12/Swagger 12/Next 16 como corrección automática. No se aceptó un salto mayor no revisado.
- Mitigaciones: límite de 5 MiB y tipos/firma de comprobantes, throttling, PostCSS solo en build controlado y cabeceras endurecidas. Antes de publicar, reevaluar nuevas versiones compatibles o planificar la migración mayor con pruebas.
- El código usa URLs firmadas temporales para comprobantes, pero el repositorio no puede demostrar las políticas del bucket remoto. El lanzamiento queda bloqueado hasta confirmar que `payment-proofs` no es público y que una URL no firmada falla.

## Rendimiento

| Ruta | Auditoría inicial | Build actual | Cambio |
|---|---:|---:|---:|
| Catálogo | 117 kB | 117 kB | 0 kB |
| Carrito | 113 kB | 114 kB | +1 kB |
| Confirmación | 110 kB | 110 kB | 0 kB |
| Admin | 175 kB | 177 kB | +2 kB por modal/estados accesibles |
| Seller | 174 kB | 175 kB | +1 kB por skeleton/estados |
| Login | 178 kB | 178 kB | 0 kB |

Supabase se encuentra en chunks de las rutas privadas y no en los chunks del catálogo. Las imágenes de producto ahora declaran tamaños responsivos y pasan por el optimizador de Next cuando su host coincide con la URL de Supabase configurada.

## Acciones externas exactas antes de publicar

1. Elegir dominio y hosting compatible con Node/Next; configurar `NEXT_PUBLIC_SITE_URL=https://DOMINIO` durante el build.
2. Configurar DNS según el hosting (A/AAAA o CNAME), emitir certificado TLS, forzar redirección 301/308 HTTP→HTTPS y verificar HSTS únicamente cuando HTTPS funcione en todos los subdominios previstos.
3. Configurar API: `NODE_ENV=production`, `CORS_ORIGIN=https://DOMINIO`, `TRUST_PROXY_HOPS` según el proxy real y secretos Supabase desde el gestor del proveedor.
4. Añadir el dominio y callback necesarios a los orígenes/redirect URLs permitidos de Supabase Auth.
5. En Supabase Storage, crear o revisar `payment-proofs` como bucket privado, negar lectura anónima/pública, mantener la escritura solo desde la credencial backend y probar que una URL directa sin firma devuelve acceso denegado; conservar evidencia. Revisar también el bucket público de imágenes de producto por separado.
6. Repetir: headers, canonical, OG image, robots, sitemap, 404, login y flujo de pedido desde el dominio público.
7. Solicitar revisión jurídica local de aviso legal, privacidad y conservación de datos; proporcionar identidad fiscal y correo dedicado si el negocio decide publicarlos.
8. Crear Google Business Profile desde la cuenta empresarial, introducir Sakura Makeup/Sakura Studio, teléfono y área autorizados, completar el método de verificación de Google y añadir la URL final cuando exista. No se realizó ninguna acción externa.
9. Mantener analítica desactivada. Si se elige una, documentar proveedor/finalidad/retención, actualizar privacidad y cookies e implementar bloqueo por defecto + consentimiento previo antes de cargar el script.

## Verificación reproducible

Comandos principales: `npm audit --omit=dev`, `npm run test`, `npm run typecheck`, `npm run build`, `npm run verify`, comprobaciones HTTP con `curl` y recorrido real de navegador. `npm run test:integration` no se ejecuta sin `TEST_DATABASE_URL` desechable; la variable no estaba configurada en esta revisión.
