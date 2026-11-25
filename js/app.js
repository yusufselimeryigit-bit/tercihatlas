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
} from './utils.js?v=21';
import {
  getApiBase,
  setCustomApiBase,
  hasConfiguredApi,
  isLocalDev,
  getLogoUrl,
  checkApiHealth,
  fetchProgramFromApi,
  searchProgramsFromApi,
  createShareSnapshot,
  fetchShareSnapshot,
} from './api.js?v=21';
import {
  getFirebaseRoom,
  setFirebaseRoom,
  pushStateToFirebase,
  pullStateOnceFromFirebase,
  startFirebaseLiveSync,
} from './firebase-sync.js?v=21';
import {
  renderSparkline,
  renderDetailTrendChart,
  renderRankSpectrum,
  renderExamProgressionChart,
  renderMiniNetSparkline,
  renderAppleActivityRings,
  renderCompareRadarChart,
} from './charts.js?v=21';
import {
  compute2027Projection,
  compareWithMyNets,
  analyzePreferenceHealth,
  openPrintableReport,
  estimateYksRankFromNets,
  isProgramCurrentlyReachable,
  DEFAULT_DECISION_WEIGHTS,
  computeDecisionScores,
  analyzeSubjectLeverage,
  computeGoalRingsAndWeeklyPlan,
  compareScenarios,
  computeExamPersonalRecords,
  diffProgramLists,
  simulateOsymPlacement,
  auditPreferenceOrder,
  SUBJECT_BOOST_PRESETS,
  simulateSubjectNetBoost,
} from './analytics.js?v=21';
import { ABROAD_PRESETS, DEFAULT_ABROAD_TOOLS, createAbroadRecord, renderAbroadView } from './abroad.js?v=21';
import { parseExamPdfFile } from './pdf-parser.js?v=21';
import {
  renderTurkeyCampusMap,
  renderCostCalculator,
  renderTimelineView,
  downloadTimelineIcs,
} from './map-cost.js?v=21';
import { findSimilarProgramsInCatalog, findGapFillersInCatalog } from './catalog.js?v=21';
import {
  extractLogoAmbientColor,
  getDaysUntil,
  renderRoadmapPanelHtml,
  exportSummaryPngCard,
} from './v21-extras.js?v=21';

const STATE_KEY = 'tercihatlas_state_v1';
const SYNC_KEY_STORAGE = 'tercihatlas_sync_key';
const THEME_STORAGE = 'tercihatlas_theme_v2';
const ACCENT_STORAGE = 'tercihatlas_accent_v1';
const SURFACE_STORAGE = 'tercihatlas_surface_v1';

const PROGRAM_CHECKLIST_ITEMS = [
  { key: 'mufredat', label: 'Ders Müfredatı' },
  { key: 'kampusYurt', label: 'Kampüs & Yurt' },
  { key: 'mezun', label: 'Mezun Yorumları' },
  { key: 'erasmus', label: 'Erasmus & Staj' },
];

const PROGRAM_SUBRATING_ITEMS = [
  { key: 'academic', label: 'Akademik Kadro' },
  { key: 'campus', label: 'Kampüs & Şehir' },
  { key: 'career', label: 'Kariyer & Staj' },
  { key: 'living', label: 'Yurt & Ulaşım' },
];

const DEFAULT_MY_NETS = {
  obp: null,
  tyt: { turkce: null, matematik: null, sosyal: null, fen: null },
  ayt: {
    matematik: null,
    fizik: null,
    kimya: null,
    biyoloji: null,
    edebiyat: null,
    tarih1: null,
    cografya1: null,
    tarih2: null,
    cografya2: null,
    felsefe: null,
    din: null,
  },
  ydt: null,
};

const DEFAULT_COST_SETTINGS = {
  eurTry: 39,
  monthlyIstanbul: 22000,
  monthlyMetro: 17000,
  monthlyOther: 13000,
  monthsPerYear: 9,
};

const DEFAULT_STATE = {
  version: 3,
  studentName: 'Yusuf Selim Eryiğit',
  activeScenarioId: 'plan-a',
  scenarios: [
    { id: 'plan-a', name: 'Plan A (Ana Liste)', targetRank: 15000, programs: [], compareCodes: [] },
  ],
  targetRank: 15000,
  updatedAt: null,
  programs: [],
  compareCodes: [],
  myNets: structuredClone(DEFAULT_MY_NETS),
  examHistory: [],
  snapshots: [],
  abroadPrograms: [],
  abroadTools: structuredClone(DEFAULT_ABROAD_TOOLS),
  costSettings: structuredClone(DEFAULT_COST_SETTINGS),
  decisionWeights: structuredClone(DEFAULT_DECISION_WEIGHTS),
  roadmapChecks: {},
  customMilestones: [],
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
  share: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>`,
  note: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>`,
  print: `<svg class="sf-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M8 14h8v7H8z"/></svg>`,
  upload: `<svg class="sf-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>`,
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
  clock: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  warn: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>`,
  sparkles: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/></svg>`,
  keyboard: `<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/></svg>`,
  shield: `<svg class="sf-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.8-3 8.8-7 10-4-1.2-7-5.2-7-10V6l7-3z"/></svg>`,
  lockOpen: `<svg class="sf-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 7.6-1.7"/></svg>`,
  checkCircle: `<svg class="sf-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.4 2.4 4.8-5"/></svg>`,
  trendDown: `<svg class="sf-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6 6 4-4 8 8"/><path d="M16 17h5v-5"/></svg>`,
};

const ui = {
  region: 'TR',
  tab: 'preferences',
  analysisSubTab: 'overview', // 'overview' | 'progression' | 'discover' | 'decision' | 'map' | 'simulator' | 'cost' | 'timeline'
  progressionType: 'TYT',
  compareMode: 'programs', // 'programs' | 'scenarios'
  cmpScenarioA: null,
  cmpScenarioB: null,
  discover: {
    q: 'Bilgisayar',
    rank: null,
    puanTuru: 'SAY',
    uniTuru: '',
    loading: false,
    error: '',
    bands: null, // { hayal: [], hedef: [], guvenli: [], usedRank }
  },
  refreshBusy: false,
  refreshProgressText: '',
  refreshDiff: null, // { updatedCount, failCount, changes: [] }
  selectedMapCity: null,
  simTytBoost: 0,
  simAytBoost: 0,
  simPlacementRank: null,
  subjectBoostDeltas: {},
  subjectBoostScoreType: null,
  selectMode: false,
  selectedCodes: new Set(),
  kbdFocusCode: null,
  viewMode: localStorage.getItem('tercihatlas_view_mode') || 'cards',
  search: '',
  filterRisk: 'all',
  filterReachable: false,
  filterScoreType: 'all',
  sortBy: 'manual',
  abroadFilter: 'ALL',
  editingAbroadId: null,
  drawerCode: null,
  drawerChartMode: 'rank',
  drawerNetYear: null,
  syncStatus: 'local',
  syncMessage: 'Yerel',
  lastSyncedAt: null,
  dragCode: null,
  osymCopiedCodes: new Set(),
  lastShareUrl: '',
  spotlightIdx: -1,
  readOnlyShare: null, // { title, ownerName, sharedAt } when viewing ?share=...
};

let state = loadLocalState();
let syncTimer = null;

// ============================================================================
// State Normalization & Multi-Scenario Engine
// ============================================================================
function normalizeState(parsed) {
  const base = {
    ...structuredClone(DEFAULT_STATE),
    ...(parsed || {}),
    studentName: parsed?.studentName || 'Yusuf Selim Eryiğit',
    abroadPrograms: Array.isArray(parsed?.abroadPrograms) ? parsed.abroadPrograms : [],
    abroadTools: { ...structuredClone(DEFAULT_ABROAD_TOOLS), ...(parsed?.abroadTools || {}) },
    examHistory: Array.isArray(parsed?.examHistory) ? parsed.examHistory : [],
    snapshots: Array.isArray(parsed?.snapshots) ? parsed.snapshots : [],
    costSettings: { ...structuredClone(DEFAULT_COST_SETTINGS), ...(parsed?.costSettings || {}) },
    decisionWeights: { ...structuredClone(DEFAULT_DECISION_WEIGHTS), ...(parsed?.decisionWeights || {}) },
    roadmapChecks: parsed?.roadmapChecks && typeof parsed.roadmapChecks === 'object' ? { ...parsed.roadmapChecks } : {},
    customMilestones: Array.isArray(parsed?.customMilestones) ? parsed.customMilestones : [],
    myNets: {
      ...structuredClone(DEFAULT_MY_NETS),
      ...(parsed?.myNets || {}),
      tyt: { ...structuredClone(DEFAULT_MY_NETS.tyt), ...(parsed?.myNets?.tyt || {}) },
      ayt: { ...structuredClone(DEFAULT_MY_NETS.ayt), ...(parsed?.myNets?.ayt || {}) },
    },
  };

  // Migrate legacy flat state into scenarios seamlessly
  if (!Array.isArray(parsed?.scenarios) || !parsed.scenarios.length) {
    base.scenarios = [
      {
        id: 'plan-a',
        name: 'Plan A (Ana Liste)',
        targetRank: parsed?.targetRank ?? 15000,
        programs: Array.isArray(parsed?.programs) ? parsed.programs : [],
        compareCodes: Array.isArray(parsed?.compareCodes) ? parsed.compareCodes : [],
      },
    ];
    base.activeScenarioId = 'plan-a';
  } else {
    base.scenarios = parsed.scenarios.map((sc, i) => ({
      id: sc.id || `plan-${i + 1}`,
      name: sc.name || `Plan ${i + 1}`,
      targetRank: sc.targetRank ?? 15000,
      programs: Array.isArray(sc.programs) ? sc.programs : [],
      compareCodes: Array.isArray(sc.compareCodes) ? sc.compareCodes : [],
    }));
    if (!base.scenarios.some((s) => s.id === base.activeScenarioId)) {
      base.activeScenarioId = base.scenarios[0].id;
    }
  }

  // Mirror active scenario onto top-level pointers for clean compatibility
  const active = base.scenarios.find((s) => s.id === base.activeScenarioId) || base.scenarios[0];
  base.programs = active.programs;
  base.compareCodes = active.compareCodes;
  base.targetRank = active.targetRank;
  return base;
}

function getActiveScenario() {
  return state.scenarios.find((s) => s.id === state.activeScenarioId) || state.scenarios[0];
}

function syncActiveScenarioPointers() {
  const sc = getActiveScenario();
  if (!sc) return;
  sc.programs = state.programs;
  sc.compareCodes = state.compareCodes;
  sc.targetRank = state.targetRank;
}

function switchScenario(id) {
  syncActiveScenarioPointers();
  const target = state.scenarios.find((s) => s.id === id);
  if (!target) return;
  state.activeScenarioId = target.id;
  state.programs = target.programs;
  state.compareCodes = target.compareCodes;
  state.targetRank = target.targetRank;
  ui.selectedMapCity = null;
  saveState();
  renderAll();
}

async function createScenario({ duplicateCurrent = false } = {}) {
  const defaultName = duplicateCurrent
    ? `${getActiveScenario().name} (Kopya)`
    : `Plan ${String.fromCharCode(65 + (state.scenarios.length % 26))}`;
  const res = await applePrompt({
    title: duplicateCurrent ? 'Planı Kopyala' : 'Yeni Senaryo Oluştur',
    message: 'Tercih senaryona kısa bir ad ver (ör. İstanbul Ağırlıklı).',
    fields: [{ id: 'name', label: 'Senaryo Adı', value: defaultName, placeholder: 'Plan B' }],
    confirmLabel: 'Oluştur',
  });
  const name = res?.name?.trim();
  if (!name) return;
  syncActiveScenarioPointers();
  const cur = getActiveScenario();
  const id = `sc-${Date.now()}`;
  const next = {
    id,
    name,
    targetRank: cur.targetRank,
    programs: duplicateCurrent ? structuredClone(cur.programs) : [],
    compareCodes: duplicateCurrent ? [...cur.compareCodes] : [],
  };
  state.scenarios.push(next);
  switchScenario(id);
  showToast(`"${next.name}" senaryosu oluşturuldu.`, 'success');
}

async function renameActiveScenario() {
  const cur = getActiveScenario();
  const res = await applePrompt({
    title: 'Senaryoyu Yeniden Adlandır',
    fields: [{ id: 'name', label: 'Yeni Ad', value: cur.name, placeholder: 'Plan A' }],
    confirmLabel: 'Kaydet',
  });
  const name = res?.name?.trim();
  if (!name) return;
  cur.name = name;
  saveState();
  renderAll();
  showToast('Senaryo adı güncellendi.', 'success');
}

async function deleteActiveScenario() {
  if (state.scenarios.length <= 1) {
    showToast('En az bir senaryo kalmalıdır.', 'error');
    return;
  }
  const cur = getActiveScenario();
  const ok = await appleConfirm({
    title: `"${cur.name}" silinsin mi?`,
    message: `Bu senaryodaki ${cur.programs.length} tercih kalıcı olarak kaldırılır.`,
    confirmLabel: 'Sil',
    destructive: true,
  });
  if (!ok) return;
  state.scenarios = state.scenarios.filter((s) => s.id !== cur.id);
  switchScenario(state.scenarios[0].id);
  showToast(`"${cur.name}" silindi.`);
}

// ============================================================================
// Persistence & Cloud Sync
// ============================================================================
function loadLocalState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return normalizeState(null);
    return normalizeState(JSON.parse(raw));
  } catch {
    return normalizeState(null);
  }
}

function isStateMeaningful(st) {
  if (!st) return false;
  const hasProgs = (st.programs?.length || 0) > 0 || (st.scenarios || []).some((sc) => (sc.programs?.length || 0) > 0);
  const hasAbroad = (st.abroadPrograms?.length || 0) > 0;
  const hasExams = (st.examHistory?.length || 0) > 0;
  const hasSnaps = (st.snapshots?.length || 0) > 0;
  const mn = st.myNets || {};
  const hasNets =
    mn.obp != null ||
    mn.ydt != null ||
    Object.values(mn.tyt || {}).some((v) => v != null) ||
    Object.values(mn.ayt || {}).some((v) => v != null);
  return hasProgs || hasAbroad || hasExams || hasSnaps || hasNets;
}

function saveState({ triggerCloud = true } = {}) {
  if (ui.readOnlyShare) return; // Never overwrite local/cloud state in read-only share mode
  syncActiveScenarioPointers();
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
  if (triggerCloud) {
    scheduleCloudPush();
  }
}

function updateSyncIndicator(status, label) {
  ui.syncStatus = status;
  ui.syncMessage = label;
  const dotClass = 'status-dot' + (status === 'synced' ? ' synced' : status === 'syncing' ? ' syncing' : status === 'error' ? ' error' : '');
  const el = document.getElementById('syncDot');
  if (el) el.className = dotClass;
  const lbl = document.getElementById('syncLabel');
  if (lbl) lbl.textContent = label;
}

function scheduleCloudPush() {
  clearTimeout(syncTimer);
  updateSyncIndicator('syncing', 'Eşitleniyor');
  syncTimer = setTimeout(() => syncPushNow({ silent: true }), 450);
}

async function syncPushNow({ silent = false } = {}) {
  if (ui.readOnlyShare) return false;
  try {
    syncActiveScenarioPointers();
    updateSyncIndicator('syncing', 'Eşitleniyor');
    const env = await pushStateToFirebase(state, getFirebaseRoom());
    ui.lastSyncedAt = env.updatedAt || new Date().toISOString();
    updateSyncIndicator('synced', 'Firebase Canlı');
    if (!silent) showToast('Firebase buluta kaydedildi.', 'success');
    return true;
  } catch (err) {
    updateSyncIndicator('error', 'Çevrimdışı');
    if (!silent) showToast(err.message || 'Firebase bağlantısı başarısız.', 'error');
    return false;
  }
}

function startRealtimeFirebaseSync() {
  if (ui.readOnlyShare) return;
  const room = getFirebaseRoom();
  startFirebaseLiveSync({
    room,
    getLocalState: () => {
      syncActiveScenarioPointers();
      return state;
    },
    isLocalMeaningful: isStateMeaningful,
    onRemoteState: (remoteData, meta) => {
      state = normalizeState(remoteData);
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      ui.lastSyncedAt = meta?.updatedAt || new Date().toISOString();
      renderAll();
      if (ui.drawerCode) renderDrawer();
      if (!meta?.initial) {
        showToast('Diğer cihazdaki değişiklik canlı eşitlendi.', 'success');
      }
    },
    onStatus: (status, label) => {
      if (status === 'synced') ui.lastSyncedAt = ui.lastSyncedAt || new Date().toISOString();
      updateSyncIndicator(status, label);
    },
  });
}

// ============================================================================
// Theme (Light / Dark / System Auto), macOS Accent Color & Floating Pill Toast
// ============================================================================
const systemDarkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function initTheme() {
  const savedMode = localStorage.getItem(THEME_STORAGE) || 'light';
  const savedAccent = localStorage.getItem(ACCENT_STORAGE) || 'blue';
  const savedSurface = localStorage.getItem(SURFACE_STORAGE) || 'classic';
  applyThemeMode(savedMode);
  applyAccent(savedAccent);
  applySurfaceStyle(savedSurface);

  systemDarkQuery?.addEventListener?.('change', () => {
    if ((localStorage.getItem(THEME_STORAGE) || 'light') === 'auto') {
      applyThemeMode('auto');
    }
  });
}

function applyThemeMode(mode) {
  const normalized = ['light', 'dark', 'auto'].includes(mode) ? mode : 'light';
  localStorage.setItem(THEME_STORAGE, normalized);
  const resolved = normalized === 'auto' ? (systemDarkQuery?.matches ? 'dark' : 'light') : normalized;

  document.documentElement.setAttribute('data-theme', resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#000000' : '#F5F5F7');
  const statusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (statusMeta) statusMeta.setAttribute('content', resolved === 'dark' ? 'black-translucent' : 'default');

  const svgInner =
    normalized === 'auto'
      ? '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>'
      : resolved === 'dark'
        ? '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2.5 12h2M19.5 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'
        : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

  const icon = document.getElementById('themeIcon');
  if (icon) icon.innerHTML = svgInner;

  document.querySelectorAll('#themeModeSegmented [data-theme-mode]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.themeMode === normalized);
  });
  initSlidingSegmentedControls();
}

function applyAccent(accent) {
  const valid = ['blue', 'indigo', 'purple', 'rose', 'orange', 'green', 'graphite'];
  const chosen = valid.includes(accent) ? accent : 'blue';
  localStorage.setItem(ACCENT_STORAGE, chosen);
  if (chosen === 'blue') {
    document.documentElement.removeAttribute('data-accent');
  } else {
    document.documentElement.setAttribute('data-accent', chosen);
  }
  document.querySelectorAll('#accentSwatches [data-accent-pick]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.accentPick === chosen);
  });
}

function applySurfaceStyle(surface) {
  const valid = ['classic', 'aurora', 'contrast'];
  const chosen = valid.includes(surface) ? surface : 'classic';
  localStorage.setItem(SURFACE_STORAGE, chosen);
  if (chosen === 'classic') {
    document.documentElement.removeAttribute('data-surface');
  } else {
    document.documentElement.setAttribute('data-surface', chosen);
  }
  document.querySelectorAll('#surfaceStyleSegmented [data-surface-pick]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.surfacePick === chosen);
  });
  initSlidingSegmentedControls();
}

function setPresentationMode(enabled) {
  document.body.classList.toggle('presentation-mode', Boolean(enabled));
  if (enabled) {
    showToast('Sunum modu açıldı. Çıkmak için sağ üstteki Çık veya Esc kullan.', 'info');
  }
}

function closeAppearancePopover() {
  const pop = document.getElementById('appearancePopover');
  if (!pop) return;
  pop.classList.remove('open');
  pop.setAttribute('aria-hidden', 'true');
}

