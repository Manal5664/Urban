# HDFS + Spark execution layer

This layer is independent of `python_pipeline/`. HDFS publication accepts a
separately prepared package and marker, never reads `raw_data/`, and never
formats HDFS or deletes an existing destination.

## HDFS destination and dry run

The destination is explicit and immutable by version:
`$HDFS_ROOT/raw/<dataset-version>`. The publisher checks the existing
`$HDFS_ROOT/raw` base and destination, creates the version directory without
`-p`, then copies source `raw/` and the supplied marker using `hdfs dfs -put`
without `-f`. A failure leaves any partial destination in place for operator
review; retries reject it rather than overwrite or clean it.

The shell publisher does not parse or define the authoritative certificate
format. Validate the package and marker first through the dataset-owner
adapter in `runtime_orchestration.certification`.

```bash
bash hdfs_scripts/ingest_certified_dataset.sh \
  /absolute/path/to/certified-package \
  /absolute/path/to/authoritative-marker \
  <attested-dataset-version> \
  --dry-run
```

The dry run prints the exact command sequence and does not invoke HDFS. Actual
publication is a separate explicit invocation with the final `--dry-run`
argument omitted, and must wait for an approved HDFS availability gate.

## Spark output safety

Spark pipeline outputs are nested under
`<HDFS_ROOT>/runs/stage=spark_pipeline/dataset=<version>/run=<id>/...`.
The pipeline checks every expected DQ, feature-split, clustering, and evidence
destination before reading data or writing outputs. DQ, standalone analytics,
model, and staging writers use `errorifexists`; feature outputs use the same
versioned namespace and complete preflight collision checks. A collision fails
the run and existing results are never deleted.

Pipeline invocation arguments include explicit `--dataset-version`; `--run-id`
may be supplied or is generated. Standalone analytics/model entry points
require a dataset version and allocate a separate versioned run path under
their explicit `--output` root.

The cluster submission form is intentionally not prescribed here. The previous
`spark-submit ... -m spark_jobs.*` examples were invalid because `spark-submit`
does not implement Python's module `-m` option. A verified application resource,
cluster runtime compatibility check, and service-availability check remain
required before any Spark execution.

Feature transformations preserve the fixed chronological boundaries: training
before 2026-01-01, validation from 2026-01-01 through 2026-03-31, and test from
2026-04-01 through 2026-06-30. As-of joins require
`value_available_at <= feature cutoff`; violations fail the run.

No HDFS, Spark, ML, or production command was run to prepare this runbook.
