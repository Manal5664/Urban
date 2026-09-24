# UrbanTransit IQ data dictionary

Version 2 — 2026-09-24 — **proposed schemas only, no generated records or implemented constraints**. Read with [architecture](DATASET_ARCHITECTURE.md) and [generation plan](DATA_GENERATION_PLAN.md). The official SRS v1.0 PDF is the sole authority; MASTER_SRS_CHECKLIST.md is a derived tracker; these documents are implementation design; the physical schema, extensions and types below are project decisions supporting its requirements.

## Global contracts

- **PK** means logical primary key in accepted typed data. **FK** means a reference requiring existence and temporal compatibility. Raw data intentionally allows corrupt/missing/duplicate business keys. Raw `source_row_id` remains unique even when a business PK is duplicated. Do not use malformed values as accepted keys.
- `ID` = UTF-8 string, entity prefix plus deterministic 64-hex SHA-256 identity digest. `STR` = UTF-8 string; enums are constrained strings. `INT` = signed int64 unless noted. `DEC(p,s)` = fixed decimal. `TS` = UTC timestamp, microsecond precision. `DATE` = local service date. `BOOL` = boolean. Distances are km; durations/offsets are seconds; passenger counts are persons; fares are fictional PKR currency amounts unless source manifest declares another currency.
- Nullable `N` means required in accepted data; `Y` means legitimate null with the stated reason. Empty string is not null. Conditional nulls are specified explicitly. Raw can violate any of these; audit, do not silently coerce away evidence.
- All **21 transport tables** (sections 1–21) additionally carry the common provenance columns below. The two audit tables have their own explicit schema. Each canonical business PK is unique within its named snapshot; changed values retain immutable earlier revisions in quality/lineage storage keyed by (business_key, value_revision). Additional evidence references and their availability are retained in the affected-row audit. An unchanged valid row receives no individual audit outcome.
- Dates and effective ranges are half-open `[from,to)`; a null `valid_to` means open-ended. End-of-history sentinel, if needed for export, is `2026-07-01`, not midnight at the beginning of the last included day. “Active” business status is not a substitute for historical effective-date checks.
- Planned fields are immutable snapshots. Versioned changes create new IDs/rows; never rewrite past routes/schedules/assignment capacity. Actual outcomes are unavailable before they happen. Common `value_available_at` is the maximum availability of its constituent values for that revision; a specifically identified immutable planned/request field group may be available earlier through its own recorded publication time. Only those explicitly listed fields can bypass whole-row availability. If real source history cannot establish that earlier publication, use whole-row availability instead.
- `quality_status` describes processing, not a model target. Accepted typed rows use `VALID`, `CORRECTED` or `FLAGGED`; staging may additionally use `UNRESOLVED`, and quarantined rows are stored outside accepted tables with `QUARANTINED` disposition. All provenance, injection labels, audit outcomes and synthetic latent parameters are excluded from predictive feature sets unless a narrowly justified production-available quality indicator is explicitly approved later.

| Common column | Type | Nullable | Meaning / constraint |
| --- | --- | --- | --- |
| dataset_version | STR | N | FK to generation manifest; fixed logical snapshot |
| source_id | ID | N | FK to source manifest entry; current project choice is synthetic generator, with any transformed public source only after separate approval |
| source_row_id | ID | N | FK to immutable raw envelope `(dataset_version, file, row ordinal)`; unique per physical row |
| event_time | TS | N | Observation occurrence time; for a complete row with several actual fields use latest constituent event; planned-only rows use publication event, not future service time |
| value_available_at | TS | N | Earliest usable time for this value revision, ≥ingestion_time; corrected revisions also ≥correction_time and every supporting evidence value_available_at |
| correction_time | TS | Y | Actual repair/publication time for changed values; null on unchanged source revision; never silently backdated |
| ingestion_time | TS | N | Time this source observation/revision was received, ≥its source observation event; distinct from later correction_time and run execution timestamps |
| quality_status | STR | N | VALID, CORRECTED, FLAGGED in accepted tables; UNRESOLVED in staging only; quarantined records are outside accepted tables |
| unresolved_reason | STR | Y | Required in staging when a reference/field group is unresolved; controlled reason such as UNKNOWN_VEHICLE, MISSING_PARENT, AMBIGUOUS_STOP, NOT_SUPPLIED or CORRUPT_COUNT |

Raw envelope metadata (sidecar or ingestion columns) additionally holds `raw_file` STR N, `row_ordinal` INT N (>0), `raw_bytes_sha256` STR N, `raw_record_text` STR N and `parse_status` STR N. Exact raw bytes remain in immutable files; strings preserve invalid timestamp/number representations. These columns are not duplicate passenger movement records. Raw/staging representations allow invalid original FKs/types. Only canonical accepted records enforce this dictionary; explicitly nullable unresolved assignment/request references use documented statuses, never fake parent keys.

## 1. Passengers

Purpose/grain: one entirely synthetic passenger. PK `passenger_id`; no transport FK. About **80,000** rows; at least 75,000 with usable rides is a project gate. Relationship: one passenger to many tickets, journeys and demand requests. Source: deterministic synthetic identity pool with varied *private* latent travel propensities; do not publish propensities as features. No names, phone numbers, emails, government IDs or real person trajectories.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| passenger_id | ID | N | PK; stable identity |
| registered_at_utc | TS | N | Must precede first request/ticket/journey |
| passenger_type | STR | N | ADULT, STUDENT, SENIOR, OTHER fictional fare category; not generator behavior archetype |
| home_zone | STR | Y | Coarse synthetic zone; no home coordinate |
| accessibility_need | BOOL | Y | Synthetic optional operational accommodation flag; not medical detail |
| valid_from | DATE | N | First active date |
| valid_to | DATE | Y | Deactivation date; later than valid_from |

## 2. Tickets

Purpose/grain: one paid or valid zero-fare ticket transaction for one passenger on one trip leg. PK `ticket_id`; unique `transaction_ref` after deduplication. Approximately **2,400,000** unique baseline transactions, with controlled omissions/corruptions and append-only duplicates in raw; ≥2,300,000 usable target. FKs to Passengers, Trips, Stops, Route_Stops. One ticket to zero/one observed journey; no circular journey FK. Source: fare/payment realization of actual served rides, plus explicit anomaly copies; refunds outside the initial contract rather than negative fares disguised as sales.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| ticket_id | ID | N | PK |
| transaction_ref | STR | N | Stable payment-event identifier; natural duplicate key |
| passenger_id | ID | N | FK Passengers |
| trip_id | ID | N | FK Trips |
| origin_route_stop_id | ID | N | FK Route_Stops; on trip pattern |
| destination_route_stop_id | ID | N | FK Route_Stops; on same pattern, higher sequence |
| origin_stop_id | ID | N | FK Stops; equals origin Route_Stops.stop_id |
| destination_stop_id | ID | N | FK Stops; equals destination Route_Stops.stop_id |
| issued_at_utc | TS | N | At/before boarding in baseline, availability independently recorded |
| service_date | DATE | N | Equals trip service_date |
| fare_amount | DEC(12,2) | N | ≥0; zero fare allowed by fare category |
| currency | STR | N | ISO-like code, baseline PKR; consistent per source |
| fare_product | STR | N | SINGLE, CONCESSION, PASS_VALIDATION; not a multi-trip bundle |
| payment_method | STR | N | CASH, CARD, MOBILE, PASS; synthetic only |
| transaction_status | STR | N | VALID or VOID; VOID excluded from usable transaction count and served-sales totals |

