# Propuesta de Arquitectura de Backend — TrackFlow

**Autor:** Unidad TrackFlow Tech  
**Destinatario:** Andrés Kim (CTO) y equipo de Ingeniería  
**Alcance:** Propuesta arquitectónica previa a la implementación de servicios backend (sin código funcional en este hito)

---

## 1. Patrón Arquitectónico Propuesto y Justificación

### Redacción técnica

Se propone una **Arquitectura en Capas modularizada por dominios de negocio, complementada con principios de Arquitectura Hexagonal (Puertos y Adaptadores) en las fronteras de integración externa**:

1. **Capa de Presentación / Transporte HTTP (`routers` y esquemas Pydantic):** expone los endpoints REST/JSON, valida contratos de entrada y salida mediante modelos Pydantic y traduce excepciones de dominio a códigos de estado HTTP semánticos (`200`, `201`, `404`, `422`), delegando toda la lógica a la capa de aplicación/negocio.
2. **Capa de Lógica de Negocio / Servicios (`services`):** concentra las reglas operativas, políticas y flujos de TrackFlow —tales como la selección de transportista por destino, peso y urgencia, la aprobación automática de devoluciones o el cálculo de indicadores— sin depender de detalles HTTP ni de clientes de transporte específicos.
3. **Capa de Persistencia e Integración (`repositories` y `adapters`):** encapsula el acceso a datos y la comunicación con sistemas heterogéneos mediante **puertos** (interfaces/contratos de dominio) y **adaptadores** (implementaciones concretas para almacenes de Los Ángeles y Zaragoza, los 8 transportistas como UPS, FedEx, DHL, MRW y SEUR, o el ERP heredado).

**Justificación frente a alternativas:**

- **Frente a MVC tradicional:** el patrón MVC resulta adecuado para aplicaciones monolíticas donde la vista se acopla estrechamente al modelo, pero tiende a generar acoplamiento y enredo en APIs consumidas por múltiples frontends (`website`, `backoffice`) y agentes.
- **Frente a Serverless puro:** la ejecución basada en eventos sin gestión de servidores aporta elasticidad en picos variables o tareas puntuales, pero introduce _cold starts_, dependencia de proveedor (_vendor lock-in_) y mayor fricción en flujos con estado o procesos de larga duración.
- **Frente a Hexagonal estricto en todos los módulos:** aplicar puertos y adaptadores pesados en operaciones CRUD simples añade complejidad innecesaria; restringirlos a integraciones externas y fronteras críticas ofrece desacoplamiento con un coste cognitivo proporcionado al equipo.

### Explicación sencilla

Piensa en la arquitectura del backend como una cocina profesional dividida en estaciones con tareas claras:

- Una estación **recibe los pedidos y revisa que vengan completos** (las rutas de la API y validaciones con Pydantic).
- Otra estación **aplica las recetas y reglas del negocio** (qué transportista elegir según peso, destino y urgencia, o cuándo aprobar una devolución automáticamente).
- Otra estación **habla con la despensa y con los proveedores externos** (bases de datos, sistemas de almacén de Los Ángeles y Zaragoza, y los 8 transportistas) usando **enchufes estándar (puertos)** y **adaptadores** para cada sistema.

¿Por qué así y no solo con MVC o Serverless? Porque MVC suele mezclar demasiado las cosas cuando el sistema crece y hay varios frontends, y Serverless puro puede tener arranques lentos (_cold starts_), atarte a un proveedor de nube y complicar flujos con estado. Usar capas + adaptadores en las conexiones externas da orden sin complicar de más lo sencillo.

---

## 2. Estructura de Carpetas y Módulos del Backend

### Redacción técnica

Siguiendo la estructura canónica del monorepo —donde los servicios backend residen bajo `./services` y las interfaces de usuario bajo `./uis` (`./uis/website` y `./uis/backoffice`) sin crear árboles paralelos— y las convenciones de paquetes Python (`__init__.py` limpios, importaciones absolutas preferentes, orden de imports según PEP 8 y gestión reproducible mediante `uv` con `pyproject.toml` y `uv.lock`, excluyendo `.venv/`), se propone organizar el servicio principal de backend en `./services/trackflow-api` con separación por dominio y responsabilidad:

