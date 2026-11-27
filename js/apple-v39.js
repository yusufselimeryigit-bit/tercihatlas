/**
 * TercihAtlas — v39 Simplification & Decision Intelligence Suite
 * 1. Smart Filter Popover (Decluttered Toolbar + City, Type/Scholarship, Language, Max Rank)
 * 2. 4-Pillar Grouped Analysis Navigation (Replacing 9 Scrolling Sub-Tabs)
 * 3. 3-Step Smart Preference Wizard (0ms Balanced List Builder from 12,239 Catalog)
 * 4. Exam Day 3-Scenario Stress Test (Super Day -25% · Expected · Tough Day +35%)
 * 5. Pairwise Tournament Ranker ("Hangisi Üste Yazılmalı?" — Interactive Merge-Sort)
 * 6. 1-Row Quick Exam Entry + Weekly Pace & ETA Indicator
 */

import {
  escapeHtml,
  formatRank,
  formatNet,
  RISK_META,
  getUniInitials,
  suggestRisk,
} from './utils.js?v=26';
import { getLogoUrl } from './api.js?v=26';

// ============================================================================
// Feature 1: Smart Filter Popover (Decluttered Toolbar + Power Filters)
// ============================================================================
export function countActiveAdvancedFilters(ui) {
  let n = 0;
  if (ui.filterReachable) n += 1;
  if (ui.filterNewOnly) n += 1;
  if (ui.filterQuotaUp) n += 1;
  if (ui.filterScoreType && ui.filterScoreType !== 'all') n += 1;
  if (ui.filterCity && ui.filterCity !== 'all') n += 1;
  if (ui.filterUniType && ui.filterUniType !== 'all') n += 1;
  if (ui.filterLanguage && ui.filterLanguage !== 'all') n += 1;
  if (ui.filterMaxRank && Number(ui.filterMaxRank) > 0) n += 1;
  if (ui.filterCalcRank) n += 1;
  return n;
}

