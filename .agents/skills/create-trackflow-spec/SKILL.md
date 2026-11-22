---
name: create-trackflow-spec
description: Genera o actualiza la especificación técnica y funcional de un módulo, endpoint, flujo o automatización para un departamento de TrackFlow antes de implementarlo. Úsala cuando se pida "especificar", "diseñar" o "documentar antes de construir" una funcionalidad de TrackFlow Tech.
---

# Skill de desarrollo: `create-trackflow-spec`

> **Ámbito:** skill interna del asistente de desarrollo en el IDE. Vive en `./.agents/skills/` y **no** forma parte del producto TrackFlow. Está estrictamente separada de `./skills/` (capacidades reutilizables de producto) y de `./agents/` (agentes de producto). Su cumplimiento complementa la regla [`trackflow-monorepo-conventions.md`](../../rules/trackflow-monorepo-conventions.md).

---

## 1. Objetivo único

Generar o actualizar la **especificación técnica y funcional** de un módulo, endpoint, flujo o automatización para un departamento de **TrackFlow**, **antes de su implementación**.

**Fuera de alcance (no hace esta skill):** escribir código de aplicación, crear carpetas de aplicación (`./uis/website`, `./uis/backoffice`, `./services/api/`, etc.), ni modificar archivos restringidos de [`AGENTS.md`](../../../AGENTS.md) §3.

---

## 2. Inputs

Solicita al desarrollador los que falten antes de redactar. Si alguno es ambiguo, pregunta; no lo inventes.

| Input | Obligatorio | Descripción / valores válidos |
| --- | --- | --- |
| **Departamento o área** | Sí | Uno de los 8 definidos en [`BRIEFING.md`](../../../BRIEFING.md): Operaciones de Almacén (Ana Whitfield), Última Milla y Gestión de Transportistas (Carlos Vega), Logística Inversa (Sofía Ramos), Experiencia del Cliente (Valentina Cruz), Comercial y Relación con Clientes (Miguel Torres), Personas (Rafael Sanz), Tecnología (Andrés Kim) o Dirección Ejecutiva (Thomas Harry / Thomas Espinoza). |
| **Ruta canónica de destino** | Sí | `./uis/website`, `./uis/backoffice`, `./uis/talent-pipeline-tracker`, `./services` (preferentemente `./services/api/`), `./agents/<nombre>`, `./skills/<nombre>`, `./mcps/<nombre>`, `./workflows`, `./data/{raw,pipelines,process,eval}`, `./packages`, `./shared`, `./infra`, `./scripts` o `./internal`. Ver mapa de capas en [`AGENTS.md`](../../../AGENTS.md) §4. |
| **Problema operativo a resolver** | Sí | Situación actual y dolor real descrito en `BRIEFING.md` / [`memory-bank/projectbrief.md`](../../../memory-bank/projectbrief.md) que justifica la funcionalidad. |
| **Dependencias de datos/sistemas existentes** | Sí | Sistemas heredados (WMS de Los Ángeles y de Zaragoza, ERP de principios de los 2010, scripts Python punto a punto, portales de los 8 transportistas, hojas de cálculo, correo), datos, otras specs o APIs de las que depende. Indicar "ninguna" si aplica. |
| **Spec existente a actualizar** | No | Ruta de la spec previa si se trata de una actualización. |

---

## 3. Pasos de ejecución

### Paso 1 — Lectura previa obligatoria
Leer, en este orden: [`BRIEFING.md`](../../../BRIEFING.md) → [`AGENTS.md`](../../../AGENTS.md) → [`memory-bank/projectbrief.md`](../../../memory-bank/projectbrief.md) → [`memory-bank/techContext.md`](../../../memory-bank/techContext.md) → [`memory-bank/progress.md`](../../../memory-bank/progress.md) → el `README.md` (y `AGENTS.md` local, si existe) de la carpeta de destino.

### Paso 2 — Validar el destino y el hito
- Confirmar que la ruta de destino es canónica y que la funcionalidad no está ya cubierta por `./uis/backoffice` o `./services/api/` (evitar apps o microservicios duplicados).
- Comprobar en `progress.md` si el hito correspondiente está activo. **La spec puede escribirse aunque la carpeta de código aún no exista**, pero **no se debe crear dicha carpeta** (ni `.gitkeep` ni esqueleto) en esta tarea.
- Buscar specs existentes en `./docs/specs/` del mismo ámbito para actualizar en lugar de duplicar.

### Paso 3 — Redactar la especificación
Usar la plantilla de la sección 4, con datos reales de TrackFlow únicamente (almacenes `US-LAX` y `ES-ZAZ`, los 8 transportistas, devoluciones del 18–25%, idiomas ES/EN, USD/EUR, marcos CCPA y RGPD). Prohibidos placeholders o empresas ajenas.

### Paso 4 — Guardar en la ruta exacta
- Ruta: **`./docs/specs/<area>-<slug>.md`** (kebab-case; `<area>` ∈ `warehouse`, `last-mile`, `reverse-logistics`, `customer-experience`, `commercial`, `people`, `technology`, `executive`). Ejemplo: `./docs/specs/last-mile-carrier-selection-engine.md`.
- `./docs/` es documentación transversal existente; `./docs/specs/` es el único subdirectorio que esta skill puede crear. Si es la primera spec y se crea `./docs/specs/`, añadir una línea de enlace en [`docs/README.md`](../../../docs/README.md) y en `docs/README.es.md` (ampliar, sin eliminar contenido).
- No guardar specs dentro de `./uis/`, `./services/`, `./agents/`, `./skills/`, la raíz ni `./.agents/`.
- Si la tarea introduce o cambia convenciones de arquitectura o contratos de API, reflejarlo en `memory-bank/techContext.md`.

