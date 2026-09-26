# Production generation interrupted — 2026-09-25

**NOT READY FOR HDFS/SPARK INGESTION**

The single production run was deliberately interrupted (exit 130) after a new physical GPS assignment-time check exposed incorrect replacement attribution. No runtime exception or disk failure was observed. The output is incomplete and must not be ingested as the production dataset.

## Cross-check and corrections

- Initial Git status was clean and HEAD exactly `69d4847f780fae781173d34bb5421994e0a3e7d5`. `raw_data/` contained only `.gitkeep`.
- The official ignored SRS PDF remained unchanged: SHA-256 `841d9c1969e9849d63d3f2fb52292f2a817d4c8111605ab8781aea68a88fb999`. Official dataset minima were read directly; no new SRS requirements were introduced.
- Free disk immediately before the command: 73,881,026,560 bytes, above the unmodified 55 GiB gate. Preflight passed 11/11, including exact budget/calendar checks and fleet feasibility (229/320 peak reservations).
- Before generation, fixed the production passenger allocator resetting its cursor every trip, which repeatedly selected a small subset of the population. The focused regression verifies full test-pool coverage, non-overlap, and deterministic repeatability. Smoke allocation behavior remains unchanged.
- During generation, the bounded checker's smoke trial found GPS points at stop 3 assigned to the outgoing replacement vehicle whose duty starts at stop 5. The partial production data independently confirms **120** such interval violations. Example: GPS observation `2025-01-01T01:24:19Z` attributed to an assignment beginning `2025-01-01T01:47:10Z`.
- Stopped at **2,975 logged departures**. No generated rows were patched, no second production run started, and no output was deleted.
- Corrected source GPS attribution to use the authoritative stop event's arrival/departure assignment. The regression failed in both smoke and production paths before correction and passes afterward. This source correction does not repair the preserved partial output.
- Added a bounded SQLite production acceptance checker and a read-only partial inventory script. The full checker requires a completed manifest and was **not run on this incomplete production package**. Its smoke trial exercised relationship/flow queries; smoke is not production-scale acceptance evidence.

## Command and identity

```bash
/usr/bin/time -v -o reports/production_generation_time.txt python3 -m data_generator.generate --profile production --output raw_data/production-v1 --allow-production --seed 20260924 --timestamp 2026-09-25T00:00:00Z > reports/production_generation.log 2>&1
```

- Profile: `production`; dataset version: `production-v1`; seed: **20260924**.
- Fixed timestamp: `2026-09-25T00:00:00Z`.
- Run ID: `RUNf8a9da32ff898cda7dc30dbe3d1a2ccc7df94a5d1246dce2e9629382c6c28035`.
- Configuration hash: `4174afcb1b4d276cf64bf1a9b3d436ab5ef6b92a2f7822a24dfc1f768da21d23`.
- Source includes the passenger-cursor correction on top of the checkpoint. The subsequent GPS correction was made after interruption.
- Approximately **260.44 seconds** from command log creation to last progress (not a successful generation duration). `/usr/bin/time` was interrupted with the process group, leaving its file empty; exact completion duration and maximum RSS are unavailable.

## Physical partial inventory

These are parsed **raw CSV rows**, not certified canonical/accepted counts. Buffered records were not all flushed when the process group was interrupted, including dimension tails. Do not treat the differences as completed generator target failures.

| Table | Physical rows |
|---|---:|
| context_events | 179 |
| delays | 16,324 |
| demand_requests | 51,391 |
| gps_events | 11,681 |
| passenger_counts | 58,227 |
| passenger_journeys | 51,392 |
| passenger_transfer_events | 1,204 |
| passengers | 79,998 |
| route_patterns | 318 |
| route_stops | 6,395 |
| routes | 118 |
| schedule_stop_times | 51,980 |
| schedules | 2,595 |
| service_calendar | 11 |
| service_exceptions | 204 |
| stops | 643 |
| tickets | 63,389 |
| trip_stop_events | 60,921 |
| trip_vehicle_assignments | 6,094 |
| trips | 3,056 |
| vehicles | 314 |

- Physical operational identities: **2,979**; current non-cancelled trip rows: **2,921**. These counts differ from the last progress line because output was interrupted between progress messages and buffers.
- Raw duplicate ticket copies measured by repeated ticket IDs: **11,999**, short of 12,000; final controlled DQ04 copy was not emitted.
- Service-date span: **2025-01-01 through 2025-01-14**.
- Total output: **858,068,095 bytes** (818.32 MiB), **38 files**, including **36 raw CSV shards**.
- Remaining disk at inventory: **72,729,677,824 bytes** (67.73 GiB).
- Targeted partial checker: **1 passed, 1 failed** (CSV record shapes pass; GPS assignment-time integrity fails with 120 violations).
- SHA-256 values and actual counts for every physical CSV shard are recorded in `reports/production_interruption.json`. There is **no completed generation manifest**, so manifest reconciliation and full checksum certification are unavailable.

## Final verification

- Final full existing/focused test suite plus both new regressions: **29 passed, 0 failed** (125.689 seconds), `reports/production_final_tests.txt`.
- Post-correction production preflight: **11 passed, 0 failed**, `reports/production_preflight.json`.
- Compilation and `git diff --check`: passed.
- Full physical production acceptance validator: **not run / incomplete**, because no final manifest exists. The partial inspection is separately **1 passed, 1 failed**.

## Acceptance status and next action

The full movement, passenger-evidence, delay, history, exact departure, request and duplicate budgets are not met by the incomplete output. Dimension raw counts exceed the respective SRS numeric minima, but complete linked usable coverage is not certified. Tickets and journeys were not added together.

Full PK/FK, passenger conservation, occupancy, replacement, calendar, plan-version, realistic-condition and DQ acceptance checks remain uncompleted for production. The sparse final DQ catalog, final reconciliation and manifest were not produced. The GPS violations are an unintended defect, not declared DQ fixtures. No HDFS/Spark/Parquet/ML/application status was marked complete.

The generator has **no resume/checkpoint support**. A later corrected run must start from a fresh output directory, or explicitly overwrite the marked partial directory through the generator after preserving any desired evidence. The disk gate must pass again. No restart was attempted in this task.

No commit, push, raw-data staging, package installation, system configuration change, HDFS or Spark execution occurred. Raw output and the official PDF remain ignored. Code fixes, validator scripts, tests and runtime evidence are uncommitted.
