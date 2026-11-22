---
name: trackflow-monorepo-conventions
description: Regla obligatoria de gobernanza del monorepo de TrackFlow Tech: lectura previa de contexto, ubicación exclusiva en rutas canónicas por hito, separación estricta respecto a ./.agents/ y coherencia absoluta con BRIEFING.md.
alwaysApply: true
globs:
  - "**/*"
  - "uis/**"
  - "services/**"
  - "agents/**"
  - "skills/**"
  - "workflows/**"
  - "data/**"
  - "mcps/**"
  - "packages/**"
  - "shared/**"
  - "docs/**"
  - "infra/**"
  - "scripts/**"
  - "internal/**"
---

# Regla de Desarrollo: Convenciones del Monorepo de TrackFlow

Esta regla gobierna el comportamiento de cualquier asistente de codificación o agente de desarrollo en el monorepo de **TrackFlow Tech**. Su cumplimiento es **obligatorio** antes de proponer arquitectura, generar código, crear directorios o modificar archivos existentes.

---

## 1. Alcance de Aplicación Explícito

- **Modo de activación global (`alwaysApply: true` — Aplica SIEMPRE):**
  Esta regla está activa en **todas las sesiones y tareas** dentro del repositorio, incluyendo planificación técnica, creación de nuevos módulos, refactorización, revisión de código, diseño de datos, prompts y automatizaciones.
- **Aplicación directa por patrones de rutas del monorepo:**
  Aplica de forma obligatoria al intervenir en cualquiera de las capas canónicas de producto y soporte de **TrackFlow**:
  - `./uis/**` (`./uis/website/**`, `./uis/backoffice/**`, `./uis/talent-pipeline-tracker/**`)
  - `./services/**` (`./services/api/**` y workers de segundo plano justificados)
  - `./agents/**` (agentes de IA del producto TrackFlow, `./agents/_template/**` y `./agents/tools/**`)
  - `./skills/**` (capacidades reutilizables del producto TrackFlow y `./skills/_template/**`)
  - `./workflows/**` (flujos de n8n, webhooks y tareas programadas)
  - `./data/**` (`./data/raw/**`, `./data/pipelines/**`, `./data/process/**`, `./data/eval/**`)
  - `./mcps/**`, `./packages/**`, `./shared/**`, `./docs/**`, `./infra/**`, `./scripts/**`, `./internal/**`
- **Frontera estricta entre tooling del asistente y código de producto:**
  - **`./.agents/`** (`./.agents/rules/`, `./.agents/skills/`) y **`./memory-bank/`** pertenecen **exclusivamente** a la gobernanza y memoria persistente del asistente de desarrollo en el IDE. **Jamás** deben contener código desplegable, endpoints, pipelines ni lógica operativa del negocio.
  - **`./agents/`** y **`./skills/`** en la raíz pertenecen **exclusivamente** al **código de producto de TrackFlow** (agentes operativos y capacidades modulares del sistema logístico). Nunca coloques reglas internas del editor o del asistente en `./agents/` ni en `./skills/`.

---

## 2. Lectura Obligatoria Antes de Crear o Modificar Archivos

Está **prohibido** crear directorios, añadir archivos o editar código sin haber leído previamente, en este orden:

1. **[`BRIEFING.md`](../../BRIEFING.md)** (junto con [`AGENTS.md`](../../AGENTS.md) en la raíz): fuente única de verdad oficial sobre el negocio de TrackFlow, su liderazgo, el mandato de **TrackFlow Tech** y los problemas reales de sus 8 departamentos.
2. **El banco de memoria en `./memory-bank/`:**
   - [`memory-bank/projectbrief.md`](../../memory-bank/projectbrief.md) — síntesis ejecutiva del dominio logístico binacional, responsables y cuellos de botella operativos.
   - [`memory-bank/techContext.md`](../../memory-bank/techContext.md) — baseline técnico heredado, arquitectura objetivo del monorepo y convenciones por capa.
   - [`memory-bank/progress.md`](../../memory-bank/progress.md) — hito activo, entregables cerrados y siguientes pasos del roadmap.
3. **El `README.md` de la carpeta específica afectada** antes de intervenir en ella (por ejemplo: [`uis/README.md`](../../uis/README.md), [`uis/talent-pipeline-tracker/README.md`](../../uis/talent-pipeline-tracker/README.md), [`services/README.md`](../../services/README.md), [`agents/README.md`](../../agents/README.md), [`skills/README.md`](../../skills/README.md), [`workflows/README.md`](../../workflows/README.md), [`data/pipelines/README.md`](../../data/pipelines/README.md), [`mcps/README.md`](../../mcps/README.md), [`packages/README.md`](../../packages/README.md), [`shared/README.md`](../../shared/README.md), [`docs/README.md`](../../docs/README.md), [`infra/README.md`](../../infra/README.md), [`scripts/README.md`](../../scripts/README.md) o [`internal/README.md`](../../internal/README.md)), así como cualquier `AGENTS.md` local existente (como [`uis/talent-pipeline-tracker/AGENTS.md`](../../uis/talent-pipeline-tracker/AGENTS.md)).

