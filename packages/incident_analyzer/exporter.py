"""Export metrics in a stable CSV format."""

import csv
from pathlib import Path

from .metrics import Metrics, metric_rows


def export_metrics(metrics: Metrics, path: str | Path) -> None:
    with open(path, "x", encoding="utf-8", newline="") as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(("metric", "value"))
        writer.writerows(metric_rows(metrics))
