import {
  escapeHtml,
  extractProgramCodes,
  formatRank,
  formatScore,
  formatNet,
  formatCurrency,
  formatRelativeTime,
  suggestRisk,
  RISK_META,
  getUniInitials,
  TYT_FIELDS,
  getAytFieldsForScoreType,
  generateSyncKey,
  exportProgramsToCsv,
} from './utils.js';
import {
  getApiBase,
  setCustomApiBase,
  hasConfiguredApi,
  isLocalDev,
  getLogoUrl,
  checkApiHealth,
  fetchProgramFromApi,
  pullCloudSync,
  pushCloudSync,
} from './api.js';
import { renderSparkline, renderDetailTrendChart, renderRankSpectrum } from './charts.js';

const STATE_KEY = 'tercihatlas_state_v1';
const SYNC_KEY_STORAGE = 'tercihatlas_sync_key';
const THEME_STORAGE = 'tercihatlas_theme_v2';

const DEFAULT_STATE = {
  version: 1,
  targetRank: 15000,
  updatedAt: null,
  programs: [],
  compareCodes: [],
};

// Uniform SF Symbols-style inline SVGs
const SF = {
  close: `<svg class="sf-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  plus: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`,
  check: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  up: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`,
  down: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  refresh: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>`,
  external: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M7 7h10v10"/></svg>`,
  copy: `<svg class="sf-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2.5"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  note: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>`,
  grip: `<svg class="sf-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>`,
  starFilled: (size = 13) =>
    `<svg class="sf-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.4l2.92 5.92 6.53.95-4.72 4.6 1.11 6.5L12 17.3l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.4z"/></svg>`,
  starEmpty: (size = 13) =>
    `<svg class="sf-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2.4l2.92 5.92 6.53.95-4.72 4.6 1.11 6.5L12 17.3l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.4z"/></svg>`,
  trash: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>`,
  arrowUpRight: `<svg class="sf-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7"/><path d="M8 7h9v9"/></svg>`,
  arrowDownRight: `<svg class="sf-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m7 7 10 10"/><path d="M17 8v9H8"/></svg>`,
  chevronRight: `<svg class="sf-icon row-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  listBadge: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>`,
  pieBadge: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 4v8l5.5 3.5"/></svg>`,
  chartBadge: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 9 13l4 3 7-8"/></svg>`,
  targetBadge: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/></svg>`,
};

const ui = {
  region: 'TR',
  tab: 'preferences',
  viewMode: localStorage.getItem('tercihatlas_view_mode') || 'cards',
  search: '',
  filterRisk: 'all',
  filterScoreType: 'all',
  sortBy: 'manual',
  drawerCode: null,
  drawerChartMode: 'rank',
  drawerNetYear: null,
  syncStatus: 'local',
  syncMessage: 'Yerel',
  lastSyncedAt: null,
  dragCode: null,
};

let state = loadLocalState();
let syncTimer = null;

// ============================================================================
// Persistence & Cloud Sync
// ============================================================================
function loadLocalState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      programs: Array.isArray(parsed.programs) ? parsed.programs : [],
      compareCodes: Array.isArray(parsed.compareCodes) ? parsed.compareCodes : [],
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function getSyncKey() {
  return localStorage.getItem(SYNC_KEY_STORAGE) || '';
}

function saveState({ triggerCloud = true } = {}) {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  if (triggerCloud && getSyncKey() && hasConfiguredApi()) {
    scheduleCloudPush();
  }
}

function updateSyncIndicator(status, label) {
  ui.syncStatus = status;
  ui.syncMessage = label;
  const dot = document.getElementById('syncDot');
  const text = document.getElementById('syncLabel');
  if (dot) {
    dot.className = 'status-dot' + (status === 'synced' ? ' synced' : status === 'syncing' ? ' syncing' : status === 'error' ? ' error' : '');
  }
  if (text) text.textContent = label;
}

function scheduleCloudPush() {
  clearTimeout(syncTimer);
  updateSyncIndicator('syncing', 'Eşitleniyor');
  syncTimer = setTimeout(() => {
    syncPushNow({ silent: true });
  }, 1100);
}

async function syncPushNow({ silent = false } = {}) {
  const key = getSyncKey();
  if (!key || !hasConfiguredApi()) {
    updateSyncIndicator('local', 'Yerel');
    return false;
  }
  try {
    updateSyncIndicator('syncing', 'Eşitleniyor');
    const res = await pushCloudSync(key, state);
    ui.lastSyncedAt = res.syncedAt || new Date().toISOString();
    updateSyncIndicator('synced', 'Bulutta Güncel');
    if (!silent) showToast('Bulut eşitleme tamamlandı.', 'success');
    return true;
  } catch (err) {
    updateSyncIndicator('error', 'Hata');
    if (!silent) showToast(err.message || 'Buluta kaydedilemedi.', 'error');
    return false;
  }
}

async function syncPullOnStartup({ forceOverwrite = false, silent = true } = {}) {
  const key = getSyncKey();
  if (!key || !hasConfiguredApi()) {
    updateSyncIndicator('local', 'Yerel');
    return;
  }
  try {
    updateSyncIndicator('syncing', 'Bağlanıyor');
    const res = await pullCloudSync(key);
    if (res.exists && res.data) {
      const cloudTime = new Date(res.data.updatedAt || res.data.syncedAt || 0).getTime();
      const localTime = new Date(state.updatedAt || 0).getTime();
      if (forceOverwrite || cloudTime > localTime || state.programs.length === 0) {
        state = {
          ...structuredClone(DEFAULT_STATE),
          ...res.data,
          programs: Array.isArray(res.data.programs) ? res.data.programs : [],
          compareCodes: Array.isArray(res.data.compareCodes) ? res.data.compareCodes : [],
        };
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
        renderAll();
      } else if (localTime > cloudTime) {
        await pushCloudSync(key, state);
      }
      ui.lastSyncedAt = res.data.syncedAt || new Date().toISOString();
      updateSyncIndicator('synced', 'Bulutta Güncel');
      if (!silent) showToast('Buluttaki listen eşitlendi.', 'success');
    } else {
      await pushCloudSync(key, state);
      ui.lastSyncedAt = new Date().toISOString();
      updateSyncIndicator('synced', 'Bulutta Güncel');
      if (!silent) showToast('Bulut kasası oluşturuldu ve eşitlendi.', 'success');
    }
  } catch (err) {
    updateSyncIndicator('error', 'Çevrimdışı');
    if (!silent) showToast(err.message || 'Bulut bağlantısı kurulamadı.', 'error');
  }
}

// ============================================================================
// Theme (Apple Light Default) & Floating Pill Toast
// ============================================================================
function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE);
  applyTheme(saved || 'light');
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE, theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#000000' : '#F5F5F7');
  const statusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (statusMeta) statusMeta.setAttribute('content', theme === 'dark' ? 'black-translucent' : 'default');
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.innerHTML =
      theme === 'dark'
        ? '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2.5 12h2M19.5 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  const dotColor = type === 'error' ? 'var(--rose)' : type === 'success' ? 'var(--green-bright)' : 'var(--accent)';
  el.innerHTML = `<span class="dot" style="background:${dotColor}"></span><span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    el.style.transition = 'opacity 200ms ease, transform 200ms ease';
    setTimeout(() => el.remove(), 220);
  }, 3000);
}

// ============================================================================
// Program Helpers
// ============================================================================
function renderAvatar(program) {
  const logo = getLogoUrl(program.universityId);
  const initials = escapeHtml(getUniInitials(program.university));
  if (!logo) {
    return `<div class="uni-avatar">${initials}</div>`;
  }
  return `<div class="uni-avatar">
    <img src="${escapeHtml(logo)}" alt="${escapeHtml(program.university)}" loading="lazy"
      onerror="this.style.display='none';this.parentElement.textContent='${initials}'" />
  </div>`;
}

function renderTrendBadge(program) {
  if (program.rankTrendDelta === null || program.rankTrendDelta === undefined) {
    return `<span class="trend-flat">Trend yok</span>`;
  }
  if (program.rankTrendDelta > 0) {
    return `<span class="trend-up tabular" title="Önceki yıla göre daha üst sıradan kapattı">${SF.arrowUpRight} ${formatRank(program.rankTrendDelta)} sıra</span>`;
  }
  if (program.rankTrendDelta < 0) {
    return `<span class="trend-down tabular" title="Önceki yıla göre daha alt sıradan kapattı">${SF.arrowDownRight} ${formatRank(Math.abs(program.rankTrendDelta))} sıra</span>`;
  }
  return `<span class="trend-flat">Sabit</span>`;
}

function renderStarsInline(rating) {
  if (!rating) return '';
  let html = '<span class="stars-inline" title="Kişisel puanın">';
  for (let i = 1; i <= 5; i++) {
    html += i <= rating ? SF.starFilled(12) : `<span style="color:var(--separator)">${SF.starEmpty(12)}</span>`;
  }
  return html + '</span>';
}

