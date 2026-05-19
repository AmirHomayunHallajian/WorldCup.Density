import * as Plot from 'https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm';

const STAGE_COLORS = {
  Group: '#38bdf8',
  'Round of 16': '#22c55e',
  'Quarter-final': '#eab308',
  'Semi-final': '#f97316',
  'Third-place': '#a78bfa',
  Final: '#ef4444',
  Other: '#94a3b8'
};

const STAGE_KEYS = Object.keys(STAGE_COLORS);
const STAGE_VALUES = Object.values(STAGE_COLORS);

const BASE_STYLE = {
  background: 'transparent',
  color: '#e2e8f0',
  fontSize: 12
};

function clearPlot(container) {
  container.innerHTML = '';
}

function plotWidth(container) {
  return Math.max(320, container.clientWidth || 720);
}

function tooltipText(d) {
  const lines = [
    `${d.player || 'Unknown player'}`,
    `${d.team || '?'} vs ${d.opponent || '?'}`,
    `${d.display_minute}'  •  ${d.tournament_year}`,
    d.stage_group
  ];
  if (d.is_penalty) lines.push('Penalty');
  if (d.is_own_goal) lines.push('Own goal');
  return lines.join('\n');
}

export function renderScatter(data, container, state) {
  clearPlot(container);
  const useStoppage = state?.includeStoppage ?? true;
  const xAccessor = useStoppage ? 'effective_minute' : 'minute';
  const width = plotWidth(container);

  container.append(
    Plot.plot({
      ...BASE_STYLE,
      width,
      height: 560,
      marginLeft: 60,
      marginRight: 24,
      marginTop: 24,
      marginBottom: 40,
      x: { domain: [0, 120], label: useStoppage ? 'Match minute (+stoppage)' : 'Match minute', grid: true },
      y: { label: 'Tournament year', tickFormat: 'd', grid: true, reverse: false },
      color: { domain: STAGE_KEYS, range: STAGE_VALUES, legend: true, label: 'Stage' },
      marks: [
        Plot.frame({ stroke: '#1e293b' }),
        Plot.ruleX([45], { stroke: '#475569', strokeDasharray: '2 3' }),
        Plot.ruleX([90], { stroke: '#475569', strokeDasharray: '2 3' }),
        Plot.dot(data, {
          x: xAccessor,
          y: 'tournament_year',
          fill: 'stage_group',
          r: 3,
          fillOpacity: 0.7,
          stroke: 'stage_group',
          strokeOpacity: 0.0,
          title: tooltipText
        })
      ]
    })
  );
}

export function renderHeatmap(data, container, state) {
  clearPlot(container);
  const useStoppage = state?.includeStoppage ?? true;
  const xAccessor = useStoppage ? 'effective_minute' : 'minute';
  const width = plotWidth(container);

  container.append(
    Plot.plot({
      ...BASE_STYLE,
      width,
      height: 560,
      marginLeft: 60,
      marginRight: 24,
      marginTop: 24,
      marginBottom: 40,
      x: { domain: [0, 120], label: 'Match minute', grid: false },
      y: { label: 'Tournament year', tickFormat: 'd', grid: false },
      color: { scheme: 'turbo', label: 'Goals per bin', legend: true },
      marks: [
        Plot.frame({ stroke: '#1e293b' }),
        Plot.rect(
          data,
          Plot.bin(
            { fill: 'count' },
            {
              x: { value: xAccessor, thresholds: 24 },
              y: { value: 'tournament_year', thresholds: 23 },
              inset: 0
            }
          )
        )
      ]
    })
  );
}

