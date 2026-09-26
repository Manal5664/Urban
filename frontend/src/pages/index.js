import { renderExecutive } from './executive.js';
import { renderDemand } from './demand.js';
import { renderRoutesStops } from './routes-stops.js';
import { renderDelays } from './delays.js';
import { renderOccupancy } from './occupancy.js';
import { renderForecasting } from './forecasting.js';
import { renderClustering } from './clustering.js';
import { renderPassengerFlow } from './passenger-flow.js';
import { renderWhatIf } from './what-if.js';
import { renderRecommendations } from './recommendations.js';
import { renderDataQuality } from './data-quality.js';
import { renderSystem } from './system.js';
import { getPageData } from '../data/page-data.js';

const PAGE_RENDERERS = Object.freeze({
  executive: renderExecutive,
  demand: renderDemand,
  'routes-stops': renderRoutesStops,
  delays: renderDelays,
  occupancy: renderOccupancy,
  forecasting: renderForecasting,
  clustering: renderClustering,
  'passenger-flow': renderPassengerFlow,
  'what-if': renderWhatIf,
  recommendations: renderRecommendations,
  'data-quality': renderDataQuality,
  system: renderSystem,
});

const PAGE_META = Object.freeze({
  demand: { eyebrow: 'Demand intelligence', title: 'Understand when and where people travel.', description: 'Explore ridership, demand-derived peaks, route pressure, and stop activity through one filter-aware workspace.' },
  'routes-stops': { eyebrow: 'Network intelligence', title: 'Understand how the network performs.', description: 'Inspect route patterns, stop activity, service context, and optional spatial coverage without coupling analytics to a map provider.' },
  delays: { eyebrow: 'Reliability intelligence', title: 'Find where punctuality breaks down.', description: 'Compare delay distributions, route reliability, and time-of-day patterns while preserving the underlying stop-visit evidence.' },
  occupancy: { eyebrow: 'Capacity intelligence', title: 'Make crowding visible and actionable.', description: 'Separate isolated overload from recurring capacity pressure with segment-aware load and persistence context.' },
  forecasting: { eyebrow: 'Predictive intelligence', title: 'Compare demand forecasts with observed outcomes.', description: 'A model-ready surface for actual versus forecast, uncertainty intervals, chronological evaluation, and case-level lineage.' },
  clustering: { eyebrow: 'Pattern intelligence', title: 'See behavioral route families.', description: 'Explore explainable route groupings built from historical demand, load, reliability, frequency, and travel-time context.' },
  'passenger-flow': { eyebrow: 'Movement intelligence', title: 'Trace the network from origin to destination.', description: 'Explore directional demand, OD pairs, stop-to-stop flows, and spatial context with unresolved endpoints kept explicit.' },
  'what-if': { eyebrow: 'Scenario intelligence', title: 'Explore service changes before they happen.', description: 'Clone a known operating state, adjust a controlled scenario, and review estimates with assumptions and lineage intact.' },
  recommendations: { eyebrow: 'Decision intelligence', title: 'Move from evidence to action.', description: 'Review transparent, evidence-backed proposals with owners, impact, source windows, and human approval built into the flow.' },
  'data-quality': { eyebrow: 'Trust intelligence', title: 'Make data quality visible by default.', description: 'Inspect rule families, issue severity, reconciliation gates, dispositions, and lineage before relying on an analytics result.' },
  system: { eyebrow: 'Platform status', title: 'Keep the intelligence stack observable.', description: 'Monitor pipeline stage contracts, API readiness, source adapters, freshness, and safe integration status.' },
});

export function renderPage(pageId, mode = 'demo', apiViewModel = null) {
  const renderer = PAGE_RENDERERS[pageId] ?? renderExecutive;
  const data = { ...PAGE_META[pageId], ...getPageData(pageId, { mode, apiViewModel }) };
  return renderer({ data, mode });
}

export { PAGE_RENDERERS };
