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

export function populateFilterOptions(data) {
  const controls = document.getElementById('controls');
  if (!controls) return;

  const teams = [...new Set(data.map((d) => d.team).filter(Boolean))].sort();
  const stageSet = new Set(data.map((d) => d.stage_group).filter(Boolean));
  const stages = STAGE_ORDER.filter((s) => stageSet.has(s));

  const years = data.map((d) => Number(d.tournament_year)).filter(Number.isFinite);
  const minYear = years.length ? Math.min(...years) : 1930;
  const maxYear = years.length ? Math.max(...years) : 2022;

  controls.innerHTML = `
    <div class="space-y-4 text-sm">
      <label class="block">
        <span class="block mb-1 text-slate-300">Team</span>
        <select id="team">
          <option value="">All teams</option>
          ${teams.map((team) => `<option value="${team}">${team}</option>`).join('')}
        </select>
      </label>

      <fieldset>
        <legend class="mb-1 text-slate-300">Stage</legend>
        <div class="space-y-1 max-h-48 overflow-auto pr-1">
          ${stages.map((stage) => `
            <label class="block">
              <input type="checkbox" class="stage" value="${stage}" checked>
              <span class="ml-1">${stage}</span>
            </label>
          `).join('')}
        </div>
      </fieldset>

      <label class="block"><input type="checkbox" id="koOnly"> <span class="ml-1">Knockout only</span></label>
      <label class="block"><input type="checkbox" id="noPens"> <span class="ml-1">Exclude penalties</span></label>
      <label class="block"><input type="checkbox" id="noOwn"> <span class="ml-1">Exclude own goals</span></label>

      <div class="grid grid-cols-2 gap-2">
        <label class="block">Minute min<input id="minMinute" type="number" min="0" max="120" value="0"></label>
        <label class="block">Minute max<input id="maxMinute" type="number" min="0" max="120" value="120"></label>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <label class="block">Year min<input id="minYear" type="number" value="${minYear}"></label>
        <label class="block">Year max<input id="maxYear" type="number" value="${maxYear}"></label>
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
    minMinute: safeNumber(document.getElementById('minMinute')?.value, 0),
    maxMinute: safeNumber(document.getElementById('maxMinute')?.value, 120),
    minYear: safeNumber(document.getElementById('minYear')?.value, 1930),
    maxYear: safeNumber(document.getElementById('maxYear')?.value, 2022)
  };
}

export function applyFilters(data, state) {
  return data.filter((d) => {
    const minute = safeNumber(d.minute, -1);
    const year = safeNumber(d.tournament_year, -1);
    const stage = d.stage_group || 'Other';

    return (
      (!state.team || d.team === state.team) &&
      state.stages.includes(stage) &&
      (!state.koOnly || Boolean(d.is_knockout)) &&
      (!state.noPens || !Boolean(d.is_penalty)) &&
      (!state.noOwn || !Boolean(d.is_own_goal)) &&
      minute >= state.minMinute && minute <= state.maxMinute &&
      year >= state.minYear && year <= state.maxYear
    );
  });
}