function toggleAppearancePopover(e) {
  e?.stopPropagation();
  const pop = document.getElementById('appearancePopover');
  if (!pop) return;
  const willOpen = !pop.classList.contains('open');
  closeContextMenu();
  if (willOpen) {
    pop.classList.add('open');
    pop.setAttribute('aria-hidden', 'false');
    initSlidingSegmentedControls();
  } else {
    closeAppearancePopover();
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast';
  const badgeBg = type === 'error' ? 'var(--rose)' : type === 'success' ? 'var(--green-bright)' : 'var(--accent)';
  const badgeIcon =
    type === 'error'
      ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 7v6M12 17h.01"/></svg>'
      : type === 'success'
        ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
        : '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 16v-4M12 8h.01"/></svg>';
  el.innerHTML = `<span class="toast-badge" style="background:${badgeBg}">${badgeIcon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px) scale(0.96)';
    el.style.transition = 'opacity 200ms ease, transform 200ms ease';
    setTimeout(() => el.remove(), 220);
  }, 3000);
}

// ============================================================================
// Native iOS / macOS Liquid Glass Alert & Prompt Dialogs
// ============================================================================
let activeDialogClose = null;

function openAppleDialog({ title, message = '', fields = [], confirmLabel = 'Tamam', cancelLabel = 'Vazgeç', destructive = false }) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('appleDialogOverlay');
    const box = document.getElementById('appleDialogBox');
    if (!overlay || !box) {
      resolve(null);
      return;
    }

    const close = (result) => {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      activeDialogClose = null;
      resolve(result);
    };
    activeDialogClose = () => close(null);

    box.innerHTML = `
      <form id="appleDialogForm">
        <div class="apple-dialog-body">
          <h3 class="apple-dialog-title">${escapeHtml(title)}</h3>
          ${message ? `<p class="apple-dialog-msg">${escapeHtml(message)}</p>` : ''}
          ${fields.length
            ? `<div class="apple-dialog-fields">
                ${fields
                  .map(
                    (f) => `<div>
                      ${f.label ? `<label class="field-label" for="ad_${escapeHtml(f.id)}" style="margin-bottom:4px;">${escapeHtml(f.label)}</label>` : ''}
                      <input id="ad_${escapeHtml(f.id)}" class="input" type="text" value="${escapeHtml(f.value || '')}" placeholder="${escapeHtml(f.placeholder || '')}" autocomplete="off" />
                    </div>`,
                  )
                  .join('')}
              </div>`
            : ''}
        </div>
        <div class="apple-dialog-actions">
          <button type="button" class="apple-dialog-btn" id="appleDialogCancel">${escapeHtml(cancelLabel)}</button>
          <button type="submit" class="apple-dialog-btn ${destructive ? 'destructive' : 'primary'}">${escapeHtml(confirmLabel)}</button>
        </div>
      </form>
    `;

    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');

    if (fields.length) {
      const firstInput = document.getElementById(`ad_${fields[0].id}`);
      setTimeout(() => {
        firstInput?.focus();
        firstInput?.select?.();
      }, 40);
    }

    document.getElementById('appleDialogCancel')?.addEventListener('click', () => close(null));
    overlay.onclick = (e) => {
      if (e.target === overlay) close(null);
    };

    document.getElementById('appleDialogForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!fields.length) {
        close(true);
        return;
      }
      const values = {};
      for (const f of fields) {
        values[f.id] = document.getElementById(`ad_${f.id}`)?.value ?? '';
      }
      close(values);
    });
  });
}

function appleConfirm(opts) {
  return openAppleDialog({ ...opts, fields: [] }).then((v) => v === true);
}

function applePrompt(opts) {
  return openAppleDialog(opts);
}

// ============================================================================
// Program Helpers
// ============================================================================
function renderAvatar(program) {
  const logo = getLogoUrl(program.universityId);
  const initials = escapeHtml(getUniInitials(program.university));
  if (!logo) return `<div class="uni-avatar">${initials}</div>`;
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

function formatSignedNet(val) {
  if (val === null || val === undefined) return '';
  const sign = val > 0 ? '+' : '';
  return `${sign}${formatNet(val)}`;
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
  if (ui.filterReachable) {
    const est = estimateYksRankFromNets(state.myNets);
    list = list.filter((p) => isProgramCurrentlyReachable(p, est));
  }

  if (ui.sortBy === 'rank-asc') list.sort((a, b) => (a.latestRank ?? 9e9) - (b.latestRank ?? 9e9));
  else if (ui.sortBy === 'rank-desc') list.sort((a, b) => (b.latestRank ?? -1) - (a.latestRank ?? -1));
  else if (ui.sortBy === 'rating-desc') list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (ui.sortBy === 'trend-up') list.sort((a, b) => (b.rankTrendDelta ?? -9e9) - (a.rankTrendDelta ?? -9e9));

  return list;
}

function addProgramToState(rawProgram, chosenRisk) {
  const existingIdx = state.programs.findIndex((p) => p.code === rawProgram.code);
  const risk = chosenRisk || suggestRisk(rawProgram.latestRank, state.targetRank);

  if (existingIdx !== -1) {
    const prev = state.programs[existingIdx];
    state.programs[existingIdx] = {
      ...rawProgram,
      nets: rawProgram.nets?.length ? rawProgram.nets : prev.nets || [],
      conditions: rawProgram.conditions?.length ? rawProgram.conditions : prev.conditions || [],
      risk: chosenRisk || prev.risk,
      rating: prev.rating || 0,
      subRatings: prev.subRatings || {},
      questions: prev.questions || [],
      pros: prev.pros || [],
      cons: prev.cons || [],
      notes: prev.notes || '',
      checklist: prev.checklist || {},
      links: prev.links || [],
      addedAt: prev.addedAt || new Date().toISOString(),
    };
  } else {
    state.programs.push({
      ...rawProgram,
      risk,
      rating: 0,
      subRatings: {},
      questions: [],
      pros: [],
      cons: [],
      notes: '',
      checklist: { mufredat: false, kampusYurt: false, mezun: false, erasmus: false },
      links: [],
      addedAt: new Date().toISOString(),
    });
  }
  saveState();
}

function captureProgramRects() {
  const map = new Map();
  document.querySelectorAll('#programList [data-code]').forEach((el) => {
    map.set(el.dataset.code, el.getBoundingClientRect());
  });
  return map;
}

function animateProgramFlip(prevRects) {
  if (!prevRects || !prevRects.size) return;
  requestAnimationFrame(() => {
    document.querySelectorAll('#programList [data-code]').forEach((el) => {
      const prev = prevRects.get(el.dataset.code);
      if (!prev) return;
      const next = el.getBoundingClientRect();
      const dx = prev.left - next.left;
      const dy = prev.top - next.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.style.transition = 'none';
      el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      void el.offsetWidth;
      el.style.transition = 'transform 360ms cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = 'translate3d(0, 0, 0)';
      setTimeout(() => {
        el.style.transition = '';
        el.style.transform = '';
      }, 380);
    });
  });
}

function reorderPrograms(fromCode, toCode) {
  if (!fromCode || !toCode || fromCode === toCode) return;
  const fromIdx = state.programs.findIndex((p) => p.code === fromCode);
  const toIdx = state.programs.findIndex((p) => p.code === toCode);
  if (fromIdx === -1 || toIdx === -1) return;
  const prevRects = captureProgramRects();
  const [moved] = state.programs.splice(fromIdx, 1);
  state.programs.splice(toIdx, 0, moved);
  ui.sortBy = 'manual';
  saveState();
  renderAll();
  animateProgramFlip(prevRects);
}

function moveProgramStep(code, delta) {
  const idx = state.programs.findIndex((p) => p.code === code);
  const next = idx + delta;
  if (idx === -1 || next < 0 || next >= state.programs.length) return;
  const prevRects = captureProgramRects();
  const [moved] = state.programs.splice(idx, 1);
  state.programs.splice(next, 0, moved);
  ui.sortBy = 'manual';
  saveState();
  renderAll();
  animateProgramFlip(prevRects);
}

function moveProgramToTop(code) {
  const idx = state.programs.findIndex((p) => p.code === code);
  if (idx <= 0) return;
  const prevRects = captureProgramRects();
  const [moved] = state.programs.splice(idx, 1);
  state.programs.unshift(moved);
  ui.sortBy = 'manual';
  saveState();
  renderAll();
  animateProgramFlip(prevRects);
  showToast(`#01 sıraya taşındı: ${moved.university}`, 'success');
}

function openShortcutsModal() {
  const ov = document.getElementById('shortcutsModalOverlay');
  if (!ov) return;
  ov.classList.add('open');
  ov.setAttribute('aria-hidden', 'false');
}

function closeShortcutsModal() {
  const ov = document.getElementById('shortcutsModalOverlay');
  if (!ov) return;
  ov.classList.remove('open');
  ov.setAttribute('aria-hidden', 'true');
}

async function triggerSummaryPngExport(customSimRank = null) {
  if (!state.programs.length) {
    showToast('Özet kartı üretmek için önce tercih ekle.', 'error');
    return;
  }
  try {
    showToast('Apple Keynote kalitesinde PNG kartı hazırlanıyor...');
    const activeSc = getActiveScenario();
    const health = analyzePreferenceHealth(state.programs, state.targetRank);
    const est = estimateYksRankFromNets(state.myNets);
    const primarySt = state.programs[0]?.scoreType || 'SAY';
    const simRank = Number(customSimRank) || Number(ui.simPlacementRank) || est?.[primarySt]?.rank || Number(state.targetRank) || null;
    const simResult = simRank ? simulateOsymPlacement(state.programs, simRank) : null;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0071E3';
    const fileName = await exportSummaryPngCard({
      scenarioName: activeSc?.name || 'Ana Tercih Listem',
      programs: state.programs,
      targetRank: state.targetRank,
      health,
      simResult,
      isDark,
      accentHex,
    });
    showToast(`${fileName} indirildi! WhatsApp / iMessage ile paylaşabilirsin.`, 'success');
  } catch (err) {
    showToast(err.message || 'PNG dışa aktarılamadı.', 'error');
  }
}

function renderBatchActionBar() {
  const bar = document.getElementById('batchActionBar');
  if (!bar) return;
  const active = ui.region === 'TR' && ui.tab === 'preferences' && ui.selectMode && ui.selectedCodes.size > 0;
  if (!active) {
    bar.classList.remove('open');
    bar.setAttribute('aria-hidden', 'true');
    return;
  }

  const count = ui.selectedCodes.size;
  const otherScenarios = state.scenarios.filter((s) => s.id !== state.activeScenarioId);

  bar.innerHTML = `
    <span class="batch-count-pill tabular">${count} seçili</span>
    <button class="btn btn-sm" type="button" id="batchSelectAllBtn">${count === state.programs.length ? 'Temizle' : 'Tümü'}</button>
    <span class="batch-sep"></span>
    <button class="btn btn-sm btn-soft" type="button" id="batchCompareBtn">Kıyasla</button>
    <button class="btn btn-sm" type="button" data-batch-risk="hayal"><span class="dot" style="background:var(--rose)"></span> Hayal</button>
    <button class="btn btn-sm" type="button" data-batch-risk="hedef"><span class="dot" style="background:var(--accent)"></span> Hedef</button>
    <button class="btn btn-sm" type="button" data-batch-risk="guvenli"><span class="dot" style="background:var(--green-bright)"></span> Güvenli</button>
    ${otherScenarios.length
      ? `<select class="select toolbar-select" id="batchCopyScenarioSelect" style="height:30px;font-size:12px;max-width:155px;">
           <option value="">Plana Kopyala...</option>
           ${otherScenarios.map((s) => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.name)}</option>`).join('')}
         </select>`
      : ''}
    <span class="batch-sep"></span>
    <button class="btn btn-sm btn-danger" type="button" id="batchDeleteBtn">${SF.trash} Sil</button>
    <button class="btn btn-ghost btn-icon btn-sm" type="button" id="batchExitBtn" title="Seçim modundan çık">${SF.close}</button>
  `;

  bar.classList.add('open');
  bar.setAttribute('aria-hidden', 'false');

  document.getElementById('batchSelectAllBtn')?.addEventListener('click', () => {
    if (ui.selectedCodes.size === state.programs.length) ui.selectedCodes.clear();
    else state.programs.forEach((p) => ui.selectedCodes.add(p.code));
    renderAll();
  });

  document.getElementById('batchCompareBtn')?.addEventListener('click', () => {
    const picked = [...ui.selectedCodes].slice(0, 4);
    state.compareCodes = picked;
    ui.selectMode = false;
    ui.selectedCodes.clear();
    ui.tab = 'compare';
    ui.compareMode = 'programs';
    saveState();
    renderAll();
    showToast(`${picked.length} bölüm karşılaştırmaya alındı.`, 'success');
  });

  bar.querySelectorAll('[data-batch-risk]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const rk = btn.dataset.batchRisk;
      state.programs.forEach((p) => {
        if (ui.selectedCodes.has(p.code)) p.risk = rk;
      });
      saveState();
      renderAll();
      showToast(`${count} bölümün kategorisi güncellendi.`, 'success');
    });
  });

  document.getElementById('batchCopyScenarioSelect')?.addEventListener('change', (e) => {
    const targetId = e.target.value;
    if (!targetId) return;
    const targetSc = state.scenarios.find((s) => s.id === targetId);
    if (!targetSc) return;
    let added = 0;
    const existing = new Set((targetSc.programs || []).map((p) => p.code));
    for (const p of state.programs) {
      if (ui.selectedCodes.has(p.code) && !existing.has(p.code)) {
        targetSc.programs.push(structuredClone(p));
        added += 1;
      }
    }
    saveState();
    ui.selectedCodes.clear();
    ui.selectMode = false;
    renderAll();
    showToast(`${added} bölüm "${targetSc.name}" planına kopyalandı.`, 'success');
  });

  document.getElementById('batchDeleteBtn')?.addEventListener('click', async () => {
    const ok = await appleConfirm({
      title: `${count} tercihi sil?`,
      message: 'Seçili bölümler aktif senaryodan kaldırılacak.',
      confirmText: 'Sil',
      danger: true,
    });
    if (!ok) return;
    state.programs = state.programs.filter((p) => !ui.selectedCodes.has(p.code));
    state.compareCodes = state.compareCodes.filter((c) => !ui.selectedCodes.has(c));
    ui.selectedCodes.clear();
    ui.selectMode = false;
    saveState();
    renderAll();
    showToast(`${count} bölüm listeden kaldırıldı.`, 'success');
  });

  document.getElementById('batchExitBtn')?.addEventListener('click', () => {
    ui.selectMode = false;
    ui.selectedCodes.clear();
    renderAll();
  });
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

async function refreshAllProgramsLive() {
  if (ui.refreshBusy || !state.programs.length) return;
  ui.refreshBusy = true;
  ui.refreshDiff = null;
  const total = state.programs.length;
  const changes = [];
  let updatedCount = 0;
  let failCount = 0;

  const snapshot = state.programs.map((p) => ({
    code: p.code,
    university: p.university,
    department: p.department,
    latestRank: p.latestRank,
    latestYear: p.latestYear,
    quota: p.quota,
  }));

  for (let i = 0; i < snapshot.length; i++) {
    const prev = snapshot[i];
    ui.refreshProgressText = `Güncelleniyor (${i + 1}/${total})...`;
    renderAll();
    try {
      const fresh = await fetchProgramFromApi(prev.code, { refresh: true });
      addProgramToState(fresh);
      updatedCount += 1;

      const diffs = [];
      if (fresh.latestRank && prev.latestRank && fresh.latestRank !== prev.latestRank) {
        diffs.push(`Sıra: ${formatRank(prev.latestRank)} → ${formatRank(fresh.latestRank)}`);
      }
      if (fresh.quota !== null && prev.quota !== null && fresh.quota !== prev.quota) {
        diffs.push(`Kontenjan: ${prev.quota} → ${fresh.quota}`);
      }
      if (fresh.latestYear && prev.latestYear && fresh.latestYear !== prev.latestYear) {
        diffs.push(`Yeni kılavuz yılı: ${fresh.latestYear}`);
      }
      if (diffs.length) {
        changes.push({
          code: prev.code,
          title: `${fresh.university} — ${fresh.department}`,
          detail: diffs.join(' · '),
        });
      }
    } catch {
      failCount += 1;
    }
  }

  ui.refreshBusy = false;
  ui.refreshProgressText = '';
  ui.refreshDiff = { updatedCount, failCount, changes, ranAt: new Date().toISOString() };
  renderAll();
  showToast(
    changes.length
      ? `${updatedCount} bölüm güncellendi (${changes.length} değişiklik bulundu).`
      : `${updatedCount} bölüm canlı doğrulandı — değişiklik yok.`,
    'success',
  );
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
function renderShareBanner() {
  const host = document.getElementById('shareBannerHost');
  if (!host) return;
  if (!ui.readOnlyShare) {
    host.innerHTML = '';
    return;
  }
  host.innerHTML = `<div style="padding:0 24px;"><div class="share-banner">
    <span>Salt-Okunur Paylaşım Görünümü · <strong>${escapeHtml(ui.readOnlyShare.title)}</strong>${ui.readOnlyShare.ownerName ? ` (${escapeHtml(ui.readOnlyShare.ownerName)})` : ''}</span>
    <button class="btn btn-primary btn-sm" id="exitShareModeBtn">Kendi Listeme Dön</button>
  </div></div>`;

  document.getElementById('exitShareModeBtn')?.addEventListener('click', () => {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
    ui.readOnlyShare = null;
    state = loadLocalState();
    renderAll();
  });
}

// ============================================================================
// Scroll-Aware Topbar, Sliding Segmented Thumbs, Swipe-to-Dismiss, Context Menu
// ============================================================================
function updateCollapsingHeader() {
  const topbar = document.getElementById('mainTopbar');
  if (topbar) topbar.classList.toggle('scrolled', window.scrollY > 24);
}

const segPrevRects = new Map();
let navGlideTimer = null;

function updateDesktopNavThumb({ animate = true } = {}) {
  const navCap = document.getElementById('desktopNav');
  if (!navCap || navCap.offsetWidth === 0) return;
  const activeNav = navCap.querySelector('.nav-pill-btn.active');
  if (!activeNav) return;

  let navThumb = document.getElementById('desktopNavThumb') || navCap.querySelector('.nav-thumb');
  if (!navThumb) {
    navThumb = document.createElement('div');
    navThumb.id = 'desktopNavThumb';
    navThumb.className = 'nav-thumb';
    navCap.prepend(navThumb);
  }
  navCap.classList.add('has-thumb');

  const capRect = navCap.getBoundingClientRect();
  const btnRect = activeNav.getBoundingClientRect();
  const targetLeft = Math.round((btnRect.left - capRect.left) * 10) / 10;
  const targetWidth = Math.round(btnRect.width * 10) / 10;

  const isFirst = !navThumb.classList.contains('ready');
  if (isFirst || !animate) {
    navThumb.style.transition = 'none';
    navThumb.style.width = `${targetWidth}px`;
    navThumb.style.transform = `translate3d(${targetLeft}px, 0, 0)`;
    void navThumb.offsetWidth;
    navThumb.classList.add('ready');
    navThumb.style.transition = '';
    return;
  }

  navThumb.classList.add('gliding');
  navThumb.style.width = `${targetWidth}px`;
  navThumb.style.transform = `translate3d(${targetLeft}px, 0, 0)`;
  clearTimeout(navGlideTimer);
  navGlideTimer = setTimeout(() => navThumb.classList.remove('gliding'), 360);
}

function updateMobileNavThumb({ animate = true } = {}) {
  const mNav = document.getElementById('mobileNav');
  if (!mNav || mNav.offsetWidth === 0) return;
  const activeBtn = mNav.querySelector('.mobile-nav-btn.active');
  if (!activeBtn) return;

  let thumb = document.getElementById('mobileNavThumb') || mNav.querySelector('.mobile-nav-thumb');
  if (!thumb) {
    thumb = document.createElement('div');
    thumb.id = 'mobileNavThumb';
    thumb.className = 'mobile-nav-thumb';
    mNav.prepend(thumb);
  }
  mNav.classList.add('has-thumb');

  const navRect = mNav.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();
  const targetLeft = Math.round((btnRect.left - navRect.left) * 10) / 10;
  const targetWidth = Math.round(btnRect.width * 10) / 10;

  const isFirst = !thumb.classList.contains('ready');
  if (isFirst || !animate) {
    thumb.style.transition = 'none';
    thumb.style.width = `${targetWidth}px`;
    thumb.style.transform = `translate3d(${targetLeft}px, 0, 0)`;
    void thumb.offsetWidth;
    thumb.classList.add('ready');
    thumb.style.transition = '';
    return;
  }

  thumb.style.width = `${targetWidth}px`;
  thumb.style.transform = `translate3d(${targetLeft}px, 0, 0)`;
}

function bindInteractiveCharts(container = document) {
  container.querySelectorAll('.interactive-chart-wrap').forEach((wrap) => {
    const svg = wrap.querySelector('svg');
    const tip = wrap.querySelector('.chart-tooltip');
    const crosshair = wrap.querySelector('.chart-crosshair');
    const ring = wrap.querySelector('.chart-active-ring');
    const pts = Array.from(wrap.querySelectorAll('.chart-hit-pt')).map((el) => ({
      cx: Number(el.dataset.cx),
      cy: Number(el.dataset.cy),
      title: el.dataset.tipTitle || '',
      main: el.dataset.tipMain || '',
      sub: el.dataset.tipSub || '',
    }));
    if (!svg || !tip || !pts.length) return;

    const vbW = Number(wrap.dataset.vbW) || 560;

    const showNearest = (clientX) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      const svgX = ((clientX - rect.left) / rect.width) * vbW;
      let nearest = pts[0];
      let bestDist = Infinity;
      for (const p of pts) {
        const d = Math.abs(p.cx - svgX);
        if (d < bestDist) {
          bestDist = d;
          nearest = p;
        }
      }

      if (crosshair) {
        crosshair.setAttribute('x1', String(nearest.cx));
        crosshair.setAttribute('x2', String(nearest.cx));
        crosshair.setAttribute('opacity', '0.75');
      }
      if (ring) {
        ring.setAttribute('cx', String(nearest.cx));
        ring.setAttribute('cy', String(nearest.cy));
        ring.setAttribute('opacity', '1');
      }

      tip.innerHTML = `
        <div class="chart-tooltip-title">${escapeHtml(nearest.title)}</div>
        <div class="chart-tooltip-main tabular">${escapeHtml(nearest.main)}</div>
        ${nearest.sub ? `<div class="chart-tooltip-sub tabular">${escapeHtml(nearest.sub)}</div>` : ''}
      `;
      const pctX = (nearest.cx / vbW) * 100;
      const clampedPct = Math.min(82, Math.max(18, pctX));
      tip.style.left = `${clampedPct.toFixed(1)}%`;
      tip.classList.add('open');
      tip.setAttribute('aria-hidden', 'false');
    };

    const hide = () => {
      if (crosshair) crosshair.setAttribute('opacity', '0');
      if (ring) ring.setAttribute('opacity', '0');
      tip.classList.remove('open');
      tip.setAttribute('aria-hidden', 'true');
    };

    svg.addEventListener('pointermove', (e) => showNearest(e.clientX));
    svg.addEventListener('pointerdown', (e) => showNearest(e.clientX));
    svg.addEventListener('pointerleave', hide);
  });
}

function initSlidingSegmentedControls() {
  updateDesktopNavThumb({ animate: true });
  updateMobileNavThumb({ animate: true });

  requestAnimationFrame(() => {
    document.querySelectorAll('.segmented').forEach((seg, idx) => {
      if (seg.offsetWidth === 0) return;
      const activeBtn = seg.querySelector('.seg-btn.active');
      if (!activeBtn) return;

      const key = seg.id || seg.getAttribute('aria-label') || `seg-${idx}`;
      const segRect = seg.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const targetLeft = Math.round((btnRect.left - segRect.left) * 10) / 10;
      const targetWidth = Math.round(btnRect.width * 10) / 10;

      let thumb = seg.querySelector('.seg-thumb');
      const isNewThumb = !thumb;
      if (!thumb) {
        thumb = document.createElement('div');
        thumb.className = 'seg-thumb';
        seg.prepend(thumb);
      }
      seg.classList.add('has-thumb');

      const prev = segPrevRects.get(key);
      if (isNewThumb && prev && (Math.abs(prev.left - targetLeft) > 1 || Math.abs(prev.width - targetWidth) > 1)) {
        thumb.style.transition = 'none';
        thumb.style.width = `${prev.width}px`;
        thumb.style.transform = `translate3d(${prev.left}px, 0, 0)`;
        void thumb.offsetWidth;
        thumb.style.transition = '';
      } else if (isNewThumb) {
        thumb.style.transition = 'none';
        thumb.style.width = `${targetWidth}px`;
        thumb.style.transform = `translate3d(${targetLeft}px, 0, 0)`;
        void thumb.offsetWidth;
        thumb.style.transition = '';
        segPrevRects.set(key, { left: targetLeft, width: targetWidth });
        return;
      }

      thumb.style.width = `${targetWidth}px`;
      thumb.style.transform = `translate3d(${targetLeft}px, 0, 0)`;
      segPrevRects.set(key, { left: targetLeft, width: targetWidth });
    });
  });
}

function renderShimmerSkeleton(count = 4) {
  return `<div class="search-results-list">
    ${Array.from({ length: count })
      .map(
        () => `<div class="shimmer-row">
          <div class="shimmer-block" style="width:40px;height:40px;border-radius:12px;flex-shrink:0;"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:7px;">
            <div class="shimmer-block" style="width:62%;height:13px;"></div>
            <div class="shimmer-block" style="width:42%;height:11px;"></div>
          </div>
          <div class="shimmer-block" style="width:68px;height:28px;border-radius:999px;"></div>
        </div>`,
      )
      .join('')}
  </div>`;
}

function closeContextMenu() {
  const menu = document.getElementById('contextMenu');
  if (!menu) return;
  menu.classList.remove('open');
  menu.setAttribute('aria-hidden', 'true');
}

function openContextMenu(e, code) {
  e.preventDefault?.();
  e.stopPropagation?.();
  const p = state.programs.find((item) => item.code === code);
  const menu = document.getElementById('contextMenu');
  if (!p || !menu) return;

  const isCmp = state.compareCodes.includes(code);
  const idx = state.programs.findIndex((item) => item.code === code);
  menu.innerHTML = `
    <button class="ctx-item" data-ctx="open">${SF.external} Detayı Aç</button>
    <button class="ctx-item" data-ctx="compare">${isCmp ? SF.check : SF.plus} ${isCmp ? 'Karşılaştırmadan Çıkar' : 'Karşılaştır'}</button>
    ${!ui.readOnlyShare && idx > 0 ? `<button class="ctx-item" data-ctx="move-top">${SF.up} En Üste Taşı (#01)</button>` : ''}
    ${!ui.readOnlyShare && idx > 0 ? `<button class="ctx-item" data-ctx="move-up">${SF.up} Bir Yukarı Taşı</button>` : ''}
    ${!ui.readOnlyShare && idx !== -1 && idx < state.programs.length - 1 ? `<button class="ctx-item" data-ctx="move-down">${SF.down} Bir Aşağı Taşı</button>` : ''}
    <div class="ctx-sep"></div>
    <button class="ctx-item" data-ctx="risk-hayal"><span class="dot" style="background:var(--rose)"></span> Hayal Yap</button>
    <button class="ctx-item" data-ctx="risk-hedef"><span class="dot" style="background:var(--accent)"></span> Hedef Yap</button>
    <button class="ctx-item" data-ctx="risk-guvenli"><span class="dot" style="background:var(--green-bright)"></span> Güvenli Yap</button>
    <div class="ctx-sep"></div>
    <button class="ctx-item" data-ctx="copy">${SF.copy} Kodu Kopyala (${escapeHtml(p.code)})</button>
    <button class="ctx-item" data-ctx="yokatlas">${SF.external} YÖK Atlas'ta Aç</button>
    ${!ui.readOnlyShare ? `<button class="ctx-item" data-ctx="refresh">${SF.refresh} Canlı Güncelle</button>` : ''}
    ${!ui.readOnlyShare ? `<div class="ctx-sep"></div><button class="ctx-item danger" data-ctx="delete">${SF.trash} Listeden Çıkar</button>` : ''}
  `;

  const menuW = 232;
  const menuH = 410;
  const clientX = Number(e.clientX) || window.innerWidth / 2;
  const clientY = Number(e.clientY) || window.innerHeight / 2;
  const left = Math.min(clientX, window.innerWidth - menuW - 12);
  const top = Math.min(clientY, window.innerHeight - menuH - 12);
  menu.style.left = `${Math.max(10, left)}px`;
  menu.style.top = `${Math.max(10, top)}px`;
  menu.classList.add('open');
  menu.setAttribute('aria-hidden', 'false');

  menu.querySelectorAll('[data-ctx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.ctx;
      closeContextMenu();
      if (act === 'open') openDrawer(code);
      else if (act === 'compare') toggleCompare(code);
      else if (act === 'move-top') moveProgramToTop(code);
      else if (act === 'move-up') moveProgramStep(code, -1);
      else if (act === 'move-down') moveProgramStep(code, 1);
      else if (act.startsWith('risk-')) {
        p.risk = act.replace('risk-', '');
        saveState();
        renderAll();
      } else if (act === 'copy') {
        navigator.clipboard?.writeText(p.code);
        showToast(`${p.code} kopyalandı.`, 'success');
      } else if (act === 'yokatlas') {
        window.open(p.yokAtlasUrl, '_blank', 'noopener');
      } else if (act === 'refresh') {
        refreshProgramLive(code);
      } else if (act === 'delete') {
        removeProgram(code);
      }
    });
  });
}

function initSheetSwipeDismiss() {
  const drawer = document.getElementById('detailDrawer');
  if (!drawer) return;
  let startY = 0;
  let currentDy = 0;
  let dragging = false;

  drawer.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 760) return;
    const target = e.target;
    const inHandle = target.closest('.sheet-grabber') || target.closest('.drawer-header');
    if (!inHandle) return;
    startY = e.touches[0].clientY;
    currentDy = 0;
    dragging = true;
    drawer.style.transition = 'none';
  }, { passive: true });

  drawer.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 0) {
      currentDy = dy;
      drawer.style.transform = `translateY(${dy}px)`;
    }
  }, { passive: true });

  drawer.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    drawer.style.transition = '';
    if (currentDy > 110) {
      drawer.style.transform = '';
      closeDrawer();
    } else {
      drawer.style.transform = '';
    }
  });
}

function updateHeaderBadges() {
  const prefBadge = document.getElementById('prefCountBadge');
  const cmpBadge = document.getElementById('compareCountBadge');
  const abroadBadge = document.getElementById('abroadCountBadge');
  if (prefBadge) prefBadge.textContent = String(state.programs.length);
  if (cmpBadge) cmpBadge.textContent = String(state.compareCodes.length);
  if (abroadBadge) abroadBadge.textContent = String(state.abroadPrograms.length);

  const activeNavKey = ui.region === 'ABROAD' ? 'abroad' : ui.tab;
  document.querySelectorAll('#desktopNav .nav-pill-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === activeNavKey);
  });
  document.querySelectorAll('#mobileNav .mobile-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mobileTab === activeNavKey);
  });
  updateDesktopNavThumb({ animate: true });
  updateMobileNavThumb({ animate: true });
  updateCollapsingHeader();
}

let lastRenderedViewKey = '';

function renderAll() {
  renderShareBanner();
  updateHeaderBadges();
  const root = document.getElementById('mainRoot');
  if (!root) return;

  const viewKey = `${ui.region}:${ui.tab}:${ui.tab === 'analysis' ? ui.analysisSubTab : ui.tab === 'compare' ? ui.compareMode : ''}`;
  const viewChanged = lastRenderedViewKey && lastRenderedViewKey !== viewKey;
  lastRenderedViewKey = viewKey;

  const finishRender = () => {
    if (viewChanged) {
      root.classList.remove('view-enter');
      void root.offsetWidth;
      root.classList.add('view-enter');
    }
    initSlidingSegmentedControls();
    renderBatchActionBar();
  };

  if (ui.region === 'ABROAD') {
    root.innerHTML = renderAbroadView(state.abroadPrograms, ui.abroadFilter, state.abroadTools, state.costSettings?.eurTry || 39);
    bindAbroadEvents();
    finishRender();
    return;
  }

  if (ui.tab === 'compare') {
    root.innerHTML = renderCompareView();
    bindCompareEvents();
    finishRender();
    return;
  }

  if (ui.tab === 'analysis') {
    root.innerHTML = renderAnalysisView();
    bindAnalysisEvents();
    bindInteractiveCharts(root);
    finishRender();
    return;
  }

  root.innerHTML = renderPreferencesView();
  bindPreferencesEvents();
  finishRender();
}

function renderScenarioBar() {
  if (ui.readOnlyShare) return '';
  return `<div class="scenario-bar" aria-label="Tercih senaryoları">
    ${state.scenarios
      .map(
        (sc) => `<button class="scenario-pill ${sc.id === state.activeScenarioId ? 'active' : ''}" data-switch-scenario="${escapeHtml(sc.id)}">
          <span>${escapeHtml(sc.name)}</span>
          <span class="tabular" style="opacity:0.75;font-size:11px;">(${sc.programs.length})</span>
        </button>`,
      )
      .join('')}
    <button class="scenario-pill" id="newScenarioBtn" title="Yeni boş senaryo oluştur">${SF.plus} Yeni Plan</button>
    <button class="scenario-pill" id="dupScenarioBtn" title="Aktif planı kopyala">${SF.copy} Kopyala</button>
    <button class="scenario-pill" id="renameScenarioBtn" title="Aktif planı yeniden adlandır">Adlandır</button>
    ${state.scenarios.length > 1 ? `<button class="scenario-pill" id="delScenarioBtn" style="color:var(--rose);" title="Aktif planı sil">${SF.trash}</button>` : ''}
  </div>`;
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
          value="${state.targetRank || ''}" placeholder="15000" aria-label="Hedef sıralama" ${ui.readOnlyShare ? 'disabled' : ''} />
      </div>
      <div class="kpi-sub">Otomatik Hayal / Hedef / Güvenli etiketi</div>
    </div>
  </section>`;
}

