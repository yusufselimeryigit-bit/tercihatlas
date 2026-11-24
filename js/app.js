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
const THEME_STORAGE = 'tercihatlas_theme';

const DEFAULT_STATE = {
  version: 1,
  targetRank: 15000,
  updatedAt: null,
  programs: [], // Array of normalized YÖK Atlas programs + user fields (risk, rating, pros, cons, notes)
  compareCodes: [],
};

// Runtime UI state (not persisted to cloud)
const ui = {
  region: 'TR', // 'TR' | 'ABROAD'
  tab: 'preferences', // 'preferences' | 'compare' | 'analysis'
  viewMode: localStorage.getItem('tercihatlas_view_mode') || 'cards', // 'cards' | 'table'
  search: '',
  filterRisk: 'all',
  filterScoreType: 'all',
  filterUniType: 'all',
  sortBy: 'manual',
  drawerCode: null,
  drawerChartMode: 'rank',
  drawerNetYear: null,
  previewPrograms: [],
  syncStatus: 'local', // 'local' | 'syncing' | 'synced' | 'error'
  syncMessage: 'Yerel Mod',
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
  updateSyncIndicator('syncing', 'Eşitleniyor...');
  syncTimer = setTimeout(() => {
    syncPushNow({ silent: true });
  }, 1100);
}

async function syncPushNow({ silent = false } = {}) {
  const key = getSyncKey();
  if (!key || !hasConfiguredApi()) {
    updateSyncIndicator('local', 'Yerel Mod');
    return false;
  }
  try {
    updateSyncIndicator('syncing', 'Eşitleniyor...');
    const res = await pushCloudSync(key, state);
    ui.lastSyncedAt = res.syncedAt || new Date().toISOString();
    updateSyncIndicator('synced', 'Bulutta Güncel');
    if (!silent) showToast('Bulut senkronizasyonu tamamlandı.');
    return true;
  } catch (err) {
    updateSyncIndicator('error', 'Sync Hatası');
    if (!silent) showToast(err.message || 'Buluta kaydedilemedi.', 'error');
    return false;
  }
}

async function syncPullOnStartup({ forceOverwrite = false, silent = true } = {}) {
  const key = getSyncKey();
  if (!key || !hasConfiguredApi()) {
    updateSyncIndicator('local', 'Yerel Mod');
    return;
  }
  try {
    updateSyncIndicator('syncing', 'Bağlanıyor...');
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
      if (!silent) showToast('Buluttaki listen başarıyla eşitlendi.');
    } else {
      // First time for this key — push local state if any
      await pushCloudSync(key, state);
      ui.lastSyncedAt = new Date().toISOString();
      updateSyncIndicator('synced', 'Bulutta Güncel');
      if (!silent) showToast('Yeni bulut kasası oluşturuldu ve eşitlendi.');
    }
  } catch (err) {
    updateSyncIndicator('error', 'Çevrimdışı');
    if (!silent) showToast(err.message || 'Bulut bağlantısı kurulamadı.', 'error');
  }
}

