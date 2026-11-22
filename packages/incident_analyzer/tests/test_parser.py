import csv
import tempfile
import unittest
from pathlib import Path

from packages.incident_analyzer.parser import parse_incidents
from packages.incident_analyzer.schema import COLUMNS


class ParserTests(unittest.TestCase):
    def test_validation_counts_multiple_errors_once_per_type(self):
        valid = ["TF-1", "2026-01-01", "zaragoza", "MRW",
                 "b2c", "devolucion", "cerrado", "5", "Recogida"]
        invalid = ["", "2026-02-30", "paris", "",
                   "otra", "otra", "otro", "NaN", ""]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "incidents.csv"
            with path.open("w", encoding="utf-8", newline="") as csv_file:
                writer = csv.writer(csv_file)
                writer.writerow(COLUMNS)
                writer.writerows([valid, invalid])
            parsed = parse_incidents(path)
        self.assertEqual(len(parsed.incidents), 1)
        self.assertEqual(parsed.invalid_rows, 1)
        self.assertTrue(all(count == 1 for count in parsed.errors.values()))

    def test_score_boundaries_and_date_formats(self):
        base = ["TF-1", "2026-01-01T10:00:00Z", "zaragoza",
                "", "b2c", "devolucion", "cerrado", "", ""]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "incidents.csv"
            with path.open("w", encoding="utf-8", newline="") as csv_file:
                writer = csv.writer(csv_file)
                writer.writerow(COLUMNS)
                for score in ("", "1", "5", "1.5", "0.99", "5.01", "Infinity", "texto"):
                    row = base.copy()
                    row[7] = score
                    writer.writerow(row)
            parsed = parse_incidents(path)
        self.assertEqual(len(parsed.incidents), 4)
        self.assertEqual(parsed.invalid_rows, 4)
        self.assertEqual(parsed.errors["invalid_satisfaction_score"], 4)

    def test_truncated_rows_are_counted_and_processing_continues(self):
        valid = ["TF-1", "2026-01-01", "zaragoza", "MRW",
                 "b2c", "devolucion", "cerrado", "5", "Recogida"]
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "incidents.csv"
            with path.open("w", encoding="utf-8", newline="") as csv_file:
                writer = csv.writer(csv_file)
                writer.writerow(COLUMNS)
                writer.writerows(
                    [valid[:6], valid[:8], valid, ["TF-2", "bad-date"]])
            parsed = parse_incidents(path)
        self.assertEqual(len(parsed.incidents), 1)
        self.assertEqual(parsed.invalid_rows, 3)
        self.assertEqual(parsed.errors["missing_required_field"], 3)
        self.assertEqual(parsed.errors["invalid_date_format"], 1)

    def test_bad_header_and_extra_columns_fail_explicitly(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "incidents.csv"
            with path.open("w", encoding="utf-8", newline="") as csv_file:
                csv.writer(csv_file).writerow(reversed(COLUMNS))
            with self.assertRaises(ValueError):
                parse_incidents(path)
            with path.open("w", encoding="utf-8", newline="") as csv_file:
                writer = csv.writer(csv_file)
                writer.writerow(COLUMNS)
                writer.writerow(["TF-1"] * (len(COLUMNS) + 1))
            with self.assertRaises(ValueError):
                parse_incidents(path)


if __name__ == "__main__":
    unittest.main()
