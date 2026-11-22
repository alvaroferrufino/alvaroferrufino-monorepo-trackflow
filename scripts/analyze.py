#!/usr/bin/env python3
"""Analyze a TrackFlow incidents CSV from the command line."""

import argparse
import csv
import sys
from pathlib import Path


def main() -> int:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from packages.incident_analyzer.exporter import export_metrics
    from packages.incident_analyzer.metrics import calculate_metrics
    from packages.incident_analyzer.parser import parse_incidents

    argument_parser = argparse.ArgumentParser(
        description="Analiza incidencias de TrackFlow")
    argument_parser.add_argument("csv", help="Ruta del CSV de incidencias")
    arguments = argument_parser.parse_args()
    try:
        metrics = calculate_metrics(parse_incidents(arguments.csv))
    except (OSError, UnicodeError, csv.Error, ValueError) as error:
        print(f"Error al leer el CSV: {error}", file=sys.stderr)
        return 1

    print("Resumen de incidencias de TrackFlow")
    print(f"Registros válidos: {metrics.valid_total}")
    print(f"Registros inválidos: {metrics.invalid_total}")
    print("Errores por tipo:")
    for name, count in metrics.errors.items():
        print(f"  {name}: {count}")
    print("Incidencias por categoría:")
    for name, count in metrics.categories.items():
        print(f"  {name}: {count}")
    print("Incidencias por estado:")
    for name, count in metrics.statuses.items():
        print(f"  {name}: {count}")
    average = metrics.closed_satisfaction_average
    print(
        f"Satisfacción media en casos cerrados: {f'{average:.2f}' if average is not None else 'Sin datos'}")

    while True:
        try:
            answer = input(
                "¿Deseas exportar los resultados a CSV? [s / n]").strip().lower()
        except EOFError:
            print(
                "\nNo se recibió una respuesta; no se exportaron resultados.", file=sys.stderr)
            return 1
        if answer == "n":
            return 0
        if answer == "s":
            try:
                export_metrics(metrics, "results.csv")
            except OSError as error:
                print(
                    f"Error al exportar results.csv: {error}", file=sys.stderr)
                return 1
            print("Resultados exportados a results.csv")
            return 0
        print("Responde s o n.")


if __name__ == "__main__":
    raise SystemExit(main())
