/**
 * TercihAtlas — Apple Stocks & Apple Health Inspired SVG Charts
 * Smooth cubic-bezier splines, soft vibrancy fills, crisp SF Pro numerals.
 */

import { escapeHtml, formatRank, formatScore } from './utils.js';

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
  const height = 204;
  const padL = 46;
  const padR = 46;
  const padT = 36;
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

  const escAttr = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const nodes = coords
    .map((c, idx) => {
      const label = mode === 'rank' ? formatRank(c.p[key]) : formatScore(c.p[key]);
      const labelY = c.y < padT + 14 ? c.y + 19 : Math.max(16, c.y - 13);
      const isLatest = idx === coords.length - 1;
      const tipMain =
        mode === 'rank'
          ? `Sıra: ${formatRank(c.p.rank)}${c.p.minScore ? ` · ${formatScore(c.p.minScore)} p` : ''}`
          : `Puan: ${formatScore(c.p.minScore)}${c.p.rank ? ` · Sıra ${formatRank(c.p.rank)}` : ''}`;
      const tipSub = c.p.quota ? `Kontenjan: ${c.p.quota}${c.p.placed ? ` / Yerleşen: ${c.p.placed}` : ''}` : '';
      return `
        <g class="chart-node chart-hit-pt" data-cx="${c.x.toFixed(1)}" data-cy="${c.y.toFixed(1)}" data-tip-title="${escAttr(c.p.year)}" data-tip-main="${escAttr(tipMain)}" data-tip-sub="${escAttr(tipSub)}">
          ${isLatest ? `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="9" fill="${color}" fill-opacity="0.16"/>` : ''}
          <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${isLatest ? '4.8' : '4'}" fill="var(--surface)" stroke="${color}" stroke-width="2.4"/>
          <text x="${c.x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" class="chart-val-label ${isLatest ? 'latest' : ''}">${label}</text>
          <text x="${c.x.toFixed(1)}" y="${height - 8}" text-anchor="middle" class="chart-year-label">${c.p.year}</text>
        </g>`;
    })
    .join('');

  return `<div class="interactive-chart-wrap" data-vb-w="${width}" data-vb-h="${height}">
    <svg class="detail-chart" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Yıllık trend grafiği">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.22"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.01"/>
        </linearGradient>
      </defs>
      ${gridLines}
      ${areaPath ? `<path d="${areaPath}" fill="url(#${gradId})"/>` : ''}
      ${coords.length > 1 ? `<path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      <line class="chart-crosshair" x1="0" y1="${padT - 8}" x2="0" y2="${height - padB}" stroke="${color}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0"/>
      <circle class="chart-active-ring" cx="0" cy="0" r="8" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2" opacity="0"/>
      ${nodes}
    </svg>
    <div class="chart-tooltip" aria-hidden="true"></div>
  </div>`;
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

  // Prevent overlapping dots when multiple programs have close ranks
  const placedPositions = [];
  const dots = valid
    .map((p, idx) => {
      const left = Math.min(96, Math.max(4, pos(p.latestRank)));
      let rowOffset = 0;
      const nearby = placedPositions.filter((prev) => Math.abs(prev.left - left) < 6.5);
      if (nearby.length > 0) {
        const offsets = [0, -14, 14, -26, 26];
        const used = new Set(nearby.map((n) => n.rowOffset));
        rowOffset = offsets.find((o) => !used.has(o)) ?? (nearby.length % 2 === 0 ? -14 : 14);
      }
      placedPositions.push({ left, rowOffset });
      const color = riskColors[p.risk] || 'var(--accent)';
      return `<button class="spectrum-dot" data-open-code="${p.code}" style="left:${left.toFixed(1)}%;margin-top:${rowOffset}px;--dot-color:${color}" title="#${idx + 1} ${p.university} — ${p.department} (${formatRank(p.latestRank)})">
        <span>${idx + 1}</span>
      </button>`;
    })
    .join('');

  let targetMarker = '';
  if (targetRank && targetRank > 0) {
    const left = Math.min(96, Math.max(4, pos(Number(targetRank))));
    const alignCls = left < 24 ? 'align-left' : left > 76 ? 'align-right' : '';
    targetMarker = `<div class="spectrum-target" style="left:${left.toFixed(1)}%">
      <div class="spectrum-target-pill ${alignCls}">Hedefin · ${formatRank(targetRank)}</div>
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
  const height = 224;
  const padL = 44;
  const padR = 44;
  const padT = 36;
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

  const escAttr = (s) =>
    String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const nodes = coords
    .map((c, idx) => {
      const isLast = idx === coords.length - 1;
      const valTxt = Number(c.e.total).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
      const shortLbl = (c.e.examDate || c.e.examName || `#${idx + 1}`).slice(0, 12);
      const tipTitle = `${c.e.examName || examType}${c.e.examDate ? ` (${c.e.examDate})` : ''}`;
      const tipMain = `${examType} Toplam: ${valTxt} net`;
      const parts = [];
      if (examType === 'TYT' && c.e.tyt) {
        if (c.e.tyt.turkce != null) parts.push(`Tr ${c.e.tyt.turkce}`);
        if (c.e.tyt.matematik != null) parts.push(`Mat ${c.e.tyt.matematik}`);
        if (c.e.tyt.fen != null) parts.push(`Fen ${c.e.tyt.fen}`);
        if (c.e.tyt.sosyal != null) parts.push(`Sos ${c.e.tyt.sosyal}`);
      } else if (examType === 'AYT' && c.e.ayt) {
        if (c.e.ayt.matematik != null) parts.push(`Mat ${c.e.ayt.matematik}`);
        if (c.e.ayt.fizik != null) parts.push(`Fiz ${c.e.ayt.fizik}`);
        if (c.e.ayt.kimya != null) parts.push(`Kim ${c.e.ayt.kimya}`);
        if (c.e.ayt.biyoloji != null) parts.push(`Biy ${c.e.ayt.biyoloji}`);
      }
      if (c.e.institutionRank) parts.push(`Kurum #${c.e.institutionRank}`);
      const tipSub = parts.join(' · ');

      const showXLabel = coords.length <= 6 || idx === 0 || idx === coords.length - 1 || idx % 2 === 0;
      const showValLabel = coords.length <= 8 || idx === 0 || idx === coords.length - 1 || idx % 2 === 0;
      const valLabelY = c.y < padT + 14 ? c.y + 18 : Math.max(16, c.y - 12);
      return `<g class="chart-hit-pt" data-cx="${c.x.toFixed(1)}" data-cy="${c.y.toFixed(1)}" data-tip-title="${escAttr(tipTitle)}" data-tip-main="${escAttr(tipMain)}" data-tip-sub="${escAttr(tipSub)}">
        ${isLast ? `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="9" fill="${color}" fill-opacity="0.18"/>` : ''}
        <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${isLast ? '5' : '4'}" fill="var(--surface)" stroke="${color}" stroke-width="2.4"/>
        ${showValLabel ? `<text x="${c.x.toFixed(1)}" y="${valLabelY.toFixed(1)}" text-anchor="middle" class="chart-val-label ${isLast ? 'latest' : ''}">${valTxt}</text>` : ''}
        ${showXLabel ? `<text x="${c.x.toFixed(1)}" y="${height - 12}" text-anchor="middle" class="chart-year-label">${shortLbl}</text>` : ''}
      </g>`;
    })
    .join('');

  return `<div class="interactive-chart-wrap" data-vb-w="${width}" data-vb-h="${height}">
    <svg class="detail-chart" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${examType} deneme gelişim grafiği">
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
      <line class="chart-crosshair" x1="0" y1="${padT - 8}" x2="0" y2="${height - padB}" stroke="${color}" stroke-width="1.2" stroke-dasharray="3 3" opacity="0"/>
      <circle class="chart-active-ring" cx="0" cy="0" r="8" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="2" opacity="0"/>
      ${nodes}
    </svg>
    <div class="chart-tooltip" aria-hidden="true"></div>
  </div>`;
}