function getFilteredPrograms() {
  const q = ui.search.trim().toLocaleLowerCase('tr');
  let list = state.programs.map((p, idx) => ({ ...p, _order: idx + 1 }));

  if (q) {
    list = list.filter((p) => {
      const hay = `${p.code} ${p.university} ${p.department} ${p.faculty} ${p.city} ${p.language} ${p.notes || ''}`.toLocaleLowerCase('tr');
      return hay.includes(q);
    });
  }

  if (ui.filterRisk !== 'all') list = list.filter((p) => p.risk === ui.filterRisk);
  if (ui.filterScoreType !== 'all') list = list.filter((p) => p.scoreType === ui.filterScoreType);

  if (ui.sortBy === 'rank-asc') {
    list.sort((a, b) => (a.latestRank ?? 9e9) - (b.latestRank ?? 9e9));
  } else if (ui.sortBy === 'rank-desc') {
    list.sort((a, b) => (b.latestRank ?? -1) - (a.latestRank ?? -1));
  } else if (ui.sortBy === 'rating-desc') {
    list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (ui.sortBy === 'trend-up') {
    list.sort((a, b) => (b.rankTrendDelta ?? -9e9) - (a.rankTrendDelta ?? -9e9));
  }
  return list;
}

function addProgramToState(rawProgram, chosenRisk) {
  const existingIdx = state.programs.findIndex((p) => p.code === rawProgram.code);
  const risk = chosenRisk || suggestRisk(rawProgram.latestRank, state.targetRank);

  if (existingIdx !== -1) {
    const prev = state.programs[existingIdx];
    state.programs[existingIdx] = {
      ...rawProgram,
      risk: chosenRisk || prev.risk,
      rating: prev.rating || 0,
      pros: prev.pros || [],
      cons: prev.cons || [],
      notes: prev.notes || '',
      addedAt: prev.addedAt || new Date().toISOString(),
    };
  } else {
    state.programs.push({
      ...rawProgram,
      risk,
      rating: 0,
      pros: [],
      cons: [],
      notes: '',
      addedAt: new Date().toISOString(),
    });
  }
  saveState();
}

function reorderPrograms(fromCode, toCode) {
  if (!fromCode || !toCode || fromCode === toCode) return;
  const fromIdx = state.programs.findIndex((p) => p.code === fromCode);
  const toIdx = state.programs.findIndex((p) => p.code === toCode);
  if (fromIdx === -1 || toIdx === -1) return;
  const [moved] = state.programs.splice(fromIdx, 1);
  state.programs.splice(toIdx, 0, moved);
  ui.sortBy = 'manual';
  saveState();
  renderAll();
}

function moveProgramStep(code, delta) {
  const idx = state.programs.findIndex((p) => p.code === code);
  const next = idx + delta;
  if (idx === -1 || next < 0 || next >= state.programs.length) return;
  const [moved] = state.programs.splice(idx, 1);
  state.programs.splice(next, 0, moved);
  ui.sortBy = 'manual';
  saveState();
  renderAll();
}

function toggleCompare(code) {
  const idx = state.compareCodes.indexOf(code);
  if (idx !== -1) {
    state.compareCodes.splice(idx, 1);
  } else {
    if (state.compareCodes.length >= 4) {
      showToast('En fazla 4 bölümü yan yana karşılaştırabilirsin.', 'error');
      return;
    }
    state.compareCodes.push(code);
  }
  saveState();
  renderAll();
}

async function refreshProgramLive(code) {
  try {
    showToast(`${code} güncelleniyor...`);
    const fresh = await fetchProgramFromApi(code, { refresh: true });
    addProgramToState(fresh);
    renderAll();
    if (ui.drawerCode === code) renderDrawer();
    showToast(`${fresh.university} — ${fresh.department} güncellendi.`, 'success');
  } catch (err) {
    showToast(err.message || 'Güncelleme başarısız.', 'error');
  }
}

function removeProgram(code) {
  const target = state.programs.find((p) => p.code === code);
  if (!target) return;
  state.programs = state.programs.filter((p) => p.code !== code);
  state.compareCodes = state.compareCodes.filter((c) => c !== code);
  if (ui.drawerCode === code) closeDrawer();
  saveState();
  renderAll();
  showToast(`${target.department} listeden çıkarıldı.`);
}

// ============================================================================
// Rendering: Main Shell & Apple Large Titles
// ============================================================================
function updateHeaderBadges() {
  const prefBadge = document.getElementById('prefCountBadge');
  const cmpBadge = document.getElementById('compareCountBadge');
  if (prefBadge) prefBadge.textContent = String(state.programs.length);
  if (cmpBadge) cmpBadge.textContent = String(state.compareCodes.length);

  const activeNavKey = ui.region === 'ABROAD' ? 'abroad' : ui.tab;

  document.querySelectorAll('#desktopNav .nav-pill-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === activeNavKey);
  });

  document.querySelectorAll('#mobileNav .mobile-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mobileTab === activeNavKey);
  });
}

function renderAll() {
  updateHeaderBadges();
  const root = document.getElementById('mainRoot');
  if (!root) return;

  if (ui.region === 'ABROAD') {
    root.innerHTML = renderAbroadPhase2();
    document.getElementById('backToTrBtn')?.addEventListener('click', () => {
      ui.region = 'TR';
      renderAll();
    });
    return;
  }

  if (ui.tab === 'compare') {
    root.innerHTML = renderCompareView();
    bindCompareEvents();
    return;
  }

  if (ui.tab === 'analysis') {
    root.innerHTML = renderAnalysisView();
    bindAnalysisEvents();
    return;
  }

  root.innerHTML = renderPreferencesView();
  bindPreferencesEvents();
}

function renderKpiStrip() {
  const total = state.programs.length;
  const hayal = state.programs.filter((p) => p.risk === 'hayal').length;
  const hedef = state.programs.filter((p) => p.risk === 'hedef').length;
  const guvenli = state.programs.filter((p) => p.risk === 'guvenli').length;

  const pct = (n) => (total ? (n / total) * 100 : 0);

  const validRanks = state.programs.map((p) => p.latestRank).filter((r) => r && r > 0);
  const bestRank = validRanks.length ? Math.min(...validRanks) : null;
  const worstRank = validRanks.length ? Math.max(...validRanks) : null;

  return `<section class="kpi-strip" aria-label="Tercih özeti">
    <div class="kpi-card">
      <div class="kpi-head">
        <span class="kpi-label"><span class="sf-badge sf-badge-blue">${SF.listBadge}</span>Tercih Sayısı</span>
        <span style="font-size:11.5px;color:var(--text-tertiary);font-weight:500;">24 Hak</span>
      </div>
      <div class="kpi-value tabular">${total}<span style="font-size:15px;font-weight:500;color:var(--text-tertiary)">/ 24</span></div>
      <div class="kpi-sub">${total === 0 ? 'İlk bölümünü ekle' : `${Math.max(0, 24 - total)} boş kontenjan kaldı`}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-head">
        <span class="kpi-label"><span class="sf-badge sf-badge-rose">${SF.pieBadge}</span>Risk Dengesi</span>
      </div>
      <div class="apple-stack-bar" aria-label="Risk dağılım çubuğu">
        ${hayal ? `<div class="apple-stack-seg" style="width:${pct(hayal)}%;background:var(--rose)"></div>` : ''}
        ${hedef ? `<div class="apple-stack-seg" style="width:${pct(hedef)}%;background:var(--accent)"></div>` : ''}
        ${guvenli ? `<div class="apple-stack-seg" style="width:${pct(guvenli)}%;background:var(--green-bright)"></div>` : ''}
      </div>
      <div class="risk-legend tabular">
        <span class="risk-legend-item"><span class="dot" style="background:var(--rose)"></span>${hayal} Hayal</span>
        <span class="risk-legend-item"><span class="dot" style="background:var(--accent)"></span>${hedef} Hedef</span>
        <span class="risk-legend-item"><span class="dot" style="background:var(--green-bright)"></span>${guvenli} Güvenli</span>
      </div>
    </div>

    <div class="kpi-card">
      <div class="kpi-head">
        <span class="kpi-label"><span class="sf-badge sf-badge-green">${SF.chartBadge}</span>Sıralama Bandı</span>
      </div>
      <div class="kpi-value tabular" style="font-size:21px;">
        ${bestRank ? `${formatRank(bestRank)} – ${formatRank(worstRank)}` : '—'}
      </div>
      <div class="kpi-sub">${validRanks.length ? `${validRanks.length} programın son taban sırası` : 'Bölüm ekleyince hesaplanır'}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-head">
        <span class="kpi-label"><span class="sf-badge sf-badge-amber">${SF.targetBadge}</span>Hedef Sıralaman</span>
      </div>
      <div>
        <input id="targetRankInput" class="target-rank-input tabular" type="number" min="1" max="3000000" step="500"
          value="${state.targetRank || ''}" placeholder="15000" aria-label="Hedef sıralama" />
      </div>
      <div class="kpi-sub">Otomatik Hayal / Hedef / Güvenli etiketi</div>
    </div>
  </section>`;
}

