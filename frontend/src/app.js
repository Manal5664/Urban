import { createApiClient } from './api/client.js';
import { renderShell, renderMobileOverlay } from './components/layout.js';
import { button, errorState, escapeHtml, filterBar } from './components/ui.js';
import { icon } from './components/icons.js';
import { DEFAULT_PAGE_ID, isPageId, PAGE_BY_ID } from './navigation.js';
import { renderPage } from './pages/index.js';
import { DEMO_FILTER_OPTIONS } from './data/demo-data.js';

const STORAGE_KEY = 'urbanTransitIq.dashboardMode';
const root = document.querySelector('[data-app-shell]');

export const apiClient = createApiClient({
  baseUrl: globalThis.__URBANTRANSIT_API_BASE_URL__ || '',
  fetcher: globalThis.fetch?.bind(globalThis),
});

const state = {
  activePage: readPageFromHash(),
  mode: readMode(),
  searchValue: '',
  refreshing: false,
  filterOpen: false,
  sidebarOpen: false,
  demoBannerVisible: true,
  apiViewModels: {},
  toast: null,
  toastTimer: null,
};

export function mountApp() {
  if (!root) return;
  bindEvents();
  render();
  globalThis.urbanTransitApi = apiClient;
  globalThis.urbanTransitApp = { state, render, apiClient, setApiViewModel };
}

function bindEvents() {
  document.addEventListener('hashchange', () => {
    state.activePage = readPageFromHash();
    state.sidebarOpen = false;
    state.filterOpen = false;
    render();
    focusMain();
  });

  document.addEventListener('click', handleClick);
  document.addEventListener('change', handleChange);
  document.addEventListener('input', handleInput);
  document.addEventListener('keydown', handleKeydown);
}

function handleClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;
  const action = actionElement.dataset.action;
  if (!action) return;

  if (action === 'open-sidebar') {
    state.sidebarOpen = true;
    render();
    return;
  }
  if (action === 'close-sidebar') {
    state.sidebarOpen = false;
    render();
    return;
  }
  if (action === 'toggle-filters') {
    state.filterOpen = !state.filterOpen;
    render();
    return;
  }
  if (action === 'dismiss-demo-banner') {
    state.demoBannerVisible = false;
    render();
    return;
  }
  if (action === 'close-toast') {
    state.toast = null;
    clearTimeout(state.toastTimer);
    render();
    return;
  }
  if (action === 'return-home') {
    navigateTo(DEFAULT_PAGE_ID);
    return;
  }
  if (action === 'refresh') {
    runRefresh();
    return;
  }
  if (action === 'notifications') {
    showToast('No new runtime notifications. Analytics events will appear here when connected.', 'info');
    return;
  }
  if (action === 'workspace-menu' || action === 'open-workspace') {
    showToast('Workspace controls are prepared for the future operating configuration.', 'info');
    return;
  }
  if (action === 'open-about') {
    showToast('UrbanTransit IQ frontend foundation · demo values are isolated from API contracts.', 'info');
    return;
  }
  if (action === 'scenario-operation') {
    const group = actionElement.closest('.segmented-control');
    group?.querySelectorAll('[data-action="scenario-operation"]').forEach((item) => item.classList.toggle('is-active', item === actionElement));
    showToast('Scenario operation selected. A baseline is required before estimates can run.', 'info');
    return;
  }
  if (action === 'map-zoom-in' || action === 'map-zoom-out' || action === 'map-settings') {
    showToast(action === 'map-settings' ? 'Map layer controls are an adapter boundary; no live provider is loaded.' : 'Map zoom is ready for a future geometry adapter.', 'info');
    return;
  }
  if (action.startsWith('navigate-')) {
    const target = action.replace('navigate-', '');
    navigateTo(target);
    return;
  }
  if (action.startsWith('open-') || action.startsWith('export-') || action === 'apply-filters' || action === 'apply-od-filters' || action === 'run-what-if' || action === 'load-what-if-baseline') {
    const labels = {
      'run-what-if': 'Scenario execution waits for an analytics baseline and estimate service.',
      'load-what-if-baseline': 'Baseline loading waits for the analytics service contract.',
      'apply-filters': 'Filter context staged. API responses will preserve these filters when connected.',
      'apply-od-filters': 'OD filter context staged for the future passenger-flow response.',
      'open-insight': 'Evidence drawer is prepared; API evidence is not connected.',
      'open-thresholds': 'Threshold configuration is an analytics contract boundary.',
      'open-capacity-rules': 'Capacity rules will be supplied with the occupancy response.',
      'open-model-card': 'Model card and metrics are intentionally hidden until real results exist.',
      'open-route-performance': 'Route performance details are ready for an API response.',
      'open-stop-analysis': 'Stop analysis details are ready for an API response.',
      'open-reliability': 'Reliability details are ready for an API response.',
      'open-issues': 'Issue-level DQ detail is ready for an API response.',
      'open-action-queue': 'Action queue detail is ready for an API response.',
      'open-flow-detail': 'OD detail is ready for an API response.',
      'open-case-explorer': 'Forecast case detail is ready for an API response.',
      'open-cluster-assignments': 'Cluster assignment detail is ready for an API response.',
      'open-crowding-evidence': 'Crowding evidence detail is ready for an API response.',
      'open-what-if-audit': 'Scenario audit detail is ready for an API response.',
      'open-evidence-policy': 'Evidence policy is part of the future recommendation contract.',
      'open-rule-catalog': 'Rule catalog detail is ready for a quality API response.',
      'open-contracts': 'Contract paths are proposals only; no backend completion is implied.',
      'open-logs': 'Runtime log navigation is reserved for the pipeline service.',
    };
    showToast(labels[action] ?? `${humanize(action)} is prepared for the analytics service.`, 'info');
  }
}

