# API composition contract

`backend.fastapi_app.create_app` hosts the existing `ApiApplication`; it does
not add another framework or start a server at import time. The artifact
repository remains the analytics/reporting read boundary. An optional
`serving_repository` can provide readiness and future catalog/dataset readers;
when omitted the artifact repository is used for readiness.

## Composed routes

Existing analytics and system routes remain registered from
`backend/contracts.py`. Additional authenticated routes are:

| Method/path | Behavior |
| --- | --- |
| GET `/api/v1/system/readiness` | Sanitized serving database readiness |
| GET `/api/v1/system/dataset-status` | Dataset/version provider result or explicit `NOT_READY` |
| GET `/api/v1/catalog/{kind}` | Route/stop/vehicle/service provider result or explicit `NOT_READY` |
| GET `/api/v1/models/{capability}/summary` | Existing model-result summary fields |
| GET `/api/v1/dashboard` | Selected result sections; `sections` may be comma-separated |
| GET `/api/v1/reports/{report_type}` | Structured JSON report |
| GET `/api/v1/reports/{report_type}/download?format=csv\|json` | Download response with fixed safe filename |

Report types come from the existing reporting contract. `dataQuality` and
`pipelineComparison` use the existing diagnostics permission; other reports
use analytics-read permission. Routes use the public `AuthService`/RBAC
dependency contracts. No security implementation or user store is replaced.

## Readiness, filtering, and data sources

The JSON artifact provider does not calculate filtered analytics. For a
nonempty filter request it returns an artifact only when that artifact contains
an exactly matching `applied_filters` object; otherwise the service responds
`not_ready`. This prevents requested filter metadata from being mistaken for
applied filtering.

Catalog and dataset-status calls require optional `get_catalog(kind, filters=)`
and `dataset_status(filters=)` provider methods. Those methods are not present
on the current PostgreSQL serving repository, so these routes remain
`NOT_READY` (or report the safe database `NOT_CONFIGURED`/`NOT_READY` state)
until a compatible, certified read implementation exists. The PostgreSQL
repository is accepted through its existing `get`/`health` boundary; it is not
rewritten or queried outside that interface.

Results require explicit certification and source/version lineage. Missing or
uncertified results contain no metric payload. What-if requests are validated
against the existing scenario request contract before repository dispatch.
Responses remove secret-bearing keys and redact local absolute paths; safe
artifact URIs, versions, timestamps and provenance hashes are retained.
Errors do not include exception text, credentials, or filesystem paths.

FastAPI, Starlette, an ASGI server, persistent AuthRepository, PostgreSQL
driver/server/migrations, certified result artifacts, and catalog/dataset
read methods are deployment/runtime requirements. No production runtime is
started or claimed by this contract.