function renderPreferencesView() {
  const scoreTypes = [...new Set(state.programs.map((p) => p.scoreType).filter(Boolean))];
  const filtered = getFilteredPrograms();

  const headerHtml = `<div class="page-header">
    <div>
      <div class="page-eyebrow">YKS 2027 · Türkiye</div>
      <h1 class="page-title">Tercihlerim</h1>
      <p class="page-subtitle">Canlı YÖK Atlas verileri, 4 yıllık sıralama trendleri ve yerleşen netleri</p>
    </div>
  </div>`;

  const kpiHtml = renderKpiStrip();

  if (state.programs.length === 0) {
    return `${headerHtml}${kpiHtml}
    <section class="apple-hero">
      <div class="apple-hero-content">
        <img src="icon.svg" alt="TercihAtlas" class="apple-hero-icon" />
        <h2>Hayalindeki bölümü tek kodla ekle.</h2>
        <p>YÖK Atlas'tan 9 haneli program kodunu veya sayfa linkini yapıştır; 4 yıllık taban sıralama, puan, kontenjan ve yerleşen netleri anında listene gelsin.</p>
        <form class="hero-spotlight" id="heroSpotlightForm">
          <svg class="sf-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7.5"/><path d="m20 20-3.8-3.8"/></svg>
          <input id="heroCodeInput" type="text" placeholder="Program kodu veya YÖK Atlas linki yapıştır..." autocomplete="off" />
          <button class="btn btn-primary btn-sm" type="submit">Getir</button>
        </form>
      </div>
      <div class="sample-tiles">
        <button class="sample-tile" data-quick-add="102210277">
          <strong>Boğaziçi Üni.</strong>
          <span>Bilgisayar Müh. · SAY</span>
        </button>
        <button class="sample-tile" data-quick-add="108410336">
          <strong>ODTÜ</strong>
          <span>Bilgisayar Müh. · SAY</span>
        </button>
        <button class="sample-tile" data-quick-add="203910399">
          <strong>Koç Üni.</strong>
          <span>Elektrik-Elektronik · Burslu</span>
        </button>
        <button class="sample-tile" data-quick-add="203910275">
          <strong>Koç Üni.</strong>
          <span>Ekonomi · EA · Burslu</span>
        </button>
      </div>
    </section>`;
  }

  const toolbarHtml = `<section class="toolbar">
    <div class="toolbar-left">
      <div class="search-box">
        <svg class="sf-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7.5"/><path d="m20 20-3.8-3.8"/></svg>
        <input id="searchInput" class="input" type="search" value="${escapeHtml(ui.search)}" placeholder="Ara..." />
      </div>

      <div class="filter-pills">
        ${['all', 'hayal', 'hedef', 'guvenli']
          .map((rk) => {
            const label = rk === 'all' ? 'Tümü' : RISK_META[rk].label;
            return `<button class="filter-pill ${ui.filterRisk === rk ? 'active' : ''}" data-filter-risk="${rk}">${label}</button>`;
          })
          .join('')}
        ${scoreTypes.length > 1
          ? scoreTypes
              .map(
                (st) =>
                  `<button class="filter-pill ${ui.filterScoreType === st ? 'active' : ''}" data-filter-st="${escapeHtml(st)}">${escapeHtml(st)}</button>`,
              )
              .join('')
          : ''}
      </div>
    </div>

    <div class="toolbar-right">
      <select id="sortSelect" class="select toolbar-select" aria-label="Sıralama">
        <option value="manual" ${ui.sortBy === 'manual' ? 'selected' : ''}>Tercih Sıram</option>
        <option value="rank-asc" ${ui.sortBy === 'rank-asc' ? 'selected' : ''}>Sıralama (En Yüksek)</option>
        <option value="rank-desc" ${ui.sortBy === 'rank-desc' ? 'selected' : ''}>Sıralama (En Düşük)</option>
        <option value="rating-desc" ${ui.sortBy === 'rating-desc' ? 'selected' : ''}>Yıldız Puanım</option>
        <option value="trend-up" ${ui.sortBy === 'trend-up' ? 'selected' : ''}>En Çok Yükselen</option>
      </select>

      <div class="segmented" role="group" aria-label="Görünüm">
        <button class="seg-btn seg-btn-sm ${ui.viewMode === 'cards' ? 'active' : ''}" data-view="cards">
          <svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>
          <span>Kart</span>
        </button>
        <button class="seg-btn seg-btn-sm ${ui.viewMode === 'table' ? 'active' : ''}" data-view="table">
          <svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          <span>Tablo</span>
        </button>
      </div>
    </div>
  </section>`;

  if (!filtered.length) {
    return `${headerHtml}${kpiHtml}${toolbarHtml}<div class="empty-state" style="padding:40px 24px;">
      <h2>Eşleşen program bulunamadı</h2>
      <p>Arama kelimesini veya seçili filtreyi temizleyerek tüm tercihlerini görebilirsin.</p>
      <button class="btn" id="clearFiltersBtn">Filtreleri Temizle</button>
    </div>`;
  }

  const contentHtml = ui.viewMode === 'table' ? renderTableView(filtered) : renderCardsView(filtered);
  return `${headerHtml}${kpiHtml}${toolbarHtml}${contentHtml}`;
}

function renderCardsView(programs) {
  const manualMode = ui.sortBy === 'manual' && !ui.search && ui.filterRisk === 'all' && ui.filterScoreType === 'all';
  return `<section class="cards-grid" id="programList">
    ${programs
      .map((p) => {
        const net0 = p.nets?.[0];
        const isCompared = state.compareCodes.includes(p.code);
        const riskMeta = RISK_META[p.risk] || RISK_META.hedef;
        const metaParts = [p.scoreType, p.city, p.language, p.scholarship, p.accreditation].filter(Boolean);
        const netSummary = net0
          ? `TYT ${formatNet(net0.tytTotal)} · ${p.scoreType === 'DİL' ? `YDT ${formatNet(net0.ydt)}` : `AYT ${formatNet(net0.aytTotal)}`} net`
          : 'Net verisi yok';

        return `<article class="prog-card" data-code="${escapeHtml(p.code)}" draggable="${manualMode ? 'true' : 'false'}">
          <div class="card-top">
            <div class="card-left-head">
              ${renderAvatar(p)}
              <div class="card-titles">
                <div class="card-dept">${escapeHtml(p.department)}</div>
                <div class="card-uni">${escapeHtml(p.university)}</div>
                <div class="card-meta-line">${escapeHtml(metaParts.join(' · '))}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
              <span class="pill pill-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(riskMeta.label)}</span>
              <span class="order-pill tabular" title="${manualMode ? 'Sürükleyerek sırala' : 'Tercih sıran'}">
                ${manualMode ? SF.grip : ''}#${String(p._order).padStart(2, '0')}
              </span>
            </div>
          </div>

          <div class="card-metrics">
            <div class="metric-group">
              <div class="metric-item">
                <span class="metric-label">${escapeHtml(p.latestYear || 2026)} Sıralama</span>
                <span class="metric-val tabular">${formatRank(p.latestRank)}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Taban Puan</span>
                <span class="metric-val-sub tabular">${formatScore(p.latestScore)}</span>
              </div>
              <div class="metric-item">
                <span class="metric-label">Kontenjan</span>
                <span class="metric-val-sub tabular">${p.quota ?? '—'}</span>
              </div>
            </div>
            <div class="spark-col">
              ${renderSparkline(p.history)}
              ${renderTrendBadge(p)}
            </div>
          </div>

          <div class="card-footer">
            <div class="card-footer-left">
              <span class="tabular" style="font-weight:500;">${escapeHtml(netSummary)}</span>
              ${renderStarsInline(p.rating)}
              ${p.notes ? `<span style="display:inline-flex;align-items:center;gap:4px;color:var(--text-tertiary);" title="Kişisel not var">${SF.note} Not</span>` : ''}
            </div>
            <div class="card-footer-actions" data-stop-card="1">
              ${manualMode
                ? `<button class="mini-action mini-action-icon" data-move-up="${escapeHtml(p.code)}" title="Yukarı taşı">${SF.up}</button>
                   <button class="mini-action mini-action-icon" data-move-down="${escapeHtml(p.code)}" title="Aşağı taşı">${SF.down}</button>`
                : ''}
              <button class="mini-action ${isCompared ? 'active' : ''}" data-toggle-compare="${escapeHtml(p.code)}" title="Karşılaştır">
                ${isCompared ? `${SF.check} Kıyasla` : `${SF.plus} Kıyasla`}
              </button>
            </div>
          </div>
        </article>`;
      })
      .join('')}
  </section>`;
}

