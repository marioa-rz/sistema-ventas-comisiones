---
name: github-workflow
description: Gestiona ramas, commits semánticos, PR, protección de main y GitHub Actions.
---
# Flujo GitHub
## Objetivo
Entregar cambios pequeños, revisables y verificados sin reescribir historia compartida.
## Cuándo utilizarla
Al iniciar/cerrar fase, modificar CI o preparar PR.
## Archivos a consultar
Estado/diff Git, workflows, plantilla PR y checks.
## Convenciones
Ramas `feat/*`, `fix/*`, `docs/*`, `chore/*`; commits semánticos; nunca force-push a `main`.
## Procedimiento recomendado
Inspeccionar diff, verificar fresco, separar commits, subir rama y abrir PR con riesgos/evidencia.
## Checklist de validación
- [ ] Sin secretos ni artefactos.
- [ ] CI local equivalente pasó.
- [ ] PR documenta migración/rollback.
- [ ] `main` exige checks/revisión cuando sea posible.
## Errores comunes
Commits masivos, afirmar PR sin URL o proteger main sin checks.
## Referencias
https://docs.github.com/actions
