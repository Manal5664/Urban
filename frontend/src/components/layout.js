import { NAV_GROUPS, PAGE_BY_ID } from '../navigation.js';
import { icon } from './icons.js';
import { button, escapeHtml, iconButton, sourceTag, statusDot } from './ui.js';

export function renderSidebar({ activePage = 'executive', open = false, mode = 'demo' } = {}) {
  const groups = NAV_GROUPS.map((group) => `<div class="sidebar__group">
    <p class="sidebar__group-label">${escapeHtml(group.label)}</p>
    <nav class="sidebar__nav" aria-label="${escapeHtml(group.label)}">
      ${group.items.map((item) => `<a class="nav-item ${item.id === activePage ? 'is-active' : ''}" href="#/${item.id}" data-page="${escapeHtml(item.id)}" ${item.id === activePage ? 'aria-current="page"' : ''}><span class="nav-item__icon">${icon(item.icon, 18)}</span><span class="nav-item__label">${escapeHtml(item.label)}</span>${item.id === activePage ? '<span class="nav-item__active-bar"></span>' : ''}</a>`).join('')}
    </nav>
  </div>`).join('');

  return `<aside class="sidebar ${open ? 'is-open' : ''}" data-sidebar>
    <div class="sidebar__brand">
      <a class="brand-mark" href="#/executive" aria-label="UrbanTransit IQ home"><span class="brand-mark__symbol">UT</span><span class="brand-mark__copy"><strong>UrbanTransit</strong><small>IQ / Transit intelligence</small></span></a>
      <button class="sidebar__close" type="button" data-action="close-sidebar" aria-label="Close navigation">${icon('close', 19)}</button>
    </div>
    <div class="sidebar__mode">${sourceTag(mode, mode === 'demo' ? 'DEMO PREVIEW' : 'API CONTRACT')}<span>${mode === 'demo' ? 'Synthetic UI fixtures' : 'Unverified values hidden'}</span></div>
    <div class="sidebar__scroll"><div class="sidebar__nav-wrap">${groups}</div></div>
    <div class="sidebar__footer">
      <div class="sidebar__workspace"><span class="workspace-avatar">UT</span><span><strong>Foundation workspace</strong><small>Frontend contract layer</small></span><button type="button" class="workspace-menu" data-action="workspace-menu" aria-label="Workspace menu">${icon('more', 16)}</button></div>
      <div class="sidebar__connection"><span>${statusDot(mode === 'demo' ? 'demo' : 'pending')}</span><span>${mode === 'demo' ? 'Demo mode active' : 'API adapter not connected'}</span></div>
    </div>
  </aside>`;
}

export function renderHeader({ activePage = 'executive', mode = 'demo', searchValue = '', refreshing = false, filterOpen = false } = {}) {
  const page = PAGE_BY_ID[activePage] ?? PAGE_BY_ID.executive;
  const dateLabel = mode === 'demo' ? 'Demo range · Last 7 days' : 'Select date range';
  return `<header class="topbar">
    <div class="topbar__left"><button class="mobile-menu-button" type="button" data-action="open-sidebar" aria-label="Open navigation">${icon('menu', 20)}</button><div class="breadcrumbs"><span>Workspace</span><span class="breadcrumbs__slash">/</span><strong>${escapeHtml(page.label)}</strong></div></div>
    <div class="topbar__right">
      <label class="global-search"><span class="sr-only">Search dashboard</span>${icon('search', 16)}<input type="search" value="${escapeHtml(searchValue)}" placeholder="Search views, routes, stops" data-action="global-search" autocomplete="off" /></label>
      <label class="topbar-select"><span class="sr-only">Data source mode</span><select data-action="source-mode" aria-label="Data source mode"><option value="demo" ${mode === 'demo' ? 'selected' : ''}>Demo preview</option><option value="api" ${mode === 'api' ? 'selected' : ''}>API contract mode</option></select>${icon('chevron', 14)}</label>
      <button class="topbar-date" type="button" data-action="open-date-filter">${icon('calendar', 15)}<span>${escapeHtml(dateLabel)}</span>${icon('chevron', 13)}</button>
      <button class="topbar-icon" type="button" data-action="toggle-filters" aria-label="Toggle filters" aria-expanded="${filterOpen}">${icon('filter', 18)}${filterOpen ? '<span class="topbar-icon__dot"></span>' : ''}</button>
      <button class="topbar-icon topbar-icon--notification" type="button" data-action="notifications" aria-label="Notifications">${icon('bell', 18)}<span class="notification-dot"></span></button>
      <button class="refresh-button ${refreshing ? 'is-refreshing' : ''}" type="button" data-action="refresh" ${refreshing ? 'disabled' : ''}>${icon('refresh', 16)}<span>${refreshing ? 'Refreshing' : 'Refresh'}</span></button>
    </div>
  </header>`;
}

export function renderShell({ activePage = 'executive', mode = 'demo', content = '', searchValue = '', refreshing = false, filterOpen = false, sidebarOpen = false } = {}) {
  return `<div class="app-shell">${renderSidebar({ activePage, open: sidebarOpen, mode })}<div class="app-main">${renderHeader({ activePage, mode, searchValue, refreshing, filterOpen })}<main id="main-content" class="main-content" tabindex="-1">${content}</main><footer class="app-footer"><span>UrbanTransit IQ · frontend foundation</span><span>No production analytics connected</span><button type="button" data-action="open-about">About this foundation ${icon('chevronRight', 13)}</button></footer></div></div>`;
}

export function renderMobileOverlay(open) {
  return open ? '<button class="mobile-overlay" type="button" data-action="close-sidebar" aria-label="Close navigation"></button>' : '';
}