function handleChange(event) {
  const element = event.target.closest('[data-action="source-mode"]');
  if (element) {
    const nextMode = element.value === 'api' ? 'api' : 'demo';
    state.mode = nextMode;
    persistMode(nextMode);
    render();
    showToast(nextMode === 'demo' ? 'Demo preview enabled. Synthetic fixtures are clearly marked.' : 'API contract mode enabled. Unverified values are hidden.', 'success');
  }
}

function handleInput(event) {
  if (event.target.matches('[data-action="global-search"]')) {
    state.searchValue = event.target.value;
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    if (state.sidebarOpen || state.filterOpen) {
      state.sidebarOpen = false;
      state.filterOpen = false;
      render();
    }
    return;
  }
  if (event.key === 'Enter' && event.target.matches('[data-action="global-search"]')) {
    event.preventDefault();
    searchViews(state.searchValue);
  }
}

function render() {
  if (!root) return;
  try {
    const pageMarkup = renderPage(state.activePage, state.mode, state.apiViewModels[state.activePage] ?? null);
    const globalFilters = state.filterOpen ? renderGlobalFilters() : '';
    const content = `${state.mode === 'demo' && state.demoBannerVisible ? renderDemoBanner() : ''}${globalFilters}${pageMarkup}`;
    root.innerHTML = `${renderShell({ activePage: state.activePage, mode: state.mode, content, searchValue: state.searchValue, refreshing: state.refreshing, filterOpen: state.filterOpen, sidebarOpen: state.sidebarOpen })}${renderMobileOverlay(state.sidebarOpen)}${state.toast ? renderToast(state.toast) : ''}`;
    document.title = `${PAGE_BY_ID[state.activePage]?.label ?? 'Dashboard'} · UrbanTransit IQ`;
  } catch (error) {
    root.innerHTML = `${renderShell({ activePage: state.activePage, mode: state.mode, content: errorState({ title: 'Dashboard view could not render', description: 'The frontend caught a rendering error. Reload or return to the executive view.', action: button({ label: 'Return home', action: 'return-home', variant: 'primary', size: 'sm' }) }) })}`;
    console.error('UrbanTransit IQ render error', error);
  }
}

