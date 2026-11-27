/**
 * TercihAtlas — v38 Apple OS Redesign & Intelligence Suite
 * 1. Apple Bento Cockpit (Unified Rings + Portfolio KPI + Control Center Quick Dock)
 * 2. Live #1 University Adaptive Mesh Gradient Helper
 * 3. macOS Master-Detail Two-Column Workspace (Notes / Finder style)
 * 4. Editorial Card Readiness Progress Bar
 * 5. "Apple Intelligence" On-Device Preference Doctor (3-Point Personal Strategy)
 * 6. Multi-University Threshold Lines & Unlock Tracker for Exam Progression
 * 7. Apple Journal Pros / Cons Visual Balance Scale
 * 8. iOS Dashboard Widget Studio (Customizable Home Cockpit)
 */

import {
  escapeHtml,
  formatRank,
  formatScore,
  formatNet,
  formatCurrency,
  RISK_META,
  getUniInitials,
  getAytFieldsForScoreType,
} from './utils.js?v=26';
import { getLogoUrl } from './api.js?v=26';
import { renderDetailTrendChart, renderSparkline } from './charts.js?v=38';

function fmtSigned(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
  const n = Number(val);
  return `${n >= 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')}`;
}

// ============================================================================
// Feature 8: iOS Dashboard Widget Studio (Persistent Widget Preferences)
// ============================================================================
const WIDGET_PREFS_KEY = 'tercihatlas_widgets_v1';

export const DEFAULT_WIDGET_PREFS = {
  liveActivity: true,
  bentoCockpit: true,
  intelligenceDoctor: true,
  scenarioBar: true,
  ambientMesh: true,
};

export function loadWidgetPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(WIDGET_PREFS_KEY) || '{}');
    return { ...DEFAULT_WIDGET_PREFS, ...raw };
  } catch {
    return { ...DEFAULT_WIDGET_PREFS };
  }
}

export function saveWidgetPrefs(next) {
  const clean = { ...DEFAULT_WIDGET_PREFS, ...next };
  try {
    localStorage.setItem(WIDGET_PREFS_KEY, JSON.stringify(clean));
  } catch {
    /* ignore */
  }
  return clean;
}

export function renderWidgetStudioModalHtml(prefs) {
  const p = { ...DEFAULT_WIDGET_PREFS, ...prefs };
  const items = [
    { key: 'bentoCockpit', title: 'Apple Bento Kokpit', desc: 'Aktivite halkaları, risk dengesi, hedef sıralama ve hızlı erişim kutuları' },
    { key: 'intelligenceDoctor', title: 'Tercih Doktoru (Akıllı Özet)', desc: 'Parlayan çerçeveli 3 maddelik anlık strateji, ölü tercih ve net reçetesi' },
    { key: 'liveActivity', title: 'Canlı Hedef Şeridi (Live Activity)', desc: 'Üstteki YKS 2027 geri sayım ve sonraki kilit üniversite çubuğu' },
    { key: 'scenarioBar', title: 'Senaryo Çubuğu', desc: 'Plan A / B geçişleri ve Stage Manager kart destesi düğmesi' },
    { key: 'ambientMesh', title: '1. Tercih Canlı Atmosfer Rengi', desc: '#1 sıradaki üniversitenin logo renginden dinamik iOS Mesh Gradient arka plan' },
  ];

  return `
    <div class="ws-shell">
      <p class="ws-intro">Tercihlerim ana ekranındaki Apple widget'larını dilediğin gibi açıp kapatabilirsin. Değişiklikler anında kaydedilir.</p>
      <div class="ws-list">
        ${items
          .map(
            (it) => `
          <label class="ws-row">
            <div style="min-width:0;flex:1;">
              <strong>${it.title}</strong>
              <span>${it.desc}</span>
            </div>
            <input type="checkbox" class="apple-switch-input" data-widget-toggle="${it.key}" ${p[it.key] ? 'checked' : ''} />
            <span class="apple-switch-track" aria-hidden="true"></span>
          </label>`,
          )
          .join('')}
      </div>
      <div class="ws-footer">
        <button class="btn btn-sm" type="button" id="resetWidgetPrefsBtn">Varsayılana Sıfırla</button>
        <button class="btn btn-primary btn-sm" type="button" id="doneWidgetStudioBtn">Tamam</button>
      </div>
    </div>
  `;
}