function renderTableView(programs) {
  const manualMode = ui.sortBy === 'manual' && !ui.search && ui.filterRisk === 'all' && ui.filterScoreType === 'all';
  return `<section class="table-wrap">
    <table class="prog-table">
      <thead>
        <tr>
          <th style="width:52px;">#</th>
          <th>Üniversite & Bölüm</th>
          <th>Detay</th>
          <th>Kategori</th>
          <th>Sıralama</th>
          <th>Taban Puan</th>
          <th>4 Yıl Trend</th>
          <th>Kontenjan</th>
          <th>Ort. Net</th>
          <th style="width:105px;">İşlem</th>
        </tr>
      </thead>
      <tbody id="programList">
        ${programs
          .map((p) => {
            const net0 = p.nets?.[0];
            const isCompared = state.compareCodes.includes(p.code);
            const riskMeta = RISK_META[p.risk] || RISK_META.hedef;
            return `<tr data-code="${escapeHtml(p.code)}" draggable="${manualMode ? 'true' : 'false'}">
              <td class="tabular" style="color:var(--text-tertiary);font-weight:600;">${String(p._order).padStart(2, '0')}</td>
              <td>
                <div class="td-uni-cell">
                  ${renderAvatar(p)}
                  <div style="min-width:0;">
                    <div style="font-weight:600;color:var(--text);">${escapeHtml(p.department)}</div>
                    <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(p.university)}</div>
                  </div>
                </div>
              </td>
              <td>
                <div>${escapeHtml(p.city)} · ${escapeHtml(p.scoreType)}</div>
                <div style="font-size:12px;color:var(--text-tertiary);">${escapeHtml(p.language)} · ${escapeHtml(p.scholarship)}</div>
              </td>
              <td>
                <span class="pill pill-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(riskMeta.label)}</span>
              </td>
              <td class="tabular" style="font-weight:700;">${formatRank(p.latestRank)}</td>
              <td class="tabular">${formatScore(p.latestScore)}</td>
              <td>${renderSparkline(p.history, { width: 76, height: 24 })}</td>
              <td class="tabular">${p.quota ?? '—'}</td>
              <td class="tabular" style="font-size:12px;color:var(--text-secondary);">
                ${net0 ? `TYT ${formatNet(net0.tytTotal)}<br/>${p.scoreType === 'DİL' ? `YDT ${formatNet(net0.ydt)}` : `AYT ${formatNet(net0.aytTotal)}`}` : '—'}
              </td>
              <td data-stop-card="1">
                <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;">
                  <button class="mini-action ${isCompared ? 'active' : ''}" data-toggle-compare="${escapeHtml(p.code)}">
                    ${isCompared ? `${SF.check} Kıyas` : `${SF.plus} Kıyas`}
                  </button>
                  ${SF.chevronRight}
                </div>
              </td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  </section>`;
}

// ============================================================================
// Compare View
// ============================================================================
function renderCompareView() {
  const selected = state.compareCodes.map((code) => state.programs.find((p) => p.code === code)).filter(Boolean);
  const available = state.programs.filter((p) => !state.compareCodes.includes(p.code));

  const headerHtml = `<div class="page-header">
    <div>
      <h1 class="page-title">Karşılaştır</h1>
      <p class="page-subtitle">En fazla 4 bölümü sıralama, netler ve kişisel notlarınla yan yana incele</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      ${available.length && selected.length < 4
        ? `<select id="cmpAddSelect" class="select toolbar-select" style="max-width:280px;">
            <option value="">+ Listeden bölüm ekle...</option>
            ${available.map((p) => `<option value="${escapeHtml(p.code)}">${escapeHtml(p.university)} — ${escapeHtml(p.department)}</option>`).join('')}
          </select>`
        : ''}
      ${selected.length ? `<button class="btn btn-sm" id="cmpClearBtn">Temizle</button>` : ''}
    </div>
  </div>`;

  if (state.programs.length < 2) {
    return `${headerHtml}<div class="empty-state">
      <h2>En az 2 program ekle</h2>
      <p>Tercih listene en az iki bölüm ekledikten sonra sıralama, 4 yıllık trend ve yerleşen netlerini yan yana kıyaslayabilirsin.</p>
      <button class="btn btn-primary" id="cmpOpenAddBtn">${SF.plus} Program Ekle</button>
    </div>`;
  }

  if (!selected.length) {
    return `${headerHtml}<div class="empty-state" style="padding:44px 24px;">
      <h2>Karşılaştırma seçimi boş</h2>
      <p>Yukarıdan bölüm seçebilir veya kartların üzerindeki <strong>Kıyasla</strong> butonunu kullanabilirsin.</p>
      <button class="btn btn-primary" id="cmpPickFirstTwoBtn">İlk 2 Tercihi Kıyasla</button>
    </div>`;
  }

  const bestRank = Math.min(...selected.map((p) => p.latestRank || 9e9));
  const bestScore = Math.max(...selected.map((p) => p.latestScore || 0));

  const rows = [
    { label: 'Şehir & Dil', render: (p) => `${escapeHtml(p.city)} · ${escapeHtml(p.language)}` },
    {
      label: 'Tür & Burs',
      render: (p) =>
        `${escapeHtml(p.universityType)} · ${escapeHtml(p.scholarship)}${p.tuition ? `<div class="tabular" style="font-size:12px;color:var(--text-tertiary);margin-top:2px;">${formatCurrency(p.tuition)}</div>` : ''}`,
    },
    {
      label: 'Kategori',
      render: (p) =>
        `<span class="pill pill-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(RISK_META[p.risk]?.label || 'Hedef')}</span> <span class="pill">${escapeHtml(p.scoreType)}</span>`,
    },
    {
      label: 'Taban Sıralama',
      render: (p) =>
        `<span class="tabular ${p.latestRank === bestRank ? 'compare-best' : ''}" style="font-family:var(--font-display);font-size:17px;font-weight:700;">${formatRank(p.latestRank)}</span>`,
    },
    {
      label: 'Taban Puan',
      render: (p) => `<span class="tabular ${p.latestScore === bestScore ? 'compare-best' : ''}">${formatScore(p.latestScore)}</span>`,
    },
    {
      label: '4 Yıllık Trend',
      render: (p) => `<div style="display:flex;flex-direction:column;gap:5px;">${renderSparkline(p.history, { width: 120, height: 32 })}${renderTrendBadge(p)}</div>`,
    },
    { label: 'Kontenjan / Yerleşen', render: (p) => `<span class="tabular">${p.quota ?? '—'} / ${p.placed ?? '—'}</span>` },
    {
      label: 'Ort. TYT / AYT Net',
      render: (p) => {
        const n = p.nets?.[0];
        if (!n) return '—';
        const second = p.scoreType === 'DİL' ? `YDT <strong>${formatNet(n.ydt)}</strong>` : `AYT <strong>${formatNet(n.aytTotal)}</strong>`;
        return `<div class="tabular">TYT <strong>${formatNet(n.tytTotal)}</strong> · ${second}<div style="font-size:12px;color:var(--text-tertiary);margin-top:2px;">OBP ${formatScore(n.obp)} (${n.year})</div></div>`;
      },
    },
    {
      label: 'Akademik Kadro',
      render: (p) => {
        const s = p.academicStaff || {};
        const tot = (s.prof || 0) + (s.doc || 0) + (s.drOgr || 0) + (s.arGor || 0);
        return `<div class="tabular"><strong>${tot}</strong> akademisyen<div style="font-size:12px;color:var(--text-tertiary);">${s.prof || 0} Prof · ${s.doc || 0} Doç · ${s.drOgr || 0} Dr.</div></div>`;
      },
    },
    {
      label: 'Akreditasyon',
      render: (p) => (p.accreditation ? `<span class="pill pill-accent">${escapeHtml(p.accreditation)}</span>` : '<span style="color:var(--text-tertiary)">—</span>'),
    },
    {
      label: 'Puanın & Artı / Eksi',
      render: (p) => {
        const stars = p.rating ? renderStarsInline(p.rating) : '<span style="color:var(--text-tertiary);font-size:12.5px;">Puanlanmadı</span>';
        const pros = (p.pros || []).map((x) => `<div style="color:var(--green);font-size:12.5px;">+ ${escapeHtml(x)}</div>`).join('');
        const cons = (p.cons || []).map((x) => `<div style="color:var(--rose);font-size:12.5px;">− ${escapeHtml(x)}</div>`).join('');
        return `${stars}<div style="margin-top:6px;">${pros}${cons}</div>`;
      },
    },
  ];

  return `${headerHtml}
  <div class="compare-grid-wrap">
    <table class="compare-table">
      <thead>
        <tr>
          <th class="compare-row-label">Kriter</th>
          ${selected
            .map(
              (p) => `<th>
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                  <div style="display:flex;gap:11px;align-items:center;min-width:0;">
                    ${renderAvatar(p)}
                    <div style="min-width:0;">
                      <div style="font-family:var(--font-display);font-size:14.5px;font-weight:650;color:var(--text);">${escapeHtml(p.department)}</div>
                      <div style="font-size:12.5px;color:var(--text-secondary);font-weight:500;">${escapeHtml(p.university)}</div>
                    </div>
                  </div>
                  <button class="btn btn-ghost btn-icon btn-sm" data-cmp-remove="${escapeHtml(p.code)}" title="Çıkar">${SF.close}</button>
                </div>
              </th>`,
            )
            .join('')}
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
              <td class="compare-row-label">${r.label}</td>
              ${selected.map((p) => `<td>${r.render(p)}</td>`).join('')}
            </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </div>`;
}