function renderPreferencesView() {
  const scoreTypes = [...new Set(state.programs.map((p) => p.scoreType).filter(Boolean))];
  const filtered = getFilteredPrograms();
  const est = estimateYksRankFromNets(state.myNets);
  const reachableCount = est ? state.programs.filter((p) => isProgramCurrentlyReachable(p, est)).length : 0;

  const activeSc = getActiveScenario();
  const daysToYks = getDaysUntil('2027-06-19');
  const prefAudit = state.programs.length >= 2 ? auditPreferenceOrder(state.programs, state.targetRank) : null;
  const headerHtml = `<div class="page-header">
    <div>
      <h1 class="page-title">Tercihlerim</h1>
      <p class="page-status tabular">${escapeHtml(activeSc?.name || 'Plan A')} · ${state.programs.length} / 24 tercih${state.targetRank ? ` · Hedef ${formatRank(state.targetRank)}` : ''}</p>
    </div>
    <div class="actions-menu-wrap" style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
      ${daysToYks > 0
        ? `<button class="countdown-pill-btn tabular" id="openRoadmapShortcutBtn" type="button" title="YKS 2027 & Yurtdışı Takvim">${SF.clock} YKS 2027: ${daysToYks} gün</button>`
        : ''}
      ${prefAudit?.deadPreferences?.length
        ? `<button class="audit-warn-pill" id="openAuditShortcutBtn" type="button" title="Ölü tercih uyarısını incele">${SF.warn} ${prefAudit.deadPreferences.length} Ölü Tercih</button>`
        : ''}
      <button class="btn btn-soft btn-sm" id="openDiscoverShortcutBtn">${SF.sparkles} Keşfet</button>
      ${state.programs.length
        ? `<button class="btn btn-sm" id="prefActionsMenuBtn" aria-haspopup="menu" aria-expanded="false">
            ${ui.refreshBusy
              ? `${SF.refresh} ${escapeHtml(ui.refreshProgressText || 'Güncelleniyor...')}`
              : `<svg class="sf-icon" width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg><span>İşlemler</span>`}
          </button>
          <div class="actions-dropdown" id="prefActionsDropdown" role="menu">
            ${!ui.readOnlyShare
              ? `<button class="ctx-item" id="refreshAllBtn" ${ui.refreshBusy ? 'disabled' : ''}>${SF.refresh} Tümünü Canlı Güncelle</button>
                 <button class="ctx-item" id="openSnapshotsBtn">${SF.clock} Zaman Makinesi (${state.snapshots.length})</button>`
              : ''}
            <button class="ctx-item" id="openPresentationBtn"><svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg> Sunum / Okuma Modu</button>
            <button class="ctx-item" id="exportPngCardBtn">${SF.share} PNG Özet Kartı İndir</button>
            <button class="ctx-item" id="openOsymBtn">${SF.share} ÖSYM AİS & Paylaşım Linki</button>
            <button class="ctx-item" id="printReportBtn">${SF.print} PDF Raporu / Yazdır</button>
            <div class="ctx-sep"></div>
            <button class="ctx-item" id="openShortcutsMenuBtn">${SF.keyboard} Klavye Kısayolları (?)</button>
          </div>`
        : ''}
    </div>
  </div>`;

  const diffBannerHtml = ui.refreshDiff
    ? `<div class="refresh-diff-banner">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <strong style="font-size:13.5px;color:${ui.refreshDiff.changes.length ? 'var(--accent)' : 'var(--green)'};">
            ${SF.check} ${ui.refreshDiff.updatedCount} program canlı YÖK Atlas'tan doğrulandı${ui.refreshDiff.failCount ? ` (${ui.refreshDiff.failCount} hata)` : ''}
          </strong>
          <button class="btn btn-ghost btn-icon btn-sm" id="dismissRefreshDiffBtn" title="Kapat">${SF.close}</button>
        </div>
        ${ui.refreshDiff.changes.length
          ? `<div style="display:flex;flex-direction:column;gap:5px;font-size:12.5px;">
              ${ui.refreshDiff.changes
                .map(
                  (c) => `<div style="padding:6px 10px;border-radius:9px;background:var(--accent-soft);color:var(--text);">
                    <strong>${escapeHtml(c.title)}:</strong> <span class="tabular" style="color:var(--accent);font-weight:600;">${escapeHtml(c.detail)}</span>
                  </div>`,
                )
                .join('')}
            </div>`
          : `<div style="font-size:12.5px;color:var(--text-secondary);">Tüm bölümlerin taban sıralaması ve kontenjanı zaten en güncel kılavuzla eşleşiyor.</div>`}
      </div>`
    : '';

  const scenarioHtml = renderScenarioBar();
  const kpiHtml = renderKpiStrip();

  if (state.programs.length === 0) {
    return `${headerHtml}${diffBannerHtml}${scenarioHtml}${kpiHtml}
    <section class="apple-hero">
      <div class="apple-hero-content">
        <img src="icon-192.png?v=13" alt="TercihAtlas" class="apple-hero-icon" />
        <h2>Bölüm ara veya program kodunu yapıştır.</h2>
        <p>"İTÜ Bilgisayar", "Ankara Devlet Tıp" gibi doğrudan YÖK Atlas'ta ara ya da 9 haneli program kodunu/linkini yapıştır.</p>
        <form class="hero-spotlight" id="heroSpotlightForm">
          <svg class="sf-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7.5"/><path d="m20 20-3.8-3.8"/></svg>
          <input id="heroCodeInput" type="text" placeholder="Örn: İTÜ Bilgisayar veya 102210277..." autocomplete="off" />
          <button class="btn btn-primary btn-sm" type="submit">Ara / Getir</button>
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
        <input id="searchInput" class="input" type="search" value="${escapeHtml(ui.search)}" placeholder="Listemde ara..." />
      </div>

      <div class="filter-pills">
        ${['all', 'hayal', 'hedef', 'guvenli']
          .map((rk) => {
            const label = rk === 'all' ? 'Tümü' : RISK_META[rk].label;
            return `<button class="filter-pill ${ui.filterRisk === rk && !ui.filterReachable ? 'active' : ''}" data-filter-risk="${rk}">${label}</button>`;
          })
          .join('')}
        ${est
          ? `<button class="filter-pill ${ui.filterReachable ? 'active' : ''}" data-filter-reachable="1" title="Mevcut netlerinle şu an girebildiğin bölümler">✓ Şu An Giriyorsun (${reachableCount})</button>`
          : ''}
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
      ${!ui.readOnlyShare
        ? `<button class="btn btn-sm ${ui.selectMode ? 'btn-primary' : ''}" id="toggleSelectModeBtn" type="button" title="Çoklu seçim modu (S)">${ui.selectMode ? `${SF.check} Bitti` : 'Seç'}</button>`
        : ''}
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
          <span>Liste</span>
        </button>
      </div>
    </div>
  </section>`;

  if (!filtered.length) {
    return `${headerHtml}${diffBannerHtml}${scenarioHtml}${kpiHtml}${toolbarHtml}<div class="empty-state" style="padding:40px 24px;">
      <h2>Eşleşen program bulunamadı</h2>
      <p>Arama kelimesini veya seçili filtreyi temizleyerek tüm tercihlerini görebilirsin.</p>
      <button class="btn" id="clearFiltersBtn">Filtreleri Temizle</button>
    </div>`;
  }

  const contentHtml = ui.viewMode === 'table' ? renderTableView(filtered) : renderCardsView(filtered);
  return `${headerHtml}${diffBannerHtml}${scenarioHtml}${kpiHtml}${toolbarHtml}${contentHtml}`;
}

function renderCardsView(programs) {
  const manualMode =
    !ui.readOnlyShare &&
    ui.sortBy === 'manual' &&
    !ui.search &&
    ui.filterRisk === 'all' &&
    ui.filterScoreType === 'all' &&
    !ui.filterReachable;
  const est = estimateYksRankFromNets(state.myNets);
  return `<section class="cards-grid" id="programList">
    ${programs
      .map((p) => {
        const net0 = p.nets?.[0];
        const gap = compareWithMyNets(p, state.myNets);
        const proj = compute2027Projection(p);
        const isCompared = state.compareCodes.includes(p.code);
        const isReachable = isProgramCurrentlyReachable(p, est);
        const riskMeta = RISK_META[p.risk] || RISK_META.hedef;
        const metaParts = [p.scoreType, p.city, p.language, p.scholarship, p.accreditation].filter(Boolean);
        const netSummary = net0
          ? `TYT ${formatNet(net0.tytTotal)} · ${p.scoreType === 'DİL' ? `YDT ${formatNet(net0.ydt)}` : `AYT ${formatNet(net0.aytTotal)}`} net`
          : 'Net verisi yok';

        let netGapChip = '';
        if (gap && (gap.tytDiff !== null || gap.aytDiff !== null)) {
          const totalGap = (gap.tytDiff || 0) + (gap.aytDiff || 0);
          netGapChip = `<span class="${totalGap >= 0 ? 'net-delta-pos' : 'net-delta-neg'} tabular" title="Kendi netlerinle son yerleşen farkı">Sen: ${formatSignedNet(totalGap)} net</span>`;
        }

        const checkDone = PROGRAM_CHECKLIST_ITEMS.filter((it) => p.checklist?.[it.key]).length;
        const medalCls = p._order === 1 ? 'order-gold' : p._order === 2 ? 'order-silver' : p._order === 3 ? 'order-bronze' : '';
        const isSel = ui.selectMode && ui.selectedCodes.has(p.code);
        const isKbd = !ui.selectMode && ui.kbdFocusCode === p.code;

        return `<article class="prog-card ${isSel ? 'is-selected' : ''} ${isKbd ? 'kbd-focused' : ''}" data-code="${escapeHtml(p.code)}" draggable="${manualMode && !ui.selectMode ? 'true' : 'false'}">
          <div class="card-top">
            <div class="card-left-head">
              ${ui.selectMode ? `<span class="select-check-badge">${isSel ? SF.check : ''}</span>` : ''}
              ${renderAvatar(p)}
              <div class="card-titles">
                <div class="card-dept">${escapeHtml(p.department)}</div>
                <div class="card-uni">${escapeHtml(p.university)}</div>
                <div class="card-meta-line">${escapeHtml(metaParts.join(' · '))}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
              <span class="pill pill-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(riskMeta.label)}</span>
              <span class="order-pill ${medalCls} tabular" title="${manualMode ? 'Sürükleyerek sırala' : 'Tercih sıran'}">
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
                <span class="metric-label">2027 Tahmini</span>
                <span class="metric-val-sub tabular" style="color:var(--accent)">${proj ? `${formatRank(proj.low)}–${formatRank(proj.high)}` : '—'}</span>
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
              ${isReachable ? `<span class="reachable-pill">${SF.check} Şu an giriyorsun</span>` : ''}
              <span class="tabular" style="font-weight:500;">${escapeHtml(netSummary)}</span>
              ${netGapChip}
              ${renderStarsInline(p.rating)}
              ${checkDone ? `<span style="font-size:11.5px;color:var(--green);font-weight:600;">${checkDone}/4</span>` : ''}
              ${p.notes ? `<span style="display:inline-flex;align-items:center;gap:4px;color:var(--text-tertiary);" title="Kişisel not var">${SF.note}</span>` : ''}
            </div>
            <div class="card-footer-actions" data-stop-card="1">
              ${manualMode
                ? `<span class="card-reorder-btns">
                     <button class="mini-action mini-action-icon" data-move-up="${escapeHtml(p.code)}" title="Yukarı taşı">${SF.up}</button>
                     <button class="mini-action mini-action-icon" data-move-down="${escapeHtml(p.code)}" title="Aşağı taşı">${SF.down}</button>
                   </span>`
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
  const manualMode =
    !ui.readOnlyShare &&
    ui.sortBy === 'manual' &&
    !ui.search &&
    ui.filterRisk === 'all' &&
    ui.filterScoreType === 'all' &&
    !ui.filterReachable;
  const est = estimateYksRankFromNets(state.myNets);
  return `<section class="apple-grouped-list" id="programList" role="list">
    ${programs
      .map((p) => {
        const proj = compute2027Projection(p);
        const isCompared = state.compareCodes.includes(p.code);
        const isReachable = isProgramCurrentlyReachable(p, est);
        const riskMeta = RISK_META[p.risk] || RISK_META.hedef;
        const medalCls = p._order === 1 ? 'order-gold' : p._order === 2 ? 'order-silver' : p._order === 3 ? 'order-bronze' : '';
        const subMeta = [p.university, p.city, p.scoreType, p.language, p.scholarship].filter(Boolean).join(' · ');
        const isSel = ui.selectMode && ui.selectedCodes.has(p.code);
        const isKbd = !ui.selectMode && ui.kbdFocusCode === p.code;

        return `<div class="apple-list-row ${isSel ? 'is-selected' : ''} ${isKbd ? 'kbd-focused' : ''}" role="listitem" data-code="${escapeHtml(p.code)}" draggable="${manualMode && !ui.selectMode ? 'true' : 'false'}">
          <div class="apple-list-left">
            ${ui.selectMode ? `<span class="select-check-badge">${isSel ? SF.check : ''}</span>` : ''}
            <span class="apple-list-ord ${medalCls} tabular">${String(p._order).padStart(2, '0')}</span>
            ${renderAvatar(p)}
            <div class="apple-list-titles">
              <div class="apple-list-dept">${escapeHtml(p.department)}</div>
              <div class="apple-list-sub">${escapeHtml(subMeta)}</div>
            </div>
          </div>

          <div class="apple-list-right">
            <div class="apple-list-badges">
              <span class="pill pill-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(riskMeta.label)}</span>
              ${isReachable ? `<span class="reachable-pill">${SF.check} Giriyorsun</span>` : ''}
            </div>
            <div class="apple-list-spark">${renderSparkline(p.history, { width: 76, height: 24 })}</div>
            <div class="apple-list-rank-col tabular">
              <div class="apple-list-rank">${formatRank(p.latestRank)}</div>
              <div class="apple-list-proj">${proj ? `27: ${formatRank(proj.low)}–${formatRank(proj.high)}` : `Kont: ${p.quota ?? '—'}`}</div>
            </div>
            <div data-stop-card="1" style="display:flex;align-items:center;gap:6px;">
              <button class="mini-action ${isCompared ? 'active' : ''}" data-toggle-compare="${escapeHtml(p.code)}" title="Karşılaştır">
                ${isCompared ? `${SF.check}` : `${SF.plus}`}
              </button>
              ${SF.chevronRight}
            </div>
          </div>
        </div>`;
      })
      .join('')}
  </section>`;
}

// ============================================================================
// Compare View (Programs Side-by-Side | Scenarios Plan A vs Plan B)
// ============================================================================
function renderScenarioCompareBody() {
  if (state.scenarios.length < 2) {
    return `<div class="empty-state" style="padding:44px 24px;">
      <h2>Kıyaslamak için en az 2 senaryo oluştur</h2>
      <p>Tercihlerim ekranındaki <strong>+ Yeni Plan</strong> veya <strong>Kopyala</strong> butonuyla örneğin "Plan A (İstanbul)" ve "Plan B (Ankara)" oluşturup burada yan yana kıyaslayabilirsin.</p>
      <button class="btn btn-primary" id="cmpCreateSecondScenarioBtn">${SF.plus} İkinci Senaryo Oluştur</button>
    </div>`;
  }

  syncActiveScenarioPointers();
  if (!ui.cmpScenarioA || !state.scenarios.some((s) => s.id === ui.cmpScenarioA)) {
    ui.cmpScenarioA = state.scenarios[0].id;
  }
  if (!ui.cmpScenarioB || !state.scenarios.some((s) => s.id === ui.cmpScenarioB) || ui.cmpScenarioB === ui.cmpScenarioA) {
    ui.cmpScenarioB = (state.scenarios.find((s) => s.id !== ui.cmpScenarioA) || state.scenarios[0]).id;
  }

  const scA = state.scenarios.find((s) => s.id === ui.cmpScenarioA);
  const scB = state.scenarios.find((s) => s.id === ui.cmpScenarioB);
  const cmp = compareScenarios(scA, scB, state.targetRank, state.costSettings);

  const renderCard = (s, selectId, selectedId, otherScore) => {
    const scoreTone = s.healthScore >= 80 ? 'green' : s.healthScore >= 60 ? 'amber' : 'rose';
    return `<div class="scenario-cmp-card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <select id="${selectId}" class="select toolbar-select" style="font-weight:650;font-size:14px;">
          ${state.scenarios
            .map((sc) => `<option value="${escapeHtml(sc.id)}" ${sc.id === selectedId ? 'selected' : ''}>${escapeHtml(sc.name)} (${sc.programs.length})</option>`)
            .join('')}
        </select>
        <span class="pill tabular" style="background:var(--${scoreTone}-soft);color:var(--${scoreTone});font-weight:700;">
          Sağlık: ${s.healthScore}/100${s.healthScore > otherScore ? ' ★' : ''}
        </span>
      </div>

      <div class="scenario-cmp-metrics tabular">
        <div class="ring-stat-tile">
          <span class="ring-stat-title">Tercih Sayısı</span>
          <span class="ring-stat-val">${s.count} <span style="font-size:13px;font-weight:500;color:var(--text-tertiary);">/ 24</span></span>
        </div>
        <div class="ring-stat-tile">
          <span class="ring-stat-title">Ort. 4 Yıllık Bütçe</span>
          <span class="ring-stat-val" style="font-size:17px;">${s.avgFourYearCost ? formatCurrency(s.avgFourYearCost) : '—'}</span>
        </div>
        <div class="ring-stat-tile">
          <span class="ring-stat-title">Sıralama Bandı</span>
          <span class="ring-stat-val" style="font-size:16px;">${s.bestRank ? `${formatRank(s.bestRank)} – ${formatRank(s.worstRank)}` : '—'}</span>
        </div>
        <div class="ring-stat-tile">
          <span class="ring-stat-title">Medyan Sıralama</span>
          <span class="ring-stat-val" style="font-size:17px;">${formatRank(s.medianRank)}</span>
        </div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12.5px;" class="tabular">
        <span class="pill pill-risk-hayal">${s.hayal} Hayal</span>
        <span class="pill pill-risk-hedef">${s.hedef} Hedef</span>
        <span class="pill pill-risk-guvenli">${s.guvenli} Güvenli</span>
        <span class="pill">${s.cityCount} Şehir</span>
      </div>
    </div>`;
  };

  const renderMiniList = (title, items, badgeTone = '') => `
    <div class="panel">
      <div class="panel-title">
        <span>${title}</span>
        <span class="pill ${badgeTone} tabular">${items.length}</span>
      </div>
      ${items.length
        ? `<div class="sim-unlock-list">
            ${items
              .map(
                (p) => `<div class="sim-unlock-row">
                  <div style="min-width:0;">
                    <strong style="font-size:13px;">${escapeHtml(p.department)}</strong>
                    <div style="font-size:11.5px;color:var(--text-secondary);">${escapeHtml(p.university)} · ${escapeHtml(p.city)}</div>
                  </div>
                  <span class="pill pill-risk-${escapeHtml(p.risk || 'hedef')} tabular">${formatRank(p.latestRank)}</span>
                </div>`,
              )
              .join('')}
          </div>`
        : `<div style="font-size:12.5px;color:var(--text-tertiary);">Bu grupta bölüm yok.</div>`}
    </div>`;

  return `
    <section class="scenario-cmp-grid" style="margin-bottom:16px;">
      ${renderCard(cmp.a, 'cmpScenarioASelect', ui.cmpScenarioA, cmp.b.healthScore)}
      ${renderCard(cmp.b, 'cmpScenarioBSelect', ui.cmpScenarioB, cmp.a.healthScore)}
    </section>
    <section class="analysis-grid">
      ${renderMiniList(`Ortak Bölümler (${cmp.common.length})`, cmp.common, 'pill-accent')}
      ${renderMiniList(`Sadece ${escapeHtml(cmp.a.name)}`, cmp.onlyA)}
      ${renderMiniList(`Sadece ${escapeHtml(cmp.b.name)}`, cmp.onlyB)}
    </section>
  `;
}

function renderCompareView() {
  const selected = state.compareCodes.map((code) => state.programs.find((p) => p.code === code)).filter(Boolean);
  const available = state.programs.filter((p) => !state.compareCodes.includes(p.code));

  const headerHtml = `<div class="page-header">
    <div>
      <h1 class="page-title">Karşılaştır</h1>
      <p class="page-status tabular">${ui.compareMode === 'scenarios' ? `${state.scenarios.length} senaryo` : `${selected.length} / 4 bölüm seçili`}</p>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <div class="segmented" role="tablist" aria-label="Karşılaştırma modu">
        <button class="seg-btn seg-btn-sm ${ui.compareMode === 'programs' ? 'active' : ''}" data-cmp-mode="programs">Bölümler</button>
        <button class="seg-btn seg-btn-sm ${ui.compareMode === 'scenarios' ? 'active' : ''}" data-cmp-mode="scenarios">Senaryolar (${state.scenarios.length})</button>
      </div>
      ${ui.compareMode === 'programs' && available.length && selected.length < 4
        ? `<select id="cmpAddSelect" class="select toolbar-select" style="max-width:260px;">
            <option value="">+ Listeden bölüm ekle...</option>
            ${available.map((p) => `<option value="${escapeHtml(p.code)}">${escapeHtml(p.university)} — ${escapeHtml(p.department)}</option>`).join('')}
          </select>`
        : ''}
      ${ui.compareMode === 'programs' && selected.length ? `<button class="btn btn-sm" id="cmpClearBtn">Temizle</button>` : ''}
    </div>
  </div>`;

  if (ui.compareMode === 'scenarios') {
    return `${headerHtml}${renderScenarioCompareBody()}`;
  }

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
      label: 'Son Taban Sıralama',
      render: (p) =>
        `<span class="tabular ${p.latestRank === bestRank ? 'compare-best' : ''}" style="font-family:var(--font-display);font-size:17px;font-weight:700;">${formatRank(p.latestRank)}</span>`,
    },
    {
      label: '2027 Tahmini Bandı',
      render: (p) => {
        const proj = compute2027Projection(p);
        return proj
          ? `<div class="tabular" style="font-weight:650;color:var(--accent)">${formatRank(proj.low)} – ${formatRank(proj.high)}</div><div style="font-size:11.5px;color:var(--text-tertiary);">${escapeHtml(proj.summary)}</div>`
          : '—';
      },
    },
    {
      label: 'Son Taban Puan',
      render: (p) => `<span class="tabular ${p.latestScore === bestScore ? 'compare-best' : ''}">${formatScore(p.latestScore)}</span>`,
    },
    {
      label: '4 Yıllık Trend',
      render: (p) => `<div style="display:flex;flex-direction:column;gap:5px;">${renderSparkline(p.history, { width: 120, height: 32 })}${renderTrendBadge(p)}</div>`,
    },
    { label: 'Kontenjan / Yerleşen', render: (p) => `<span class="tabular">${p.quota ?? '—'} / ${p.placed ?? '—'}</span>` },
    {
      label: 'Ort. Net & Senin Farkın',
      render: (p) => {
        const n = p.nets?.[0];
        if (!n) return '—';
        const gap = compareWithMyNets(p, state.myNets);
        const second = p.scoreType === 'DİL' ? `YDT <strong>${formatNet(n.ydt)}</strong>` : `AYT <strong>${formatNet(n.aytTotal)}</strong>`;
        const gapHtml = gap
          ? `<div style="margin-top:4px;display:flex;gap:5px;flex-wrap:wrap;">
              ${gap.tytDiff !== null ? `<span class="${gap.tytDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}">TYT ${formatSignedNet(gap.tytDiff)}</span>` : ''}
              ${gap.aytDiff !== null ? `<span class="${gap.aytDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}">${gap.isDil ? 'YDT' : 'AYT'} ${formatSignedNet(gap.aytDiff)}</span>` : ''}
            </div>`
          : '';
        return `<div class="tabular">TYT <strong>${formatNet(n.tytTotal)}</strong> · ${second}<div style="font-size:12px;color:var(--text-tertiary);margin-top:2px;">OBP ${formatScore(n.obp)} (${n.year})</div>${gapHtml}</div>`;
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
  ${selected.length >= 2 ? renderCompareRadarChart(selected) : ''}
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
// Analysis Hub (Genel & Sağlık | Harita | Net Simülatörü | Maliyet | Takvim)
// ============================================================================
function renderSimulatorPanel() {
  const est = estimateYksRankFromNets(state.myNets);
  const primaryScoreType = state.programs[0]?.scoreType || 'SAY';
  const estRank = est?.[primaryScoreType]?.rank || est?.SAY?.rank || est?.EA?.rank || null;
  const baseTarget = Number(state.targetRank) || 15000;
  const placementRank = Number(ui.simPlacementRank) || estRank || baseTarget;
  const simPlace = simulateOsymPlacement(state.programs, placementRank);

  // Empirical YKS sensitivity: +1 TYT net improves rank by ~1.9%, +1 AYT net by ~4.4%
  const factor = Math.pow(0.981, ui.simTytBoost) * Math.pow(0.956, ui.simAytBoost);
  const simulatedRank = Math.max(1, Math.round(baseTarget * factor));
  const improvedBy = baseTarget - simulatedRank;

  const evaluated = state.programs.map((p) => {
    const before = suggestRisk(p.latestRank, baseTarget);
    const after = suggestRisk(p.latestRank, simulatedRank);
    const upgraded = (before === 'hayal' && after !== 'hayal') || (before === 'hedef' && after === 'guvenli');
    return { p, before, after, upgraded };
  });

  const unlockedCount = evaluated.filter((e) => e.upgraded).length;

  let verdictHtml = '';
  if (simPlace?.winner) {
    const w = simPlace.winner;
    verdictHtml = `<div class="osym-sim-verdict">
      <div>
        <div style="font-size:12px;font-weight:600;opacity:0.85;">ÖSYM Yerleştirme Tahmini (${formatRank(placementRank)} sıralama ile)</div>
        <strong style="font-size:15.5px;display:inline-flex;align-items:center;gap:6px;">${SF.checkCircle} #${w.order} tercihin olan ${escapeHtml(w.program.university)} — ${escapeHtml(w.program.department)} bölümüne yerleşiyorsun</strong>
      </div>
      <span class="pill pill-risk-guvenli tabular">Son Taban: ${formatRank(w.latest)}</span>
    </div>`;
  } else if (simPlace?.borderlineWinner) {
    const b = simPlace.borderlineWinner;
    verdictHtml = `<div class="osym-sim-verdict warn">
      <div>
        <div style="font-size:12px;font-weight:600;opacity:0.85;">Sınırda Senaryo (${formatRank(placementRank)} sıralama ile)</div>
        <strong style="font-size:15px;display:inline-flex;align-items:center;gap:6px;">${SF.warn} #${b.order} tercihin (${escapeHtml(b.program.university)} — ${escapeHtml(b.program.department)}) sınırda görünüyor</strong>
      </div>
      <span class="pill pill-risk-hedef tabular">Son Taban: ${formatRank(b.latest)}</span>
    </div>`;
  } else if (simPlace) {
    verdictHtml = `<div class="osym-sim-verdict danger">
      <div>
        <div style="font-size:12px;font-weight:600;opacity:0.85;">Açıkta Kalma Riski (${formatRank(placementRank)} sıralama ile)</div>
        <strong style="font-size:15px;display:inline-flex;align-items:center;gap:6px;">${SF.warn} Mevcut listedeki tüm bölümler bu sıralamanın üstünde kapatmış — altına güvenli tercih eklemelisin.</strong>
      </div>
    </div>`;
  }

  return `
    <!-- Feature 2: ÖSYM Placement Simulation -->
    <div class="panel panel-full">
      <div class="panel-title" style="flex-wrap:wrap;gap:10px;">
        <span>ÖSYM Yerleştirme Simülasyonu ("Sıralamam Bu Gelirse Nereye Girerim?")</span>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <input id="simPlacementRankInput" class="input tabular" type="number" min="1" max="3000000" step="500"
            value="${escapeHtml(placementRank)}" placeholder="Sıralaman..." style="width:145px;height:32px;padding:0 12px;font-weight:700;" />
          ${estRank ? `<button class="btn btn-sm" id="useEstRankSimBtn" type="button">Net Tahminimi Kullan (${formatRank(estRank)})</button>` : ''}
          <button class="btn btn-soft btn-sm" id="simExportPngBtn" type="button">${SF.share} Sonucu PNG İndir</button>
        </div>
      </div>

      ${verdictHtml}

      ${simPlace
        ? `<div class="sim-unlock-list">
            ${simPlace.rows
              .map(
                (r) => `<div class="sim-unlock-row ${r.isWinner ? 'winner' : ''}" style="cursor:pointer;" data-open-code="${escapeHtml(r.program.code)}">
                  <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                    <span class="mono" style="font-weight:700;color:${r.isWinner ? 'var(--green)' : 'var(--text-tertiary)'};width:26px;">#${String(r.order).padStart(2, '0')}</span>
                    <div style="min-width:0;">
                      <strong style="font-size:13.5px;">${escapeHtml(r.program.department)}</strong>
                      <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(r.program.university)} · Son Sıra: <strong class="tabular">${formatRank(r.latest)}</strong>${r.proj ? ` · 2027: ${formatRank(r.proj.low)}–${formatRank(r.proj.high)}` : ''}</div>
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                    ${r.isWinner ? `<span class="reachable-pill">${SF.check} Yerleşiyorsun</span>` : ''}
                    <span class="pill" style="background:var(--${r.tone}-soft);color:var(--${r.tone});font-weight:600;">${escapeHtml(r.label)}</span>
                  </div>
                </div>`,
              )
              .join('')}
          </div>`
        : ''}
    </div>

    <!-- Feature #8: Interactive Subject Net Boost -> Unlocked Preferences -->
    ${(() => {
      const boostSt = ui.subjectBoostScoreType || (SUBJECT_BOOST_PRESETS[primaryScoreType] ? primaryScoreType : 'SAY');
      const presets = SUBJECT_BOOST_PRESETS[boostSt] || SUBJECT_BOOST_PRESETS.SAY;
      const deltas = ui.subjectBoostDeltas || {};
      const boostRes = simulateSubjectNetBoost(state.programs, state.myNets, boostSt, deltas);
      const hasBoost = Object.values(deltas).some((v) => Number(v) > 0);
      return `<div class="panel panel-full">
        <div class="panel-title" style="flex-wrap:wrap;gap:8px;">
          <span>"Hangi Dersten +3 Net Hangi Bölümün Kilidini Açar?"</span>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <div class="segmented">
              ${['SAY', 'EA', 'SÖZ', 'DİL']
                .map((st) => `<button class="seg-btn seg-btn-sm ${boostSt === st ? 'active' : ''}" data-boost-st="${st}">${st}</button>`)
                .join('')}
            </div>
            ${hasBoost ? `<button class="btn btn-sm" id="resetSubjectBoostBtn" type="button">Sıfırla</button>` : ''}
          </div>
        </div>
        <p style="font-size:12.5px;color:var(--text-secondary);margin:0 0 12px;">Ders butonlarına dokunarak mevcut netlerinin üstüne ekleme yap; hangi tercihlerinin anında <strong>Yerleşir</strong> bandına geçtiğini gör.</p>
        <div class="subject-boost-grid">
          ${presets
            .map((pr) => {
              const added = Number(deltas[pr.key]) || 0;
              return `<button class="subject-boost-chip ${added > 0 ? 'active' : ''}" type="button" data-boost-key="${escapeHtml(pr.key)}" data-boost-step="${pr.step}">
                <span>${escapeHtml(pr.label)}</span>
                <strong class="tabular">${added > 0 ? `+${added} net` : `+${pr.step}`}</strong>
              </button>`;
            })
            .join('')}
        </div>
        ${boostRes
          ? `<div class="subject-boost-summary">
              <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
                <div>
                  <div style="font-size:11px;color:var(--text-tertiary);font-weight:600;text-transform:uppercase;">Baz Sıralama (${boostSt})</div>
                  <strong class="tabular" style="font-size:16px;">${formatRank(boostRes.baseRank)}</strong>
                </div>
                <span style="font-size:18px;color:var(--accent);font-weight:700;">→</span>
                <div>
                  <div style="font-size:11px;color:var(--text-tertiary);font-weight:600;text-transform:uppercase;">Yeni Tahmini Sıralama</div>
                  <strong class="tabular" style="font-size:17px;color:${boostRes.rankGain > 0 ? 'var(--green)' : 'var(--text)'};">${formatRank(boostRes.boostedRank)}</strong>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                ${boostRes.totalAdded > 0
                  ? `<span class="pill pill-accent tabular">+${boostRes.totalAdded} net (+${boostRes.scoreGain} puan)</span>
                     <span class="pill pill-risk-guvenli tabular">${boostRes.rankGain > 0 ? `${formatRank(boostRes.rankGain)} sıra yükseliş` : 'Sıra sabit'}</span>`
                  : `<span style="font-size:12.5px;color:var(--text-tertiary);">Bir ders seçerek simülasyonu başlat</span>`}
              </div>
            </div>
            ${boostRes.newlyUnlocked.length
              ? `<div class="quota-alert-good" style="margin-bottom:10px;">
                   ${SF.lockOpen} Bu net artışı ile <strong>${boostRes.newlyUnlocked.length} yeni tercihin</strong> kilidi açıldı:
                   ${boostRes.newlyUnlocked.map((r) => `<strong>#${r.order} ${escapeHtml(r.program.university)} (${escapeHtml(r.program.department)})</strong>`).join(', ')}
                 </div>`
              : hasBoost
                ? `<div style="font-size:12.5px;color:var(--text-secondary);">
                     ${boostRes.boostedWinner ? `Mevcut en iyi yerleşim: <strong>#${boostRes.boostedWinner.order} ${escapeHtml(boostRes.boostedWinner.program.university)} — ${escapeHtml(boostRes.boostedWinner.program.department)}</strong>. Bir üst sırayı açmak için biraz daha net ekleyebilirsin.` : 'Henüz yeni bir bölümün kilidi açılmadı — birkaç net daha ekleyerek dene.'}
                   </div>`
                : ''}`
          : `<div style="font-size:12.5px;color:var(--text-tertiary);">Net simülasyonu için üst çubuktaki <strong>Netlerim</strong> penceresinden TYT/AYT netlerini gir.</div>`}
      </div>`;
    })()}

    <div class="panel panel-full">
      <div class="panel-title">
        <span>"Ne Olursa?" Net & Sıralama Simülatörü</span>
        <span class="pill pill-accent tabular">Tahmini Yeni Sıralaman: <strong>${formatRank(simulatedRank)}</strong>${improvedBy > 0 ? ` (+${formatRank(improvedBy)} sıra öne)` : ''}</span>
      </div>

      <div class="sim-grid">
        <div class="sim-slider-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>TYT Net Artışı</strong>
            <span class="pill pill-accent tabular">+${ui.simTytBoost} net</span>
          </div>
          <input id="simTytSlider" class="apple-slider" type="range" min="0" max="25" step="1" value="${ui.simTytBoost}" />
          <span style="font-size:12px;color:var(--text-tertiary);">TYT'de her +1 net ortalama ~%1,9 sıralama avantajı sağlar.</span>
        </div>

        <div class="sim-slider-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>AYT Net Artışı</strong>
            <span class="pill pill-risk-guvenli tabular">+${ui.simAytBoost} net</span>
          </div>
          <input id="simAytSlider" class="apple-slider" type="range" min="0" max="25" step="1" value="${ui.simAytBoost}" />
          <span style="font-size:12px;color:var(--text-tertiary);">AYT'de her +1 net ortalama ~%4,4 sıralama avantajı sağlar (en yüksek kaldıraç).</span>
        </div>
      </div>

      ${unlockedCount
        ? `<div class="quota-alert-good" style="margin-bottom:14px;">Bu artışla listendeki <strong>${unlockedCount}</strong> bölüm bir üst güven bandına geçiyor!</div>`
        : `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">Sürgüleri sağa çekerek hangi <strong>Hayal</strong> bölümlerinin <strong>Hedef</strong>'e açıldığını canlı izle.</div>`}

      <div class="sim-unlock-list">
        ${evaluated
          .map(
            (e) => `<div class="sim-unlock-row ${e.upgraded ? 'upgraded' : ''}">
              <div style="min-width:0;">
                <strong style="font-size:13.5px;">${escapeHtml(e.p.department)}</strong>
                <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(e.p.university)} · Son Sıra: <strong class="tabular">${formatRank(e.p.latestRank)}</strong></div>
              </div>
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                <span class="pill pill-risk-${e.before}">${RISK_META[e.before].label}</span>
                ${e.upgraded ? `<span style="font-weight:700;color:var(--green);">→</span><span class="pill pill-risk-${e.after}">${RISK_META[e.after].label}</span>` : ''}
              </div>
            </div>`,
          )
          .join('')}
      </div>
    </div>
  `;
}

function renderProgressionPanel() {
  const est = estimateYksRankFromNets(state.myNets);
  const reachableCount = est ? state.programs.filter((p) => isProgramCurrentlyReachable(p, est)).length : 0;
  const scoreTypes = ['SAY', 'EA', 'SÖZ', 'DİL'].filter((k) => est?.[k]);

  const topProg = state.programs[0];
  const topNet0 = topProg?.nets?.[0];
  const targetNet =
    ui.progressionType === 'TYT'
      ? topNet0?.tytTotal ?? null
      : topProg?.scoreType === 'DİL'
        ? topNet0?.ydt ?? null
        : topNet0?.aytTotal ?? null;
  const targetLabel = topProg ? `${topProg.university}` : '';

  const typedExams = (state.examHistory || [])
    .filter((e) => e.examType === ui.progressionType && Number.isFinite(Number(e.total)))
    .reverse();
  const delta =
    typedExams.length >= 2
      ? Number((Number(typedExams[typedExams.length - 1].total) - Number(typedExams[0].total)).toFixed(2))
      : null;

  const rings = computeGoalRingsAndWeeklyPlan(state.programs, state.myNets);
  const leverage = analyzeSubjectLeverage(state.myNets, state.examHistory, topProg, state.targetRank);
  const prs = computeExamPersonalRecords(state.examHistory);
  const hasPrs = Boolean(prs.bestTyt || prs.bestAyt || prs.bestInstRank);

  return `
    <!-- Feature 3: Apple Fitness Activity Rings & YKS 2027 Weekly Net Planner -->
    <div class="panel panel-full">
      <div class="panel-title">
        <span>YKS 2027 Hedef Halkaları & Haftalık Plan</span>
        <span class="pill pill-accent tabular">YKS 2027'ye ${rings.weeksLeft} hafta (${rings.daysLeft} gün)</span>
      </div>
      <div class="rings-layout">
        ${renderAppleActivityRings({ tytPct: rings.tytPct, aytPct: rings.aytPct, researchPct: rings.researchPct })}
        <div class="rings-legend">
          <div class="ring-stat-tile">
            <span class="ring-stat-title"><span class="dot" style="background:#0071E3"></span>TYT Hedefi</span>
            <span class="ring-stat-val tabular" style="color:#0071E3;">%${rings.tytPct}</span>
            <div style="font-size:11.5px;color:var(--text-secondary);" class="tabular">
              ${rings.myTyt !== null ? `${formatNet(rings.myTyt)} / ${formatNet(rings.targetTyt)} net` : 'TYT neti girilmedi'}
            </div>
            ${rings.tytPerWeek !== null && rings.tytPerWeek > 0
              ? `<div style="font-size:11.5px;color:var(--accent);font-weight:600;" class="tabular">Haftalık +${formatNet(rings.tytPerWeek)} net</div>`
              : rings.myTyt !== null
                ? `<div style="font-size:11.5px;color:var(--green);font-weight:600;">✓ Hedef netin üstündesin</div>`
                : ''}
          </div>

          <div class="ring-stat-tile">
            <span class="ring-stat-title"><span class="dot" style="background:#34C759"></span>${rings.isDil ? 'YDT' : 'AYT'} Hedefi</span>
            <span class="ring-stat-val tabular" style="color:#248A3D;">%${rings.aytPct}</span>
            <div style="font-size:11.5px;color:var(--text-secondary);" class="tabular">
              ${rings.myAyt !== null ? `${formatNet(rings.myAyt)} / ${formatNet(rings.targetAyt)} net` : `${rings.isDil ? 'YDT' : 'AYT'} neti girilmedi`}
            </div>
            ${rings.aytPerWeek !== null && rings.aytPerWeek > 0
              ? `<div style="font-size:11.5px;color:var(--green);font-weight:600;" class="tabular">Haftalık +${formatNet(rings.aytPerWeek)} net</div>`
              : rings.myAyt !== null
                ? `<div style="font-size:11.5px;color:var(--green);font-weight:600;">✓ Hedef netin üstündesin</div>`
                : ''}
          </div>

          <div class="ring-stat-tile">
            <span class="ring-stat-title"><span class="dot" style="background:#FF9F0A"></span>Bölüm Araştırması</span>
            <span class="ring-stat-val tabular" style="color:var(--amber);">%${rings.researchPct}</span>
            <div style="font-size:11.5px;color:var(--text-secondary);" class="tabular">${rings.doneChecks} / ${rings.totalChecks} madde tamam</div>
            <div style="font-size:11.5px;color:var(--text-tertiary);">${rings.topProg ? `Hedef: ${escapeHtml(rings.topProg.university)}` : '1. tercih eklenmedi'}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel panel-full">
      <div class="panel-title">
        <span>Mevcut Netlerinle Tahmini YKS Sıralaman</span>
        <button class="btn btn-sm" id="progOpenNetsBtn">Netlerim / PDF Yükle</button>
      </div>
      ${est && scoreTypes.length
        ? `<div class="detail-hero-metrics tabular" style="margin-bottom:10px;">
            ${scoreTypes
              .map(
                (st) => `<div class="detail-metric-tile">
                  <span>Tahmini Y-${st} Sıralama</span>
                  <strong style="color:var(--accent)">${formatRank(est[st].rank)}</strong>
                  <div style="font-size:12px;color:var(--text-tertiary);margin-top:3px;">~${formatScore(est[st].score)} puan</div>
                </div>`,
              )
              .join('')}
            ${state.programs.length
              ? `<div class="detail-metric-tile">
                  <span>Şu An Girdiğin Tercih</span>
                  <strong style="color:var(--green)">${reachableCount} <span style="font-size:15px;font-weight:500;color:var(--text-tertiary)">/ ${state.programs.length}</span></strong>
                  <div style="font-size:12px;color:var(--text-tertiary);margin-top:3px;">%5 güven bandı dahil</div>
                </div>`
              : ''}
          </div>
          <div style="font-size:12px;color:var(--text-tertiary);">
            OBP ${est.obpUsed}${est.obpEstimated ? ' (varsayılan, Netlerim penceresinden kendi OBP\'ni girebilirsin)' : ''} üzerinden YÖK Atlas katsayılarıyla tahmin edilir.
          </div>`
        : `<div class="chart-empty" style="margin-top:6px;">
            Tahmini Türkiye sıralamanı ve <strong>"Şu An Giriyorsun"</strong> rozetlerini görmek için <strong>Netlerim & PDF</strong> penceresinden TYT + AYT netlerini gir veya dershane deneme PDF'ini yükle.
          </div>`}
    </div>

    <div class="panel panel-full">
      <div class="panel-title" style="flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span>Deneme Net Gelişim Grafiği</span>
          ${delta !== null
            ? `<span class="${delta >= 0 ? 'net-delta-pos' : 'net-delta-neg'} tabular">${delta >= 0 ? '+' : ''}${formatNet(delta)} net gelişim (${typedExams.length} deneme)</span>`
            : ''}
        </div>
        <div class="segmented" role="tablist" aria-label="Sınav türü">
          <button class="seg-btn seg-btn-sm ${ui.progressionType === 'TYT' ? 'active' : ''}" data-prog-type="TYT">TYT</button>
          <button class="seg-btn seg-btn-sm ${ui.progressionType === 'AYT' ? 'active' : ''}" data-prog-type="AYT">AYT</button>
        </div>
      </div>
      ${hasPrs
        ? `<div class="pr-strip tabular" style="margin-bottom:12px;">
            <div class="pr-tile">
              <span>🏆 En Yüksek TYT (PR)</span>
              <strong>${prs.bestTyt ? `${formatNet(prs.bestTyt.total)} net` : '—'}</strong>
              <small>${escapeHtml(prs.bestTyt?.examName || 'TYT PDF bekleniyor')}</small>
            </div>
            <div class="pr-tile">
              <span>🏆 En Yüksek AYT (PR)</span>
              <strong>${prs.bestAyt ? `${formatNet(prs.bestAyt.total)} net` : '—'}</strong>
              <small>${escapeHtml(prs.bestAyt?.examName || 'AYT PDF bekleniyor')}</small>
            </div>
            <div class="pr-tile">
              <span>🏆 En İyi Kurum Sırası</span>
              <strong>${prs.bestInstRank ? `#${prs.bestInstRank.rank}${prs.bestInstRank.totalParticipants ? ` / ${prs.bestInstRank.totalParticipants}` : ''}` : '—'}</strong>
              <small>${escapeHtml(prs.bestInstRank?.examName || 'Kurum sıralı PDF bekleniyor')}</small>
            </div>
          </div>`
        : ''}
      ${renderExamProgressionChart(state.examHistory, {
        examType: ui.progressionType,
        targetNet,
        targetLabel,
      })}
      ${topProg && targetNet
        ? `<div style="font-size:12px;color:var(--text-tertiary);margin-top:8px;">Turuncu kesikli çizgi, 1. tercihin olan <strong>${escapeHtml(topProg.university)} — ${escapeHtml(topProg.department)}</strong> son yerleşen ortalama ${ui.progressionType} netini (${formatNet(targetNet)}) gösterir.</div>`
        : ''}
    </div>

    <!-- Feature 1: Subject-Level Weak Link & Leverage Analysis -->
    <div class="panel panel-full">
      <div class="panel-title" style="flex-wrap:wrap;gap:8px;">
        <span>Ders Bazlı Zayıf Halka & Kaldıraç Analizi</span>
        <span style="font-size:12px;font-weight:500;color:var(--text-tertiary);">
          ${topProg ? `Referans: 1. Tercih (${escapeHtml(topProg.university)})` : '1. tercih ekleyince hedef farkı hesaplanır'}
        </span>
      </div>
      ${leverage.priority
        ? `<div class="quota-alert-warn" style="margin-bottom:12px;">
            ⚡ <strong>En Yüksek Kaldıraç: ${escapeHtml(leverage.priority.label)}</strong> — Hedefinin <strong class="tabular">${formatNet(Math.abs(leverage.priority.gap))} net</strong> gerisindesin. Bu açığı kapatmak sıralamanı tahmini <strong class="tabular">+${formatRank(leverage.priority.rankGain)} sıra</strong> öne çeker!
          </div>`
        : ''}
      ${leverage.subjects.length
        ? `<div class="subject-leverage-grid">
            ${leverage.subjects
              .map((s) => {
                const isPri = leverage.priority && leverage.priority.key === s.key;
                const gapHtml =
                  s.gap !== null
                    ? `<span class="${s.gap >= 0 ? 'net-delta-pos' : 'net-delta-neg'} tabular">${formatSignedNet(s.gap)} net</span>`
                    : '';
                return `<div class="subject-lev-card ${isPri ? 'priority' : ''}">
                  <div style="min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                      <strong style="font-size:13px;">${escapeHtml(s.label)}</strong>
                      ${gapHtml}
                    </div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-top:3px;" class="tabular">
                      Sen: <strong>${s.current !== null ? formatNet(s.current) : '—'}</strong> / ${s.max}
                      ${s.target !== null ? ` · Hedef: <strong>${formatNet(s.target)}</strong>` : ''}
                      ${s.avg !== null && s.history.length >= 2 ? ` · Ort: ${formatNet(s.avg)}` : ''}
                    </div>
                    ${s.rankGain > 0 ? `<div style="font-size:11.5px;color:var(--amber);font-weight:600;margin-top:2px;" class="tabular">Kapanırsa ≈ +${formatRank(s.rankGain)} sıra</div>` : ''}
                  </div>
                  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;">
                    ${renderMiniNetSparkline(s.history)}
                    ${s.history.length >= 2 ? `<span style="font-size:10.5px;color:var(--text-tertiary);">${s.history.length} deneme</span>` : ''}
                  </div>
                </div>`;
              })
              .join('')}
          </div>`
        : `<div class="chart-empty">Ders bazlı kıyaslama için <strong>Netlerim / PDF</strong> penceresinden TYT veya AYT denemeni yükle.</div>`}
    </div>
  `;
}

// ============================================================================
// Feature 2: "Sıralamamla Nereye Girerim?" Live YÖK Atlas Discovery Wizard
// ============================================================================
async function runDiscoverSearch() {
  const est = estimateYksRankFromNets(state.myNets);
  const pt = ui.discover.puanTuru || 'SAY';
  const defaultRank = est?.[pt]?.rank || state.targetRank || 20000;
  const rank = Math.max(100, Number(ui.discover.rank) || defaultRank);
  ui.discover.rank = rank;
  ui.discover.loading = true;
  ui.discover.error = '';
  renderAll();

  try {
    const common = {
      q: ui.discover.q.trim(),
      puanTuru: pt,
      uniTuru: ui.discover.uniTuru || '',
      size: 12,
    };

    const [hayalRes, hedefRes, guvRes] = await Promise.all([
      searchProgramsFromApi({
        ...common,
        minRank: Math.max(1, Math.round(rank * 0.45)),
        maxRank: Math.max(50, Math.round(rank * 0.82)),
      }),
      searchProgramsFromApi({
        ...common,
        minRank: Math.max(1, Math.round(rank * 0.82)),
        maxRank: Math.round(rank * 1.25),
      }),
      searchProgramsFromApi({
        ...common,
        minRank: Math.round(rank * 1.25),
        maxRank: Math.round(rank * 2.15),
      }),
    ]);

    ui.discover.bands = {
      usedRank: rank,
      hayal: hayalRes.items || [],
      hedef: hedefRes.items || [],
      guvenli: guvRes.items || [],
    };
  } catch (err) {
    ui.discover.error = err.message || 'YÖK Atlas keşif sorgusu başarısız oldu.';
    ui.discover.bands = null;
  } finally {
    ui.discover.loading = false;
    renderAll();
  }
}

function renderDiscoverPanel() {
  const est = estimateYksRankFromNets(state.myNets);
  const pt = ui.discover.puanTuru || 'SAY';
  const suggestedRank = ui.discover.rank || est?.[pt]?.rank || state.targetRank || 15000;
  const bands = ui.discover.bands;

  const renderBandCol = (title, riskKey, items, hint) => `
    <div class="discover-band-col">
      <div class="discover-band-head">
        <div>
          <span class="pill pill-risk-${riskKey}">${title}</span>
          <div style="font-size:11.5px;color:var(--text-tertiary);margin-top:4px;">${hint}</div>
        </div>
        <span class="tabular" style="font-size:12px;font-weight:700;color:var(--text-secondary);">${items.length}</span>
      </div>
      ${items.length
        ? items
            .map((item) => {
              const exists = state.programs.some((p) => p.code === item.code);
              return `<div class="discover-item">
                <div style="display:flex;align-items:center;gap:9px;min-width:0;">
                  ${renderAvatar(item)}
                  <div style="min-width:0;flex:1;">
                    <div style="font-weight:650;font-size:13px;line-height:1.25;">${escapeHtml(item.department)}</div>
                    <div style="font-size:11.5px;color:var(--text-secondary);">${escapeHtml(item.university)}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                  <div class="tabular" style="font-size:12px;">
                    <strong>${formatRank(item.latestRank)}</strong>
                    <span style="color:var(--text-tertiary);"> · ${escapeHtml(item.city)} · ${escapeHtml(item.language)}</span>
                  </div>
                  <button class="btn btn-sm ${exists ? 'btn-soft' : 'btn-primary'}" data-disc-add="${escapeHtml(item.code)}" data-disc-risk="${riskKey}" style="height:27px;padding:0 10px;font-size:11.5px;">
                    ${exists ? `${SF.check} Var` : `${SF.plus} Ekle`}
                  </button>
                </div>
              </div>`;
            })
            .join('')
        : `<div style="font-size:12px;color:var(--text-tertiary);padding:8px 2px;">Bu bantta eşleşen bölüm bulunamadı.</div>`}
    </div>`;

  return `
    <div class="panel panel-full">
      <div class="panel-title" style="flex-wrap:wrap;gap:8px;">
        <div>
          <span>"Sıralamamla Nereye Girerim?" Canlı YÖK Atlas Keşif Sihirbazı</span>
          <div style="font-size:12.5px;font-weight:400;color:var(--text-secondary);margin-top:2px;">
            Sıralamana göre canlı YÖK Atlas'tan otomatik <strong>Hayal / Hedef / Güvenli</strong> öneri bantları oluşturur.
          </div>
        </div>
        ${est?.[pt] ? `<span class="pill pill-accent tabular">Netlerinden tahmini ${pt}: ${formatRank(est[pt].rank)}</span>` : ''}
      </div>

      <form id="discoverForm" class="discover-form-grid">
        <div>
          <label class="field-label" for="discQuery">Bölüm veya Şehir</label>
          <input id="discQuery" class="input" type="text" value="${escapeHtml(ui.discover.q)}" placeholder="Örn: Bilgisayar, Tıp, İstanbul Endüstri..." />
        </div>
        <div>
          <label class="field-label" for="discRank">Baz Sıralama</label>
          <input id="discRank" class="input tabular" type="number" min="100" step="500" value="${escapeHtml(suggestedRank)}" />
        </div>
        <div>
          <label class="field-label" for="discPuan">Puan Türü</label>
          <select id="discPuan" class="select">
            ${['SAY', 'EA', 'SÖZ', 'DİL'].map((t) => `<option value="${t}" ${pt === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="field-label" for="discUniType">Üniversite</label>
          <select id="discUniType" class="select">
            <option value="" ${!ui.discover.uniTuru ? 'selected' : ''}>Devlet + Vakıf</option>
            <option value="DEVLET" ${ui.discover.uniTuru === 'DEVLET' ? 'selected' : ''}>Sadece Devlet</option>
            <option value="VAKIF" ${ui.discover.uniTuru === 'VAKIF' ? 'selected' : ''}>Sadece Vakıf</option>
          </select>
        </div>
        <button class="btn btn-primary" type="submit" ${ui.discover.loading ? 'disabled' : ''}>
          ${ui.discover.loading ? 'Taranıyor...' : 'Önerileri Getir'}
        </button>
      </form>

      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;">
        ${['Bilgisayar', 'Elektrik-Elektronik', 'Endüstri', 'Makine', 'Tıp', 'Yapay Zeka', 'Ekonomi', 'Hukuk']
          .map((chip) => `<button type="button" class="quick-chip" data-disc-chip="${chip}">${chip}</button>`)
          .join('')}
      </div>

      ${ui.discover.error ? `<div class="error-banner" style="margin-top:14px;">${escapeHtml(ui.discover.error)}</div>` : ''}
      ${ui.discover.loading ? `<div style="margin-top:16px;">${renderShimmerSkeleton(4)}</div>` : ''}
      ${!ui.discover.loading && bands
        ? `<div class="discover-bands">
            ${renderBandCol('Hayal Bandı', 'hayal', bands.hayal, `${formatRank(Math.max(1, Math.round(bands.usedRank * 0.45)))} – ${formatRank(Math.round(bands.usedRank * 0.82))}`)}
            ${renderBandCol('Hedef Bandı', 'hedef', bands.hedef, `${formatRank(Math.round(bands.usedRank * 0.82))} – ${formatRank(Math.round(bands.usedRank * 1.25))}`)}
            ${renderBandCol('Güvenli Bandı', 'guvenli', bands.guvenli, `${formatRank(Math.round(bands.usedRank * 1.25))} – ${formatRank(Math.round(bands.usedRank * 2.15))}`)}
          </div>`
        : ''}
    </div>
  `;
}

function renderDecisionRankedListHtml(ranked) {
  return ranked
    .map((item, idx) => {
      const p = item.program;
      const b = item.breakdown;
      const tone = item.fitScore >= 75 ? 'var(--green)' : item.fitScore >= 55 ? 'var(--accent)' : 'var(--amber)';
      return `<div class="sim-unlock-row" style="cursor:pointer;" data-open-code="${escapeHtml(p.code)}">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
          <span class="mono" style="font-weight:700;color:var(--text-tertiary);width:26px;">#${String(idx + 1).padStart(2, '0')}</span>
          ${renderAvatar(p)}
          <div style="min-width:0;">
            <strong style="font-size:14px;">${escapeHtml(p.department)}</strong>
            <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(p.university)} · ${escapeHtml(p.city)} · <span class="tabular">${formatRank(p.latestRank)}</span></div>
            <div style="font-size:11.5px;color:var(--text-tertiary);margin-top:2px;" class="tabular">
              Sıra ${b.rankScore} · Kadro ${b.academicScore} · Dil ${b.languageScore} · Maliyet ${b.costScore} · Kişisel ${b.personalScore}
            </div>
          </div>
        </div>
        <span class="fit-score-pill tabular" style="color:${tone};">${item.fitScore}<span style="font-size:11px;font-weight:500;opacity:0.7;">/100</span></span>
      </div>`;
    })
    .join('');
}

function renderDecisionScorePanel() {
  const w = { ...DEFAULT_DECISION_WEIGHTS, ...(state.decisionWeights || {}) };
  const ranked = computeDecisionScores(state.programs, w, state.costSettings);
  const weightItems = [
    { key: 'rank', label: 'Sıralama & Prestij' },
    { key: 'academic', label: 'Kadro & Akreditasyon' },
    { key: 'language', label: 'Yabancı Dil' },
    { key: 'cost', label: 'Bütçe / Maliyet' },
    { key: 'personal', label: 'Yıldız & Artı/Eksi' },
  ];

  return `
    <div class="panel panel-full">
      <div class="panel-title" style="flex-wrap:wrap;gap:10px;">
        <div>
          <span>Ağırlıklı Kişisel Karar Skoru (Fit Score)</span>
          <div style="font-size:12.5px;font-weight:400;color:var(--text-secondary);margin-top:2px;">Senin için hangi kriter daha önemliyse ağırlığını artır; tüm tercihlerin 0–100 arası puanlansın.</div>
        </div>
        ${!ui.readOnlyShare
          ? `<button class="btn btn-primary btn-sm" id="applyDecisionOrderBtn">${SF.check} Tercih Sıramı Bu Skora Göre Diz</button>`
          : ''}
      </div>

      <div class="weights-grid">
        ${weightItems
          .map(
            (it) => `<div class="sim-slider-card">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong style="font-size:12.5px;">${it.label}</strong>
                <span class="pill pill-accent tabular" id="weightVal_${it.key}">${w[it.key]}</span>
              </div>
              <input class="apple-slider" type="range" min="0" max="50" step="5" value="${w[it.key]}" data-weight-key="${it.key}" />
            </div>`,
          )
          .join('')}
      </div>

      <div class="sim-unlock-list" id="decisionRankedList" style="margin-top:16px;">
        ${renderDecisionRankedListHtml(ranked)}
      </div>
    </div>
  `;
}

function renderAnalysisView() {
  const analysisTabs = [
    ['overview', 'Sağlık & Özet', '<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 21s-7-4.5-7-10.2A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 7 3.3C19 16.5 12 21 12 21z"/></svg>'],
    ['progression', 'Gelişim', '<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 7-8"/></svg>'],
    ['discover', 'Keşfet', '<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><polygon points="15.5 8.5 13.5 13.5 8.5 15.5 10.5 10.5 15.5 8.5"/></svg>'],
    ['decision', 'Karar Skoru', '<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2" fill="currentColor"/><circle cx="15" cy="12" r="2" fill="currentColor"/><circle cx="11" cy="17" r="2" fill="currentColor"/></svg>'],
    ['map', 'Harita', '<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 21s-6-5.5-6-10a6 6 0 1 1 12 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>'],
    ['simulator', 'Simülatör', '<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M13 2 3 14h8l-1 8 10-12h-8l1-8z"/></svg>'],
    ['cost', 'Maliyet', '<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/></svg>'],
    ['timeline', 'Takvim', '<svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>'],
  ];

  const activeTabInfo = analysisTabs.find(([k]) => k === ui.analysisSubTab);
  const headerHtml = `<div class="page-header">
    <div>
      <h1 class="page-title">Analiz</h1>
      <p class="page-status tabular">${escapeHtml(activeTabInfo?.[1] || 'Genel')} · ${state.programs.length} tercih</p>
    </div>
    <div class="analysis-tabs-scroll">
      <div class="segmented" role="tablist" aria-label="Analiz alt sekmeleri">
        ${analysisTabs
          .map(
            ([k, lbl, icon]) =>
              `<button class="seg-btn seg-btn-sm ${ui.analysisSubTab === k ? 'active' : ''}" data-analysis-sub="${k}">${icon}<span>${lbl}</span></button>`,
          )
          .join('')}
      </div>
    </div>
  </div>`;

  if (ui.analysisSubTab === 'progression') {
    return `${headerHtml}<section class="analysis-grid">${renderProgressionPanel()}</section>`;
  }

  if (ui.analysisSubTab === 'discover') {
    return `${headerHtml}<section class="analysis-grid">${renderDiscoverPanel()}</section>`;
  }

  if (ui.analysisSubTab === 'timeline') {
    return `${headerHtml}<section class="analysis-grid">${renderRoadmapPanelHtml(state)}${renderTimelineView(state.abroadPrograms)}</section>`;
  }

  if (ui.analysisSubTab === 'cost') {
    return `${headerHtml}<section class="analysis-grid">${renderCostCalculator(state.programs, state.abroadPrograms, state.costSettings)}</section>`;
  }

  if (!state.programs.length) {
    return `${headerHtml}<div class="empty-state">
      <h2>Analiz için program ekle</h2>
      <p>Listene eklediğin bölümlerin ÖSYM sağlık kontrolü, ağırlıklı karar skoru, kampüs haritası ve net simülatörü burada otomatik oluşur.</p>
      <button class="btn btn-primary" id="analysisAddBtn">${SF.plus} Program Ekle</button>
    </div>`;
  }

  if (ui.analysisSubTab === 'decision') {
    return `${headerHtml}<section class="analysis-grid">${renderDecisionScorePanel()}</section>`;
  }

  if (ui.analysisSubTab === 'map') {
    return `${headerHtml}<section class="analysis-grid">${renderTurkeyCampusMap(state.programs, ui.selectedMapCity)}</section>`;
  }

  if (ui.analysisSubTab === 'simulator') {
    return `${headerHtml}<section class="analysis-grid">${renderSimulatorPanel()}</section>`;
  }

  const health = analyzePreferenceHealth(state.programs, state.targetRank);
  const orderAudit = auditPreferenceOrder(state.programs, state.targetRank);
  const scoreTone = health.score >= 80 ? 'green' : health.score >= 60 ? 'amber' : 'rose';
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
      <div class="health-panel-head">
        <div>
          <h3 class="panel-title" style="margin:0;">ÖSYM Tercih Listesi Sağlık Kontrolü</h3>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:3px;">Sıralama akışı, ölü tercih riski, güvenli bant genişliği ve kontenjan değişimleri otomatik denetlenir.</div>
        </div>
        <div class="health-score-badge tabular" style="background:var(--${scoreTone}-soft);color:var(--${scoreTone});">
          ${health.score}<span style="font-size:13px;font-weight:500;opacity:0.8;">/ 100</span>
        </div>
      </div>
      <div class="health-alerts">
        ${health.alerts
          .map(
            (a) => `<div class="health-alert ${a.level}">
              <strong>${escapeHtml(a.title)}</strong>
              <span>${escapeHtml(a.detail)}</span>
            </div>`,
          )
          .join('')}
      </div>
    </div>

    <!-- Feature #6: Dead Preference & Rank Gap Auditor -->
    <div class="panel panel-full">
      <div class="panel-title" style="flex-wrap:wrap;gap:10px;">
        <span>Ölü Tercih & Sıralama Boşluğu (Gap) Denetçisi</span>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          ${orderAudit.healthy
            ? `<span class="pill pill-risk-guvenli">✓ Ölü Tercih & Kritik Boşluk Yok</span>`
            : `<span class="pill pill-risk-hayal">${orderAudit.issueCount} bulgu tespit edildi</span>`}
          ${orderAudit.deadPreferences.length && !ui.readOnlyShare
            ? `<button class="btn btn-primary btn-sm" id="autoFixOrderBtn" type="button">${SF.sparkles} Sıralamayı Otomatik Düzelt</button>`
            : ''}
        </div>
      </div>

      ${orderAudit.healthy
        ? `<div style="font-size:13px;color:var(--text-secondary);">Tercih merdivenin ÖSYM yerleştirme kuralına tam uyumlu: ölü tercih, tehlikeli sıralama uçurumu veya emniyet açığı görünmüyor.</div>`
        : `<div class="audit-issue-list">
            ${orderAudit.deadPreferences
              .map(
                (dp) => `<div class="audit-issue-card dead">
                  <div style="font-size:13.5px;font-weight:650;color:var(--rose);display:flex;align-items:center;gap:6px;">
                    ${SF.warn} Ölü Tercih: #${dp.blockerOrder} (${escapeHtml(dp.blocker.university)} · ${formatRank(dp.blockerRank)}) üstteyken #${dp.blockedOrder} (${escapeHtml(dp.blocked.university)} · ${formatRank(dp.blockedRank)}) değerlendirilmeyebilir
                  </div>
                  <div style="font-size:12.5px;color:var(--text-secondary);">
                    ÖSYM yukarıdan aşağıya yerleştirir; #${dp.blockerOrder} tercihinin gelmesi durumunda daha yüksek tabanlı #${dp.blockedOrder} hiç denenmez.
                  </div>
                </div>`,
              )
              .join('')}
            ${orderAudit.rankGaps
              .map(
                (gp, idx) => `<div class="audit-issue-card gap">
                  <div style="font-size:13.5px;font-weight:650;color:var(--amber);display:flex;align-items:center;gap:6px;">
                    ${SF.trendDown} Sıralama Uçurumu: #${gp.fromOrder} (${formatRank(gp.lowRank)}) → #${gp.toOrder} (${formatRank(gp.highRank)}) arasında ${gp.ratio}× boşluk var
                  </div>
                  <div style="font-size:12.5px;color:var(--text-secondary);">
                    ${escapeHtml(gp.fromProgram.university)} ile ${escapeHtml(gp.toProgram.university)} arasındaki bandı dengelemek için 12.239 programlık katalogdan öneriler:
                  </div>
                  <div class="gap-fillers-row" id="gapFillers_${idx}" data-gap-low="${gp.lowRank}" data-gap-high="${gp.highRank}">
                    <span style="font-size:12px;color:var(--text-tertiary);">Öneriler yükleniyor...</span>
                  </div>
                </div>`,
              )
              .join('')}
            ${orderAudit.safetyWarning
              ? `<div class="audit-issue-card dead">
                  <div style="font-size:13.5px;font-weight:650;color:var(--rose);display:flex;align-items:center;gap:6px;">${SF.shield} Güvenlik Ağı Uyarısı</div>
                  <div style="font-size:12.5px;color:var(--text-secondary);">${escapeHtml(orderAudit.safetyWarning.text)}</div>
                </div>`
              : ''}
          </div>`}
    </div>

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
// Large Centered Apple Sheet Window (Program Detail View)
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

function stepDrawerProgram(delta) {
  if (!ui.drawerCode) return;
  const list = getFilteredPrograms();
  const pool = list.length ? list : state.programs;
  const idx = pool.findIndex((item) => item.code === ui.drawerCode);
  if (idx === -1 || pool.length < 2) return;
  const next = pool[(idx + delta + pool.length) % pool.length];
  if (!next) return;
  ui.drawerCode = next.code;
  ui.drawerNetYear = next.nets?.[0]?.year || null;
  renderDrawer({ animateSwap: true });
}

function renderDrawer({ animateSwap = false } = {}) {
  const container = document.getElementById('drawerContent');
  const p = state.programs.find((item) => item.code === ui.drawerCode);
  if (!container || !p) return;

  const list = getFilteredPrograms();
  const pool = list.length ? list : state.programs;
  const curIdx = pool.findIndex((item) => item.code === p.code);

  document.getElementById('detailDrawer')?.setAttribute('data-risk', p.risk || 'hedef');

  const activeNet = p.nets?.find((n) => n.year === ui.drawerNetYear) || p.nets?.[0] || null;
  const aytFields = getAytFieldsForScoreType(p.scoreType);
  const staff = p.academicStaff || {};
  const proj = compute2027Projection(p);
  const gap = compareWithMyNets(p, state.myNets);
  const metaLine = [p.scoreType, p.language, p.scholarship, p.tuition ? formatCurrency(p.tuition) : null].filter(Boolean).join(' · ');

  const renderNetBars = (fields, valuesObj, diffMap = {}, fillColor = 'var(--accent)') =>
    fields
      .map((f) => {
        const val = valuesObj?.[f.key];
        const pct = val !== null && val !== undefined ? Math.min(100, Math.max(0, (val / f.max) * 100)) : 0;
        const diff = diffMap?.[f.key];
        const diffPill =
          diff !== undefined && diff !== null
            ? `<span class="${diff >= 0 ? 'net-delta-pos' : 'net-delta-neg'} tabular" style="margin-left:5px;">${formatSignedNet(diff)}</span>`
            : '';
        return `<div class="net-row">
          <div class="net-row-top">
            <span>${f.label}</span>
            <span class="tabular"><strong>${formatNet(val)}</strong> / ${f.max}${diffPill}</span>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${fillColor};"></div></div>
        </div>`;
      })
      .join('');

  const checkDone = PROGRAM_CHECKLIST_ITEMS.filter((it) => p.checklist?.[it.key]).length;

  container.innerHTML = `
    <div class="drawer-header" id="drawerHeaderBar">
      <div style="display:flex;gap:15px;align-items:center;min-width:0;flex:1;">
        <div style="transform:scale(1.12);transform-origin:left center;">${renderAvatar(p)}</div>
        <div style="min-width:0;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div style="font-family:var(--font-display);font-size:21px;font-weight:700;letter-spacing:-0.03em;line-height:1.2;">${escapeHtml(p.department)}</div>
            <div class="drawer-scroll-pill tabular" id="drawerScrollPill">
              <span>${formatRank(p.latestRank)}</span>
              <span class="pill pill-risk-${escapeHtml(p.risk || 'hedef')}" style="padding:1px 7px;font-size:10.5px;">${escapeHtml((RISK_META[p.risk] || RISK_META.hedef).label)}</span>
            </div>
          </div>
          <div style="font-size:14.5px;font-weight:500;color:var(--text-secondary);margin-top:2px;">${escapeHtml(p.university)} · <span style="color:var(--text-tertiary)">${escapeHtml(p.faculty)}</span></div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:7px;">
            <button class="pill mono" id="copyCodeBtn" title="Program kodunu kopyala" style="cursor:pointer;">${escapeHtml(p.code)} ${SF.copy}</button>
            <span style="font-size:12.5px;color:var(--text-secondary);font-weight:500;">${escapeHtml(p.city)}${p.district ? ` / ${escapeHtml(p.district)}` : ''} · ${escapeHtml(metaLine)}</span>
          </div>
        </div>
      </div>
      <div class="drawer-header-actions">
        ${pool.length > 1 && curIdx !== -1
          ? `<div class="drawer-nav-cluster" title="Önceki / Sonraki bölüm (← →)">
              <button class="btn btn-ghost btn-icon btn-sm" id="drawerPrevBtn" aria-label="Önceki bölüm" style="width:26px;height:26px;">
                <svg class="sf-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <span class="drawer-nav-pos tabular">${curIdx + 1}/${pool.length}</span>
              <button class="btn btn-ghost btn-icon btn-sm" id="drawerNextBtn" aria-label="Sonraki bölüm" style="width:26px;height:26px;">
                <svg class="sf-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>`
          : ''}
        <a class="btn btn-sm" href="${escapeHtml(p.yokAtlasUrl)}" target="_blank" rel="noopener">YÖK Atlas ${SF.external}</a>
        ${!ui.readOnlyShare ? `<button class="btn btn-sm" id="drawerRefreshBtn">${SF.refresh} Güncelle</button>` : ''}
        <button class="btn btn-sm ${state.compareCodes.includes(p.code) ? 'btn-soft' : ''}" id="drawerCompareBtn">
          ${state.compareCodes.includes(p.code) ? `${SF.check} Kıyasla` : `${SF.plus} Kıyasla`}
        </button>
        ${!ui.readOnlyShare ? `<button class="btn btn-sm btn-danger" id="drawerDeleteBtn" title="Listeden çıkar">${SF.trash}</button>` : ''}
        <button class="btn btn-ghost btn-icon btn-sm" id="closeDrawerBtn" aria-label="Kapat">${SF.close}</button>
      </div>
      <div class="drawer-scroll-progress" id="drawerScrollProgress"></div>
    </div>

    <div class="drawer-body">
      <section class="detail-hero-metrics tabular">
        <div class="detail-metric-tile">
          <span>${escapeHtml(p.latestYear || 2026)} Taban Sıralama</span>
          <strong>${formatRank(p.latestRank)}</strong>
        </div>
        <div class="detail-metric-tile">
          <span>2027 Tahmini Bandı</span>
          <strong style="color:var(--accent);font-size:19px;">${proj ? `${formatRank(proj.low)} – ${formatRank(proj.high)}` : '—'}</strong>
        </div>
        <div class="detail-metric-tile">
          <span>${escapeHtml(p.latestYear || 2026)} Taban Puan</span>
          <strong>${formatScore(p.latestScore)}</strong>
        </div>
        <div class="detail-metric-tile">
          <span>Kontenjan / Yerleşen</span>
          <strong>${p.quota ?? '—'} <span style="font-size:15px;font-weight:500;color:var(--text-tertiary)">/ ${p.placed ?? '—'}</span></strong>
        </div>
      </section>

      <div class="detail-two-col">
        <div class="detail-col">
          <section class="drawer-section">
            <div class="section-heading">
              <span>4 Yıllık Taban Trendi</span>
              <div class="segmented">
                <button class="seg-btn seg-btn-sm ${ui.drawerChartMode === 'rank' ? 'active' : ''}" data-chart-mode="rank">Sıralama</button>
                <button class="seg-btn seg-btn-sm ${ui.drawerChartMode === 'score' ? 'active' : ''}" data-chart-mode="score">Puan</button>
              </div>
            </div>
            ${proj
              ? `<div class="proj-banner">
                  <span><strong>2027 Öngörüsü:</strong> ${escapeHtml(proj.summary)}</span>
                  <span class="tabular" style="font-weight:700;">${formatRank(proj.low)} – ${formatRank(proj.high)}</span>
                </div>`
              : ''}
            ${proj?.quotaAlert ? `<div class="${proj.quotaAlert.type === 'warn' ? 'quota-alert-warn' : 'quota-alert-good'}">${escapeHtml(proj.quotaAlert.text)}</div>` : ''}
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
              <div style="display:flex;align-items:center;gap:6px;">
                <button class="mini-action active" id="drawerEditMyNetsBtn" style="height:26px;font-size:11.5px;">Netlerim / PDF</button>
                ${p.nets && p.nets.length > 1
                  ? `<div class="segmented">
                      ${p.nets
                        .map(
                          (n) => `<button class="seg-btn seg-btn-sm ${activeNet?.year === n.year ? 'active' : ''}" data-net-year="${n.year}">${n.year}</button>`,
                        )
                        .join('')}
                    </div>`
                  : ''}
              </div>
            </div>
            ${activeNet
              ? `${gap
                  ? `<div class="net-gap-banner tabular">
                      <span><strong>Hedefe Mesafen (${gap.refYear} ortalamasına göre):</strong></span>
                      <div style="display:flex;gap:6px;flex-wrap:wrap;">
                        ${gap.tytDiff !== null ? `<span class="${gap.tytDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}">TYT ${formatSignedNet(gap.tytDiff)} net</span>` : ''}
                        ${gap.aytDiff !== null ? `<span class="${gap.aytDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}">${gap.isDil ? 'YDT' : 'AYT'} ${formatSignedNet(gap.aytDiff)} net</span>` : ''}
                        ${gap.obpDiff !== null ? `<span class="${gap.obpDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}">OBP ${formatSignedNet(gap.obpDiff)}</span>` : ''}
                      </div>
                    </div>`
                  : ''}
                <div style="font-size:12.5px;color:var(--text-secondary);padding:0 4px;">
                  Yerleşen Ortalama OBP: <strong class="tabular" style="color:var(--text)">${formatScore(activeNet.obp)}</strong>
                </div>
                <div class="nets-grid">
                  <div class="net-box">
                    <div class="net-box-head"><span>TYT</span><span class="tabular" style="color:var(--accent)">${formatNet(activeNet.tytTotal)} / 120</span></div>
                    ${renderNetBars(TYT_FIELDS, activeNet.tyt, gap?.tytDiffs, 'var(--accent)')}
                  </div>
                  <div class="net-box">
                    ${p.scoreType === 'DİL'
                      ? `<div class="net-box-head"><span>YDT</span><span class="tabular" style="color:var(--green)">${formatNet(activeNet.ydt)} / 80</span></div>
                         <div class="net-row">
                           <div class="net-row-top"><span>YDT Neti</span><span class="tabular"><strong>${formatNet(activeNet.ydt)}</strong> / 80${gap?.aytDiff !== null && gap?.aytDiff !== undefined ? `<span class="${gap.aytDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}" style="margin-left:5px;">${formatSignedNet(gap.aytDiff)}</span>` : ''}</span></div>
                           <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, ((activeNet.ydt || 0) / 80) * 100)}%;background:var(--green-bright)"></div></div>
                         </div>`
                      : `<div class="net-box-head"><span>AYT (${escapeHtml(p.scoreType)})</span><span class="tabular" style="color:var(--green)">${formatNet(activeNet.aytTotal)} / 80</span></div>
                         ${renderNetBars(aytFields, activeNet.ayt, gap?.aytDiffs, 'var(--green-bright)')}`}
                  </div>
                </div>`
              : `<div class="chart-empty">Bu program için YÖK Atlas net ortalaması henüz yayınlanmamış.</div>`}
          </section>
        </div>

        <div class="detail-col">
          <section class="drawer-section">
            <div class="section-heading">
              <span>Kişisel Değerlendirmen</span>
              ${(() => {
                const vals = PROGRAM_SUBRATING_ITEMS.map((it) => Number(p.subRatings?.[it.key]) || 0).filter((v) => v > 0);
                if (!vals.length) return '';
                const avg = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1).replace('.', ',');
                return `<span class="tabular" style="color:var(--amber);font-weight:700;">★ ${avg} / 5</span>`;
              })()}
            </div>
            <div class="sheet-card" style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div class="segmented">
                  ${['hayal', 'hedef', 'guvenli']
                    .map(
                      (rk) => `<button class="seg-btn seg-btn-sm ${p.risk === rk ? 'active' : ''}" data-set-risk="${rk}">${RISK_META[rk].label}</button>`,
                    )
                    .join('')}
                </div>
                <div class="rating-stars" aria-label="Genel yıldız puanı">
                  ${[1, 2, 3, 4, 5]
                    .map(
                      (n) => `<button class="star-btn ${(p.rating || 0) >= n ? 'filled' : ''}" data-set-star="${n}" title="${n} yıldız">${(p.rating || 0) >= n ? SF.starFilled(18) : SF.starEmpty(18)}</button>`,
                    )
                    .join('')}
                </div>
              </div>

              <!-- 4 Sub-Criteria Ratings -->
              <div class="subrating-grid">
                ${PROGRAM_SUBRATING_ITEMS.map((it) => {
                  const v = Number(p.subRatings?.[it.key]) || 0;
                  return `<div class="subrating-row">
                    <span>${escapeHtml(it.label)}</span>
                    <div class="subrating-stars">
                      ${[1, 2, 3, 4, 5]
                        .map(
                          (n) => `<button class="star-btn ${v >= n ? 'filled' : ''}" data-sub-key="${it.key}" data-sub-val="${n}" title="${it.label}: ${n}/5">${v >= n ? SF.starFilled(13) : SF.starEmpty(13)}</button>`,
                        )
                        .join('')}
                    </div>
                  </div>`;
                }).join('')}
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

            <div class="sheet-card" style="display:flex;flex-direction:column;gap:9px;">
              <label class="field-label" style="margin:0;">Tanıtım / Öğrenciye Sorulacak Sorular</label>
              ${(p.questions || []).length
                ? `<div style="display:flex;flex-direction:column;gap:6px;">
                    ${p.questions
                      .map(
                        (qItem, idx) => `<div class="question-row ${qItem.done ? 'done' : ''}">
                          <button type="button" class="btn-ghost" data-toggle-question="${idx}" style="display:flex;align-items:center;gap:7px;padding:0;text-align:left;flex:1;color:inherit;">
                            <span style="color:${qItem.done ? 'var(--green)' : 'var(--text-tertiary)'};font-weight:700;">${qItem.done ? '✓' : '○'}</span>
                            <span>${escapeHtml(qItem.text)}</span>
                          </button>
                          <button type="button" class="btn-ghost" data-del-question="${idx}" title="Sil">${SF.close}</button>
                        </div>`,
                      )
                      .join('')}
                  </div>`
                : ''}
              <form class="pc-add-row" id="addQuestionForm">
                <input class="input" id="addQuestionInput" placeholder="Örn: Yurt çıkma oranı ve staj imkânları nasıl?" />
                <button class="btn btn-sm btn-icon" type="submit" title="Soru ekle">${SF.plus}</button>
              </form>
            </div>

            <div class="sheet-card">
              <label class="field-label" for="drawerNotesInput">Kişisel Notlar</label>
              <textarea id="drawerNotesInput" class="textarea" rows="3" placeholder="Kampüs, yurt, ulaşım, Erasmus ve mezun yorumları...">${escapeHtml(p.notes || '')}</textarea>
            </div>
          </section>

          <section class="drawer-section">
            <div class="section-heading">
              <span>Araştırma Kontrolü & Kaynaklar</span>
              <span class="tabular">${checkDone} / ${PROGRAM_CHECKLIST_ITEMS.length}</span>
            </div>
            <div class="sheet-card" style="display:flex;flex-direction:column;gap:12px;">
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${PROGRAM_CHECKLIST_ITEMS.map((it) => {
                  const checked = Boolean(p.checklist?.[it.key]);
                  return `<button class="check-chip ${checked ? 'checked' : ''}" data-prog-check="${it.key}">
                    <span>${checked ? '✓' : '○'}</span> ${escapeHtml(it.label)}
                  </button>`;
                }).join('')}
              </div>

              <div style="border-top:0.5px solid var(--separator-subtle);padding-top:10px;">
                <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:7px;">Tek Tıkla Hızlı Araştırma</div>
                <div class="research-shortcuts-grid">
                  ${(() => {
                    const qBase = `${p.university} ${p.department}`;
                    const shortcuts = [
                      { label: 'Ders Müfredatı', url: `https://www.google.com/search?q=${encodeURIComponent(`"${p.university}" "${p.department}" ders müfredatı`)}` },
                      { label: 'YouTube Yorumları', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(qBase)}` },
                      { label: 'LinkedIn Mezunlar', url: `https://www.google.com/search?q=${encodeURIComponent(`site:linkedin.com/in "${p.university}" "${p.department}"`)}` },
                      { label: 'Kampüs & Yurt Haritası', url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.university} ${p.faculty || p.department} ${p.city}`)}` },
                      { label: 'Erasmus & Değişim', url: `https://www.google.com/search?q=${encodeURIComponent(`"${p.university}" "${p.department}" erasmus anlaşmaları`)}` },
                    ];
                    return shortcuts
                      .map((sc) => `<a class="research-shortcut-chip" href="${sc.url}" target="_blank" rel="noopener">${sc.label} ${SF.external}</a>`)
                      .join('');
                  })()}
                </div>
              </div>

              <div style="border-top:0.5px solid var(--separator-subtle);padding-top:10px;">
                <div style="font-size:12px;font-weight:600;color:var(--text-secondary);margin-bottom:7px;">Kaydedilen Linkler (YouTube, Müfredat PDF, Forum)</div>
                ${(p.links || []).length
                  ? `<div class="link-list">
                      ${p.links
                        .map(
                          (lk, idx) => `<div class="link-row">
                            <a href="${escapeHtml(lk.url)}" target="_blank" rel="noopener">${escapeHtml(lk.title || lk.url)} ${SF.external}</a>
                            <button class="btn-ghost" data-del-link="${idx}" title="Sil">${SF.close}</button>
                          </div>`,
                        )
                        .join('')}
                    </div>`
                  : ''}
                <form id="addLinkForm" style="display:flex;gap:6px;flex-wrap:wrap;">
                  <input class="input" id="addLinkTitle" placeholder="Başlık (ör. Ders Programı)" style="flex:1;min-width:120px;padding:6px 10px;font-size:12.5px;border-radius:999px;" />
                  <input class="input" id="addLinkUrl" type="url" placeholder="https://..." style="flex:1.4;min-width:140px;padding:6px 10px;font-size:12.5px;border-radius:999px;" />
                  <button class="btn btn-sm btn-icon" type="submit" title="Link ekle">${SF.plus}</button>
                </form>
              </div>
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

          <section class="drawer-section">
            <div class="section-heading">
              <span>Buna Benzer 5 Alternatif</span>
              <span style="font-size:11.5px;color:var(--text-tertiary);font-weight:500;">12.239 Katalog · 0 ms</span>
            </div>
            <div class="similar-list" id="drawerSimilarHost">
              <div style="font-size:12.5px;color:var(--text-tertiary);padding:6px 2px;">Benzer bölümler aranıyor...</div>
            </div>
          </section>

          <div style="font-size:11.5px;color:var(--text-tertiary);padding:0 4px;">
            Son YÖK Atlas güncellemesi · ${formatRelativeTime(p.fetchedAt)}
          </div>
        </div>
      </div>
    </div>
  `;

  if (animateSwap) {
    const bodyEl = container.querySelector('.drawer-body');
    bodyEl?.classList.add('drawer-swap-in');
  }
  bindDrawerEvents(p);
  bindInteractiveCharts(container);
  initSlidingSegmentedControls();

  // Feature #1: Dynamic University Logo Ambient Glow on Drawer Header (0ms cached)
  const logoSrc = getLogoUrl(p);
  const currentCode = p.code;
  if (logoSrc) {
    extractLogoAmbientColor(logoSrc).then((col) => {
      if (!col || ui.drawerCode !== currentCode) return;
      const hdr = document.getElementById('drawerHeaderBar');
      if (!hdr) return;
      hdr.style.setProperty('--drawer-brand-rgb', col.rgb);
      hdr.classList.add('has-brand-glow');
    });
  }

  // Feature #7: Hydrate "Buna Benzer 5 Alternatif" from Built-In 0ms Catalog
  findSimilarProgramsInCatalog(p, {
    excludeCodes: state.programs.map((item) => item.code),
    limit: 5,
  })
    .then((similars) => {
      if (ui.drawerCode !== currentCode) return;
      const host = document.getElementById('drawerSimilarHost');
      if (!host) return;
      if (!similars.length) {
        host.innerHTML = `<div style="font-size:12.5px;color:var(--text-tertiary);padding:4px 2px;">Bu banda eklenebilecek yeni alternatif bulunamadı.</div>`;
        return;
      }
      host.innerHTML = similars
        .map(
          (item) => `<div class="similar-row">
            <div class="similar-row-info">
              ${renderAvatar(item)}
              <div style="min-width:0;flex:1;">
                <div class="similar-row-title">${escapeHtml(item.department)}</div>
                <div class="similar-row-sub">${escapeHtml(item.university)} · ${escapeHtml(item.city)} · <strong class="tabular">${formatRank(item.latestRank)}</strong></div>
                <div style="font-size:11px;color:var(--accent);font-weight:600;margin-top:2px;">${escapeHtml(item.similarityReason)}</div>
              </div>
            </div>
            ${!ui.readOnlyShare
              ? `<button class="btn btn-soft btn-sm" type="button" data-similar-add="${escapeHtml(item.code)}" style="flex-shrink:0;">${SF.plus} Ekle</button>`
              : ''}
          </div>`,
        )
        .join('');

      host.querySelectorAll('[data-similar-add]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const addCode = btn.dataset.similarAdd;
          btn.disabled = true;
          btn.textContent = '...';
          try {
            const full = await fetchProgramFromApi(addCode);
            addProgramToState(full);
            renderAll();
            btn.textContent = 'Eklendi ✓';
            showToast(`${full.university} — ${full.department} listene eklendi.`, 'success');
          } catch (err) {
            btn.disabled = false;
            btn.innerHTML = `${SF.plus} Ekle`;
            showToast(err.message || 'Eklenemedi.', 'error');
          }
        });
      });
    })
    .catch(() => {});
}

function bindDrawerEvents(p) {
  document.getElementById('drawerPrevBtn')?.addEventListener('click', () => stepDrawerProgram(-1));
  document.getElementById('drawerNextBtn')?.addEventListener('click', () => stepDrawerProgram(1));
  const drawerBody = document.querySelector('#drawerContent .drawer-body');
  const drawerHeader = document.getElementById('drawerHeaderBar');
  const progressBar = document.getElementById('drawerScrollProgress');
  drawerBody?.addEventListener(
    'scroll',
    () => {
      const top = drawerBody.scrollTop;
      const max = Math.max(1, drawerBody.scrollHeight - drawerBody.clientHeight);
      const pct = Math.min(100, Math.max(0, (top / max) * 100));
      if (drawerHeader) drawerHeader.classList.toggle('body-scrolled', top > 84);
      if (progressBar) progressBar.style.width = `${pct.toFixed(1)}%`;
    },
    { passive: true },
  );

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
  document.getElementById('drawerEditMyNetsBtn')?.addEventListener('click', openMyNetsModal);

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

  document.querySelectorAll('[data-sub-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.subKey;
      const val = Number(btn.dataset.subVal);
      p.subRatings = { ...(p.subRatings || {}) };
      p.subRatings[k] = p.subRatings[k] === val ? 0 : val;
      const vals = PROGRAM_SUBRATING_ITEMS.map((it) => Number(p.subRatings[it.key]) || 0).filter((x) => x > 0);
      if (vals.length) {
        p.rating = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
      saveState();
      renderAll();
      renderDrawer();
    });
  });

  document.getElementById('addQuestionForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('addQuestionInput')?.value.trim();
    if (!val) return;
    p.questions = [...(p.questions || []), { text: val, done: false }];
    saveState();
    renderDrawer();
  });

  document.querySelectorAll('[data-toggle-question]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.toggleQuestion);
      if (!p.questions?.[idx]) return;
      p.questions[idx].done = !p.questions[idx].done;
      saveState();
      renderDrawer();
    });
  });

  document.querySelectorAll('[data-del-question]').forEach((btn) => {
    btn.addEventListener('click', () => {
      p.questions.splice(Number(btn.dataset.delQuestion), 1);
      saveState();
      renderDrawer();
    });
  });

  document.querySelectorAll('[data-prog-check]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.progCheck;
      p.checklist = { ...(p.checklist || {}), [key]: !p.checklist?.[key] };
      saveState();
      renderAll();
      renderDrawer();
    });
  });

  document.getElementById('addLinkForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const titleEl = document.getElementById('addLinkTitle');
    const urlEl = document.getElementById('addLinkUrl');
    const rawUrl = urlEl.value.trim();
    if (!rawUrl) return;
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    p.links = [...(p.links || []), { title: titleEl.value.trim() || rawUrl, url }];
    saveState();
    renderDrawer();
  });

  document.querySelectorAll('[data-del-link]').forEach((btn) => {
    btn.addEventListener('click', () => {
      p.links.splice(Number(btn.dataset.delLink), 1);
      saveState();
      renderDrawer();
    });
  });

  document.getElementById('addProForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('addProInput').value.trim();
    if (!val) return;
    p.pros = [...(p.pros || []), val];
    saveState();
    renderAll();
    renderDrawer();
  });

  document.getElementById('addConForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('addConInput').value.trim();
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
// Spotlight Modal: Live YÖK Atlas Search + Direct Code / Link Paste
// ============================================================================
function getSpotlightNavItems() {
  return Array.from(document.querySelectorAll('#spotlightLocalHits .search-result-row, #addModalPreview .search-result-row'));
}

function highlightSpotlightIdx(nextIdx) {
  const items = getSpotlightNavItems();
  items.forEach((el) => el.classList.remove('kbd-active'));
  if (!items.length || nextIdx < 0) {
    ui.spotlightIdx = -1;
    return;
  }
  const wrapped = ((nextIdx % items.length) + items.length) % items.length;
  ui.spotlightIdx = wrapped;
  const active = items[wrapped];
  active.classList.add('kbd-active');
  active.scrollIntoView({ block: 'nearest' });
}

function openAddModal(prefillText = '') {
  ui.spotlightIdx = -1;
  const overlay = document.getElementById('addModalOverlay');
  const input = document.getElementById('programCodeInput');
  document.getElementById('addModalFeedback').innerHTML = '';
  document.getElementById('addModalPreview').innerHTML = '';
  const localHits = document.getElementById('spotlightLocalHits');
  if (localHits) localHits.innerHTML = '';
  if (input) {
    input.value = prefillText;
    autoSizeSpotlightInput(input);
    renderSpotlightLocalHits(prefillText);
    setTimeout(() => input.focus(), 60);
  }
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  if (prefillText) handleSpotlightAction();
}

function renderSpotlightLocalHits(rawQuery) {
  const host = document.getElementById('spotlightLocalHits');
  if (!host) return;
  const q = String(rawQuery || '').trim().toLocaleLowerCase('tr');
  if (q.length < 2) {
    host.innerHTML = '';
    return;
  }

  const trHits = state.programs
    .filter((p) => {
      const hay = [
        p.code,
        p.university,
        p.department,
        p.city,
        p.notes,
        ...(p.pros || []),
        ...(p.cons || []),
        ...(p.links || []).map((l) => `${l.title} ${l.url}`),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr');
      return hay.includes(q);
    })
    .slice(0, 5);

  const abHits = state.abroadPrograms
    .filter((a) => {
      const hay = [a.university, a.department, a.city, a.country, a.portal, a.notes]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr');
      return hay.includes(q);
    })
    .slice(0, 3);

  if (!trHits.length && !abHits.length) {
    host.innerHTML = '';
    return;
  }

  host.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:6px;">
      ${trHits.length
        ? `<div>
            <div class="spotlight-group-label">Listendeki Tercihler & Notların (${trHits.length})</div>
            <div class="search-results-list" style="max-height:210px;">
              ${trHits
                .map(
                  (p) => `<div class="search-result-row" style="cursor:pointer;" data-spot-local-tr="${escapeHtml(p.code)}">
                    <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                      ${renderAvatar(p)}
                      <div style="min-width:0;">
                        <div style="font-weight:650;font-size:13.5px;">${escapeHtml(p.department)}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(p.university)} · ${escapeHtml(p.city)}${p.notes ? ` · "${escapeHtml(p.notes.slice(0, 48))}"` : ''}</div>
                      </div>
                    </div>
                    <span class="pill pill-accent tabular">${formatRank(p.latestRank)}</span>
                  </div>`,
                )
                .join('')}
            </div>
          </div>`
        : ''}
      ${abHits.length
        ? `<div>
            <div class="spotlight-group-label">Yurt Dışı Hedeflerin (${abHits.length})</div>
            <div class="search-results-list" style="max-height:150px;">
              ${abHits
                .map(
                  (a) => `<div class="search-result-row" style="cursor:pointer;" data-spot-local-abroad="1">
                    <div style="min-width:0;">
                      <div style="font-weight:650;font-size:13.5px;">${escapeHtml(a.university)} — ${escapeHtml(a.department)}</div>
                      <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(a.city)} · ${escapeHtml(a.country)}${a.notes ? ` · "${escapeHtml(a.notes.slice(0, 42))}"` : ''}</div>
                    </div>
                    <span class="pill">Yurt Dışı</span>
                  </div>`,
                )
                .join('')}
            </div>
          </div>`
        : ''}
    </div>
  `;

  host.querySelectorAll('[data-spot-local-tr]').forEach((row) => {
    row.addEventListener('click', () => {
      const code = row.dataset.spotLocalTr;
      closeAddModal();
      ui.region = 'TR';
      ui.tab = 'preferences';
      renderAll();
      openDrawer(code);
    });
  });

  host.querySelectorAll('[data-spot-local-abroad]').forEach((row) => {
    row.addEventListener('click', () => {
      closeAddModal();
      ui.region = 'ABROAD';
      renderAll();
    });
  });
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

async function handleSpotlightAction() {
  const input = document.getElementById('programCodeInput');
  const raw = input.value.trim();
  const puanTuru = document.getElementById('spotPuanTuru')?.value || '';
  const uniTuru = document.getElementById('spotUniTuru')?.value || '';
  const maxRank = document.getElementById('spotMaxRank')?.value || '';

  const codes = extractProgramCodes(raw);
  if (codes.length > 0) return handleCodePreview(codes);
  if (!raw && !puanTuru && !uniTuru && !maxRank) {
    document.getElementById('addModalFeedback').innerHTML = `<div class="error-banner">Bir bölüm/üniversite adı yaz (ör. <strong>İTÜ Bilgisayar</strong>) veya 9 haneli program kodu/linki yapıştır.</div>`;
    return;
  }
  return handleLiveSearch({ q: raw, puanTuru, uniTuru, maxRank });
}

async function handleLiveSearch(params) {
  const feedback = document.getElementById('addModalFeedback');
  const preview = document.getElementById('addModalPreview');
  const btn = document.getElementById('fetchProgramBtn');

  btn.disabled = true;
  btn.textContent = 'Aranıyor...';
  feedback.innerHTML = '';
  preview.innerHTML = renderShimmerSkeleton(4);

  try {
    const res = await searchProgramsFromApi({ ...params, size: 20 });
    const items = res.items || [];
    if (!items.length) {
      preview.innerHTML = '';
      feedback.innerHTML = `<div class="error-banner">Eşleşen lisans programı bulunamadı. Daha genel bir ifade dene (ör. "İstanbul Bilgisayar" veya "Ankara Tıp").</div>`;
      return;
    }

    preview.innerHTML = `
      <div style="font-size:12px;color:var(--text-tertiary);display:flex;justify-content:space-between;padding:0 4px;">
        <span>YÖK Atlas'ta <strong>${res.total}</strong> program bulundu (en yüksek ${items.length} sıralama)</span>
        <span>Tek tıkla tam veriyle ekle</span>
      </div>
      <div class="search-results-list">
        ${items
          .map((item) => {
            const exists = state.programs.some((p) => p.code === item.code);
            return `<div class="search-result-row">
              <div style="display:flex;align-items:center;gap:11px;min-width:0;flex:1;">
                ${renderAvatar(item)}
                <div style="min-width:0;">
                  <div style="font-weight:650;font-size:13.5px;color:var(--text);">${escapeHtml(item.department)}</div>
                  <div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(item.university)}</div>
                  <div style="font-size:11.5px;color:var(--text-tertiary);">${escapeHtml([item.scoreType, item.city, item.language, item.scholarship].filter(Boolean).join(' · '))} · <span class="mono">${escapeHtml(item.code)}</span></div>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
                <div style="text-align:right;" class="tabular">
                  <div style="font-weight:700;font-size:14px;">${formatRank(item.latestRank)}</div>
                  <div style="font-size:11px;color:var(--text-tertiary);">Kont: ${item.quota ?? '—'}</div>
                </div>
                <button class="btn btn-sm ${exists ? 'btn-soft' : 'btn-primary'}" data-search-add="${escapeHtml(item.code)}">
                  ${exists ? `${SF.check} Eklendi` : `${SF.plus} Ekle`}
                </button>
              </div>
            </div>`;
          })
          .join('')}
      </div>
    `;

    preview.querySelectorAll('[data-search-add]').forEach((addBtn) => {
      addBtn.addEventListener('click', async () => {
        const code = addBtn.dataset.searchAdd;
        addBtn.disabled = true;
        addBtn.textContent = 'Çekiliyor...';
        try {
          const full = await fetchProgramFromApi(code);
          addProgramToState(full);
          ui.region = 'TR';
          ui.tab = 'preferences';
          renderAll();
          addBtn.className = 'btn btn-sm btn-soft';
          addBtn.innerHTML = `${SF.check} Eklendi`;
          addBtn.disabled = false;
          showToast(`${full.university} — ${full.department} eklendi.`, 'success');
        } catch (err) {
          addBtn.disabled = false;
          addBtn.innerHTML = `${SF.plus} Ekle`;
          showToast(err.message || 'Eklenemedi.', 'error');
        }
      });
    });
  } catch (err) {
    preview.innerHTML = '';
    feedback.innerHTML = `<div class="error-banner">${escapeHtml(err.message || 'Arama sırasında hata oluştu.')}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'YÖK Atlas';
  }
}

async function handleCodePreview(codes) {
  const feedback = document.getElementById('addModalFeedback');
  const preview = document.getElementById('addModalPreview');
  const btn = document.getElementById('fetchProgramBtn');

  btn.disabled = true;
  btn.textContent = codes.length > 1 ? `Çekiliyor (${codes.length})...` : 'Çekiliyor...';
  feedback.innerHTML = '';
  preview.innerHTML = renderShimmerSkeleton(Math.min(4, codes.length));

  const found = [];
  const errors = [];

  for (const code of codes.slice(0, 12)) {
    try {
      const prog = await fetchProgramFromApi(code);
      if (!prog.isLisans) errors.push(`${code}: Önlisans programı (yine de ekleyebilirsin).`);
      found.push(prog);
    } catch (err) {
      errors.push(`${code}: ${err.message}`);
    }
  }

  btn.disabled = false;
  btn.textContent = 'YÖK Atlas';

  if (errors.length) feedback.innerHTML = `<div class="error-banner">${errors.map(escapeHtml).join('<br/>')}</div>`;
  if (!found.length) {
    preview.innerHTML = '';
    return;
  }

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
      <div class="search-results-list" style="max-height:220px;">
        ${found
          .map(
            (p) => `<div class="search-result-row">
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
// My Nets & Dershane TYT / AYT PDF Auto-Extractor Modal
// ============================================================================
function openMyNetsModal() {
  const overlay = document.getElementById('myNetsModalOverlay');
  renderMyNetsModal();
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeMyNetsModal() {
  const overlay = document.getElementById('myNetsModalOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

function renderMyNetsModal() {
  const body = document.getElementById('myNetsModalBody');
  const mn = state.myNets || DEFAULT_MY_NETS;
  const valAttr = (v) => (v !== null && v !== undefined && v !== '' ? `value="${escapeHtml(v)}"` : '');
  const est = estimateYksRankFromNets(mn);
  const estTypes = ['SAY', 'EA', 'SÖZ', 'DİL'].filter((k) => est?.[k]);
  const reachableCount = est ? state.programs.filter((p) => isProgramCurrentlyReachable(p, est)).length : 0;

  const field = (id, label, max, val) => `
    <div>
      <label class="field-label" for="${id}">${label} <span style="color:var(--text-tertiary);font-weight:400;">/ ${max}</span></label>
      <input id="${id}" class="input tabular" type="number" step="0.25" min="-10" max="${max}" ${valAttr(val)} placeholder="—" />
    </div>`;

  body.innerHTML = `
    ${est && estTypes.length
      ? `<div class="sheet-card" style="display:flex;flex-direction:column;gap:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
            <strong style="font-size:13px;">Mevcut Netlerinle Tahmini Sıralama</strong>
            ${state.programs.length
              ? `<span class="reachable-pill">${SF.check} ${reachableCount} / ${state.programs.length} tercihine şu an giriyorsun</span>`
              : ''}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;" class="tabular">
            ${estTypes
              .map(
                (st) => `<span class="pill pill-accent">${st}: <strong>${formatRank(est[st].rank)}</strong> (~${formatScore(est[st].score)})</span>`,
              )
              .join('')}
          </div>
        </div>`
      : ''}

    <!-- Dershane PDF Otomatik Net Okuyucu (TYT & AYT Ayrı) -->
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div>
        <label class="field-label" for="pdfStudentName">PDF'de Aranacak Ad Soyad (veya Öğrenci No)</label>
        <input id="pdfStudentName" class="input" type="text" value="${escapeHtml(state.studentName || 'Yusuf Selim Eryiğit')}" placeholder="Yusuf Selim Eryiğit" />
      </div>

      <div class="pdf-upload-grid">
        <label class="pdf-drop-card" id="tytPdfDrop">
          ${SF.upload}
          <strong>TYT Deneme PDF Yükle</strong>
          <span>Tekli veya çoklu PDF seç / sürükle-bırak</span>
          <input type="file" id="tytPdfInput" accept="application/pdf,.pdf" multiple style="display:none;" />
        </label>
        <label class="pdf-drop-card" id="aytPdfDrop">
          ${SF.upload}
          <strong>AYT Deneme PDF Yükle</strong>
          <span>Tekli veya çoklu PDF seç / sürükle-bırak</span>
          <input type="file" id="aytPdfInput" accept="application/pdf,.pdf" multiple style="display:none;" />
        </label>
      </div>

      <div id="pdfParseStatus"></div>
    </div>

    ${(() => {
      const prs = computeExamPersonalRecords(state.examHistory);
      if (!prs.bestTyt && !prs.bestAyt && !prs.bestInstRank) return '';
      return `<div class="pr-strip tabular">
        <div class="pr-tile">
          <span>🏆 En Yüksek TYT</span>
          <strong>${prs.bestTyt ? `${formatNet(prs.bestTyt.total)} net` : '—'}</strong>
          <small>${escapeHtml(prs.bestTyt?.examName || '—')}</small>
        </div>
        <div class="pr-tile">
          <span>🏆 En Yüksek AYT</span>
          <strong>${prs.bestAyt ? `${formatNet(prs.bestAyt.total)} net` : '—'}</strong>
          <small>${escapeHtml(prs.bestAyt?.examName || '—')}</small>
        </div>
        <div class="pr-tile">
          <span>🏆 En İyi Kurum Sırası</span>
          <strong>${prs.bestInstRank ? `#${prs.bestInstRank.rank}${prs.bestInstRank.totalParticipants ? ` / ${prs.bestInstRank.totalParticipants}` : ''}` : '—'}</strong>
          <small>${escapeHtml(prs.bestInstRank?.examName || '—')}</small>
        </div>
      </div>`;
    })()}

    ${(state.examHistory || []).length
      ? `<div>
          <div class="section-heading" style="margin-bottom:7px;"><span>Yüklenen Denemeler (${state.examHistory.length})</span></div>
          <div class="exam-history-list">
            ${state.examHistory
              .slice(0, 20)
              .map(
                (ex, idx) => `<div class="exam-history-row">
                  <div style="min-width:0;">
                    <span class="pill ${ex.examType === 'TYT' ? 'pill-accent' : 'pill-risk-guvenli'}" style="margin-right:6px;">${escapeHtml(ex.examType)}</span>
                    <strong>${escapeHtml(ex.examName)}</strong>
                    <div style="font-size:11.5px;color:var(--text-tertiary);margin-top:2px;">
                      ${escapeHtml(ex.examDate || ex.importedAt?.slice(0, 10) || '')} · Toplam: <strong class="tabular">${formatNet(ex.total)} net</strong>
                      ${ex.institutionRank ? ` · <span class="pill" style="padding:1px 6px;font-size:10.5px;">Kurum #${ex.institutionRank}${ex.totalParticipants ? `/${ex.totalParticipants}` : ''}</span>` : ''}
                    </div>
                  </div>
                  <div style="display:flex;gap:5px;flex-shrink:0;">
                    <button type="button" class="mini-action active" data-apply-exam="${idx}">Uygula</button>
                    <button type="button" class="mini-action" data-edit-exam="${idx}" title="Ad / tarih düzenle">Düzenle</button>
                    <button type="button" class="btn-ghost" data-del-exam="${idx}" title="Sil">${SF.close}</button>
                  </div>
                </div>`,
              )
              .join('')}
          </div>
        </div>`
      : ''}

    <hr style="border:none;border-top:0.5px solid var(--separator);margin:2px 0;" />

    <form id="myNetsForm" style="display:flex;flex-direction:column;gap:14px;">
      <div>
        <label class="field-label" for="mn_obp">Tahmini OBP Puanın (300 – 500)</label>
        <input id="mn_obp" class="input tabular" type="number" step="0.5" min="250" max="500" ${valAttr(mn.obp)} placeholder="Örn: 475" style="max-width:200px;" />
      </div>

      <div>
        <div class="section-heading" style="margin-bottom:8px;"><span>TYT Netlerin</span></div>
        <div class="nets-input-grid">
          ${field('mn_tyt_turkce', 'TYT Türkçe', 40, mn.tyt?.turkce)}
          ${field('mn_tyt_matematik', 'TYT Matematik', 40, mn.tyt?.matematik)}
          ${field('mn_tyt_sosyal', 'TYT Sosyal', 20, mn.tyt?.sosyal)}
          ${field('mn_tyt_fen', 'TYT Fen', 20, mn.tyt?.fen)}
        </div>
      </div>

      <div>
        <div class="section-heading" style="margin-bottom:8px;"><span>AYT & YDT Netlerin</span></div>
        <div class="nets-input-grid">
          ${field('mn_ayt_matematik', 'AYT Matematik', 40, mn.ayt?.matematik)}
          ${field('mn_ayt_fizik', 'AYT Fizik', 14, mn.ayt?.fizik)}
          ${field('mn_ayt_kimya', 'AYT Kimya', 13, mn.ayt?.kimya)}
          ${field('mn_ayt_biyoloji', 'AYT Biyoloji', 13, mn.ayt?.biyoloji)}
          ${field('mn_ayt_edebiyat', 'AYT Edebiyat', 24, mn.ayt?.edebiyat)}
          ${field('mn_ayt_tarih1', 'AYT Tarih-1', 10, mn.ayt?.tarih1)}
          ${field('mn_ayt_cografya1', 'AYT Coğrafya-1', 6, mn.ayt?.cografya1)}
          ${field('mn_ydt', 'YDT (Dil)', 80, mn.ydt)}
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding-top:4px;">
        <button type="button" class="btn btn-ghost btn-sm" id="clearMyNetsBtn">Netleri Sıfırla</button>
        <button type="submit" class="btn btn-primary">Kaydet & Kıyasla</button>
      </div>
    </form>
  `;

  async function handlePdfUploadBatch(fileList, examType) {
    const files = Array.from(fileList || []).filter((f) => f && (/\.pdf$/i.test(f.name) || f.type === 'application/pdf'));
    if (!files.length) return;
    const statusEl = document.getElementById('pdfParseStatus');
    const studentName = document.getElementById('pdfStudentName')?.value.trim() || 'Yusuf Selim Eryiğit';
    state.studentName = studentName;

    const successes = [];
    const failures = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      statusEl.innerHTML = `<div class="info-banner">${examType} PDF taranıyor (${i + 1}/${files.length}): <strong>${escapeHtml(file.name)}</strong>...</div>`;
      try {
        const parsed = await parseExamPdfFile(file, { examType, studentName });
        successes.push(parsed);
        state.examHistory.unshift({
          id: `ex-${Date.now()}-${i}`,
          examType,
          examName: parsed.examName,
          examDate: parsed.examDate,
          institutionRank: parsed.institutionRank ?? null,
          totalParticipants: parsed.totalParticipants ?? null,
          tyt: parsed.tyt || null,
          ayt: parsed.ayt || null,
          total: parsed.total,
          importedAt: new Date().toISOString(),
        });
      } catch (err) {
        failures.push(`${file.name}: ${err.message || 'Okunamadı'}`);
      }
    }

    if (state.examHistory.length > 60) state.examHistory.length = 60;

    if (successes.length) {
      const latest = successes[successes.length - 1];
      if (examType === 'TYT' && latest.tyt) {
        state.myNets.tyt = { ...state.myNets.tyt, ...latest.tyt };
      } else if (examType === 'AYT' && latest.ayt) {
        for (const [k, v] of Object.entries(latest.ayt)) {
          if (v !== null && v !== undefined) state.myNets.ayt[k] = v;
        }
      }
      saveState();
      renderMyNetsModal();
      renderAll();
      if (ui.drawerCode) renderDrawer();

      const freshStatus = document.getElementById('pdfParseStatus');
      if (freshStatus) {
        const lastRankTxt = latest.institutionRank
          ? ` · Kurum Sırası: #${latest.institutionRank}${latest.totalParticipants ? `/${latest.totalParticipants}` : ''}`
          : '';
        const msg =
          successes.length === 1
            ? `✓ ${studentName} bulundu (${latest.examName}) · Toplam ${formatNet(latest.total)} net${lastRankTxt}`
            : `✓ ${successes.length}/${files.length} ${examType} PDF toplu işlendi · Son deneme (${latest.examName}: ${formatNet(latest.total)} net) aktif edildi.`;
        freshStatus.innerHTML =
          `<div class="quota-alert-good">${escapeHtml(msg)}</div>` +
          (failures.length ? `<div class="error-banner" style="margin-top:6px;">${failures.map(escapeHtml).join('<br/>')}</div>` : '');
      }
      showToast(
        successes.length > 1 ? `${successes.length} ${examType} PDF'i toplu kaydedildi!` : `${examType} netlerin PDF'den otomatik kaydedildi!`,
        'success',
      );
    } else if (failures.length) {
      statusEl.innerHTML = `<div class="error-banner">${failures.map(escapeHtml).join('<br/>')}</div>`;
    }
  }

  document.getElementById('tytPdfInput')?.addEventListener('change', (e) => {
    handlePdfUploadBatch(e.target.files, 'TYT');
  });

  document.getElementById('aytPdfInput')?.addEventListener('change', (e) => {
    handlePdfUploadBatch(e.target.files, 'AYT');
  });

  const wirePdfDrop = (id, examType) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      el.classList.add('drag-active');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-active'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      el.classList.remove('drag-active');
      handlePdfUploadBatch(e.dataTransfer?.files, examType);
    });
  };
  wirePdfDrop('tytPdfDrop', 'TYT');
  wirePdfDrop('aytPdfDrop', 'AYT');

  body.querySelectorAll('[data-apply-exam]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ex = state.examHistory[Number(btn.dataset.applyExam)];
      if (!ex) return;
      if (ex.examType === 'TYT' && ex.tyt) state.myNets.tyt = { ...state.myNets.tyt, ...ex.tyt };
      if (ex.examType === 'AYT' && ex.ayt) {
        for (const [k, v] of Object.entries(ex.ayt)) {
          if (v !== null && v !== undefined) state.myNets.ayt[k] = v;
        }
      }
      saveState();
      renderMyNetsModal();
      renderAll();
      if (ui.drawerCode) renderDrawer();
      showToast(`${ex.examName} netleri aktif edildi.`, 'success');
    });
  });

  body.querySelectorAll('[data-edit-exam]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ex = state.examHistory[Number(btn.dataset.editExam)];
      if (!ex) return;
      const res = await applePrompt({
        title: 'Deneme Bilgilerini Düzenle',
        fields: [
          { id: 'name', label: 'Deneme Adı', value: ex.examName || '', placeholder: 'Örn: 3D TYT Deneme 4' },
          { id: 'date', label: 'Tarih', value: ex.examDate || '', placeholder: 'Örn: 25.11.2026' },
        ],
        confirmLabel: 'Kaydet',
      });
      if (!res) return;
      if (res.name?.trim()) ex.examName = res.name.trim();
      if (res.date !== undefined) ex.examDate = res.date.trim() || ex.examDate;
      saveState();
      renderMyNetsModal();
      renderAll();
      showToast('Deneme bilgisi güncellendi.', 'success');
    });
  });

  body.querySelectorAll('[data-del-exam]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.examHistory.splice(Number(btn.dataset.delExam), 1);
      saveState();
      renderMyNetsModal();
      renderAll();
    });
  });

  const readNum = (id) => {
    const raw = document.getElementById(id)?.value?.trim();
    if (raw === '' || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };

  document.getElementById('myNetsForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    state.studentName = document.getElementById('pdfStudentName')?.value.trim() || state.studentName;
    state.myNets = {
      obp: readNum('mn_obp'),
      tyt: {
        turkce: readNum('mn_tyt_turkce'),
        matematik: readNum('mn_tyt_matematik'),
        sosyal: readNum('mn_tyt_sosyal'),
        fen: readNum('mn_tyt_fen'),
      },
      ayt: {
        ...state.myNets.ayt,
        matematik: readNum('mn_ayt_matematik'),
        fizik: readNum('mn_ayt_fizik'),
        kimya: readNum('mn_ayt_kimya'),
        biyoloji: readNum('mn_ayt_biyoloji'),
        edebiyat: readNum('mn_ayt_edebiyat'),
        tarih1: readNum('mn_ayt_tarih1'),
        cografya1: readNum('mn_ayt_cografya1'),
      },
      ydt: readNum('mn_ydt'),
    };
    saveState();
    closeMyNetsModal();
    renderAll();
    if (ui.drawerCode) renderDrawer();
    showToast('Netlerin kaydedildi — tüm bölümlerde farklar güncellendi.', 'success');
  });

  document.getElementById('clearMyNetsBtn')?.addEventListener('click', () => {
    state.myNets = structuredClone(DEFAULT_MY_NETS);
    saveState();
    renderMyNetsModal();
    renderAll();
    if (ui.drawerCode) renderDrawer();
    showToast('Netlerin temizlendi.');
  });
}