// ============================================================================
// Feature 1: Apple Bento Cockpit (Unified Rings + Portfolio + Control Center)
// ============================================================================
export function renderBentoCockpitHtml(state, { ringsData, expanded = false, readOnlyShare = false }) {
  const programs = state.programs || [];
  const total = programs.length;
  const hayal = programs.filter((p) => p.risk === 'hayal').length;
  const hedef = programs.filter((p) => p.risk === 'hedef').length;
  const guvenli = programs.filter((p) => p.risk === 'guvenli').length;
  const pct = (n) => (total ? (n / total) * 100 : 0);

  const validRanks = programs.map((p) => p.latestRank).filter((r) => r && r > 0);
  const bestRank = validRanks.length ? Math.min(...validRanks) : null;
  const worstRank = validRanks.length ? Math.max(...validRanks) : null;
  const top = programs[0] || null;

  const ringSvg = ringsData
    ? `<svg class="bento-rings-svg" width="76" height="76" viewBox="0 0 82 82" aria-hidden="true">
        ${ringsData.rings
          .map((rg) => {
            const c = 2 * Math.PI * rg.r;
            const dashOffset = c * (1 - Math.max(0.04, rg.pct / 100));
            return `
              <circle cx="41" cy="41" r="${rg.r}" fill="none" stroke="${rg.track}" stroke-width="6.4" />
              <circle class="fitness-ring-arc" cx="41" cy="41" r="${rg.r}" fill="none" stroke="${rg.color}" stroke-width="6.4"
                stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${dashOffset.toFixed(2)}"
                transform="rotate(-90 41 41)" />
            `;
          })
          .join('')}
      </svg>`
    : '';

  return `
    <section class="bento-cockpit" aria-label="TercihAtlas Kontrol Kokpiti">
      <!-- Tile 1: Apple Fitness+ Rings & #1 Target -->
      <div class="bento-tile bento-rings-tile ${expanded ? 'expanded' : ''}" id="fitnessRingsToggle" role="button" tabindex="0" aria-expanded="${expanded ? 'true' : 'false'}">
        <div class="bento-rings-top">
          ${ringSvg}
          <div class="bento-rings-info">
            <div class="bento-kicker">YKS AKTİVİTE · <span class="tabular">%${ringsData?.overall ?? 0}</span></div>
            <div class="bento-top-target">${escapeHtml(top ? top.university : '1. Hedefini Ekle')}</div>
            <div class="bento-ring-mini-legend tabular">
              ${(ringsData?.rings || [])
                .map((rg) => `<span><i style="background:${rg.color};"></i>%${rg.pct}</span>`)
                .join('')}
            </div>
          </div>
          <span class="fitness-chevron" aria-hidden="true">
            <svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
          </span>
        </div>
        ${expanded && ringsData
          ? `<div class="bento-rings-tips">
              ${ringsData.rings
                .map(
                  (rg) => `<div class="bento-tip-item">
                    <i style="background:${rg.color};"></i>
                    <span><strong>${rg.label}:</strong> ${escapeHtml(rg.tip)}</span>
                  </div>`,
                )
                .join('')}
            </div>`
          : ''}
      </div>

      <!-- Tile 2: Portfolio Health, Risk Stack & Inline Target Rank -->
      <div class="bento-tile bento-portfolio-tile">
        <div class="bento-port-top">
          <div>
            <div class="bento-kicker">TERCİH PORTFÖYÜ</div>
            <div class="bento-port-big tabular">${total}<span>/ 24</span></div>
          </div>
          <div class="bento-target-box">
            <label for="targetRankInput" class="bento-kicker">HEDEF SIRALAMAN</label>
            <input id="targetRankInput" class="bento-target-input tabular" type="number" min="1" max="3000000" step="500"
              value="${state.targetRank || ''}" placeholder="15000" aria-label="Hedef sıralama" ${readOnlyShare ? 'disabled' : ''} />
          </div>
        </div>
        <div class="apple-stack-bar" aria-label="Risk dağılım çubuğu">
          ${hayal ? `<div class="apple-stack-seg" style="width:${pct(hayal)}%;background:var(--rose)"></div>` : ''}
          ${hedef ? `<div class="apple-stack-seg" style="width:${pct(hedef)}%;background:var(--accent)"></div>` : ''}
          ${guvenli ? `<div class="apple-stack-seg" style="width:${pct(guvenli)}%;background:var(--green-bright)"></div>` : ''}
        </div>
        <div class="bento-port-bottom tabular">
          <span class="bento-risk-counts">
            <i style="background:var(--rose)"></i>${hayal}H
            <i style="background:var(--accent)"></i>${hedef}O
            <i style="background:var(--green-bright)"></i>${guvenli}G
          </span>
          <span class="bento-band-chip" title="En yüksek ve en düşük taban sıra bandı">${bestRank ? `${formatRank(bestRank)} – ${formatRank(worstRank)}` : 'Band yok'}</span>
        </div>
      </div>

      <!-- Tile 3: Control Center 2x2 Quick Launchpad + Customize -->
      <div class="bento-tile bento-cc-tile">
        <div class="bento-cc-head">
          <span class="bento-kicker">KONTROL MERKEZİ</span>
          <button class="bento-customize-btn" type="button" id="openWidgetStudioBtn" title="Ana ekran widget'larını özelleştir">Özelleştir</button>
        </div>
        <div class="bento-cc-grid">
          <button class="cc-btn" type="button" id="openStandbyQuickBtn">
            <span class="cc-ico cc-ico-rose">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            </span>
            <span>StandBy</span>
          </button>
          <button class="cc-btn" type="button" id="bentoOpenCalcBtn">
            <span class="cc-ico cc-ico-blue">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 18 9 13l4 3 7-8"/></svg>
            </span>
            <span>Puan</span>
          </button>
          <button class="cc-btn" type="button" id="bentoOpenWalletBtn">
            <span class="cc-ico cc-ico-purple">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/></svg>
            </span>
            <span>3D Kart</span>
          </button>
          <button class="cc-btn" type="button" id="bentoOpenStageBtn">
            <span class="cc-ico cc-ico-amber">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"><rect x="3" y="4" width="7.5" height="16" rx="2"/><rect x="13.5" y="4" width="7.5" height="16" rx="2"/></svg>
            </span>
            <span>Planlar</span>
          </button>
        </div>
      </div>
    </section>
  `;
}

