import csv
import io
import os
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from fastapi.testclient import TestClient

from packages.incident_analyzer.exporter import export_metrics
from packages.incident_analyzer.metrics import calculate_metrics
from packages.incident_analyzer.parser import parse_incidents
from services.api.main import allowed_origins, app

ROOT = Path(__file__).resolve().parents[3]
SAMPLE = ROOT / "scripts/incidents-TRACKFLOW.csv"


class IncidentsApiTests(unittest.TestCase):
    def test_allowed_origins_are_explicit(self):
        environment = {
            "CODESPACE_NAME": "trackflow-test",
            "GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN": "app.github.dev",
            "TRACKFLOW_CORS_ORIGINS": "https://trackflow.example:3000, *",
        }
        with patch.dict(os.environ, environment, clear=True):
            origins = allowed_origins()
        self.assertIn("https://trackflow-test-3000.app.github.dev", origins)
        self.assertIn("https://trackflow.example:3000", origins)
        self.assertNotIn("*", origins)
        self.assertNotIn("https://otro-3000.app.github.dev", origins)

    def setUp(self):
        with app.state.incident_results_lock:
            app.state.incident_results.clear()
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def upload(self, content: bytes, filename: str = "incidents.csv"):
        return self.client.post(
            "/api/incidents/analyze",
            files={"file": (filename, content, "text/csv")},
        )

    def test_sample_analysis_and_export_use_shared_logic(self):
        self.assertEqual(self.client.get(
            "/api/incidents/results/export").status_code, 404)
        response = self.upload(SAMPLE.read_bytes())
        self.assertEqual(response.status_code, 200)
        data = response.json()
        metrics = calculate_metrics(parse_incidents(SAMPLE))
        self.assertEqual(data["summary"], {
                         "total": 100, "valid": 90, "invalid": 10})
        self.assertEqual(data["errors"], metrics.errors)
        self.assertEqual(data["categories"], metrics.categories)
        self.assertEqual(data["statuses"], metrics.statuses)
        self.assertEqual(data["closed_satisfaction_average"], 4.0)
        exported = self.client.get(
            "/api/incidents/results/export", headers={"X-Analysis-ID": data["analysis_id"]}
        )
        self.assertEqual(exported.status_code, 200)
        self.assertTrue(
            exported.headers["content-type"].startswith("text/csv"))
        self.assertEqual(
            exported.headers["content-disposition"], 'attachment; filename="results.csv"')
        with TemporaryDirectory() as directory:
            path = Path(directory) / "results.csv"
            export_metrics(metrics, path)
            self.assertEqual(exported.content, path.read_bytes())

    def test_invalid_uploads_do_not_replace_last_result(self):
        analyzed = self.upload(SAMPLE.read_bytes())
        self.assertEqual(analyzed.status_code, 200)
        headers = {"X-Analysis-ID": analyzed.json()["analysis_id"]}
        previous = self.client.get(
            "/api/incidents/results/export", headers=headers).content
        for content, filename, message in [
            (b"", "incidents.csv", "vacío"),
            (b"  \n", "incidents.csv", "vacío"),
            (b"not csv", "incidents.txt", ".csv"),
            (b"\xff", "incidents.csv", "UTF-8"),
            (b"incident_id,created_at\nTF-1,2026-01-01\n",
             "incidents.csv", "cabecera"),
            (b"not a CSV file", "incidents.csv", "cabecera"),
        ]:
            with self.subTest(message=message):
                response = self.upload(content, filename)
                self.assertEqual(response.status_code, 400)
                self.assertIn(message, response.json()["detail"])
                self.assertEqual(self.client.get(
                    "/api/incidents/results/export", headers=headers).content, previous)
        self.assertEqual(self.client.post(
            "/api/incidents/analyze").status_code, 422)

    def test_latest_analysis_and_empty_average(self):
        self.assertEqual(self.upload(SAMPLE.read_bytes()).status_code, 200)
        with SAMPLE.open(encoding="utf-8", newline="") as csv_file:
            reader = csv.reader(csv_file)
            header = next(reader)
        output = io.StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(header)
        writer.writerow(["TF-NEW", "2026-01-01", "zaragoza",
                        "MRW", "b2c", "devolucion", "abierto", "", ""])
        response = self.upload(output.getvalue().encode())
        self.assertEqual(response.json()["summary"], {
                         "total": 1, "valid": 1, "invalid": 0})
        self.assertIsNone(response.json()["closed_satisfaction_average"])
        exported = self.client.get(
            "/api/incidents/results/export", headers={"X-Analysis-ID": response.json()["analysis_id"]}
        )
        rows = dict(csv.reader(io.StringIO(exported.text)))
        self.assertEqual(rows["valid_total"], "1")
        self.assertEqual(rows["closed_satisfaction_average"], "")

    def test_cors_preflight(self):
        origins = ["http://localhost:3000", "http://127.0.0.1:5173"]
        if os.environ.get("CODESPACE_NAME"):
            domain = os.environ.get(
                "GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN", "app.github.dev")
            origins.append(
                f"https://{os.environ['CODESPACE_NAME']}-3000.{domain}")
        for origin in origins:
            with self.subTest(origin=origin):
                response = self.client.options(
                    "/api/incidents/analyze",
                    headers={"Origin": origin,
                             "Access-Control-Request-Method": "POST"},
                )
                self.assertEqual(response.status_code, 200)
                self.assertEqual(
                    response.headers["access-control-allow-origin"], origin)
        response = self.client.options(
            "/api/incidents/analyze",
            headers={"Origin": "https://otro-3000.app.github.dev",
                     "Access-Control-Request-Method": "POST"},
        )
        self.assertEqual(response.status_code, 400)
        analyzed = self.upload(SAMPLE.read_bytes())
        response = self.client.get(
            "/api/incidents/results/export", headers={
                "Origin": "http://localhost:3000", "X-Analysis-ID": analyzed.json()["analysis_id"]
            }
        )
        self.assertEqual(
            response.headers["access-control-expose-headers"], "Content-Disposition")

    def test_analysis_results_are_isolated_between_clients(self):
        first = self.upload(SAMPLE.read_bytes()).json()
        second_client = TestClient(app)
        self.addCleanup(second_client.close)
        csv_content = (
            "incident_id,created_at,warehouse,carrier,customer_type,category,status,satisfaction_score,description\n"
            "TF-2,2026-01-01,zaragoza,MRW,b2c,devolucion,abierto,,\n"
        ).encode()
        second_response = second_client.post(
            "/api/incidents/analyze", files={"file": ("incidents.csv", csv_content, "text/csv")}
        )
        self.assertEqual(second_response.status_code, 200)
        second = second_response.json()
        self.assertNotEqual(first["analysis_id"], second["analysis_id"])
        first_export = self.client.get(
            "/api/incidents/results/export", headers={"X-Analysis-ID": first["analysis_id"]}
        )
        second_export = second_client.get(
            "/api/incidents/results/export", headers={"X-Analysis-ID": second["analysis_id"]}
        )
        self.assertEqual(dict(csv.reader(io.StringIO(first_export.text)))[
                         "valid_total"], "90")
        self.assertEqual(dict(csv.reader(io.StringIO(second_export.text)))[
                         "valid_total"], "1")
        self.assertEqual(self.client.get(
            "/api/incidents/results/export").status_code, 404)
        self.assertEqual(self.client.get(
            "/api/incidents/results/export", headers={"X-Analysis-ID": "unknown"}
        ).status_code, 404)

    def test_truncated_records_are_reported_by_api(self):
        csv_content = (
            "incident_id,created_at,warehouse,carrier,customer_type,category,status,satisfaction_score,description\n"
            "TF-1,2026-01-01,zaragoza,MRW,b2c,devolucion\n"
            "TF-2,2026-01-01,zaragoza,MRW,b2c,devolucion,cerrado,5,Recogida\n"
        ).encode()
        response = self.upload(csv_content)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["summary"], {
                         "total": 2, "valid": 1, "invalid": 1})
        self.assertEqual(response.json()["errors"]
                         ["missing_required_field"], 1)

    def test_cors_preflight_allows_analysis_id_header(self):
        response = self.client.options(
            "/api/incidents/results/export",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "x-analysis-id",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers["access-control-allow-origin"], "http://localhost:3000")
        self.assertIn("x-analysis-id",
                      response.headers["access-control-allow-headers"].lower())

    def test_oldest_analysis_is_evicted_at_capacity(self):
        with patch("services.api.main.MAX_INCIDENT_RESULTS", 2):
            identifiers = [self.upload(SAMPLE.read_bytes()).json()[
                "analysis_id"] for _ in range(3)]
        for index, analysis_id in enumerate(identifiers):
            response = self.client.get(
                "/api/incidents/results/export", headers={"X-Analysis-ID": analysis_id}
            )
            self.assertEqual(response.status_code, 404 if index == 0 else 200)


if __name__ == "__main__":
    unittest.main()