export function renderFilterPopoverHtml(ui, programs, { est, reachableCount, newCount, quotaUpCount, scoreTypes }) {
  const cities = [...new Set((programs || []).map((p) => p.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));
  const activeCount = countActiveAdvancedFilters(ui);

  return `
    <div class="fp-header">
      <strong>Akıllı Filtreler</strong>
      ${activeCount ? `<button class="fp-clear-link" type="button" id="fpResetAllBtn">Sıfırla (${activeCount})</button>` : '<span style="font-size:11px;color:var(--text-tertiary);">Tümü açık</span>'}
    </div>

    <div class="fp-chips-row">
      ${est
        ? `<button class="filter-pill ${ui.filterReachable ? 'active' : ''}" type="button" data-filter-reachable="1">✓ Şu An Giriyorsun (${reachableCount})</button>`
        : ''}
      <button class="filter-pill ${ui.filterNewOnly ? 'active' : ''}" type="button" data-filter-new="1">Yeni Açılanlar${newCount ? ` (${newCount})` : ''}</button>
      <button class="filter-pill ${ui.filterQuotaUp ? 'active' : ''}" type="button" data-filter-quota-up="1">Kontenjanı Artanlar${quotaUpCount ? ` (${quotaUpCount})` : ''}</button>
      ${scoreTypes.length > 1
        ? scoreTypes
            .map(
              (st) =>
                `<button class="filter-pill ${ui.filterScoreType === st ? 'active' : ''}" type="button" data-filter-st="${escapeHtml(st)}">${escapeHtml(st)}</button>`,
            )
            .join('')
        : ''}
    </div>

    <div class="fp-grid">
      <label class="fp-field">
        <span>Şehir</span>
        <select class="select" id="fpCitySelect">
          <option value="all" ${!ui.filterCity || ui.filterCity === 'all' ? 'selected' : ''}>Tüm Şehirler (${cities.length})</option>
          ${cities.map((c) => `<option value="${escapeHtml(c)}" ${ui.filterCity === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
        </select>
      </label>

      <label class="fp-field">
        <span>Üniversite / Burs</span>
        <select class="select" id="fpUniTypeSelect">
          <option value="all" ${!ui.filterUniType || ui.filterUniType === 'all' ? 'selected' : ''}>Devlet + Vakıf</option>
          <option value="DEVLET" ${ui.filterUniType === 'DEVLET' ? 'selected' : ''}>Sadece Devlet</option>
          <option value="VAKIF" ${ui.filterUniType === 'VAKIF' ? 'selected' : ''}>Sadece Vakıf</option>
          <option value="BURSLU" ${ui.filterUniType === 'BURSLU' ? 'selected' : ''}>%100 Burslu / Ücretsiz</option>
        </select>
      </label>

      <label class="fp-field">
        <span>Eğitim Dili</span>
        <select class="select" id="fpLangSelect">
          <option value="all" ${!ui.filterLanguage || ui.filterLanguage === 'all' ? 'selected' : ''}>Tüm Diller</option>
          <option value="EN" ${ui.filterLanguage === 'EN' ? 'selected' : ''}>İngilizce</option>
          <option value="TR" ${ui.filterLanguage === 'TR' ? 'selected' : ''}>Türkçe</option>
        </select>
      </label>

      <label class="fp-field">
        <span>Max Taban Sıralama</span>
        <input class="input tabular" id="fpMaxRankInput" type="number" min="1" step="1000" placeholder="Örn. 25000" value="${ui.filterMaxRank || ''}" />
      </label>
    </div>
  `;
}

// ============================================================================
// Feature 2: 4-Pillar Grouped Analysis Navigation
// ============================================================================
export const ANALYSIS_PILLARS = [
  {
    id: 'risk',
    label: 'Özet & Risk',
    subs: [
      { key: 'overview', label: 'Sağlık & Özet' },
      { key: 'simulator', label: 'Simülatör & Stres Testi' },
      { key: 'decision', label: 'Karar Skoru' },
    ],
  },
  {
    id: 'scores',
    label: 'Puan & Gelişim',
    subs: [
      { key: 'calculator', label: 'Puan Hesapla (16 Ders)' },
      { key: 'progression', label: 'Deneme Gelişimi' },
    ],
  },
  {
    id: 'explore',
    label: 'Keşfet & Maliyet',
    subs: [
      { key: 'discover', label: 'Bölüm Keşfet' },
      { key: 'map', label: 'Kampüs Haritası' },
      { key: 'cost', label: '4 Yıllık Maliyet' },
    ],
  },
  {
    id: 'timeline',
    label: 'Takvim',
    subs: [{ key: 'timeline', label: 'YKS 2027 Takvim & Yol Haritası' }],
  },
];

export function getPillarForAnalysisSub(subKey) {
  return ANALYSIS_PILLARS.find((p) => p.subs.some((s) => s.key === subKey)) || ANALYSIS_PILLARS[0];
}

export function renderGroupedAnalysisHeaderHtml(activeSub, programCount) {
  const activePillar = getPillarForAnalysisSub(activeSub);
  const activeSubObj = activePillar.subs.find((s) => s.key === activeSub) || activePillar.subs[0];

  return `
    <div class="page-header analysis-grouped-header">
      <div>
        <h1 class="page-title">Analiz</h1>
        <p class="page-status tabular">${escapeHtml(activeSubObj.label)} · ${programCount} tercih</p>
      </div>
      <div class="analysis-nav-stack">
        <div class="segmented" role="tablist" aria-label="Analiz ana kategorileri">
          ${ANALYSIS_PILLARS.map(
            (p) =>
              `<button class="seg-btn seg-btn-sm ${p.id === activePillar.id ? 'active' : ''}" data-analysis-pillar="${p.id}">${p.label}</button>`,
          ).join('')}
        </div>
        ${activePillar.subs.length > 1
          ? `<div class="analysis-sub-pills" role="tablist" aria-label="${escapeHtml(activePillar.label)} alt görünümleri">
              ${activePillar.subs
                .map(
                  (s) =>
                    `<button class="analysis-sub-chip ${s.key === activeSub ? 'active' : ''}" type="button" data-analysis-sub="${s.key}">${s.label}</button>`,
                )
                .join('')}
            </div>`
          : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// Feature 4: Exam Day 3-Scenario Stress Test (Super Day / Expected / Tough Day)
// ============================================================================
export function computeExamDayStressTest(programs, baseRank, simulateOsymPlacement) {
  const target = Math.max(1, Number(baseRank) || 15000);
  const scenarios = [
    {
      id: 'super',
      title: 'Süper Gün',
      deltaLabel: '-%25 daha iyi',
      tone: 'green',
      rank: Math.max(1, Math.round(target * 0.75)),
    },
    {
      id: 'expected',
      title: 'Beklenen Gün',
      deltaLabel: 'Hedef sıran',
      tone: 'accent',
      rank: target,
    },
    {
      id: 'tough',
      title: 'Zor Gün',
      deltaLabel: '+%35 daha geride',
      tone: 'rose',
      rank: Math.round(target * 1.35),
    },
  ];

  return scenarios.map((sc) => {
    const res = simulateOsymPlacement?.(programs || [], sc.rank) || null;
    const win = res?.winner || res?.borderlineWinner || null;
    const isBorderline = !res?.winner && Boolean(res?.borderlineWinner);
    return {
      ...sc,
      winner: win,
      isBorderline,
      unplaced: !win,
    };
  });
}

export function renderExamDayStressTestHtml(results) {
  if (!Array.isArray(results) || !results.length) return '';
  const hasToughRisk = results.find((r) => r.id === 'tough')?.unplaced;

  return `
    <div class="panel panel-full stress-test-panel">
      <div class="panel-title" style="flex-wrap:wrap;gap:8px;">
        <div>
          <span style="display:block;">Sınav Günü 3'lü Stres Testi</span>
          <span style="font-size:12px;font-weight:450;color:var(--text-secondary);">Sınav anındaki ± dalgalanmalara göre listendeki kırılma noktasını tek bakışta gör</span>
        </div>
        ${hasToughRisk
          ? `<button class="btn btn-soft btn-sm" type="button" id="stressAddSafetyBtn">Güvenli Tercih Ekle (Sihirbaz)</button>`
          : `<span class="pill pill-risk-guvenli">✓ Zor Günde Bile Güvendesin</span>`}
      </div>
      <div class="stress-cards-grid">
        ${results
          .map((sc) => {
            const w = sc.winner;
            const logo = w ? getLogoUrl(w.program.universityId) : '';
            const initials = w ? escapeHtml(getUniInitials(w.program.university)) : '!';
            return `
              <div class="stress-card tone-${sc.unplaced ? 'rose' : sc.tone}">
                <div class="stress-card-top">
                  <strong>${sc.title}</strong>
                  <span class="pill tabular">${sc.deltaLabel}</span>
                </div>
                <div class="stress-rank tabular">#${formatRank(sc.rank)}</div>
                ${w
                  ? `<div class="stress-outcome">
                      <span class="stress-sq">
                        ${logo ? `<img src="${escapeHtml(logo)}" alt="" onerror="this.style.display='none';this.parentElement.textContent='${initials}'" />` : initials}
                      </span>
                      <div style="min-width:0;flex:1;">
                        <div class="stress-dept">${escapeHtml(w.program.department)}</div>
                        <div class="stress-uni">#${w.order} · ${escapeHtml(w.program.university)}${sc.isBorderline ? ' (Sınırda)' : ''}</div>
                      </div>
                    </div>`
                  : `<div class="stress-unplaced">
                      <strong>Açıkta Kalma Riski</strong>
                      <span>Bu sıralamayı tutacak güvenli bir tercih henüz listenin altında yok.</span>
                    </div>`}
              </div>`;
          })
          .join('')}
      </div>
    </div>
  `;
}

// ============================================================================
// Feature 3: 3-Step Smart Preference Wizard (0ms Balanced List from Catalog)
// ============================================================================
export async function generateSmartWizardPlan(
  { puanTuru = 'SAY', targetRank = 15000, query = 'Bilgisayar', uniTuru = '', city = '', mode = 'balanced', excludeCodes = [] },
  { searchProgramsInCatalog },
) {
  const target = Math.max(500, Number(targetRank) || 15000);
  const exclude = new Set(excludeCodes || []);
  const qStr = [query, city].filter(Boolean).join(' ').trim();

  const pickBand = async (minR, maxR, wantCount, forcedRisk) => {
    const res = await searchProgramsInCatalog({
      q: qStr,
      puanTuru,
      uniTuru,
      minRank: Math.max(1, Math.round(minR)),
      maxRank: Math.round(maxR),
      size: 36,
    });
    const list = (res?.items || [])
      .filter((p) => p.latestRank && !exclude.has(p.code))
      .sort((a, b) => a.latestRank - b.latestRank);

    // Spread picks evenly across the band for diversity
    const chosen = [];
    const usedUniDept = new Set();
    for (const item of list) {
      const key = `${item.university}|${item.department}`;
      if (usedUniDept.has(key)) continue;
      usedUniDept.add(key);
      exclude.add(item.code);
      chosen.push({ ...item, risk: forcedRisk || suggestRisk(item.latestRank, target) });
      if (chosen.length >= wantCount) break;
    }
    return chosen;
  };

  if (mode === 'safety') {
    const safe = await pickBand(target * 1.28, target * 2.25, 4, 'guvenli');
    return safe.sort((a, b) => (a.latestRank || 9e9) - (b.latestRank || 9e9));
  }

  const [hayal, hedef, guvenli] = await Promise.all([
    pickBand(target * 0.42, target * 0.86, 3, 'hayal'),
    pickBand(target * 0.87, target * 1.26, 5, 'hedef'),
    pickBand(target * 1.27, target * 2.15, 4, 'guvenli'),
  ]);

  return [...hayal, ...hedef, ...guvenli].sort((a, b) => (a.latestRank || 9e9) - (b.latestRank || 9e9));
}

export function renderWizardModalHtml(formState, previewItems = null, busy = false) {
  const presets = ['Bilgisayar', 'Tıp', 'Elektrik-Elektronik', 'Endüstri', 'Hukuk', 'Ekonomi', 'Makine', 'Mimarlık', 'Psikoloji'];

  return `
    <div class="wiz-shell">
      <div class="wiz-intro">
        12.239 programlık yerleşik YÖK Atlas kataloğundan <strong>0 ms'de</strong> sıfır ölü tercihli, dengeli bir <strong>Hayal · Hedef · Güvenli</strong> paketi kur.
      </div>

      <form class="wiz-form" id="smartWizardForm">
        <div class="wiz-grid">
          <label class="fp-field">
            <span>Puan Türü</span>
            <select class="select" id="wizPuan">
              ${['SAY', 'EA', 'SÖZ', 'DİL'].map((st) => `<option value="${st}" ${formState.puanTuru === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </label>
          <label class="fp-field">
            <span>Hedef Sıralama</span>
            <input class="input tabular" id="wizRank" type="number" min="500" step="500" value="${formState.targetRank || 15000}" required />
          </label>
          <label class="fp-field">
            <span>Üniversite Türü</span>
            <select class="select" id="wizUniType">
              <option value="" ${!formState.uniTuru ? 'selected' : ''}>Devlet + Vakıf</option>
              <option value="DEVLET" ${formState.uniTuru === 'DEVLET' ? 'selected' : ''}>Sadece Devlet</option>
              <option value="VAKIF" ${formState.uniTuru === 'VAKIF' ? 'selected' : ''}>Sadece Vakıf</option>
            </select>
          </label>
          <label class="fp-field">
            <span>Şehir (İsteğe Bağlı)</span>
            <input class="input" id="wizCity" type="text" placeholder="Örn. İstanbul, Ankara..." value="${escapeHtml(formState.city || '')}" />
          </label>
        </div>

        <div class="fp-field">
          <span>Bölüm / Alan</span>
          <input class="input" id="wizQuery" type="text" placeholder="Örn. Bilgisayar, Tıp, Hukuk..." value="${escapeHtml(formState.query || '')}" />
          <div class="wiz-preset-chips">
            ${presets.map((p) => `<button type="button" class="quick-chip" data-wiz-preset="${p}">${p}</button>`).join('')}
          </div>
        </div>

        <div class="wiz-mode-row">
          <div class="segmented" style="width:100%;">
            <button type="button" class="seg-btn seg-btn-sm ${formState.mode !== 'safety' ? 'active' : ''}" style="flex:1;" data-wiz-mode="balanced">Yeni Dengeli Plan (12 Bölüm)</button>
            <button type="button" class="seg-btn seg-btn-sm ${formState.mode === 'safety' ? 'active' : ''}" style="flex:1;" data-wiz-mode="safety">Listeme +4 Güvenli Ekle</button>
          </div>
        </div>

        <button class="btn btn-primary" type="submit" ${busy ? 'disabled' : ''}>
          ${busy ? 'Katalog Taranıyor...' : 'Dengeli Liste Oluştur'}
        </button>
      </form>

      ${Array.isArray(previewItems)
        ? previewItems.length
          ? `<div class="wiz-preview">
              <div class="wiz-preview-head">
                <strong>Önerilen Liste (${previewItems.length} Bölüm · 0 Ölü Tercih)</strong>
                <button class="btn btn-primary btn-sm" type="button" id="wizApplyPlanBtn">
                  ${formState.mode === 'safety' ? 'Aktif Listeme Ekle' : 'Yeni Senaryo Olarak Kaydet'}
                </button>
              </div>
              <div class="wiz-preview-list">
                ${previewItems
                  .map(
                    (p, i) => `
                  <div class="wiz-row">
                    <span class="mono" style="font-size:11px;color:var(--text-tertiary);width:24px;">#${String(i + 1).padStart(2, '0')}</span>
                    <div style="min-width:0;flex:1;">
                      <strong>${escapeHtml(p.department)}</strong>
                      <small>${escapeHtml(p.university)} · ${escapeHtml(p.city)} · ${escapeHtml(p.scholarship || p.universityType)}</small>
                    </div>
                    <span class="pill pill-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml((RISK_META[p.risk] || RISK_META.hedef).label)}</span>
                    <strong class="tabular" style="font-size:12.5px;">${formatRank(p.latestRank)}</strong>
                  </div>`,
                  )
                  .join('')}
              </div>
            </div>`
          : `<div class="chart-empty">Bu kriterlerde eşleşen bölüm bulunamadı. Şehir filtresini boş bırakarak veya sıralama aralığını değiştirerek tekrar deneyebilirsin.</div>`
        : ''}
    </div>
  `;
}

// ============================================================================
// Feature 5: Pairwise Tournament Ranker (Interactive Merge-Sort)
// ============================================================================
export function createTournamentEngine(programs) {
  const items = (programs || []).map((p, idx) => ({ code: p.code, originalOrder: idx + 1, program: p }));
  if (items.length < 2) {
    return { done: true, sorted: items, currentPair: null, stepsDone: 0, estTotal: 0, choose: () => {} };
  }

  // Bottom-up iterative merge-sort queue
  let runs = items.map((it) => [it]);
  let nextRuns = [];
  let left = null;
  let right = null;
  let merged = [];
  let stepsDone = 0;
  const estTotal = Math.max(1, Math.round(items.length * Math.log2(items.length) - items.length * 0.45));

  const advance = () => {
    while (true) {
      if (left && right) {
        if (left.length && right.length) return;
        merged.push(...left, ...right);
        nextRuns.push(merged);
        left = null;
        right = null;
        merged = [];
      }
      if (runs.length >= 2) {
        left = runs.shift();
        right = runs.shift();
        merged = [];
        continue;
      }
      if (runs.length === 1) {
        nextRuns.push(runs.shift());
      }
      if (nextRuns.length <= 1) {
        runs = nextRuns;
        return; // Completely sorted!
      }
      runs = nextRuns;
      nextRuns = [];
    }
  };

  advance();

  return {
    get done() {
      return !left && !right && runs.length <= 1;
    },
    get sorted() {
      return this.done ? runs[0] || items : [];
    },
    get currentPair() {
      return left && right && left.length && right.length ? [left[0], right[0]] : null;
    },
    get stepsDone() {
      return stepsDone;
    },
    get estTotal() {
      return Math.max(stepsDone + 1, estTotal);
    },
    choose(side) {
      if (!left || !right || !left.length || !right.length) return;
      stepsDone += 1;
      if (side === 'left') merged.push(left.shift());
      else merged.push(right.shift());
      advance();
    },
  };
}

export function renderTournamentModalHtml(engine) {
  if (!engine) return '';
  if (engine.done) {
    const sorted = engine.sorted || [];
    return `
      <div class="tour-shell">
        <div class="tour-done-head">
          <span class="pill pill-risk-guvenli">✓ Turnuva Tamamlandı (${engine.stepsDone} karar)</span>
          <h3>Gerçek Öncelik Sıran Hazır</h3>
          <p>Seçimlerine göre oluşan yeni sıralamayı aşağıda inceleyip tek tıkla listene uygulayabilirsin (⌘Z ile geri alınabilir).</p>
        </div>
        <div class="wiz-preview-list">
          ${sorted
            .map((it, idx) => {
              const p = it.program;
              const diff = it.originalOrder - (idx + 1);
              const badge =
                diff > 0
                  ? `<span style="color:var(--green);font-weight:700;font-size:11.5px;">↑ +${diff}</span>`
                  : diff < 0
                    ? `<span style="color:var(--rose);font-weight:700;font-size:11.5px;">↓ ${diff}</span>`
                    : `<span style="color:var(--text-tertiary);font-size:11.5px;">•</span>`;
              return `
                <div class="wiz-row">
                  <span class="mono" style="font-weight:750;color:var(--accent);width:28px;">#${String(idx + 1).padStart(2, '0')}</span>
                  <div style="min-width:0;flex:1;">
                    <strong>${escapeHtml(p.department)}</strong>
                    <small>${escapeHtml(p.university)} · Eski: #${String(it.originalOrder).padStart(2, '0')} · ${formatRank(p.latestRank)}</small>
                  </div>
                  ${badge}
                </div>`;
            })
            .join('')}
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn btn-sm" type="button" id="tourRestartBtn">Tekrar Başla</button>
          <button class="btn btn-primary" type="button" id="tourApplyOrderBtn">Bu Sırayı Listeme Uygula</button>
        </div>
      </div>
    `;
  }

  const [a, b] = engine.currentPair;
  const pct = Math.min(96, Math.round((engine.stepsDone / engine.estTotal) * 100));

  const renderChoiceCard = (entry, side, keyHint) => {
    const p = entry.program;
    const logo = getLogoUrl(p.universityId);
    const initials = escapeHtml(getUniInitials(p.university));
    const riskMeta = RISK_META[p.risk] || RISK_META.hedef;
    return `
      <button class="tour-choice-card" type="button" data-tour-pick="${side}">
        <span class="tour-key-hint">${keyHint}</span>
        <div class="uni-avatar" style="width:52px;height:52px;border-radius:15px;">
          ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(p.university)}" onerror="this.style.display='none';this.parentElement.textContent='${initials}'" />` : initials}
        </div>
        <div class="tour-dept">${escapeHtml(p.department)}</div>
        <div class="tour-uni">${escapeHtml(p.university)}</div>
        <div class="tour-meta">${escapeHtml([p.city, p.language, p.scholarship].filter(Boolean).join(' · '))}</div>
        <div class="tour-badges tabular">
          <span class="pill pill-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(riskMeta.label)}</span>
          <span class="pill">${formatRank(p.latestRank)}</span>
        </div>
        <span class="tour-cta-pill">Bunu Daha Çok İsterim</span>
      </button>
    `;
  };

  return `
    <div class="tour-shell">
      <div class="tour-progress-wrap">
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);">
          <span>İkisini de kazansan <strong>hangisine kayıt yaptırırsın?</strong></span>
          <span class="tabular">Karar ${engine.stepsDone + 1} / ~${engine.estTotal}</span>
        </div>
        <div class="editorial-readiness-track">
          <div class="editorial-readiness-fill" style="width:${pct}%;background:var(--accent);"></div>
        </div>
      </div>
      <div class="tour-vs-stage">
        ${renderChoiceCard(a, 'left', '← Sol')}
        <span class="tour-vs-badge" aria-hidden="true">VS</span>
        ${renderChoiceCard(b, 'right', 'Sağ →')}
      </div>
    </div>
  `;
}

// ============================================================================
// Feature 6: 1-Row Quick Exam Entry + Weekly Pace & ETA Estimator
// ============================================================================
export function computeWeeklyPaceAndEta(exams, examType = 'TYT', targetNet = null) {
  const list = [...(exams || [])]
    .filter((e) => e.examType === examType && Number.isFinite(Number(e.total)))
    .reverse(); // chronological

  if (list.length < 2) {
    return { count: list.length, perExamDelta: null, latest: list[0] ? Number(list[0].total) : null, etaExams: null, etaText: '' };
  }

  const first = Number(list[0].total);
  const latest = Number(list[list.length - 1].total);
  const perExamDelta = (latest - first) / (list.length - 1);

  let etaExams = null;
  let etaText = '';
  if (targetNet !== null && Number.isFinite(Number(targetNet))) {
    const remaining = Number(targetNet) - latest;
    if (remaining <= 0) {
      etaText = `✓ #1 hedef netini (${formatNet(targetNet)}) yakaladın!`;
    } else if (perExamDelta > 0.15) {
      etaExams = Math.ceil(remaining / perExamDelta);
      const weeks = Math.max(1, Math.round(etaExams * 1.3));
      etaText = `Hızın +${formatNet(perExamDelta)} net/deneme · Bu tempoyla ~${etaExams} denemede (~${weeks} hafta) #1 hedefe ulaşırsın`;
    } else {
      etaText = `Son denemelerde tempo yatay (${perExamDelta >= 0 ? '+' : ''}${formatNet(perExamDelta)}/deneme) · Hedef için +${formatNet(remaining)} net gerekiyor`;
    }
  } else {
    etaText = `Ortalama değişim: ${perExamDelta >= 0 ? '+' : ''}${formatNet(perExamDelta)} net / deneme (${list.length} deneme)`;
  }

  return { count: list.length, perExamDelta, latest, etaExams, etaText };
}

export function renderQuickExamBarHtml(examType = 'TYT', pace = null) {
  const todayStr = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  const maxVal = examType === 'TYT' ? 120 : 80;
  return `
    <div class="quick-exam-wrap">
      <form class="quick-exam-form" id="quickExamAddForm">
        <input class="input" id="qeNameInput" type="text" placeholder="Hızlı deneme adı (ör. Özdebir 5)" required />
        <input class="input tabular" id="qeNetInput" type="number" step="0.25" min="0" max="${maxVal}" placeholder="${examType} Net (0-${maxVal})" required style="width:138px;" />
        <input class="input" id="qeDateInput" type="text" value="${escapeHtml(todayStr)}" placeholder="Tarih" style="width:105px;" />
        <button class="btn btn-primary btn-sm" type="submit">+ Hızlı Kaydet</button>
      </form>
      ${pace?.etaText ? `<div class="quick-exam-pace tabular">${escapeHtml(pace.etaText)}</div>` : ''}
    </div>
  `;
}