## 3. Routes

Purpose/grain: one logical service route across versions. PK `route_id`. **120** rows; ≥110 used after cleaning project floor. Source: fully generated fictional connected topology, including original feeder/corridor routes and expansions; deterministic seeds and topology checks. Relationships: many patterns/trips, route-scoped context events and requests. Necessary low-load routes are supported without inventing operating-profit data.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| route_id | ID | N | PK; never version ID |
| route_code | STR | N | Unique public-facing synthetic code |
| route_name | STR | N | Fictional/attributed route name |
| mode | STR | N | BUS or MINIBUS baseline |
| service_type | STR | N | FEEDER, CORRIDOR, EXPRESS, SOCIAL; supports OD filter |
| social_service_required | BOOL | N | Planned access obligation, not automatic recommendation output |
| opened_on | DATE | N | No operated trips before opening |
| closed_on | DATE | Y | Exclusive closure; null ongoing |
| route_status | STR | N | PLANNED, ACTIVE, RETIRED; historical date range authoritative |

## 4. Stops

Purpose/grain: one physical stop location, reused across routes/directions. PK `stop_id`. **650** rows; initial 550 plus two additions of 50. Source: fully generated fictional coordinates in a declared geographic extent; no external dataset dependency. Location is stored here, satisfying stop/location integration without an unnecessary location table. Coordinate relocation would create a new stop identity in this version of the design.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| stop_id | ID | N | PK |
| stop_code | STR | N | Unique |
| stop_name | STR | N | Display name |
| latitude | DEC(10,7) | N | −90 to 90 and project region plausibility |
| longitude | DEC(10,7) | N | −180 to 180 and project region plausibility |
| zone_id | STR | N | Named coarse location zone |
| stop_type | STR | N | LOCAL, INTERCHANGE, TERMINAL |
| opened_on | DATE | N | Must precede active use |
| closed_on | DATE | Y | Exclusive closure |
| wheelchair_accessible | BOOL | Y | Unknown distinct from false |

## 5. Route_Stops

Purpose/grain: one ordered stop occurrence on an immutable pattern version. PK `route_stop_id`; unique `(pattern_id, stop_sequence)`. About **6,400** rows. FKs Route_Patterns, Routes, Stops. Source: fully generated connected ordered fictional topology. Repeated physical stops on loops are valid; repeated sequence is not.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| route_stop_id | ID | N | PK |
| pattern_id | ID | N | FK Route_Patterns |
| route_id | ID | N | FK Routes; equals pattern route_id |
| stop_id | ID | N | FK Stops |
| stop_sequence | INT | N | Contiguous 1..N within pattern, N≥2 |
| distance_from_start_km | DEC(10,3) | N | First=0; strictly increasing for consecutive distinct segments |
| pickup_allowed | BOOL | N | Passenger boarding eligibility |
| dropoff_allowed | BOOL | N | Passenger alighting eligibility |

Last cumulative distance equals Route_Patterns.distance_km within documented rounding tolerance. Travel path distance must not be shorter than straight-line endpoints beyond tolerance. Temporal compatibility follows the pattern range and stop opening/closure.

## 6. Trips

Purpose/grain: one immutable plan version for one stable operational departure. PK `trip_id`; unique `(operational_departure_id, plan_version)`. Project target **120,000 operational departures / approximately 126,000 plan rows**, including 6,000 superseded rows (5% single-revision planning allowance); final 2% cancellations leave **117,600 operated departures**. FKs Routes, Route_Patterns, Schedules, Service_Calendar and optional known planned Vehicle; predecessor is a self-FK. Source: fully generated calendar/schedule expansion followed by explicit revision announcements and actual outcomes.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| trip_id | ID | N | PK identifying this plan version; actual facts reference the executed or final-cancelled version, never every version |
| operational_departure_id | ID | N | Stable grouping identity from immutable departure token + service date; does not change if schedule/time/vehicle changes; unique identity domain defined by plan_version=1 rows in Trips |
| plan_version | INT | N | Contiguous positive integer per operational departure, beginning at 1 |
| predecessor_trip_id | ID | Y | Self-FK Trips; null iff version=1; otherwise same operational identity and prior version; unique non-null predecessor prevents branches |
| effective_from | TS | N | Time this plan became the applicable known plan, ≥publication and plan ingestion; ordered revision boundary |
| effective_to | TS | Y | Exclusive next plan effective_from, null for last plan in this dataset snapshot |
| plan_status | STR | N | CURRENT iff effective_to null in this snapshot, otherwise SUPERSEDED; derive historical status at analysis cutoff from intervals, not this final snapshot flag |
| route_id | ID | N | FK Routes; must match pattern |
| pattern_id | ID | N | FK Route_Patterns; must match schedule |
| schedule_id | ID | N | FK Schedules |
| service_id | ID | N | FK Service_Calendar; must match schedule |
| service_date | DATE | N | Stable service date for this operational departure; valid calendar date including exceptions |
| instance_index | INT | N | Nonnegative source departure slot discriminator; uniqueness applies only among applicable versions, not all historical rows |
| planned_vehicle_id | ID | Y | FK Vehicles when known; null iff planned_vehicle_status UNKNOWN; original unresolved source key stays in staging/audit |
| planned_vehicle_status | STR | N | KNOWN or UNKNOWN; UNKNOWN must not erase otherwise valid trip/route/timing data |
| scheduled_start_utc | TS | N | First-stop departure anchor from this schedule/service date |
| scheduled_end_utc | TS | N | Last-stop scheduled departure; ≥start |
| published_at_utc | TS | N | Immutable plan publication; actual received time also required for as-of use |
| trip_status | STR | N | SCHEDULED, COMPLETED, CANCELLED, PARTIAL; distinct from plan_status; only applicable/executed plan contributes service outcomes |
| cancellation_reason | STR | Y | Required CANCELLED; null otherwise; revision supersession itself is not a cancellation |
| actual_start_utc | TS | Y | First observed arrival for operated departure; null cancelled/superseded unexecuted plan |
| actual_end_utc | TS | Y | Last observed terminal departure when completed; null if unavailable |
| outcome_available_at_utc | TS | Y | Availability of outcome group; null on never-executed superseded plans |

