# Runtime preflight and execution orchestration

This layer prepares a **fail-closed plan**. It does not certify the production
dataset, install dependencies, start HDFS/Spark/PostgreSQL, or execute the
pipeline. Never use fixture output as production evidence.

## First command after dataset certification

After the dataset owner has issued an authoritative certification marker and
published the separate immutable package, run preflight first:

```bash
cd /home/manal/UrbanTransit-IQ
python3 -m runtime_orchestration preflight \
  --project-root /home/manal/UrbanTransit-IQ \
  --dataset-root /absolute/path/to/certified-package \
  --marker /absolute/path/to/authoritative-marker \
  --certification-adapter dataset_owner_adapter:adapter \
  --disk-path /absolute/path/to/processing-volume \
  --minimum-free-bytes <approved-headroom-bytes>
```

The marker format is intentionally not defined by this repository. The adapter
implements `certify(dataset_root, marker_path)` and returns the
`CertificationAttestation` interface from `runtime_orchestration.certification`.
The authoritative parser remains pending the dataset owner's approved schema.
Without an adapter, certification preflight stays `NOT_CONFIGURED`; a marker
file by itself is not accepted as proof.

Preflight exits 0 only when every required local prerequisite is `READY`;
otherwise it reports checks and exits 2. It reads local version/configuration,
package metadata, disk headroom, the supplied marker and project entry-point
files. It may run `java -version`; it does **not** run Hadoop/HDFS, Spark,
PySpark, PostgreSQL, data ingestion, ML, or production commands. It does not
print credentials. HDFS availability, Spark/JVM runtime compatibility and
PostgreSQL connectivity remain `NOT_CONFIGURED` until a separately approved
runtime smoke check is performed.

Generate a non-overwriting ordered plan for review:

```bash
python3 -m runtime_orchestration plan \
  --project-root /home/manal/UrbanTransit-IQ \
  --dataset-root /absolute/path/to/certified-package \
  --marker /absolute/path/to/authoritative-marker \
  --certification-adapter dataset_owner_adapter:adapter \
  --dataset-version <attested-version> \
  --hdfs-root /urbantransit \
  --output /absolute/path/to/evidence/runtime-plan.json
```

Additional explicit feature manifests, ML output directories, recommendation
request and result paths may be supplied to display existing module
invocations. The HDFS publication entry is generated in dry-run mode and
targets `/urbantransit/raw/<dataset-version>`. Plan output is created
exclusively; it will not overwrite an existing file. `run --plan ...` is
dry-run only unless `--execute` is explicitly supplied. HDFS availability
remains `NOT_CONFIGURED`, so no publication or cluster work is authorized.
The runner validates certification and preflight again, does not invoke a
shell, uses an allowlist, refuses overwrite/format/cleanup commands, and stops
at the first blocked or failed stage.

## Prepared feature and comparison commands

The independent Pandas feature CLI accepts only a package root with `raw/`
tables, requires the dataset-owner adapter, uses the existing chronological
splits and existing feature implementation, and writes an exclusive,
versioned run directory. Each table read is capped at 100,000 rows by default;
only CSV and JSONL source files are supported by this bounded CLI. The run
manifest/evidence describe execution and hashes but do **not** certify the
result as an ML feature package. Full-scale materialization and downstream
feature certification remain pending.

```bash
python3 -m python_pipeline \
  --input-root /absolute/path/to/certified-package \
  --marker /absolute/path/to/authoritative-marker \
  --certification-adapter dataset_owner_adapter:adapter \
  --output-root /absolute/path/to/feature-runs \
  --run-id <unique-run-id> \
  --severity-thresholds-sec 0 60 180 300
```

The comparison command consumes successful, independently certified ML result
artifacts and their separate test-prediction files. It joins on exact test
`case_id`, verifies shared labels/intervals and dataset/task identity, requires
at least 100 unseen cases, and preserves per-case mismatches and numeric deltas.
Missing or uncertified inputs produce a machine-readable `NOT_READY` result.

```bash
python3 -m runtime_orchestration compare \
  --python-result /absolute/python-run/result.json \
  --spark-result /absolute/spark-run/result.json \
  --dataset-version <attested-version> \
  --output-root /absolute/path/to/comparison-runs \
  --run-id <unique-run-id>
```

## Preflight checks

The report contains `READY`, `MISSING`, `BLOCKED`, or `NOT_CONFIGURED` for:

- Python >=3.10; Java executable/version and `JAVA_HOME`.
- Hadoop/HDFS executable presence and local `core-site.xml` `fs.defaultFS`.
- `SPARK_HOME`, `spark-submit`, PySpark package presence, and a separate
  explicitly untested Spark/JVM compatibility check.