---

## 3. Ubicación Exclusiva en Rutas Canónicas y Disciplina por Hitos

Todo archivo nuevo o modificado debe residir únicamente en la ruta canónica que corresponda a su responsabilidad arquitectónica:

| Responsabilidad | Ruta Canónica Obligatoria | Restricciones Estructurales |
| --- | --- | --- |
| **Web pública corporativa y tracking B2C** | `./uis/website` | Entrada principal en `/`. **Crear únicamente en el hito que implemente la web pública.** |
| **Aplicación administrativa interna unificada** | `./uis/backoffice` | Layout administrativo propio y entrada en `/`. Concentra almacenes, última milla, devoluciones, tickets, comercial/CRM, Personas y dirección. **Crear solo en su hito**; no fragmentar en múltiples apps internas sueltas. |
| **Tracker de selección y candidaturas** | `./uis/talent-pipeline-tracker` | App Next.js existente (Hito 3). No modificar fuera de tareas explícitas sobre este entregable. |
| **Backend centralizado y workers** | `./services` | Priorizar **un único backend FastAPI** en `./services/api/` organizado por routers de dominio (`inventory`, `orders`, `carriers`, `tracking`, `returns`, `tickets`, `customers`, `people`, `telemetry`, `executive-kpis`). Extraer workers separados en `./services/` solo cuando sea estrictamente necesario. |
| **Datos, ETL/ELT y evaluación** | `./data/raw`, `./data/pipelines`, `./data/process`, `./data/eval` | Respetar el flujo `raw → pipelines → process` y medir calidad de RAG/agentes/pipelines en `eval`. Prohibido subir PII real. |
| **Agentes de IA de producto** | `./agents/<nombre-agente>` y `./agents/tools` | Copiar siempre desde [`./agents/_template/`](../../agents/_template/README.md) sin mutar la plantilla base; conectores compartidos en `./agents/tools/`. |
| **Skills reutilizables de producto** | `./skills/<nombre-skill>` | Cada capacidad de producto incluye su `SKILL.md` + scripts/recursos, partiendo de `./skills/_template/` sin alterar la plantilla. |
| **Servidores MCP** | `./mcps/<nombre-mcp>` | Un subdirectorio por servidor MCP para acceso controlado a datos vivos, inventario o APIs de transportistas. |
| **Automatización y orquestación** | `./workflows` | Flujos de n8n, webhooks y cron jobs que conectan `./services`, `./data/pipelines` y `./agents`. |
| **Código y activos compartidos** | `./packages`, `./shared` | `./packages` para paquetes versionables compartidos entre 2+ módulos (p. ej. `@repo/shared-types`); `./shared` para esquemas JSON, OpenAPI, plantillas PDF/email y tokens. |
| **Documentación, despliegue y utilidades** | `./docs`, `./infra`, `./scripts`, `./internal` | `docker-compose.yml` en la raíz solo cuando corresponda orquestar el stack local; Dockerfiles/CI/CD/cloud en `./infra`; scripts puntuales en `./scripts`; CLIs internas con tests propios en `./internal`. |

### Prohibiciones Estructurales Absolutas
- **No inventar árboles paralelos** en la raíz ni fuera de convención (prohibido crear `./apps`, `./frontend`, `./backend`, `./api`, `./web`, `./server`, `./common` o volcar código de aplicación suelto en la raíz).
- **No crear carpetas vacías ni esqueletos prematuros de aplicaciones fuera de su hito** (no pre-crear `./uis/website`, `./uis/backoffice` ni `./services/api` mientras el hito activo no requiera implementar su código).
- **No alterar archivos restringidos ni entregables cerrados** (`BRIEFING.md`, `CONTEXT.md`, `CONTEXT.es.md`, `AGENTS.md`, `README.md` / `README.es.md` estructurales, `./agents/_template/`, `./skills/_template/`, `package.json` raíz, `.gitignore`, `.devcontainer/`, `./src/`, `./index.html` o `./uis/talent-pipeline-tracker/`) sin instrucción o confirmación explícita del desarrollador.
- **Documentar cada incorporación:** todo nuevo servicio, agente, pipeline, skill o workflow creado en su hito debe incluir o actualizar su `README.md` (o `SKILL.md`) local y reflejarse al cierre en [`memory-bank/progress.md`](../../memory-bank/progress.md) (y en [`memory-bank/techContext.md`](../../memory-bank/techContext.md) si cambia arquitectura o contratos).

---

## 4. Coherencia Estricta con el Dominio de Negocio de TrackFlow (`BRIEFING.md`)

Todo esquema de datos, endpoint, interfaz, seed sintético, test, flujo o prompt debe reflejar **fiel y exclusivamente** la realidad operativa de **TrackFlow**:

