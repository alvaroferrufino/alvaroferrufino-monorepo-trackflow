import csv
import subprocess
import sys
import tempfile
import unittest
from dataclasses import replace
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from packages.incident_analyzer.exporter import export_metrics
from packages.incident_analyzer.metrics import calculate_metrics
from packages.incident_analyzer.parser import parse_incidents
from packages.incident_analyzer.schema import ERROR_TYPES, Incident, ParsedIncidents

ROOT = Path(__file__).resolve().parents[3]


class MetricsTests(unittest.TestCase):
    def test_sample_totals(self):
        metrics = calculate_metrics(parse_incidents(
            ROOT / "scripts/incidents-TRACKFLOW.csv"))
        self.assertEqual(
            (metrics.valid_total, metrics.invalid_total), (90, 10))
        self.assertEqual(list(metrics.errors.values()), [2, 2, 2, 2, 2, 3])
        self.assertEqual(list(metrics.categories.values()), [15] * 6)
        self.assertEqual(list(metrics.statuses.values()), [30] * 3)
        self.assertEqual(metrics.closed_satisfaction_average, Decimal("4"))

    def test_closed_scored_incidents_only_and_empty_average(self):
        incident = Incident("TF-1", datetime(2026, 1, 1), "zaragoza",
                            "MRW", "b2c", "devolucion", "cerrado", Decimal("5"), "")
        parsed = ParsedIncidents([incident, replace(incident, status="abierto", satisfaction_score=Decimal(
            "1")), replace(incident, satisfaction_score=None)], 0, dict.fromkeys(ERROR_TYPES, 0))
        metrics = calculate_metrics(parsed)
        self.assertEqual(metrics.closed_satisfaction_average, Decimal("5"))
        self.assertEqual(metrics.statuses["cerrado"], 2)
        self.assertIsNone(calculate_metrics(
            replace(parsed, incidents=[])).closed_satisfaction_average)

    def test_export_and_cli(self):
        with tempfile.TemporaryDirectory() as directory:
            result = subprocess.run(
                [sys.executable, str(ROOT / "scripts/analyze.py"),
                 str(ROOT / "scripts/incidents-TRACKFLOW.csv")],
                input="s\n", text=True, capture_output=True, cwd=directory, check=True,
            )
            self.assertIn(
                "¿Deseas exportar los resultados a CSV? [s / n]", result.stdout)
            with (Path(directory) / "results.csv").open(encoding="utf-8", newline="") as csv_file:
                rows = dict(csv.reader(csv_file))
            self.assertEqual(rows["valid_total"], "90")
            self.assertEqual(rows["invalid_total"], "10")
            self.assertEqual(rows["closed_satisfaction_average"], "4.00")
            with self.assertRaises(FileExistsError):
                export_metrics(calculate_metrics(ParsedIncidents(
                    [], 0, {})), Path(directory) / "results.csv")


if __name__ == "__main__":
    unittest.main()
