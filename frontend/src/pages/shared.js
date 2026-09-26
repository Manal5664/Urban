import { icon } from '../components/icons.js';
import { barChart, chartEmpty, donutChart, heatmap, lineChart, scatterPlot, sparkline } from '../components/charts.js';
import { networkMap } from '../components/map.js';
import {
  button,
  chartFrame,
  callout,
  chartState,
  demoNote,
  emptyState,
  escapeHtml,
  field,
  filterBar,
  kpiGrid,
  legend,
  notice,
  pageHeader,
  panel,
  pill,
  sectionHeading,
  statusBadge,
  statusDot,
  table,
} from '../components/ui.js';

export { barChart, chartEmpty, chartState, donutChart, heatmap, lineChart, networkMap, sparkline, scatterPlot };

export function pageFrame({ data, mode, children, actions = '', filter = null, updated = '' }) {
  const filterMarkup = filter
    ? typeof filter === 'string'
      ? filter
      : filterBar({ filters: filter, mode })
    : '';
  return `${pageHeader({ eyebrow: data.eyebrow || 'Analytics workspace', title: data.title || data.name || 'Analytics view', description: data.description || '', mode, updated: updated || data.lastUpdated || '', actions })}${filter ? `<div class="page-filter">${filterMarkup}</div>` : ''}${children}`;
}

export function kpiRow(items, mode, className = '', dataReady = false) {
  return kpiGrid(items, mode, { className, dataReady });
}

export function chartPanel({ title, subtitle, chart, source = 'demo', legendItems = [], action = '', footer = '', className = '' }) {
  return chartFrame({ title, subtitle, body: chart, source, legend: legendItems.length ? legend(legendItems) : '', action, footer, className });
}

export function tablePanel({ title, description, columns, rows, mode, dataReady = false, action = '', className = '' }) {
  return panel({
    title,
    description,
    action,
    className,
    body: table({ columns, rows, mode, dataReady }),
  });
}

export function routeNameCell(row) {
  return `<div class="entity-cell"><span class="entity-cell__mark">${escapeHtml((row.code || row.route || 'R').slice(0, 2))}</span><span><strong>${escapeHtml(row.name || row.route || '—')}</strong><small>${escapeHtml(row.code || row.route || '')}</small></span></div>`;
}

export function stopNameCell(row) {
  return `<div class="entity-cell"><span class="entity-cell__mark entity-cell__mark--stop">${icon('map', 14)}</span><span><strong>${escapeHtml(row.name || '—')}</strong><small>${escapeHtml(row.code || row.zone || '')}</small></span></div>`;
}

export function trendCell(value, trend) {
  const positive = String(trend || '').startsWith('+');
  const negative = String(trend || '').startsWith('-');
  return `<span class="trend-cell ${positive ? 'is-positive' : negative ? 'is-negative' : ''}">${sparkline({ values: positive ? [4, 5, 5, 7, 8] : negative ? [8, 7, 7, 5, 4] : [4, 5, 5, 5, 5], colorName: positive ? 'teal' : negative ? 'coral' : 'slate', width: 58, height: 24, label: 'Demo trend' })}<strong>${escapeHtml(value || '—')}</strong></span>`;
}

export function statusCell(row, field = 'status') {
  return statusBadge(row[field] || 'Awaiting API', row.tone || 'pending');
}

export function apiPlaceholder({ title, description, compact = false, action = '' }) {
  return emptyState({ title, description, compact, iconName: 'database', action });
}

export function signalList(items = []) {
  return `<div class="signal-list">${items.map((item) => `<div class="signal-item signal-item--${escapeHtml(item.tone || 'neutral')}"><span class="signal-item__icon">${icon(item.icon || 'activity', 16)}</span><span class="signal-item__copy"><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.detail)}</small></span><span class="signal-item__value">${escapeHtml(item.value)}</span></div>`).join('')}</div>`;
}

export function numberedInsightList(items = []) {
  return `<div class="numbered-list">${items.map((item) => `<div class="numbered-list__item"><span class="numbered-list__rank">${escapeHtml(item.rank)}</span><span class="numbered-list__body"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></span>${item.tag ? pill(item.tag, item.tone || 'neutral') : ''}</div>`).join('')}</div>`;
}

export function filterRow({ mode, filters, action = '' }) {
  return filterBar({ filters, mode, actions: action });
}

export function readinessRow(items = []) {
  return `<div class="readiness-list">${items.map((item) => `<div class="readiness-row"><span class="readiness-row__label">${escapeHtml(item.label)}</span><span class="readiness-row__value">${statusBadge(item.value, item.status === 'good' ? 'good' : 'pending', item.status === 'good' ? 'check' : 'clock')}</span></div>`).join('')}</div>`;
}

export function metricComparison({ label, baseline, scenario, delta = '' }) {
  return `<div class="comparison-metric"><span>${escapeHtml(label)}</span><div><strong>${escapeHtml(baseline)}</strong><span class="comparison-arrow">→</span><strong>${escapeHtml(scenario)}</strong></div>${delta ? `<small>${escapeHtml(delta)}</small>` : ''}</div>`;
}

export function chartOrApi(mode, chart, emptyTitle, emptyDescription, action = '') {
  return mode === 'demo' ? chart : emptyState({ title: emptyTitle, description: emptyDescription, action, iconName: 'chart' });
}

export function stateNotice(mode, apiReady = false) {
  if (mode === 'api' && !apiReady) return notice({ tone: 'info', title: 'Analytics API boundary is ready', description: 'No adapter is connected. This view intentionally renders empty states rather than placeholder production values.', iconName: 'plug' });
  return '';
}

export function demoBlock(markup, mode, placeholder) {
  return mode === 'demo' ? markup : placeholder;
}

export function kpiOrPending(items, mode) {
  return kpiRow(items, mode);
}

export function panelHeaderActions(label, action = 'export') {
  return button({ label, action, iconName: 'download', variant: 'outline', size: 'sm' });
}

export function fieldGrid(fields = []) {
  return `<div class="field-grid">${fields.map((fieldItem) => field(fieldItem)).join('')}</div>`;
}

export function sourceFooter(mode) {
  return mode === 'demo' ? demoNote('Synthetic UI fixture', mode) : '<span class="api-note">API response contract</span>';
}