// ============================================================================
// Analysis View
// ============================================================================
function renderAnalysisView() {
  const headerHtml = `<div class="page-header">
    <div>
      <h1 class="page-title">Analiz</h1>
      <p class="page-subtitle">Tercih listendeki sıralama dengesi, şehirler ve üniversite dağılımı</p>
    </div>
  </div>`;

  if (!state.programs.length) {
    return `${headerHtml}<div class="empty-state">
      <h2>Analiz için program ekle</h2>
      <p>Listene eklediğin bölümlerin sıralama haritası, risk dengesi ve şehir dağılımı burada otomatik oluşur.</p>
      <button class="btn btn-primary" id="analysisAddBtn">${SF.plus} Program Ekle</button>
    </div>`;
  }

  const total = state.programs.length;
  const countBy = (fn) => {
    const map = new Map();
    for (const p of state.programs) {
      const k = fn(p) || 'Diğer';
      map.set(k, (map.get(k) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };

  const cities = countBy((p) => p.city);
  const uniTypes = countBy((p) => p.universityType);
  const languages = countBy((p) => p.language);
  const risks = ['hayal', 'hedef', 'guvenli'].map((rk) => ({
    label: RISK_META[rk].label,
    color: rk === 'hayal' ? 'var(--rose)' : rk === 'hedef' ? 'var(--accent)' : 'var(--green-bright)',
    count: state.programs.filter((p) => p.risk === rk).length,
  }));

  const renderDist = (entries, color = 'var(--accent)') =>
    `<div class="dist-bar-list">
      ${entries
        .map(
          ([label, count]) => `<div class="dist-row">
            <div class="dist-row-head"><span>${escapeHtml(label)}</span><span class="tabular" style="color:var(--text-secondary)">${count} · %${Math.round((count / total) * 100)}</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${(count / total) * 100}%;background:${color};"></div></div>
          </div>`,
        )
        .join('')}
    </div>`;

  return `${headerHtml}<section class="analysis-grid">
    <div class="panel panel-full">
      <h3 class="panel-title">
        <span>Sıralama Haritası</span>
        <span style="font-size:12.5px;font-weight:500;color:var(--text-tertiary)">Detayı açmak için bir numaraya dokun</span>
      </h3>
      ${renderRankSpectrum(state.programs, state.targetRank)}
    </div>

    <div class="panel">
      <h3 class="panel-title">Risk Dengesi</h3>
      <div class="dist-bar-list">
        ${risks
          .map(
            (r) => `<div class="dist-row">
              <div class="dist-row-head"><span>${r.label}</span><span class="tabular" style="color:var(--text-secondary)">${r.count} · %${Math.round((r.count / total) * 100)}</span></div>
              <div class="bar-track"><div class="bar-fill" style="width:${(r.count / total) * 100}%;background:${r.color};"></div></div>
            </div>`,
          )
          .join('')}
      </div>
    </div>

    <div class="panel">
      <h3 class="panel-title">Şehir Dağılımı</h3>
      ${renderDist(cities)}
    </div>

    <div class="panel">
      <h3 class="panel-title">Üniversite Türü</h3>
      ${renderDist(uniTypes, 'var(--green-bright)')}
    </div>

    <div class="panel">
      <h3 class="panel-title">Eğitim Dili</h3>
      ${renderDist(languages, 'var(--accent)')}
    </div>
  </section>`;
}

// ============================================================================
// Foreign Universities Phase 2 View
// ============================================================================
function renderAbroadPhase2() {
  return `<section>
    <div class="page-header">
      <div>
        <h1 class="page-title">Yurt Dışı</h1>
        <p class="page-subtitle">Almanya ve İtalya başvuruları için hazır Faz 2 modülü</p>
      </div>
      <button class="btn btn-primary" id="backToTrBtn">Türkiye Listeme Dön</button>
    </div>

    <div class="panel">
      <span class="pill pill-accent" style="margin-bottom:10px;">Mimari Hazır</span>
      <h2 style="font-family:var(--font-display);margin:0;font-size:20px;font-weight:700;letter-spacing:-0.025em;">Tek Çatı Altında TR + Avrupa Başvuruları</h2>
      <p style="margin:8px 0 0;color:var(--text-secondary);max-width:660px;font-size:14.5px;line-height:1.55;">
        TercihAtlas veri modeli en baştan ülke bazlı tasarlandı. Türkiye (YKS 2027) listeni oluşturduktan sonra Almanya ve İtalya üniversitelerini de aynı arayüze ve bulut senkronizasyonuna ekleyeceğiz.
      </p>
    </div>

    <div class="abroad-grid">
      <div class="abroad-card">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h3>Almanya · Lisans & Studienkolleg</h3>
          <span class="pill">Faz 2</span>
        </div>
        <p>TUM, RWTH Aachen, KIT ve TU Berlin başvuruları için planlanan takip kartları:</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <span class="pill">NC & YKS Şartı</span>
          <span class="pill">TestDaF / Goethe C1</span>
          <span class="pill">Uni-Assist Takvimi</span>
          <span class="pill">Dönem Harcı & Bloke Hesap</span>
        </div>
      </div>

      <div class="abroad-card">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h3>İtalya · İngilizce Lisans</h3>
          <span class="pill">Faz 2</span>
        </div>
        <p>Politecnico di Milano, Politecnico di Torino, Bologna ve Sapienza için:</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          <span class="pill">TOLC-I / TOLC-E / SAT</span>
          <span class="pill">IELTS / TOEFL</span>
          <span class="pill">DSU / ISEE Bursu</span>
          <span class="pill">Universitaly Son Tarihleri</span>
        </div>
      </div>
    </div>
  </section>`;
}

// ============================================================================
// Floating macOS Inspector Drawer / iOS Bottom Sheet
// ============================================================================
function openDrawer(code) {
  ui.drawerCode = code;
  const p = state.programs.find((item) => item.code === code);
  ui.drawerNetYear = p?.nets?.[0]?.year || null;
  renderDrawer();
  document.getElementById('drawerBackdrop').classList.add('open');
  const drawer = document.getElementById('detailDrawer');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  ui.drawerCode = null;
  document.getElementById('drawerBackdrop').classList.remove('open');
  const drawer = document.getElementById('detailDrawer');
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
}

function renderDrawer() {
  const container = document.getElementById('drawerContent');
  const p = state.programs.find((item) => item.code === ui.drawerCode);
  if (!container || !p) return;

  const activeNet = p.nets?.find((n) => n.year === ui.drawerNetYear) || p.nets?.[0] || null;
  const aytFields = getAytFieldsForScoreType(p.scoreType);
  const staff = p.academicStaff || {};
  const metaLine = [p.scoreType, p.language, p.scholarship, p.tuition ? formatCurrency(p.tuition) : null].filter(Boolean).join(' · ');

  const renderNetBars = (fields, valuesObj, fillColor = 'var(--accent)') =>
    fields
      .map((f) => {
        const val = valuesObj?.[f.key];
        const pct = val !== null && val !== undefined ? Math.min(100, Math.max(0, (val / f.max) * 100)) : 0;
        return `<div class="net-row">
          <div class="net-row-top">
            <span>${f.label}</span>
            <span class="tabular"><strong>${formatNet(val)}</strong> / ${f.max}</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${fillColor};"></div></div>
        </div>`;
      })
      .join('');

  container.innerHTML = `
    <div class="drawer-header">
      <div style="display:flex;gap:15px;align-items:center;min-width:0;flex:1;">
        <div style="transform:scale(1.12);transform-origin:left center;">${renderAvatar(p)}</div>
        <div style="min-width:0;">
          <div style="font-family:var(--font-display);font-size:21px;font-weight:700;letter-spacing:-0.03em;line-height:1.2;">${escapeHtml(p.department)}</div>
          <div style="font-size:14.5px;font-weight:500;color:var(--text-secondary);margin-top:2px;">${escapeHtml(p.university)} · <span style="color:var(--text-tertiary)">${escapeHtml(p.faculty)}</span></div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:7px;">
            <button class="pill mono" id="copyCodeBtn" title="Program kodunu kopyala" style="cursor:pointer;">${escapeHtml(p.code)} ${SF.copy}</button>
            <span style="font-size:12.5px;color:var(--text-secondary);font-weight:500;">${escapeHtml(p.city)}${p.district ? ` / ${escapeHtml(p.district)}` : ''} · ${escapeHtml(metaLine)}</span>
          </div>
        </div>
      </div>
      <div class="drawer-header-actions">
        <a class="btn btn-sm" href="${escapeHtml(p.yokAtlasUrl)}" target="_blank" rel="noopener">YÖK Atlas ${SF.external}</a>
        <button class="btn btn-sm" id="drawerRefreshBtn">${SF.refresh} Güncelle</button>
        <button class="btn btn-sm ${state.compareCodes.includes(p.code) ? 'btn-soft' : ''}" id="drawerCompareBtn">
          ${state.compareCodes.includes(p.code) ? `${SF.check} Kıyasla` : `${SF.plus} Kıyasla`}
        </button>
        <button class="btn btn-sm btn-danger" id="drawerDeleteBtn" title="Listeden çıkar">${SF.trash}</button>
        <button class="btn btn-ghost btn-icon btn-sm" id="closeDrawerBtn" aria-label="Kapat">${SF.close}</button>
      </div>
    </div>

    <div class="drawer-body">
      <!-- Top Summary Metrics Strip -->
      <section class="detail-hero-metrics tabular">
        <div class="detail-metric-tile">
          <span>${escapeHtml(p.latestYear || 2026)} Taban Sıralama</span>
          <strong>${formatRank(p.latestRank)}</strong>
        </div>
        <div class="detail-metric-tile">
          <span>${escapeHtml(p.latestYear || 2026)} Taban Puan</span>
          <strong>${formatScore(p.latestScore)}</strong>
        </div>
        <div class="detail-metric-tile">
          <span>Kontenjan / Yerleşen</span>
          <strong>${p.quota ?? '—'} <span style="font-size:15px;font-weight:500;color:var(--text-tertiary)">/ ${p.placed ?? '—'}</span></strong>
        </div>
        <div class="detail-metric-tile">
          <span>Yıllık Değişim</span>
          <div style="margin-top:4px;font-size:14px;">${renderTrendBadge(p)}</div>
        </div>
      </section>

      <!-- Spacious 2-Column Apple Bento Layout -->
      <div class="detail-two-col">
        <!-- Left Column: Charts, 4-Year Table & Net Averages -->
        <div class="detail-col">
          <section class="drawer-section">
            <div class="section-heading">
              <span>4 Yıllık Taban Trendi</span>
              <div class="segmented">
                <button class="seg-btn seg-btn-sm ${ui.drawerChartMode === 'rank' ? 'active' : ''}" data-chart-mode="rank">Sıralama</button>
                <button class="seg-btn seg-btn-sm ${ui.drawerChartMode === 'score' ? 'active' : ''}" data-chart-mode="score">Puan</button>
              </div>
            </div>
            ${renderDetailTrendChart(p.history, ui.drawerChartMode)}
            <table class="mini-table tabular">
              <thead>
                <tr><th>Yıl</th><th>Taban Sıralama</th><th>Taban Puan</th><th>Kontenjan</th><th>Yerleşen</th></tr>
              </thead>
              <tbody>
                ${[...(p.history || [])]
                  .reverse()
                  .map(
                    (h) => `<tr>
                      <td style="font-weight:600;">${h.year}</td>
                      <td style="font-weight:700;">${formatRank(h.rank)}</td>
                      <td>${formatScore(h.minScore)}</td>
                      <td>${h.quota ?? '—'}</td>
                      <td>${h.placed ?? '—'}</td>
                    </tr>`,
                  )
                  .join('')}
              </tbody>
            </table>
          </section>

          <section class="drawer-section">
            <div class="section-heading">
              <span>Son Yerleşen Ortalama Netleri</span>
              ${p.nets && p.nets.length > 1
                ? `<div class="segmented">
                    ${p.nets
                      .map(
                        (n) => `<button class="seg-btn seg-btn-sm ${activeNet?.year === n.year ? 'active' : ''}" data-net-year="${n.year}">${n.year}</button>`,
                      )
                      .join('')}
                  </div>`
                : activeNet
                  ? `<span>${activeNet.year}</span>`
                  : ''}
            </div>
            ${activeNet
              ? `<div style="font-size:12.5px;color:var(--text-secondary);padding:0 4px;">
                  Yerleşen Ortalama OBP: <strong class="tabular" style="color:var(--text)">${formatScore(activeNet.obp)}</strong>
                </div>
                <div class="nets-grid">
                  <div class="net-box">
                    <div class="net-box-head"><span>TYT</span><span class="tabular" style="color:var(--accent)">${formatNet(activeNet.tytTotal)} / 120</span></div>
                    ${renderNetBars(TYT_FIELDS, activeNet.tyt, 'var(--accent)')}
                  </div>
                  <div class="net-box">
                    ${p.scoreType === 'DİL'
                      ? `<div class="net-box-head"><span>YDT</span><span class="tabular" style="color:var(--green)">${formatNet(activeNet.ydt)} / 80</span></div>
                         <div class="net-row">
                           <div class="net-row-top"><span>YDT Neti</span><span class="tabular"><strong>${formatNet(activeNet.ydt)}</strong> / 80</span></div>
                           <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, ((activeNet.ydt || 0) / 80) * 100)}%;background:var(--green-bright)"></div></div>
                         </div>`
                      : `<div class="net-box-head"><span>AYT (${escapeHtml(p.scoreType)})</span><span class="tabular" style="color:var(--green)">${formatNet(activeNet.aytTotal)} / 80</span></div>
                         ${renderNetBars(aytFields, activeNet.ayt, 'var(--green-bright)')}`}
                  </div>
                </div>`
              : `<div class="chart-empty">Bu program için YÖK Atlas net ortalaması henüz yayınlanmamış.</div>`}
          </section>
        </div>

        <!-- Right Column: Personal Evaluation, Academic Staff & ÖSYM Conditions -->
        <div class="detail-col">
          <section class="drawer-section">
            <div class="section-heading"><span>Kişisel Değerlendirmen</span></div>
            <div class="sheet-card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
              <div class="segmented">
                ${['hayal', 'hedef', 'guvenli']
                  .map(
                    (rk) => `<button class="seg-btn seg-btn-sm ${p.risk === rk ? 'active' : ''}" data-set-risk="${rk}">${RISK_META[rk].label}</button>`,
                  )
                  .join('')}
              </div>
              <div class="rating-stars" aria-label="Yıldız puanı">
                ${[1, 2, 3, 4, 5]
                  .map(
                    (n) => `<button class="star-btn ${(p.rating || 0) >= n ? 'filled' : ''}" data-set-star="${n}" title="${n} yıldız">${(p.rating || 0) >= n ? SF.starFilled(18) : SF.starEmpty(18)}</button>`,
                  )
                  .join('')}
              </div>
            </div>

            <div class="pros-cons-grid">
              <div class="pc-box">
                <div style="font-size:12.5px;font-weight:650;color:var(--green);">Artılar</div>
                <ul class="pc-list">
                  ${(p.pros || [])
                    .map(
                      (item, idx) => `<li class="pc-item"><span>${escapeHtml(item)}</span><button class="btn-ghost" data-del-pro="${idx}" title="Sil">${SF.close}</button></li>`,
                    )
                    .join('')}
                </ul>
                <form class="pc-add-row" id="addProForm">
                  <input class="input" id="addProInput" placeholder="Artı ekle..." />
                  <button class="btn btn-sm btn-icon" type="submit">${SF.plus}</button>
                </form>
              </div>

              <div class="pc-box">
                <div style="font-size:12.5px;font-weight:650;color:var(--rose);">Eksiler</div>
                <ul class="pc-list">
                  ${(p.cons || [])
                    .map(
                      (item, idx) => `<li class="pc-item"><span>${escapeHtml(item)}</span><button class="btn-ghost" data-del-con="${idx}" title="Sil">${SF.close}</button></li>`,
                    )
                    .join('')}
                </ul>
                <form class="pc-add-row" id="addConForm">
                  <input class="input" id="addConInput" placeholder="Eksi ekle..." />
                  <button class="btn btn-sm btn-icon" type="submit">${SF.plus}</button>
                </form>
              </div>
            </div>

            <div class="sheet-card">
              <label class="field-label" for="drawerNotesInput">Kişisel Notlar</label>
              <textarea id="drawerNotesInput" class="textarea" rows="4" placeholder="Kampüs, yurt, ulaşım, Erasmus ve mezun yorumları...">${escapeHtml(p.notes || '')}</textarea>
            </div>
          </section>

          <section class="drawer-section">
            <div class="section-heading">
              <span>Akademik Kadro</span>
              ${p.accreditation ? `<span class="pill pill-accent">${escapeHtml(p.accreditation)}</span>` : ''}
            </div>
            <div class="staff-grid tabular">
              <div class="staff-tile"><strong>${staff.prof || 0}</strong><span>Prof. Dr.</span></div>
              <div class="staff-tile"><strong>${staff.doc || 0}</strong><span>Doç. Dr.</span></div>
              <div class="staff-tile"><strong>${staff.drOgr || 0}</strong><span>Dr. Öğr. Üyesi</span></div>
              <div class="staff-tile"><strong>${staff.arGor || 0}</strong><span>Ar. Gör.</span></div>
            </div>
            ${p.accreditationDesc ? `<div style="font-size:12px;color:var(--text-secondary);padding:0 4px;">Akreditasyon: ${escapeHtml(p.accreditationDesc)}</div>` : ''}
            ${p.minRankRequirement ? `<div style="font-size:12px;color:var(--amber);font-weight:500;padding:0 4px;">Baraj: ${escapeHtml(p.minRankRequirement)}</div>` : ''}
          </section>

          ${p.conditions && p.conditions.length
            ? `<section class="drawer-section">
                <details class="cond-details">
                  <summary>ÖSYM Özel Koşul ve Açıklamaları (${p.conditions.length} madde)</summary>
                  <div class="cond-list">
                    ${p.conditions
                      .map((c) => `<div class="cond-item"><strong class="mono">Bk. ${escapeHtml(c.code)}:</strong> ${escapeHtml(c.text)}</div>`)
                      .join('')}
                  </div>
                </details>
              </section>`
            : ''}

          <div style="font-size:11.5px;color:var(--text-tertiary);padding:0 4px;">
            Son YÖK Atlas güncellemesi · ${formatRelativeTime(p.fetchedAt)}
          </div>
        </div>
      </div>
    </div>
  `;

  bindDrawerEvents(p);
}

function bindDrawerEvents(p) {
  document.getElementById('closeDrawerBtn')?.addEventListener('click', closeDrawer);
  document.getElementById('copyCodeBtn')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(p.code);
    showToast(`Program kodu (${p.code}) kopyalandı.`, 'success');
  });
  document.getElementById('drawerRefreshBtn')?.addEventListener('click', () => refreshProgramLive(p.code));
  document.getElementById('drawerCompareBtn')?.addEventListener('click', () => {
    toggleCompare(p.code);
    renderDrawer();
  });
  document.getElementById('drawerDeleteBtn')?.addEventListener('click', () => removeProgram(p.code));

  document.querySelectorAll('[data-chart-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.drawerChartMode = btn.dataset.chartMode;
      renderDrawer();
    });
  });

  document.querySelectorAll('[data-net-year]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.drawerNetYear = Number(btn.dataset.netYear);
      renderDrawer();
    });
  });

  document.querySelectorAll('[data-set-risk]').forEach((btn) => {
    btn.addEventListener('click', () => {
      p.risk = btn.dataset.setRisk;
      saveState();
      renderAll();
      renderDrawer();
    });
  });

  document.querySelectorAll('[data-set-star]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = Number(btn.dataset.setStar);
      p.rating = p.rating === val ? 0 : val;
      saveState();
      renderAll();
      renderDrawer();
    });
  });

  document.getElementById('addProForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('addProInput');
    const val = input.value.trim();
    if (!val) return;
    p.pros = [...(p.pros || []), val];
    saveState();
    renderAll();
    renderDrawer();
  });

  document.getElementById('addConForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('addConInput');
    const val = input.value.trim();
    if (!val) return;
    p.cons = [...(p.cons || []), val];
    saveState();
    renderAll();
    renderDrawer();
  });

  document.querySelectorAll('[data-del-pro]').forEach((btn) => {
    btn.addEventListener('click', () => {
      p.pros.splice(Number(btn.dataset.delPro), 1);
      saveState();
      renderAll();
      renderDrawer();
    });
  });

  document.querySelectorAll('[data-del-con]').forEach((btn) => {
    btn.addEventListener('click', () => {
      p.cons.splice(Number(btn.dataset.delCon), 1);
      saveState();
      renderAll();
      renderDrawer();
    });
  });

  const notesEl = document.getElementById('drawerNotesInput');
  let noteTimer = null;
  notesEl?.addEventListener('input', () => {
    p.notes = notesEl.value;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      saveState();
      renderAll();
    }, 450);
  });
}

