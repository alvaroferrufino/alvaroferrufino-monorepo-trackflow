# AGENTS.md — Reglas Operativas para Agentes en el Monorepo de TrackFlow

Este repositorio aloja el monorepo de **TrackFlow Tech**, la unidad tecnológica interna de **TrackFlow** (operador logístico de última milla, gestión de almacenes y logística inversa fundado en 2009 en Los Ángeles, con operación transfronteriza y almacenes en **Los Ángeles, EE. UU.** y **Zaragoza, España**).

Todo agente de codificación o asistente de IA que trabaje en este repositorio debe cumplir estrictamente las reglas de lectura previa, ubicación de código, protección de archivos y verificación pre-commit definidas en este documento.

---

## 1. Lectura Obligatoria al Inicio de Cada Sesión

**Antes de proponer arquitectura, crear archivos o modificar cualquier línea de código**, el agente debe leer obligatoriamente y en este orden:

1. [`BRIEFING.md`](./BRIEFING.md) — Contexto oficial de negocio de **TrackFlow**: liderazgo (**Thomas Harry / Thomas Espinoza** como CEO en Los Ángeles y **Andrés Kim** como CTO en Zaragoza), mandato de **TrackFlow Tech**, los 8 departamentos operativos y sus problemas reales.
2. [`memory-bank/projectbrief.md`](./memory-bank/projectbrief.md) — Síntesis ejecutiva del dominio logístico binacional de TrackFlow (~130 empleados, ~9 M€ de facturación, 2 almacenes desconectados, 8 transportistas, 18–25% de devoluciones, soporte B2B/B2C, RR. HH. en dos marcos laborales y reporte manual dominical).
3. [`memory-bank/techContext.md`](./memory-bank/techContext.md) — Estado técnico heredado de TrackFlow, arquitectura objetivo del monorepo, convenciones de rutas y separación estricta entre código de producto y `./.agents/` o `./memory-bank/`.
4. [`memory-bank/progress.md`](./memory-bank/progress.md) — Estado del hito activo, entregables consolidados y siguientes pasos del roadmap de TrackFlow Tech.
5. **El `README.md` de la carpeta específica donde vaya a intervenir** (por ejemplo [`uis/README.md`](./uis/README.md), [`services/README.md`](./services/README.md), [`agents/README.md`](./agents/README.md), [`data/pipelines/README.md`](./data/pipelines/README.md), etc.), además de cualquier `AGENTS.md` local existente en dicho subproyecto (como [`uis/talent-pipeline-tracker/AGENTS.md`](./uis/talent-pipeline-tracker/AGENTS.md)).

> **Regla de dominio:** Prohibido usar nombres de empresas genéricas, ejemplos ficticios ajenos o placeholders de plantilla. Todo modelo, endpoint, interfaz, dataset sintético, prompt o test debe corresponder exclusivamente a **TrackFlow**.

---

## 2. Flujo Obligatorio Antes de Cada Commit

Ningún cambio puede darse por cerrado ni prepararse para commit sin completar **en orden** los siguientes pasos explícitos:

### Paso 1: Verificar alineación con `BRIEFING.md`, `./memory-bank/` y el `README.md` local
- Confirmar que la solución resuelve una necesidad real de TrackFlow descrita en [`BRIEFING.md`](./BRIEFING.md) y [`memory-bank/projectbrief.md`](./memory-bank/projectbrief.md), respetando las convenciones técnicas de [`memory-bank/techContext.md`](./memory-bank/techContext.md) y el propósito definido en el `README.md` de la carpeta modificada.
- Comprobar que cada nuevo servicio, agente, pipeline, skill o workflow incluye o actualiza su documentación local (`README.md` o `SKILL.md`) según exigen las guías del directorio.

