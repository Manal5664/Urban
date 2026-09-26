/**
 * Optional map boundary. The dashboard does not select or require a map
 * provider; an adapter can later provide route geometry, stops, and layers
 * without changing the `networkMap` container contract.
 */

/**
 * @typedef {Object} MapViewport
 * @property {number} [zoom]
 * @property {{lat: number, lng: number}} [center]
 * @property {number} [bearing]
 */

/**
 * @typedef {Object} MapLayer
 * @property {string} id
 * @property {'route'|'stop'|'flow'|'occupancy'|'delay'} kind
 * @property {boolean} visible
 */

/**
 * @typedef {Object} NetworkGeometry
 * @property {string} source
 * @property {string} [asOf]
 * @property {Array<{id: string, coordinates: number[][]}>} routes
 * @property {Array<{id: string, name: string, latitude: number, longitude: number}>} stops
 */

/**
 * Create an inert adapter for a future map implementation.
 * @param {{loadNetwork?: (context: {filters: Record<string, unknown>, viewport?: MapViewport}) => Promise<NetworkGeometry>, provider?: unknown}} options
 */
export function createMapAdapter({ loadNetwork, provider } = {}) {
  const configured = typeof loadNetwork === 'function';
  return {
    configured,
    provider: provider ?? null,
    async load(context = {}) {
      if (!configured) {
        return {
          state: 'not_configured',
          data: null,
          meta: { source: 'map', warnings: ['No map provider or geometry loader is connected.'] },
        };
      }
      try {
        const data = await loadNetwork(context);
        return { state: data ? 'ready' : 'empty', data: data ?? null, meta: { source: 'map' } };
      } catch (error) {
        return {
          state: 'error',
          data: null,
          meta: { source: 'map' },
          error: error instanceof Error ? error : new Error('Unknown map adapter error'),
        };
      }
    },
  };
}
