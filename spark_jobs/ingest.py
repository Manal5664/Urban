"""Certified-package ingestion and typed staging."""

from __future__ import annotations

from .contracts import TABLES, SparkPaths, validate_certified_input
from .output_safety import reserve_spark_output
from .schemas import schema_for


def read_certified_tables(spark, certified_root: str, *, tables=TABLES):
    """Read only the certified HDFS package; actions are owned by callers."""
    result = {}
    for table in tables:
        result[table] = (
            spark.read.schema(schema_for(table))
            .option("header", "true")
            .option("mode", "FAILFAST")
            .csv(f"{certified_root}/raw/{table}")
        )
    return result


def write_staging(
    tables: dict,
    paths: SparkPaths,
    logger,
    *,
    dataset_version: str,
    run_id: str,
) -> dict:
    staged = {}
    for name, frame in tables.items():
        output = f"{paths.staging}/{name}"
        reserve_spark_output(
            logger.spark,
            output,
            stage=f"staging_{name}",
            run_id=run_id,
            dataset_version=dataset_version,
        )
        with logger.stage(f"stage_{name}", output) as record:
            frame.write.mode("errorifexists").partitionBy("service_date").parquet(output)
            logger.record_count(record, frame)
        staged[name] = output
    return staged


def validate_input_args(dataset_root: str, certification_marker: str):
    return validate_certified_input(dataset_root, certification_marker)
