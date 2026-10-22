---
name: authentication-security
description: Implementa JWT de Supabase, RBAC, usuarios desactivados, propiedad, rate limiting y controles OWASP.
---
# Autenticación y seguridad
## Objetivo
Autenticar criptográficamente y autorizar con datos controlados por servidor.
## Cuándo utilizarla
En guards, endpoints sensibles/públicos, comprobantes o usuarios.
## Archivos a consultar
Módulos `auth`/`users`, `app_users` y arquitectura de seguridad.
## Convenciones
Verificar JWKS, `iss`, `aud`, expiración; resolver rol/actividad por `sub`; vendedor desde sesión; código de pedido no autentica.
## Procedimiento recomendado
Escribir primero pruebas de denegación, implementar mínimo privilegio y excluir secretos/PII de logs.
## Checklist de validación
- [ ] JWT inválidos rechazados.
- [ ] Rol, actividad y propiedad comprobados.
- [ ] Enumeración limitada y auditada.
## Errores comunes
Confiar en `user_metadata`, aceptar sellerId, URLs públicas o registrar tokens.
## Referencias
https://supabase.com/docs/guides/auth/jwts
