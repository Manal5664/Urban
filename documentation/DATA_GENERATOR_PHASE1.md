# UrbanTransit IQ dataset generator — Phase 1

Phase 1 implements the deterministic generator and its smoke validation path.
It does **not** run the approved production-scale generation, HDFS ingestion,
Spark processing, or model training.  A production-only target gate is
implemented for a later run, but production remains blocked by the metadata preflight findings in
[PREPRODUCTION_REVIEW.md](PREPRODUCTION_REVIEW.md). Measured counts and
independent cleaning are subsequent acceptance tasks, not pre-generation evidence.

## Safety and entry points

The generator uses only `python3` and the Python standard library.  The default
profile is smoke-only and writes below `sample_data/smoke/` (or an explicitly
supplied temporary directory).  A production profile is guarded by
`--allow-production` and is not used by the phase-1 smoke command.

```bash
python3 -m data_generator.generate \
  --profile smoke \
  --output sample_data/smoke \
  --force \
  --timestamp 2026-09-24T00:00:00Z

python3 -m data_generator.validate sample_data/smoke
```

`--force` only replaces a directory carrying the generator's
`.uti_dataset_output` marker.  The generator refuses to overwrite an unmarked
directory.  CSV output uses a header, UTF-8, RFC4180 quoting, and the explicit
`\N` null token.  GPS and context tables also have JSONL mirrors with JSON
`null` values.

The generator streams fact rows through `data_generator/writers.py` and rotates
shards at `chunk_rows`; it does not build a 2.4-million-row journey or ticket
list.  The compact trip specification envelope is the only operational
orchestration structure retained by the current implementation.  A later
production run must still be measured for VM disk and memory before approval.

## Module layout

- `config.py` — approved dates/splits, smoke and production target profiles,
  configuration digest, and disk/run safety settings.
- `seeds.py` and `ids.py` — independent deterministic substreams and
  namespace/SHA-256 business, operational-departure, trip, and source-row IDs.
- `schemas.py` and `writers.py` — dictionary-aligned headers, type metadata,
  raw envelope fields, streaming CSV/typed JSONL mirrors, checksums, and shard
  rotation.
- `generators/network.py` — fictional routes, stops, versioned patterns, and
  ordered route stops.
- `generators/service.py` — calendars, exceptions, recurring schedules, and
  stop offsets.
- `generators/vehicles.py`, `passengers.py` — synthetic dimensions and private
  generator-only profiles.
- `generators/trips.py` — stable operational departures, plan revisions,
  smoke fixtures, and the explicit production target branch.
- `generators/stop_events.py` — coherent actual times, assignments, passenger
  conservation, replacement handovers, delays, journeys, tickets, requests,
  and GPS observations.
- `generators/journeys.py` — unserved-demand and canonical movement-count
  helpers.
- `generators/context.py` — observable fictional events and disruptions.
- `generators/quality_conditions.py` — controlled raw defects, G5 capability
  disposition, and sparse expected audit fixtures.
- `production_gate.py` — executable post-generation target-count and
  post-processing-statistics gate; not run in Phase 1.
- `validation/` — schema, relationship, count/physics, temporal, transport/
  DQ, and leakage checks.

## Smoke package

The package contains all 21 transport tables, including the SRS-named tables
and the approved operational extensions.  Metadata includes schemas, source
and generation manifests, split/prediction cases, value revisions, scenario
coverage, rule catalog, G1/G2/G3 fixtures, lifecycle/capability rules, sparse
DQ expected issues/outcomes, and reconciliation.

`Passenger_Journeys` is the canonical movement view.  The manifest and
validator report usable journey and ticket views separately and use the
larger distinct view once; they never add the two tables together.

## Deliberate fixtures

The smoke profile seeds representative examples of all 21 difficult conditions
and all 16 mandatory quality families.  The private injection manifest and
`dq_expected_*.csv` files are explicitly test-oracle/validation fixtures.  They
are not represented as completed independent Spark/Python cleaning results.
Exact duplicate physical ticket/trip copies remain in raw and are separated by
physical `source_row_id` values.

G1 replacement rows use distinct arrival and departure assignments and a
separate transfer ledger.  A second smoke replacement explicitly exercises an
unresolved handover assignment while retaining the transfer trace.  G2 retains
old and current plan versions under one `operational_departure_id`.  G3 retains
original and corrected value revisions with different availability times.  G4
enforces the ordinary load equation and terminal/origin rules; corrupted
observations are marked in the oracle and are not treated as clean truth.  G5
retains valid movement/OD/timing evidence when optional request/ticket/vehicle
metadata is unavailable, while withholding the dependent capability; it also
contains an explicitly quarantined unresolved-core-trip field group.

## Validation

`python3 -m data_generator.validate <root>` writes
`validation/validation_report.json` and exits non-zero on any failed check.  A
successful phase-1 smoke run is expected to report zero failed checks.  The
validator also checks typed JSONL values and canonical source-row provenance.
For a future production package, `production_gate.py` additionally requires
measured target counts and post-processing movement statistics; that gate is
not executed by the smoke command.  The standard-library test suite is run
with:

```bash
python3 -m unittest discover -s tests -v
```

The current phase does not claim SRS minima, HDFS/Spark evidence, model
metrics, production resource measurements, independent cleaning evidence, or
full-lifecycle accepted/quarantine processing.  Those remain later tasks
requiring separate approval and execution evidence; the smoke result is not a
production-readiness decision.  The recovery preflight establishes fleet feasibility and quantifies calendar
and demand/duplicate-budget failures. Those genuine pre-generation failures
block production; independent DQ outputs, measured counts and full as-of feature
validation remain subsequent acceptance tasks. See the pre-production review.