// ============================================================================
// ÖSYM AİS Copy Assistant & Read-Only Share Link Modal
// ============================================================================
function openOsymModal() {
  const overlay = document.getElementById('osymModalOverlay');
  renderOsymModal();
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeOsymModal() {
  const overlay = document.getElementById('osymModalOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

function renderOsymModal() {
  const body = document.getElementById('osymModalBody');
  const progs = state.programs.slice(0, 24);

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div>
          <strong style="font-size:14.5px;">Salt-Okunur Paylaşım Linki</strong>
          <div style="font-size:12px;color:var(--text-tertiary);">Ailen veya rehber öğretmenin kişisel anahtarını görmeden sadece listeni inceleyebilir.</div>
        </div>
        <button class="btn btn-primary btn-sm" id="createShareLinkBtn">${SF.share} Link Üret</button>
      </div>
      ${ui.lastShareUrl
        ? `<div style="display:flex;gap:8px;">
            <input class="input mono" id="shareUrlOut" value="${escapeHtml(ui.lastShareUrl)}" readonly style="font-size:12px;" />
            <button class="btn btn-sm" id="copyShareUrlBtn">Kopyala</button>
          </div>`
        : ''}
    </div>

    <hr style="border:none;border-top:0.5px solid var(--separator);margin:2px 0;" />

    <div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;">
        <div>
          <strong style="font-size:14.5px;">ÖSYM AİS Sıralı Kopyalama Asistanı (${progs.length}/24)</strong>
          <div style="font-size:12px;color:var(--text-tertiary);">Her kopyaladığın satır yeşil işaretlenir; tercih girerken sıra şaşmaz.</div>
        </div>
        <button class="btn btn-sm" id="copyAllOsymBtn">${SF.copy} Tüm Kodları Kopyala</button>
      </div>

      <div class="osym-list">
        ${progs
          .map((p, idx) => {
            const done = ui.osymCopiedCodes.has(p.code);
            return `<div class="osym-row ${done ? 'copied' : ''}">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                <span class="mono" style="font-weight:700;color:var(--text-tertiary);width:26px;">#${String(idx + 1).padStart(2, '0')}</span>
                <div style="min-width:0;">
                  <div style="font-weight:600;font-size:13px;">${escapeHtml(p.department)}</div>
                  <div style="font-size:11.5px;color:var(--text-secondary);">${escapeHtml(p.university)} · <span class="mono" style="font-weight:650;">${escapeHtml(p.code)}</span></div>
                </div>
              </div>
              <button class="btn btn-sm ${done ? 'btn-soft' : ''}" data-osym-copy="${escapeHtml(p.code)}">
                ${done ? `${SF.check} Kopyalandı` : `${SF.copy} ${escapeHtml(p.code)}`}
              </button>
            </div>`;
          })
          .join('')}
      </div>
    </div>
  `;

  document.getElementById('createShareLinkBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('createShareLinkBtn');
    btn.disabled = true;
    btn.textContent = 'Üretiliyor...';
    try {
      const sc = getActiveScenario();
      const res = await createShareSnapshot({
        title: sc?.name || 'YKS 2027 Tercih Listesi',
        ownerName: state.studentName || '',
        targetRank: state.targetRank,
        programs: state.programs,
        abroadPrograms: state.abroadPrograms,
      });
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${res.id}`;
      ui.lastShareUrl = shareUrl;
      navigator.clipboard?.writeText(shareUrl);
      renderOsymModal();
      showToast('Salt-okunur paylaşım linki üretildi ve kopyalandı!', 'success');
    } catch (err) {
      showToast(err.message || 'Paylaşım linki üretilemedi.', 'error');
      btn.disabled = false;
      btn.innerHTML = `${SF.share} Link Üret`;
    }
  });

  document.getElementById('copyShareUrlBtn')?.addEventListener('click', () => {
    navigator.clipboard?.writeText(ui.lastShareUrl);
    showToast('Paylaşım linki kopyalandı.', 'success');
  });

  document.getElementById('copyAllOsymBtn')?.addEventListener('click', () => {
    const text = progs.map((p, i) => `${i + 1}. ${p.code} — ${p.university} / ${p.department}`).join('\n');
    navigator.clipboard?.writeText(text);
    showToast(`${progs.length} tercih kodu panoya kopyalandı.`, 'success');
  });

  body.querySelectorAll('[data-osym-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.osymCopy;
      navigator.clipboard?.writeText(code);
      ui.osymCopiedCodes.add(code);
      renderOsymModal();
      showToast(`${code} kopyalandı.`, 'success');
    });
  });
}