### Paso 5 — Registrar y auditar
- Actualizar [`memory-bank/progress.md`](../../../memory-bank/progress.md) con la spec creada/actualizada y el siguiente paso de implementación.
- Ejecutar `git status` y `git diff`; verificar que solo cambian la spec, `docs/README*.md` (si procede) y `memory-bank/`.
- Verificar los criterios de aceptación de la sección 5.

---

## 4. Estructura de la especificación

Cabecera obligatoria:

```markdown
# Spec: <título> — <departamento>

- **Departamento / responsable:** <área y responsable según BRIEFING.md>
- **Ruta canónica de implementación:** <ruta>
- **Estado:** Borrador | Aprobada | Implementada
- **Última actualización:** <AAAA-MM-DD>
```

Secciones, en este orden:

1. **Contexto y problema operativo** — dolor real citado de `BRIEFING.md` (con cifras reales: ~70 operarios, 6 coordinadores, 18–25% de devoluciones, 15 agentes, informe de los lunes a las 07:00, etc.) y resultado esperado.
2. **Alcance** — *Incluye* / *No incluye* (explícito) y hito del roadmap de `progress.md` al que pertenece.
3. **Usuarios y escenarios** — roles reales (operarios, coordinadores, agentes de soporte, account managers, RR. HH., CTO, CEO, marcas B2B, destinatarios B2C) y 2–5 escenarios de uso con datos de TrackFlow.
4. **Entradas y salidas** — para endpoints: método, ruta, esquema de petición/respuesta, errores y códigos; para flujos/automatizaciones: disparador, entradas, salidas, frecuencia (p. ej. cron `lunes 07:00`); para UIs: pantallas, estados y datos mostrados.
5. **Diseño técnico y funcional** — componentes y ubicación exacta de cada uno en el monorepo, reglas de negocio (configurables por cliente cuando aplique), flujo paso a paso y contratos compartidos (`./packages` o `./shared`).
6. **Datos e integraciones** — entidades y campos, origen (`data/raw` → `data/pipelines` → `data/process`), sistemas y transportistas afectados, identificadores (`US-LAX`, `ES-ZAZ`, SKU), idiomas ES/EN y monedas USD/EUR.
7. **Riesgos y restricciones de TrackFlow** — sistemas heredados desconectados, operación 24/7 y dos husos horarios, CCPA/RGPD y PII (prohibido PII real en `data/raw/` y `data/eval/`), dos marcos laborales (Personas), observabilidad requerida (logs estructurados/métricas, sin depender de avisos por WhatsApp) y mitigaciones.
8. **Plan de verificación** — tests/validaciones previstos por área (`pytest` en `./services` o `./agents`, Playwright en UIs, validación de esquemas en `./data`), datos sintéticos sin PII y métricas de éxito medibles.
9. **Dependencias y siguientes pasos** — specs/hitos previos, bloqueos y orden de implementación.
10. **Preguntas abiertas** — decisiones pendientes con responsable (omitir la sección si no hay).

---

## 5. Criterios de aceptación verificables

La spec solo se considera completa cuando **todas** estas condiciones son comprobables:

- [ ] **Alineación con `BRIEFING.md`:** el departamento, responsable, problema y cifras citados coinciden con `BRIEFING.md` y `memory-bank/projectbrief.md`; no hay empresas, datos ni ejemplos ajenos a TrackFlow.
- [ ] **Coherencia de dominio:** solo aparecen los 8 transportistas reales, los almacenes Los Ángeles (`US-LAX`) y Zaragoza (`ES-ZAZ`), el rango de devoluciones 18–25% y la unidad **TrackFlow Tech**, cuando son relevantes.
- [ ] **Cumple `AGENTS.md` y `memory-bank/`:** respeta las secciones 1–4 de `AGENTS.md` y las convenciones de `memory-bank/techContext.md`; no modifica archivos restringidos (`AGENTS.md` §3) salvo ampliar `docs/README*.md` según el Paso 4.
- [ ] **Ruta canónica sin duplicados:** la ruta de implementación declarada pertenece al mapa de `AGENTS.md` §4; una búsqueda en `./docs/specs/` no muestra una spec previa del mismo alcance; no se proponen `./apps`, `./frontend`, `./backend`, `./api` ni apps o microservicios duplicados.
- [ ] **Sin carpetas prematuras:** `git status` no muestra directorios nuevos de aplicación (`./uis/website`, `./uis/backoffice`, `./services/api/`, `./agents/<x>`, etc.); el único directorio nuevo posible es `./docs/specs/`.
- [ ] **Respeto al `README.md` de la carpeta destino:** la spec cita ese README y su diseño no contradice su propósito ni sus convenciones.
- [ ] **Ubicación y nombre:** el archivo está en `./docs/specs/<area>-<slug>.md`, en kebab-case, y contiene todas las secciones de la sección 4 (con "No aplica" justificado donde corresponda).
- [ ] **Verificabilidad:** cada requisito funcional tiene una verificación o métrica asociada en el plan de verificación.
- [ ] **Seguridad y privacidad:** no hay credenciales, secretos ni PII real en la spec.
- [ ] **Memoria actualizada:** `memory-bank/progress.md` registra la spec y el siguiente paso; `techContext.md` se actualiza si cambian arquitectura o contratos.
- [ ] **Separación del tooling:** nada de esta skill ni de sus resultados se ha colocado en `./skills/` o `./agents/`, y no hay lógica de negocio desplegable en `./.agents/`.
