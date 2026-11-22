# Analizador compartido de incidencias

Biblioteca Python sin dependencias externas para analizar las incidencias de TrackFlow desde la CLI y, en el futuro, desde la API. Requiere Python 3.10 o posterior.

Desde la raíz del monorepo:

```python
from packages.incident_analyzer.parser import parse_incidents
from packages.incident_analyzer.metrics import calculate_metrics
from packages.incident_analyzer.exporter import export_metrics

metrics = calculate_metrics(parse_incidents("scripts/incidents-TRACKFLOW.csv"))
export_metrics(metrics, "results.csv")
```

`parse_incidents` devuelve las incidencias válidas y los recuentos de errores; `calculate_metrics` produce las métricas y `export_metrics` escribe un CSV nuevo sin sobrescribir archivos existentes. La API futura puede importar estas mismas funciones. Para el contrato completo, los resultados esperados y la CLI, consulta [la especificación](../../docs/INCIDENTS_SPEC.md).

Pruebas: `python -m unittest discover -s packages/incident_analyzer/tests -v`.