// ============================================================================
// Theme & Toast
// ============================================================================
function initTheme() {
  const saved = localStorage.getItem(THEME_STORAGE);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'dark'));
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_STORAGE, theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#090A0D' : '#F5F5F7');
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.innerHTML =
      theme === 'dark'
        ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  const dotColor = type === 'error' ? 'var(--rose)' : type === 'success' ? 'var(--green)' : 'var(--accent-bright)';
  el.innerHTML = `<span class="dot" style="background:${dotColor}"></span><span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms ease';
    setTimeout(() => el.remove(), 210);
  }, 3200);
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
    return `<span class="trend-up tabular" title="Önceki yıla göre daha üst sıradan kapattı (rekabet arttı)">▲ ${formatRank(program.rankTrendDelta)} sıra yükseldi</span>`;
  }
  if (program.rankTrendDelta < 0) {
    return `<span class="trend-down tabular" title="Önceki yıla göre daha alt sıradan kapattı">▼ ${formatRank(Math.abs(program.rankTrendDelta))} sıra geriledi</span>`;
  }
  return `<span class="trend-flat">Sabit</span>`;
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

  if (ui.filterRisk !== 'all') {
    list = list.filter((p) => p.risk === ui.filterRisk);
  }
  if (ui.filterScoreType !== 'all') {
    list = list.filter((p) => p.scoreType === ui.filterScoreType);
  }
  if (ui.filterUniType !== 'all') {
    list = list.filter((p) => String(p.universityType || '').toUpperCase() === ui.filterUniType);
  }

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
    // Refresh YÖK Atlas fields while preserving personal user fields
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
    showToast(`${code} için güncel YÖK Atlas verisi çekiliyor...`);
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
// Rendering: Main Shell & Tabs
// ============================================================================
function updateHeaderBadges() {
  const prefBadge = document.getElementById('prefCountBadge');
  const cmpBadge = document.getElementById('compareCountBadge');
  if (prefBadge) prefBadge.textContent = String(state.programs.length);
  if (cmpBadge) cmpBadge.textContent = String(state.compareCodes.length);

  document.querySelectorAll('.country-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.region === ui.region);
  });

  document.querySelectorAll('#desktopNav .nav-tab').forEach((btn) => {
    btn.classList.toggle('active', ui.region === 'TR' && btn.dataset.tab === ui.tab);
  });

  document.querySelectorAll('#mobileNav .mobile-nav-btn').forEach((btn) => {
    const mtab = btn.dataset.mobileTab;
    const isActive = ui.region === 'ABROAD' ? mtab === 'abroad' : mtab === ui.tab;
    btn.classList.toggle('active', isActive);
  });
}

function renderAll() {
  updateHeaderBadges();
  const root = document.getElementById('mainRoot');
  if (!root) return;

  if (ui.region === 'ABROAD') {
    root.innerHTML = renderAbroadPhase2();
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

  const validRanks = state.programs.map((p) => p.latestRank).filter((r) => r && r > 0);
  const bestRank = validRanks.length ? Math.min(...validRanks) : null;
  const worstRank = validRanks.length ? Math.max(...validRanks) : null;

  return `<section class="kpi-strip" aria-label="Tercih özeti">
    <div class="kpi-card">
      <div class="kpi-label"><span>Tercih Listesi</span><span class="mono">ÖSYM 24</span></div>
      <div class="kpi-value tabular">${total} <span style="font-size:13px;font-weight:500;color:var(--text-muted)">/ 24</span></div>
      <div class="kpi-sub">${total === 0 ? 'İlk program kodunu ekle' : `${Math.max(0, 24 - total)} boş tercih hakkı kaldı`}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label"><span>Risk Dağılımı</span></div>
      <div class="risk-dots-row tabular">
        <span class="risk-dot-item" title="Hayal"><span class="dot" style="background:var(--rose)"></span>${hayal} Hayal</span>
        <span class="risk-dot-item" title="Hedef"><span class="dot" style="background:var(--accent-bright)"></span>${hedef} Hedef</span>
        <span class="risk-dot-item" title="Güvenli"><span class="dot" style="background:var(--green)"></span>${guvenli} Güvenli</span>
      </div>
      <div class="kpi-sub">${total ? 'Dengeli liste için 3 bandı da kullan' : 'Otomatik risk önerisi aktif'}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label"><span>Sıralama Bandı</span><span class="mono">Son Yıl</span></div>
      <div class="kpi-value tabular" style="font-size:18px;">
        ${bestRank ? `${formatRank(bestRank)} – ${formatRank(worstRank)}` : '—'}
      </div>
      <div class="kpi-sub">${validRanks.length ? `${validRanks.length} bölümün taban sıralaması` : 'Program eklendiğinde hesaplanır'}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label"><span>YKS 2027 Hedef Sıralaman</span></div>
      <div class="target-rank-inline">
        <input id="targetRankInput" class="target-rank-input tabular" type="number" min="1" max="3000000" step="500"
          value="${state.targetRank || ''}" placeholder="Örn. 15000" aria-label="Hedef sıralama" />
      </div>
      <div class="kpi-sub">Yeni eklenen bölümler buna göre etiketlenir</div>
    </div>
  </section>`;
}

function renderPreferencesView() {
  const scoreTypes = [...new Set(state.programs.map((p) => p.scoreType).filter(Boolean))];
  const filtered = getFilteredPrograms();

  const kpiHtml = renderKpiStrip();

  if (state.programs.length === 0) {
    return `${kpiHtml}
    <section class="empty-state">
      <div class="empty-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
          <circle cx="12" cy="12" r="9"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>
        </svg>
      </div>
      <h2>YKS 2027 Tercih Listen Hazır</h2>
      <p>YÖK Atlas'tan ilgilendiğin bölümün 9 haneli <strong>program kodunu</strong> veya <strong>sayfa linkini</strong> yapıştır; 4 yıllık sıralama, puan, kontenjan ve yerleşen netleri otomatik gelsin.</p>
      <div class="empty-actions">
        <button class="btn btn-primary" id="emptyAddBtn">+ İlk Programı Ekle</button>
        <button class="btn" id="emptySyncBtn">Bulut Anahtarı Bağla</button>
      </div>
      <div class="quick-codes">
        Hemen canlı YÖK Atlas testi için tek tıkla dene:
        <div class="quick-code-chips">
          <button class="quick-chip" data-quick-add="102210277">Boğaziçi Bilgisayar (102210277)</button>
          <button class="quick-chip" data-quick-add="108410336">ODTÜ Bilgisayar (108410336)</button>
          <button class="quick-chip" data-quick-add="203910399">Koç EEM Burslu (203910399)</button>
          <button class="quick-chip" data-quick-add="203910275">Koç Ekonomi EA (203910275)</button>
        </div>
      </div>
    </section>`;
  }

  const toolbarHtml = `<section class="toolbar">
    <div class="toolbar-left">
      <div class="search-box">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input id="searchInput" class="input" type="search" value="${escapeHtml(ui.search)}" placeholder="Üniversite, bölüm, şehir, kod ara..." />
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
        <option value="manual" ${ui.sortBy === 'manual' ? 'selected' : ''}>Tercih Sıram (Sürükle-Bırak)</option>
        <option value="rank-asc" ${ui.sortBy === 'rank-asc' ? 'selected' : ''}>Sıralama (En Yüksek)</option>
        <option value="rank-desc" ${ui.sortBy === 'rank-desc' ? 'selected' : ''}>Sıralama (En Düşük)</option>
        <option value="rating-desc" ${ui.sortBy === 'rating-desc' ? 'selected' : ''}>Yıldız Puanım</option>
        <option value="trend-up" ${ui.sortBy === 'trend-up' ? 'selected' : ''}>En Çok Yükselenler</option>
      </select>

      <div class="view-toggle" role="group" aria-label="Görünüm seçimi">
        <button class="view-btn ${ui.viewMode === 'cards' ? 'active' : ''}" data-view="cards" title="Kart Görünümü">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          <span>Kart</span>
        </button>
        <button class="view-btn ${ui.viewMode === 'table' ? 'active' : ''}" data-view="table" title="Kompakt Tablo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
          <span>Tablo</span>
        </button>
      </div>
    </div>
  </section>`;

  if (!filtered.length) {
    return `${kpiHtml}${toolbarHtml}<div class="empty-state" style="padding:36px 20px;">
      <h2>Filtreye uygun program yok</h2>
      <p>Arama kelimesini veya seçili filtreleri temizleyerek tüm tercihlerini görebilirsin.</p>
      <button class="btn" id="clearFiltersBtn">Filtreleri Temizle</button>
    </div>`;
  }

  const contentHtml = ui.viewMode === 'table' ? renderTableView(filtered) : renderCardsView(filtered);
  return `${kpiHtml}${toolbarHtml}${contentHtml}`;
}

function renderCardsView(programs) {
  const manualMode = ui.sortBy === 'manual' && !ui.search && ui.filterRisk === 'all' && ui.filterScoreType === 'all';
  return `<section class="cards-grid" id="programList">
    ${programs
      .map((p) => {
        const net0 = p.nets?.[0];
        const isCompared = state.compareCodes.includes(p.code);
        const riskMeta = RISK_META[p.risk] || RISK_META.hedef;
        const stars = p.rating ? '★'.repeat(p.rating) + '☆'.repeat(5 - p.rating) : '';
        const netSummary = net0
          ? `TYT ${formatNet(net0.tytTotal)} · ${p.scoreType === 'DİL' ? `YDT ${formatNet(net0.ydt)}` : `AYT ${formatNet(net0.aytTotal)}`} net`
          : 'Net verisi yok';

        return `<article class="prog-card" data-code="${escapeHtml(p.code)}" draggable="${manualMode ? 'true' : 'false'}">
          <div class="card-top">
            <div class="card-left-head">
              <div class="order-col">
                <span class="order-num">#${String(p._order).padStart(2, '0')}</span>
                ${manualMode
                  ? `<span class="drag-handle" title="Sürükleyerek sırala" aria-label="Sürükle">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>
                    </span>`
                  : ''}
              </div>
              ${renderAvatar(p)}
              <div class="card-titles">
                <div class="card-dept">${escapeHtml(p.department)}</div>
                <div class="card-uni">${escapeHtml(p.university)}</div>
                <div class="card-faculty">${escapeHtml(p.faculty)}</div>
              </div>
            </div>
            <div class="card-right-head">
              <span class="badge badge-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(riskMeta.label)}</span>
            </div>
          </div>

          <div class="badges-row">
            <span class="badge badge-score">${escapeHtml(p.scoreType)}</span>
            <span class="badge">${escapeHtml(p.city)}</span>
            <span class="badge">${escapeHtml(p.language)}</span>
            <span class="badge">${escapeHtml(p.scholarship)}</span>
            ${p.accreditation ? `<span class="badge badge-accent">${escapeHtml(p.accreditation)}</span>` : ''}
          </div>

          <div class="card-metrics">
            <div class="metric-item">
              <span class="metric-label">${escapeHtml(p.latestYear || 2026)} Sıralama</span>
              <span class="metric-val tabular">${formatRank(p.latestRank)}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Taban Puan</span>
              <span class="metric-val tabular">${formatScore(p.latestScore)}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Kontenjan</span>
              <span class="metric-val tabular">${p.quota ?? '—'}${p.placed !== null && p.placed !== undefined ? ` <span style="font-size:11.5px;font-weight:500;color:var(--text-muted)">(${p.placed})</span>` : ''}</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
              ${renderSparkline(p.history)}
              ${renderTrendBadge(p)}
            </div>
          </div>

          <div class="card-footer">
            <div class="card-footer-left">
              <span class="tabular">${escapeHtml(netSummary)}</span>
              ${stars ? `<span class="stars-inline" title="Kişisel puanın">${stars}</span>` : ''}
              ${p.notes ? `<span title="Kişisel not var">📝 Not</span>` : ''}
            </div>
            <div class="card-footer-actions" data-stop-card="1">
              ${manualMode
                ? `<button class="mini-action" data-move-up="${escapeHtml(p.code)}" title="Yukarı taşı">↑</button>
                   <button class="mini-action" data-move-down="${escapeHtml(p.code)}" title="Aşağı taşı">↓</button>`
                : ''}
              <button class="mini-action ${isCompared ? 'active' : ''}" data-toggle-compare="${escapeHtml(p.code)}" title="Karşılaştırmaya ekle/çıkar">
                ${isCompared ? '✓ Kıyasla' : '+ Kıyasla'}
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
          <th>Şehir / Dil</th>
          <th>Kategori</th>
          <th>Sıralama</th>
          <th>Taban Puan</th>
          <th>4 Yıl Trend</th>
          <th>Kontenjan</th>
          <th>Ort. Net</th>
          <th style="width:110px;">İşlem</th>
        </tr>
      </thead>
      <tbody id="programList">
        ${programs
          .map((p) => {
            const net0 = p.nets?.[0];
            const isCompared = state.compareCodes.includes(p.code);
            const riskMeta = RISK_META[p.risk] || RISK_META.hedef;
            return `<tr data-code="${escapeHtml(p.code)}" draggable="${manualMode ? 'true' : 'false'}">
              <td class="mono" style="color:var(--text-muted);font-weight:700;">#${String(p._order).padStart(2, '0')}</td>
              <td>
                <div class="td-uni-cell">
                  ${renderAvatar(p)}
                  <div style="min-width:0;">
                    <div style="font-weight:600;color:var(--text);">${escapeHtml(p.department)}</div>
                    <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(p.university)} · <span class="mono">${escapeHtml(p.code)}</span></div>
                  </div>
                </div>
              </td>
              <td>
                <div>${escapeHtml(p.city)}</div>
                <div style="font-size:11.5px;color:var(--text-muted);">${escapeHtml(p.language)} · ${escapeHtml(p.scholarship)}</div>
              </td>
              <td>
                <span class="badge badge-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(riskMeta.label)}</span>
                <span class="badge badge-score" style="margin-left:3px;">${escapeHtml(p.scoreType)}</span>
              </td>
              <td class="tabular" style="font-weight:650;">${formatRank(p.latestRank)}</td>
              <td class="tabular">${formatScore(p.latestScore)}</td>
              <td>
                <div style="display:flex;align-items:center;gap:8px;">
                  ${renderSparkline(p.history, { width: 72, height: 24 })}
                </div>
              </td>
              <td class="tabular">${p.quota ?? '—'}</td>
              <td class="tabular" style="font-size:12px;color:var(--text-secondary);">
                ${net0 ? `TYT ${formatNet(net0.tytTotal)}<br/>${p.scoreType === 'DİL' ? `YDT ${formatNet(net0.ydt)}` : `AYT ${formatNet(net0.aytTotal)}`}` : '—'}
              </td>
              <td data-stop-card="1">
                <div style="display:flex;gap:4px;">
                  <button class="mini-action ${isCompared ? 'active' : ''}" data-toggle-compare="${escapeHtml(p.code)}">${isCompared ? '✓' : '+'} Kıyas</button>
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
  const selected = state.compareCodes
    .map((code) => state.programs.find((p) => p.code === code))
    .filter(Boolean);

  const available = state.programs.filter((p) => !state.compareCodes.includes(p.code));

  if (state.programs.length < 2) {
    return `<div class="empty-state">
      <h2>Karşılaştırmak için en az 2 program ekle</h2>
      <p>Tercih listene en az iki bölüm ekledikten sonra sıralama, 4 yıllık trend, net ortalamaları ve kişisel notlarını yan yana kıyaslayabilirsin.</p>
      <button class="btn btn-primary" id="cmpOpenAddBtn">+ Program Ekle</button>
    </div>`;
  }

  const selectorBar = `<div class="compare-header">
    <div>
      <h2 style="margin:0;font-size:17px;font-weight:650;letter-spacing:-0.02em;">Yan Yana Karşılaştırma</h2>
      <div style="font-size:12.5px;color:var(--text-secondary);margin-top:2px;">En fazla 4 bölümü tüm YÖK Atlas verileri ve kendi notlarınla kıyasla.</div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      ${available.length && selected.length < 4
        ? `<select id="cmpAddSelect" class="select toolbar-select" style="max-width:280px;">
            <option value="">+ Listeden bölüm ekle...</option>
            ${available.map((p) => `<option value="${escapeHtml(p.code)}">${escapeHtml(p.university)} — ${escapeHtml(p.department)}</option>`).join('')}
          </select>`
        : ''}
      ${selected.length ? `<button class="btn btn-sm" id="cmpClearBtn">Seçimi Temizle</button>` : ''}
    </div>
  </div>`;

  if (!selected.length) {
    return `${selectorBar}<div class="empty-state" style="padding:36px 20px;">
      <h2>Henüz karşılaştırma seçimi yapmadın</h2>
      <p>Yukarıdaki listeden bölüm seçebilir veya Tercihlerim sekmesindeki kartlarda <strong>+ Kıyasla</strong> butonuna basabilirsin.</p>
      <button class="btn btn-primary" id="cmpPickFirstTwoBtn">İlk 2 Tercihi Hemen Kıyasla</button>
    </div>`;
  }

  const bestRank = Math.min(...selected.map((p) => p.latestRank || 9e9));
  const bestScore = Math.max(...selected.map((p) => p.latestScore || 0));

  const rows = [
    {
      label: 'Şehir & Dil',
      render: (p) => `${escapeHtml(p.city)} · ${escapeHtml(p.language)}`,
    },
    {
      label: 'Tür & Burs',
      render: (p) => `${escapeHtml(p.universityType)} · ${escapeHtml(p.scholarship)}${p.tuition ? `<br/><span class="tabular" style="font-size:12px;color:var(--text-muted)">${formatCurrency(p.tuition)}</span>` : ''}`,
    },
    {
      label: 'Kategori & Puan Türü',
      render: (p) => `<span class="badge badge-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(RISK_META[p.risk]?.label || 'Hedef')}</span> <span class="badge badge-score">${escapeHtml(p.scoreType)}</span>`,
    },
    {
      label: 'Son Taban Sıralama',
      render: (p) => `<span class="tabular ${p.latestRank === bestRank ? 'compare-best' : ''}" style="font-size:15px;font-weight:650;">${formatRank(p.latestRank)}</span>`,
    },
    {
      label: 'Son Taban Puan',
      render: (p) => `<span class="tabular ${p.latestScore === bestScore ? 'compare-best' : ''}">${formatScore(p.latestScore)}</span>`,
    },
    {
      label: '4 Yıllık Trend',
      render: (p) => `<div style="display:flex;flex-direction:column;gap:4px;">${renderSparkline(p.history, { width: 120, height: 32 })}${renderTrendBadge(p)}</div>`,
    },
    {
      label: 'Kontenjan / Yerleşen',
      render: (p) => `<span class="tabular">${p.quota ?? '—'} / ${p.placed ?? '—'}</span>`,
    },
    {
      label: 'Ort. TYT / AYT Net',
      render: (p) => {
        const n = p.nets?.[0];
        if (!n) return '—';
        const second = p.scoreType === 'DİL' ? `YDT: <strong>${formatNet(n.ydt)}</strong>` : `AYT: <strong>${formatNet(n.aytTotal)}</strong>`;
        return `<div class="tabular">TYT: <strong>${formatNet(n.tytTotal)}</strong><br/>${second}<br/><span style="font-size:11.5px;color:var(--text-muted)">OBP: ${formatScore(n.obp)} (${n.year})</span></div>`;
      },
    },
    {
      label: 'Akademik Kadro',
      render: (p) => {
        const s = p.academicStaff || {};
        const tot = (s.prof || 0) + (s.doc || 0) + (s.drOgr || 0) + (s.arGor || 0);
        return `<div class="tabular"><strong>${tot}</strong> toplam<br/><span style="font-size:11.5px;color:var(--text-muted)">${s.prof || 0} Prof · ${s.doc || 0} Doç · ${s.drOgr || 0} Dr.</span></div>`;
      },
    },
    {
      label: 'Akreditasyon',
      render: (p) => (p.accreditation ? `<span class="badge badge-accent">${escapeHtml(p.accreditation)}</span>` : '<span style="color:var(--text-muted)">—</span>'),
    },
    {
      label: 'Yıldız & Artı / Eksi',
      render: (p) => {
        const stars = p.rating ? `<span class="stars-inline">${'★'.repeat(p.rating)}${'☆'.repeat(5 - p.rating)}</span>` : '<span style="color:var(--text-muted)">Puanlanmadı</span>';
        const pros = (p.pros || []).map((x) => `<div style="color:var(--green);font-size:12px;">+ ${escapeHtml(x)}</div>`).join('');
        const cons = (p.cons || []).map((x) => `<div style="color:var(--rose);font-size:12px;">− ${escapeHtml(x)}</div>`).join('');
        return `${stars}<div style="margin-top:6px;">${pros}${cons}</div>`;
      },
    },
  ];

  return `${selectorBar}
  <div class="compare-grid-wrap">
    <table class="compare-table">
      <thead>
        <tr>
          <th class="compare-row-label">Kriter</th>
          ${selected
            .map(
              (p) => `<th>
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                  <div style="display:flex;gap:10px;align-items:center;min-width:0;">
                    ${renderAvatar(p)}
                    <div style="min-width:0;">
                      <div style="font-size:13.5px;font-weight:650;color:var(--text);">${escapeHtml(p.department)}</div>
                      <div style="font-size:12px;color:var(--text-secondary);font-weight:500;">${escapeHtml(p.university)}</div>
                    </div>
                  </div>
                  <button class="btn btn-ghost btn-icon btn-sm" data-cmp-remove="${escapeHtml(p.code)}" title="Kıyaslamadan çıkar">✕</button>
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
  if (!state.programs.length) {
    return `<div class="empty-state">
      <h2>Analiz için önce program ekle</h2>
      <p>Tercih listendeki bölümlerin sıralama haritası, şehir dağılımı ve risk dengesi burada otomatik oluşur.</p>
      <button class="btn btn-primary" id="analysisAddBtn">+ Program Ekle</button>
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
    color: RISK_META[rk].color,
    count: state.programs.filter((p) => p.risk === rk).length,
  }));

  const renderDist = (entries, color = 'var(--accent)') =>
    `<div class="dist-bar-list">
      ${entries
        .map(
          ([label, count]) => `<div class="dist-row">
            <div class="dist-row-head"><span>${escapeHtml(label)}</span><span class="tabular" style="color:var(--text-secondary)">${count} (${Math.round((count / total) * 100)}%)</span></div>
            <div class="bar-track"><div class="bar-fill" style="width:${(count / total) * 100}%;background:${color};"></div></div>
          </div>`,
        )
        .join('')}
    </div>`;

  return `<section class="analysis-grid">
    <div class="panel panel-full">
      <h3 class="panel-title">
        <span>Tercih Sıralama Haritası (Logaritmik Ölçek)</span>
        <span style="font-size:12px;font-weight:500;color:var(--text-muted)">Noktalara tıklayarak detayı açabilirsin</span>
      </h3>
      ${renderRankSpectrum(state.programs, state.targetRank)}
    </div>

    <div class="panel">
      <h3 class="panel-title">Risk Dengesi (Hayal / Hedef / Güvenli)</h3>
      <div class="dist-bar-list">
        ${risks
          .map(
            (r) => `<div class="dist-row">
              <div class="dist-row-head"><span>${r.label}</span><span class="tabular" style="color:var(--text-secondary)">${r.count} (${Math.round((r.count / total) * 100)}%)</span></div>
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
      ${renderDist(uniTypes, 'var(--green)')}
    </div>

    <div class="panel">
      <h3 class="panel-title">Eğitim Dili</h3>
      ${renderDist(languages, 'var(--accent-bright)')}
    </div>
  </section>`;
}

// ============================================================================
// Foreign Universities Phase 2 View (DE / IT Extensible Architecture)
// ============================================================================
function renderAbroadPhase2() {
  return `<section>
    <div class="panel">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div>
          <span class="badge badge-accent" style="margin-bottom:8px;">Faz 2 — Yurt Dışı Altyapısı Hazır</span>
          <h2 style="margin:0;font-size:19px;font-weight:650;letter-spacing:-0.02em;">Almanya & İtalya Üniversite Takibi</h2>
          <p style="margin:6px 0 0;color:var(--text-secondary);max-width:640px;">
            TercihAtlas veri modeli en baştan ülke bazlı (<code>country: "TR" | "DE" | "IT"</code>) tasarlandı. Türkiye (YKS 2027) tarafını oturttuktan sonra buraya doğrudan Almanya ve İtalya başvurularını ekleyeceğiz.
          </p>
        </div>
        <button class="btn btn-primary" id="backToTrBtn">← TR · YKS 2027 Listeme Dön</button>
      </div>
    </div>

    <div class="abroad-grid">
      <div class="abroad-card">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h3>🇩🇪 Almanya (Studienkolleg / Lisans)</h3>
          <span class="badge">Planlandı</span>
        </div>
        <p>TUM, RWTH Aachen, KIT, TU Berlin gibi üniversiteler için özel alanlar:</p>
        <div class="badges-row">
          <span class="badge">NC / YKS Yerleşme Şartı</span>
          <span class="badge">TestDaF / Goethe C1 / IELTS</span>
          <span class="badge">Uni-Assist Son Tarihi</span>
          <span class="badge">Dönem Harcı & Bloke Hesap</span>
        </div>
      </div>

      <div class="abroad-card">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <h3>🇮🇹 İtalya (Lisans / İngilizce Programlar)</h3>
          <span class="badge">Planlandı</span>
        </div>
        <p>Politecnico di Milano, Politecnico di Torino, Sapienza, Bologna için özel alanlar:</p>
        <div class="badges-row">
          <span class="badge">TOLC-I / TOLC-E / SAT</span>
          <span class="badge">IELTS / TOEFL Skoru</span>
          <span class="badge">DSU / ISEE Burs Takibi</span>
          <span class="badge">Universitaly Başvuru Takvimi</span>
        </div>
      </div>
    </div>
  </section>`;
}

// ============================================================================
// Slide-Over Detail Drawer
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

  const renderNetBars = (fields, valuesObj) =>
    fields
      .map((f) => {
        const val = valuesObj?.[f.key];
        const pct = val !== null && val !== undefined ? Math.min(100, Math.max(0, (val / f.max) * 100)) : 0;
        return `<div class="net-row">
          <div class="net-row-top">
            <span>${f.label}</span>
            <span class="tabular"><strong>${formatNet(val)}</strong> / ${f.max}</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%"></div></div>
        </div>`;
      })
      .join('');

  container.innerHTML = `
    <div class="drawer-header">
      <div style="display:flex;gap:12px;align-items:flex-start;min-width:0;flex:1;">
        ${renderAvatar(p)}
        <div style="min-width:0;">
          <div style="font-size:15.5px;font-weight:650;letter-spacing:-0.02em;line-height:1.3;">${escapeHtml(p.department)}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">${escapeHtml(p.university)}</div>
          <div style="font-size:12px;color:var(--text-muted);">${escapeHtml(p.faculty)} · ${escapeHtml(p.city)}${p.district ? ` / ${escapeHtml(p.district)}` : ''}</div>
          <div class="badges-row" style="margin-top:8px;">
            <button class="badge mono" id="copyCodeBtn" title="Program kodunu kopyala">Kod: ${escapeHtml(p.code)} ⧉</button>
            <span class="badge badge-score">${escapeHtml(p.scoreType)}</span>
            <span class="badge">${escapeHtml(p.language)}</span>
            <span class="badge">${escapeHtml(p.scholarship)}</span>
            ${p.tuition ? `<span class="badge tabular">${formatCurrency(p.tuition)}</span>` : ''}
          </div>
        </div>
      </div>
      <button class="btn btn-ghost btn-icon btn-sm" id="closeDrawerBtn" aria-label="Kapat">✕</button>
    </div>

    <div class="drawer-body">
      <!-- Quick Actions -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <a class="btn btn-sm" href="${escapeHtml(p.yokAtlasUrl)}" target="_blank" rel="noopener">YÖK Atlas'ta Aç ↗</a>
        <button class="btn btn-sm" id="drawerRefreshBtn">↻ Canlı Güncelle</button>
        <button class="btn btn-sm ${state.compareCodes.includes(p.code) ? 'btn-primary' : ''}" id="drawerCompareBtn">
          ${state.compareCodes.includes(p.code) ? '✓ Karşılaştırmada' : '+ Karşılaştır'}
        </button>
        <button class="btn btn-sm btn-danger" id="drawerDeleteBtn" style="margin-left:auto;">Listeden Çıkar</button>
      </div>

      <!-- 4-Year Trend Chart + Table -->
      <section class="drawer-section">
        <div class="section-heading">
          <span>4 Yıllık Taban Trendi</span>
          <div class="view-toggle">
            <button class="view-btn ${ui.drawerChartMode === 'rank' ? 'active' : ''}" data-chart-mode="rank">Sıralama</button>
            <button class="view-btn ${ui.drawerChartMode === 'score' ? 'active' : ''}" data-chart-mode="score">Puan</button>
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
                  <td class="mono" style="font-weight:600;">${h.year}</td>
                  <td style="font-weight:650;">${formatRank(h.rank)}</td>
                  <td>${formatScore(h.minScore)}</td>
                  <td>${h.quota ?? '—'}</td>
                  <td>${h.placed ?? '—'}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </section>

      <!-- Son Yerleşen Net Ortalamaları -->
      <section class="drawer-section">
        <div class="section-heading">
          <span>Son Yerleşen Ortalama Netleri</span>
          ${p.nets && p.nets.length > 1
            ? `<div class="view-toggle">
                ${p.nets
                  .map(
                    (n) => `<button class="view-btn ${activeNet?.year === n.year ? 'active' : ''}" data-net-year="${n.year}">${n.year}</button>`,
                  )
                  .join('')}
              </div>`
            : activeNet
              ? `<span class="mono">${activeNet.year}</span>`
              : ''}
        </div>
        ${activeNet
          ? `<div style="font-size:12px;color:var(--text-secondary);">
              Yerleşen Ort. OBP: <strong class="tabular">${formatScore(activeNet.obp)}</strong>
            </div>
            <div class="nets-grid">
              <div class="net-box">
                <div class="net-box-head"><span>TYT</span><span class="tabular" style="color:var(--accent-bright)">${formatNet(activeNet.tytTotal)} / 120</span></div>
                ${renderNetBars(TYT_FIELDS, activeNet.tyt)}
              </div>
              <div class="net-box">
                ${p.scoreType === 'DİL'
                  ? `<div class="net-box-head"><span>YDT (Yabancı Dil)</span><span class="tabular" style="color:var(--green)">${formatNet(activeNet.ydt)} / 80</span></div>
                     <div class="net-row">
                       <div class="net-row-top"><span>YDT Neti</span><span class="tabular"><strong>${formatNet(activeNet.ydt)}</strong> / 80</span></div>
                       <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, ((activeNet.ydt || 0) / 80) * 100)}%;background:var(--green)"></div></div>
                     </div>`
                  : `<div class="net-box-head"><span>AYT (${escapeHtml(p.scoreType)})</span><span class="tabular" style="color:var(--green)">${formatNet(activeNet.aytTotal)} / 80</span></div>
                     ${renderNetBars(aytFields, activeNet.ayt)}`}
              </div>
            </div>`
          : `<div class="chart-empty">Bu program için YÖK Atlas net ortalaması henüz yayınlanmamış.</div>`}
      </section>

      <!-- Akademik Kadro & Akreditasyon -->
      <section class="drawer-section">
        <div class="section-heading">
          <span>Akademik Kadro & Akreditasyon</span>
          ${p.accreditation ? `<span class="badge badge-accent">${escapeHtml(p.accreditation)}</span>` : ''}
        </div>
        <div class="staff-grid tabular">
          <div class="staff-tile"><strong>${staff.prof || 0}</strong><span>Prof. Dr.</span></div>
          <div class="staff-tile"><strong>${staff.doc || 0}</strong><span>Doç. Dr.</span></div>
          <div class="staff-tile"><strong>${staff.drOgr || 0}</strong><span>Dr. Öğr. Üyesi</span></div>
          <div class="staff-tile"><strong>${staff.arGor || 0}</strong><span>Ar. Gör.</span></div>
        </div>
        ${p.accreditationDesc ? `<div style="font-size:12px;color:var(--text-secondary);">Akreditasyon: ${escapeHtml(p.accreditationDesc)}</div>` : ''}
        ${p.minRankRequirement ? `<div style="font-size:12px;color:var(--amber);">Baraj: ${escapeHtml(p.minRankRequirement)}</div>` : ''}
      </section>

      <!-- ÖSYM Özel Koşullar -->
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

      <!-- Kişisel Değerlendirme -->
      <section class="drawer-section">
        <div class="section-heading"><span>Kişisel Değerlendirmen</span></div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <div class="filter-pills">
            ${['hayal', 'hedef', 'guvenli']
              .map(
                (rk) =>
                  `<button class="filter-pill ${p.risk === rk ? 'active' : ''}" data-set-risk="${rk}">${RISK_META[rk].label}</button>`,
              )
              .join('')}
          </div>
          <div class="rating-stars" aria-label="Yıldız puanı">
            ${[1, 2, 3, 4, 5]
              .map((n) => `<button class="star-btn ${(p.rating || 0) >= n ? 'filled' : ''}" data-set-star="${n}" title="${n} yıldız">★</button>`)
              .join('')}
          </div>
        </div>

        <div class="pros-cons-grid">
          <div class="pc-box">
            <div style="font-size:12px;font-weight:650;color:var(--green);">Artılar (+)</div>
            <ul class="pc-list">
              ${(p.pros || [])
                .map(
                  (item, idx) => `<li class="pc-item"><span>${escapeHtml(item)}</span><button class="btn-ghost" data-del-pro="${idx}" title="Sil">✕</button></li>`,
                )
                .join('')}
            </ul>
            <form class="pc-add-row" id="addProForm">
              <input class="input" id="addProInput" placeholder="Artı ekle..." />
              <button class="btn btn-sm" type="submit">+</button>
            </form>
          </div>

          <div class="pc-box">
            <div style="font-size:12px;font-weight:650;color:var(--rose);">Eksiler (−)</div>
            <ul class="pc-list">
              ${(p.cons || [])
                .map(
                  (item, idx) => `<li class="pc-item"><span>${escapeHtml(item)}</span><button class="btn-ghost" data-del-con="${idx}" title="Sil">✕</button></li>`,
                )
                .join('')}
            </ul>
            <form class="pc-add-row" id="addConForm">
              <input class="input" id="addConInput" placeholder="Eksi ekle..." />
              <button class="btn btn-sm" type="submit">+</button>
            </form>
          </div>
        </div>

        <div>
          <label class="field-label" for="drawerNotesInput">Kişisel Notlar</label>
          <textarea id="drawerNotesInput" class="textarea" placeholder="Kampüs, yurt, ulaşım, mezun yorumları, Erasmus imkanları...">${escapeHtml(p.notes || '')}</textarea>
        </div>

        <div style="font-size:11.5px;color:var(--text-muted);">
          Son YÖK Atlas güncellemesi: ${formatRelativeTime(p.fetchedAt)}
        </div>
      </section>
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
// Add Program Modal (Live YÖK Atlas Fetch + Batch Support)
// ============================================================================
function openAddModal(prefillCode = '') {
  const overlay = document.getElementById('addModalOverlay');
  const input = document.getElementById('programCodeInput');
  document.getElementById('addModalFeedback').innerHTML = '';
  document.getElementById('addModalPreview').innerHTML = '';
  ui.previewPrograms = [];
  if (input) {
    input.value = prefillCode;
    setTimeout(() => input.focus(), 60);
  }
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  if (prefillCode) {
    handleFetchPreview();
  }
}

function closeAddModal() {
  const overlay = document.getElementById('addModalOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

async function handleFetchPreview() {
  const input = document.getElementById('programCodeInput');
  const feedback = document.getElementById('addModalFeedback');
  const preview = document.getElementById('addModalPreview');
  const btn = document.getElementById('fetchProgramBtn');

  const codes = extractProgramCodes(input.value);
  if (!codes.length) {
    feedback.innerHTML = `<div class="error-banner">Geçerli bir 9 haneli YÖK Atlas program kodu veya YÖK Atlas linki bulunamadı (ör. <code>102210277</code>).</div>`;
    preview.innerHTML = '';
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span>YÖK Atlas'tan çekiliyor (${codes.length})...</span>`;
  feedback.innerHTML = '';
  preview.innerHTML = '';

  const found = [];
  const errors = [];

  for (const code of codes.slice(0, 12)) {
    try {
      const prog = await fetchProgramFromApi(code);
      if (!prog.isLisans) {
        errors.push(`${code}: Önlisans programı (TercihAtlas lisans odaklıdır, yine de ekleyebilirsin).`);
      }
      found.push(prog);
    } catch (err) {
      errors.push(`${code}: ${err.message}`);
    }
  }

  btn.disabled = false;
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><span>YÖK Atlas'tan Getir</span>`;

  if (errors.length) {
    feedback.innerHTML = `<div class="error-banner">${errors.map(escapeHtml).join('<br/>')}</div>`;
  }

  ui.previewPrograms = found;
  if (!found.length) return;

  if (found.length === 1) {
    const p = found[0];
    const suggested = suggestRisk(p.latestRank, state.targetRank);
    const alreadyExists = state.programs.some((item) => item.code === p.code);
    preview.innerHTML = `<div class="preview-card">
      <div style="display:flex;gap:11px;align-items:flex-start;">
        ${renderAvatar(p)}
        <div style="min-width:0;flex:1;">
          <div style="font-size:14.5px;font-weight:650;">${escapeHtml(p.department)}</div>
          <div style="font-size:12.5px;color:var(--text-secondary);">${escapeHtml(p.university)} · ${escapeHtml(p.city)}</div>
          <div class="badges-row" style="margin-top:6px;">
            <span class="badge badge-score">${escapeHtml(p.scoreType)}</span>
            <span class="badge">${escapeHtml(p.language)}</span>
            <span class="badge">${escapeHtml(p.scholarship)}</span>
            ${p.accreditation ? `<span class="badge badge-accent">${escapeHtml(p.accreditation)}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="card-metrics" style="background:var(--bg-elevated);">
        <div class="metric-item"><span class="metric-label">${p.latestYear} Sıralama</span><span class="metric-val tabular">${formatRank(p.latestRank)}</span></div>
        <div class="metric-item"><span class="metric-label">Taban Puan</span><span class="metric-val tabular">${formatScore(p.latestScore)}</span></div>
        <div class="metric-item"><span class="metric-label">Kontenjan</span><span class="metric-val tabular">${p.quota ?? '—'}</span></div>
        <div>${renderSparkline(p.history)}</div>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="font-size:12px;color:var(--text-muted);">Kategori:</span>
          <select id="previewRiskSelect" class="select toolbar-select" style="height:30px;">
            <option value="hayal" ${suggested === 'hayal' ? 'selected' : ''}>Hayal</option>
            <option value="hedef" ${suggested === 'hedef' ? 'selected' : ''}>Hedef</option>
            <option value="guvenli" ${suggested === 'guvenli' ? 'selected' : ''}>Güvenli</option>
          </select>
        </div>
        <button class="btn btn-primary" id="confirmAddSingleBtn">
          ${alreadyExists ? 'Listede Güncelle' : '+ Tercihlerime Ekle'}
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
      showToast(`${p.university} — ${p.department} tercihlerine eklendi.`, 'success');
    });
  } else {
    preview.innerHTML = `<div class="preview-card">
      <div style="font-size:13.5px;font-weight:650;">${found.length} Program Bulundu</div>
      <div style="display:flex;flex-direction:column;gap:6px;max-height:220px;overflow-y:auto;">
        ${found
          .map(
            (p) => `<div style="display:flex;justify-content:space-between;gap:8px;padding:7px 9px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;font-size:12.5px;">
              <div><strong>${escapeHtml(p.department)}</strong><div style="color:var(--text-secondary);font-size:11.5px;">${escapeHtml(p.university)} · ${escapeHtml(p.city)}</div></div>
              <div class="tabular" style="font-weight:650;white-space:nowrap;">${formatRank(p.latestRank)}</div>
            </div>`,
          )
          .join('')}
      </div>
      <button class="btn btn-primary" id="confirmAddBatchBtn">+ Tümünü Tercihlerime Ekle (${found.length})</button>
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
      Aynı <strong>Kişisel Senkronizasyon Anahtarını</strong> Mac, iPhone ve iPad'de girdiğinde tercih listen, notların ve sıralaman otomatik olarak eşitlenir.
    </div>

    <div>
      <label class="field-label" for="syncKeyInput">Kişisel Senkronizasyon Anahtarın (En az 6 karakter)</label>
      <div style="display:flex;gap:8px;">
        <input id="syncKeyInput" class="input mono" type="text" value="${escapeHtml(currentKey)}" placeholder="Örn: atlas-hedef-9f4a21c8" />
        <button class="btn" type="button" id="genSyncKeyBtn" title="Güvenli rastgele anahtar oluştur">Üret</button>
      </div>
      <div class="field-hint">
        ${ui.lastSyncedAt ? `Son bulut eşitleme: ${formatRelativeTime(ui.lastSyncedAt)}` : 'Bu anahtar SHA-256 ile özetlenerek saklanır; kimseyle paylaşma.'}
      </div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-primary" id="saveAndSyncBtn">Kaydet & Buluttan Eşitle</button>
      <button class="btn" id="forcePushSyncBtn" ${!currentKey ? 'disabled' : ''}>Şimdi Buluta Gönder</button>
      ${currentKey ? `<button class="btn btn-ghost" id="disconnectSyncBtn">Anahtarı Kaldır</button>` : ''}
    </div>

    <hr style="border:none;border-top:1px solid var(--border);margin:4px 0;" />

    <div>
      <label class="field-label" for="apiBaseInput">YÖK Atlas & Bulut API Adresi (Cloudflare Worker)</label>
      <div style="display:flex;gap:8px;">
        <input id="apiBaseInput" class="input mono" type="url" value="${escapeHtml(apiBase)}"
          placeholder="${isLocalDev() ? 'Yerel sunucu aktif (otomatik)' : 'https://tercihatlas-api.kullanici.workers.dev'}" />
        <button class="btn" type="button" id="testApiBtn">Test Et</button>
      </div>
      <div id="apiTestResult" class="field-hint">
        ${isLocalDev() ? 'Şu an yerel geliştirme sunucusu üzerinden canlı YÖK Atlas bağlı.' : hasConfiguredApi() ? 'Cloudflare Worker bağlantısı yapılandırıldı.' : 'GitHub Pages üzerinde canlı veri için Cloudflare Worker adresini girin.'}
      </div>
    </div>

    <hr style="border:none;border-top:1px solid var(--border);margin:4px 0;" />

    <div>
      <label class="field-label">Dışa Aktar & Yedekleme</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-sm" id="exportCsvBtn">Excel / CSV İndir</button>
        <button class="btn btn-sm" id="exportJsonBtn">JSON Yedek İndir</button>
        <label class="btn btn-sm" style="cursor:pointer;">
          JSON Yedek Yükle
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
    const rawApi = document.getElementById('apiBaseInput').value.trim();
    setCustomApiBase(rawApi);
    await syncPushNow({ silent: false });
    renderSyncModal();
  });

  document.getElementById('disconnectSyncBtn')?.addEventListener('click', () => {
    localStorage.removeItem(SYNC_KEY_STORAGE);
    updateSyncIndicator('local', 'Yerel Mod');
    showToast('Bulut anahtarı bağlantısı kaldırıldı.');
    renderSyncModal();
  });

  document.getElementById('testApiBtn')?.addEventListener('click', async () => {
    const rawApi = document.getElementById('apiBaseInput').value.trim();
    setCustomApiBase(rawApi);
    const out = document.getElementById('apiTestResult');
    out.textContent = 'Test ediliyor...';
    try {
      const h = await checkApiHealth();
      out.innerHTML = `<span style="color:var(--green)">✓ Bağlantı başarılı (${escapeHtml(h.service || 'API')}, KV: ${h.kvConfigured ? 'Aktif' : 'Kapalı'})</span>`;
    } catch (err) {
      out.innerHTML = `<span style="color:var(--rose)">✕ ${escapeHtml(err.message)}</span>`;
    }
  });

  document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    if (!state.programs.length) return showToast('Dışa aktarılacak program yok.', 'error');
    exportProgramsToCsv(state.programs);
    showToast('CSV dosyası indirildi.', 'success');
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

  // Card / Table row clicks, actions, and Drag & Drop
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

    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const fromCode = ui.dragCode || e.dataTransfer.getData('text/plain');
      reorderPrograms(fromCode, code);
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
// Bootstrap Global Listeners
// ============================================================================
function init() {
  initTheme();

  document.getElementById('brandHome')?.addEventListener('click', (e) => {
    e.preventDefault();
    ui.region = 'TR';
    ui.tab = 'preferences';
    renderAll();
  });

  document.querySelectorAll('.country-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.region = btn.dataset.region;
      renderAll();
      document.getElementById('backToTrBtn')?.addEventListener('click', () => {
        ui.region = 'TR';
        renderAll();
      });
    });
  });

  document.querySelectorAll('#desktopNav .nav-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.region = 'TR';
      ui.tab = btn.dataset.tab;
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
      document.getElementById('backToTrBtn')?.addEventListener('click', () => {
        ui.region = 'TR';
        renderAll();
      });
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
      document.getElementById('programCodeInput').value = btn.dataset.sampleCode;
      handleFetchPreview();
    });
  });

  document.getElementById('programCodeInput')?.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
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

  // Global keyboard shortcuts (Cmd+K / Ctrl+K to add, Esc to close)
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

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  renderAll();
  syncPullOnStartup({ silent: true });
}

init();