Exactly one last/CURRENT plan per operational departure; intervals are contiguous, nonoverlapping and acyclic. The successor is the unique row whose predecessor_trip_id points here. As-of scheduled-service counts choose effective_from <= cutoff < effective_to (or no end), and count operational_departure_id once. Historical analyses may inspect old versions but must name their cutoff. Future effective_to/plan_status values are lifecycle metadata, never predictors before they were known. Closing an old interval is a versioned lifecycle event retained in raw/audit, not a rewrite of its original schedule values or a falsely early value revision.

The chosen execution version references its own route pattern, stop times and actual facts; actual service counts use distinct `operational_departure_id`. Compare execution with the applicable plan at the declared reference cutoff via this identity. If a revision changes stop sequence, compare only matched stop occurrences or report changed/unmatched stops; do not join by sequence alone across patterns. Cancellation and replacement-plan supersession are separate outcomes. All versions and dependent records share one chronological split group. A service-date change is an explicit cancellation/new operational departure with documented source linkage, not a silent reuse of identity on another date.

**G2 acceptance example:** create v1 and v2 for one departure, with v2 superseding v1 at a known `effective_from`. A scheduled-frequency query at each cutoff selects exactly one applicable row and counts one departure; v1 is excluded after the boundary, is not labeled a missed trip merely because it is superseded, and remains queryable for historical audit. Cancelled executed service is counted only as a cancellation/missed-service outcome under the documented denominator, never as an extra frequency unit.

## 7. Schedules

Purpose/grain: immutable recurring departure template/version for one pattern and calendar. PK `schedule_id`; source uniqueness `(pattern_id, service_id, departure_offset_sec, valid_from)`. About **2,600** rows. FKs Route_Patterns, Service_Calendar. Related to stop offsets and instantiated Trips. Source: planned frequencies/mismatches with explicit revision dates; do not generate random trip timings independently of schedules.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| schedule_id | ID | N | PK |
| pattern_id | ID | N | FK Route_Patterns |
| service_id | ID | N | FK Service_Calendar |
| departure_offset_sec | INT | N | ≥0, may exceed 86,400 for after-midnight service-day continuation; project maximum 172,800 |
| valid_from | DATE | N | Inclusive template activation |
| valid_to | DATE | Y | Exclusive expiry; within pattern/calendar range |
| published_at_utc | TS | N | Known before first service use |
| schedule_version | INT | N | Positive revision number for source lineage |

## 8. Vehicles

Purpose/grain: one physical synthetic vehicle. PK `vehicle_id`. **320** rows. Source: realistic mixed capacities/duty availability, not individually linked to real operators. Related to planned Trips and assignment segments. Changing an assigned capacity uses assignment snapshots; no historical rewrite of vehicle identity.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| vehicle_id | ID | N | PK |
| vehicle_code | STR | N | Unique fictional fleet code |
| vehicle_type | STR | N | MINIBUS, STANDARD_BUS, LARGE_BUS |
| seated_capacity | INT | N | >0 |
| standing_capacity | INT | N | ≥0 |
| nominal_capacity | INT | N | seated+standing; baseline 25–90, a project range |
| commissioned_on | DATE | N | Available before assignment |
| retired_on | DATE | Y | No assignment on/after date |
| operational_status | STR | N | AVAILABLE, MAINTENANCE, RETIRED; current descriptor, not historical predictive input |

No overlapping actual assignments for the same vehicle across different trips, allowing documented transfer/turnaround time. Assignment records carry actual time ranges for this check.

## 9. Passenger_Counts

Purpose/grain: one observed stop-level passenger-count record for an executed trip plan. PK `count_id`; unique `stop_event_id`. Approximately **2,352,000** baseline observations (117,600 × mean 20 stops); project publication gate ≥2,250,000, including ≥500,000 nonzero observations. FKs Trips, Trip_Stop_Events and nullable phase assignments. Source: independently emitted count channel from fully generated movements with bounded measurement defects. This is separate from the passenger–trip journey ledger and does not inflate movement counts.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| count_id | ID | N | PK |
| stop_event_id | ID | N | FK Trip_Stop_Events; valid observed/incomplete-but-count-observed visit, never cancelled |
| trip_id | ID | N | FK Trips; equals event trip_id and executed version |
| arrival_assignment_id | ID | Y | FK Trip_Vehicle_Assignments for arriving vehicle, or null with arrival_assignment_status UNKNOWN/NOT_APPLICABLE as documented |
| departure_assignment_id | ID | Y | FK Trip_Vehicle_Assignments for outgoing vehicle, or null with corresponding UNKNOWN/NOT_APPLICABLE status |
| arrival_assignment_status | STR | N | KNOWN, UNKNOWN, NOT_APPLICABLE; must agree with event |
| departure_assignment_status | STR | N | KNOWN, UNKNOWN, NOT_APPLICABLE; must agree with event |
| service_date | DATE | N | Equals trip service date |
| counted_at_utc | TS | N | Time complete count observation known; preserve exact source timing |
| boardings | INT | N | Ordinary new customer boardings, ≥0; exclude replacement transfers; zero where pickup disallowed |
| alightings | INT | N | Ordinary customer alightings, ≥0 and ≤onboard_arrival; exclude replacement transfers; zero where dropoff disallowed |
| onboard_arrival | INT | N | ≥0; incoming load; prior outgoing load unless documented termination/interruption |
| onboard_departure | INT | N | onboard_arrival − alightings + boardings; ≥0 |
| replacement_event | BOOL | N | Observed replacement at this stop, independent of whether vehicle IDs resolved |
| transfer_out_count | INT | N | ≥0; continuing passengers leaving arriving vehicle, not new OD alightings |
| transfer_in_count | INT | N | ≥0; same continuing passengers entering replacement vehicle, not new OD boardings |
| measurement_method | STR | N | SIMULATED_SENSOR or accepted supplied observation channel |

For every ordinary stop, enforce `onboard_arrival >= 0`, `boardings >= 0`, `alightings >= 0`, `alightings <= onboard_arrival`, and `onboard_departure = onboard_arrival - alightings + boardings`. Both transfer counters are zero. At the **origin** of a completed observed trip, `onboard_arrival=0`, `alightings=0`, `transfer_in_count=0`, and boardings establish the first departure load. At the **terminal** of a completed observed trip, `boardings=0`, `transfer_out_count=0`, `onboard_departure=0`, and alightings equal the remaining ordinary load. A skipped, cancelled or incomplete visit is not silently treated as a normal origin/terminal: use its explicit `visit_status`, null the phase that did not occur, and report a censored load rather than manufacturing a zero. Missing observations are never imputed as zero.

