import { API_CONTRACTS, getContract } from './contracts.js';
import { toQueryParams } from './filters.js';

const DEFAULT_TIMEOUT_MS = 15000;

/**
 * Creates an intentionally inert API adapter.
 *
 * The adapter is only usable when a caller injects a base URL and fetch
 * implementation. The dashboard does not call it during the demo foundation.
 * @param {{baseUrl?: string, fetcher?: typeof fetch, timeoutMs?: number}} options
 */
export function createApiClient({ baseUrl = '', fetcher, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const transport = typeof fetcher === 'function' ? fetcher : globalThis.fetch?.bind(globalThis);
  const configured = Boolean(baseUrl && transport);

  function unavailable(contractName) {
    const contract = getContract(contractName);
    return {
      state: 'not_configured',
      data: null,
      meta: {
        source: 'api',
        warnings: [
          `Frontend contract only: ${contract.method} ${contract.path} is not connected.`,
        ],
      },
    };
  }

  async function request(contractName, params = {}) {
    if (!configured) return unavailable(contractName);

    const contract = getContract(contractName);
    const url = new URL(contract.path, ensureTrailingSlash(baseUrl));
    const isPost = contract.method === 'POST';
    if (!isPost) {
      Object.entries(toQueryParams(params)).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await transport(url, {
        method: contract.method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(isPost ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(isPost ? { body: JSON.stringify(params) } : {}),
      });
      if (!response.ok) {
        throw new Error(`Analytics request failed with HTTP ${response.status}`);
      }
      const data = await response.json();
      return {
        state: data && Object.keys(data).length ? 'ready' : 'empty',
        data,
        meta: { source: 'api' },
      };
    } catch (error) {
      return {
        state: 'error',
        data: null,
        meta: { source: 'api' },
        error: error instanceof Error ? error : new Error('Unknown API error'),
      };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    configured,
    contracts: API_CONTRACTS,
    request,
    get: (contractName, params) => request(contractName, params),
    executiveSummary: (params) => request('executiveSummary', params),
    passengerDemand: (params) => request('passengerDemand', params),
    routesAndStops: (params) => request('routesAndStops', params),
    delayAnalysis: (params) => request('delayAnalysis', params),
    occupancy: (params) => request('occupancy', params),
    demandForecast: (params) => request('demandForecast', params),
    routeClusters: (params) => request('routeClusters', params),
    passengerFlow: (params) => request('passengerFlow', params),
    whatIf: (body) => request('whatIf', body),
    recommendations: (params) => request('recommendations', params),
    dataQuality: (params) => request('dataQuality', params),
    systemStatus: (params) => request('systemStatus', params),
  };
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`;
}
