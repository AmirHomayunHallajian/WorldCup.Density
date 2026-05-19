export function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function summarizeGoals(data, state) {
  const useStoppage = state?.includeStoppage ?? true;
  const minutes = data
    .map((d) => (useStoppage ? d.effective_minute : d.minute))
    .filter(Number.isFinite);

  const years = data.map((d) => d.tournament_year).filter((y) => Number.isFinite(y) && y > 0);
  const total = data.length;

  if (!total) {
    return {
      totalGoals: 0,
      meanMinute: 0,
      medianMinute: 0,
      pct90Plus: 0,
      pctAfter75: 0,
      pctFirstHalf: 0,
      pctPenalty: 0,
      pctOwnGoal: 0,
      tournaments: 0,
      minYear: null,
      maxYear: null
    };
  }

  return {
    totalGoals: total,
    meanMinute: mean(minutes),
    medianMinute: median(minutes),
    pct90Plus: (minutes.filter((m) => m >= 90).length / total) * 100,
    pctAfter75: (minutes.filter((m) => m > 75).length / total) * 100,
    pctFirstHalf: (minutes.filter((m) => m <= 45).length / total) * 100,
    pctPenalty: (data.filter((d) => d.is_penalty).length / total) * 100,
    pctOwnGoal: (data.filter((d) => d.is_own_goal).length / total) * 100,
    tournaments: new Set(years).size,
    minYear: years.length ? Math.min(...years) : null,
    maxYear: years.length ? Math.max(...years) : null
  };
}

export function topByKey(data, key, limit = 8) {
  const counts = new Map();
  for (const row of data) {
    const value = row[key];
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}