// ============================================================================
// macOS Spotlight Style Add Program Modal
// ============================================================================
function openAddModal(prefillCode = '') {
  const overlay = document.getElementById('addModalOverlay');
  const input = document.getElementById('programCodeInput');
  document.getElementById('addModalFeedback').innerHTML = '';
  document.getElementById('addModalPreview').innerHTML = '';
  if (input) {
    input.value = prefillCode;
    autoSizeSpotlightInput(input);
    setTimeout(() => input.focus(), 60);
  }
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  if (prefillCode) handleFetchPreview();
}

function closeAddModal() {
  const overlay = document.getElementById('addModalOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

function autoSizeSpotlightInput(el) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(92, Math.max(24, el.scrollHeight))}px`;
}

async function handleFetchPreview() {
  const input = document.getElementById('programCodeInput');
  const feedback = document.getElementById('addModalFeedback');
  const preview = document.getElementById('addModalPreview');
  const btn = document.getElementById('fetchProgramBtn');

  const codes = extractProgramCodes(input.value);
  if (!codes.length) {
    feedback.innerHTML = `<div class="error-banner">Geçerli bir 9 haneli YÖK Atlas program kodu veya sayfa linki bulunamadı (ör. 102210277).</div>`;
    preview.innerHTML = '';
    return;
  }

  btn.disabled = true;
  btn.textContent = codes.length > 1 ? `Çekiliyor (${codes.length})...` : 'Çekiliyor...';
  feedback.innerHTML = '';
  preview.innerHTML = '';

  const found = [];
  const errors = [];

  for (const code of codes.slice(0, 12)) {
    try {
      const prog = await fetchProgramFromApi(code);
      if (!prog.isLisans) {
        errors.push(`${code}: Önlisans programı (yine de ekleyebilirsin).`);
      }
      found.push(prog);
    } catch (err) {
      errors.push(`${code}: ${err.message}`);
    }
  }

  btn.disabled = false;
  btn.textContent = 'Getir';

  if (errors.length) {
    feedback.innerHTML = `<div class="error-banner">${errors.map(escapeHtml).join('<br/>')}</div>`;
  }
  if (!found.length) return;

  if (found.length === 1) {
    const p = found[0];
    const suggested = suggestRisk(p.latestRank, state.targetRank);
    const alreadyExists = state.programs.some((item) => item.code === p.code);
    const metaLine = [p.scoreType, p.city, p.language, p.scholarship, p.accreditation].filter(Boolean).join(' · ');

    preview.innerHTML = `<div class="preview-card">
      <div style="display:flex;gap:12px;align-items:center;">
        ${renderAvatar(p)}
        <div style="min-width:0;flex:1;">
          <div style="font-family:var(--font-display);font-size:15.5px;font-weight:650;">${escapeHtml(p.department)}</div>
          <div style="font-size:13px;color:var(--text-secondary);">${escapeHtml(p.university)}</div>
          <div style="font-size:12px;color:var(--text-tertiary);margin-top:2px;">${escapeHtml(metaLine)}</div>
        </div>
      </div>

      <div class="card-metrics">
        <div class="metric-group">
          <div class="metric-item"><span class="metric-label">${p.latestYear} Sıralama</span><span class="metric-val tabular">${formatRank(p.latestRank)}</span></div>
          <div class="metric-item"><span class="metric-label">Taban Puan</span><span class="metric-val-sub tabular">${formatScore(p.latestScore)}</span></div>
          <div class="metric-item"><span class="metric-label">Kontenjan</span><span class="metric-val-sub tabular">${p.quota ?? '—'}</span></div>
        </div>
        ${renderSparkline(p.history)}
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:12.5px;color:var(--text-secondary);font-weight:500;">Kategori</span>
          <select id="previewRiskSelect" class="select toolbar-select" style="height:31px;">
            <option value="hayal" ${suggested === 'hayal' ? 'selected' : ''}>Hayal</option>
            <option value="hedef" ${suggested === 'hedef' ? 'selected' : ''}>Hedef</option>
            <option value="guvenli" ${suggested === 'guvenli' ? 'selected' : ''}>Güvenli</option>
          </select>
        </div>
        <button class="btn btn-primary" id="confirmAddSingleBtn">
          ${alreadyExists ? 'Listede Güncelle' : `${SF.plus} Tercihlerime Ekle`}
        </button>
      </div>
    </div>`;

    document.getElementById('confirmAddSingleBtn')?.addEventListener('click', () => {
      const risk = document.getElementById('previewRiskSelect')?.value || suggested;
      addProgramToState(p, risk);
      closeAddModal();
      ui.region = 'TR';
      ui.tab = 'preferences';
      renderAll();
      showToast(`${p.department} tercihlerine eklendi.`, 'success');
    });
  } else {
    preview.innerHTML = `<div class="preview-card">
      <div style="font-family:var(--font-display);font-size:15px;font-weight:650;">${found.length} Program Bulundu</div>
      <div style="display:flex;flex-direction:column;gap:7px;max-height:220px;overflow-y:auto;">
        ${found
          .map(
            (p) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;background:var(--surface-secondary);border-radius:12px;font-size:13px;">
              <div><strong>${escapeHtml(p.department)}</strong><div style="color:var(--text-secondary);font-size:12px;">${escapeHtml(p.university)} · ${escapeHtml(p.city)}</div></div>
              <div class="tabular" style="font-weight:700;white-space:nowrap;">${formatRank(p.latestRank)}</div>
            </div>`,
          )
          .join('')}
      </div>
      <button class="btn btn-primary" id="confirmAddBatchBtn">${SF.plus} Tümünü Ekle (${found.length})</button>
    </div>`;

    document.getElementById('confirmAddBatchBtn')?.addEventListener('click', () => {
      for (const p of found) addProgramToState(p);
      closeAddModal();
      ui.region = 'TR';
      ui.tab = 'preferences';
      renderAll();
      showToast(`${found.length} program tercihlerine eklendi.`, 'success');
    });
  }
}

// ============================================================================
// Cloud Sync & Backup Modal
// ============================================================================
function openSyncModal() {
  const overlay = document.getElementById('syncModalOverlay');
  renderSyncModal();
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeSyncModal() {
  const overlay = document.getElementById('syncModalOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

function renderSyncModal() {
  const body = document.getElementById('syncModalBody');
  const currentKey = getSyncKey();
  const apiBase = getApiBase();

  body.innerHTML = `
    <div class="info-banner">
      Aynı <strong>Kişisel Anahtarı</strong> Mac, iPhone ve iPad'de girdiğinde tercih listen, sıralaman ve notların otomatik eşitlenir.
    </div>

    <div>
      <label class="field-label" for="syncKeyInput">Kişisel Senkronizasyon Anahtarın</label>
      <div style="display:flex;gap:8px;">
        <input id="syncKeyInput" class="input mono" type="text" value="${escapeHtml(currentKey)}" placeholder="Örn: atlas-hedef-9f4a21c8" />
        <button class="btn" type="button" id="genSyncKeyBtn">Üret</button>
      </div>
      <div class="field-hint">
        ${ui.lastSyncedAt ? `Son bulut eşitleme · ${formatRelativeTime(ui.lastSyncedAt)}` : 'En az 6 karakter. Anahtarın SHA-256 ile özetlenerek saklanır.'}
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" id="saveAndSyncBtn">Kaydet & Eşitle</button>
      <button class="btn" id="forcePushSyncBtn" ${!currentKey ? 'disabled' : ''}>Buluta Gönder</button>
      ${currentKey ? `<button class="btn btn-ghost" id="disconnectSyncBtn">Bağlantıyı Kes</button>` : ''}
    </div>

    <hr style="border:none;border-top:0.5px solid var(--separator);margin:2px 0;" />

    <div>
      <label class="field-label" for="apiBaseInput">Cloudflare API Adresi</label>
      <div style="display:flex;gap:8px;">
        <input id="apiBaseInput" class="input mono" type="url" value="${escapeHtml(apiBase)}"
          placeholder="${isLocalDev() ? 'Yerel sunucu aktif' : 'https://tercihatlas-api.yusuf-kriptobot.workers.dev'}" />
        <button class="btn" type="button" id="testApiBtn">Test Et</button>
      </div>
      <div id="apiTestResult" class="field-hint">
        ${isLocalDev() ? 'Yerel geliştirme sunucusu bağlı.' : hasConfiguredApi() ? 'Canlı Cloudflare Worker bağlı.' : 'API adresi girilmedi.'}
      </div>
    </div>

    <hr style="border:none;border-top:0.5px solid var(--separator);margin:2px 0;" />

    <div>
      <label class="field-label">Dışa Aktar & Yedekleme</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-sm" id="exportCsvBtn">Excel / CSV İndir</button>
        <button class="btn btn-sm" id="exportJsonBtn">JSON Yedek</button>
        <label class="btn btn-sm" style="cursor:pointer;">
          Yedek Yükle
          <input type="file" id="importJsonInput" accept="application/json" style="display:none;" />
        </label>
      </div>
    </div>
  `;

  document.getElementById('genSyncKeyBtn')?.addEventListener('click', () => {
    document.getElementById('syncKeyInput').value = generateSyncKey();
  });

  document.getElementById('saveAndSyncBtn')?.addEventListener('click', async () => {
    const rawKey = document.getElementById('syncKeyInput').value.trim();
    const rawApi = document.getElementById('apiBaseInput').value.trim();
    setCustomApiBase(rawApi);

    if (rawKey.length < 6) {
      showToast('Kişisel anahtar en az 6 karakter olmalıdır.', 'error');
      return;
    }
    localStorage.setItem(SYNC_KEY_STORAGE, rawKey);
    await syncPullOnStartup({ forceOverwrite: false, silent: false });
    renderSyncModal();
  });

  document.getElementById('forcePushSyncBtn')?.addEventListener('click', async () => {
    setCustomApiBase(document.getElementById('apiBaseInput').value.trim());
    await syncPushNow({ silent: false });
    renderSyncModal();
  });

  document.getElementById('disconnectSyncBtn')?.addEventListener('click', () => {
    localStorage.removeItem(SYNC_KEY_STORAGE);
    updateSyncIndicator('local', 'Yerel');
    showToast('Bulut bağlantısı kaldırıldı.');
    renderSyncModal();
  });

  document.getElementById('testApiBtn')?.addEventListener('click', async () => {
    setCustomApiBase(document.getElementById('apiBaseInput').value.trim());
    const out = document.getElementById('apiTestResult');
    out.textContent = 'Test ediliyor...';
    try {
      const h = await checkApiHealth();
      out.innerHTML = `<span style="color:var(--green);font-weight:500;">Bağlantı başarılı · ${escapeHtml(h.service || 'API')} (KV: ${h.kvConfigured ? 'Aktif' : 'Kapalı'})</span>`;
    } catch (err) {
      out.innerHTML = `<span style="color:var(--rose);font-weight:500;">${escapeHtml(err.message)}</span>`;
    }
  });

  document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    if (!state.programs.length) return showToast('Dışa aktarılacak program yok.', 'error');
    exportProgramsToCsv(state.programs);
    showToast('CSV indirildi.', 'success');
  });

  document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TercihAtlas_Yedek_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('JSON yedeği indirildi.', 'success');
  });

  document.getElementById('importJsonInput')?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.programs)) throw new Error('Geçersiz yedek dosyası.');
      state = { ...structuredClone(DEFAULT_STATE), ...parsed };
      saveState();
      renderAll();
      closeSyncModal();
      showToast(`${state.programs.length} program yedekten yüklendi.`, 'success');
    } catch (err) {
      showToast(err.message || 'Yedek okunamadı.', 'error');
    }
  });
}

