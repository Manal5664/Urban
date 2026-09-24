# Three production blocker fixes

This supersedes only the three blocker findings in `PREPRODUCTION_REVIEW.md`.
No production facts were generated. Approved targets and the official SRS were
not changed. No HDFS/Spark/Parquet, independent cleaning, ML or application work
was performed.

## Calendar-compatible planning

The 2,600 production schedule templates now include SPECIAL, WEEKDAY, WEEKEND
and SEASONAL calendar variants. Trip selection filters by schedule validity,
calendar date bounds, weekday flags and date-specific exceptions. REMOVE takes
precedence; ADD can enable an otherwise inactive weekday within valid bounds.
If no compatible template exists, planning fails instead of dropping service.
Stable date/slot operational departure IDs and plan-version relationships remain.

Metadata simulation finds zero inactive-calendar departures, exactly 120,000
operational departures and 117,600 operated trips. Tests independently check
calendar flags/exceptions, REMOVE/ADD behavior, schedule validity, count
preservation, stable operational IDs and repeated planning.

## Exact movement allocation and representations

`movement_budget.py` uses integer largest-remainder apportionment with stable
business-key ties. Original demand formulas remain the weights, retaining
route, direction, season, weekday/weekend, peak and event effects. Overcrowded,
low-demand and replacement trips retain their baseline boarding budgets
(786,966 protected movements); 95,495 other operated trips receive the remaining
budget proportionally, with at least one boarding each. Cancelled trips get zero.
A second apportionment allocates each trip's budget only to observed stops with
an observed downstream destination. Existing alighting and transfer logic remains
responsible for conservation. The emitter fails if journey count differs from
the trip allocation.

Calculated default-production budgets, before later independent cleaning:

| Quantity | Count / representation rule |
| --- | --- |
| Canonical movements | 2,400,000, represented by Passenger_Journeys once |
| Base ticket rows | 2,399,999; one valid movement deliberately has no ticket |
| Served request rows | 2,399,999; one valid movement deliberately has no request |
| Unserved/abandoned request rows | Exactly 100,000 |
| Total request rows | 2,499,999; the missing-request fixture explains the difference from approximately 2,500,000 |
| Raw journey rows | Expected 2,400,001 including one quarantined G5 representation, not another movement |
| Raw ticket rows | Expected 2,412,004: base tickets + 12,000 duplicate copies + five quarantined fixture rows |

These are formulas/preflight projections, not measured production acceptance.
Tickets are not added to journeys to inflate canonical movements. Budget rules
are also written into `metadata/production_movement_budget.json` on a future run.

## Streaming ticket copies

The first 11,999 emitted base tickets each receive one streamed business-identical
copy. The controlled DQ04 fixture supplies the remaining copy: total 12,000,
not 12,001. The raw writer assigns distinct physical source identities, including
across shard rotations. Copy and original retain the same business ticket ID,
transaction reference, payload and payload hash.

Only the current ticket is retained. Each copy's survivor source ID, copy source
ID, ticket ID, stable injection ID, DQ04 rule, expected duplicate disposition and
zero movement increment stream to `metadata/production_ticket_duplicates.csv`.
`production_ticket_duplicate_budget.json` reconciles streamed and controlled
copies. These extra representations are included in the generator's expected
reconciliation as deduplicated, not accepted unchanged. Sparse controlled-fixture
metadata stays separate from the streamed production duplicate ledger. No
independent cleaning execution is claimed.

## Focused verification

- Blocker tests: 11 passed, 0 failed.
- Existing vehicle/guard regressions: 8 passed, 0 failed.
- Existing smoke-generation/validation test: 1 passed, 0 failed.
- Total focused tests: 20 passed, 0 failed; the full suite was not run.
- Production metadata preflight: 11 passed, 0 failed; 83.44 seconds,
  210,904 KiB maximum RSS. No large fact tables emitted.
- Fleet peak: 229 reserved vehicles in the unchanged 320-vehicle fleet, with
  the existing 60-minute buffer and availability checks.
- Free disk observed by preflight: 74,479,419,392 bytes (about 69.36 GiB), above
  the 55 GiB raw-generation gate.
- `git diff --check`: passed.

Evidence: `reports/production_preflight.json`. Actual production counts and
processing evidence remain later tasks. No new genuine pre-production blocker
was identified by these focused checks.

READY FOR FULL PRODUCTION GENERATION