### Paso 2: Validar que todos los cambios residan en las rutas permitidas del monorepo
- Verificar que los archivos creados o editados se ubiquen exclusivamente dentro de las rutas canónicas correspondientes a su responsabilidad:
  - `./uis/website`, `./uis/backoffice`, `./uis/talent-pipeline-tracker`
  - `./services`
  - `./agents`, `./skills`, `./mcps`
  - `./workflows`
  - `./data` (`raw/`, `pipelines/`, `process/`, `eval/`)
  - `./packages`, `./shared`
  - `./docs`, `./infra`, `./scripts`, `./internal`
  - `./memory-bank` (únicamente para contexto y seguimiento de sesiones) y `./.agents` (únicamente cuando se solicite ajustar reglas/skills del asistente de desarrollo).
- Confirmar que **no se han creado árboles paralelos** (como `./apps`, `./frontend`, `./backend` o `./api` en raíz), que **no se han volcado archivos de aplicación sueltos en la raíz**, y que **no se han duplicado aplicaciones ni microservicios** cuando la funcionalidad encaja en `./uis/backoffice` o en `./services/api/`.

### Paso 3: Actualizar `./memory-bank/` y auditar `git status` y `git diff`
- Actualizar [`memory-bank/progress.md`](./memory-bank/progress.md) reflejando el trabajo completado, el estado actual y los próximos pasos pendientes.
- Actualizar [`memory-bank/techContext.md`](./memory-bank/techContext.md) siempre que cambien decisiones de arquitectura, contratos de API, convenciones de rutas, dependencias relevantes o componentes desplegables.
- Ejecutar y revisar `git status` y `git diff` para asegurarse de que no queden artefactos temporales (`test-results/`, `playwright-report/`, cachés, binarios innecesarios), credenciales/secretos ni datos personales reales (PII).

### Paso 4: Ejecutar comprobaciones/tests del área tocada y verificar rutas restringidas
- Ejecutar los chequeos estáticos, linters, builds y suites de pruebas correspondientes únicamente a los módulos afectados (por ejemplo, `npm run typecheck` para código TypeScript raíz, tests unitarios/E2E con Playwright en `./uis/talent-pipeline-tracker`, `pytest`/linters en `./services` o `./agents`, o validaciones de esquemas/pipelines en `./data`).
- Confirmar explícitamente en el diff final que **ninguna carpeta ni archivo restringido** (Sección 3) ha sido modificado, renombrado o eliminado sin aprobación expresa del desarrollador.

---

## 3. Archivos y Carpetas Restringidos (Requieren Confirmación Explícita)

El agente **NO debe modificar, sobrescribir, mover ni eliminar** ninguno de los siguientes elementos sin solicitud o confirmación explícita previa del desarrollador:

1. **Documentos fundacionales del negocio en la raíz:**
   - [`BRIEFING.md`](./BRIEFING.md)
   - [`CONTEXT.md`](./CONTEXT.md)
   - [`CONTEXT.es.md`](./CONTEXT.es.md)
2. **Reglas base y documentación estructural del monorepo:**
   - [`AGENTS.md`](./AGENTS.md), [`README.md`](./README.md) y [`README.es.md`](./README.es.md) en la raíz.
   - Los archivos estructurales `README.md` y `README.es.md` de las carpetas base del monorepo (solo pueden ampliarse para registrar subproyectos añadidos cuando la tarea lo requiera, nunca eliminar sus reglas originales).
   - Reglas base de asistentes en `./.agents/` y bloques autogenerados por frameworks en `AGENTS.md` locales (como el bloque `nextjs-agent-rules` en [`uis/talent-pipeline-tracker/AGENTS.md`](./uis/talent-pipeline-tracker/AGENTS.md)).
   - Plantillas base [`./agents/_template/`](./agents/_template/README.md) y `./skills/_template/` (al crear nuevos agentes o skills se deben copiar a una subcarpeta nueva, nunca mutar la plantilla salvo instrucción expresa).
3. **Configuración global en la raíz y entorno de desarrollo:**
   - [`package.json`](./package.json) y [`package-lock.json`](./package-lock.json) de la raíz.
   - [`.gitignore`](./.gitignore) y [`.devcontainer/`](./.devcontainer) (incluyendo `.devcontainer/devcontainer.json`).
   - `docker-compose.yml` en la raíz (cambios estructurales de servicios globales o puertos) y cualquier archivo `.env*` o configuración de credenciales.
