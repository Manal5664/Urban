import unittest

from spark_jobs.contracts import SparkPaths, SPLITS, TABLES, validate_certified_input
from spark_jobs.schemas import schema_spec


class SparkExecutionLayerTests(unittest.TestCase):
    def test_contract_has_all_transport_tables(self):
        self.assertEqual(len(TABLES), 21)
        self.assertEqual(SPLITS["test"], ("2026-04-01", "2026-07-01"))

    def test_paths_are_separate(self):
        paths = SparkPaths()
        self.assertTrue(paths.features.endswith("/features"))
        self.assertNotEqual(paths.analytics, paths.models)

    def test_schema_catalog_is_explicit(self):
        for table in TABLES:
            spec = schema_spec(table)
            self.assertIn("source_row_id:string", spec)
            self.assertIn("value_available_at:timestamp", spec)

    def test_uncertified_current_production_path_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_certified_input(
                "/home/manal/UrbanTransit-IQ/raw_data/production-v1",
                "/absolute/CERTIFIED",
            )


if __name__ == "__main__":
    unittest.main()
