# TrackFlow — Project Brief

## 1. Visión General del Negocio

**TrackFlow** es un operador logístico integral (almacenamiento, preparación de pedidos, entrega de última milla y logística inversa) fundado en **2009 en Los Ángeles, Estados Unidos**. Opera de forma transfronteriza en **dos mercados — Estados Unidos y España —** con almacenes propios en **Los Ángeles** y **Zaragoza**, además de una oficina tecnológica en Zaragoza.

- **Plantilla:** ~130 empleados repartidos entre Estados Unidos y España.
- **Facturación anual:** ~9 M€.
- **Propuesta de valor:** Las marcas de e-commerce destacan diseñando y vendiendo productos, pero necesitan delegar la complejidad física de llevar cada pedido hasta la puerta del comprador. TrackFlow asume de extremo a extremo su cadena operativa: custodia de inventario por SKU, picking y empaquetado, expedición mediante una red de transportistas y gestión completa de devoluciones.
- **Complejidad operativa:** Operación ininterrumpida (24/7 de cara a marcas y destinatarios), dos husos horarios, dos idiomas (inglés y español), dos marcos regulatorios y laborales diferenciados, y sistemas heredados desconectados entre ambos países.

---

## 2. Liderazgo y Mandato de TrackFlow Tech

- **Dirección Ejecutiva (CEO y Fundador):** **Thomas Harry / Thomas Espinoza**, con sede en Los Ángeles (referenciado en la documentación fundacional como Thomas Harry y en la ficha de Dirección Ejecutiva como Thomas Espinoza). Dirige la estrategia global de la compañía entre EE. UU. y España.
- **Dirección de Tecnología (CTO):** **Andrés Kim**, con sede en la oficina tecnológica de Zaragoza, al frente de un equipo técnico de 7 personas (desarrolladores, ingenieros de datos y técnicos de sistemas).
- **Unidad TrackFlow Tech:** Unidad interna creada por la Dirección Ejecutiva con un mandato directo: diseñar y construir los sistemas unificados, las integraciones de datos y las automatizaciones con inteligencia artificial que eliminen los cuellos de botella manuales y permitan a TrackFlow escalar su operación binacional con rentabilidad, trazabilidad en tiempo real y menor tasa de error.

---

## 3. Áreas Operativas, Responsables y Problemas Clave

### 3.1 Operaciones de Almacén
- **Responsable:** Ana Whitfield (~70 operarios + 2 jefes de almacén en Los Ángeles y Zaragoza).
- **Situación actual y problemas:**
  - Los dos almacenes están completamente desconectados: uno opera con **software comercial** de gestión de almacenes y el otro con una **hoja de cálculo avanzada**.
  - No existe visibilidad global ni en tiempo real del inventario por SKU entre Los Ángeles y Zaragoza.
  - Los pedidos entrantes llegan por correo electrónico en formatos heterogéneos y se transcriben manualmente.
  - El picking en planta se realiza con listas impresas en papel, provocando discrepancias frecuentes de stock que se detectan tarde.
- **Necesidades clave:** API unificada de inventario en tiempo real por SKU y almacén, pipeline de ingesta automática de pedidos por correo, dashboard operativo de almacén y alertas automáticas de stock bajo para marcas cliente y compras.

### 3.2 Última Milla y Gestión de Transportistas
- **Responsable:** Carlos Vega (6 coordinadores logísticos).
- **Situación actual y problemas:**
  - Trabajo con **8 transportistas** en total: **UPS, FedEx y DHL** en Estados Unidos; **MRW, SEUR y DHL** en España, además de **dos transportistas locales**.
  - La asignación del transportista para cada expedición se decide de forma manual.
  - El seguimiento de envíos e incidencias (paquetes perdidos, entregas fallidas, direcciones erróneas) exige consultar manualmente, uno por uno, los portales de cada transportista.
  - No existen datos históricos estructurados de desempeño (entregas a tiempo, incidencias por ruta ni coste por kilo).
- **Necesidades clave:** Motor inteligente de selección de transportista con recomendaciones explicables según destino, peso y urgencia; endpoint unificado de seguimiento multi-transportista; portal público de tracking para destinatarios; y dashboard de rendimiento de transportistas.

### 3.3 Logística Inversa
- **Responsable:** Sofía Ramos (equipo de 5 personas).
- **Situación actual y problemas:**
  - Las devoluciones suponen entre el **18% y el 25% del volumen total** de envíos según la marca cliente y el país.
  - Toda la cadena de decisión de cada devolución (aprobar o rechazar, ordenar recogida o no, reacondicionar o desechar) pasa por revisión humana individual, sin reglas automáticas.
  - La inspección física del artículo devuelto es subjetiva e inconsistente entre operarios, y no hay analítica sobre qué productos se devuelven más ni por qué motivos.
- **Necesidades clave:** Motor de aprobación automática con reglas configurables por cliente, flujo automatizado de recogida (`aprobación → generación de etiqueta → programación con transportista`), inspección visual asistida por IA a partir de fotografías tomadas por el operario y dashboard de patrones de devoluciones.

