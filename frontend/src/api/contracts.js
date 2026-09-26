/**
 * Frontend capability contracts for the future analytics service.
 *
 * These are interface proposals only. No path in this file is a claim that
 * a backend endpoint exists. The UI uses the contracts for integration
 * boundaries and graceful empty states until a service is registered.
 */

/**
 * @typedef {'ready'|'empty'|'loading'|'error'|'not_configured'} ApiState
 * @typedef {{ source: 'api'|'demo'|'system', asOf?: string, warnings?: string[] }} ApiMeta
 * @typedef {{ state: ApiState, data: unknown|null, meta: ApiMeta, error?: Error }} ApiResult
 * @typedef {{ get: (path: string, params?: Record<string, string|number|boolean|null|undefined>) => Promise<ApiResult> }} ApiTransport
 */

/** @type {Readonly<Record<string, {key: string, method: 'GET'|'POST', path: string, state: 'contract-only', description: string}>>} */
export const API_CONTRACTS = Object.freeze({
  executiveSummary: {
    key: 'executive',
    method: 'GET',
    path: '/api/v1/analytics/executive-summary',
    state: 'contract-only',
    description: 'Network KPIs, trends, and priority signals.',
  },
  passengerDemand: {
    key: 'demand',
    method: 'GET',
    path: '/api/v1/analytics/passenger-demand',
    state: 'contract-only',
    description: 'Ridership trends, peak windows, and stop/route rankings.',
  },
  routesAndStops: {
    key: 'routes-stops',
    method: 'GET',
    path: '/api/v1/analytics/routes-stops',
    state: 'contract-only',
    description: 'Network map geometry, route performance, and stop demand.',
  },
  delayAnalysis: {
    key: 'delays',
    method: 'GET',
    path: '/api/v1/analytics/delay-analysis',
    state: 'contract-only',
    description: 'Delay distributions, punctuality, and reliability summaries.',
  },
  occupancy: {
    key: 'occupancy',
    method: 'GET',
    path: '/api/v1/analytics/occupancy-crowding',
    state: 'contract-only',
    description: 'Capacity utilization, load bands, and crowding risk.',
  },
  demandForecast: {
    key: 'forecasting',
    method: 'GET',
    path: '/api/v1/analytics/demand-forecast',
    state: 'contract-only',
    description: 'Forecast versus actual series and model readiness metadata.',
  },
  routeClusters: {
    key: 'clustering',
    method: 'GET',
    path: '/api/v1/analytics/route-clusters',
    state: 'contract-only',
    description: 'Route cluster assignments and explanatory features.',
  },
  passengerFlow: {
    key: 'passenger-flow',
    method: 'GET',
    path: '/api/v1/analytics/passenger-flow',
    state: 'contract-only',
    description: 'OD matrix, directional flow, and top stop pairs.',
  },
  whatIf: {
    key: 'what-if',
    method: 'POST',
    path: '/api/v1/analytics/what-if',
    state: 'contract-only',
    description: 'Estimate a cloned schedule/capacity/demand scenario.',
  },
  recommendations: {
    key: 'recommendations',
    method: 'GET',
    path: '/api/v1/analytics/recommendations',
    state: 'contract-only',
    description: 'Evidence-backed recommendations and supporting metrics.',
  },
  dataQuality: {
    key: 'data-quality',
    method: 'GET',
    path: '/api/v1/analytics/data-quality',
    state: 'contract-only',
    description: 'DQ summaries, issue counts, reconciliation, and lineage.',
  },
  systemStatus: {
    key: 'system',
    method: 'GET',
    path: '/api/v1/analytics/system-status',
    state: 'contract-only',
    description: 'Pipeline stages, freshness, and integration health.',
  },
});

/** @type {Readonly<Record<string, {path: string, state: 'contract-only'}>>} */
export const API_CAPABILITY_STATUS = Object.freeze(
  Object.fromEntries(
    Object.entries(API_CONTRACTS).map(([name, contract]) => [
      name,
      { path: contract.path, state: contract.state },
    ]),
  ),
);

export function getContract(name) {
  const contract = API_CONTRACTS[name];
  if (!contract) {
    throw new Error(`Unknown UrbanTransit IQ API contract: ${name}`);
  }
  return contract;
}
