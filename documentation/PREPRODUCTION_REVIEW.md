# Pre-production recovery review — 2026-09-24

> Follow-up: the three confirmed pre-production blockers below were subsequently
> fixed. See [PRODUCTION_BLOCKER_FIXES.md](PRODUCTION_BLOCKER_FIXES.md) and the
> updated preflight JSON for current readiness. This document retains the prior
> review findings as historical evidence.

This review preserves the uncommitted OpenCode Phase 1 implementation above
`6a980815021f0fdcd2d917c14f30af8f52101466`. No production facts, HDFS/Spark,
Parquet, cleaning pipeline, ML pipeline, commit, push, or system change was run.

## Inherited work

Modified tracked files: `.gitignore`, `AI_USAGE.md`, `DEVELOPMENT_LOG.md`,
`MASTER_SRS_CHECKLIST.md`, `README.md`, `documentation/DATASET_ARCHITECTURE.md`,
`documentation/DATA_DICTIONARY.md`, `documentation/DATA_GENERATION_PLAN.md`,
`requirements.txt`.

Untracked inherited source: `data_generator/{__init__,config,generate,ids,
production_gate,schemas,seeds,validate,writers}.py`; `generators/{__init__,common,
context,delays,gps,journeys,network,passenger_counts,passengers,quality_conditions,
service,stop_events,trips,vehicles}.py`; `validation/{__init__,common,count_checks,
leakage_checks,relationship_checks,schema_checks,temporal_checks,transport_checks}.py`;
`tests/test_data_generator.py`; `documentation/DATA_GENERATOR_PHASE1.md`.
Ignored smoke evidence and bytecode existed. `raw_data/` held only `.gitkeep`.
The official SRS is ignored, not tracked, and was not edited. Its SHA-256 before
review was `841d9c1969e9849d63d3f2fb52292f2a817d4c8111605ab8781aea68a88fb999`.
There is no committed PDF baseline against which to assert historical identity.

## Focused changes in this review

Added `data_generator/generators/vehicle_duties.py`, `data_generator/preflight.py`,
`tests/test_vehicle_duties.py`, this report, and `reports/production_preflight.json`.
Changed inherited `generators/{common,journeys,stop_events,trips}.py`, `generate.py`,
`validate.py`, and `writers.py`. Updated README, Phase 1 notes, development log,
and AI declaration to distinguish pre-generation blockers from later acceptance.
The inherited test file and approved targets are unchanged.

The production allocator chooses stable vehicle-ID order from AVAILABLE,
commissioned, non-retired vehicles. It checks both earlier and later reservations,
including a 60-minute project buffer (15 turnaround + 45 synthetic deadhead).
This is a declared synthetic operating assumption, not an SRS requirement or
road-network routing model. It reserves the whole scheduled/observed envelope
for both replacement vehicles, keeping the original planned vehicle free through
the trip end. Superseded plans are historical alternatives. Cancelled current
plans are conservatively reserved too. Actual G1 segments remain contiguous,
with separate arrival/departure assignments and distinct replacement capacity.
Unknown attribution remains unknown in exported fixture facts.

Timing reservations cover scheduled start minus 300 seconds through scheduled
end plus 1,800 + 12 × stop count seconds, exceeding the present timing formulas.
The simulator fails if any actual timestamp escapes this envelope. Reservations
are pruned only across chronological service dates, retaining overnight duties.
Memory is bounded by the fleet and nearby duties. Smoke allocation is preserved
so inherited evidence remains reproducible. Production allocation is integrated
into materialization, not merely tested in a disconnected preflight.

Preflight uses dimensions, 120,000 compact trip specifications, shared demand
formulas and fleet reservations. It creates no passenger dimensions or transport
fact files. Its exit code is nonzero on a failed prerequisite, and production
orchestration checks it before creating output. All report counts are projections
before sparse DQ fixtures, not post-generation accepted/raw measurements.

## Verification and feasibility

Inherited suite: 8 passed, 0 failed. Extended suite: 16 passed, 0 failed.
After the allocator eligibility-cache optimization, its focused tests were rerun:
8 passed, 0 failed. Compilation and `git diff --check` passed.
Inherited smoke and freshly generated smoke: each 270 passed, 0 failed.
All 23 fresh raw CSV/JSONL hashes match the inherited files. With matching
seed, fixed timestamp and force option, the fresh deterministic manifest hash is
`4cf6553b86aeec1d9c9cb589f34a03325a7741146dd135b736fefe2ab7ead96a`,
exactly matching the handoff. The original package
has 21 tables and 16,772 raw CSV rows, including 3,056 journeys (3,055 usable),
3,060 tickets (3,054 usable), 1,618 counts, 482 delays, 923 GPS observations,
282 transfers, 3,630 demand requests, and 297 trip rows. Canonical movements are
3,055, counted once. The oracle reconciles 18 fixtures as 15 quarantined,
2 deduplicated and 1 accepted-flagged; these are not independent cleaning results.

Final preflight: **7 passed, 3 failed, 10 checks**; exit status 1 is intentional.
Measured runtime: 70.78 seconds, maximum RSS 199,372 KiB.
Use the final machine-readable report for exact preflight results and projections.
The fleet simulation reserves at most 229 vehicles, below the 318 initially
eligible vehicles (319 after July 2025), out of the unchanged 320-vehicle target.
Repeated simulations produced the same allocation digest
`49f6cf2b6b3ccf47b130727fdba2a42b8fe603d673af477c5594a67be8cc9189`.
There is no demonstrated 320-vehicle mathematical infeasibility.