For a planned replacement, ordinary passengers alight first, every continuing rider transfers, then ordinary new riders board the outgoing vehicle: `transfer_out_count = transfer_in_count = onboard_arrival - alightings`. Transfer counts cancel at the operational-trip level and are never added to ordinary boardings/alightings, journey counts or OD demand. A replacement at the origin has no incoming load or transfer; a replacement at a completed terminal has no outgoing phase or transfer. Partial transfer/abandonment must be represented as explicit ordinary alighting/new outcomes before acceptance, not hidden loss in this formula. The same ordinary load equation remains valid. `replacement_event=false` requires zero transfers; observed transfers with unknown IDs remain auditable without guessing vehicle identities. `Passenger_Transfer_Events`, when supplied, is the row-level trace and is not itself a demand event.

When arrival assignment/capacity is known, check incoming load against its positive capacity; outgoing occupancy/capacity always uses `departure_assignment_id`. Real over-capacity loads are retained `FLAGGED` for crowding analysis, not clipped; inconsistent counts or invalid capacity metadata are separately handled. If a phase assignment/capacity is unknown, mark that phase’s vehicle/occupancy/capacity-dependent measures unavailable while retaining valid counts/OD/timing. A corrupted count observation is preserved in raw, staged with its issue and quarantined from count-dependent analyses unless independent evidence supports a correction; it is never clipped, silently imputed or allowed to break the conservation equation. No non-null unresolved FK is accepted. Reconcile ordinary movement counts to journeys where available; missing journey channel must be reported rather than used as evidence of zero boardings.

## 10. Delays

Purpose/grain: one **positive** arrival/departure delay observation at a distinct stop event. PK `delay_id`; unique `stop_event_id`. **300,000** baseline rows. FKs Trips, Trip_Stop_Events and nullable phase-specific actual assignments. Source: delayed movement simulation first, then positive difference measured against schedule; never random delays unrelated to actual timestamps. On-time/early visits exist in Trip_Stop_Events but do not pad this table's scale.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| delay_id | ID | N | PK |
| stop_event_id | ID | N | FK Trip_Stop_Events |
| trip_id | ID | N | FK Trips, matches event |
| arrival_assignment_id | ID | Y | FK actual arriving assignment; matches event phase, null if that assignment unresolved |
| departure_assignment_id | ID | Y | FK actual departing assignment; matches event phase, null if unresolved |
| arrival_assignment_status | STR | N | KNOWN, UNKNOWN or NOT_APPLICABLE; agrees with the stop event and non-null FK rule |
| departure_assignment_status | STR | N | KNOWN, UNKNOWN or NOT_APPLICABLE; agrees with the stop event and non-null FK rule |
| service_date | DATE | N | Equals trip service date |
| arrival_delay_sec | INT | N | max(0, actual arrival − scheduled arrival) |
| departure_delay_sec | INT | N | max(0, actual departure − scheduled departure) |
| recorded_at_utc | TS | N | ≥observed event time used |
| reported_cause | STR | Y | Observed incident description if available; UNKNOWN/null allowed, not hidden generator cause |
| context_event_id | ID | Y | FK Context_Events if causally linked and actually observable |

At least one delay component >0. Arrival delay belongs only to `arrival_assignment_id`; departure delay belongs only to `departure_assignment_id`. A non-null phase FK must resolve to the matching phase assignment on the stop event; a positive component with `NOT_APPLICABLE` is invalid, while `UNKNOWN` retains the time-derived value but disables vehicle attribution. If a phase did not occur, its delay component is exactly 0 and its assignment status/FK is `NOT_APPLICABLE`/null. Valid time-derived delay remains accepted when an assignment is UNKNOWN, but vehicle-group attribution for that component is unavailable. Do not assign arrival delay to the replacement vehicle. Signed early deviations derive from timestamps, not negative values in this positive-only table. Extreme positive delays can be real anomalies; assess evidence rather than automatically clipping. Report absence of expected delay records by reconciling all stop events.

## 11. GPS_Events

Purpose/grain: one movement observation. PK `gps_event_id`; unique `(trip_id, observed_at_utc, observation_index)` in canonical channel. Approximately **450,000** points: 352,800 anchor points (three per 117,600 operated departures) plus about 97,200 targeted event/corridor points. FKs Trips, nullable actual assignment and optional stop event. Source: deterministic geometry/time interpolation with explicit sampling; no live GPS hardware. Complete travel-time, delay and headway coverage comes from stop events; GPS is corroborating sampled evidence, not a complete tracking stream.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| gps_event_id | ID | N | PK |
| trip_id | ID | N | FK Trips |
| assignment_id | ID | Y | FK actual assignment at observed time/phase; null iff assignment_status UNKNOWN; never invalid non-null FK |
| assignment_status | STR | N | KNOWN or UNKNOWN; unknown disables vehicle attribution but retains valid trip/location evidence |
| stop_event_id | ID | Y | FK Trip_Stop_Events when at a stop; null between stops |
| service_date | DATE | N | Trip date, not UTC truncation |
| observed_at_utc | TS | N | Within operated trip; within known assignment interval/phase when available |
| observation_index | INT | N | ≥0, deterministic tie disambiguator |
| latitude | DEC(10,7) | N | Geographic bounds and plausible path |
| longitude | DEC(10,7) | N | Geographic bounds and plausible path |
| distance_along_pattern_km | DEC(10,3) | N | 0..pattern distance; nondecreasing per trip |
| speed_kph | DEC(7,2) | Y | ≥0 if measurable; route/type plausibility check |
| accuracy_m | DEC(8,2) | Y | ≥0; unknown precision is null |

## 12. Service_Calendar

Purpose/grain: one recurring service calendar/version. PK `service_id`. **12** rows covering weekday/weekend/holiday/seasonal/revision variants. Source: synthetic operating calendar, explicitly fictional holidays, not a claim about official public holidays. FKs none; referenced by schedules/trips/exceptions.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| service_id | ID | N | PK |
| service_name | STR | N | Calendar label |
| timezone | STR | N | Baseline Asia/Karachi |
| valid_from | DATE | N | Inclusive |
| valid_to | DATE | N | Exclusive, later than start |
| monday, tuesday, wednesday, thursday, friday, saturday, sunday | BOOL each | N | Recurring operating flags; exceptions override |
| calendar_day_type | STR | N | WEEKDAY, WEEKEND, HOLIDAY, SEASONAL, SPECIAL |
| published_at_utc | TS | N | Known publication time |

## 13. Route_Patterns (extension)

