import { loadGoals } from './dataLoader.js';
import { populateFilterOptions, getFilterState, applyFilters } from './filters.js';
import { summarizeGoals } from './stats.js';
import { renderScatter, renderHeatmap } from './plots.js';

const plotContainer = document.getElementById('plot');
const summaryContainer = document.getElementById('summary');
const interpretation = document.getElementById('interpretation');
const controls = document.getElementById('controls');
const viewToggle = document.getElementById('viewToggle');

let allGoals = [];
let currentView = 'scatter';

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function renderSummary(summary) {
  const cards = [
    ['Total goals', String(summary.totalGoals)],
    ['Mean minute', summary.meanMinute.toFixed(1)],
    ['Median minute', summary.medianMinute.toFixed(1)],
    ['90+ goals', `${summary.pct90Plus.toFixed(1)}%`],
    ['After 75\'', `${summary.pctAfter75.toFixed(1)}%`],
    ['Earliest year', summary.minYear ?? '—'],
    ['Latest year', summary.maxYear ?? '—']
  ];

  summaryContainer.innerHTML = cards
    .map(
      ([label, value]) =>
        `<div class="card p-3"><p class="text-xs text-slate-400">${label}</p><p class="text-xl font-semibold">${value}</p></div>`
    )
    .join('');
}

function renderInterpretation(summary) {
  interpretation.textContent = summary.totalGoals
    ? `In the current filter, ${summary.pctAfter75.toFixed(1)}% of goals happen after the 75th minute.`
    : 'No goals match the current filter.';
}

function rerender() {
  const state = getFilterState();
  const filtered = applyFilters(allGoals, state);

  if (currentView === 'heatmap') {
    renderHeatmap(filtered, plotContainer, state);
  } else {
    renderScatter(filtered, plotContainer, state);
  }

  const summary = summarizeGoals(filtered);
  renderSummary(summary);
  renderInterpretation(summary);
}

loadGoals()
  .then((rows) => {
    allGoals = rows;

    const requiredColumns = ['team', 'stage_group', 'minute', 'tournament_year'];
    const missing = requiredColumns.filter((key) => !(key in (rows[0] || {})));
    if (missing.length) {
      console.warn(`Missing expected columns: ${missing.join(', ')}`);
    }

    populateFilterOptions(allGoals);
    controls?.addEventListener('input', rerender);
    controls?.addEventListener('change', rerender);

    viewToggle?.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-view]');
      if (!button) return;
      currentView = button.dataset.view;
      document.querySelectorAll('.toggle').forEach((el) => {
        el.classList.toggle('active', el.dataset.view === currentView);
      });
      rerender();
    });

    window.addEventListener('resize', debounce(rerender, 120));
    rerender();
  })
  .catch((error) => {
    console.error('Failed to load goals CSV:', error);
    interpretation.textContent = 'Failed to load data. Check console and data/goals.csv.';
  });
