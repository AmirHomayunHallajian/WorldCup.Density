export function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function summarizeGoals(data) {
  const minutes = data
    .map((d) => Number(d.minute) + Number(d.stoppage_minute || 0))
    .filter(Number.isFinite);

  const years = data.map((d) => Number(d.tournament_year)).filter(Number.isFinite);
  const totalGoals = data.length;

  if (!totalGoals) {
    return {
      totalGoals: 0,
      meanMinute: 0,
      medianMinute: 0,
      pct90Plus: 0,
      pctAfter75: 0,
      minYear: null,
      maxYear: null
    };
  }

  return {
    totalGoals,
    meanMinute: mean(minutes),
    medianMinute: median(minutes),
    pct90Plus: (minutes.filter((m) => m >= 90).length / totalGoals) * 100,
    pctAfter75: (minutes.filter((m) => m > 75).length / totalGoals) * 100,
    minYear: years.length ? Math.min(...years) : null,
    maxYear: years.length ? Math.max(...years) : null
  };
}