Purpose/grain: one immutable ordered direction/version of a route. PK `pattern_id`; unique `(route_id,direction_id,pattern_version)`. About **320** rows. FK Routes. Source: route changes and additions; length comes from connected geometry. No extra unique-route credit for versions.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| pattern_id | ID | N | PK |
| route_id | ID | N | FK Routes |
| direction_id | INT | N | 0 or 1 baseline; local direction label |
| pattern_version | INT | N | >0 |
| distance_km | DEC(10,3) | N | >0; matches terminal cumulative distance |
| valid_from | DATE | N | Inclusive, after route opening |
| valid_to | DATE | Y | Exclusive |
| published_at_utc | TS | N | Plan information availability |

For each `(route_id,direction_id)`, effective intervals do not overlap in this simplified version; both directions may operate concurrently. Patterns can legitimately differ in stop sequences and distance by direction.

## 14. Schedule_Stop_Times (extension)

Purpose/grain: one planned stop time on one schedule. PK `schedule_stop_time_id`; unique `(schedule_id,stop_sequence)` and `(schedule_id,route_stop_id)`. About **52,000** rows. FKs Schedules and Route_Stops. Source: distance/speed/dwell planning with consistent offsets. All instants derive from Trips.scheduled_start_utc plus these offsets.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| schedule_stop_time_id | ID | N | PK |
| schedule_id | ID | N | FK Schedules |
| route_stop_id | ID | N | FK Route_Stops, same pattern as schedule |
| stop_sequence | INT | N | Equals route-stop sequence |
| arrival_offset_sec | INT | N | ≥0, relative to trip scheduled_start; first arrival=0 in this simplified planned origin convention |
| departure_offset_sec | INT | N | ≥arrival offset; first departure=0; nondecreasing through route |

Scheduled_start denotes first-stop scheduled departure. The planned origin arrival and departure coincide in this simplified timetable; actual origin arrival may precede departure and retain observed dwell. Intermediate stop offsets carry explicit planned dwell. Next arrival must be ≥previous departure plus positive travel time. Published availability inherited from schedule; no future dwell updates rewrite past offsets.

## 15. Trip_Stop_Events (extension)

Purpose/grain: one planned stop visit instance on a trip, optionally observed. PK `stop_event_id`; unique `(trip_id,stop_sequence)`. About **2,520,000** plan-version stop rows: 126,000 × 20. Selecting applicable versions yields 2,400,000 scheduled visits; approximately 2,352,000 are operated. Superseded/cancelled planned visits never acquire duplicate actual counts. FKs Trips, Schedule_Stop_Times, Route_Stops and actual assignments. Source: instantiate stop plans, simulate coherent travel/dwell and operational outcomes.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| stop_event_id | ID | N | PK |
| trip_id | ID | N | FK Trips |
| schedule_stop_time_id | ID | N | FK Schedule_Stop_Times, equals trip schedule |
| route_stop_id | ID | N | FK Route_Stops, matches schedule stop |
| stop_sequence | INT | N | Matches referenced route stop |
| service_date | DATE | N | Trip service date |
| arrival_assignment_id | ID | Y | FK actual arriving assignment; non-null iff arrival_assignment_status KNOWN |
| departure_assignment_id | ID | Y | FK actual departing assignment; non-null iff departure_assignment_status KNOWN |
| arrival_assignment_status | STR | N | KNOWN, UNKNOWN, NOT_APPLICABLE; UNKNOWN retains valid observed timing; NOT_APPLICABLE only no arrival event |
| departure_assignment_status | STR | N | KNOWN, UNKNOWN, NOT_APPLICABLE; UNKNOWN retains valid observed timing; NOT_APPLICABLE only no departure event |
| actual_arrival_utc | TS | Y | Required observed; null when not observed |
| actual_departure_utc | TS | Y | Required fully observed; null for documented incomplete measurement |
| visit_status | STR | N | OBSERVED, CANCELLED, SKIPPED, INCOMPLETE, SCHEDULED_ONLY |
| outcome_available_at_utc | TS | Y | Availability of status/actual values; null on superseded unexecuted planned-only visits |

At a replacement stop, `arrival_assignment_id` may differ from `departure_assignment_id`; arriving delay/GPS and outgoing load must use their respective phases. Same-vehicle ordinary visits use the same known assignment twice. `CANCELLED`, `SKIPPED` and `SCHEDULED_ONLY` visits have null actual timestamps, null phase FKs and `NOT_APPLICABLE` statuses; `INCOMPLETE` may retain only the phase that was actually observed. Superseded unexecuted plan visits are `SCHEDULED_ONLY` with no actual data. For `OBSERVED`, departure≥arrival, and next observed arrival≥previous departure; journey times agree with the event within defined measurement tolerance. Predicted early arrivals relative to schedule are allowed. Cancelled trips have no observed counts/journeys/GPS. `PARTIAL` trips may omit later observed visits but preserve their planned events and explicit statuses.

## 16. Trip_Vehicle_Assignments (extension)

Purpose/grain: one planned or actual vehicle duty segment for one trip plan version. PK `assignment_id`. About **248,304** rows: 126,000 planned-version allocations + 117,600 initial actual allocations + 4,704 replacement segments. FKs Trips and Vehicles. Source: deterministic feasible supply allocation and 4% replacement rate among operated departures. Unknown vehicle keys remain in staging; canonical assignment rows always have a valid vehicle and positive capacity. Stop/count/delay facts may instead hold explicit UNKNOWN/null assignment references.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| assignment_id | ID | N | PK |
| trip_id | ID | N | FK Trips; ACTUAL must reference executed version |
| vehicle_id | ID | N | FK Vehicles; unresolved vehicle prohibits canonical assignment acceptance |
| assignment_kind | STR | N | PLANNED or ACTUAL |
| start_stop_sequence | INT | N | Boundary stop where duty begins, within pattern |
| end_stop_sequence | INT | N | Boundary stop where duty ends, >=start, within pattern; successive replacement duties share a stop boundary, not simultaneous occupancy |
| capacity_snapshot | INT | N | >0; effective capacity during this assignment |
| capacity_reason | STR | Y | Required if differs from vehicle nominal capacity |
| effective_start_utc | TS | N | Actual duty start or planned allocation start |
| effective_end_utc | TS | N | >start; resource occupancy interval [start,end) |
| announced_at_utc | TS | N | Availability of announced assignment, never earlier than source evidence |

Phase attribution, not sequence range alone, is authoritative. At replacement stop s, the arriving assignment ends at handover time h and the departing assignment starts at h, with arrival <= h <= departure; the simulation normally provides positive transfer dwell. Arrival phase explicitly references the old assignment; departure phase references the new. Point-event endpoint inclusion is permitted at a duty boundary for that explicitly referenced phase; half-open intervals still govern resource overlap. GPS points at h use the phase/assignment reference specified by the observation; ambiguous points stay staging/unattributed instead of choosing arbitrarily. Stop sequence bounds constrain route coverage but are not half-open filters that erase the incoming vehicle at s.

