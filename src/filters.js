const STAGE_ORDER = [
  'Group',
  'Round of 16',
  'Quarter-final',
  'Semi-final',
  'Third-place',
  'Final',
  'Other'
];

function safeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

let cachedYearBounds = { min: 1930, max: 2022 };

export function populateFilterOptions(data) {
  const controls = document.getElementById('controls');
  if (!controls) return;

  const teams = [...new Set(data.map((d) => d.team).filter(Boolean))].sort();
  const stageSet = new Set(data.map((d) => d.stage_group).filter(Boolean));
  const stages = STAGE_ORDER.filter((s) => stageSet.has(s));

  const years = data.map((d) => Number(d.tournament_year)).filter((y) => Number.isFinite(y) && y > 0);
  const minYear = years.length ? Math.min(...years) : 1930;
  const maxYear = years.length ? Math.max(...years) : 2022;
  cachedYearBounds = { min: minYear, max: maxYear };

  controls.innerHTML = `
    <div class="space-y-4 text-sm">
      <div class="flex items-center justify-between">
        <h2 class="text-xs uppercase tracking-wider text-slate-400">Filters</h2>
        <button id="resetFilters" type="button" class="text-xs text-sky-400 hover:text-sky-300">Reset</button>
      </div>

      <label class="block">
        <span class="block mb-1 text-slate-300">Team</span>
        <select id="team">
          <option value="">All teams (${teams.length})</option>
          ${teams.map((team) => `<option value="${team}">${team}</option>`).join('')}
        </select>
      </label>

      <fieldset>
        <legend class="mb-1 text-slate-300">Stage</legend>
        <div class="space-y-1 max-h-44 overflow-auto pr-1">
          ${stages
            .map(
              (stage) => `
            <label class="flex items-center gap-2">
              <input type="checkbox" class="stage" value="${stage}" checked>
              <span>${stage}</span>
            </label>
          `
            )
            .join('')}
        </div>
      </fieldset>

      <div class="space-y-1">
        <label class="flex items-center gap-2">
          <input type="checkbox" id="koOnly"> <span>Knockout only</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" id="noPens"> <span>Exclude penalties</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" id="noOwn"> <span>Exclude own goals</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" id="includeStoppage" checked>
          <span>Count stoppage in minute</span>
        </label>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <label class="block">
          <span class="text-slate-400 text-xs">Minute min</span>
          <input id="minMinute" type="number" min="0" max="120" value="0">
        </label>
        <label class="block">
          <span class="text-slate-400 text-xs">Minute max</span>
          <input id="maxMinute" type="number" min="0" max="120" value="120">
        </label>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <label class="block">
          <span class="text-slate-400 text-xs">Year min</span>
          <input id="minYear" type="number" min="${minYear}" max="${maxYear}" value="${minYear}">
        </label>
        <label class="block">
          <span class="text-slate-400 text-xs">Year max</span>
          <input id="maxYear" type="number" min="${minYear}" max="${maxYear}" value="${maxYear}">
        </label>
      </div>
    </div>
  `;
}

export function getFilterState() {
  const selectedStages = [...document.querySelectorAll('.stage:checked')].map((el) => el.value);
  return {
    team: document.getElementById('team')?.value || '',
    stages: selectedStages,
    koOnly: Boolean(document.getElementById('koOnly')?.checked),
    noPens: Boolean(document.getElementById('noPens')?.checked),
    noOwn: Boolean(document.getElementById('noOwn')?.checked),
    includeStoppage: Boolean(document.getElementById('includeStoppage')?.checked),
    minMinute: safeNumber(document.getElementById('minMinute')?.value, 0),
    maxMinute: safeNumber(document.getElementById('maxMinute')?.value, 120),
    minYear: safeNumber(document.getElementById('minYear')?.value, cachedYearBounds.min),
    maxYear: safeNumber(document.getElementById('maxYear')?.value, cachedYearBounds.max)
  };
}

export function applyFilters(data, state) {
  return data.filter((d) => {
    const minute = state.includeStoppage ? d.effective_minute : d.minute;
    const year = d.tournament_year;
    const stage = d.stage_group || 'Other';

    return (
      (!state.team || d.team === state.team) &&
      state.stages.includes(stage) &&
      (!state.koOnly || d.is_knockout) &&
      (!state.noPens || !d.is_penalty) &&
      (!state.noOwn || !d.is_own_goal) &&
      minute >= state.minMinute &&
      minute <= state.maxMinute &&
      year >= state.minYear &&
      year <= state.maxYear
    );
  });
}

export function resetFilters() {
  document.querySelectorAll('.stage').forEach((el) => {
    el.checked = true;
  });
  const team = document.getElementById('team');
  if (team) team.value = '';
  ['koOnly', 'noPens', 'noOwn'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.checked = false;
  });
  const stoppage = document.getElementById('includeStoppage');
  if (stoppage) stoppage.checked = true;
  const minMinute = document.getElementById('minMinute');
  if (minMinute) minMinute.value = 0;
  const maxMinute = document.getElementById('maxMinute');
  if (maxMinute) maxMinute.value = 120;
  const minYear = document.getElementById('minYear');
  if (minYear) minYear.value = cachedYearBounds.min;
  const maxYear = document.getElementById('maxYear');
  if (maxYear) maxYear.value = cachedYearBounds.max;
}
