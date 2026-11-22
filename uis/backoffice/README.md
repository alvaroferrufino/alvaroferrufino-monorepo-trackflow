# Backoffice de TrackFlow

Interfaz web estática del Analizador de Incidencias. Envía archivos CSV a la API de TrackFlow, muestra sus métricas y errores de validación y permite descargar el último resultado en CSV. La navegación está preparada para el backoffice operativo; no incluye autenticación en esta fase.

## Ejecución local

Desde la raíz del monorepo, instala las dependencias y arranca la API según [su documentación](../../services/api/README.md), en `http://localhost:8000`. En otra terminal:

```sh
python -m http.server 3000 --bind 127.0.0.1 --directory uis/backoffice
```

Abre `http://localhost:3000/`. Es necesario servir la interfaz por HTTP: la API admite CORS para los puertos locales `3000` y `5173`, pero no para `file://`. Si el puerto `3000` está ocupado, utiliza el `5173`. Las fuentes y los iconos Lucide se cargan desde Google Fonts y unpkg; la funcionalidad no depende de ellos.

En GitHub Codespaces, abre el puerto reenviado `3000`; el cliente cambia automáticamente `-3000.app.github.dev` por `-8000.app.github.dev` para acceder a la API. Asegúrate de que ambos puertos están reenviados y de que el navegador tiene acceso a ellos. En otros hosts, el cliente usa el mismo esquema y host en el puerto `8000`. La API debe autorizar el origen remoto exacto mediante `TRACKFLOW_CORS_ORIGINS`, como se explica en [su documentación](../../services/api/README.md).

El selector y la zona de arrastre envían el archivo inmediatamente. Los errores aparecen en pantalla; el último análisis correcto de la pestaña permanece visible si una solicitud falla. La descarga usa su identificador de análisis, sin verse afectada por otras pestañas o usuarios. El identificador se pierde al recargar la página; la API conserva hasta 100 análisis en memoria y los pierde al reiniciar.

Comprueba la selección de URL con `node --test uis/backoffice/tests/api-url.test.cjs`.
