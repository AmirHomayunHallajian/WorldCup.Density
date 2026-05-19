const CSV_PATH = 'data/goals.csv';

function coerceBool(value) {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 't';
}

function coerceNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeRow(row) {
  const minute = coerceNumber(row.minute, 0);
  const stoppage = coerceNumber(row.stoppage_minute, 0);
  return {
    ...row,
    tournament_year: coerceNumber(row.tournament_year, 0),
    minute,
    stoppage_minute: stoppage,
    effective_minute: minute + stoppage,
    is_knockout: coerceBool(row.is_knockout),
    is_penalty: coerceBool(row.is_penalty),
    is_own_goal: coerceBool(row.is_own_goal)
  };
}

export function loadGoals() {
  return new Promise((resolve, reject) => {
    Papa.parse(CSV_PATH, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data
          .filter((row) => row && row.tournament_year)
          .map(normalizeRow);
        resolve(rows);
      },
      error: reject
    });
  });
}