// ============================================================================
// Event Bindings
// ============================================================================
function bindPreferencesEvents() {
  document.getElementById('heroSpotlightForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('heroCodeInput')?.value.trim();
    openAddModal(val || '');
  });

  document.getElementById('emptyAddBtn')?.addEventListener('click', () => openAddModal());
  document.getElementById('emptySyncBtn')?.addEventListener('click', openSyncModal);
  document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
    ui.search = '';
    ui.filterRisk = 'all';
    ui.filterScoreType = 'all';
    renderAll();
  });

  document.querySelectorAll('[data-quick-add]').forEach((btn) => {
    btn.addEventListener('click', () => openAddModal(btn.dataset.quickAdd));
  });

  const targetInput = document.getElementById('targetRankInput');
  targetInput?.addEventListener('change', () => {
    const v = Number(targetInput.value);
    state.targetRank = v > 0 ? v : null;
    saveState();
    showToast('Hedef sıralaman güncellendi.');
  });

  const searchInput = document.getElementById('searchInput');
  searchInput?.addEventListener('input', () => {
    ui.search = searchInput.value;
    const pos = searchInput.selectionStart;
    renderAll();
    const fresh = document.getElementById('searchInput');
    if (fresh) {
      fresh.focus();
      fresh.setSelectionRange(pos, pos);
    }
  });

  document.querySelectorAll('[data-filter-risk]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.filterRisk = btn.dataset.filterRisk;
      renderAll();
    });
  });

  document.querySelectorAll('[data-filter-st]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const st = btn.dataset.filterSt;
      ui.filterScoreType = ui.filterScoreType === st ? 'all' : st;
      renderAll();
    });
  });

  document.getElementById('sortSelect')?.addEventListener('change', (e) => {
    ui.sortBy = e.target.value;
    renderAll();
  });

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.viewMode = btn.dataset.view;
      localStorage.setItem('tercihatlas_view_mode', ui.viewMode);
      renderAll();
    });
  });

  const listEl = document.getElementById('programList');
  if (!listEl) return;

  listEl.querySelectorAll('[data-stop-card="1"]').forEach((el) => {
    el.addEventListener('click', (e) => e.stopPropagation());
  });

  listEl.querySelectorAll('[data-toggle-compare]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCompare(btn.dataset.toggleCompare);
    });
  });

  listEl.querySelectorAll('[data-move-up]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      moveProgramStep(btn.dataset.moveUp, -1);
    });
  });

  listEl.querySelectorAll('[data-move-down]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      moveProgramStep(btn.dataset.moveDown, 1);
    });
  });

  listEl.querySelectorAll('[data-code]').forEach((item) => {
    const code = item.dataset.code;
    item.addEventListener('click', () => openDrawer(code));

    item.addEventListener('dragstart', (e) => {
      ui.dragCode = code;
      item.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', code);
    });

    item.addEventListener('dragend', () => {
      ui.dragCode = null;
      listEl.querySelectorAll('.dragging, .drag-over').forEach((n) => n.classList.remove('dragging', 'drag-over'));
    });

    item.addEventListener('dragover', (e) => {
      if (!ui.dragCode || ui.dragCode === code) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      reorderPrograms(ui.dragCode || e.dataTransfer.getData('text/plain'), code);
    });
  });
}

