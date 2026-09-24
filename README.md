# UrbanTransit IQ — TransitVerse Intelligence

Competition project foundation and Phase 1 deterministic dataset generator for
transit intelligence.

## Current implementation status

- The approved SRS and dataset design have been reviewed.
- A modular, deterministic synthetic dataset generator is implemented under
  `data_generator/`.
- The generator has a guarded smoke profile and an explicit, not-yet-executed
  production target profile.
- Smoke validation checks schemas, typed JSONL mirrors/provenance,
  relationships, physics, chronology, availability/leakage, difficult-condition
  coverage, sparse DQ fixtures, and manifest reconciliation.
- A production-only target-count gate is implemented for later use, but the
  production profile remains unexecuted and not yet accepted. A production metadata preflight now checks vehicle duties, dates, calendars,
  demand formulas and disk headroom. Calendar validity, exact movement/duplicate budgets and fleet feasibility
  now pass the focused preflight. Independent
  cleaning and full ML leakage evidence belong to later processing.
- HDFS ingestion, Spark processing, Parquet publication, models, and the web
  application are not implemented or run in this phase.
- No system, Hadoop/HDFS, Spark, Java, or SSH configuration was changed.

## Dataset generation (Phase 1)

The default command creates only the isolated smoke package:

```bash
python3 -m data_generator.generate \
  --profile smoke \
  --output sample_data/smoke \
  --force \
  --timestamp 2026-09-24T00:00:00Z
```

Validate the generated package:

```bash
python3 -m data_generator.validate sample_data/smoke
```

Run the standard-library tests:

```bash
python3 -m unittest discover -s tests -v
```

The generator refuses to overwrite an unmarked output directory.  The
`--allow-production` flag is a later safety opt-in and is intentionally not
used for the smoke run.  Do not use the smoke output as evidence of the SRS
production minima or of HDFS/Spark/model completion.  The current Phase 1
smoke result is a generator/validation fixture, not production-readiness or
independent-cleaning evidence.

See [Phase 1 generator notes](documentation/DATA_GENERATOR_PHASE1.md) for the
module layout, output contract, G1–G5 fixtures, movement-count rule, and
resource-safety notes.

## Documentation links

- [Official SRS traceability checklist](MASTER_SRS_CHECKLIST.md)
- [Dataset architecture](documentation/DATASET_ARCHITECTURE.md)
- [Data dictionary](documentation/DATA_DICTIONARY.md)
- [Data generation and quality plan](documentation/DATA_GENERATION_PLAN.md)
- [Development log](DEVELOPMENT_LOG.md)
- [AI usage declaration](AI_USAGE.md)
- [Dependency placeholder](requirements.txt)

Run the lightweight preflight (no production facts):

```bash
python3 -m data_generator.preflight
```

See [blocker fixes and current readiness](documentation/PRODUCTION_BLOCKER_FIXES.md),
[historical pre-production review](documentation/PREPRODUCTION_REVIEW.md), and
[preflight evidence](reports/production_preflight.json). A failed preflight exits
nonzero and blocks production before output creation. The current validator is
smoke-only; it must not load production fact tables.
