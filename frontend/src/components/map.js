import { escapeHtml, iconButton, sourceTag } from './ui.js';
import { icon } from './icons.js';

const DEMO_ROUTES = [
  { name: 'Central Loop', color: '#f26b5e', path: 'M102 232 C150 205 170 168 218 152 S302 112 365 144 S446 188 510 160 S573 100 640 116' },
  { name: 'Riverside Connector', color: '#18b6a4', path: 'M86 128 C160 150 215 198 294 204 S417 164 488 198 S564 244 655 218' },
  { name: 'Airport Link', color: '#4b8df8', path: 'M122 270 C172 242 234 232 291 262 S386 270 447 230 S538 72 658 58' },
  { name: 'University Loop', color: '#f2b84b', path: 'M122 92 C170 72 224 84 255 124 S297 214 364 246 S466 248 532 206' },
];

const DEMO_STOPS = [
  { x: 102, y: 232, label: 'Central Hub', size: 8, tone: 'coral' },
  { x: 160, y: 209, label: 'Civic', size: 5, tone: 'blue' },
  { x: 218, y: 152, label: 'Riverside', size: 6, tone: 'teal' },
  { x: 294, y: 204, label: 'Market', size: 5, tone: 'teal' },
  { x: 365, y: 144, label: 'University', size: 7, tone: 'amber' },
  { x: 447, y: 230, label: 'Airport', size: 8, tone: 'blue' },
  { x: 510, y: 160, label: 'East Hub', size: 5, tone: 'purple' },
  { x: 640, y: 116, label: 'North Park', size: 5, tone: 'slate' },
  { x: 655, y: 218, label: 'South Yard', size: 5, tone: 'slate' },
];

/**
 * Map surface intentionally has no live map provider dependency. A future
 * provider can populate the same `networkMap` container with route geometry,
 * stop coordinates, selection, and layer controls.
 */
export function networkMap({ mode = 'demo', title = 'Network spatial view', compact = false } = {}) {
  const header = `<div class="map-card__header">
    <div><div class="map-card__title-row"><h3>${escapeHtml(title)}</h3>${sourceTag(mode, mode === 'demo' ? 'DEMO GEOMETRY' : 'API CONTRACT')}</div><p>${mode === 'demo' ? 'Illustrative network geometry for UI development.' : 'Geometry will render from the map adapter when coordinates are available.'}</p></div>
    <div class="map-card__controls">${iconButton({ label: 'Zoom in', action: 'map-zoom-in', iconName: 'plus', variant: 'outline', size: 'sm' })}${iconButton({ label: 'Zoom out', action: 'map-zoom-out', iconName: 'minus', variant: 'outline', size: 'sm' })}${iconButton({ label: 'Map settings', action: 'map-settings', iconName: 'sliders', variant: 'outline', size: 'sm' })}</div>
  </div>`;
  if (mode !== 'demo') {
    return `<section class="map-card ${compact ? 'map-card--compact' : ''}">${header}<div class="map-placeholder map-placeholder--api"><div class="map-placeholder__grid"></div><div class="map-placeholder__content"><span class="map-placeholder__icon">${icon('map', 24)}</span><strong>Map adapter awaiting route geometry</strong><span>Stop coordinates and pattern geometry remain unmounted until the analytics service provides them.</span></div></div><div class="map-card__footer"><span>${icon('lock', 13)} No live provider or production coordinates loaded</span><span>Interface contract ready</span></div></section>`;
  }
  const lines = DEMO_ROUTES.map((route) => `<path class="map-route map-route--${escapeHtml(route.color.replace('#', ''))}" d="${route.path}" stroke="${route.color}"/><text class="map-route-label" x="${route.name === 'Airport Link' ? 526 : route.name === 'Riverside Connector' ? 380 : route.name === 'University Loop' ? 160 : 188}" y="${route.name === 'Airport Link' ? 98 : route.name === 'Riverside Connector' ? 218 : route.name === 'University Loop' ? 108 : 140}">${escapeHtml(route.name)}</text>`).join('');
  const stops = DEMO_STOPS.map((stop) => `<g class="map-stop map-stop--${escapeHtml(stop.tone)}"><circle cx="${stop.x}" cy="${stop.y}" r="${stop.size + 5}" fill="currentColor" fill-opacity=".10"/><circle cx="${stop.x}" cy="${stop.y}" r="${stop.size}" fill="currentColor" stroke="#ffffff" stroke-width="2"/><title>${escapeHtml(stop.label)} · demo stop</title></g>`).join('');
  return `<section class="map-card ${compact ? 'map-card--compact' : ''}" data-demo="true">${header}<div class="map-canvas"><div class="map-canvas__grid"></div><div class="map-canvas__label">DEMO NETWORK PREVIEW</div><svg viewBox="0 0 740 310" role="img" aria-label="Illustrative transit network map"><title>Illustrative network map, not production geography</title>${lines}${stops}</svg><div class="map-legend"><span><i class="map-legend__line map-legend__line--coral"></i>Corridor</span><span><i class="map-legend__line map-legend__line--teal"></i>Feeder</span><span><i class="map-legend__dot"></i>Stop</span></div><div class="map-canvas__scale">Scale / geography not production data</div></div><div class="map-card__footer"><span>${icon('lock', 13)} No live provider or production coordinates loaded</span><span>Click a stop to open evidence drawer</span></div></section>`;
}

export function mapStat({ label, value, detail, tone = 'teal' }) {
  return `<div class="map-stat"><span class="map-stat__dot map-stat__dot--${escapeHtml(tone)}"></span><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></div>`;
}