History and split metadata cover 18 full months: 2025-01-01–2026-06-30;
TRAIN Jan–Dec 2025, VALIDATION Jan–Mar 2026, TEST Apr–Jun 2026.
Operational departures project to 120,000 and operated departures to 117,600.
Dimensions preserve 80,000 configured passengers, 120 routes, 650 stops,
320 vehicles, 320 patterns, 12 calendars, 2,600 schedules and 180 context events.
Approximate-count differences are visible: 6,398 route stops, 51,981 schedule
stop times, 123,003 plans, 245,403 assignments, 2,459,060 planned stop events,
and 2,351,249 observed stop events/counts. GPS projects to 470,401 and
transfers to 56,136. Delayed trips alone imply at least 599,853 delay rows,
well above the approximate 300,000 design target; other delay rows remain
unestimated. These differences also need budget/design reconciliation, not
fabricated exact-count acceptance. These are not production passes.

### Remaining genuine pre-generation failures

- 27,720 scheduled departures select inactive calendar dates. The production
  branch selects CAL_SPECIAL schedules without applying calendar eligibility;
  Sunday flags and REMOVE exceptions matter. Repair must preserve 120,000
  departures and approved service, not drop the conflicting departures.
- Shared boarding formulas project 2,865,522 canonical journeys, 2,865,521 base
  ticket rows and 2,965,521 requests including exactly 100,000 unserved requests.
  No exact 2,400,000 movement budget is implemented. Fix demand allocation while
  preserving conditions and conservation, not by truncating rows after writing.
- Approved configuration includes 12,000 duplicate ticket copies, but injection
  code emits only one DQ04 copy. The production duplicate budget is absent.

These failures were quantified, not repaired by changing approved targets or
silently redefining service. Production remains guarded. The inherited exact
post-generation gate also conflates approximate design targets, raw fixture rows,
and accepted metrics; its metric semantics must be resolved before acceptance.
It must not be represented as proof that production counts have already passed.

## Resource assessment

Environment: 4 CPUs and approximately 7.8 GiB visible RAM. Current free disk is
recorded in the JSON report (about 69.4 GiB on a 98 GiB filesystem).
At approved targets, smoke bytes/row imply 27.30 GiB raw, including GPS/context
JSONL and raw-record provenance duplication. This is an estimate, not measured
production. Header overhead is included conservatively. The currently excessive
movement formula would increase that estimate.

Planning allocations: 40.95 GiB raw upper allowance (1.5×), 2.73 GiB generation
temporary allowance (streaming does not actually require a full staging copy),
6.82 GiB later bounded-validation working disk, 54.60 GiB for two uncompressed
intermediate copies, and 10 GiB safety margin. Total all-at-once planning need
is about 115.10 GiB, above available disk. Raw generation alone with temporary
allowance and margin is about 53.68 GiB; the production writer now requires
55 GiB free instead of the unsafe inherited 5 GiB floor. This does not reserve
space or guarantee future processing will fit. Stage later intermediates and
measure their sizes; no disk modification was performed.

Fact writers stream and rotate every 25,000 rows. Only per-trip fact bundles
are retained. Unserved requests now stream instead of retaining 100,000 row
dictionaries, and materialized trip rows are released after writing. Small
dimensions, 120,000 specs and prediction-case metadata remain resident; these
are not million-row fact copies. Final preflight peak memory was 199,372 KiB (about 194.7 MiB), not a
measurement of full generation.
Production source references are capped at 1,000 per table, preserving early
operational fixture provenance even after large passenger dimensions.

The inherited validator repeatedly loads complete tables and builds indexes.
It is now explicitly smoke-only and rejects production before table loading.
A bounded production validator belongs to post-generation processing; building
Spark/Python analytics or full cleaning is outside this review.

## DQ, leakage, formats and SRS interpretation

Raw rows retain business identity, physical source identity, file/ordinal,
serialized original payload and digest; the private oracle retains fixture
identity, original values, mutation, rule and expected disposition. Event,
ingestion, correction and value-availability fields exist, with G3 revisions
and prediction-cutoff fixtures. Generator provenance is sufficient to begin
independent cleaning and as-of feature work later. No full cleaning or ML
leakage validation is claimed.

Official SRS Step 2 says teams must demonstrate HDFS, CSV, JSON and Parquet,
and that at least one large analytical dataset must use Parquet. It does not
require a JSON duplicate of every table. Existing typed GPS/context JSONL are
real transport datasets; JSON metadata alone is not the demonstration.
HDFS ingestion, Spark, processed Parquet and storage evidence remain later work.

Official SRS §1.9 Interface Requirements → §1.9.1 Hardware (printed p.42) lists:
“Intel Core i5/i7 Processor or higher”; “8 GB RAM or higher”;
“Color SVGA monitor”; **“500 GB Hard Disk space”**; “Mouse and Keyboard”.
The 500 GB line is a listed hardware-interface item, with no explicit modal,
free-space definition, VM-volume scope, or statement that raw generation must
occur on a 500 GB volume. It warrants documented hosting applicability in final
submission, not automatic non-compliance or an unconditional raw-generation
blocker. Actual resource sufficiency is separately assessed above.

Post-generation facts still required: measured counts and canonical uniqueness,
raw checksums, independent Spark/Python accepted/quarantine reconciliation,
production temporal/relationship/duty validation, full as-of feature leakage
checks, HDFS/Spark/Parquet evidence, and measured processing resource usage.

NOT READY FOR FULL PRODUCTION GENERATION