// ============================================================================
// Feature 4: Time Machine — Preference List Snapshots & Restore Modal
// ============================================================================
function openSnapshotModal() {
  const overlay = document.getElementById('snapshotModalOverlay');
  if (!overlay) return;
  renderSnapshotModal();
  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeSnapshotModal() {
  const overlay = document.getElementById('snapshotModalOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
}

function createManualSnapshot(label) {
  syncActiveScenarioPointers();
  const sc = getActiveScenario();
  const cleanLabel =
    String(label || '').trim() ||
    `${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} — ${sc?.name || 'Liste'}`;
  state.snapshots.unshift({
    id: `snap-${Date.now()}`,
    label: cleanLabel,
    scenarioId: sc?.id || state.activeScenarioId,
    scenarioName: sc?.name || 'Plan A',
    targetRank: state.targetRank,
    programs: structuredClone(state.programs),
    createdAt: new Date().toISOString(),
  });
  if (state.snapshots.length > 25) state.snapshots.length = 25;
  saveState();
}

function renderSnapshotModal() {
  const body = document.getElementById('snapshotModalBody');
  if (!body) return;
  const sc = getActiveScenario();
  const defaultLbl = `${new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} — ${sc?.name || 'Liste'}`;

  body.innerHTML = `
    <div class="info-banner">
      Tercih haftasında sıralamanı değiştirirken eski versiyonları kaybetme. İstediğin an <strong>Anlık Görüntü</strong> al ve tek tıkla geri yükle.
    </div>

    <form id="createSnapshotForm" style="display:flex;gap:8px;flex-wrap:wrap;">
      <input id="snapshotLabelInput" class="input" type="text" placeholder="Örn: Rehber Hoca Sonrası (${escapeHtml(defaultLbl)})" style="flex:1;min-width:220px;" />
      <button type="submit" class="btn btn-primary" ${!state.programs.length ? 'disabled' : ''}>${SF.plus} Anlık Görüntü Al</button>
    </form>

    <div class="section-heading">
      <span>Kayıtlı Anlık Görüntüler</span>
      <span class="tabular">${state.snapshots.length} / 25</span>
    </div>

    ${state.snapshots.length
      ? `<div class="snapshot-list">
          ${state.snapshots
            .map((sn, idx) => {
              const diff = diffProgramLists(state.programs, sn.programs);
              let diffTxt = 'Mevcut listeyle birebir aynı';
              let diffTone = 'var(--green)';
              if (!diff.identical) {
                const parts = [];
                if (diff.addedSince) parts.push(`+${diff.addedSince} yeni`);
                if (diff.removedSince) parts.push(`-${diff.removedSince} eksik`);
                if (diff.movedCount) parts.push(`${diff.movedCount} sıra farkı`);
                diffTxt = parts.join(' · ');
                diffTone = 'var(--accent)';
              }
              return `<div class="snapshot-row">
                <div style="min-width:0;">
                  <div style="font-weight:650;font-size:13.5px;">${escapeHtml(sn.label)}</div>
                  <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">
                    ${escapeHtml(sn.scenarioName)} · <strong class="tabular">${sn.programs.length} bölüm</strong> · ${formatRelativeTime(sn.createdAt)}
                  </div>
                  <div style="font-size:11.5px;font-weight:600;color:${diffTone};margin-top:3px;" class="tabular">${escapeHtml(diffTxt)}</div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  <button type="button" class="btn btn-sm ${diff.identical ? 'btn-soft' : 'btn-primary'}" data-restore-snap="${idx}" ${diff.identical ? 'disabled' : ''}>
                    ${diff.identical ? 'Aktif' : 'Geri Yükle'}
                  </button>
                  <button type="button" class="btn btn-ghost btn-icon btn-sm" data-del-snap="${idx}" title="Sil">${SF.trash}</button>
                </div>
              </div>`;
            })
            .join('')}
        </div>`
      : `<div class="chart-empty">Henüz kayıtlı bir liste anlık görüntüsü yok. Yukarıdan ilk anlık görüntünü kaydedebilirsin.</div>`}
  `;

  document.getElementById('createSnapshotForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('snapshotLabelInput')?.value.trim();
    createManualSnapshot(val || defaultLbl);
    renderSnapshotModal();
    renderAll();
    showToast('Liste anlık görüntüsü kaydedildi!', 'success');
  });

  body.querySelectorAll('[data-restore-snap]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const sn = state.snapshots[Number(btn.dataset.restoreSnap)];
      if (!sn) return;
      const ok = await appleConfirm({
        title: `"${sn.label}" geri yüklensin mi?`,
        message: `${sn.programs.length} bölümlük bu sıraya dönülecek. Mevcut sıran önce otomatik yedeklenir.`,
        confirmLabel: 'Geri Yükle',
      });
      if (!ok) return;
      // Auto-backup current state before restoring so nothing is ever lost
      const curDiff = diffProgramLists(state.programs, sn.programs);
      if (!curDiff.identical && state.programs.length) {
        createManualSnapshot(`Otomatik Yedek (Geri Yükleme Öncesi)`);
      }
      state.programs = structuredClone(sn.programs);
      if (sn.targetRank) state.targetRank = sn.targetRank;
      syncActiveScenarioPointers();
      ui.sortBy = 'manual';
      saveState();
      renderSnapshotModal();
      renderAll();
      showToast(`"${sn.label}" geri yüklendi!`, 'success');
    });
  });

  body.querySelectorAll('[data-del-snap]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.snapshots.splice(Number(btn.dataset.delSnap), 1);
      saveState();
      renderSnapshotModal();
      renderAll();
    });
  });
}