### 3.4 Experiencia del Cliente (B2B y B2C)
- **Responsable:** Valentina Cruz (15 agentes repartidos entre Los Ángeles y Zaragoza).
- **Situación actual y problemas:**
  - Atención simultánea a **marcas cliente (B2B)** y **consumidores finales (B2C)** a través de correo electrónico, WhatsApp y teléfono.
  - Carecen de un **sistema de tickets unificado** y de una **base de conocimiento** estructurada (los agentes consultan un documento de Word alojado en Google Drive).
  - Alrededor del **80% de las consultas son repetitivas** (estado de pedido o devolución), pero todas se contestan manualmente y sin cobertura fuera del horario de oficina.
- **Necesidades clave:** Agente de primera línea 24/7 que resuelva automáticamente consultas de seguimiento y devoluciones, base de conocimiento semántica indexada para RAG (con enfoque bilingüe español/inglés partiendo de un idioma base), sistema de tickets unificado, dashboard en tiempo real y análisis de sentimiento para anticipar escalados.

### 3.5 Comercial y Relación con Clientes
- **Responsable:** Miguel Torres (4 account managers + 4 especialistas de desarrollo de negocio).
- **Situación actual y problemas:**
  - Gestión de contratos anuales de marcas cliente mediante hojas de cálculo personales y cadenas de correo, **sin CRM**.
  - Elaboración manual de reportes mensuales de rendimiento: cada account manager extrae datos de múltiples sistemas para maquetar y enviar un PDF por cliente.
  - Falta total de visibilidad preventiva sobre cuentas en riesgo de no renovación.
- **Necesidades clave:** Integración con CRM y perfiles de cliente unificados, generación automatizada de informes mensuales en PDF mediante agentes, dashboard de salud de cartera con puntuación de riesgo de renovación, alertas automáticas a 90 y 30 días del vencimiento contractual, y agente comercial orientador de servicios para prospectos.

### 3.6 Personas y Recursos Humanos
- **Responsable:** Rafael Sanz (equipo de 3 personas desde Zaragoza).
- **Situación actual y problemas:**
  - Gestión de contratación, onboarding corporativo y consultas laborales bajo **dos marcos laborales muy distintos (Estados Unidos y España)** sin plataforma de RR. HH., apoyándose en correos y PDFs de bienvenida distintos por país.
  - Incorporación corporativa (Tecnología, Comercial, Experiencia del Cliente y gestión operativa) sin estandarización ni verificación real de que la nueva persona comprenda la operativa de almacenes, transportistas y devoluciones.
  - Las altas de permisos y accesos internos tardan días por depender de peticiones manuales ad hoc.
  - Respuestas dispares sobre vacaciones, beneficios y políticas internas, y ausencia de métricas de plantilla, rotación o tiempo de contratación por país.
- **Necesidades clave:** Flujo estructurado de onboarding corporativo con seguimiento de avance y comprobaciones de comprensión, aprovisionamiento automatizado de accesos, portal interno de RR. HH. (vacaciones y políticas), cuadro de mando de Personas por país y agente interno de RR. HH. fundamentado en documentación oficial (con proyección bilingüe español/inglés).

### 3.7 Tecnología
- **Responsable:** Andrés Kim, CTO (equipo de 7 personas en Zaragoza).
- **Situación actual y problemas:**
  - Ecosistema fragmentado acumulado sin arquitectura previa: dos WMS dispares, un ERP de principios de los 2010, integraciones mediante scripts de Python punto a punto sin documentar y bases de datos repartidas en dos proveedores cloud distintos.
  - **Telemetría fragmentada / inexistente:** sin observabilidad ni logging centralizado; cuando cae un servicio o endpoint en Los Ángeles, el equipo en Zaragoza recibe el aviso por WhatsApp desde operaciones.
  - Ciclos de despliegue lentos (entre 1 y 2 semanas para poner en producción una funcionalidad nueva).
- **Necesidades clave:** Telemetría, logging y monitorización centralizados binacionales con alertas automáticas, pipeline de datos corporativo para alimentar todos los dashboards, agente de documentación técnica y automatización operativa (backups, health checks y gestión de incidencias).

### 3.8 Dirección Ejecutiva
- **Responsable:** Thomas Harry / Thomas Espinoza, CEO (Los Ángeles).
- **Situación actual y problemas:**
  - Toma de decisiones apoyada en un **reporte ejecutivo semanal preparado manualmente cada domingo por la noche** (entre 3 y 4 horas de trabajo manual por cada director de área).
  - Para el lunes a las 10:00, el informe consolidado ya arrastra datos con **uno o dos días de desfase** y carece de una vista comparativa homogénea entre Estados Unidos y España.
- **Necesidades clave:** Dashboard ejecutivo global en tiempo real (volumen de envíos, entregas a tiempo, costes operativos, tasa de devoluciones, CSAT), generación y entrega automática del informe semanal cada lunes a las 07:00, comparativas directas EE. UU. vs. España, alertas por umbrales críticos y asistente ejecutivo conversacional en lenguaje natural.

---

## 4. Documentos Fuente de Referencia

- Briefing corporativo oficial en raíz: [`BRIEFING.md`](../BRIEFING.md), [`CONTEXT.md`](../CONTEXT.md) y [`CONTEXT.es.md`](../CONTEXT.es.md).
- Contexto técnico y estructura del monorepo: [`techContext.md`](./techContext.md).
- Estado del hito actual y hoja de ruta: [`progress.md`](./progress.md).