// ============================================================================
// Feature 4: Editorial Card Readiness Progress Bar
// ============================================================================
export function computeCardReadiness(program, { myNets, est, gap, isReachable }) {
  if (!program) return null;
  const n0 = program.nets?.[0];

  if (gap && (gap.tytDiff !== null || gap.aytDiff !== null) && n0) {
    const targetSum = (n0.tytTotal || 0) + (program.scoreType === 'DİL' ? n0.ydt || 0 : n0.aytTotal || 0);
    const diffSum = (gap.tytDiff || 0) + (gap.aytDiff || 0);
    if (targetSum > 0) {
      const mySum = Math.max(0, targetSum + diffSum);
      const pct = Math.max(8, Math.min(100, Math.round((mySum / targetSum) * 100)));
      if (diffSum >= 0 || isReachable) {
        return {
          pct: 100,
          tone: 'green',
          label: `Hedef netin üstündesin (${fmtSigned(diffSum)} net)`,
        };
      }
      return {
        pct,
        tone: pct >= 88 ? 'accent' : 'amber',
        label: `%${pct} hazır · ${fmtSigned(diffSum)} net fark`,
      };
    }
  }

  if (est && program.latestRank) {
    const st = String(program.scoreType || 'SAY').toUpperCase();
    const myRank = est[st]?.rank || est.SAY?.rank || est.EA?.rank;
    if (myRank) {
      if (myRank <= program.latestRank * 1.05) {
        return { pct: 100, tone: 'green', label: 'Mevcut tahmini sıranla ulaşılabilir' };
      }
      const pct = Math.max(12, Math.min(96, Math.round((program.latestRank / myRank) * 100)));
      return {
        pct,
        tone: pct >= 75 ? 'accent' : 'amber',
        label: `%${pct} yakın · ~${formatRank(Math.round(myRank - program.latestRank))} sıra fark`,
      };
    }
  }

  return null;
}

