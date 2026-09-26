import { button, chartState, panel, statusBadge } from '../components/ui.js';
import { icon } from '../components/icons.js';
import { networkMap } from '../components/map.js';
import {
  apiPlaceholder,
  chartPanel,
  demoBlock,
  kpiRow,
  pageFrame,
  panelHeaderActions,
  routeNameCell,
  stateNotice,
  stopNameCell,
  tablePanel,
} from './shared.js';

export function renderRoutesStops({ data, mode }) {
  return pageFrame({
    data,
    mode,
    updated: mode === 'demo' ? 'Demo network geometry · not production' : 'Awaiting geometry response',
    actions: `${button({ label: 'Layer controls', action: 'map-settings', iconName: 'layers', variant: 'outline', size: 'sm' })}${button({ label: 'Export network', action: 'export-network', iconName: 'download', variant: 'outline', size: 'sm' })}`,
    children: `
      ${stateNotice(mode)}
      ${kpiRow(data.kpis, mode, '', Boolean(data.__hasApiData))}
      <div class="dashboard-grid dashboard-grid--map">
        ${networkMap({ mode, title: 'Routes, stops, and spatial context' })}
        ${panel({ title: 'Network lens', eyebrow: 'Structure at a glance', description: 'Keep geography optional so the core analytics remains usable without a map provider.', body: `<div class="network-lens"><div class="network-lens__item"><span class="network-lens__icon network-lens__icon--teal">${iconRoute()}</span><span><strong>Pattern-aware</strong><small>Route direction and version context</small></span></div><div class="network-lens__item"><span class="network-lens__icon network-lens__icon--blue">${iconStop()}</span><span><strong>Stop-aware</strong><small>Location, zone, and activity context</small></span></div><div class="network-lens__item"><span class="network-lens__icon network-lens__icon--amber">${iconLink()}</span><span><strong>As-of safe</strong><small>No future geometry by default</small></span></div></div>${mode === 'api' ? '<div class="inline-empty-note">Map geometry and stop coordinates await the API adapter.</div>' : '<div class="inline-empty-note"><span class="demo-mini-mark">DEMO</span> The geometry above is illustrative, not a production map.</div>'}` })}
      </div>
      <div class="dashboard-grid dashboard-grid--split">
        ${tablePanel({ title: 'Route performance', description: 'A comparison surface for reliability, load, and delay context.', columns: [
          { label: 'Route', render: (row) => routeNameCell(row) },
          { label: 'Reliability', key: 'reliability', align: 'right' },
          { label: 'Load', key: 'load', align: 'right' },
          { label: 'Median delay', key: 'delay', align: 'right' },
          { label: 'Signal', render: (row) => statusBadge(row.status, row.tone) },
        ], rows: data.routePerformance, mode, dataReady: Boolean(data.__hasApiData), action: panelHeaderActions('Open performance', 'open-route-performance') })}
        ${tablePanel({ title: 'Stop demand ranking', description: 'Boarding, alighting, dwell, and activity bands.', columns: [
          { label: 'Stop', render: (row) => stopNameCell(row) },
          { label: 'Boardings', key: 'boardings', align: 'right' },
          { label: 'Alightings', key: 'alightings', align: 'right' },
          { label: 'Dwell', key: 'dwell', align: 'right' },
          { label: 'Activity', render: (row) => statusBadge(row.status, row.tone) },
        ], rows: data.stopRanking, mode, dataReady: Boolean(data.__hasApiData), action: panelHeaderActions('Open stop analysis', 'open-stop-analysis') })}
      </div>
      ${chartPanel({ title: 'Route and stop comparison', subtitle: 'A future drill-down slot for pattern, version, direction, and service-day filters.', chart: demoBlock(`<div class="drilldown-placeholder"><span class="drilldown-placeholder__icon">${icon('table')}</span><strong>Comparison canvas ready</strong><small>Connect route/stop metrics to render a linked detail view.</small></div>`, mode, chartState({ state: 'empty', title: 'Route comparison awaiting API', description: 'The linked table and detail surface are prepared for analytics responses.' })), source: mode, className: 'chart-panel--wide' })}
    `,
  });
}

function iconRoute() { return '<span aria-hidden="true">↗</span>'; }
function iconStop() { return '<span aria-hidden="true">●</span>'; }
function iconLink() { return '<span aria-hidden="true">∞</span>'; }
