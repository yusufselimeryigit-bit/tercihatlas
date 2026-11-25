/**
 * TercihAtlas — Apple Stocks & Apple Health Inspired SVG Charts
 * Smooth cubic-bezier splines, soft vibrancy fills, crisp SF Pro numerals.
 */

import { formatRank, formatScore } from './utils.js';

/**
 * Generates a smooth SVG path through a list of {x, y} points (monotone-friendly cubic bezier).
 */
function buildSmoothPath(coords) {
  if (!coords.length) return '';
  if (coords.length === 1) return `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  let d = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const midX = ((p0.x + p1.x) / 2).toFixed(1);
    d += ` C${midX},${p0.y.toFixed(1)} ${midX},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
  }
  return d;
}

/**
 * Apple Stocks style smooth sparkline for cards & compact table.
 * For rank: smaller rank = higher position (draws closer to top).
 */
export function renderSparkline(history, { width = 94, height = 30 } = {}) {
  const pts = (history || []).filter((h) => h.rank !== null && h.rank !== undefined);
  if (pts.length < 2) {
    return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">
      <line x1="6" y1="${height / 2}" x2="${width - 6}" y2="${height / 2}" stroke="var(--separator)" stroke-width="1.6" stroke-dasharray="3 4" stroke-linecap="round"/>
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
    const norm = (p.rank - minR) / span;
    const y = padY + norm * innerH;
    return { x, y, p };
  });

  const linePath = buildSmoothPath(coords);
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height} L${coords[0].x.toFixed(1)},${height} Z`;

  const first = pts[0].rank;
  const last = pts[pts.length - 1].rank;
  const strokeColor = last < first ? 'var(--accent)' : last > first ? 'var(--green)' : 'var(--text-tertiary)';
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
    <path d="${linePath}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="3" fill="${strokeColor}"/>
  </svg>`;
}

/**
 * Full 4-year Apple Stocks smooth spline trend chart for the Inspector Drawer.
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
  const height = 196;
  const padL = 32;
  const padR = 32;
  const padT = 34;
  const padB = 32;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const vals = pts.map((p) => p[key]);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const span = maxV - minV || 1;

  const coords = pts.map((p, i) => {
    const x = pts.length === 1 ? padL + innerW / 2 : padL + (i / (pts.length - 1)) * innerW;
    const norm = (p[key] - minV) / span;
    const y = mode === 'rank' ? padT + norm * innerH : padT + (1 - norm) * innerH;
    return { x, y, p };
  });

  const linePath = buildSmoothPath(coords);
  const areaPath =
    coords.length > 1
      ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height - padB} L${coords[0].x.toFixed(1)},${height - padB} Z`
      : '';

  const color = mode === 'rank' ? 'var(--accent)' : 'var(--green)';
  const gradId = `dg-${mode}-${Math.random().toString(36).slice(2, 7)}`;

  const gridLines = [0, 0.5, 1]
    .map((f) => {
      const gy = (padT + f * innerH).toFixed(1);
      return `<line x1="${padL}" y1="${gy}" x2="${width - padR}" y2="${gy}" stroke="var(--separator)" stroke-width="1" stroke-dasharray="2 5"/>`;
    })
    .join('');

  const nodes = coords
    .map((c, idx) => {
      const label = mode === 'rank' ? formatRank(c.p[key]) : formatScore(c.p[key]);
      const labelY = Math.max(16, c.y - 13);
      const isLatest = idx === coords.length - 1;
      return `
        <g class="chart-node">
          ${isLatest ? `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="9" fill="${color}" fill-opacity="0.16"/>` : ''}
          <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${isLatest ? '4.8' : '4'}" fill="var(--surface)" stroke="${color}" stroke-width="2.4"/>
          <text x="${c.x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" class="chart-val-label ${isLatest ? 'latest' : ''}">${label}</text>
          <text x="${c.x.toFixed(1)}" y="${height - 8}" text-anchor="middle" class="chart-year-label">${c.p.year}</text>
        </g>`;
    })
    .join('');

  return `<svg class="detail-chart" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Yıllık trend grafiği">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.01"/>
      </linearGradient>
    </defs>
    ${gridLines}
    ${areaPath ? `<path d="${areaPath}" fill="url(#${gradId})"/>` : ''}
    ${coords.length > 1 ? `<path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${nodes}
  </svg>`;
}

/**
 * Horizontal Apple Health / Storage style rank spectrum map for Analysis.
 */