export function renderReadinessBarHtml(readiness) {
  if (!readiness) return '';
  return `
    <div class="editorial-readiness tone-${readiness.tone}">
      <div class="editorial-readiness-top">
        <span>${escapeHtml(readiness.label)}</span>
        <strong class="tabular">%${readiness.pct}</strong>
      </div>
      <div class="editorial-readiness-track">
        <div class="editorial-readiness-fill" style="width:${readiness.pct}%;"></div>
      </div>
    </div>
  `;
}

// ============================================================================
// Feature 5: "Apple Intelligence" On-Device Preference Doctor
// ============================================================================
export function analyzePreferenceIntelligence(
  state,
  { estimateYksRankFromNets, compareWithMyNets, auditPreferenceOrder, analyzeSubjectLeverage, getQuotaChangeInfo },
) {
  const programs = state.programs || [];
  if (!programs.length) return null;

  const insights = [];
  const audit = programs.length >= 2 ? auditPreferenceOrder?.(programs, state.targetRank) : null;
  const hayal = programs.filter((p) => p.risk === 'hayal').length;
  const hedef = programs.filter((p) => p.risk === 'hedef').length;
  const guvenli = programs.filter((p) => p.risk === 'guvenli').length;

  // Insight 1: Strategy & Risk Diagnosis
  if (audit?.deadPreferences?.length) {
    insights.push({
      tone: 'rose',
      tag: 'ÖSYM Sıra Riski',
      text: `${audit.deadPreferences.length} adet ölü tercih var — daha düşük sıralı bölüm üstte kaldığı için alttaki tercihlerin hiç değerlendirilmeyebilir.`,
      actionId: 'aiSmartSortBtn',
      actionLabel: 'Akıllı Diz',
    });
  } else if (programs.length >= 3 && guvenli === 0) {
    insights.push({
      tone: 'amber',
      tag: 'Güvenlik Ağı Eksik',
      text: `Listende henüz hiç "Güvenli" tercih yok (${hayal} Hayal · ${hedef} Hedef). Açıkta kalma riskini sıfırlamak için hedef sıranın %30–45 altına en az 2 güvenli bölüm ekle.`,
      actionId: 'aiOpenDiscoverBtn',
      actionLabel: 'Güvenli Keşfet',
    });
  } else if (programs.length >= 4 && hayal / programs.length > 0.6) {
    insights.push({
      tone: 'amber',
      tag: 'Üst Ağırlıklı Liste',
      text: `Tercihlerinin %${Math.round((hayal / programs.length) * 100)}'i Hayal bandında. Orta banda (${hedef} Hedef) 2–3 dengeleyici bölüm eklemek yerleşme olasılığını belirgin artırır.`,
      actionId: 'aiOpenSimulatorBtn',
      actionLabel: 'Simüle Et',
    });
  } else {
    insights.push({
      tone: 'green',
      tag: 'Dengeli Strateji',
      text: `Ölü tercih yok ve risk dağılımın sağlıklı (${hayal} Hayal · ${hedef} Hedef · ${guvenli} Güvenli). Sıralama mantığın ÖSYM algoritmasıyla uyumlu.`,
      actionId: 'aiOpenSimulatorBtn',
      actionLabel: 'Simülatörü Aç',
    });
  }

  // Insight 2: Highest Subject Leverage / Net Prescription
  const top = programs[0];
  const est = estimateYksRankFromNets?.(state.myNets) || null;
  const leverage = analyzeSubjectLeverage?.(state.myNets, state.examHistory, top, state.targetRank);
  if (leverage?.priority) {
    insights.push({
      tone: 'accent',
      tag: 'En Yüksek Kaldıraç',
      text: `${leverage.priority.label} dersinde +${formatNet(Math.abs(leverage.priority.gap))} net artışı, #1 hedefin ${top?.university || ''} yolunda tahmini +${formatRank(leverage.priority.rankGain)} sıra sıçrama sağlar.`,
      actionId: 'aiOpenCalcBtn',
      actionLabel: 'Net Simüle Et',
    });
  } else if (!est) {
    insights.push({
      tone: 'accent',
      tag: 'Kişisel Net Analizi',
      text: `Mevcut TYT/AYT netlerini girersen hangi derste +3 net yapmanın kaç üniversitenin kilidini açtığını anlık hesaplayabilirim.`,
      actionId: 'aiOpenNetsBtn',
      actionLabel: 'Netlerimi Gir',
    });
  } else {
    const gap = compareWithMyNets?.(top, state.myNets);
    const totalDiff = gap ? (gap.tytDiff || 0) + (gap.aytDiff || 0) : null;
    insights.push({
      tone: totalDiff !== null && totalDiff >= 0 ? 'green' : 'accent',
      tag: '1. Hedef Mesafesi',
      text:
        totalDiff !== null && totalDiff >= 0
          ? `Mevcut netlerinle #1 hedefin ${top.university} (${top.department}) tabanının +${formatNet(totalDiff)} net üzerindesin!`
          : `#1 hedefin ${top.university} için toplam ~${formatNet(Math.abs(totalDiff || 0))} netlik bir artış seni güvenli banda taşıyacak.`,
      actionId: 'aiOpenCalcBtn',
      actionLabel: 'Puan Robotu',
    });
  }

  // Insight 3: Quota & 2027 Trend Opportunity Radar
  const quotaUp = programs
    .map((p) => ({ p, info: getQuotaChangeInfo?.(p) }))
    .filter((x) => x.info?.increased)
    .sort((a, b) => (b.info.delta || 0) - (a.info.delta || 0));

  if (quotaUp.length) {
    const best = quotaUp[0];
    insights.push({
      tone: 'green',
      tag: 'Kontenjan Fırsatı',
      text: `${best.p.university} (${best.p.department}) kontenjanını +${best.info.delta} kişi artırdı — bu 2027 taban sıralamasında lehine esneme yaratabilir.`,
      actionId: 'aiOpenProgBtn',
      actionCode: best.p.code,
      actionLabel: 'Bölümü Gör',
    });
  } else {
    const tightening = programs.filter((p) => {
      const h = p.history || [];
      return h.length >= 2 && h[0].rank && h[1].rank && h[0].rank < h[1].rank * 0.9;
    });
    if (tightening.length) {
      const t0 = tightening[0];
      insights.push({
        tone: 'amber',
        tag: 'Sert Yükseliş Trendi',
        text: `${t0.university} (${t0.department}) son yılda hızla öne çekmiş. 2027 için taban sıralamasını bir miktar daha rekabetçi varsaymak güvenli olur.`,
        actionId: 'aiOpenProgBtn',
        actionCode: t0.code,
        actionLabel: 'Trendi İncele',
      });
    } else {
      insights.push({
        tone: 'accent',
        tag: 'İkili Kıyaslama Önerisi',
        text: `İlk tercihlerin arasındaki net, kontenjan ve 4 yıllık farkları Split View veya Karar Matrisi ile yan yana tartabilirsin.`,
        actionId: 'aiOpenSplitBtn',
        actionLabel: 'Split View',
      });
    }
  }

  return { insights: insights.slice(0, 3) };
}

