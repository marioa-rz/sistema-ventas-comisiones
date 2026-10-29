# Auditoría de skills y herramientas de agente

Fecha de evaluación: 2026-10-28.

## Objetivo

Mantener un flujo de trabajo fiable para NestJS, Prisma, PostgreSQL/Supabase y Next.js sin cargar cada tarea con procesos, modelos, servicios o contexto que no aportan evidencia.

## Línea base local

El proyecto ya dispone de diez skills de dominio: arquitectura, base de datos, NestJS, Supabase, autenticación/seguridad, reglas comerciales, pruebas, GitHub, despliegue e integración frontend. Son pequeñas, específicas y preservan las invariantes financieras del repositorio.

Codex también dispone de skills globales para TDD, depuración sistemática, solicitud de revisión y verificación antes de afirmar resultados. Estas cubren la parte más valiosa de Superpowers; duplicarlas dentro del repositorio aumentaría ambigüedad de activación sin añadir una capacidad nueva.

Herramientas útiles ya disponibles:

- Shell y `rg` para inspección dirigida; `apply_patch` para cambios controlados.
- Vitest, ESLint, TypeScript, builds de workspaces y Prisma para evidencia local.
- PostgreSQL aislado mediante `TEST_DATABASE_URL` para integración destructiva.
- Postman CLI para trabajo explícito de contratos, colecciones o validación API.
- Herramientas de navegador y GitHub cuando la tarea exige evidencia de runtime o PR.

## Evaluación externa

Las revisiones se hicieron sobre copias temporales superficiales y estos commits:

| Repositorio | Commit evaluado | Decisión | Motivo |
| --- | --- | --- | --- |
| [Gentleman-Programming/gentle-ai](https://github.com/Gentleman-Programming/gentle-ai) | `a6e371b502a24a0a0f57e8d75730150416c0d3f3` | Adaptar conceptos, no instalar la plataforma | Su trabajo proporcional, cambio recuperable y delegación con causa reducen coste. El binario completo añade configuración global, memoria, revisión persistente y adaptadores que solapan con Codex. |
| [obra/superpowers](https://github.com/obra/superpowers) | `2ce8aa15d05bd57213e6f746f953aafb7ded7a8b` | Conservar las skills globales existentes; no duplicar | TDD, depuración, revisión y verificación ya están instaladas. El flujo completo exige brainstorming/planes/subagentes de forma demasiado amplia para cambios pequeños y para el enrutamiento selectivo de este proyecto. |
| [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) | `09c434ab73ca43761c5d8b0c5d341926c2fba710` | Adaptar el núcleo | “El cambio completo más pequeño”, reutilización antes de dependencias y YAGNI encajan. Se integraron sin el modo persistente ni los comandos auxiliares para evitar un activador global en cada tarea. |
| [cheaper-inference/OmniRoute](https://github.com/cheaper-inference/OmniRoute) | `15178caa034e5c23d919783776a8a7b8a82b9f52` | No instalar | Es una plataforma de proxy/enrutamiento de inferencia con proveedores, claves, servidor y estado propios. No controla el modelo ni la facturación de esta sesión de Codex y aumentaría superficie de secretos, red y mantenimiento. Reconsiderar solo para una tarea explícita de infraestructura de inferencia. |
| [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify) | `0a8cd4e1e342235fe53e881fb5d591bf0460071f` | No instalar por ahora | El grafo local puede ahorrar relectura en corpus grandes, pero este repositorio aún se inspecciona eficazmente con `rg` y lectura dirigida. Su conjunto base de parsers Python no se justifica hasta que búsquedas repetidas o análisis transversales demuestren el cuello de botella. |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | `aeac41d4d005999432bb7312f7ff06383a91d59d` | Adaptar planificación, fuentes y simplicidad | Aporta buenas listas de comprobación, pero muchas skills solapan con las diez locales y tienen activadores amplios. Se incorporaron solo reglas que cambian decisiones; no se importó el catálogo entero. |

## Integración aplicada

Se añadió `efficient-delivery` como capa transversal y se mantuvieron las skills de dominio como fuente de reglas específicas. El enrutamiento queda así:

1. La solicitud y `AGENTS.md` fijan alcance y permisos.
2. `efficient-delivery` decide el cambio mínimo, el coste de herramientas y la profundidad de comprobación cuando hay implementación sustancial o riesgo.
3. Solo se cargan las skills de dominio afectadas.
4. TDD, depuración o revisión global se activan por su evento concreto, no en todas las conversaciones.
5. La verificación final usa comandos del repositorio y reporta límites reales.

## Umbrales de reevaluación

- Evaluar Graphify si una tarea requiere repetidamente mapear relaciones entre muchos módulos/documentos y `rg` más lectura dirigida consume varias rondas sin resolverlas.
- Evaluar OmniRoute únicamente si el equipo decide operar su propio gateway multi-proveedor y acepta gestionar secretos, disponibilidad, auditoría y presupuesto.
- Actualizar skills externas solo tras revisar cambios de licencia, activadores, scripts y compatibilidad; no seguir `main` automáticamente.
- Retirar o estrechar una skill si activa trabajo no solicitado, duplica otra fuente o su coste supera la evidencia que produce.

## Procedencia

Conceptos adaptados de repositorios con licencias permisivas (MIT o Apache-2.0). No se incorporaron binarios, dependencias, servicios ni código fuente de esos proyectos.
