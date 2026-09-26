"""Main Spark integration pipeline entry point; no work occurs on import."""

from __future__ import annotations

import argparse
import uuid

from pyspark.sql import SparkSession

from spark_jobs.contracts import SparkPaths
from spark_jobs.features import build_feature_frames_from_tables, write_feature_splits
from spark_jobs.ingest import read_certified_tables
from spark_jobs.output_safety import (
    assert_spark_path_absent,
    reserve_spark_output,
    versioned_spark_path,
)
from spark_jobs.quality import apply_hooks
from spark_jobs.runtime import EvidenceLogger


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--certified-root", required=True)
    parser.add_argument("--hdfs-root", default="/urbantransit")
    parser.add_argument("--evidence-root", default=None)
    parser.add_argument("--dataset-version", required=True)
    parser.add_argument("--run-id")
    parser.add_argument(
        "--severity-thresholds-sec", required=True, nargs=4, type=float,
        metavar=("ON_TIME", "MINOR", "MODERATE", "MAJOR"),
        help="Increasing delay-severity boundaries in seconds",
    )
    args = parser.parse_args()
    args.run_id = args.run_id or str(uuid.uuid4())
    run_root = versioned_spark_path(
        args.hdfs_root,
        stage="spark_pipeline",
        dataset_version=args.dataset_version,
        run_id=args.run_id,
    )
    paths = SparkPaths(run_root)
    spark = SparkSession.builder.appName("urbantransit-spark-pipeline").getOrCreate()
    evidence = args.evidence_root or paths.evidence
    logger = EvidenceLogger(spark, evidence, pipeline_id="spark_integration_features_v1")
    try:
        destinations = [
            ("dq_issues", f"{paths.curated}/dq_issues"),
            ("evidence", f"{paths.evidence}/run_id={args.run_id}"),
        ]
        for task in (
            "delay_severity", "demand_forecast", "occupancy",
            "headway", "delay_analytics", "route_clustering",
        ):
            if task == "route_clustering":
                destinations.append(
                    (task, f"{paths.features}/task={task}/training_window=2025")
                )
            else:
                destinations.extend(
                    (f"{task}_{split}", f"{paths.features}/task={task}/split={split}")
                    for split in ("train", "validation", "test")
                )
        for stage, output in destinations:
            assert_spark_path_absent(
                spark,
                output,
                stage=stage,
                run_id=args.run_id,
                dataset_version=args.dataset_version,
            )
        for stage, output in destinations:
            reserve_spark_output(
                spark,
                output,
                stage=stage,
                run_id=args.run_id,
                dataset_version=args.dataset_version,
            )
        with logger.stage("ingest") as record:
            tables = read_certified_tables(spark, args.certified_root)
            record["tables"] = sorted(tables)
        checked, dq = apply_hooks(tables, logger)
        feature_frames = build_feature_frames_from_tables(
            checked, severity_thresholds_sec=args.severity_thresholds_sec
        )
        dq.write.mode("errorifexists").parquet(f"{paths.curated}/dq_issues")
        for task, frame in feature_frames.items():
            if task == "route_clustering":
                output = f"{paths.features}/task={task}/training_window=2025"
                with logger.stage(f"features_{task}", output) as record:
                    frame.write.mode("overwrite").parquet(output)
                    logger.record_count(record, frame)
                continue
            write_feature_splits(frame, paths.features, logger, task=task)
    finally:
        spark.stop()


if __name__ == "__main__":
    main()
