# Analizador de incidencias de TrackFlow: Fase 1

La herramienta analiza incidencias sintéticas de atención al cliente, almacén, transportistas y devoluciones en Los Ángeles y Zaragoza. El paquete compartido no depende de la CLI y puede utilizarse desde la futura API FastAPI. No se crea ninguna API en esta fase.

## Entrada

CSV UTF-8 (se admite BOM), con cabecera exacta y en este orden:

`incident_id,created_at,warehouse,carrier,customer_type,category,status,satisfaction_score,description`

Se eliminan los espacios al principio y al final de cada campo. Los valores son sensibles a mayúsculas y minúsculas. Son obligatorios `incident_id`, `created_at`, `warehouse`, `customer_type`, `category` y `status`; `carrier`, `satisfaction_score` y `description` pueden estar vacíos. No se comprueba la unicidad del identificador ni se restringe el transportista.

- `created_at`: fecha ISO `AAAA-MM-DD` o fecha y hora `AAAA-MM-DDTHH:MM:SS`, opcionalmente con fracción de segundo y zona `Z` o `±HH:MM`. Debe ser una fecha y hora real.
- `warehouse`: `los_angeles`, `zaragoza`.
- `customer_type`: `b2b`, `b2c`.
- `category`: `entrega_fallida`, `paquete_perdido`, `direccion_incorrecta`, `devolucion`, `inventario_stock`, `consulta_seguimiento`.
- `status`: `abierto`, `cerrado`, `descartado`.
- `satisfaction_score`: vacío o número decimal finito entre 1 y 5 inclusive; admite fracciones.

Una cabecera incorrecta, una fila con columnas sobrantes, un CSV mal formado o un archivo ilegible interrumpen el análisis con un error. Las filas con columnas omitidas se excluyen y cuentan como `missing_required_field`, incluso cuando solo faltan columnas opcionales. Las filas vacías físicas se omiten según el lector CSV de Python.

## Validación y métricas

Una fila con cualquier error se excluye por completo de las métricas principales. Cada fila inválida suma una vez al total inválido y una vez por cada tipo de error presente, aunque afecte a varios campos del mismo tipo. Un campo obligatorio vacío cuenta como `missing_required_field`, sin añadir además un error de formato o de conjunto para ese mismo campo.

| Tipo de error                | Condición                                                    |
| ---------------------------- | ------------------------------------------------------------ |
| `missing_required_field`     | Uno o más campos obligatorios vacíos o columnas omitidas.    |
| `invalid_date_format`        | Fecha no vacía inválida o fuera del formato admitido.        |
| `invalid_warehouse_or_type`  | Almacén o tipo de cliente no vacío fuera de los conjuntos.   |
| `invalid_category`           | Categoría no vacía fuera del conjunto.                       |
| `invalid_status`             | Estado no vacío fuera del conjunto.                          |
| `invalid_satisfaction_score` | Puntuación no vacía no numérica, no finita o fuera de rango. |

La media aritmética de satisfacción utiliza solo filas válidas con estado `cerrado` y puntuación no vacía. Se presenta con dos decimales; si no existen puntuaciones elegibles, la consola muestra `Sin datos` y el CSV deja el valor vacío. Los desgloses incluyen valores con recuento cero.

## Uso y exportación

Requiere Python 3.10 o posterior, sin dependencias adicionales. Desde la raíz del repositorio:

```sh
python scripts/analyze.py scripts/incidents-TRACKFLOW.csv
```

La herramienta solicita `¿Deseas exportar los resultados a CSV? [s / n]`. Una respuesta `s` genera `results.csv` en el directorio de trabajo; `n` termina sin exportar. No se sobrescribe un archivo existente. Las demás respuestas repiten la pregunta. Una entrada terminada sin respuesta produce un error.

El CSV exportado tiene cabecera `metric,value` y una fila por métrica: `valid_total`, `invalid_total`, `errors.<tipo>`, `category.<categoría>`, `status.<estado>` y `closed_satisfaction_average`. La media se exporta con dos decimales.

## Valores esperados de la muestra

El archivo de muestra contiene 100 filas sintéticas sin datos personales: 90 válidas y 10 inválidas. Los errores son: `missing_required_field=2`, `invalid_date_format=2`, `invalid_warehouse_or_type=2`, `invalid_category=2`, `invalid_status=2` e `invalid_satisfaction_score=3`. La suma es 13 porque dos filas tienen varios tipos de error.

Cada una de las seis categorías tiene 15 incidencias válidas; cada estado tiene 30. Hay 30 casos cerrados puntuados y su satisfacción media es `4.00`.