export function renderIntelligenceDoctorHtml(intel, { collapsed = false } = {}) {
  if (!intel || !intel.insights?.length) return '';
  return `
    <section class="ai-doctor-card ${collapsed ? 'collapsed' : ''}" aria-label="Akıllı Tercih Doktoru">
      <div class="ai-doctor-head" id="aiDoctorToggle" role="button" tabindex="0">
        <div class="ai-doctor-title-wrap">
          <span class="ai-orb" aria-hidden="true"></span>
          <div>
            <strong class="ai-doctor-title">Tercih Doktoru</strong>
            <span class="ai-doctor-sub">Cihaz içi anlık strateji & net analizi</span>
          </div>
        </div>
        <span class="ai-pill-badge">Intelligence</span>
      </div>
      ${!collapsed
        ? `<div class="ai-doctor-grid">
            ${intel.insights
              .map(
                (ins) => `
              <div class="ai-insight-item tone-${ins.tone}">
                <div class="ai-insight-top">
                  <span class="ai-insight-tag">${escapeHtml(ins.tag)}</span>
                  ${ins.actionId
                    ? `<button class="ai-mini-cta" type="button" data-ai-action="${ins.actionId}" ${ins.actionCode ? `data-ai-code="${escapeHtml(ins.actionCode)}"` : ''}>${escapeHtml(ins.actionLabel)} →</button>`
                    : ''}
                </div>
                <p>${escapeHtml(ins.text)}</p>
              </div>`,
              )
              .join('')}
          </div>`
        : ''}
    </section>
  `;
}