4. **Entregables cerrados de otros hitos fuera del alcance activo:**
   - No alterar [`./uis/talent-pipeline-tracker/`](./uis/talent-pipeline-tracker/README.md), `./src/` ni [`./index.html`](./index.html) cuando la tarea asignada pertenezca a otro dominio o carpeta del monorepo.

---

## 4. Mapa de Capas del Monorepo de TrackFlow

Cada pieza funcional debe ubicarse en su capa exacta respetando los `README.md` existentes. **No se deben crear carpetas vacías de aplicaciones futuras (como `./uis/website`, `./uis/backoffice` o `./services/api`) hasta el hito específico que implemente su código.**

| Capa | Ruta en el Monorepo | Qué vive aquí en TrackFlow | Guía de referencia |
| --- | --- | --- | --- |
| **Contexto de negocio** | `./BRIEFING.md`, `./CONTEXT.md`, `./CONTEXT.es.md` | Fuente única de verdad sobre TrackFlow, sus almacenes (Los Ángeles y Zaragoza), sus 8 transportistas y sus 8 áreas operativas. | [`README.md`](./README.md) |
| **Memoria y gobernanza de agentes (NO producto)** | `./memory-bank/`, `./.agents/`, `./AGENTS.md` | `./memory-bank/` guarda el contexto vivo entre sesiones (`projectbrief.md`, `techContext.md`, `progress.md`); `./.agents/` aloja exclusivamente configuración/skills del asistente de desarrollo en el IDE. Ninguna de las dos carpetas contiene código desplegable de TrackFlow. | [`memory-bank/techContext.md`](./memory-bank/techContext.md) |
| **Interfaces de usuario (Frontends)** | `./uis/` | Todas las aplicaciones con interfaz humana:<br>• `./uis/website`: web pública corporativa y portal público de seguimiento con entrada en `/` *(crear en su hito)*.<br>• `./uis/backoffice`: app interna unificada con layout administrativo propio y entrada en `/` para almacenes, última milla, devoluciones, tickets, comercial/CRM, Personas y dirección *(crear en su hito)*.<br>• `./uis/talent-pipeline-tracker`: app Next.js ya operativa para el pipeline de candidaturas de TrackFlow. | [`uis/README.md`](./uis/README.md)<br>[`uis/talent-pipeline-tracker/README.md`](./uis/talent-pipeline-tracker/README.md) |
| **Backend centralizado y workers** | `./services/` | Un único backend principal de compañía en **FastAPI** (`./services/api/` cuando se implemente) organizado por routers de dominio (inventario global por SKU, pedidos, selección y tracking de los 8 transportistas, logística inversa, tickets B2B/B2C, CRM, Personas, telemetría y KPIs ejecutivos). Extraer workers separados en `./services/` solo si es estrictamente necesario. | [`services/README.md`](./services/README.md) |
| **Datos, ETL/ELT y evaluación** | `./data/` | Flujo completo de datos:<br>• `./data/raw/`: volcados y muestras de origen sin transformar (sin PII real).<br>• `./data/pipelines/`: procesos ETL/ELT de ingesta, limpieza y consolidación entre EE. UU. y España.<br>• `./data/process/`: tablas limpias, agregados y artefactos listos para consumo por API, dashboards y agentes.<br>• `./data/eval/`: golden sets y métricas de evaluación para RAG, agentes y pipelines. | [`data/raw/README.md`](./data/raw/README.md)<br>[`data/pipelines/README.md`](./data/pipelines/README.md)<br>[`data/process/README.md`](./data/process/README.md)<br>[`data/eval/README.md`](./data/eval/README.md) |
| **Agentes de IA de producto** | `./agents/` | Agentes autónomos o semiautónomos del producto TrackFlow (soporte B2B/B2C 24/7, inspección visual de devoluciones, informes PDF comerciales, asistente de RR. HH., documentación técnica, asistente ejecutivo). Una subcarpeta por agente a partir de `./agents/_template/` y conectores compartidos en `./agents/tools/`. | [`agents/README.md`](./agents/README.md)<br>[`agents/_template/README.md`](./agents/_template/README.md)<br>[`agents/tools/README.md`](./agents/tools/README.md) |
| **Capacidades reutilizables de producto** | `./skills/` | Skills modulares (`SKILL.md` + scripts y recursos) consumidas por agentes y flujos del producto TrackFlow (análisis de datos, investigación, revisión, etc.). | [`skills/README.md`](./skills/README.md) |
| **Servidores MCP** | `./mcps/` | Servidores Model Context Protocol (una subcarpeta por servidor) para exponer herramientas y acceso controlado en vivo a bases de datos, inventario y APIs de los 8 transportistas. | [`mcps/README.md`](./mcps/README.md) |
| **Automatización y orquestación** | `./workflows/` | Flujos de n8n, webhooks y tareas programadas que conectan `./services/`, `./data/pipelines/` y `./agents/` (ingesta de pedidos por correo, recogida de devoluciones, alertas de stock/renovación, informe ejecutivo semanal cada lunes a las 07:00). | [`workflows/README.md`](./workflows/README.md) |
| **Librerías y recursos compartidos** | `./packages/`, `./shared/` | `./packages/` para código versionable compartido entre 2+ componentes (como `./packages/shared` / `@repo/shared-types`, clientes de API, SDKs); `./shared/` para activos ligeros no empaquetados (esquemas JSON, OpenAPI, plantillas PDF/email, tokens). | [`packages/README.md`](./packages/README.md)<br>[`shared/README.md`](./shared/README.md) |
| **Documentación transversal** | `./docs/` | Arquitectura global del sistema TrackFlow, diagramas, ADRs y guías de observabilidad, telemetría y seguridad transfronteriza (EE. UU. / España). | [`docs/README.md`](./docs/README.md) |
| **Infraestructura, scripts y tooling interno** | `./infra/`, `./scripts/`, `./internal/` | `./infra/` para Dockerfiles, Terraform, Nginx/K8s y CI/CD (con `docker-compose.yml` en la raíz para dev local); `./scripts/` para scripts puntuales y repetibles; `./internal/` para CLIs y herramientas internas estructuradas con dependencias y tests propios. | [`infra/README.md`](./infra/README.md)<br>[`scripts/README.md`](./scripts/README.md)<br>[`internal/README.md`](./internal/README.md) |