```text
services/
└── trackflow-api/
    ├── pyproject.toml
    ├── uv.lock
    ├── .python-version
    └── src/
        └── trackflow_api/
            ├── __init__.py
            ├── main.py                  # Punto de entrada FastAPI (instancia app, middleware, registro de routers)
            ├── core/                    # Configuración de entorno, logging/telemetría, seguridad y manejo de errores
            │   ├── __init__.py
            │   ├── config.py
            │   └── exceptions.py
            ├── domains/                 # Dominios funcionales alineados con el briefing de TrackFlow
            │   ├── inventory/           # Inventario unificado LA/Zaragoza e ingesta de pedidos
            │   │   ├── __init__.py
            │   │   ├── router.py
            │   │   ├── schemas.py
            │   │   ├── service.py
            │   │   └── adapters.py
            │   ├── carriers/            # Motor de selección y seguimiento unificado de 8 transportistas
            │   │   ├── __init__.py
            │   │   ├── router.py
            │   │   ├── schemas.py
            │   │   ├── service.py
            │   │   └── adapters.py
            │   ├── returns/             # Aprobación automática, recogida e inspección asistida
            │   │   ├── __init__.py
            │   │   ├── router.py
            │   │   ├── schemas.py
            │   │   ├── service.py
            │   │   └── adapters.py
            │   └── customer_experience/ # Consultas B2B/B2C, tickets y base de conocimiento
            │       ├── __init__.py
            │       ├── router.py
            │       ├── schemas.py
            │       └── service.py
            └── shared/                  # Contratos comunes o utilidades transversales sin lógica de dominio acoplada
                ├── __init__.py
                └── types.py

Los dominios adicionales descritos en el briefing (commercial, people, tech, executive) se incorporan bajo domains/ conforme se aborden en los próximos sprints, manteniendo cada archivo enfocado y evitando archivos __init__.py con lógica pesada o ciclos de importación.

Explicación sencilla
En lugar de meter todos los archivos revueltos o por tipo de archivo en carpetas gigantes, ordenamos el backend por áreas reales de TrackFlow (inventory, carriers, returns, customer_experience) y, dentro de cada área, separamos qué hace cada archivo (router.py para rutas, schemas.py para validar datos con Pydantic, service.py para las reglas del negocio y adapters.py para hablar con sistemas externos).

Además:

Todo vive dentro de la carpeta backend del monorepo (./services), respetando las reglas del proyecto y sin inventar carpetas paralelas.

Mantenemos los archivos __init__.py ligeros y ordenamos bien las importaciones para evitar importaciones circulares.

Gestionamos las dependencias con uv (pyproject.toml y uv.lock) y dejamos .venv/ fuera de Git, para que cualquier compañero pueda levantar el entorno igual.

3. Organización de Endpoints y Routers en FastAPI
Redacción técnica
En FastAPI, la aplicación instanciada en main.py actúa como punto de entrada único y compone los distintos módulos mediante app.include_router(...):

Agrupación por dominio con APIRouter: cada dominio define su propio APIRouter con prefijo, etiquetas (tags) para la documentación automática y dependencias específicas del dominio.

Diseño REST orientado a recursos: las rutas utilizan sustantivos plurales que representan recursos (por ejemplo, /api/v1/inventory, /api/v1/carriers/recommendations, /api/v1/shipments/{shipment_id}, /api/v1/returns, /api/v1/tickets), evitando verbos en la URL (/getShipments) o endpoints multifunción (/api?action=...).

Semántica HTTP y validación declarativa: se emplean los verbos HTTP acordes a cada operación (GET, POST, PATCH, DELETE), parámetros de ruta tipados para identificadores, query parameters para filtros/paginación, modelos Pydantic para validar payloads y serializar respuestas, y HTTPException con códigos de estado apropiados (200, 201, 404, 422).

Explicación sencilla
En FastAPI, en vez de amontonar todas las URLs en main.py, cada módulo tiene su propio grupo de rutas con APIRouter y luego se conecta a la aplicación principal.

Las reglas clave para que la API sea clara y fácil de usar:

Usar nombres de recursos en plural (como /shipments o /returns) y el método HTTP correcto (GET para leer, POST para crear, PATCH para actualizar), en vez de escribir acciones en la ruta o hacer un endpoint comodín con ?action=.

Usar parámetros de ruta para un registro concreto (como /shipments/{shipment_id}) y parámetros de consulta (query params) para filtrar (como filtrar por país o estado).

Dejar que Pydantic valide los datos que llegan y los que salen, y devolver códigos HTTP claros (como 404 si no existe o 422 si los datos vienen mal) en lugar de devolver siempre 200 con mensajes de error escondidos.

4. Coexistencia Frontend y Backend en el Monorepo
Redacción técnica
El backend y los frontends del monorepo (./uis/website para la web pública/seguimiento y ./uis/backoffice para la aplicación interna) operan como sistemas desacoplados comunicándose vía API HTTP/JSON sobre contratos explícitos:

Comunicación por API y contratos: los frontends consumen los endpoints del backend sin acceder directamente a bases de datos ni a sistemas internos de almacén o transportistas.

Variables de entorno: cada componente obtiene su configuración desde variables de entorno (URL base de la API en el frontend; credenciales, cadenas de conexión, claves de API externas y parámetros de entorno en el backend), evitando secretos o rutas de entorno codificadas en el código fuente.

Configuración de CORS: dado que los orígenes de desarrollo y despliegue de los frontends pueden diferir del origen donde se sirve la API FastAPI, se configura CORSMiddleware declarando explícitamente los orígenes permitidos (allow_origins), métodos y cabeceras por entorno, evitando comodines abiertos (*) cuando existan credenciales o sesiones.

Explicación sencilla
El frontend (la web pública/seguimiento y el panel interno) y el backend son piezas separadas que conversan enviándose mensajes JSON por HTTP. El frontend no toca la base de datos ni habla directo con los transportistas: le pide lo que necesita al backend.

Dos cosas son indispensables para que esa conversación funcione bien:

Variables de entorno: guardar ahí las URLs, claves y ajustes de cada entorno (local, pruebas, producción) en vez de escribirlos fijos dentro del código.

CORS: configurar en FastAPI qué direcciones web tienen permiso para llamar a la API desde el navegador, para que no fallen las peticiones entre frontend y backend ni quede el acceso abierto a cualquiera sin control.

5. Riesgos y Puntos de Atención
Redacción técnica
Filtrado de lógica de negocio o acceso a datos hacia los routers: colocar consultas o reglas operativas en los endpoints acopla la capa HTTP a la persistencia y dificulta las pruebas unitarias y los cambios de esquema.

Acoplamiento directo a transportistas, WMS o ERP heredado: invocar APIs externas o sistemas de almacén directamente desde los servicios sin puertos/adaptadores propaga cambios externos y diferencias entre Los Ángeles y Zaragoza hacia todo el dominio.

Importaciones circulares, __init__.py sobrecargados o entornos no reproducibles: los ciclos entre módulos provocan ImportError o cargas parciales, la lógica en __init__.py oculta responsabilidades, y mezclar pip install fuera de uv o no versionar uv.lock rompe la reproducibilidad entre máquinas.

Desalineación de CORS, variables de entorno o reglas regionales (EE. UU. vs. España): orígenes mal configurados en CORS bloquean los clientes web, mientras que variables de entorno inconsistentes pueden mezclar configuraciones, monedas o zonas horarias entre ambos mercados.

Explicación sencilla
Si el equipo no respeta estas bases, pueden aparecer problemas típicos muy molestos:

Meter lógica o consultas dentro de las rutas: se vuelve un lío mantenerlo, cuesta probarlo y cambiar un dato obliga a tocar muchas rutas.

Hablar directo con cada transportista o almacén sin adaptadores: si un transportista cambia su conexión o hay ajustes distintos entre Los Ángeles y Zaragoza, se rompen las reglas del negocio.

Enredos con imports o entornos: importaciones circulares que fallan al arrancar, archivos __init__.py cargados de código o el clásico "en mi máquina sí funciona" si no se mantiene uv.lock al día con uv.

Fallos de CORS o variables de entorno: el navegador bloquea las llamadas del frontend o se mezclan ajustes de un entorno/país con otro.
```
