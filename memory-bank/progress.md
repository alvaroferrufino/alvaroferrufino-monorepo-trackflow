# TrackFlow — Progress & Roadmap

## 1. Estado Actual del Proyecto

- **Rama activa:** `feat/incident-analyzer`.
- **Hito en curso:** Revisión previa al commit de las fases 1 y 2 del Analizador de Incidencias de TrackFlow.

### 1.1 Logros Completados

- **Analizador de Incidencias, Fase 1 completada:** `packages/incident_analyzer/` comparte el esquema, la validación CSV, el cálculo de métricas y la exportación con la CLI `scripts/analyze.py`. La muestra sintética de 100 registros está en `scripts/incidents-TRACKFLOW.csv` y las reglas y resultados esperados están en `docs/INCIDENTS_SPEC.md`.
- **Analizador de Incidencias, Fase 2 completada:** la API FastAPI `services/api/` reutiliza el paquete compartido para analizar cargas CSV y descargar resultados asociados a identificadores independientes. La interfaz `uis/backoffice/` incorpora selección y arrastre de archivos, indicadores, errores, desgloses y descarga CSV. El cliente detecta la URL de la API en local, Codespaces y otros hosts; CORS admite el Codespace actual y orígenes explícitamente configurados.
- **Correcciones de revisión:** las filas truncadas se contabilizan como inválidas; cada pestaña descarga su propio análisis mediante `X-Analysis-ID`. Se mantienen hasta 100 resultados por proceso y se excluyen localmente los artefactos generados del staging ordinario.
- **Pendientes del analizador:** persistencia compartida para múltiples workers y autenticación del backoffice. Los resultados permanecen únicamente en la memoria del proceso.

1. **Unificación del contexto oficial de TrackFlow (sin placeholders):**
   - Incorporación de [`BRIEFING.md`](../BRIEFING.md) en la raíz con el documento completo de negocio, organización, liderazgo y problemáticas departamentales de TrackFlow.
   - Alineación íntegra de [`CONTEXT.md`](../CONTEXT.md) y [`CONTEXT.es.md`](../CONTEXT.es.md) con el briefing real de TrackFlow, eliminando cualquier texto genérico de plantilla.
2. **Inicialización del Memory Bank (`./memory-bank/`) y gobernanza raíz (`AGENTS.md`):**
   - [`projectbrief.md`](./projectbrief.md): contexto de negocio, liderazgo (Thomas Harry / Thomas Espinoza y Andrés Kim), mandato de **TrackFlow Tech** y diagnóstico detallado de las 8 áreas operativas.
   - [`techContext.md`](./techContext.md): radiografía de la deuda técnica actual de TrackFlow, convenciones de rutas del monorepo y separación explícita entre el código de producto y las carpetas de soporte al asistente (`./.agents/` y `./memory-bank/`).
   - [`progress.md`](./progress.md): registro del estado actual del repositorio y hoja de ruta técnica alineada con los hitos de TrackFlow Tech.
   - [`AGENTS.md`](../AGENTS.md): protocolo obligatorio de lectura al inicio de sesión, checklist ordenado de 4 pasos previos a cada commit, lista de archivos/carpetas restringidos y mapa de capas del monorepo sin pre-crear carpetas de aplicación vacías.
   - **Estructura `./.agents/` en la raíz (separada de `./agents/` y `./skills/` de producto):** creación de `./.agents/rules/` y `./.agents/skills/`, incorporando la regla base [`./.agents/rules/trackflow-monorepo-conventions.md`](../.agents/rules/trackflow-monorepo-conventions.md) con alcance explícito global y por patrones de rutas (`./uis/**`, `./services/**`, `./agents/**`, `./skills/**`, `./workflows/**`, etc.).
   - **Skill de desarrollo `create-trackflow-spec`:** creada en [`./.agents/skills/create-trackflow-spec/SKILL.md`](../.agents/skills/create-trackflow-spec/SKILL.md) (separada de `./skills/` de producto) para generar o actualizar la especificación técnica y funcional de módulos, endpoints, flujos o automatizaciones de un departamento de TrackFlow antes de implementarlos; define inputs, pasos, plantilla de spec, ruta de guardado (`./docs/specs/<area>-<slug>.md`, sin crear carpetas de aplicación prematuras) y criterios de aceptación verificables.
3. **Entregables previos ya operativos en el monorepo:**
   - **Estructura base del monorepo** creada y documentada (`uis/`, `services/`, `data/`, `agents/`, `skills/`, `mcps/`, `workflows/`, `packages/`, `shared/`, `docs/`, `infra/`, `scripts/`, `internal/`).
   - **Fundamentos de tipado y utilidades (Hito 2):** módulos TypeScript en `./src/` (`src/types/`, `src/utils/`), interfaz interactiva de validación en `./index.html` y verificación estática con `npm run typecheck`.
   - **Talent Pipeline Tracker (Hito 3 — `./uis/talent-pipeline-tracker`):** aplicación Next.js para el área de Personas / selección de TrackFlow con alta y edición profesional de candidaturas, validación de teléfono internacional E.164, control de duplicados por email, gestión de CV y adjuntos, almacenamiento local complementario en IndexedDB (`trackflow-candidates`) y **29 tests E2E en Playwright pasando al 100%**.

---

