/**
 * TercihAtlas — v36 Apple First-Party Signature Suite
 * 1. iOS Quick Look / Peek & Pop Glass Preview
 * 2. Dynamic Scroll Edge Fades (Smart Left/Right Optical Masks)
 * 3. Floating iPadOS Compare Dock (Mini Ceramic Avatar Tray)
 * 4. Apple Focus Mode Persistence Helpers
 * 5. Undo Stack Manager for Dynamic Island ⌘Z
 */

import { escapeHtml, formatRank, formatNet, RISK_META, getUniInitials } from './utils.js?v=26';
import { getLogoUrl } from './api.js?v=26';
import { renderSparkline } from './charts.js?v=30';

// ============================================================================
// Feature 6: Apple Focus Mode Persistence
// ============================================================================
const FOCUS_MODE_KEY = 'tercihatlas_focus_mode_v1';

export function isFocusModeEnabled() {
  try {
    return localStorage.getItem(FOCUS_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setFocusModeEnabled(enabled) {
  const on = Boolean(enabled);
  document.body.classList.toggle('focus-mode', on);
  try {
    localStorage.setItem(FOCUS_MODE_KEY, on ? '1' : '0');
  } catch {
    /* ignore */
  }
  return on;
}

// ============================================================================
// Feature 3: Undo Stack Manager (for Dynamic Island Undo + ⌘Z)
// ============================================================================
const MAX_UNDO = 15;
const undoStack = [];

export function pushUndoSnapshot(label, snapshot) {
  undoStack.push({
    label,
    programs: structuredClone(snapshot.programs || []),
    compareCodes: [...(snapshot.compareCodes || [])],
    targetRank: snapshot.targetRank ?? null,
    ts: Date.now(),
  });
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

export function popUndoSnapshot() {
  return undoStack.pop() || null;
}

export function hasUndoSnapshot() {
  return undoStack.length > 0;
}

// ============================================================================
// Feature 1: iOS Quick Look / Peek & Pop Glass Preview Card
// ============================================================================
export function renderQuickLookHtml(program, { proj, gap, trendHtml, isCompared, orderIndex, readOnlyShare }) {
  const p = program;
  const riskMeta = RISK_META[p.risk] || RISK_META.hedef;
  const logo = getLogoUrl(p.universityId);
  const initials = escapeHtml(getUniInitials(p.university));
  const avatarHtml = logo
    ? `<div class="uni-avatar ql-avatar"><img src="${escapeHtml(logo)}" alt="${escapeHtml(p.university)}" decoding="async" onerror="this.style.display='none';this.parentElement.textContent='${initials}'" /></div>`
    : `<div class="uni-avatar ql-avatar">${initials}</div>`;

  const net0 = p.nets?.[0];
  const metaParts = [p.city, p.scoreType, p.language, p.scholarship].filter(Boolean).join(' · ');

  let gapHtml = '';
  if (gap && (gap.tytDiff !== null || gap.aytDiff !== null)) {
    const fmt = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}`;
    gapHtml = `<div class="ql-gap-row tabular">
      ${gap.tytDiff !== null ? `<span class="${gap.tytDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}">TYT ${fmt(gap.tytDiff)} net</span>` : ''}
      ${gap.aytDiff !== null ? `<span class="${gap.aytDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}">${gap.isDil ? 'YDT' : 'AYT'} ${fmt(gap.aytDiff)} net</span>` : ''}
    </div>`;
  }

  return `
    <div class="ql-card">
      <div class="ql-head">
        ${avatarHtml}
        <div style="min-width:0;flex:1;">
          <div class="ql-badges">
            <span class="pill mono">#${String(orderIndex + 1).padStart(2, '0')}</span>
            <span class="pill pill-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(riskMeta.label)}</span>
          </div>
          <h3 class="ql-title">${escapeHtml(p.department)}</h3>
          <div class="ql-sub">${escapeHtml(p.university)}</div>
          <div class="ql-meta">${escapeHtml(metaParts)}</div>
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" id="closeQuickLookBtn" type="button" aria-label="Kapat">
          <svg class="sf-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="ql-metrics tabular">
        <div class="ql-metric-box">
          <span>${escapeHtml(p.latestYear || 2026)} Sıra</span>
          <strong>${formatRank(p.latestRank)}</strong>
        </div>
        <div class="ql-metric-box">
          <span>2027 Tahmini</span>
          <strong style="color:var(--accent);">${proj ? `${formatRank(proj.low)}–${formatRank(proj.high)}` : '—'}</strong>
        </div>
        <div class="ql-metric-box">
          <span>Kontenjan</span>
          <strong>${p.quota ?? '—'}</strong>
        </div>
      </div>

      <div class="ql-trend-strip">
        <div style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:11px;font-weight:600;color:var(--text-tertiary);">4 Yıllık Taban Trendi</span>
          <div>${trendHtml || ''}</div>
          ${net0 ? `<span class="tabular" style="font-size:11.5px;color:var(--text-secondary);">Ort: TYT ${formatNet(net0.tytTotal)} · ${p.scoreType === 'DİL' ? `YDT ${formatNet(net0.ydt)}` : `AYT ${formatNet(net0.aytTotal)}`} net</span>` : ''}
        </div>
        ${renderSparkline(p.history, { width: 126, height: 38 })}
      </div>

      ${gapHtml}

      <div class="ql-actions">
        <button class="btn btn-primary" type="button" id="qlOpenDrawerBtn">Detayı Aç</button>
        <button class="btn ${isCompared ? 'btn-soft' : ''}" type="button" id="qlCompareBtn">${isCompared ? '✓ Kıyaslamada' : '+ Kıyasla'}</button>
        ${!readOnlyShare && orderIndex > 0 ? `<button class="btn" type="button" id="qlMoveTopBtn">#1 Yap</button>` : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// Feature 4: Floating iPadOS Compare Dock (Mini Ceramic Avatar Tray)
// ============================================================================
export function renderCompareDockHtml(programs) {
  if (!Array.isArray(programs) || !programs.length) return '';

  const avatars = programs
    .map((p) => {
      const logo = getLogoUrl(p.universityId);
      const initials = escapeHtml(getUniInitials(p.university));
      const inner = logo
        ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(p.university)}" decoding="async" onerror="this.style.display='none';this.parentElement.textContent='${initials}'" />`
        : initials;
      return `<button class="cmp-dock-avatar" type="button" data-dock-remove="${escapeHtml(p.code)}" title="${escapeHtml(p.university)} — ${escapeHtml(p.department)} (Çıkarmak için dokun)">
        <span class="cmp-dock-sq">${inner}</span>
        <span class="cmp-dock-x" aria-hidden="true">×</span>
      </button>`;
    })
    .join('');

  return `
    <div class="cmp-dock-inner">
      <div class="cmp-dock-avatars">${avatars}</div>
      <span class="cmp-dock-count tabular">${programs.length}/4</span>
      <button class="btn btn-primary btn-sm" type="button" id="cmpDockGoBtn">Kıyasla →</button>
      <button class="btn btn-ghost btn-icon btn-sm" type="button" id="cmpDockClearBtn" title="Kıyaslama listesini temizle" aria-label="Temizle">
        <svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
  `;
}

// ============================================================================
// Feature 5: Dynamic Horizontal Scroll Edge Fades (Smart Left/Right Mask)
// ============================================================================
const boundFadeEls = new WeakSet();

export function initScrollEdgeFades(root = document) {
  const scrollers = root.querySelectorAll('.scenario-bar, .filter-pills, .analysis-tabs-scroll');
  scrollers.forEach((el) => {
    const updateMask = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 4) {
        el.removeAttribute('data-fade-left');
        el.removeAttribute('data-fade-right');
        return;
      }
      if (el.scrollLeft > 4) el.setAttribute('data-fade-left', '1');
      else el.removeAttribute('data-fade-left');

      if (el.scrollLeft < maxScroll - 4) el.setAttribute('data-fade-right', '1');
      else el.removeAttribute('data-fade-right');
    };

    updateMask();
    if (boundFadeEls.has(el)) return;
    boundFadeEls.add(el);
    el.addEventListener('scroll', updateMask, { passive: true });
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateMask);
      ro.observe(el);
    }
  });
}