function renderGlobalFilters() {
  return `<div class="global-filter-drawer"><div class="global-filter-drawer__head"><div><span class="eyebrow">Workspace context</span><h2>Global filters</h2><p>These controls are shared by the page contracts and can be connected to URL state later.</p></div>${button({ label: 'Close filters', action: 'toggle-filters', iconName: 'close', variant: 'outline', size: 'sm' })}</div>${filterBar({ mode: state.mode, filters: [
    { key: 'global-date', label: 'Date range', icon: 'calendar', options: DEMO_FILTER_OPTIONS.dateRanges },
    { key: 'global-day', label: 'Service day', icon: 'pulse', options: DEMO_FILTER_OPTIONS.serviceDays },
    { key: 'global-route', label: 'Route scope', icon: 'route', options: DEMO_FILTER_OPTIONS.routes, demoOptions: true },
    { key: 'global-source', label: 'Source snapshot', icon: 'database', options: ['Latest available', 'Selected snapshot', 'Awaiting API'] },
  ], actions: button({ label: 'Apply workspace filters', action: 'apply-filters', iconName: 'check', variant: 'primary', size: 'sm' }) })}</div>`;
}

function renderDemoBanner() {
  return `<div class="demo-banner" role="status"><span class="demo-banner__icon">${icon('spark', 15)}</span><span><strong>Demo preview</strong> · Synthetic UI fixtures are visible for layout development. Values are not production results and will be replaced by API responses.</span><button type="button" class="demo-banner__dismiss" data-action="dismiss-demo-banner" aria-label="Dismiss demo notice">${icon('close', 15)}</button></div>`;
}

function renderToast(toast) {
  return `<div class="toast toast--${escapeTone(toast.tone)}" role="status"><span class="toast__icon">${icon(toast.tone === 'success' ? 'checkCircle' : 'info', 17)}</span><span>${escapeHtml(toast.message)}</span><button type="button" data-action="close-toast" aria-label="Dismiss notification">${icon('close', 14)}</button></div>`;
}

function showToast(message, tone = 'info') {
  state.toast = { message, tone };
  clearTimeout(state.toastTimer);
  render();
  state.toastTimer = setTimeout(() => {
    state.toast = null;
    render();
  }, 4200);
}

function runRefresh() {
  if (state.refreshing) return;
  state.refreshing = true;
  render();
  setTimeout(() => {
    state.refreshing = false;
    showToast(state.mode === 'demo' ? 'Demo preview refreshed locally. No analytics job was run.' : 'Status refresh requested. No API adapter is connected yet.', 'success');
  }, 650);
}

function searchViews(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return;
  const match = Object.values(PAGE_BY_ID).find((page) => `${page.label} ${page.description}`.toLowerCase().includes(normalized));
  if (match) {
    navigateTo(match.id);
  } else {
    showToast(`No view matched “${query}”. Try a page name such as Demand or Data Quality.`, 'info');
  }
}

function navigateTo(pageId) {
  if (!isPageId(pageId)) pageId = DEFAULT_PAGE_ID;
  if (window.location.hash !== `#/${pageId}`) {
    window.location.hash = `#/${pageId}`;
  } else {
    state.activePage = pageId;
    render();
    focusMain();
  }
  state.sidebarOpen = false;
  state.filterOpen = false;
}

export function setApiViewModel(pageId, viewModel) {
  if (!PAGE_BY_ID[pageId]) return false;
  state.apiViewModels[pageId] = viewModel;
  render();
  return true;
}

function readPageFromHash() {
  const value = globalThis.location?.hash?.replace(/^#\/?/, '') || DEFAULT_PAGE_ID;
  return isPageId(value) ? value : DEFAULT_PAGE_ID;
}

function readMode() {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    return stored === 'api' ? 'api' : 'demo';
  } catch {
    return 'demo';
  }
}

function persistMode(mode) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage is optional; the in-memory state remains authoritative.
  }
}

function focusMain() {
  requestAnimationFrame(() => document.querySelector('#main-content')?.focus());
}

function humanize(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function escapeTone(value) {
  return value === 'success' ? 'success' : value === 'error' ? 'error' : 'info';
}