// ============================================================================
// Feature 7: Apple Journal Pros / Cons Visual Balance Scale
// ============================================================================
export function renderProsConsBalanceHtml(program) {
  const pros = (program?.pros || []).length;
  const cons = (program?.cons || []).length;
  const sub = program?.subRatings || {};
  const subVals = Object.values(sub).filter((v) => Number(v) > 0);
  const logicPct =
    pros + cons > 0
      ? Math.round((pros / (pros + cons)) * 100)
      : subVals.length
        ? Math.round((subVals.reduce((a, b) => a + Number(b), 0) / (subVals.length * 5)) * 100)
        : 50;
  const heartPct = program?.rating ? Math.round((Number(program.rating) / 5) * 100) : null;
  const combined = heartPct !== null ? Math.round(logicPct * 0.55 + heartPct * 0.45) : logicPct;

  let verdict = 'Nötr Denge';
  let tone = 'accent';
  if (pros + cons === 0 && !heartPct && !subVals.length) {
    verdict = 'Artı/Eksi ekleyerek teraziyi çalıştır';
  } else if (combined >= 72) {
    verdict = `Güçlü Uyum · %${combined}`;
    tone = 'green';
  } else if (combined <= 40) {
    verdict = `Eksiler Ağır Basıyor · %${combined}`;
    tone = 'rose';
  } else {
    verdict = `Kararsız Denge · %${combined}`;
    tone = 'amber';
  }

  const proShare = pros + cons > 0 ? Math.round((pros / (pros + cons)) * 100) : 50;
  const conShare = 100 - proShare;

  return `
    <div class="journal-balance-card tone-${tone}">
      <div class="journal-balance-head">
        <div>
          <span class="journal-kicker">KARAR TERAZİSİ</span>
          <strong>${escapeHtml(verdict)}</strong>
        </div>
        <div class="journal-counts tabular">
          <span style="color:var(--green);">+${pros} Artı</span>
          <span>·</span>
          <span style="color:var(--rose);">-${cons} Eksi</span>
        </div>
      </div>
      <div class="journal-scale-track" aria-label="Artı eksi dengesi">
        <div class="journal-scale-pro" style="width:${proShare}%;"></div>
        <div class="journal-scale-con" style="width:${conShare}%;"></div>
      </div>
      <div class="journal-meta tabular">
        <span>Mantık: <strong>%${logicPct}</strong></span>
        <span>İçime Sinme: <strong>${heartPct !== null ? `%${heartPct} (${program.rating}/5 ★)` : 'Yıldız verilmedi'}</strong></span>
      </div>
    </div>
  `;
}

