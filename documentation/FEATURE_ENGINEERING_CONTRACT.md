# Feature engineering execution contract

Both implementations consume the same accepted 21-table schema catalog in
`spark_jobs/schemas.py` and produce independently calculated results:

- Spark/HDFS: `spark_jobs.features.build_feature_frames_from_tables()` and
  `spark_jobs.pipeline`; outputs are Parquet under
  `<features-root>/task=<task>/split=<split>`.
- Python/Pandas: `python_pipeline.features.build_feature_frames_from_tables()`;
  `run_feature_engineering()` writes task-specific Parquet through the independent
  Python implementation.
- `feature_contracts.py` is the shared, implementation-neutral contract
  catalog. It shares definitions only, not calculations or output data.

## Source projection

The operation projection is one `trip_stop_events.stop_event_id` row, joined
many-to-one to its `trips` plan, `route_patterns.direction_id`,
`route_stops.stop_id`, and `schedule_stop_times.departure_offset_sec`.
Scheduled stop departure is
`trips.scheduled_start_utc + schedule_stop_times.departure_offset_sec`.
Passenger counts join by `stop_event_id`; the actual
`departure_assignment_id` joins to `trip_vehicle_assignments.assignment_id`
for `capacity_snapshot`. Route label/mode/service context comes from `routes`.
Planned-context availability is the latest of trip-plan publication, pattern
publication, schedule publication, stop-time availability, route availability,
and route-stop availability. Rows with unavailable/future schedule context
fail explicitly. Planned vehicle type is joined only from the planned vehicle
and its own availability must be no later than the scheduled cutoff. A
route/stop context event contributes only if it covers scheduled departure and
both announcement and value availability are known by that time.
Duplicate key rows violate the declared join cardinalities in Pandas; source
keys are not silently deduplicated. Delay facts are optional and are not used
to manufacture on-time rows; observed actual and scheduled timestamps supply
the delay target across observed stop events.

Trip demand is the sum of `passenger_journeys.passenger_count` per joined
`trip_id`, with its maximum source `value_available_at` retained as target
availability. It is served journey demand, not unserved/requested demand.
Rows with no journey record are not synthesized as zero-demand intervals.
Direction comes from the joined route pattern.

## Task contracts

| Task | Grain and outputs | Null and target behavior |
|---|---|---|
| Delay severity | Observed stop event; route/mode/service/direction/stop, distance, scheduled UTC/calendar, as-of planned vehicle and context count, historical delay lag/mean, `delay_sec`, `delay_severity` | `delay_sec=max(0, actual_departure_utc-scheduled_departure_utc)`. Four caller-supplied increasing, nonnegative second boundaries classify ON_TIME (`<=b1`), MINOR_DELAY (`b1..b2`), MODERATE_DELAY (`b2..b3`), MAJOR_DELAY (`b3..b4`), or SEVERE_DELAY (`>b4`). Missing actual/scheduled timestamp leaves the target null. Raw actual time, current load/capacity, assignments, and raw delay are excluded from this supervised output. |
| Passenger-demand forecasting | Trip/service date; same calendar features, `historical_demand_lag_1`, `historical_demand_mean_7`, label `passenger_demand` | Target is sum of observed journey passenger counts. Missing target/history is null, not zero. Group history by route, direction, UTC hour, and service weekday. |
| Occupancy/crowding analysis | Observed stop event/departure segment; `capacity_utilization`, `occupancy_status`, `over_capacity` | `onboard_departure / departure_assignment.capacity_snapshot`. Unknown/nonpositive capacity or null load is UNAVAILABLE/null. Ratios above one are preserved. This is descriptive observed occupancy, not a pre-event predictor. |
| Headway/reliability | Observed stop event at route/direction/physical stop; `actual_headway_sec`, `scheduled_headway_sec`, `headway_deviation_sec` | Difference from prior actual/scheduled departure and signed actual-minus-scheduled deviation. Deterministic order is timestamp, `trip_id`, `stop_event_id`; first event has null headway. These are descriptive outputs. |
| Delay analytics | Service date/route/direction; observed count, mean/max nonnegative delay, positive-delay fraction | Calculated only when both actual and scheduled timestamps exist. Early/ontime events contribute zero delay; absent outcomes are not synthesized. |
| Route/service clustering | Route/direction vectors: training event/departure counts, observed load, capacity utilization, mean delay, route distance, mean absolute headway deviation, distinct stops, supported demand trips, mean served trip demand; route service context when joined | Aggregations use only 2025 training observations. No cluster assignment/model is fitted; `social_service_required` is context, never a low-demand label. |

## Leakage, ordering, and splits

Time-dependent feature history is strictly earlier by event/scheduled timestamp.
An observation is eligible only when its target availability is at or before
the current feature cutoff. If several prior values become available at the
same cutoff, event time and stable identifiers determine order. The lag is the
latest event-time observation among available history; the rolling mean uses
the latest up to seven such observations. Windows are trailing, never centered.
The current row's target, actual timestamp, and outcome availability do not
enter its predictors. Validation/test outcomes are later in the chronological
order and therefore cannot enter a training row's history. Task targets remain
explicit labels/analytics and must not be added to predictor vectors.

Date split boundaries are half-open and shared by both implementations:

| Split | Included service dates |
|---|---|
| Train | 2025-01-01 through 2025-12-31 |
| Validation | 2026-01-01 through 2026-03-31 |
| Test | 2026-04-01 through 2026-06-30 |

Calendar clock features are explicitly UTC because the feature projection
does not yet apply a per-service `service_calendar.timezone`. Weekday derives
from local `service_date` by ISO weekday numbering. Calendar exceptions,
actual vehicle type, GPS, and local-time peak buckets are not emitted by this
contract; no undeclared timezone, peak definition, or missing event is
invented.

## Evidence boundary

Only tiny synthetic unit fixtures are used. No certified production dataset,
HDFS ingestion, model fitting, or production-scale run is performed here.
Threshold values must be supplied by the approved runtime configuration.
Production output completeness, certified-key cardinalities, cluster/runtime
compatibility, row counts, and generated Parquet are pending certified runtime
evidence.
