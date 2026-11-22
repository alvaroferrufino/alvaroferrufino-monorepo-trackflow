"""Calculate metrics exclusively from valid incidents."""

from collections import Counter
from dataclasses import dataclass
from decimal import Decimal

from .schema import CATEGORIES, STATUSES, ParsedIncidents


@dataclass(frozen=True)
class Metrics:
    valid_total: int
    invalid_total: int
    errors: dict[str, int]
    categories: dict[str, int]
    statuses: dict[str, int]
    closed_satisfaction_average: Decimal | None


def calculate_metrics(parsed: ParsedIncidents) -> Metrics:
    categories = Counter(incident.category for incident in parsed.incidents)
    statuses = Counter(incident.status for incident in parsed.incidents)
    scores = [
        incident.satisfaction_score for incident in parsed.incidents
        if incident.status == "cerrado" and incident.satisfaction_score is not None
    ]
    average = sum(scores, Decimal(0)) / len(scores) if scores else None
    return Metrics(
        valid_total=len(parsed.incidents), invalid_total=parsed.invalid_rows,
        errors=dict(parsed.errors),
        categories={category: categories[category] for category in CATEGORIES},
        statuses={status: statuses[status] for status in STATUSES},
        closed_satisfaction_average=average,
    )


def metric_rows(metrics: Metrics) -> list[tuple[str, str]]:
    average = metrics.closed_satisfaction_average
    return [
        ("valid_total", str(metrics.valid_total)),
        ("invalid_total", str(metrics.invalid_total)),
        *((f"errors.{name}", str(count))
          for name, count in metrics.errors.items()),
        *((f"category.{name}", str(count))
          for name, count in metrics.categories.items()),
        *((f"status.{name}", str(count))
          for name, count in metrics.statuses.items()),
        ("closed_satisfaction_average",
         f"{average:.2f}" if average is not None else ""),
    ]
