"""Incident schema and validation vocabulary."""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

COLUMNS = (
    "incident_id", "created_at", "warehouse", "carrier", "customer_type",
    "category", "status", "satisfaction_score", "description",
)
REQUIRED_FIELDS = (
    "incident_id", "created_at", "warehouse", "customer_type", "category", "status",
)
WAREHOUSES = ("los_angeles", "zaragoza")
CUSTOMER_TYPES = ("b2b", "b2c")
CATEGORIES = (
    "entrega_fallida", "paquete_perdido", "direccion_incorrecta", "devolucion",
    "inventario_stock", "consulta_seguimiento",
)
STATUSES = ("abierto", "cerrado", "descartado")
ERROR_TYPES = (
    "missing_required_field", "invalid_date_format", "invalid_warehouse_or_type",
    "invalid_category", "invalid_status", "invalid_satisfaction_score",
)


@dataclass(frozen=True)
class Incident:
    incident_id: str
    created_at: datetime
    warehouse: str
    carrier: str
    customer_type: str
    category: str
    status: str
    satisfaction_score: Decimal | None
    description: str


@dataclass(frozen=True)
class ParsedIncidents:
    incidents: list[Incident]
    invalid_rows: int
    errors: dict[str, int]