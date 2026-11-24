/**
 * TercihAtlas — Minimalist Apple/Linear SVG Charts
 */

import { formatRank, formatScore } from './utils.js';

/**
 * Compact 4-year sparkline for cards & table rows.
 * Note: For rank, smaller number = higher position (better/more competitive),
 * so Y axis is inverted (smaller rank draws higher up).
 */
export function renderSparkline(history, { width = 96, height = 30 } = {}) {
  const pts = (history || []).filter((h) => h.rank !== null && h.rank !== undefined);
  if (pts.length < 2) {
    return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <line x1="6" y1="${height / 2}" x2="${width - 6}" y2="${height / 2}" stroke="var(--border-strong)" stroke-width="1.5" stroke-dasharray="3 3"/>
    </svg>`;
  }

  const ranks = pts.map((p) => p.rank);
  const minR = Math.min(...ranks);
  const maxR = Math.max(...ranks);
  const span = maxR - minR || 1;

  const padX = 5;
  const padY = 5;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const coords = pts.map((p, i) => {
    const x = padX + (i / (pts.length - 1)) * innerW;
    // Smaller rank (better) -> closer to top (padY)
    const norm = (p.rank - minR) / span;
    const y = padY + norm * innerH;
    return { x, y, p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height} L${coords[0].x.toFixed(1)},${height} Z`;

  // Compare first and last rank: if latest rank < earliest rank, became more competitive (rose up)
  const first = pts[0].rank;
  const last = pts[pts.length - 1].rank;
  const strokeColor = last < first ? 'var(--accent)' : last > first ? 'var(--green)' : 'var(--text-muted)';
  const gradId = `sg-${Math.random().toString(36).slice(2, 8)}`;
  const lastPt = coords[coords.length - 1];

  return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="4 yıllık sıralama trendi">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${areaPath}" fill="url(#${gradId})"/>
    <path d="${linePath}" fill="none" stroke="${strokeColor}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="2.75" fill="${strokeColor}"/>
  </svg>`;
}

/**
 * Full 4-year interactive-style SVG trend chart for the Detail Drawer.
 * @param {Array} history
 * @param {'rank'|'score'} mode
 */
export function renderDetailTrendChart(history, mode = 'rank') {
  const key = mode === 'rank' ? 'rank' : 'minScore';
  const pts = (history || []).filter((h) => h[key] !== null && h[key] !== undefined);

  if (!pts.length) {
    return `<div class="chart-empty">Bu program için geçmiş yıl verisi bulunamadı.</div>`;
  }

  const width = 460;
  const height = 188;
  const padL = 26;
  const padR = 26;
  const padT = 30;
  const padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const vals = pts.map((p) => p[key]);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const span = maxV - minV || 1;

  const coords = pts.map((p, i) => {
    const x = pts.length === 1 ? padL + innerW / 2 : padL + (i / (pts.length - 1)) * innerW;
    const norm = (p[key] - minV) / span;
    // For rank: smaller is higher; for score: larger is higher
    const y = mode === 'rank' ? padT + norm * innerH : padT + (1 - norm) * innerH;
    return { x, y, p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath =
    coords.length > 1
      ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height - padB} L${coords[0].x.toFixed(1)},${height - padB} Z`
      : '';

  const color = mode === 'rank' ? 'var(--accent)' : 'var(--green)';
  const gradId = `dg-${mode}-${Math.random().toString(36).slice(2, 7)}`;

  const gridLines = [0, 0.5, 1]
    .map((f) => {
      const gy = (padT + f * innerH).toFixed(1);
      return `<line x1="${padL}" y1="${gy}" x2="${width - padR}" y2="${gy}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 4"/>`;
    })
    .join('');

  const nodes = coords
    .map((c) => {
      const label = mode === 'rank' ? formatRank(c.p[key]) : formatScore(c.p[key]);
      const labelY = Math.max(14, c.y - 11);
      return `
        <g class="chart-node">
          <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4.5" fill="var(--bg-elevated)" stroke="${color}" stroke-width="2.2"/>
          <text x="${c.x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" class="chart-val-label">${label}</text>
          <text x="${c.x.toFixed(1)}" y="${height - 8}" text-anchor="middle" class="chart-year-label">${c.p.year}</text>
        </g>`;
    })
    .join('');

  return `<svg class="detail-chart" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Yıllık trend grafiği">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.24"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.01"/>
      </linearGradient>
    </defs>
    ${gridLines}
    ${areaPath ? `<path d="${areaPath}" fill="url(#${gradId})"/>` : ''}
    ${coords.length > 1 ? `<path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${nodes}
  </svg>`;
}

/**
 * Horizontal rank spectrum map for the Analysis tab.
 */
export function renderRankSpectrum(programs, targetRank) {
  const valid = programs.filter((p) => p.latestRank && p.latestRank > 0);
  if (!valid.length) {
    return `<div class="chart-empty">Sıralama haritası için en az bir program ekleyin.</div>`;
  }

  const allRanks = valid.map((p) => p.latestRank);
  if (targetRank && targetRank > 0) allRanks.push(Number(targetRank));

  // Use log scale so 500 and 150.000 can live cleanly on the same axis
  const logMin = Math.log10(Math.max(1, Math.min(...allRanks) * 0.75));
  const logMax = Math.log10(Math.max(10, Math.max(...allRanks) * 1.25));
  const span = logMax - logMin || 1;
  const pos = (r) => ((Math.log10(Math.max(1, r)) - logMin) / span) * 100;

  const riskColors = { hayal: '#F43F5E', hedef: '#6366F1', guvenli: '#10B981' };

  const dots = valid
    .map((p, idx) => {
      const left = Math.min(98, Math.max(2, pos(p.latestRank)));
      const color = riskColors[p.risk] || '#6366F1';
      return `<button class="spectrum-dot" data-open-code="${p.code}" style="left:${left.toFixed(1)}%;--dot-color:${color}" title="#${idx + 1} ${p.university} — ${p.department} (${formatRank(p.latestRank)})">
        <span>${idx + 1}</span>
      </button>`;
    })
    .join('');

  let targetMarker = '';
  if (targetRank && targetRank > 0) {
    const left = Math.min(98, Math.max(2, pos(Number(targetRank))));
    targetMarker = `<div class="spectrum-target" style="left:${left.toFixed(1)}%">
      <div class="spectrum-target-pill">Hedefin: ${formatRank(targetRank)}</div>
    </div>`;
  }

  return `<div class="spectrum-wrap">
    <div class="spectrum-axis-labels">
      <span>En Yüksek (${formatRank(Math.min(...valid.map((p) => p.latestRank)))})</span>
      <span>En Düşük (${formatRank(Math.max(...valid.map((p) => p.latestRank)))})</span>
    </div>
    <div class="spectrum-track">
      ${targetMarker}
      ${dots}
    </div>
  </div>`;
}