For ordinary visits both phases reference the same assignment. For actual assignments, enforce no overlapping duty intervals for one vehicle across trips, including documented turnaround buffers. Within a trip the handover times form contiguous nonoverlapping duties; any unknown gap is explicitly unresolved and disables dependent capacity/vehicle measures. Planned allocations for superseded versions remain historical alternatives and are not concurrent actual duties. Transfer passengers stay in the same operational departure/journey; the separate transfer counters must not inflate demand.

## 17. Service_Exceptions (extension)

Purpose/grain: one override per calendar/date. PK `exception_id`; unique `(service_id,exception_date)`. About **240** rows. FK Service_Calendar, optional Context_Events. Source: holiday/event additions and removals; no contradictory add/remove for same calendar/date.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| exception_id | ID | N | PK |
| service_id | ID | N | FK Service_Calendar |
| exception_date | DATE | N | Within calendar effective range |
| action | STR | N | ADD or REMOVE |
| day_type_override | STR | Y | HOLIDAY, SPECIAL etc.; null keeps calendar type |
| context_event_id | ID | Y | FK Context_Events |
| published_at_utc | TS | N | Date-change information availability |

## 18. Passenger_Journeys (extension)

Purpose/grain: **one actual passenger riding one trip between two ordered stops**. PK `journey_id`; unique non-null `request_id` and non-null `ticket_id` unique in this single-leg ticket contract. About **2,400,000** rows. FKs Passengers, Trips, Tickets (optional missing-record state), Demand_Requests, Route_Stops and actual boarding/alighting events. Source: served requests realized on feasible trips, generating independent movement channel; not constructed by duplicating tickets during analysis to inflate counts.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| journey_id | ID | N | PK |
| passenger_id | ID | N | FK Passengers |
| trip_id | ID | N | FK Trips, operated |
| request_id | ID | Y | FK Demand_Requests when request_link_status OBSERVED; matches passenger/OD; null for NOT_SUPPLIED or UNRESOLVED |
| request_link_status | STR | N | OBSERVED, NOT_SUPPLIED, UNRESOLVED; unresolved original ID retained only in staging/audit |
| ticket_id | ID | Y | FK Tickets when present; null only explicitly flagged MISSING_TICKET; source reference retained in audit |
| origin_route_stop_id | ID | N | FK Route_Stops on trip pattern |
| destination_route_stop_id | ID | N | FK Route_Stops on same pattern, higher sequence |
| boarding_stop_event_id | ID | N | FK Trip_Stop_Events for trip and origin |
| alighting_stop_event_id | ID | N | FK Trip_Stop_Events for trip and destination |
| service_date | DATE | N | Trip date |
| boarded_at_utc | TS | N | Within actual boarding visit interval |
| alighted_at_utc | TS | N | >boarding, within destination visit interval |
| passenger_count | INT | N | Exactly 1 for this grain, not group-ticket expansion |
| movement_status | STR | N | OBSERVED or MISSING_TICKET; latter keeps genuine movement while exposing missing sales |

Each passenger cannot occupy overlapping journey intervals. OD endpoints match ticket and request where available; a different chosen route is allowed if request.preference differs, but destination must be served by actual pattern. Never invent alighting records to satisfy OD completeness; incomplete raw journeys are quarantined from OD and reported. Observed waiting requires the linked request, not a half-headway approximation labelled as an observation. A missing request channel does not invalidate otherwise valid OD, trip timing or movement. Generated main data supplies requests; hidden/supplied movement data need not. An unavailable source identity or endpoint remains staged for capabilities requiring it, rather than inventing a passenger/request.

For SRS counting, `Passenger_Journeys` is the canonical movement view and `Tickets` is a separate payment view of the same baseline ride. Count the movement minimum once using the greater of distinct usable journey IDs and distinct usable ticket IDs, name the chosen view, and report overlap; never add the two tables. A missing ticket does not erase a confirmed journey, and a ticket without a journey is not silently promoted to a second movement. Requests, stop counts, GPS points, transfer events, plan versions and duplicate physical representations do not add movement records.

## 19. Demand_Requests (extension)

Purpose/grain: one intended single-trip travel request by one synthetic passenger, including unserved/abandoned attempts. PK `request_id`. About **2,500,000** rows. FKs Passengers, Stops and optional preferred Route. One request to zero/one journey; no journey back-reference required. Source: time/OD propensity model before capacity/schedule assignment. Stored outcomes are post-event only.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| request_id | ID | N | PK |
| passenger_id | ID | N | FK Passengers |
| origin_stop_id | ID | N | FK Stops, open at request time |
| destination_stop_id | ID | N | FK Stops, different from origin for baseline |
| preferred_route_id | ID | Y | FK Routes; null when route-flexible |
| requested_at_utc | TS | N | Queue arrival / demand event |
| request_available_at_utc | TS | N | When immutable passenger/OD/preference/time group known |
| desired_departure_utc | TS | N | Desired departure, ≥request time |
| service_date | DATE | N | Local demand date; journey service_date may differ after midnight |
| resolution | STR | N | SERVED, UNSERVED, ABANDONED; future outcome unavailable at request time |
| decision_at_utc | TS | N | Boarding time if served; queue exit/observation closure otherwise |
| reason | STR | Y | CAPACITY, NO_SERVICE, SCHEDULE_MISMATCH, WAIT_LIMIT, etc. for unserved/abandoned |
| resolution_available_at_utc | TS | N | Earliest outcome availability |

A served request has exactly one journey; unresolved export windows are censored UNSERVED with observation cutoff reason, not proof of permanent lost demand. Valid demand is not zero just because no vehicle ran. Synthetic/private willingness-to-wait parameters are not included in public feature records.

## 20. Context_Events (extension)

Purpose/grain: one bounded event/disruption with a defined route/stop/global scope. PK `context_event_id`. About **180** rows. Optional FKs Routes, Stops. Source: fictional festivals/events/sports/weather/disruptions, with deterministic original generation; no public input dependency. Effects are generator-private; only observable context is exposed.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| context_event_id | ID | N | PK |
| event_type | STR | N | FESTIVAL, SPORT, WEATHER, DISRUPTION, COMMUNITY_EVENT |
| event_name | STR | N | Synthetic/attributed label |
| scope | STR | N | NETWORK, ROUTE or STOP |
| route_id | ID | Y | Required only ROUTE scope; FK Routes |
| stop_id | ID | Y | Required only STOP scope; FK Stops |
| starts_at_utc | TS | N | Event beginning |
| ends_at_utc | TS | N | >start |
| announced_at_utc | TS | N | Known-in-advance or observed only when disruption occurs |
| expected_in_advance | BOOL | N | True does not bypass announcement time |
| description | STR | Y | Observable narrative, never target predictions |