export function renderMinuteHistogram(data, container, state) {
  clearPlot(container);
  const useStoppage = state?.includeStoppage ?? true;
  const xAccessor = useStoppage ? 'effective_minute' : 'minute';
  const width = plotWidth(container);

  container.append(
    Plot.plot({
      ...BASE_STYLE,
      width,
      height: 480,
      marginLeft: 56,
      marginRight: 24,
      marginTop: 24,
      marginBottom: 44,
      x: { domain: [0, 120], label: 'Match minute', grid: true },
      y: { label: 'Goals', grid: true },
      color: { domain: STAGE_KEYS, range: STAGE_VALUES, legend: true, label: 'Stage' },
      marks: [
        Plot.frame({ stroke: '#1e293b' }),
        Plot.ruleX([45], { stroke: '#475569', strokeDasharray: '2 3' }),
        Plot.ruleX([90], { stroke: '#475569', strokeDasharray: '2 3' }),
        Plot.rectY(
          data,
          Plot.binX(
            { y: 'count' },
            {
              x: { value: xAccessor, thresholds: 30 },
              fill: 'stage_group',
              insetLeft: 0.5,
              insetRight: 0.5
            }
          )
        ),
        Plot.ruleY([0], { stroke: '#334155' })
      ]
    })
  );
}

export function renderYearTotals(data, container) {
  clearPlot(container);
  const width = plotWidth(container);

  const counts = new Map();
  for (const d of data) {
    if (!d.tournament_year) continue;
    counts.set(d.tournament_year, (counts.get(d.tournament_year) || 0) + 1);
  }
  const series = [...counts.entries()]
    .map(([year, goals]) => ({ year, goals }))
    .sort((a, b) => a.year - b.year);

  container.append(
    Plot.plot({
      ...BASE_STYLE,
      width,
      height: 480,
      marginLeft: 56,
      marginRight: 24,
      marginTop: 24,
      marginBottom: 50,
      x: { label: 'Tournament year', tickFormat: 'd', grid: true },
      y: { label: 'Goals per tournament', grid: true },
      marks: [
        Plot.frame({ stroke: '#1e293b' }),
        Plot.areaY(series, {
          x: 'year',
          y: 'goals',
          curve: 'monotone-x',
          fill: 'url(#yearGrad)',
          fillOpacity: 0.35
        }),
        Plot.lineY(series, {
          x: 'year',
          y: 'goals',
          curve: 'monotone-x',
          stroke: '#38bdf8',
          strokeWidth: 2
        }),
        Plot.dot(series, {
          x: 'year',
          y: 'goals',
          fill: '#38bdf8',
          r: 3,
          title: (d) => `${d.year}: ${d.goals} goals`
        }),
        Plot.ruleY([0], { stroke: '#334155' })
      ]
    })
  );

  const svg = container.querySelector('svg');
  if (svg && !svg.querySelector('#yearGrad')) {
    const NS = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(NS, 'defs');
    defs.innerHTML = `
      <linearGradient id="yearGrad" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
      </linearGradient>`;
    svg.prepend(defs);
  }
}

export function renderStageBreakdown(data, container, state) {
  clearPlot(container);
  const useStoppage = state?.includeStoppage ?? true;
  const xAccessor = useStoppage ? 'effective_minute' : 'minute';
  const width = plotWidth(container);

  const stages = STAGE_KEYS.filter((s) => data.some((d) => d.stage_group === s));

  container.append(
    Plot.plot({
      ...BASE_STYLE,
      width,
      height: Math.max(360, stages.length * 90 + 60),
      marginLeft: 110,
      marginRight: 24,
      marginTop: 24,
      marginBottom: 44,
      x: { domain: [0, 120], label: 'Match minute', grid: true },
      y: { label: null, domain: stages },
      color: { domain: STAGE_KEYS, range: STAGE_VALUES, legend: false },
      marks: [
        Plot.frame({ stroke: '#1e293b' }),
        Plot.ruleX([45], { stroke: '#475569', strokeDasharray: '2 3' }),
        Plot.ruleX([90], { stroke: '#475569', strokeDasharray: '2 3' }),
        Plot.tickX(data, {
          x: xAccessor,
          y: 'stage_group',
          stroke: 'stage_group',
          strokeOpacity: 0.4,
          strokeWidth: 1.4
        }),
        Plot.dot(
          data,
          Plot.groupY(
            { x: 'median' },
            { x: xAccessor, y: 'stage_group', fill: 'stage_group', r: 5, symbol: 'diamond' }
          )
        )
      ]
    })
  );
}
