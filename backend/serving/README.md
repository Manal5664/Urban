# PostgreSQL serving persistence

This package adds a PostgreSQL application-serving adapter to the existing
backend. `PostgresServingRepository` follows the existing `get(capability,
filters, body)` artifact-repository contract and can be injected into the
current backend composition; it does not replace `ApiApplication`, FastAPI,
or the existing artifact reader. Until deployment configures and injects it,
the existing backend behavior is unchanged.

PostgreSQL is for compact serving projections and versioned result summaries,
not a copy of raw/analytical history. Big Data processing and Parquet/HDFS
remain the analytical source of truth. The migration creates:

- Dataset-scoped route, stop, vehicle, route-pattern, route-stop, schedule,
  and trip summaries required for application lookup.
- Feature-version and model-run metadata.
- `serving_results` for analytical summaries, forecasts, clusters,
  recommendations, what-if estimates, pipeline metadata, and result payloads.
- Report metadata referencing a serving result and an external artifact URI.

Result records retain dataset/feature/model/analytics versions, generating
time, source artifact URI and SHA-256, optional route/stop/vehicle/trip and
direction, and optional analysis window. Scenario request metadata and payload
are explicitly marked; what-if results require a scenario type. Model metrics
and all JSON payloads must be finite JSON objects. No ticket, GPS, passenger
journey, or stop-event fact table is created.

## Configuration and state

Set `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` in the
runtime environment. `PGSSLMODE` defaults to `require`. Credentials are not
embedded, returned from readiness, or included in configuration reprs. The
connection driver is imported lazily (`psycopg`, then `psycopg2`); no optional
driver is installed by this change.

The database reports `NOT_CONFIGURED` when required values are absent,
`NOT_READY` when connection/driver/schema readiness fails, and `READY` only
when the expected serving table is present. Repository writes use one
database transaction and roll back on errors. Duplicate keys and FK failures
are surfaced; inserts do not use overwrite/upsert semantics. Reads exclude
`FIXTURE_TESTED` records and never substitute in-memory or fabricated results.

## Migration

After certified infrastructure provisions an empty PostgreSQL database and
deployment credentials, apply the versioned local SQL files explicitly:

```python
from backend.serving.config import PostgresConfig
from backend.serving.database import PostgresDatabase
from backend.serving.migrate import apply_migrations

apply_migrations(PostgresDatabase(PostgresConfig.from_env()))
```

The runner keeps a migration ledger in `app_serving.schema_migrations`;
each unapplied migration is applied and recorded in a single transaction.
User identity is an opaque nullable `actor_subject`, not a fabricated users
table or FK. Auth/RBAC integration can bind this to its approved subject
contract in a later migration without coupling this persistence package to
the active authentication implementation.

Schema/contract and DB-API mock tests require no PostgreSQL service. A real
PostgreSQL server, driver, migration run, constraints, query plans, backup,
retention, and deployment-secret configuration are pending runtime evidence.