## 21. Passenger_Transfer_Events (extension)

Purpose/grain: one continuing passenger transfer at one observed vehicle-replacement handover. PK `transfer_id`; unique `(replacement_stop_event_id, journey_id)`. Approximately **70,000** rows in the fully generated target (about 4,704 handovers × ~15 continuing riders), but this table is not a passenger-movement, boarding, alighting or OD-demand table. FKs Passenger_Journeys and Trip_Stop_Events; phase assignment FKs are nullable only with explicit UNKNOWN status. Source: the same continuing journey that spans the replacement, with deterministic transfer evidence. Hidden aggregate-only movement data may omit this optional ledger without losing valid count or OD evidence.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| transfer_id | ID | N | PK |
| journey_id | ID | N | FK Passenger_Journeys; continuing ride, not a new journey |
| replacement_stop_event_id | ID | N | FK Trip_Stop_Events; observed replacement handover on the journey's trip |
| from_assignment_id | ID | Y | FK Trip_Vehicle_Assignments for arriving vehicle; null iff `from_assignment_status=UNKNOWN` |
| to_assignment_id | ID | Y | FK Trip_Vehicle_Assignments for departing vehicle; null iff `to_assignment_status=UNKNOWN` |
| from_assignment_status | STR | N | KNOWN or UNKNOWN; no non-null unresolved FK |
| to_assignment_status | STR | N | KNOWN or UNKNOWN; no non-null unresolved FK |
| transfer_at_utc | TS | N | Handover time, within the replacement stop's observed dwell |
| transfer_type | STR | N | VEHICLE_REPLACEMENT |
| transfer_status | STR | N | OBSERVED; a missing/ambiguous transfer remains in staging until resolved |

A transfer row is emitted only for a continuing passenger who leaves the arriving duty and enters the departing duty. It is excluded from `Passenger_Journeys` counts, `Passenger_Counts.boardings`, `Passenger_Counts.alightings`, OD demand and ordinary ticket counts. For a complete generated replacement, the number of rows equals the continuing transfer population represented by `transfer_out_count` and `transfer_in_count`; an aggregate-only source may have those counters without row-level transfers. Unknown assignment IDs preserve the passenger and handover evidence but prohibit vehicle-specific attribution until resolved. A later assignment correction creates a new value revision and does not create a second transfer.

## 22. DQ_Issues (audit extension)

Purpose/grain: one detected rule violation on one physical source row per processing run. PK `issue_id`; unique `(run_id,source_row_id,rule_id,field_path,issue_index)`. Estimated **100,000–400,000 per pipeline/run**, measured later, not a success quota. FK to raw envelope, rule catalog and generation manifest; business ID is a soft reference because malformed/deleted entities may not exist. Source: future independent detectors, **not injection oracle**. Multiple issues share one affected-row final outcome. Unchanged valid rows produce neither issue nor outcome rows.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| issue_id | ID | N | PK |
| run_id | ID | N | Processing-run manifest FK |
| pipeline_id | STR | N | SPARK or PYTHON (or future validated audit runner) |
| dataset_version | STR | N | Generation manifest FK |
| table_name | STR | N | Source entity |
| source_row_id | ID | N | Raw envelope FK; referential defects can never break this reference |
| business_key_raw | STR | Y | Exact original PK string/null |
| rule_id | STR | N | Rule catalog FK |
| rule_version | STR | N | Applied immutable rule version |
| field_path | STR | N | Column or record-level path |
| issue_index | INT | N | Deterministic multiple-issue disambiguator |
| detected_issue | STR | N | Specific reason/category |
| severity | STR | N | INFO, WARNING, ERROR |
| original_record | STR | N | Lossless raw record text (inline or immutable resolvable blob reference plus raw hash) |
| original_value | STR | Y | Exact value; null when missing |
| cleaning_rule | STR | N | Documented rule/action with version |
| corrected_value | STR | Y | Proposed/applied correction; null when no evidence-based correction |
| correction_time | TS | Y | Actual change/publication time of applied repair; null if no value change |
| evidence_available_at | TS | Y | Maximum value_available_at of supporting evidence; required for evidence-based repair |
| value_available_at | TS | N | Availability of resulting field revision; at least original availability, ingestion, correction_time and evidence_available_at where applicable |
| prior_value_revision | INT | Y | Previous retained field/record revision for as-of reconstruction |
| value_revision | INT | N | Positive revision ID for this record/field snapshot; distinguish multiple historical corrections |
| action | STR | N | KEEP_FLAGGED, CORRECT, QUARANTINE, DEDUPLICATE, NO_CHANGE |
| reason | STR | N | Evidence-backed action rationale |
| detected_at_utc | TS | N | Processing timestamp, not event time |
| evidence_refs | STR | Y | JSON array of corroborating source IDs; no generator-private truth |

## 23. DQ_Record_Outcomes (audit extension)

Purpose/grain: final disposition of **each affected physical raw row per run only**: detected, flagged, corrected, removed, deduplicated or quarantined. No outcome row for unchanged valid input. PK `outcome_id`; unique `(run_id,source_row_id)`. Estimated **80,000–300,000 per pipeline/run**, not a fixed cap; preserve every actual affected row. FKs run manifest/raw envelope; references clean survivor only if applicable. Source: finalized detector/cleaning results after deterministic rule precedence; append new run, never mutate prior outcomes.

| Column | Type | Nullable | Constraint / meaning |
| --- | --- | --- | --- |
| outcome_id | ID | N | PK |
| run_id | ID | N | Processing manifest FK |
| pipeline_id | STR | N | SPARK or PYTHON |
| dataset_version | STR | N | Generation manifest FK |
| source_row_id | ID | N | Raw envelope FK |
| table_name | STR | N | Source table |
| issue_ids | STR | N | Nonempty JSON array of issue/action IDs; no unchanged-valid outcome records |
| original_record_ref | STR | N | Immutable raw path/ordinal/hash |
| corrected_record | STR | Y | Typed corrected record or immutable corrected-output reference; null if no correction |
| final_status | STR | N | ACCEPTED_CORRECTED, ACCEPTED_FLAGGED, QUARANTINED, REMOVED, DUPLICATE_REMOVED, OTHER_DOCUMENTED; unchanged accepted rows are represented only in run/table reconciliation and never receive an outcome row |
| usable_for | STR | N | JSON array of permitted analytical tasks, empty for unusable; FLAGS do not automatically exclude all tasks |
| canonical_business_key | STR | Y | Accepted output identity, absent if no accepted equivalent |
| survivor_source_row_id | ID | Y | Raw FK for dedup survivor; required DUPLICATE_REMOVED |
| finalized_at_utc | TS | N | Processing completion time, not historical event/feature availability |
| value_revision | INT | Y | FK to retained corrected/value revision when changed |
| value_available_at | TS | Y | Availability of corrected result; follows evidence maximum, not original event time |

