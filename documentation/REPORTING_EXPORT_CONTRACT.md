# Reporting and export contract

`backend.reporting.ReportingService` packages the existing analytics API
contracts from `backend/contracts.py`. It does not read transport data,
calculate analytics, or supply default metric values.

## Readiness and lineage

Reports are ready only when each requested source is explicitly
`SUCCEEDED`/`CERTIFIED`, carries its dataset and analytics or feature version,
has source lineage, and satisfies the existing capability response fields.
Model summaries use the existing ML result fields and certified task contract.
Uncertified, missing, incomplete, mixed-dataset, or filter-mismatched sources produce `not_ready`
output. An individual report has no metric payload when its source is not
ready; dashboards mark unavailable or mixed-version sections `not_ready` and
may retain other ready sections with their explicit per-section status.
Fixture evidence is accepted only when `allow_fixtures=True`, and is labeled
`FIXTURE-TESTED`.

Each report includes its generation timestamp, filters, dataset version when
consistent, and per-source status and available pipeline, feature/model/run,
artifact, timestamp, and provenance references. A result provider receiving
filters must apply them and attest to the exact selection in
`applied_filters`; API request metadata alone is not evidence that data was
filtered.

## Report and export coverage

Reports package the existing passenger-demand, route/stop performance, delay,
occupancy, forecast, route-clustering, recommendation, pipeline-comparison,
data-quality, executive-summary, and passenger-flow capability fields.
Dashboard output composes explicitly requested sections; it does not compute
cross-source KPIs. Model-result summaries retain measured model fields without
recalculating or replacing them.

JSON uses sorted keys and compact deterministic encoding. CSV uses stable
columns (`report_type`, `status`, `section`, `record_index`, `value_json`, and
`metadata_json`); nested records remain JSON values in the CSV. `write_export`
creates a new file exclusively and refuses to overwrite an existing file.

The SRS requires downloadable reports and data export, and names CSV and JSON
among project data formats. It does not explicitly require PDF reports, so no
PDF dependency or exporter is included. The service is a backend contract, not
an HTTP download route; host/API wiring and certified runtime results remain
deployment work.