// ============================================================================
// Abroad Program Add / Edit Modal (Germany & Italy)
// ============================================================================
function openAbroadModal(editId = null) {
  ui.editingAbroadId = editId;
  const overlay = document.getElementById('abroadModalOverlay');
  const titleEl = document.getElementById('abroadModalTitle');
  const body = document.getElementById('abroadModalBody');
  const existing = editId ? state.abroadPrograms.find((x) => x.id === editId) : null;

  titleEl.textContent = existing ? 'Yurt Dışı Programını Düzenle' : 'Yurt Dışı Program Ekle';

  const v = (val) => escapeHtml(val || '');
  body.innerHTML = `
    ${!existing
      ? `<div>
          <div style="font-size:12px;color:var(--text-tertiary);margin-bottom:6px;">Hızlı şablondan doldur:</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${ABROAD_PRESETS.map((pr, idx) => `<button type="button" class="quick-chip" data-fill-preset="${idx}">${escapeHtml(pr.university.split(' ')[0])} · ${escapeHtml(pr.city)}</button>`).join('')}
          </div>
        </div>`
      : ''}

    <form id="abroadForm" style="display:flex;flex-direction:column;gap:12px;">
      <div class="form-grid-2">
        <div>
          <label class="field-label" for="ab_country">Ülke</label>
          <select id="ab_country" class="select">
            <option value="DE" ${(!existing || existing.country === 'DE') ? 'selected' : ''}>Almanya (DE)</option>
            <option value="IT" ${existing?.country === 'IT' ? 'selected' : ''}>İtalya (IT)</option>
            <option value="OTHER" ${existing?.country === 'OTHER' ? 'selected' : ''}>Diğer Avrupa</option>
          </select>
        </div>
        <div>
          <label class="field-label" for="ab_city">Şehir</label>
          <input id="ab_city" class="input" value="${v(existing?.city)}" placeholder="Münih, Milano, Torino..." required />
        </div>
      </div>

      <div class="form-grid-2">
        <div>
          <label class="field-label" for="ab_uni">Üniversite</label>
          <input id="ab_uni" class="input" value="${v(existing?.university)}" placeholder="Technical University of Munich" required />
        </div>
        <div>
          <label class="field-label" for="ab_dept">Bölüm</label>
          <input id="ab_dept" class="input" value="${v(existing?.department)}" placeholder="B.Sc. Computer Science" required />
        </div>
      </div>

      <div class="form-grid-2">
        <div>
          <label class="field-label" for="ab_lang">Eğitim Dili</label>
          <input id="ab_lang" class="input" value="${v(existing?.language || 'İngilizce')}" placeholder="İngilizce / Almanca" />
        </div>
        <div>
          <label class="field-label" for="ab_lang_req">Dil Belgesi Şartı</label>
          <input id="ab_lang_req" class="input" value="${v(existing?.languageReq)}" placeholder="IELTS 6.5 / TestDaF 4x4 / Goethe C1" />
        </div>
      </div>

      <div class="form-grid-2">
        <div>
          <label class="field-label" for="ab_adm">Kabul / Sınav Şartı</label>
          <input id="ab_adm" class="input" value="${v(existing?.admissionReq)}" placeholder="YKS yerleştirme / TOLC-I / SAT" />
        </div>
        <div>
          <label class="field-label" for="ab_tuition">Harç & Burs Durumu</label>
          <input id="ab_tuition" class="input" value="${v(existing?.tuition)}" placeholder="€320 / dönem veya DSU bursu" />
        </div>
      </div>

      <div class="form-grid-2">
        <div>
          <label class="field-label" for="ab_portal">Başvuru Portalı</label>
          <input id="ab_portal" class="input" value="${v(existing?.portal)}" placeholder="Uni-Assist / Universitaly" />
        </div>
        <div>
          <label class="field-label" for="ab_deadline">Son Başvuru Tarihi</label>
          <input id="ab_deadline" class="input" type="date" value="${v(existing?.deadline)}" />
        </div>
      </div>

      <div>
        <label class="field-label" for="ab_url">Resmi Program Linki</label>
        <input id="ab_url" class="input" type="url" value="${v(existing?.url)}" placeholder="https://..." />
      </div>

      <div>
        <label class="field-label" for="ab_notes">Notlar</label>
        <textarea id="ab_notes" class="textarea" rows="2" placeholder="Yurt, bloke hesap, burs veya bölüm notların...">${v(existing?.notes)}</textarea>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:4px;">
        <button type="button" class="btn" id="cancelAbroadBtn">Vazgeç</button>
        <button type="submit" class="btn btn-primary">${existing ? 'Değişiklikleri Kaydet' : 'Listeye Ekle'}</button>
      </div>
    </form>
  `;

  body.querySelectorAll('[data-fill-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pr = ABROAD_PRESETS[Number(btn.dataset.fillPreset)];
      if (!pr) return;
      document.getElementById('ab_country').value = pr.country;
      document.getElementById('ab_city').value = pr.city;
      document.getElementById('ab_uni').value = pr.university;
      document.getElementById('ab_dept').value = pr.department;
      document.getElementById('ab_lang').value = pr.language;
      document.getElementById('ab_lang_req').value = pr.languageReq;
      document.getElementById('ab_adm').value = pr.admissionReq;
      document.getElementById('ab_tuition').value = pr.tuition;
      document.getElementById('ab_portal').value = pr.portal;
      document.getElementById('ab_deadline').value = pr.deadline;
      document.getElementById('ab_url').value = pr.url;
    });
  });

  document.getElementById('cancelAbroadBtn')?.addEventListener('click', closeAbroadModal);

  document.getElementById('abroadForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const rec = createAbroadRecord({
      id: existing?.id,
      country: document.getElementById('ab_country').value,
      city: document.getElementById('ab_city').value,
      university: document.getElementById('ab_uni').value,
      department: document.getElementById('ab_dept').value,
      language: document.getElementById('ab_lang').value,
      languageReq: document.getElementById('ab_lang_req').value,
      admissionReq: document.getElementById('ab_adm').value,
      tuition: document.getElementById('ab_tuition').value,
      portal: document.getElementById('ab_portal').value,
      deadline: document.getElementById('ab_deadline').value,
      url: document.getElementById('ab_url').value,
      notes: document.getElementById('ab_notes').value,
      status: existing?.status || 'researching',
      checklist: existing?.checklist,
      createdAt: existing?.createdAt,
    });
    if (existing) {
      const idx = state.abroadPrograms.findIndex((x) => x.id === existing.id);
      if (idx !== -1) state.abroadPrograms[idx] = rec;
    } else {
      state.abroadPrograms.push(rec);
    }
    saveState();
    closeAbroadModal();
    renderAll();
    showToast(`${rec.university} kaydedildi.`, 'success');
  });

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeAbroadModal() {
  const overlay = document.getElementById('abroadModalOverlay');
  overlay.classList.remove('open');
  overlay.setAttribute('aria-hidden', 'true');
  ui.editingAbroadId = null;
}