function bindCompareEvents() {
  document.getElementById('cmpOpenAddBtn')?.addEventListener('click', () => openAddModal());
  document.getElementById('cmpClearBtn')?.addEventListener('click', () => {
    state.compareCodes = [];
    saveState();
    renderAll();
  });
  document.getElementById('cmpPickFirstTwoBtn')?.addEventListener('click', () => {
    state.compareCodes = state.programs.slice(0, 2).map((p) => p.code);
    saveState();
    renderAll();
  });
  document.getElementById('cmpAddSelect')?.addEventListener('change', (e) => {
    if (e.target.value) toggleCompare(e.target.value);
  });
  document.querySelectorAll('[data-cmp-remove]').forEach((btn) => {
    btn.addEventListener('click', () => toggleCompare(btn.dataset.cmpRemove));
  });
}

function bindAnalysisEvents() {
  document.getElementById('analysisAddBtn')?.addEventListener('click', () => openAddModal());
  document.querySelectorAll('[data-open-code]').forEach((btn) => {
    btn.addEventListener('click', () => openDrawer(btn.dataset.openCode));
  });
}

// ============================================================================
// Bootstrap
// ============================================================================
function init() {
  initTheme();

  document.getElementById('brandHome')?.addEventListener('click', (e) => {
    e.preventDefault();
    ui.region = 'TR';
    ui.tab = 'preferences';
    renderAll();
  });

  document.querySelectorAll('#desktopNav .nav-pill-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      if (target === 'abroad') {
        ui.region = 'ABROAD';
      } else {
        ui.region = 'TR';
        ui.tab = target;
      }
      renderAll();
    });
  });

  document.querySelectorAll('#mobileNav .mobile-nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.mobileTab;
      if (target === 'abroad') {
        ui.region = 'ABROAD';
      } else {
        ui.region = 'TR';
        ui.tab = target;
      }
      renderAll();
    });
  });

  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    applyTheme(cur === 'dark' ? 'light' : 'dark');
  });

  document.getElementById('openAddBtn')?.addEventListener('click', () => openAddModal());
  document.getElementById('closeAddModalBtn')?.addEventListener('click', closeAddModal);
  document.getElementById('addModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'addModalOverlay') closeAddModal();
  });
  document.getElementById('fetchProgramBtn')?.addEventListener('click', handleFetchPreview);

  document.querySelectorAll('[data-sample-code]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById('programCodeInput');
      inp.value = btn.dataset.sampleCode;
      autoSizeSpotlightInput(inp);
      handleFetchPreview();
    });
  });

  const spotlightInput = document.getElementById('programCodeInput');
  spotlightInput?.addEventListener('input', () => autoSizeSpotlightInput(spotlightInput));
  spotlightInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleFetchPreview();
    }
  });

  document.getElementById('openSyncBtn')?.addEventListener('click', openSyncModal);
  document.getElementById('closeSyncModalBtn')?.addEventListener('click', closeSyncModal);
  document.getElementById('syncModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'syncModalOverlay') closeSyncModal();
  });

  document.getElementById('drawerBackdrop')?.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openAddModal();
    } else if (e.key === 'Escape') {
      closeDrawer();
      closeAddModal();
      closeSyncModal();
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  renderAll();
  syncPullOnStartup({ silent: true });
}

init();
