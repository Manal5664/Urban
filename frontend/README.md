# UrbanTransit IQ dashboard foundation

This directory contains the frontend-only foundation for UrbanTransit IQ. The repository did not contain an existing web application or frontend dependency configuration, so this implementation uses browser-native ES modules, semantic HTML, and CSS with no package installation required.

## Run a local preview

The app is static and can be served from this directory:

```bash
cd frontend
npm run preview
```

The preview command is intentionally not started by the implementation agent. Do not use it for production analytics or expose a development server publicly.

## Integration contract

- `src/api/contracts.js` contains proposed frontend capability contracts. Every path is marked `contract-only`; no endpoint is represented as implemented.
- `src/api/view-models.js` documents the expected response shapes, nullable measures, source context, and lineage fields without coercing missing values to zero.
- `src/api/filters.js` provides a shared, serializable filter context for future page requests.
- `src/api/map-adapter.js` defines an optional provider boundary for route geometry, stops, layers, and viewport state without loading live map data.
- `src/api/client.js` accepts an injected `baseUrl`/`fetcher` and is inert until an adapter is configured. A future host can provide `globalThis.__URBANTRANSIT_API_BASE_URL__` or construct the client directly.
- `src/data/demo-data.js` is the only source of synthetic preview values. It is explicitly marked `DEMO / MOCK` and is kept separate from API adapters.
- `src/data/page-data.js` is the page-data boundary; normalized API view models can be injected without editing page components.
- The UI can be switched from `DEMO PREVIEW` to `API CONTRACT` to review empty/loading integration states without presenting unverified values.

## Frontend checks

```bash
cd frontend
npm run check
```

The check is a lightweight Node syntax, module-import, page-render, and shell-mount smoke check; it does not run analytics, access datasets, or start a server.