function bindAbroadEvents() {
  document.getElementById('openAbroadAddBtn')?.addEventListener('click', () => openAbroadModal());
  document.getElementById('heroAbroadAddBtn')?.addEventListener('click', () => openAbroadModal());

  document.querySelectorAll('[data-abroad-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const pr = ABROAD_PRESETS[Number(btn.dataset.abroadPreset)];
      if (!pr) return;
      state.abroadPrograms.push(createAbroadRecord(pr));
      saveState();
      renderAll();
      showToast(`${pr.university} yurt dışı listene eklendi.`, 'success');
    });
  });

  document.querySelectorAll('[data-abroad-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.abroadFilter = btn.dataset.abroadFilter;
      renderAll();
    });
  });

  document.querySelectorAll('[data-abroad-status]').forEach((sel) => {
    sel.addEventListener('change', () => {
      const target = state.abroadPrograms.find((x) => x.id === sel.dataset.abroadStatus);
      if (!target) return;
      target.status = sel.value;
      saveState();
      renderAll();
    });
  });

  document.querySelectorAll('[data-abroad-check]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = state.abroadPrograms.find((x) => x.id === btn.dataset.abroadCheck);
      if (!target) return;
      const k = btn.dataset.checkKey;
      target.checklist = { ...(target.checklist || {}), [k]: !target.checklist?.[k] };
      saveState();
      renderAll();
    });
  });

  document.querySelectorAll('[data-abroad-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openAbroadModal(btn.dataset.abroadEdit));
  });

  document.querySelectorAll('[data-abroad-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.abroadPrograms = state.abroadPrograms.filter((x) => x.id !== btn.dataset.abroadDel);
      saveState();
      renderAll();
      showToast('Program yurt dışı listesinden silindi.');
    });
  });

  // Feature 6: Bavarian Formula + Sperrkonto + DSU/Exam tools
  const bindAbroadToolNum = (id, key) => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      const val = Number(e.target.value);
      if (Number.isFinite(val)) {
        state.abroadTools[key] = val;
        saveState();
        renderAll();
      }
    });
  };
  const bindAbroadToolText = (id, key) => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      state.abroadTools[key] = e.target.value.trim();
      saveState();
    });
  };
  bindAbroadToolNum('abToolDiploma', 'diplomaScore');
  bindAbroadToolNum('abToolYks', 'yksScore');
  bindAbroadToolNum('abToolSperrSaved', 'sperrkontoSaved');
  bindAbroadToolNum('abToolIsee', 'iseeEstimate');
  bindAbroadToolText('abToolIelts', 'ieltsScore');
  bindAbroadToolText('abToolTestdaf', 'testdafScore');
  bindAbroadToolText('abToolTolc', 'tolcScore');
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
  const currentRoom = getFirebaseRoom();
  const apiBase = getApiBase();
  const statusTone = ui.syncStatus === 'synced' ? 'green' : ui.syncStatus === 'error' ? 'rose' : 'amber';

  body.innerHTML = `
    <div class="info-banner">
      <strong>Firebase Realtime Database (tercihatlas-2027)</strong> aktif! Mac, iPad ve iPhone'dan uygulamayı açtığın anda tüm tercihlerin, senaryoların, PDF denemelerin, netlerin ve yurt dışı hedeflerin <strong>anında canlı</strong> eşitlenir — anahtar girmene gerek yok.
    </div>

    <div class="sheet-card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:9px;">
        <span class="status-dot ${ui.syncStatus === 'synced' ? 'synced' : ui.syncStatus === 'syncing' ? 'syncing' : ui.syncStatus === 'error' ? 'error' : ''}"></span>
        <div>
          <div style="font-weight:650;font-size:13.5px;color:var(--${statusTone});">${escapeHtml(ui.syncMessage || 'Firebase Canlı')}</div>
          <div style="font-size:11.5px;color:var(--text-tertiary);">
            ${ui.lastSyncedAt ? `Son eşitleme · ${formatRelativeTime(ui.lastSyncedAt)}` : 'Gerçek zamanlı WebSocket bağlantısı'}
          </div>
        </div>
      </div>
      <span class="pill mono">Oda: ${escapeHtml(currentRoom)}</span>
    </div>

    <div>
      <label class="field-label" for="fbRoomInput">Firebase Eşitleme Odası (Varsayılan: main)</label>
      <div style="display:flex;gap:8px;">
        <input id="fbRoomInput" class="input mono" type="text" value="${escapeHtml(currentRoom)}" placeholder="main" />
        <button class="btn btn-primary" type="button" id="saveFbRoomBtn">Bağlan</button>
      </div>
      <div class="field-hint">Tüm cihazlarında aynı oda adı (varsayılan <strong>main</strong>) seçili olduğu sürece otomatik canlı eşitlenir.</div>
    </div>

    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn btn-sm" id="forcePushSyncBtn">Şimdi Buluta Gönder</button>
      <button class="btn btn-sm" id="forcePullSyncBtn">Buluttan Zorla Çek</button>
    </div>

    <hr style="border:none;border-top:0.5px solid var(--separator);margin:2px 0;" />

    <div>
      <label class="field-label" for="apiBaseInput">YÖK Atlas Canlı Veri API (Cloudflare)</label>
      <div style="display:flex;gap:8px;">
        <input id="apiBaseInput" class="input mono" type="url" value="${escapeHtml(apiBase)}"
          placeholder="${isLocalDev() ? 'Yerel sunucu aktif' : 'https://tercihatlas-api.yusuf-kriptobot.workers.dev'}" />
        <button class="btn" type="button" id="testApiBtn">Test Et</button>
      </div>
      <div id="apiTestResult" class="field-hint">
        ${isLocalDev() ? 'Yerel geliştirme sunucusu bağlı.' : hasConfiguredApi() ? 'Canlı YÖK Atlas API bağlı.' : 'API adresi girilmedi.'}
      </div>
    </div>

    <hr style="border:none;border-top:0.5px solid var(--separator);margin:2px 0;" />

    <div>
      <label class="field-label">Dışa Aktar, PDF, Takvim & Yedekleme</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-sm" id="exportPdfBtn">${SF.print} PDF Raporu</button>
        <button class="btn btn-sm" id="exportIcsModalBtn">Takvim (.ics)</button>
        <button class="btn btn-sm" id="exportCsvBtn">Excel / CSV</button>
        <button class="btn btn-sm" id="exportJsonBtn">JSON Yedek</button>
        <label class="btn btn-sm" style="cursor:pointer;">
          Yedek Yükle
          <input type="file" id="importJsonInput" accept="application/json" style="display:none;" />
        </label>
      </div>
    </div>
  `;

  document.getElementById('saveFbRoomBtn')?.addEventListener('click', () => {
    const raw = document.getElementById('fbRoomInput').value.trim();
    const nextRoom = setFirebaseRoom(raw || 'main');
    setCustomApiBase(document.getElementById('apiBaseInput').value.trim());
    startRealtimeFirebaseSync();
    renderSyncModal();
    showToast(`Firebase "${nextRoom}" odasına canlı bağlanıldı.`, 'success');
  });

  document.getElementById('forcePushSyncBtn')?.addEventListener('click', async () => {
    await syncPushNow({ silent: false });
    renderSyncModal();
  });

  document.getElementById('forcePullSyncBtn')?.addEventListener('click', async () => {
    try {
      updateSyncIndicator('syncing', 'Çekiliyor...');
      const res = await pullStateOnceFromFirebase(getFirebaseRoom());
      if (res?.data) {
        state = normalizeState(res.data);
        localStorage.setItem(STATE_KEY, JSON.stringify(state));
        ui.lastSyncedAt = res.updatedAt || new Date().toISOString();
        updateSyncIndicator('synced', 'Firebase Canlı');
        renderAll();
        renderSyncModal();
        showToast('Firebase buluttaki güncel verilerin çekildi!', 'success');
      } else {
        updateSyncIndicator('synced', 'Firebase Canlı');
        showToast('Bulutta henüz kayıtlı veri yok; önce Mac\'ten gönderebilirsin.', 'info');
      }
    } catch (err) {
      updateSyncIndicator('error', 'Hata');
      showToast(err.message || 'Buluttan çekilemedi.', 'error');
    }
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

  document.getElementById('exportPdfBtn')?.addEventListener('click', () => {
    if (!openPrintableReport(state)) showToast('Tarayıcı açılır pencereyi engelledi.', 'error');
  });

  document.getElementById('exportIcsModalBtn')?.addEventListener('click', () => {
    downloadTimelineIcs(state.abroadPrograms);
    showToast('Apple Takvim (.ics) dosyası indirildi.', 'success');
  });

  document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
    if (!state.programs.length) return showToast('Dışa aktarılacak program yok.', 'error');
    exportProgramsToCsv(state.programs);
    showToast('CSV indirildi.', 'success');
  });

  document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
    syncActiveScenarioPointers();
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
      state = normalizeState(parsed);
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
  document.querySelectorAll('[data-switch-scenario]').forEach((btn) => {
    btn.addEventListener('click', () => switchScenario(btn.dataset.switchScenario));
  });
  document.getElementById('newScenarioBtn')?.addEventListener('click', () => createScenario({ duplicateCurrent: false }));
  document.getElementById('dupScenarioBtn')?.addEventListener('click', () => createScenario({ duplicateCurrent: true }));
  document.getElementById('renameScenarioBtn')?.addEventListener('click', renameActiveScenario);
  document.getElementById('delScenarioBtn')?.addEventListener('click', deleteActiveScenario);

  document.getElementById('openDiscoverShortcutBtn')?.addEventListener('click', () => {
    ui.region = 'TR';
    ui.tab = 'analysis';
    ui.analysisSubTab = 'discover';
    renderAll();
  });

  document.getElementById('openRoadmapShortcutBtn')?.addEventListener('click', () => {
    ui.region = 'TR';
    ui.tab = 'analysis';
    ui.analysisSubTab = 'timeline';
    renderAll();
  });

  document.getElementById('openAuditShortcutBtn')?.addEventListener('click', () => {
    ui.region = 'TR';
    ui.tab = 'analysis';
    ui.analysisSubTab = 'overview';
    renderAll();
  });

  const prefMenuBtn = document.getElementById('prefActionsMenuBtn');
  const prefDropdown = document.getElementById('prefActionsDropdown');
  prefMenuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = prefDropdown?.classList.toggle('open');
    prefMenuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.getElementById('refreshAllBtn')?.addEventListener('click', () => {
    prefDropdown?.classList.remove('open');
    refreshAllProgramsLive();
  });
  document.getElementById('openSnapshotsBtn')?.addEventListener('click', () => {
    prefDropdown?.classList.remove('open');
    openSnapshotModal();
  });
  document.getElementById('openPresentationBtn')?.addEventListener('click', () => {
    prefDropdown?.classList.remove('open');
    setPresentationMode(true);
  });
  document.getElementById('exportPngCardBtn')?.addEventListener('click', () => {
    prefDropdown?.classList.remove('open');
    triggerSummaryPngExport();
  });
  document.getElementById('openShortcutsMenuBtn')?.addEventListener('click', () => {
    prefDropdown?.classList.remove('open');
    openShortcutsModal();
  });
  document.getElementById('toggleSelectModeBtn')?.addEventListener('click', () => {
    ui.selectMode = !ui.selectMode;
    if (!ui.selectMode) ui.selectedCodes.clear();
    renderAll();
  });
  document.getElementById('dismissRefreshDiffBtn')?.addEventListener('click', () => {
    ui.refreshDiff = null;
    renderAll();
  });
  document.getElementById('openOsymBtn')?.addEventListener('click', () => {
    prefDropdown?.classList.remove('open');
    openOsymModal();
  });
  document.getElementById('printReportBtn')?.addEventListener('click', () => {
    prefDropdown?.classList.remove('open');
    if (!openPrintableReport(state)) showToast('Tarayıcı açılır pencereyi engelledi.', 'error');
  });

  document.getElementById('heroSpotlightForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('heroCodeInput')?.value.trim();
    openAddModal(val || '');
  });

  document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
    ui.search = '';
    ui.filterRisk = 'all';
    ui.filterScoreType = 'all';
    ui.filterReachable = false;
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
      ui.filterReachable = false;
      renderAll();
    });
  });

  document.querySelectorAll('[data-filter-reachable]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.filterReachable = !ui.filterReachable;
      if (ui.filterReachable) ui.filterRisk = 'all';
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
    let suppressClickUntil = 0;

    item.addEventListener('click', () => {
      if (Date.now() < suppressClickUntil) return;
      if (ui.selectMode) {
        if (ui.selectedCodes.has(code)) ui.selectedCodes.delete(code);
        else ui.selectedCodes.add(code);
        renderAll();
        return;
      }
      ui.kbdFocusCode = code;
      openDrawer(code);
    });
    item.addEventListener('contextmenu', (e) => openContextMenu(e, code));

    // Feature #2 (iPadOS/iPhone Swipe Actions) + Feature #4 (520ms Long-Press Context Menu)
    let touchStartX = 0;
    let touchStartY = 0;
    let touchDx = 0;
    let swipeLocked = false;
    let swipeCancelled = false;
    let longPressTimer = null;
    let swipeBadge = null;

    const cleanupSwipeBadge = () => {
      swipeBadge?.remove();
      swipeBadge = null;
    };

    item.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length !== 1 || e.target.closest('[data-stop-card="1"]')) return;
        const t = e.touches[0];
        touchStartX = t.clientX;
        touchStartY = t.clientY;
        touchDx = 0;
        swipeLocked = false;
        swipeCancelled = false;

        clearTimeout(longPressTimer);
        if (!ui.selectMode) {
          longPressTimer = setTimeout(() => {
            if (!swipeLocked && !swipeCancelled) {
              suppressClickUntil = Date.now() + 500;
              item.classList.add('long-press-armed');
              setTimeout(() => item.classList.remove('long-press-armed'), 220);
              navigator.vibrate?.(12);
              openContextMenu({ clientX: touchStartX, clientY: touchStartY }, code);
            }
          }, 520);
        }
      },
      { passive: true },
    );

    item.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        const dx = t.clientX - touchStartX;
        const dy = t.clientY - touchStartY;

        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          clearTimeout(longPressTimer);
        }
        if (ui.selectMode || swipeCancelled) return;

        if (!swipeLocked) {
          if (Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx)) {
            swipeCancelled = true;
            return;
          }
          if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.2) {
            swipeLocked = true;
            item.classList.add('swiping');
            item.classList.remove('swipe-snap');
          }
        }

        if (swipeLocked) {
          // Soft rubber-band resistance beyond 95px
          const clamped = dx > 0 ? Math.min(110, dx * 0.85) : Math.max(-110, dx * 0.85);
          touchDx = clamped;
          item.style.transform = `translate3d(${clamped}px, 0, 0)`;

          if (!swipeBadge) {
            swipeBadge = document.createElement('span');
            swipeBadge.className = 'swipe-hint-badge';
            item.appendChild(swipeBadge);
          }
          if (clamped > 24) {
            const isCmp = state.compareCodes.includes(code);
            swipeBadge.className = `swipe-hint-badge right ${clamped > 62 ? 'visible' : ''}`;
            swipeBadge.textContent = isCmp ? '✓ Kıyaslamadan Çıkar' : '+ Karşılaştır';
          } else if (clamped < -24 && !ui.readOnlyShare) {
            swipeBadge.className = `swipe-hint-badge left ${clamped < -62 ? 'visible' : ''}`;
            swipeBadge.textContent = 'Listeden Kaldır';
          } else {
            swipeBadge.classList.remove('visible');
          }
        }
      },
      { passive: true },
    );

    const endTouch = () => {
      clearTimeout(longPressTimer);
      if (!swipeLocked) return;
      item.classList.remove('swiping');
      item.classList.add('swipe-snap');
      item.style.transform = 'translate3d(0, 0, 0)';
      suppressClickUntil = Date.now() + 350;

      const finalDx = touchDx;
      cleanupSwipeBadge();
      setTimeout(() => {
        item.classList.remove('swipe-snap');
        item.style.transform = '';
      }, 330);

      if (finalDx > 64) {
        toggleCompare(code);
      } else if (finalDx < -64 && !ui.readOnlyShare) {
        removeProgram(code);
      }
      swipeLocked = false;
      touchDx = 0;
    };

    item.addEventListener('touchend', endTouch, { passive: true });
    item.addEventListener('touchcancel', endTouch, { passive: true });

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
  document.querySelectorAll('[data-cmp-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.compareMode = btn.dataset.cmpMode;
      renderAll();
    });
  });

  document.getElementById('cmpCreateSecondScenarioBtn')?.addEventListener('click', () => {
    createScenario({ duplicateCurrent: true });
  });

  document.getElementById('cmpScenarioASelect')?.addEventListener('change', (e) => {
    ui.cmpScenarioA = e.target.value;
    renderAll();
  });

  document.getElementById('cmpScenarioBSelect')?.addEventListener('change', (e) => {
    ui.cmpScenarioB = e.target.value;
    renderAll();
  });

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
  document.querySelectorAll('[data-analysis-sub]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.analysisSubTab = btn.dataset.analysisSub;
      renderAll();
    });
  });

  document.getElementById('analysisAddBtn')?.addEventListener('click', () => openAddModal());
  document.getElementById('progOpenNetsBtn')?.addEventListener('click', openMyNetsModal);

  // Feature 2: Discover Wizard bindings
  document.getElementById('discoverForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    ui.discover.q = document.getElementById('discQuery')?.value || '';
    ui.discover.rank = Number(document.getElementById('discRank')?.value) || state.targetRank || 15000;
    ui.discover.puanTuru = document.getElementById('discPuan')?.value || 'SAY';
    ui.discover.uniTuru = document.getElementById('discUniType')?.value || '';
    runDiscoverSearch();
  });

  document.querySelectorAll('[data-disc-chip]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const q = btn.dataset.discChip;
      ui.discover.q = q;
      if (q === 'Ekonomi' || q === 'Hukuk') ui.discover.puanTuru = 'EA';
      else ui.discover.puanTuru = 'SAY';
      runDiscoverSearch();
    });
  });

  document.querySelectorAll('[data-disc-add]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const code = btn.dataset.discAdd;
      const risk = btn.dataset.discRisk || 'hedef';
      btn.disabled = true;
      btn.textContent = '...';
      try {
        const full = await fetchProgramFromApi(code);
        addProgramToState(full, risk);
        renderAll();
        showToast(`${full.university} — ${full.department} eklendi.`, 'success');
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `${SF.plus} Ekle`;
        showToast(err.message || 'Eklenemedi.', 'error');
      }
    });
  });

  document.querySelectorAll('[data-prog-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.progressionType = btn.dataset.progType;
      renderAll();
    });
  });

  // Weighted Decision Score sliders (smooth live update without losing focus)
  document.querySelectorAll('[data-weight-key]').forEach((slider) => {
    const key = slider.dataset.weightKey;
    slider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      state.decisionWeights = { ...DEFAULT_DECISION_WEIGHTS, ...(state.decisionWeights || {}), [key]: val };
      const pill = document.getElementById(`weightVal_${key}`);
      if (pill) pill.textContent = String(val);
      const listHost = document.getElementById('decisionRankedList');
      if (listHost) {
        const ranked = computeDecisionScores(state.programs, state.decisionWeights, state.costSettings);
        listHost.innerHTML = renderDecisionRankedListHtml(ranked);
        listHost.querySelectorAll('[data-open-code]').forEach((row) => {
          row.addEventListener('click', () => openDrawer(row.dataset.openCode));
        });
      }
    });
    slider.addEventListener('change', () => saveState());
  });

  document.getElementById('applyDecisionOrderBtn')?.addEventListener('click', () => {
    const ranked = computeDecisionScores(state.programs, state.decisionWeights, state.costSettings);
    if (!ranked.length) return;
    state.programs = ranked.map((r) => r.program);
    ui.sortBy = 'manual';
    ui.region = 'TR';
    ui.tab = 'preferences';
    saveState();
    renderAll();
    showToast('Tercih sıran kişisel karar skoruna göre yeniden dizildi!', 'success');
  });

  document.querySelectorAll('[data-open-code]').forEach((btn) => {
    btn.addEventListener('click', () => openDrawer(btn.dataset.openCode));
  });

  // Map city click
  document.querySelectorAll('[data-map-city]').forEach((pin) => {
    pin.addEventListener('click', () => {
      const city = pin.dataset.mapCity;
      ui.selectedMapCity = ui.selectedMapCity === city ? null : city;
      renderAll();
    });
  });
  document.getElementById('clearMapCityBtn')?.addEventListener('click', () => {
    ui.selectedMapCity = null;
    renderAll();
  });

  // ÖSYM placement simulator rank input
  document.getElementById('simPlacementRankInput')?.addEventListener('change', (e) => {
    const v = Number(e.target.value);
    if (v > 0) {
      ui.simPlacementRank = v;
      renderAll();
    }
  });
  document.getElementById('useEstRankSimBtn')?.addEventListener('click', () => {
    ui.simPlacementRank = null;
    renderAll();
  });
  document.getElementById('simExportPngBtn')?.addEventListener('click', () => {
    triggerSummaryPngExport(ui.simPlacementRank);
  });

  // Feature #8: Interactive Subject Boost bindings
  document.querySelectorAll('[data-boost-st]').forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.subjectBoostScoreType = btn.dataset.boostSt;
      ui.subjectBoostDeltas = {};
      renderAll();
    });
  });
  document.querySelectorAll('[data-boost-key]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.boostKey;
      const step = Number(btn.dataset.boostStep) || 2;
      const prev = Number(ui.subjectBoostDeltas?.[k]) || 0;
      ui.subjectBoostDeltas = { ...(ui.subjectBoostDeltas || {}), [k]: prev + step };
      renderAll();
    });
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const k = btn.dataset.boostKey;
      const next = { ...(ui.subjectBoostDeltas || {}) };
      delete next[k];
      ui.subjectBoostDeltas = next;
      renderAll();
    });
  });
  document.getElementById('resetSubjectBoostBtn')?.addEventListener('click', () => {
    ui.subjectBoostDeltas = {};
    renderAll();
  });

  // Feature #6: Auto-Fix Dead Preference Order + Hydrate Rank Gap Fillers from 0ms Catalog
  document.getElementById('autoFixOrderBtn')?.addEventListener('click', () => {
    state.programs.sort((a, b) => {
      const ra = Number(a.latestRank) || 9e9;
      const rb = Number(b.latestRank) || 9e9;
      return ra - rb;
    });
    ui.sortBy = 'manual';
    saveState();
    renderAll();
    showToast('Tercih listesi ÖSYM taban sırasına göre otomatik düzenlendi!', 'success');
  });

  document.querySelectorAll('[data-gap-low][data-gap-high]').forEach((host) => {
    const low = Number(host.dataset.gapLow);
    const high = Number(host.dataset.gapHigh);
    findGapFillersInCatalog(low, high, { programs: state.programs, limit: 3 })
      .then((fillers) => {
        if (!document.body.contains(host)) return;
        if (!fillers.length) {
          host.innerHTML = `<span style="font-size:12px;color:var(--text-tertiary);">Bu aralıkta mevcut alanına uygun ek katalog önerisi bulunamadı.</span>`;
          return;
        }
        host.innerHTML = fillers
          .map(
            (f) => `<div class="gap-filler-item">
              <div style="min-width:0;flex:1;">
                <strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(f.university)} — ${escapeHtml(f.department)}</strong>
                <span style="font-size:11.5px;color:var(--text-secondary);">${escapeHtml(f.city)} · ${escapeHtml(f.language)} · <strong class="tabular">${formatRank(f.latestRank)}</strong></span>
              </div>
              ${!ui.readOnlyShare
                ? `<button class="btn btn-soft btn-sm" type="button" data-gap-add="${escapeHtml(f.code)}" style="flex-shrink:0;">${SF.plus} Ekle</button>`
                : ''}
            </div>`,
          )
          .join('');
        host.querySelectorAll('[data-gap-add]').forEach((btn) => {
          btn.addEventListener('click', async () => {
            const code = btn.dataset.gapAdd;
            btn.disabled = true;
            btn.textContent = '...';
            try {
              const full = await fetchProgramFromApi(code);
              addProgramToState(full);
              renderAll();
              showToast(`${full.university} — ${full.department} boşluğu doldurmak üzere eklendi.`, 'success');
            } catch (err) {
              btn.disabled = false;
              btn.innerHTML = `${SF.plus} Ekle`;
              showToast(err.message || 'Eklenemedi.', 'error');
            }
          });
        });
      })
      .catch(() => {});
  });

  // Feature #10: Roadmap Checklist & Custom Milestones
  document.querySelectorAll('[data-roadmap-check]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.roadmapCheck;
      state.roadmapChecks = { ...(state.roadmapChecks || {}), [id]: cb.checked };
      saveState();
      renderAll();
    });
  });

  document.getElementById('addCustomMilestoneBtn')?.addEventListener('click', () => {
    const textEl = document.getElementById('customMilestoneText');
    const dateEl = document.getElementById('customMilestoneDate');
    const text = textEl?.value.trim();
    if (!text) return;
    const item = { id: `cm_${Date.now()}`, text, date: dateEl?.value || '', done: false };
    state.customMilestones = [...(state.customMilestones || []), item];
    saveState();
    renderAll();
    showToast('Kişisel hedef yol haritana eklendi.', 'success');
  });

  document.querySelectorAll('[data-custom-milestone-toggle]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const id = cb.dataset.customMilestoneToggle;
      state.customMilestones = (state.customMilestones || []).map((c) => (c.id === id ? { ...c, done: cb.checked } : c));
      saveState();
      renderAll();
    });
  });

  document.querySelectorAll('[data-custom-milestone-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.customMilestoneDel;
      state.customMilestones = (state.customMilestones || []).filter((c) => c.id !== id);
      saveState();
      renderAll();
    });
  });

  // Net simulator sliders
  document.getElementById('simTytSlider')?.addEventListener('input', (e) => {
    ui.simTytBoost = Number(e.target.value);
    renderAll();
  });
  document.getElementById('simAytSlider')?.addEventListener('input', (e) => {
    ui.simAytBoost = Number(e.target.value);
    renderAll();
  });

  // Cost settings live update
  const bindCostInput = (id, key) => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      const val = Number(e.target.value);
      if (val > 0) {
        state.costSettings[key] = val;
        saveState();
        renderAll();
      }
    });
  };
  bindCostInput('costIst', 'monthlyIstanbul');
  bindCostInput('costMetro', 'monthlyMetro');
  bindCostInput('costOther', 'monthlyOther');
  bindCostInput('costEur', 'eurTry');

  // Timeline ICS download
  document.getElementById('exportIcsBtn')?.addEventListener('click', () => {
    downloadTimelineIcs(state.abroadPrograms);
    showToast('Apple Takvim (.ics) dosyası indirildi.', 'success');
  });
}

