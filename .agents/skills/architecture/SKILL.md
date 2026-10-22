---
name: architecture
description: Diseña o revisa límites modulares, dependencias, ADRs y evolución arquitectónica; no usar para cambios locales sin impacto estructural.
---
# Arquitectura
## Objetivo
Mantener un monolito modular, transaccional y preparado para crecer sin infraestructura prematura.
## Cuándo utilizarla
Al crear módulos, cambiar límites o decidir persistencia, integración o despliegue.
## Archivos a consultar
`AGENTS.md`, `docs/architecture/overview.md`, ADRs y módulos afectados.
## Convenciones
Dependencias hacia servicios de aplicación; controladores traducen HTTP; servicios orquestan; el dominio conserva invariantes. Registrar ADRs para decisiones costosas de revertir.
## Procedimiento recomendado
Identificar fuerzas, comparar la opción mínima con alternativas, registrar consecuencias y mantener dependencias unidireccionales.
## Checklist de validación
- [ ] Responsabilidad y dueño del dato claros.
- [ ] Transacciones no cruzan operaciones de red largas.
- [ ] No se añadió distribución o multiempresa sin requisito.
- [ ] Diagramas/ADRs están actualizados.
## Errores comunes
Servicios gigantes, repositorios genéricos y abstracciones “por si acaso”.
## Referencias
https://docs.nestjs.com/providers