### 4.1 Identidad, Escala y Restricciones Operativas Globales
- **Empresa:** **TrackFlow**, operador de logística de última milla, gestión de almacenes (custodia por SKU, picking y empaquetado) y logística inversa para marcas de e-commerce, fundado en **2009 en Los Ángeles, EE. UU.**
- **Operación binacional transfronteriza:** **Estados Unidos** y **España**, con **2 almacenes operativos** en **Los Ángeles** (`US-LAX`) y **Zaragoza** (`ES-ZAZ`), más la **oficina tecnológica en Zaragoza**. Implica operación **24/7**, dos husos horarios, dos idiomas (**inglés y español**), dos divisas (**USD y EUR**) y dos marcos regulatorios/laborales diferenciados (EE. UU. / España).
- **Dimensión actual:** **~130 empleados** en total y **~9 millones de euros** de facturación anual.
- **Doble tipología de usuarios externos:** marcas de e-commerce cliente (**B2B**, con contratos anuales) y destinatarios/compradores finales (**B2C**).
- **Red de transporte:** exactamente **8 transportistas** entre ambos países: **UPS, FedEx y DHL** en Estados Unidos; **MRW, SEUR y DHL** en España, además de **2 transportistas locales**.
- **Volumen de devoluciones:** la logística inversa representa entre el **18% y el 25%** del volumen total de envíos según marca cliente y país.
- **Mandato de TrackFlow Tech:** unidad tecnológica interna creada para sustituir el mosaico heredado (2 WMS desconectados —software comercial vs. hoja de cálculo avanzada—, ERP de principios de los 2010, scripts Python punto a punto sin documentar, bases de datos en dos proveedores cloud distintos, avisos de caídas por WhatsApp y despliegues de 1–2 semanas) por sistemas unificados, datos trazables en tiempo real y automatización con IA.

### 4.2 Departamentos, Responsables y Casos de Uso Reales
1. **Operaciones de Almacén — Ana Whitfield** (~70 operarios + 2 jefes de almacén en Los Ángeles y Zaragoza): inventario unificado en tiempo real por SKU y almacén, ingesta automática de pedidos recibidos por correo electrónico, sustitución del picking en papel, dashboard operativo y alertas de stock bajo.
2. **Última Milla y Gestión de Transportistas — Carlos Vega** (6 coordinadores logísticos): motor explicable de selección óptima entre los **8 transportistas** (por destino, peso y urgencia), seguimiento unificado multi-transportista, portal público de tracking B2C y métricas históricas de entregas a tiempo, incidencias por ruta y coste por kilo.
3. **Logística Inversa — Sofía Ramos** (equipo de 5 personas): aprobación automática configurable por cliente para el **18–25%** de devoluciones, flujo automatizado `aprobación → etiqueta → programación con transportista`, clasificación objetiva del estado del artículo por fotografía con IA y analítica de motivos/patrones de devolución.
4. **Experiencia del Cliente — Valentina Cruz** (15 agentes en Los Ángeles y Zaragoza): atención B2B y B2C 24/7, agente de primera línea para el ~80% de consultas repetitivas (seguimiento y devoluciones), base de conocimiento semántica RAG (sustituyendo el Word en Google Drive), sistema unificado de tickets (correo, WhatsApp, teléfono), dashboard en tiempo real y análisis de sentimiento.
5. **Comercial y Relación con Clientes — Miguel Torres** (4 account managers + 4 de desarrollo de negocio): CRM con perfiles unificados (sustituyendo hojas de cálculo personales), informes mensuales en PDF generados automáticamente por agente, dashboard de salud de cuentas con riesgo de renovación en contratos anuales, alertas a **90 y 30 días** y recomendación comercial a prospectos.
6. **Personas — Rafael Sanz** (equipo de 3 personas en Zaragoza): onboarding estructurado para el equipo corporativo con comprobaciones de comprensión sobre almacenes, transportistas y devoluciones; provisión automatizada de accesos internos; portal de RR. HH. y agente oficial de políticas bajo los dos marcos laborales (EE. UU. y España); e indicadores de plantilla, rotación y contratación por país.
7. **Tecnología — Andrés Kim (CTO)** (equipo de 7 personas en Zaragoza): telemetría, logging y monitorización centralizados binacionales con alertas automáticas (eliminando avisos por WhatsApp), pipeline corporativo de datos para todos los dashboards, agente de documentación técnica y automatización operativa (backups, health checks, incidencias).
8. **Dirección Ejecutiva — Thomas Harry / Thomas Espinoza (CEO y fundador en Los Ángeles)**: dashboard ejecutivo global en tiempo real con vistas comparativas EE. UU. vs. España (volumen, entregas a tiempo, costes, devoluciones, CSAT), informe semanal automático cada **lunes a las 07:00** (eliminando las 3–4 horas manuales de cada director los domingos por la noche y el desfase de 1–2 días) y asistente ejecutivo en lenguaje natural.

### Prohibiciones de Dominio
- **Cero placeholders o dominios ajenos:** prohibido utilizar empresas ficticias o de otros escenarios de plantilla (como *Brasaland*, *Nexova*, *Acme Corp*, etc.) o datos de ejemplo desconectados de la logística binacional de TrackFlow.
- **Privacidad y seguridad:** prohibido incluir credenciales, secretos o datos personales reales (PII) en código, semillas, tests o datasets; respetar siempre la doble jurisdicción EE. UU. / España.