// ============================================================================
// Feature 3: macOS "Master-Detail" Two-Column Workspace (Notes / Finder Style)
// ============================================================================
export function renderMasterDetailViewHtml(
  programs,
  activeCode,
  { myNets, est, compareCodes, compute2027Projection, compareWithMyNets, isProgramCurrentlyReachable },
) {
  const active = programs.find((p) => p.code === activeCode) || programs[0];
  if (!active) return '';

  const proj = compute2027Projection?.(active);
  const gap = compareWithMyNets?.(active, myNets);
  const isReachable = isProgramCurrentlyReachable?.(active, est);
  const readiness = computeCardReadiness(active, { myNets, est, gap, isReachable });
  const isCompared = (compareCodes || []).includes(active.code);
  const logo = getLogoUrl(active.universityId);
  const initials = escapeHtml(getUniInitials(active.university));
  const net0 = active.nets?.[0] || null;
  const aytFields = getAytFieldsForScoreType(active.scoreType);
  const riskMeta = RISK_META[active.risk] || RISK_META.hedef;

  return `
    <section class="master-detail-shell" id="programList" aria-label="Bölünmüş çalışma alanı">
      <div class="md-sidebar" role="listbox" aria-label="Tercih listesi">
        ${programs
          .map((p) => {
            const sel = p.code === active.code;
            const pLogo = getLogoUrl(p.universityId);
            const pInit = escapeHtml(getUniInitials(p.university));
            return `
              <button class="md-row ${sel ? 'active' : ''}" type="button" data-md-select="${escapeHtml(p.code)}" data-code="${escapeHtml(p.code)}">
                <span class="md-row-ord tabular">#${String(p._order).padStart(2, '0')}</span>
                <span class="md-row-sq">
                  ${pLogo ? `<img src="${escapeHtml(pLogo)}" alt="" onerror="this.style.display='none';this.parentElement.textContent='${pInit}'" />` : pInit}
                </span>
                <span class="md-row-body">
                  <strong>${escapeHtml(p.department)}</strong>
                  <small>${escapeHtml(p.university)} · <b class="tabular">${formatRank(p.latestRank)}</b></small>
                </span>
                <span class="md-row-dot risk-${escapeHtml(p.risk || 'hedef')}" aria-hidden="true"></span>
              </button>`;
          })
          .join('')}
      </div>

      <article class="md-inspector">
        <div class="md-insp-head">
          <div style="display:flex;align-items:flex-start;gap:13px;min-width:0;flex:1;">
            <div class="uni-avatar" style="width:48px;height:48px;border-radius:14px;">
              ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(active.university)}" onerror="this.style.display='none';this.parentElement.textContent='${initials}'" />` : initials}
            </div>
            <div style="min-width:0;flex:1;">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
                <span class="pill mono">#${String(active._order).padStart(2, '0')}</span>
                <span class="pill pill-risk-${escapeHtml(active.risk || 'hedef')}">${escapeHtml(riskMeta.label)}</span>
                <span class="pill">${escapeHtml(active.scoreType)} · ${escapeHtml(active.city)}</span>
              </div>
              <h2 class="md-insp-title">${escapeHtml(active.department)}</h2>
              <div class="md-insp-sub">${escapeHtml(active.university)} · ${escapeHtml(active.language || '')} · ${escapeHtml(active.scholarship || '')}</div>
            </div>
          </div>
          <div class="md-insp-actions">
            <button class="btn btn-primary btn-sm" type="button" data-md-open-drawer="${escapeHtml(active.code)}">Tam Detay</button>
            <button class="btn btn-sm ${isCompared ? 'btn-soft' : ''}" type="button" data-md-compare="${escapeHtml(active.code)}">${isCompared ? '✓ Kıyasla' : '+ Kıyasla'}</button>
            <button class="btn btn-sm" type="button" data-md-split="${escapeHtml(active.code)}">Split View</button>
          </div>
        </div>

        ${renderReadinessBarHtml(readiness)}

        <div class="md-metrics tabular">
          <div class="md-metric-box">
            <span>${escapeHtml(active.latestYear || 2026)} Taban Sıra</span>
            <strong>${formatRank(active.latestRank)}</strong>
          </div>
          <div class="md-metric-box">
            <span>2027 Tahmini</span>
            <strong style="color:var(--accent);">${proj ? `${formatRank(proj.low)}–${formatRank(proj.high)}` : '—'}</strong>
          </div>
          <div class="md-metric-box">
            <span>Taban Puan</span>
            <strong>${formatScore(active.latestScore)}</strong>
          </div>
          <div class="md-metric-box">
            <span>Kontenjan</span>
            <strong>${active.quota ?? '—'}${active.tuition ? ` · ${formatCurrency(active.tuition)}` : ''}</strong>
          </div>
        </div>

        <div class="md-chart-panel">
          <div class="md-panel-label">4 Yıllık Sıralama Trendi</div>
          ${renderDetailTrendChart(active.history, 'rank')}
        </div>

        ${net0
          ? `<div class="md-chart-panel">
              <div class="md-panel-label">Son Yerleşen Net Ortalaması (${net0.year || active.latestYear})</div>
              <div class="split-net-pills tabular" style="margin-bottom:8px;">
                <span class="pill">TYT <strong>${formatNet(net0.tytTotal)}</strong>${gap?.tytDiff != null ? ` <em class="${gap.tytDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}">${fmtSigned(gap.tytDiff)}</em>` : ''}</span>
                <span class="pill">${active.scoreType === 'DİL' ? 'YDT' : 'AYT'} <strong>${formatNet(active.scoreType === 'DİL' ? net0.ydt : net0.aytTotal)}</strong>${gap?.aytDiff != null ? ` <em class="${gap.aytDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}">${fmtSigned(gap.aytDiff)}</em>` : ''}</span>
              </div>
              <div class="split-sub-nets tabular">
                ${aytFields
                  .slice(0, 4)
                  .map((f) => {
                    const v = active.scoreType === 'DİL' ? net0.ydt : net0.ayt?.[f.key];
                    return `<span>${escapeHtml(f.label)}: <strong>${formatNet(v)}</strong></span>`;
                  })
                  .join('')}
              </div>
            </div>`
          : ''}

        ${renderProsConsBalanceHtml(active)}

        ${active.notes
          ? `<div class="md-chart-panel">
              <div class="md-panel-label">Kişisel Notun</div>
              <p class="split-note">${escapeHtml(active.notes)}</p>
            </div>`
          : ''}
      </article>
    </section>
  `;
}

// ============================================================================
// Feature 6: Multi-University Threshold Lines & Unlock Tracker
// ============================================================================
export function buildProgressionThresholds(programs, examType = 'TYT') {
  const colors = ['#FF9F0A', '#0071E3', '#30D158', '#AF52DE'];
  const list = [];
  const seenVals = [];

  for (const p of programs || []) {
    const n0 = p.nets?.[0];
    if (!n0) continue;
    const val = examType === 'TYT' ? n0.tytTotal : p.scoreType === 'DİL' ? n0.ydt : n0.aytTotal;
    if (!Number.isFinite(Number(val)) || Number(val) <= 0) continue;
    // Skip near-duplicate lines (< 1.4 net apart) so labels never collide!
    if (seenVals.some((v) => Math.abs(v - Number(val)) < 1.4)) continue;
    seenVals.push(Number(val));
    list.push({
      code: p.code,
      label: p.university.split(/\s+/).slice(0, 2).join(' '),
      fullName: `${p.university} — ${p.department}`,
      value: Number(val),
      color: colors[list.length % colors.length],
    });
    if (list.length >= 4) break;
  }
  return list;
}

export function renderThresholdUnlockStripHtml(exams, thresholds, examType = 'TYT') {
  if (!thresholds?.length) return '';
  const list = [...(exams || [])]
    .filter((e) => e.examType === examType && Number.isFinite(Number(e.total)))
    .reverse();

  if (!list.length) return '';

  const latestVal = Number(list[list.length - 1].total);
  return `
    <div class="threshold-unlock-strip">
      ${thresholds
        .map((th) => {
          const firstPass = list.find((e) => Number(e.total) >= th.value);
          const diff = latestVal - th.value;
          const unlocked = diff >= 0;
          return `
            <div class="threshold-chip ${unlocked ? 'is-unlocked' : ''}">
              <span class="threshold-dot" style="background:${th.color};"></span>
              <div style="min-width:0;flex:1;">
                <strong>${escapeHtml(th.label)} <span class="tabular">(${formatNet(th.value)})</span></strong>
                <small class="tabular">
                  ${unlocked
                    ? `✓ Kilit açık${firstPass?.examDate ? ` (${escapeHtml(firstPass.examDate)})` : ''}`
                    : `${fmtSigned(diff)} net kaldı`}
                </small>
              </div>
            </div>`;
        })
        .join('')}
    </div>
  `;
}
