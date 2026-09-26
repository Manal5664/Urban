import { button, field, panel, segmentedControl, statusBadge } from '../components/ui.js';
import {
  chartPanel,
  chartState,
  kpiRow,
  pageFrame,
  panelHeaderActions,
  stateNotice,
  tablePanel,
} from './shared.js';

export function renderWhatIf({ data, mode }) {
  const assumptions = `<ul class="assumption-list">${data.assumptions.map((assumption) => `<li><span>${statusBadge('Guardrail', 'good', 'check')}</span><p>${assumption}</p></li>`).join('')}</ul>`;
  const comparison = `<div class="whatif-comparison"><div class="whatif-comparison__head"><span>Measure</span><span>Baseline</span><span>Scenario</span><span>Delta</span></div>${data.baseline.map((item, index) => `<div class="whatif-comparison__row"><span><strong>${item.label}</strong><small>${item.note}</small></span><b>${item.value}</b><b>${data.scenario[index].value}</b><span class="pending-value">—</span></div>`).join('')}</div>`;
  return pageFrame({
    data,
    mode,
    updated: mode === 'demo' ? 'Scenario workspace · no estimates generated' : 'Awaiting scenario baseline response',
    actions: `${button({ label: 'Load baseline', action: 'load-what-if-baseline', iconName: 'database', variant: 'outline', size: 'sm' })}${button({ label: 'Run scenario', action: 'run-what-if', iconName: 'play', variant: 'primary', size: 'sm' })}`,
    children: `
      ${stateNotice(mode)}
      <div class="whatif-hero"><div class="whatif-hero__copy"><span class="whatif-hero__icon">${statusBadge('Estimates only', 'amber', 'spark')}</span><h2>Test a change without changing the baseline.</h2><p>Clone a known schedule, capacity, route-stop state, and demand context. The future service will return estimated outcomes with assumptions and evidence attached.</p></div><div class="whatif-hero__signal"><span>Scenario status</span><strong>Awaiting API</strong><small>No estimate has been generated</small></div></div>
      <div class="dashboard-grid dashboard-grid--whatif">
        ${panel({ title: 'Scenario controls', eyebrow: 'What changes?', description: 'All fields are inputs to a future scenario estimate.', body: `<div class="scenario-form"><div class="scenario-form__row"><label class="scenario-field"><span>Base service date</span><span class="scenario-input">${icon('calendar', 15)}<input type="text" value="Select from API" readonly data-action="select-base-date" /></span></label><label class="scenario-field"><span>Service type</span><span class="scenario-input">${icon('sliders', 15)}<input type="text" value="All service types" readonly data-action="select-service-type" />${icon('chevron', 14)}</span></label></div><div class="scenario-form__row"><label class="scenario-field"><span>Scenario horizon</span><span class="scenario-input">${icon('clock', 15)}<input type="text" value="24 hours" readonly data-action="select-horizon" />${icon('chevron', 14)}</span></label><label class="scenario-field"><span>Demand view</span><span class="scenario-input">${icon('pulse', 15)}<input type="text" value="Served demand" readonly data-action="select-demand-view" />${icon('chevron', 14)}</span></label></div><div class="scenario-form__row"><label class="scenario-field scenario-field--full"><span>Change set</span><span class="scenario-input scenario-input--multiline">${icon('wand', 15)}<textarea readonly placeholder="Awaiting a baseline from the analytics service">Frequency, capacity, start time, stop, or demand changes will be selected here.</textarea></span></label></div><div class="scenario-form__footer">${segmentedControl({ label: 'Scenario operation', items: [{ value: 'frequency', label: 'Frequency' }, { value: 'capacity', label: 'Capacity' }, { value: 'timing', label: 'Timing' }], active: 'frequency', action: 'scenario-operation' })}<button class="button button--primary button--md" type="button" data-action="run-what-if">${icon('play', 16)}<span>Run estimate</span></button></div></div>` })}
        ${panel({ title: 'Assumptions & safeguards', eyebrow: 'Before you run', body: assumptions })}
      </div>
      ${kpiRow([
        { label: 'Baseline loaded', value: '—', unit: 'API required', delta: 'Not supplied', direction: 'pending', icon: 'database', tone: 'slate' },
        { label: 'Scenario coverage', value: '—', unit: 'API required', delta: 'Not supplied', direction: 'pending', icon: 'target', tone: 'blue' },
        { label: 'Evidence confidence', value: '—', unit: 'API required', delta: 'Not supplied', direction: 'pending', icon: 'shield', tone: 'teal' },
        { label: 'Result status', value: 'Not run', unit: 'local state', delta: 'No claims', direction: 'attention', icon: 'activity', tone: 'amber' },
      ], mode, '', Boolean(data.__hasApiData))}
      ${panel({ title: 'Baseline versus scenario', eyebrow: 'Result surface', description: 'Results remain empty until a baseline and a scenario estimate are available.', body: comparison, className: 'panel--wide' })}
      ${chartPanel({ title: 'Scenario impact visualization', subtitle: 'A comparison chart slot for load, wait, coverage, and demand outcomes.', chart: chartState({ state: 'empty', title: 'No scenario estimate yet', description: 'Run a future what-if request to populate the comparison view. No production or mock estimate is fabricated here.' }), source: mode, className: 'chart-panel--wide', action: panelHeaderActions('Export result', 'export-what-if') })}
      ${tablePanel({ title: 'What-if result audit', description: 'Every returned result should retain input snapshot, assumptions, model/service version, and as-of time.', columns: [
        { label: 'Measure', render: () => '<span class="pending-value">Awaiting scenario</span>' },
        { label: 'Baseline', render: () => '<span class="pending-value">—</span>' },
        { label: 'Scenario', render: () => '<span class="pending-value">—</span>' },
        { label: 'Assumption', render: () => '<span class="pending-value">API required</span>' },
        { label: 'Lineage', render: () => '<span class="pending-value">API required</span>' },
      ], rows: [{}], mode, dataReady: Boolean(data.__hasApiData), action: panelHeaderActions('Open result audit', 'open-what-if-audit') })}
    `,
  });
}

function icon(name) {
  return `<span class="mini-glyph" aria-hidden="true">${name === 'calendar' ? '▣' : name === 'sliders' ? '☷' : name === 'clock' ? '◷' : name === 'pulse' ? '⌁' : '✦'}</span>`;
}
