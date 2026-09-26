import { getDemoPageData } from './demo-data.js';

/**
 * Page-data boundary for the UI.
 *
 * The fixture supplies the current view shape only. A future adapter can
 * provide a normalized API view model without changing page components; the
 * page layer should not import demo values directly.
 *
 * @param {string} pageId
 * @param {{mode?: 'demo'|'api', apiViewModel?: Record<string, unknown>|null}} options
 */
export function getPageData(pageId, { mode = 'demo', apiViewModel = null } = {}) {
  const fixtureShape = getDemoPageData(pageId);
  return {
    ...fixtureShape,
    ...(apiViewModel || {}),
    __hasApiData: mode === 'api' && Boolean(apiViewModel),
  };
}
