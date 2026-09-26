import { icon } from '../components/icons.js';
import { lineChart } from '../components/charts.js';
import { networkMap } from '../components/map.js';
import { button, callout, chartState, emptyState, panel, statusBadge, table } from '../components/ui.js';
import {
  chartPanel,
  demoBlock,
  kpiRow,
  numberedInsightList,
  pageFrame,
  panelHeaderActions,
  signalList,
  stateNotice,
  tablePanel,
} from './shared.js';

export function renderExecutive({ data, mode }) {
  const trend = lineChart({
    labels: data.trend.labels,
    series: [
      { values: data.trend.values, color: 'teal', label: data.trend.label, area: true },
      { values: data.trend.comparison, color: 'slate', label: 'Previous period', dashed: true },
    ],
    ariaLabel: 'Demo ridership trend',
  });
  const health = signalList(data.health.map((item) => ({
    ...item,
    value: item.value,
    icon: item.icon,
  })));
  const priorities = numberedInsightList(data.priority);

  return pageFrame({
    data,
    mode,
    updated: mode === 'demo' ? data.lastUpdated : 'No API timestamp',
    actions: `${button({ label: 'Open workspace', action: 'open-workspace', iconName: 'grid', variant: 'primary', size: 'sm' })}${button({ label: 'Export view', action: 'export', iconName: 'download', variant: 'outline', size: 'sm' })}`,
    children: `
      ${stateNotice(mode)}
      <div class="page-callout-row">${callout({ iconName: 'spark', title: 'Decision lens', description: 'Prioritize recurring patterns, then validate each recommendation against the evidence panel before acting.', tone: 'teal', action: button({ label: 'View decision support', action: 'navigate-recommendations', iconName: 'chevronRight', variant: 'text', size: 'sm' }) })}</div>
      ${kpiRow(data.kpis, mode, '', Boolean(data.__hasApiData))}
      <div class="dashboard-grid dashboard-grid--hero">
        ${chartPanel({ title: data.trend.label, subtitle: mode === 'demo' ? 'Synthetic trend with a previous-period comparison.' : 'Trend response will be supplied by the analytics service.', chart: demoBlock(trend, mode, chartState({ state: 'empty', title: 'Ridership trend awaiting API', description: 'The trend contract is ready for a real analytics response.' })), source: mode, legendItems: [{ color: 'teal', label: 'Current demo period' }, { color: 'slate', label: 'Comparison' }], action: panelHeaderActions('Export trend', 'export-trend'), footer: mode === 'demo' ? '<span class="chart-footnote"><span class="demo-mini-mark">DEMO</span> Layout fixture · replace with API series</span>' : '<span class="chart-footnote">Source contract: passenger demand summary</span>' })}
        <section class="panel health-panel"><div class="panel__header"><div><p class="eyebrow">Signal board</p><h2 class="panel__title">Operational health</h2><p class="panel__description">A compact readout of what deserves attention.</p></div><span class="panel__header-mark">${icon('activity', 18)}</span></div><div class="panel__body">${demoBlock(health, mode, emptyState({ title: 'Health signals awaiting API', description: 'Connect the executive summary capability to populate this board.', iconName: 'activity' }))}</div></section>
      </div>
      <div class="dashboard-grid dashboard-grid--split">
        ${panel({ title: 'Priority signals', eyebrow: 'Next best questions', description: 'Evidence-backed prompts keep the executive view actionable.', action: panelHeaderActions('Open insights', 'navigate-insights'), body: demoBlock(priorities, mode, emptyState({ title: 'Priority signals awaiting API', description: 'Recommendation evidence will appear here when available.', iconName: 'spark' })), className: 'priority-panel' })}
        <section class="panel readiness-panel"><div class="panel__header"><div><p class="eyebrow">Data contract</p><h2 class="panel__title">Ready for the next layer</h2><p class="panel__description">The UI is separated from analytics results.</p></div></div><div class="panel__body"><div class="readiness-stack"><div class="readiness-stack__item"><span class="readiness-stack__icon readiness-stack__icon--good">${icon('check', 15)}</span><span><strong>Reusable views prepared</strong><small>KPIs, charts, tables, filters, and states</small></span></div><div class="readiness-stack__item"><span class="readiness-stack__icon readiness-stack__icon--good">${icon('check', 15)}</span><span><strong>API contracts isolated</strong><small>No endpoint is assumed to be live</small></span></div><div class="readiness-stack__item"><span class="readiness-stack__icon readiness-stack__icon--pending">${icon('clock', 15)}</span><span><strong>Analytics response pending</strong><small>Demo fixtures remain clearly marked</small></span></div></div>${mode === 'demo' ? '<div class="readiness-footnote"><span class="demo-mini-mark">DEMO</span> Switch to API ready to inspect empty states.</div>' : ''}</div></section>
      </div>
      ${networkMap({ mode, title: 'Network coverage and context', compact: true })}
      <div class="dashboard-grid dashboard-grid--footer">
        ${panel({ title: 'How to read this dashboard', eyebrow: 'Foundation note', body: `<div class="foundation-note"><div class="foundation-note__icon">${icon('info', 20)}</div><div><strong>One source of truth, many views.</strong><p>Every surface is shaped around filter context, evidence, and lifecycle state. When the analytics service is connected, the same component contracts can render real, as-of-labeled results.</p></div></div>` })}
        ${panel({ title: 'Workspace checklist', eyebrow: 'Before launch', body: `<div class="checklist"><div class="checklist__row"><span class="checklist__mark checklist__mark--done">${icon('check', 12)}</span><span>Application shell and navigation</span><span class="checklist__state">Ready</span></div><div class="checklist__row"><span class="checklist__mark checklist__mark--done">${icon('check', 12)}</span><span>Loading, empty, and error states</span><span class="checklist__state">Ready</span></div><div class="checklist__row"><span class="checklist__mark checklist__mark--pending">${icon('clock', 12)}</span><span>Real analytics responses</span><span class="checklist__state">Awaiting API</span></div><div class="checklist__row"><span class="checklist__mark checklist__mark--pending">${icon('map', 12)}</span><span>Map provider adapter</span><span class="checklist__state">Interface ready</span></div></div>` })}
      </div>
    `,
  });
}