Count conservation per table/run is explicit and exclusive:

```text
raw_count
  = accepted_unchanged_count
  + accepted_corrected_count
  + accepted_flagged_count
  + quarantined_count
  + removed_count
  + deduplicated_count
  + other_documented_disposition_count
```

`accepted_unchanged_count` is a run/table/file statistic for rows that passed unchanged; it is not an individual `DQ_Record_Outcomes` row. Every other bucket has one affected-row outcome, and `OTHER_DOCUMENTED` requires a named rule/catalog disposition. `accepted_flagged_count` is the documented valid-but-flagged disposition (for example a genuine overload) and is part of the requested “other documented dispositions” bucket. Multiple DQ_Issues never increase the affected-row count. Accepted output rows are the unchanged accepted rows plus accepted corrected/flagged survivors, adjusted only for explicitly logged canonical mappings; report unique business keys and plan-version versus operational-departure counts separately. Run/table/file reconciliation proves every raw ordinal was processed via hashes, row counts and contiguous shard completion; it is invalid to infer “accepted unchanged” merely from absence of a sparse issue row in an incomplete run. Task-specific exclusions and staging projections do not add extra passenger movements. Non-row issues (missing tickets/trips) attach to the referencing physical record, rather than inventing a nonexistent source row.

## Control document schemas (not transport tables)

| Document | Required fields and typed contract | Purpose / count / source |
| --- | --- | --- |
| source_manifest | source_id ID PK; kind STR; source_url STR nullable for synthetic; publisher STR; license STR; retrieved_at TS nullable synthetic; file_sha256 STR; original_schema_version STR; generation_notes STR; transformation_notes STR nullable when fully generated; spatial/temporal_coverage STR; redistribution_allowed BOOL; no_personal_data_review STR | One per source file family/version; records provenance and suitability; fully generated source channels and original generator configuration; no external dataset selected/required |
| generation_manifest | dataset_version STR PK; identity_namespace STR; generator_version STR; master_seed INT; configuration_hash STR; source_ids array; schema_version STR; timezone STR; history_start/end DATE; files array(path STR, sha256 STR, rows INT, bytes INT, table STR, format STR, partition STR); fault_budget JSON; generation/runtime_versions JSON | One per deterministic generation snapshot; real file hashes/counts only after generation |
| processing_manifest | run_id ID PK; pipeline_id STR; dataset_version FK; rule_catalog_hash STR; schema_hash STR; processing_version STR; started_at/completed_at TS; input/output file hashes JSON; table/file raw row counts INT; processed shard ordinal ranges JSON; accepted_unchanged_count INT; affected_unique_count INT; exclusive outcome-status counts JSON; canonical row/key totals JSON; revision-aware service totals JSON; reconciliation totals JSON | One per independent processing run; no substitution of one pipeline’s cleaning evidence for another |
| split_manifest | header keyed by split_version STR; membership records keyed by (split_version, task, case_id); dataset_version FK; task STR; case_id ID; entity_key STR; operational_departure_id ID nullable for aggregate cases; issue_time TS; prediction_cutoff TS (normally issue_time); label_start/end TS; split STR enum TRAIN/VALIDATION/TEST/CHALLENGE; source_row/group_refs array; purged_reason STR nullable; selection_seed INT; boundary_config JSON; file hashes JSON | Case-level membership file plus header manifest; estimate from chosen task grain later; no target values in membership decision |
| rule_catalog | rule_id STR PK; version STR; affected_tables array; detection_expression_spec STR; severity STR; documented_action STR; required_evidence STR; null_policy STR; temporal_policy STR; acceptance_test_ref STR | At least the 16 SRS quality families plus schema/lineage checks; this phase specifies rules in prose only |
| private_injection_manifest | injection_id ID PK; scenario_id STR; seed INT; source_row_ids array; original_truth_ref STR; mutation_spec STR; expected_issue STR; expected_disposition STR; latent_parameters JSON | Generator/test oracle; excluded from model/cleaning input roots and baseline feature manifests. Used only to evaluate detection after outputs are frozen |

All planned source data are fully generated; manifests must label them synthetic and retain reproducibility evidence. Any future external source would require a separate reviewed decision and cannot bypass SRS transformation/integration/augmentation conditions. These are documented contracts, not created JSON schema files, data, model artifacts or executable cleaning code.

## Layer and availability contracts resolving G3/G5

**RAW → STAGING/QUALITY → ACCEPTED/QUARANTINED.** Raw is immutable; staging permits unresolved source references and malformed types. Canonical accepted non-null FKs always resolve and cross-table equality/time rules hold. Permitted null assignments have explicit UNKNOWN status; null NOT_APPLICABLE is reserved for phases that did not occur. Known assignment references must point to accepted assignments with positive capacity and matching trip/phase. This narrow nullable contract is not permission to accept other invalid FKs. The architecture capability matrix is normative for allowed/prohibited analyses: an unknown vehicle blocks vehicle-specific, capacity and occupancy results but not otherwise valid OD, passenger-flow, boarding/alighting, timing or delay-duration evidence.

Valid counts, OD and timing can survive missing vehicle/assignment metadata; vehicle-attributed delay and capacity/occupancy-dependent calculations cannot. A wholly unknown core trip/stop key remains staged for that capability. Valid field-group projections can be retained independently with their own validated keys, lineage and eligibility, never disguised as a fully accepted source row or counted again after resolution. Unknown optional request metadata likewise does not block otherwise valid journeys. See architecture minimal hidden-data contract for field-by-field capability boundaries.

For every feature value revision, enforce value_available_at <= prediction_cutoff. Unchanged value availability is max(source observation availability, ingestion_time). Changed value availability is max(previous availability, correction_time, own ingestion_time, every supporting evidence value_available_at). Preserve original/earlier value revisions, their evidence and their availability; a latest corrected snapshot cannot reconstruct old features by itself. event_time describes when the transport event occurred, not when a correction became known. Runtime detected_at/finalized_at timestamps are audit execution facts, not permission to backdate repairs. Only a real, explicitly simulated historical correction event with recorded evidence may carry an earlier historical correction_time; never invent it retrospectively to improve model accuracy.

Shared raw snapshot/version/IDs/split definitions are permitted; fitted preprocessing, fitted models, predictions and derived model outputs are not shared between Spark and Python pipelines. Both independently enforce these same declarative availability and layer contracts.