## 2. Qué Falta por Construir (Próximos Pasos del Roadmap de TrackFlow Tech)

Los siguientes hitos traducen directamente las necesidades de los ocho departamentos de TrackFlow a la arquitectura del monorepo:

### Fase 1 — Consolidación del Entorno de Agentes y Gobernanza

- Completar y validar el resto de reglas o skills internas del entorno de desarrollo en `./.agents/` (manteniéndolas estrictamente separadas de `./agents/` y `./skills/` de producto) y cerrar el merge de `feature/agent-memory-bank`.
- Mantener `./memory-bank/progress.md` y `./memory-bank/techContext.md` actualizados al cierre de cada rama funcional.

### Fase 2 — Interfaces Web Públicas e Internas (`./uis/`)

- **`./uis/website` (entrada en `/`):** construir la web corporativa pública de TrackFlow orientada a marcas de e-commerce e integrar el portal público de seguimiento de envíos para consumidores finales (B2C).
- **`./uis/backoffice` (layout propio y entrada en `/`):** ampliar la interfaz inicial del analizador con autenticación y navegación modular para alojar los paneles de Operaciones de Almacén, Última Milla, Logística Inversa, Experiencia del Cliente, Comercial/CRM, Personas y Dirección Ejecutiva.

### Fase 3 — Backend Centralizado (`./services/api/` en FastAPI) y Contratos Compartidos

- Ampliar `./services/api/` en **FastAPI** junto con `docker-compose.yml` en la raíz del repositorio y esquemas compartidos en `./packages/` y `./shared/`.
- Implementar los dominios prioritarios de negocio:
  - **Almacenes (`US-LAX` y `ES-ZAZ`):** API unificada de inventario en tiempo real por SKU y recepción estructurada de pedidos.
  - **Última Milla:** agregador de tracking de los **8 transportistas** (UPS, FedEx, DHL, MRW, SEUR y 2 locales) y motor de recomendación óptima por destino, peso y urgencia.
  - **Logística Inversa:** motor configurable de reglas para aprobación automática de devoluciones (18–25% del volumen).
  - **Soporte, Comercial y Personas:** API unificada de tickets B2B/B2C, fichas de salud de clientes con alertas de renovación (90/30 días), gestión de onboarding/vacaciones binacional y persistencia backend definitiva para `./uis/talent-pipeline-tracker`.

### Fase 4 — Datos, Pipelines y Telemetría Centralizada (`./data/` + Observabilidad)

- Sustituir la detección manual de fallos por WhatsApp mediante **telemetría, logging estructurado y monitorización centralizada** entre Los Ángeles y Zaragoza con alertas automáticas e indicadores de salud de servicios.
- Desarrollar pipelines ETL/ELT en `./data/pipelines/` (`raw/` → `pipelines/` → `process/`) para unificar datos de ambos almacenes, histórico de transportistas (entregas a tiempo, incidencias por ruta, coste/kg), motivos de devolución y KPIs globales para el dashboard ejecutivo en tiempo real.
- Establecer conjuntos de evaluación en `./data/eval/` para validar precisión de pipelines, búsquedas RAG y agentes.

### Fase 5 — RAG, Agentes de Producto y Servidores MCP (`./agents/`, `./skills/`, `./mcps/`)

- **Base de conocimiento semántica (RAG):** indexar políticas operativas de clientes, procedimientos logísticos y normativas internas de RR. HH. (EE. UU. y España), con soporte bilingüe español/inglés.
- **Agentes operativos de TrackFlow en `./agents/`:**
  - Agente de soporte de primera línea 24/7 para consultas repetitivas de tracking y devoluciones + detección de sentimiento negativo.
  - Sistema/agente de inspección visual de devoluciones por fotografía para clasificar el estado del producto de forma objetiva.
  - Agente comercial generador de informes mensuales en PDF para marcas cliente y recomendador de servicios a prospectos.
  - Agente interno de Personas/RR. HH. para onboarding corporativo (con comprobaciones de comprensión) y dudas sobre políticas laborales.
  - Agente de documentación técnica para catalogar integraciones y eliminar la opacidad de los scripts heredados.
  - Asistente conversacional en lenguaje natural para consultas estratégicas del CEO.
- **Servidores MCP en `./mcps/`:** exponer acceso seguro y auditable a inventario, envíos, devoluciones y métricas operativas para los agentes.

### Fase 6 — Automatización y Workflows Transversales (`./workflows/`)

- Implementar flujos automatizados (n8n, webhooks y tareas programadas) que conecten API, datos y agentes:
  - Ingesta e interpretación automática de pedidos recibidos por correo electrónico y alertas de stock bajo.
  - Flujo extremo a extremo de recogida de devoluciones (`aprobación → etiqueta → programación con transportista`).
  - Solicitud y provisión automatizada de accesos internos en nuevas incorporaciones.
  - Alertas proactivas de renovación de contratos anuales a 90 y 30 días y rutinas de operaciones TI (backups, health checks).
  - **Generación y envío automático del informe ejecutivo semanal cada lunes a las 07:00**, eliminando las 3–4 horas de consolidación manual de cada domingo por la noche.

- Propuesta de arquitectura de backend documentada en docs/ARCHITECTURE_PROPOSAL.md en la rama feat/backend-architecture-proposal.