---

## 5. Guía Rápida de Decisión

- ¿Tiene pantallas o interacción visual para personas? → `./uis/` (`website` si es pública, `backoffice` si es operativa interna, `talent-pipeline-tracker` si es pipeline de candidaturas).
- ¿Expone endpoints HTTP o procesa lógica de servidor/colas? → `./services/` (priorizando módulos en `./services/api/` con FastAPI).
- ¿Es dato fuente, transformación ETL/ELT, tabla limpia o dataset de calidad? → `./data/raw/`, `./data/pipelines/`, `./data/process/` o `./data/eval/`.
- ¿Es un agente operativo de TrackFlow con objetivo propio? → `./agents/<nombre-agente>/` (copiando de `./agents/_template/`).
- ¿Es una capacidad reutilizable por agentes del producto? → `./skills/<nombre-skill>/`.
- ¿Es una regla o skill interna solo para el asistente que programa en este repo? → `./.agents/` (nunca en `./agents/` ni `./skills/`).
- ¿Conecta un modelo de IA con herramientas/APIs vivas mediante MCP? → `./mcps/<nombre-mcp>/`.
- ¿Orquesta eventos, cron jobs o flujos entre sistemas (n8n/webhooks)? → `./workflows/`.
- ¿Lo importan 2+ apps/servicios como código versionado? → `./packages/`. ¿Es un esquema/plantilla suelta? → `./shared/`.
- ¿Es memoria de sesión del proyecto para desarrolladores y agentes? → `./memory-bank/`.
