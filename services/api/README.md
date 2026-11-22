# API de TrackFlow: incidencias

Servicio FastAPI que reutiliza `packages/incident_analyzer` para validar, calcular y exportar incidencias sin duplicar la lógica de la CLI. Requiere Python 3.10 o posterior.

Desde la raíz del monorepo, con el entorno Python deseado activado:

```sh
python -m pip install -r services/api/requirements.txt
python -m uvicorn services.api.main:app --host 127.0.0.1 --port 8000
```

La documentación interactiva está en `http://127.0.0.1:8000/docs`. CORS admite los orígenes locales `http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173` y `http://127.0.0.1:5173`; expone `Content-Disposition` para la descarga desde el navegador.

En GitHub Codespaces también se autoriza el origen del puerto `3000` del Codespace actual, usando `CODESPACE_NAME` y `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`. Para otros hosts, define `TRACKFLOW_CORS_ORIGINS` antes de iniciar la API con los orígenes exactos del frontend separados por comas, por ejemplo `TRACKFLOW_CORS_ORIGINS=https://trackflow.example:3000`. El comodín `*` no está permitido. La API y el frontend deben estar accesibles en los puertos `8000` y `3000`, respectivamente; los puertos privados de Codespaces requieren una sesión autorizada.

## Endpoints

`POST /api/incidents/analyze` recibe un archivo con extensión `.csv` en el campo multipart `file`. Su contenido sigue exactamente el [contrato compartido](../../docs/INCIDENTS_SPEC.md), incluido UTF-8 y el orden de cabeceras. Los errores de archivo vacío, extensión incorrecta, codificación o estructura CSV devuelven 400 con `detail`; si falta el campo multipart, FastAPI devuelve 422. Las filas con datos inválidos se contabilizan como errores sin rechazar el archivo completo.

```sh
curl -F 'file=@scripts/incidents-TRACKFLOW.csv' http://127.0.0.1:8000/api/incidents/analyze
```

La respuesta contiene `analysis_id`, `summary` (`total`, `valid`, `invalid`), `errors`, `categories`, `statuses` y `closed_satisfaction_average`. La media es un número JSON o `null` si no hay casos cerrados puntuados. Cada análisis correcto tiene un identificador aleatorio propio; una solicitud inválida no altera los análisis anteriores.

`GET /api/incidents/results/export` descarga el análisis indicado en la cabecera `X-Analysis-ID` como `text/csv` con `Content-Disposition: attachment; filename="results.csv"`. Si falta el identificador, es desconocido o su resultado ya no está disponible, devuelve 404 con `detail`. El formato es el mismo que el de la CLI.

Los resultados viven solo en la memoria del proceso: se pierden al reiniciar y no se comparten entre workers o réplicas. Se conservan como máximo 100 análisis; al superar el límite se elimina el más antiguo. Usar un único worker para esta fase; se necesita persistencia compartida antes de escalar. El identificador permite descargar el resultado y debe tratarse como secreto; no sustituye la autenticación. Las cargas se procesan en un directorio temporal que se elimina al terminar; no se conservan los CSV originales.

## Pruebas

```sh
python -m unittest discover -s services/api/tests -v
python -m unittest discover -s packages/incident_analyzer/tests -v
```