- Pandas, NumPy, scikit-learn, PyArrow, FastAPI and httpx.
- `psql`, psycopg/psycopg2 presence, PostgreSQL environment configuration and
  an explicitly untested database-connectivity check.
- Explicit certified package root/marker, required existing project entry
  points, and disk headroom against an operator-supplied approved minimum.

Package discovery does not import or initialize Spark/ML/database runtimes.
The preflight does not query HDFS or PostgreSQL. Database configuration is
reported as present/incomplete only; secret values are never returned.

## Repository-supported stages and gaps

The plan preserves all mandatory phase positions:

| # | Stage | Existing support / current blocker |
|---:|---|---|
| 1 | Certified dataset gate | Adapter interface is prepared; authoritative certification verifier/schema remains pending. |
| 2 | Environment preflight | `python -m runtime_orchestration preflight` is implemented. |
| 3 | HDFS availability | HDFS CLI/config can be detected, but no safe service probe is implemented or run. |
| 4 | HDFS directories | `hdfs_scripts/prepare_urbantransit_dirs.sh` runs `hdfs dfs -mkdir -p`; still gated on HDFS availability. |
| 5 | Certified publication | Versioned destination, explicit preflight, exclusive `mkdir`, non-forcing `-put`, and dry-run are prepared; actual HDFS publication is blocked until service availability is approved. |
| 6 | Spark schema ingestion | `spark_jobs.pipeline` calls typed `spark_jobs.ingest.read_certified_tables`; there is no confirmed cluster `spark-submit` application resource/command. |
| 7 | DQ/cleaning | `spark_jobs.quality.apply_hooks` is bundled with the pipeline; no separate execution CLI. |
| 8 | Spark integration | `spark_jobs.integration` and `spark_sql/integration.sql` define logic, but SQL expects temporary views and is not a standalone ingestion command. |
| 9 | Partitioned Parquet | Spark outputs use dataset/run namespaces, preflight absence checks, and `errorifexists` where writer surfaces permit; feature writer remains guarded by the pipeline's complete destination preflight. |
| 10 | Spark features | Feature functions remain bundled in `spark_jobs.pipeline`; all declared outputs are collision-checked before any writes. |
| 11 | Independent Python features | Thin CLI, adapter gate, bounded CSV/JSONL reads, exclusive versioned output, provenance manifest, and shared evidence bundle are prepared; production scale is unverified. |
| 12–13 | Spark/Python ML | `python -m ml_execution --engine spark|python --manifest ... --output ...` exists; requires separate certified per-engine feature manifests, new output directories and runtime evidence. Spark/JVM compatibility remains unchecked. |
| 14 | Spark/Python comparison | CLI is prepared for certified independent result/prediction artifacts; actual comparison requires at least 100 shared unseen test cases. |
| 15 | Analytics/recommendations/what-if | `python -m recommendation_engine recommendations|what-if --manifest ... --request ... --output ...` exists; certified analytics and separate request artifacts are required. A shared analytics-result publication runbook is absent. |
| 16 | PostgreSQL migration/readiness | No migration CLI, driver/server evidence or runtime health check; PostgreSQL was explicitly out of scope. |
| 17 | Backend API readiness | Deployable ASGI composition and persistent auth repository remain deployment blockers; backend/frontend were explicitly out of scope. |
| 18 | Evidence capture | Spark `EvidenceLogger` is stage-local. This runner defines ordered JSONL execution records and stdout/stderr log contracts; no production evidence is generated here. |

The Spark module parsers are known, but a verified cluster submission resource
and deployment composition remain unresolved. The orchestrator does not treat
`spark-submit ... -m spark_jobs.*` as a valid command.

## Runner and evidence contract

Execution is serial and uses argv arrays with `shell=False`. Only known module
entry points and HDFS scripts are allowlisted. The runner requires an
adapter-attested package, a fully READY preflight,
unique contiguous ordered stages, a new evidence directory outside the
certified input, and absent declared outputs. It rejects `raw_data` and
protected evidence paths, destructive commands (`rm`, `format`, overwrite,
force flags), existing outputs, and any failed stage. It does not invoke HDFS
checks to guess that remote outputs are absent.

For each attempt it creates `stages.jsonl` exclusively, with stage index/name,
status, argv, dataset version, inputs/outputs, UTC start/end, elapsed seconds,
return code, safe reason and log references. Executed stages receive exclusive
`NN-stage.stdout.log` and `NN-stage.stderr.log` files; common secret assignments
are redacted. Existing evidence directories/files are never overwritten.
Blocked stages stop later stages and are recorded; failed mandatory commands
stop the run and mark later stages blocked.

No command in this document has been run against the production dataset. Fixture
tests use temporary directories, mocked dependency probes and a fake process
executor only.