/**
 * Tiny 72x22 inline sparkline for subject-level net progression.
 */
export function renderMiniNetSparkline(values, color = 'var(--accent)') {
  const pts = (values || []).filter((v) => Number.isFinite(Number(v))).map(Number);
  if (pts.length < 2) {
    return `<span style="font-size:11px;color:var(--text-tertiary);">—</span>`;
  }
  const w = 72;
  const h = 22;
  const pad = 3;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const coords = pts.map((v, i) => ({
    x: pad + (i / (pts.length - 1)) * (w - pad * 2),
    y: pad + (1 - (v - min) / span) * (h - pad * 2),
  }));
  const d = buildSmoothPath(coords);
  const last = coords[coords.length - 1];
  const trendUp = pts[pts.length - 1] >= pts[0];
  const stroke = trendUp ? 'var(--green-bright)' : color;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;flex-shrink:0;" aria-hidden="true">
    <path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="2.6" fill="${stroke}"/>
  </svg>`;
}

/**
 * Authentic Concentric Apple Watch Fitness Activity Rings SVG.
 * Outer: TYT Goal %, Middle: AYT Goal %, Inner: Research Checklist %.
 */
export function renderAppleActivityRings({ tytPct = 0, aytPct = 0, researchPct = 0, size = 132 } = {}) {
  const cx = 66;
  const cy = 66;
  const rings = [
    { r: 54, pct: Math.min(100, Math.max(0, tytPct)), color: '#0071E3', track: 'rgba(0, 113, 227, 0.16)' },
    { r: 41, pct: Math.min(100, Math.max(0, aytPct)), color: '#34C759', track: 'rgba(52, 199, 89, 0.16)' },
    { r: 28, pct: Math.min(100, Math.max(0, researchPct)), color: '#FF9F0A', track: 'rgba(255, 159, 10, 0.18)' },
  ];

  const svgs = rings
    .map((rg, idx) => {
      const circ = 2 * Math.PI * rg.r;
      const visualPct = rg.pct > 0 ? Math.max(4, rg.pct) : 0;
      const offset = circ * (1 - visualPct / 100);
      return `
        <circle cx="${cx}" cy="${cy}" r="${rg.r}" fill="none" stroke="${rg.track}" stroke-width="10" />
        <circle class="activity-ring-progress" cx="${cx}" cy="${cy}" r="${rg.r}" fill="none" stroke="${rg.color}" stroke-width="10"
          stroke-linecap="round"
          stroke-dasharray="${circ.toFixed(2)}"
          stroke-dashoffset="${offset.toFixed(2)}"
          transform="rotate(-90 ${cx} ${cy})"
          style="--ring-circ:${circ.toFixed(2)};--ring-offset:${offset.toFixed(2)};animation-delay:${idx * 90}ms;" />`;
    })
    .join('');

  return `<svg width="${size}" height="${size}" viewBox="0 0 132 132" role="img" aria-label="Hedef ilerleme halkaları" style="flex-shrink:0;">
    ${svgs}
  </svg>`;
}

/**
 * Apple Health-style 6-Axis SVG Radar Chart for Side-by-Side Program Comparison (2–3 programs).
 */
export function renderCompareRadarChart(programs) {
  if (!Array.isArray(programs) || programs.length < 2) return '';
  const list = programs.slice(0, 3);

  const axes = [
    { key: 'prestige', label: 'Prestij' },
    { key: 'academic', label: 'Akademik' },
    { key: 'campus', label: 'Kampüs' },
    { key: 'career', label: 'Kariyer' },
    { key: 'dorm', label: 'Yurt' },
    { key: 'budget', label: 'Bütçe' },
  ];

  const palette = [
    { stroke: '#0071E3', fill: 'rgba(0, 113, 227, 0.20)' },
    { stroke: '#34C759', fill: 'rgba(52, 199, 89, 0.20)' },
    { stroke: '#AF52DE', fill: 'rgba(175, 82, 222, 0.20)' },
  ];

  const scoreProgramAxes = (p) => {
    const rank = Number(p.latestRank) || 250000;
    // Log-scaled prestige: #100 -> 98, #1,000 -> 90, #10,000 -> 76, #50,000 -> 58, #200,000 -> 36
    const prestige = Math.round(Math.max(12, Math.min(100, 118 - Math.log10(Math.max(rank, 50)) * 16.5)));

    const sub = p.subRatings || {};
    const fallbackRating = Number(p.rating) > 0 ? Number(p.rating) * 20 : 60;

    // Academic: prefer user's subRating; else derive from prof+doc count
    const staff = p.academicStaff || {};
    const staffTotal = (staff.prof || 0) * 2 + (staff.doc || 0) * 1.4 + (staff.drOgr || 0);
    const staffAuto = staffTotal > 0 ? Math.min(96, Math.round(45 + staffTotal * 1.1)) : fallbackRating;
    const academic = sub.academic ? Math.round(sub.academic * 20) : staffAuto;

    const campus = sub.campus ? Math.round(sub.campus * 20) : fallbackRating;

    // Career: prefer subRating; else English + Accreditation bonus
    const langBonus = /ingilizce|almanca|fransızca/i.test(p.language || '') ? 16 : 0;
    const accBonus = p.accreditation ? 14 : 0;
    const career = sub.career ? Math.round(sub.career * 20) : Math.min(96, Math.round(52 + langBonus + accBonus));

    const dormVal = sub.living ?? sub.dorm;
    const dorm = dormVal ? Math.round(dormVal * 20) : fallbackRating;

    // Budget advantage: Devlet/Burslu highest, %50 mid, Ücretli lower
    let budget = 88;
    const sch = String(p.scholarship || '');
    if (p.universityType === 'VAKIF') {
      if (/burslu/i.test(sch) && !/%/i.test(sch)) budget = 86;
      else if (/50/.test(sch)) budget = 58;
      else if (/25/.test(sch)) budget = 42;
      else budget = 28;
    } else if (/istanbul/i.test(p.city || '')) {
      budget = 80;
    } else {
      budget = 92;
    }

    return { prestige, academic, campus, career, dorm, budget };
  };

  const cx = 180;
  const cy = 148;
  const radius = 98;
  const n = axes.length;

  const pointAt = (axisIdx, pct) => {
    const angle = -Math.PI / 2 + (axisIdx * 2 * Math.PI) / n;
    const r = (Math.max(8, Math.min(100, pct)) / 100) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const webRings = [25, 50, 75, 100]
    .map((level) => {
      const pts = axes.map((_, i) => pointAt(i, level).map((v) => v.toFixed(1)).join(',')).join(' ');
      return `<polygon points="${pts}" fill="none" stroke="var(--separator)" stroke-width="${level === 100 ? 1.2 : 0.8}" stroke-dasharray="${level === 100 ? '' : '3 3'}" />`;
    })
    .join('');

  const spokes = axes
    .map((ax, i) => {
      const [x2, y2] = pointAt(i, 100);
      const [lx, ly] = pointAt(i, 122);
      const anchor = Math.abs(lx - cx) < 10 ? 'middle' : lx > cx ? 'start' : 'end';
      return `
        <line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--separator)" stroke-width="0.9" />
        <text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" fill="var(--text-secondary)" font-size="11" font-weight="600">${ax.label}</text>`;
    })
    .join('');

  const scored = list.map((p, idx) => ({ program: p, values: scoreProgramAxes(p), color: palette[idx % palette.length] }));

  const polygons = scored
    .map(({ program, values, color }) => {
      const pts = axes.map((ax, i) => pointAt(i, values[ax.key]));
      const polyPts = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      const dots = pts
        .map(
          ([x, y], i) => `
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${color.stroke}" stroke="var(--bg-elevated)" stroke-width="1.8">
            <title>${escapeHtml(program.university)} · ${axes[i].label}: ${values[axes[i].key]}/100</title>
          </circle>`,
        )
        .join('');
      return `
        <polygon points="${polyPts}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="2.2" stroke-linejoin="round" />
        ${dots}`;
    })
    .join('');

  const legend = scored
    .map(({ program, values, color }) => {
      const avg = Math.round(Object.values(values).reduce((s, v) => s + v, 0) / axes.length);
      return `
        <div class="radar-legend-item">
          <span class="radar-legend-dot" style="background:${color.stroke};"></span>
          <span class="radar-legend-name">${escapeHtml(program.university)} · ${escapeHtml(program.department)}</span>
          <strong class="tabular" style="color:${color.stroke};">${avg}/100</strong>
        </div>`;
    })
    .join('');

  return `
    <div class="radar-compare-wrap">
      <div class="radar-svg-box">
        <svg viewBox="0 0 360 296" class="radar-svg" role="img" aria-label="Bölüm karşılaştırma radar grafiği">
          ${webRings}
          ${spokes}
          ${polygons}
        </svg>
      </div>
      <div class="radar-legend-col">
        <div style="font-size:12px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">6 Eksenli Profil Kıyaslaması</div>
        ${legend}
        <div class="radar-hint">Alt kriter yıldızlarını detay çekmecesinden güncelledikçe Akademik, Kampüs, Kariyer ve Yurt eksenleri canlı olarak yenilenir.</div>
      </div>
    </div>`;
}