// ============================================================================
// Bootstrap & Read-Only Share Loader
// ============================================================================
async function loadSharedLinkIfPresent() {
  const shareId = new URLSearchParams(window.location.search).get('share');
  if (!shareId) return false;
  try {
    const res = await fetchShareSnapshot(shareId);
    if (res?.data) {
      ui.readOnlyShare = {
        title: res.data.title || 'Paylaşılan Tercih Listesi',
        ownerName: res.data.ownerName || '',
        sharedAt: res.data.sharedAt,
      };
      state = normalizeState({
        targetRank: res.data.targetRank,
        programs: res.data.programs || [],
        abroadPrograms: res.data.abroadPrograms || [],
      });
      renderAll();
      return true;
    }
  } catch (err) {
    showToast(err.message || 'Paylaşım linki yüklenemedi.', 'error');
  }
  return false;
}

async function init() {
  initTheme();
  initSheetSwipeDismiss();

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

  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleAppearancePopover);

  document.getElementById('appearancePopover')?.addEventListener('click', (e) => e.stopPropagation());

  document.querySelectorAll('#themeModeSegmented [data-theme-mode]').forEach((btn) => {
    btn.addEventListener('click', () => applyThemeMode(btn.dataset.themeMode));
  });

  document.querySelectorAll('#accentSwatches [data-accent-pick]').forEach((btn) => {
    btn.addEventListener('click', () => applyAccent(btn.dataset.accentPick));
  });

  document.querySelectorAll('#surfaceStyleSegmented [data-surface-pick]').forEach((btn) => {
    btn.addEventListener('click', () => applySurfaceStyle(btn.dataset.surfacePick));
  });

  document.getElementById('exitPresentationBtn')?.addEventListener('click', () => setPresentationMode(false));

  document.getElementById('openAddBtn')?.addEventListener('click', () => openAddModal());
  document.getElementById('closeAddModalBtn')?.addEventListener('click', closeAddModal);
  document.getElementById('addModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'addModalOverlay') closeAddModal();
  });
  document.getElementById('fetchProgramBtn')?.addEventListener('click', handleSpotlightAction);

  document.querySelectorAll('[data-sample-query]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById('programCodeInput');
      inp.value = btn.dataset.sampleQuery;
      autoSizeSpotlightInput(inp);
      renderSpotlightLocalHits(inp.value);
      handleSpotlightAction();
    });
  });

  const spotlightInput = document.getElementById('programCodeInput');
  spotlightInput?.addEventListener('input', () => {
    ui.spotlightIdx = -1;
    autoSizeSpotlightInput(spotlightInput);
    renderSpotlightLocalHits(spotlightInput.value);
  });
  spotlightInput?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      const items = getSpotlightNavItems();
      if (items.length) {
        e.preventDefault();
        highlightSpotlightIdx(ui.spotlightIdx + 1);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      const items = getSpotlightNavItems();
      if (items.length) {
        e.preventDefault();
        highlightSpotlightIdx(ui.spotlightIdx <= 0 ? items.length - 1 : ui.spotlightIdx - 1);
      }
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const items = getSpotlightNavItems();
      if (ui.spotlightIdx >= 0 && items[ui.spotlightIdx]) {
        const activeRow = items[ui.spotlightIdx];
        const addBtn = activeRow.querySelector('[data-search-add]');
        if (addBtn) addBtn.click();
        else activeRow.click();
        return;
      }
      handleSpotlightAction();
    }
  });

  document.getElementById('openMyNetsBtn')?.addEventListener('click', openMyNetsModal);
  document.getElementById('closeMyNetsBtn')?.addEventListener('click', closeMyNetsModal);
  document.getElementById('myNetsModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'myNetsModalOverlay') closeMyNetsModal();
  });

  document.getElementById('closeAbroadModalBtn')?.addEventListener('click', closeAbroadModal);
  document.getElementById('abroadModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'abroadModalOverlay') closeAbroadModal();
  });

  document.getElementById('closeOsymModalBtn')?.addEventListener('click', closeOsymModal);
  document.getElementById('osymModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'osymModalOverlay') closeOsymModal();
  });

  document.getElementById('closeSnapshotModalBtn')?.addEventListener('click', closeSnapshotModal);
  document.getElementById('snapshotModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'snapshotModalOverlay') closeSnapshotModal();
  });

  document.getElementById('closeShortcutsModalBtn')?.addEventListener('click', closeShortcutsModal);
  document.getElementById('shortcutsModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'shortcutsModalOverlay') closeShortcutsModal();
  });

  document.getElementById('openSyncBtn')?.addEventListener('click', openSyncModal);
  document.getElementById('closeSyncModalBtn')?.addEventListener('click', closeSyncModal);
  document.getElementById('syncModalOverlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'syncModalOverlay') closeSyncModal();
  });

  document.getElementById('drawerBackdrop')?.addEventListener('click', closeDrawer);

  window.addEventListener('scroll', updateCollapsingHeader, { passive: true });
  window.addEventListener('resize', () => {
    updateDesktopNavThumb({ animate: false });
    updateMobileNavThumb({ animate: false });
    initSlidingSegmentedControls();
  });
  document.fonts?.ready?.then?.(() => {
    updateDesktopNavThumb({ animate: false });
    updateMobileNavThumb({ animate: false });
    initSlidingSegmentedControls();
  });
  document.addEventListener('click', () => {
    closeContextMenu();
    closeAppearancePopover();
    document.getElementById('prefActionsDropdown')?.classList.remove('open');
  });

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
    const anyModalOpen = Boolean(document.querySelector('.modal-overlay.open'));

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openAddModal();
      return;
    }

    if (e.key === 'Escape') {
      if (activeDialogClose) {
        activeDialogClose();
        return;
      }
      if (document.body.classList.contains('presentation-mode') && !ui.drawerCode) {
        setPresentationMode(false);
      }
      if (ui.selectMode) {
        ui.selectMode = false;
        ui.selectedCodes.clear();
        renderAll();
      }
      closeContextMenu();
      closeAppearancePopover();
      document.getElementById('prefActionsDropdown')?.classList.remove('open');
      closeDrawer();
      closeAddModal();
      closeMyNetsModal();
      closeAbroadModal();
      closeOsymModal();
      closeSnapshotModal();
      closeSyncModal();
      closeShortcutsModal();
      return;
    }

    if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

    // Drawer left/right navigation
    if (ui.drawerCode && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      stepDrawerProgram(e.key === 'ArrowLeft' ? -1 : 1);
      return;
    }

    // '?' toggles macOS Keyboard Shortcuts Overlay
    if (e.key === '?') {
      e.preventDefault();
      const ov = document.getElementById('shortcutsModalOverlay');
      if (ov?.classList.contains('open')) closeShortcutsModal();
      else openShortcutsModal();
      return;
    }

    if (anyModalOpen) return;

    // 1..5 instant tab navigation
    if (e.key === '1') {
      ui.region = 'TR';
      ui.tab = 'preferences';
      renderAll();
      return;
    }
    if (e.key === '2') {
      ui.region = 'TR';
      ui.tab = 'compare';
      renderAll();
      return;
    }
    if (e.key === '3') {
      ui.region = 'TR';
      ui.tab = 'analysis';
      renderAll();
      return;
    }
    if (e.key === '4') {
      ui.region = 'ABROAD';
      renderAll();
      return;
    }
    if (e.key === '5') {
      ui.region = 'TR';
      ui.tab = 'analysis';
      ui.analysisSubTab = 'timeline';
      renderAll();
      return;
    }

    const lower = e.key.toLowerCase();
    if (lower === 'p') {
      e.preventDefault();
      setPresentationMode(!document.body.classList.contains('presentation-mode'));
      return;
    }

    if (lower === 's' && ui.region === 'TR' && ui.tab === 'preferences' && !ui.readOnlyShare && state.programs.length) {
      e.preventDefault();
      ui.selectMode = !ui.selectMode;
      if (!ui.selectMode) ui.selectedCodes.clear();
      renderAll();
      return;
    }

    // Preferences list keyboard navigation (J/K, Space, Shift+ArrowUp/Down)
    if (ui.region === 'TR' && ui.tab === 'preferences' && state.programs.length) {
      const visible = getFilteredPrograms();
      if (!visible.length) return;
      const curIdx = visible.findIndex((p) => p.code === ui.kbdFocusCode);

      if (lower === 'j' || (!e.shiftKey && e.key === 'ArrowDown')) {
        e.preventDefault();
        const nextIdx = curIdx === -1 ? 0 : Math.min(visible.length - 1, curIdx + 1);
        ui.kbdFocusCode = visible[nextIdx].code;
        document.querySelectorAll('#programList [data-code]').forEach((el) => {
          el.classList.toggle('kbd-focused', el.dataset.code === ui.kbdFocusCode);
        });
        document.querySelector(`#programList [data-code="${ui.kbdFocusCode}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }

      if (lower === 'k' || (!e.shiftKey && e.key === 'ArrowUp')) {
        e.preventDefault();
        const nextIdx = curIdx <= 0 ? 0 : curIdx - 1;
        ui.kbdFocusCode = visible[nextIdx].code;
        document.querySelectorAll('#programList [data-code]').forEach((el) => {
          el.classList.toggle('kbd-focused', el.dataset.code === ui.kbdFocusCode);
        });
        document.querySelector(`#programList [data-code="${ui.kbdFocusCode}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }

      if (e.key === ' ' && ui.kbdFocusCode) {
        e.preventDefault();
        if (ui.drawerCode === ui.kbdFocusCode) closeDrawer();
        else openDrawer(ui.kbdFocusCode);
        return;
      }

      if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && ui.kbdFocusCode && !ui.readOnlyShare) {
        e.preventDefault();
        moveProgramStep(ui.kbdFocusCode, e.key === 'ArrowUp' ? -1 : 1);
      }
    }
  });

  if ('serviceWorker' in navigator) {
    const hadController = Boolean(navigator.serviceWorker.controller);
    let swReloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController && !swReloading) {
        swReloading = true;
        window.location.reload();
      }
    });
    navigator.serviceWorker
      .register('./sw.js', { updateViaCache: 'none' })
      .then((reg) => reg.update().catch(() => {}))
      .catch(() => {});
  }

  renderAll();
  const loadedShare = await loadSharedLinkIfPresent();
  if (!loadedShare) {
    startRealtimeFirebaseSync();
  }
}

init();
