"""Read and validate TrackFlow incident CSV files."""

import csv
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path

from .schema import (
    CATEGORIES, COLUMNS, CUSTOMER_TYPES, ERROR_TYPES, REQUIRED_FIELDS, STATUSES,
    WAREHOUSES, Incident, ParsedIncidents,
)

DATE_PATTERN = re.compile(
    r"\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?"
)


def parse_incidents(path: str | Path) -> ParsedIncidents:
    incidents = []
    errors = dict.fromkeys(ERROR_TYPES, 0)
    invalid_rows = 0
    with open(path, encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file, strict=True)
        if reader.fieldnames != list(COLUMNS):
            raise ValueError(
                "La cabecera CSV debe contener exactamente las columnas esperadas en orden")
        for line_number, row in enumerate(reader, start=2):
            if None in row:
                raise ValueError(
                    f"Número incorrecto de columnas en el registro {line_number}")
            missing_columns = any(value is None for value in row.values())
            values = {
                key: value.strip() if value is not None else "" for key, value in row.items()}
            row_errors = set()
            if missing_columns or any(not values[field] for field in REQUIRED_FIELDS):
                row_errors.add("missing_required_field")
            created_at = None
            if values["created_at"]:
                try:
                    if not DATE_PATTERN.fullmatch(values["created_at"]):
                        raise ValueError
                    created_at = datetime.fromisoformat(
                        values["created_at"].replace("Z", "+00:00"))
                except ValueError:
                    row_errors.add("invalid_date_format")
            if (values["warehouse"] and values["warehouse"] not in WAREHOUSES) or (
                values["customer_type"] and values["customer_type"] not in CUSTOMER_TYPES
            ):
                row_errors.add("invalid_warehouse_or_type")
            if values["category"] and values["category"] not in CATEGORIES:
                row_errors.add("invalid_category")
            if values["status"] and values["status"] not in STATUSES:
                row_errors.add("invalid_status")
            score = None
            if values["satisfaction_score"]:
                try:
                    score = Decimal(values["satisfaction_score"])
                    if not score.is_finite() or not Decimal(1) <= score <= Decimal(5):
                        raise InvalidOperation
                except InvalidOperation:
                    row_errors.add("invalid_satisfaction_score")
            if row_errors:
                invalid_rows += 1
                for error in row_errors:
                    errors[error] += 1
                continue
            assert created_at is not None
            incidents.append(Incident(
                incident_id=values["incident_id"], created_at=created_at,
                warehouse=values["warehouse"], carrier=values["carrier"],
                customer_type=values["customer_type"], category=values["category"],
                status=values["status"], satisfaction_score=score,
                description=values["description"],
            ))
    return ParsedIncidents(incidents=incidents, invalid_rows=invalid_rows, errors=errors)