export function renderRankSpectrum(programs, targetRank) {
  const valid = programs.filter((p) => p.latestRank && p.latestRank > 0);
  if (!valid.length) {
    return `<div class="chart-empty">Sıralama haritası için en az bir program ekleyin.</div>`;
  }

  const allRanks = valid.map((p) => p.latestRank);
  if (targetRank && targetRank > 0) allRanks.push(Number(targetRank));

  const logMin = Math.log10(Math.max(1, Math.min(...allRanks) * 0.75));
  const logMax = Math.log10(Math.max(10, Math.max(...allRanks) * 1.25));
  const span = logMax - logMin || 1;
  const pos = (r) => ((Math.log10(Math.max(1, r)) - logMin) / span) * 100;

  const riskColors = { hayal: 'var(--rose)', hedef: 'var(--accent)', guvenli: 'var(--green)' };

  const dots = valid
    .map((p, idx) => {
      const left = Math.min(97, Math.max(3, pos(p.latestRank)));
      const color = riskColors[p.risk] || 'var(--accent)';
      return `<button class="spectrum-dot" data-open-code="${p.code}" style="left:${left.toFixed(1)}%;--dot-color:${color}" title="#${idx + 1} ${p.university} — ${p.department} (${formatRank(p.latestRank)})">
        <span>${idx + 1}</span>
      </button>`;
    })
    .join('');

  let targetMarker = '';
  if (targetRank && targetRank > 0) {
    const left = Math.min(96, Math.max(4, pos(Number(targetRank))));
    targetMarker = `<div class="spectrum-target" style="left:${left.toFixed(1)}%">
      <div class="spectrum-target-pill">Hedefin · ${formatRank(targetRank)}</div>
    </div>`;
  }

  return `<div class="spectrum-wrap">
    <div class="spectrum-axis-labels tabular">
      <span>En Yüksek · ${formatRank(Math.min(...valid.map((p) => p.latestRank)))}</span>
      <span>En Düşük · ${formatRank(Math.max(...valid.map((p) => p.latestRank)))}</span>
    </div>
    <div class="spectrum-track">
      ${targetMarker}
      ${dots}
    </div>
  </div>`;
}

/**
 * Apple Health / Stocks style Exam Progression Chart for uploaded TYT / AYT PDFs.
 * Optionally overlays a horizontal dashed goal line for the #1 preference's average net!
 */
export function renderExamProgressionChart(exams, { examType = 'TYT', targetNet = null, targetLabel = '' } = {}) {
  const list = [...(exams || [])]
    .filter((e) => e.examType === examType && Number.isFinite(Number(e.total)))
    .reverse(); // chronological oldest -> newest

  if (!list.length) {
    return `<div class="chart-empty">Henüz ${examType} deneme PDF'i yüklemedin. Sağ üstteki <strong>Netlerim</strong> penceresinden dershane PDF'lerini yükledikçe gelişim grafiğin burada otomatik çizilir.</div>`;
  }

  const width = 620;
  const height = 220;
  const padL = 38;
  const padR = 32;
  const padT = 32;
  const padB = 42;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const vals = list.map((e) => Number(e.total));
  if (targetNet !== null && Number.isFinite(Number(targetNet))) vals.push(Number(targetNet));
  const minV = Math.max(0, Math.floor(Math.min(...vals) - 6));
  const maxV = Math.ceil(Math.max(...vals) + 6);
  const span = maxV - minV || 1;

  const yFor = (v) => padT + (1 - (v - minV) / span) * innerH;

  const coords = list.map((e, i) => ({
    x: list.length === 1 ? padL + innerW / 2 : padL + (i / (list.length - 1)) * innerW,
    y: yFor(Number(e.total)),
    e,
  }));

  const linePath = buildSmoothPath(coords);
  const areaPath =
    coords.length > 1
      ? `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height - padB} L${coords[0].x.toFixed(1)},${height - padB} Z`
      : '';

  const color = examType === 'TYT' ? 'var(--accent)' : 'var(--green-bright)';
  const gradId = `ep-${examType}-${Math.random().toString(36).slice(2, 7)}`;

  const gridLines = [0, 0.5, 1]
    .map((f) => {
      const gy = (padT + f * innerH).toFixed(1);
      return `<line x1="${padL}" y1="${gy}" x2="${width - padR}" y2="${gy}" stroke="var(--separator)" stroke-width="1" stroke-dasharray="2 5"/>`;
    })
    .join('');

  let targetLineSvg = '';
  if (targetNet !== null && Number.isFinite(Number(targetNet))) {
    const ty = yFor(Number(targetNet)).toFixed(1);
    targetLineSvg = `
      <line x1="${padL}" y1="${ty}" x2="${width - padR}" y2="${ty}" stroke="var(--amber-bright)" stroke-width="1.8" stroke-dasharray="5 5"/>
      <text x="${width - padR}" y="${Math.max(14, Number(ty) - 6)}" text-anchor="end" fill="var(--amber)" font-size="11" font-weight="650" font-family="var(--font-sans)">
        Hedef (${targetLabel || '1. Tercih'}): ${Number(targetNet).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} net
      </text>`;
  }

  const nodes = coords
    .map((c, idx) => {
      const isLast = idx === coords.length - 1;
      const valTxt = Number(c.e.total).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
      const shortLbl = (c.e.examDate || c.e.examName || `#${idx + 1}`).slice(0, 12);
      return `<g>
        ${isLast ? `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="9" fill="${color}" fill-opacity="0.18"/>` : ''}
        <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${isLast ? '5' : '4'}" fill="var(--surface)" stroke="${color}" stroke-width="2.4"/>
        <text x="${c.x.toFixed(1)}" y="${Math.max(16, c.y - 12).toFixed(1)}" text-anchor="middle" class="chart-val-label ${isLast ? 'latest' : ''}">${valTxt}</text>
        <text x="${c.x.toFixed(1)}" y="${height - 12}" text-anchor="middle" class="chart-year-label">${shortLbl}</text>
      </g>`;
    })
    .join('');

  return `<svg class="detail-chart" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${examType} deneme gelişim grafiği">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.24"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0.01"/>
      </linearGradient>
    </defs>
    ${gridLines}
    ${targetLineSvg}
    ${areaPath ? `<path d="${areaPath}" fill="url(#${gradId})"/>` : ''}
    ${coords.length > 1 ? `<path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
    ${nodes}
  </svg>`;
}
