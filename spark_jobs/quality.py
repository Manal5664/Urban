"""Spark DQ hooks; they flag and audit, never silently repair source rows."""

from __future__ import annotations

from pyspark.sql import functions as F


def apply_hooks(tables: dict, logger) -> tuple[dict, object]:
    issues = []
    checked = {}
    for name, frame in tables.items():
        current = frame
        checks = [
            ("missing_source_row_id", F.col("source_row_id").isNull()),
            ("invalid_quality_status", ~F.col("quality_status").isin("ACCEPTED", "FLAGGED", "UNRESOLVED")),
        ]
        if "service_date" in frame.columns:
            checks.append(("missing_service_date", F.col("service_date").isNull()))
        for rule_id, condition in checks:
            issues.append(
                frame.filter(condition).select(
                    F.lit(name).alias("table_name"), F.col("source_row_id"),
                    F.lit(rule_id).alias("rule_id"), F.lit("FLAGGED").alias("status")
                )
            )
        checked[name] = current
    dq = issues[0]
    for item in issues[1:]:
        dq = dq.unionByName(item)
    return checked, dq


def assert_no_future_leakage(frame, *, cutoff="feature_cutoff_at",
                             available="value_available_at"):
    violation = frame.filter(F.col(available) > F.col(cutoff)).limit(1).count()
    if violation:
        raise ValueError(f"Feature availability exceeds {cutoff}")
    return frame
