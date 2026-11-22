"""TrackFlow API for incident analysis."""

import csv
import os
import secrets
from collections import OrderedDict
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Lock

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from packages.incident_analyzer.exporter import export_metrics
from packages.incident_analyzer.metrics import calculate_metrics
from packages.incident_analyzer.parser import parse_incidents


def allowed_origins() -> list[str]:
    origins = [
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:5173", "http://127.0.0.1:5173",
    ]
    codespace_name = os.environ.get("CODESPACE_NAME")
    if codespace_name:
        domain = os.environ.get(
            "GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev")
        origins.append(f"https://{codespace_name}-3000.{domain}")
    origins.extend(
        origin.strip() for origin in os.environ.get("TRACKFLOW_CORS_ORIGINS", "").split(",")
        if origin.strip() and origin.strip() != "*"
    )
    return origins


app = FastAPI(title="TrackFlow API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins(),
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)
app.state.incident_results = OrderedDict()
app.state.incident_results_lock = Lock()
MAX_INCIDENT_RESULTS = 100


@app.post("/api/incidents/analyze")
def analyze_incidents(file: UploadFile = File(...)) -> dict:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400, detail="El archivo debe tener extensión .csv")

    with TemporaryDirectory() as directory:
        input_path = Path(directory) / "incidents.csv"
        has_content = False
        with input_path.open("wb") as destination:
            while chunk := file.file.read(65536):
                has_content = has_content or bool(chunk.strip())
                destination.write(chunk)
        if not has_content:
            raise HTTPException(
                status_code=400, detail="El archivo CSV está vacío")
        try:
            metrics = calculate_metrics(parse_incidents(input_path))
        except UnicodeDecodeError as error:
            raise HTTPException(
                status_code=400, detail="El archivo debe estar codificado en UTF-8") from error
        except (csv.Error, ValueError) as error:
            raise HTTPException(
                status_code=400, detail=f"CSV inválido: {error}") from error

    with app.state.incident_results_lock:
        analysis_id = secrets.token_urlsafe(32)
        while analysis_id in app.state.incident_results:
            analysis_id = secrets.token_urlsafe(32)
        app.state.incident_results[analysis_id] = metrics
        if len(app.state.incident_results) > MAX_INCIDENT_RESULTS:
            app.state.incident_results.popitem(last=False)
    return {
        "analysis_id": analysis_id,
        "summary": {
            "total": metrics.valid_total + metrics.invalid_total,
            "valid": metrics.valid_total,
            "invalid": metrics.invalid_total,
        },
        "errors": metrics.errors,
        "categories": metrics.categories,
        "statuses": metrics.statuses,
        "closed_satisfaction_average": (
            float(metrics.closed_satisfaction_average)
            if metrics.closed_satisfaction_average is not None else None
        ),
    }


@app.get("/api/incidents/results/export")
def export_incidents(analysis_id: str | None = Header(default=None, alias="X-Analysis-ID")) -> Response:
    with app.state.incident_results_lock:
        metrics = app.state.incident_results.get(analysis_id)
    if metrics is None:
        raise HTTPException(
            status_code=404, detail="No se encontró el análisis solicitado o ha caducado")
    with TemporaryDirectory() as directory:
        output_path = Path(directory) / "results.csv"
        export_metrics(metrics, output_path)
        content = output_path.read_bytes()
    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="results.csv"'},
    )
