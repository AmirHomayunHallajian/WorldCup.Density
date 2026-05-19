import { loadGoals } from './dataLoader.js';
import { populateFilterOptions, getFilterState, applyFilters, resetFilters } from './filters.js';
import { summarizeGoals, topByKey } from './stats.js';
import {
  renderScatter,
  renderHeatmap,
  renderMinuteHistogram,
  renderYearTotals,
  renderStageBreakdown
} from './plots.js';

const plotContainer = document.getElementById('plot');
const plotMeta = document.getElementById('plotMeta');
const summaryContainer = document.getElementById('summary');
const interpretation = document.getElementById('interpretation');
const controls = document.getElementById('controls');
const viewToggle = document.getElementById('viewToggle');
const dataBadge = document.getElementById('dataBadge');
const topScorersEl = document.getElementById('topScorers');
const topTeamsEl = document.getElementById('topTeams');

const VIEWS = {
  scatter: {
    label: 'One dot per goal, positioned at its match minute and tournament year.',
    render: renderScatter
  },
  heatmap: {
    label: 'Binned density of goals across minute × year. Hotter cells = more goals in that window.',
    render: renderHeatmap
  },
  minute: {
    label: 'Goals binned by match minute, stacked by stage.',
    render: renderMinuteHistogram
  },
  year: {
    label: 'Total goals per tournament across history.',
    render: renderYearTotals
  },
  stage: {
    label: 'Distribution of goal minutes within each stage. Diamonds mark the median minute.',
    render: renderStageBreakdown
  }
};

let allGoals = [];
let currentView = 'scatter';

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function fmtPct(n) {
  return `${n.toFixed(1)}%`;
}

function fmtMinute(n) {
  return n.toFixed(1);
}

function renderSummary(summary) {
  const cards = [
    { label: 'Total goals', value: summary.totalGoals.toLocaleString(), sub: `${summary.tournaments} tournament${summary.tournaments === 1 ? '' : 's'}` },
    { label: 'Mean minute', value: fmtMinute(summary.meanMinute), sub: `median ${fmtMinute(summary.medianMinute)}` },
    { label: 'After 75′', value: fmtPct(summary.pctAfter75), sub: `${fmtPct(summary.pct90Plus)} after 90′` },
    { label: 'First half share', value: fmtPct(summary.pctFirstHalf), sub: `≤ 45′` },
    { label: 'Penalties', value: fmtPct(summary.pctPenalty), sub: 'of selected goals' },
    { label: 'Own goals', value: fmtPct(summary.pctOwnGoal), sub: 'of selected goals' },
    { label: 'Earliest year', value: summary.minYear ?? '—', sub: ' ' },
    { label: 'Latest year', value: summary.maxYear ?? '—', sub: ' ' }
  ];

  summaryContainer.innerHTML = cards
    .map(
      (c) => `
      <div class="summary-card">
        <div class="label">${c.label}</div>
        <div class="value">${c.value}</div>
        <div class="sub">${c.sub}</div>
      </div>`
    )
    .join('');
}

function renderTopList(container, items, suffix = 'goals') {
  if (!items.length) {
    container.innerHTML = '<p class="text-sm text-slate-500">No data for current filter.</p>';
    return;
  }
  const max = items[0].count;
  container.innerHTML = items
    .map(
      (item, idx) => `
      <div class="stat-row">
        <span class="rank">${String(idx + 1).padStart(2, '0')}</span>
        <div>
          <div>${item.name}</div>
          <div class="bar"><span style="width:${(item.count / max) * 100}%"></span></div>
        </div>
        <span class="value">${item.count}<span class="text-slate-500 text-xs"> ${suffix}</span></span>
      </div>`
    )
    .join('');
}

function renderInterpretation(summary, state) {
  if (!summary.totalGoals) {
    interpretation.innerHTML = '<p>No goals match the current filter. Try widening the year or stage selection.</p>';
    return;
  }
  const teamLabel = state.team ? `<strong>${state.team}</strong>` : 'all teams';
  const stageLabel = state.stages.length === 7 || state.stages.length === 0
    ? 'every stage'
    : state.stages.join(', ');
  interpretation.innerHTML = `
    <p>
      In this filter (${teamLabel} • ${stageLabel} • ${summary.minYear}–${summary.maxYear}),
      <strong>${summary.totalGoals.toLocaleString()}</strong> goals were scored, with a mean kick-off-to-goal time
      of <strong>${fmtMinute(summary.meanMinute)}′</strong>.
      <strong>${fmtPct(summary.pctAfter75)}</strong> of goals arrive after the 75th minute, and
      <strong>${fmtPct(summary.pct90Plus)}</strong> in stoppage time of regulation or later —
      a fingerprint of the late-game pressure that makes World Cup football compulsive viewing.
    </p>`;
}

function rerender() {
  const state = getFilterState();
  const filtered = applyFilters(allGoals, state);
  const view = VIEWS[currentView] || VIEWS.scatter;

  if (plotMeta) plotMeta.textContent = view.label;
  view.render(filtered, plotContainer, state);

  const summary = summarizeGoals(filtered, state);
  renderSummary(summary);
  renderInterpretation(summary, state);
  renderTopList(topScorersEl, topByKey(filtered, 'player'));
  renderTopList(topTeamsEl, topByKey(filtered, 'team'));
}

loadGoals()
  .then((rows) => {
    allGoals = rows;

    if (dataBadge) {
      const years = rows.map((r) => r.tournament_year).filter((y) => y > 0);
      const min = years.length ? Math.min(...years) : '?';
      const max = years.length ? Math.max(...years) : '?';
      dataBadge.textContent = `${rows.length.toLocaleString()} goals · ${min}–${max}`;
    }

    populateFilterOptions(allGoals);

    controls?.addEventListener('input', rerender);
    controls?.addEventListener('change', rerender);
    controls?.addEventListener('click', (event) => {
      if (event.target?.id === 'resetFilters') {
        resetFilters();
        rerender();
      }
    });

    viewToggle?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-view]');
      if (!button) return;
      currentView = button.dataset.view;
      document.querySelectorAll('#viewToggle .toggle').forEach((el) => {
        el.classList.toggle('active', el.dataset.view === currentView);
      });
      rerender();
    });

    window.addEventListener('resize', debounce(rerender, 150));
    rerender();
  })
  .catch((error) => {
    console.error('Failed to load goals CSV:', error);
    interpretation.innerHTML = `
      <p class="text-rose-300">
        Failed to load data. Open the browser console for details and verify
        <code class="bg-slate-900 px-1 rounded">data/goals.csv</code> exists.
      </p>`;
  });
