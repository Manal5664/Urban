# Development log

## Foundation entry

- **Date/time:** 2026-09-24T12:37:55+05:00 (Asia/Karachi)
- **Work completed:** Initialized Git; created the requested project folders, directory placeholders, and six root foundation files.
- **Dataset changes:** None; no datasets generated.
- **Data-quality problems:** Not assessed; no datasets available.
- **Spark failures:** Not assessed; no Spark jobs run.
- **Model errors:** Not assessed; no models created or run.
- **Modifications made:** Project foundation only; no system or Hadoop/HDFS, Spark, Java, or SSH configuration changes.
- **Testing completed:** Documentation and structure verification only; no application tests exist yet.
- **Performance improvements:** None; no performance measurements performed.
- **Git commit/reference:** Uncommitted foundation; no commit created.

## Reusable entry template

- **Date/time:** TODO (YYYY-MM-DD HH:MM:SS, timezone)
- **Work completed:** TODO
- **Dataset changes:** TODO
- **Data-quality problems:** TODO
- **Spark failures:** TODO
- **Model errors:** TODO
- **Modifications made:** TODO
- **Testing completed:** TODO
- **Performance improvements:** TODO
- **Git commit/reference:** TODO

## Phase 1 dataset generator entry

- **Date/time:** 2026-09-24T20:13:30+05:00 (Asia/Karachi)
- **Work completed:** Re-ran the modular deterministic generator after independent review and fixed the Phase 1 smoke-path defects: exact production unserved-request budgeting, replacement-flow destination safety, explicit G1 unknown-assignment and G5 unresolved-core fixtures, typed/provenance-checked JSONL mirrors, output-path-invariant logical configuration, deterministic manifest-content hashing, and an executable production target gate. Added regression coverage and updated design/status documentation.
- **Dataset changes:** Generated only `sample_data/smoke/`; no production-scale data and no `raw_data/` output. The package contains 21 transport tables, 3,056 passenger-journey rows (3,055 usable canonical journeys), 3,060 raw ticket rows, 1,618 passenger-count rows, 482 delay rows, 923 GPS rows, and 282 transfer rows. The canonical movement view is `Passenger_Journeys`: 3,055 usable journey movements and 3,054 usable ticket views, counted once with 3,054 overlap. The package is 36,599,644 file bytes (`du -sh`: 36M; 44 files, including 23 raw CSV/JSONL files).
- **Data-quality problems:** Seeded 18 sparse controlled fixtures: all 16 mandatory DQ families, explicit C01 missing-required-value, and one quarantined G5 unresolved-core-trip capability fixture. The expected reconciliation is 15 quarantined rows, 2 duplicate removals, and 1 accepted-flagged journey; these are generator validation/oracle fixtures, not completed independent cleaning-pipeline results.
- **Spark failures:** Not assessed; HDFS and Spark were not run in this phase.
- **Model errors:** Not assessed; no models or predictions were created or run.
- **Modifications made:** Updated `data_generator/`, `tests/test_data_generator.py`, `documentation/DATA_GENERATOR_PHASE1.md`, `documentation/DATASET_ARCHITECTURE.md`, `documentation/DATA_DICTIONARY.md`, `documentation/DATA_GENERATION_PLAN.md`, `MASTER_SRS_CHECKLIST.md`, `README.md`, `AI_USAGE.md`, `requirements.txt`, `.gitignore`, and this log. No Hadoop/HDFS, Spark, Java, SSH, system package, Docker, or service configuration was changed.
- **Testing completed:** `python3 -m compileall -q data_generator tests` passed; `python3 -m unittest discover -s tests -v` passed 8/8 tests; final `python3 -m data_generator.validate sample_data/smoke` passed 270/270 checks with 0 failures. Two independent same-seed smoke generations produced identical SHA-256 digests for all 23 raw CSV/JSONL files and the same deterministic manifest-content hash; the final package matched that reference set.
- **Performance improvements:** Fact rows are emitted incrementally and writers rotate at `chunk_rows`. A measured fresh smoke generation used 7.44 seconds wall time and 122,244 KiB maximum resident memory; validation used 12.37 seconds and 118,520 KiB. The local volume is 98 GiB total with 70 GiB free, below the SRS's 500 GB hardware interface item; production memory/disk usage remains unmeasured and requires a separately approved resource check.
- **Git commit/reference:** The current Phase 1 changes remain uncommitted on top of two pre-existing foundation/design commits (`6a98081`, `58247f7`). No production, HDFS, Spark, model, or commit operation was performed.


## Pre-production recovery review — 2026-09-24

- Preserved the uncommitted OpenCode Phase 1 work and original ignored smoke evidence above `6a980815021f0fdcd2d917c14f30af8f52101466`.
- Added production vehicle-duty reservations and metadata-only preflight, source-reference retention per table, streamed unserved requests, release of materialized trip rows, a 55 GiB raw-generation disk floor, and rejection of production by the in-memory smoke validator.
- Tests: inherited 8/8; extended 16/16; final focused allocator/guard tests 8/8. Existing and fresh smoke validation each 270/270. All 23 raw files match inherited hashes; matching-options deterministic manifest hash is `4cf6553b86aeec1d9c9cb589f34a03325a7741146dd135b736fefe2ab7ead96a`. Compilation and whitespace checks passed.
- Preflight: 7 passed, 3 failed (10 total), exit 1. Fleet peak 229 reservations within 320 vehicles; stable allocation digest across runs. 70.78 seconds and 199,372 KiB max RSS. No production facts emitted.
- Remaining failures: 27,720 inactive-calendar departures, 2,865,522 projected movements versus 2,400,000, and 1 projected duplicate ticket copy versus 12,000. Approximate count differences, including delay lower bound 599,853 and 56,136 transfers, are documented for budget reconciliation.
- Resources: estimated approved-target raw 27.30 GiB; raw upper/temporary/margin about 53.68 GiB; all-at-once raw plus two intermediate copies and working allocations about 115.10 GiB. Actual free space about 69.37 GiB. No disk/system configuration changed.
- SRS §1.9.1 lists “500 GB Hard Disk space” without defining mandatory VM runtime/free-space scope; no automatic non-compliance finding. Cleaning, full ML leakage checks, HDFS/Spark and Parquet remain subsequent processing work.
- Evidence and file inventory: `documentation/PREPRODUCTION_REVIEW.md`, `reports/production_preflight.json`. `raw_data/` remains only `.gitkeep`; official PDF hash unchanged during review. No commit/push.
- Result: NOT READY FOR FULL PRODUCTION GENERATION.
