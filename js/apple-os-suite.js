/**
 * TercihAtlas — v37 Apple OS Mastery Suite
 * 1. iOS Swipe Actions (Touch + macOS Trackpad Horizontal Swipe on Cards & List Rows)
 * 2. Apple Fitness+ YKS Activity Rings (3 Concentric Glowing Rings + Actionable Tips)
 * 3. iOS StandBy Fullscreen Study & Pomodoro Mode (Night Red / OLED / Aurora + Live YKS 2027)
 * 4. macOS Stage Manager / Mission Control (3D Glass Scenario Switcher Deck)
 * 5. iOS Quick-Jump Scrubber (#01-#24) + Elastic Pull-to-Refresh
 * 6. iPadOS Split View (Draggable Liquid Glass Divider Side-by-Side Inspector)
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
import { renderSparkline } from './charts.js?v=30';
import { playHapticTick } from './apple-craft.js?v=34';

function formatSignedNet(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
  const n = Number(val);
  return `${n >= 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')}`;
}

// ============================================================================
// Feature 2: Apple Fitness+ "YKS Aktivite Halkaları"
// ============================================================================
export function computeActivityRings(state, { estimateYksRankFromNets, compareWithMyNets, auditPreferenceOrder }) {
  const programs = state.programs || [];
  const total = programs.length;

  // Ring 1 (Red — Move): Preference Balance & Zero Dead Preferences
  let balancePct = 0;
  let balanceTip = 'İlk tercihlerini ekleyerek denge halkasını başlat.';
  if (total > 0) {
    const hayal = programs.filter((p) => p.risk === 'hayal').length;
    const hedef = programs.filter((p) => p.risk === 'hedef').length;
    const guvenli = programs.filter((p) => p.risk === 'guvenli').length;
    const audit = total >= 2 ? auditPreferenceOrder?.(programs, state.targetRank) : null;
    const deadCount = audit?.deadPreferences?.length || 0;

    let score = 20;
    if (hayal >= 1) score += 20;
    if (hedef >= 2) score += 25;
    else if (hedef === 1) score += 14;
    if (guvenli >= 2) score += 25;
    else if (guvenli === 1) score += 14;
    if (deadCount === 0 && total >= 2) score += 10;
    else score -= Math.min(28, deadCount * 10);

    balancePct = Math.max(8, Math.min(100, Math.round(score)));
    if (deadCount > 0) {
      balanceTip = `${deadCount} ölü tercih tespit edildi — Akıllı Diz ile kırmızı halkayı kapat.`;
    } else if (guvenli < 2) {
      balanceTip = `${2 - guvenli} güvenli tercih daha ekle → Kırmızı halka %100.`;
    } else if (hedef < 2) {
      balanceTip = `${2 - hedef} hedef bölümü daha ekleyerek bandı güçlendir.`;
    } else if (hayal < 1) {
      balanceTip = 'En üste 1 hayal tercihi ekleyerek potansiyelini kilitleme.';
    } else {
      balanceTip = 'Mükemmel risk dengesi ve sıfır ölü tercih! Kırmızı halka kapandı.';
    }
  }

  // Ring 2 (Green — Exercise): Net / Rank Proximity to #1 Target
  let netPct = 0;
  let netTip = 'Netlerim profilini girerek #1 hedefine yakınlığını ölç.';
  const top = programs[0] || null;
  const est = estimateYksRankFromNets?.(state.myNets) || null;
  if (top && est) {
    const gap = compareWithMyNets?.(top, state.myNets);
    const n0 = top.nets?.[0];
    if (n0 && (n0.tytTotal || n0.aytTotal || n0.ydt) && gap) {
      const targetSum = (n0.tytTotal || 0) + (top.scoreType === 'DİL' ? n0.ydt || 0 : n0.aytTotal || 0);
      const diffSum = (gap.tytDiff || 0) + (gap.aytDiff || 0);
      const mySum = Math.max(0, targetSum + diffSum);
      netPct = targetSum > 0 ? Math.max(8, Math.min(100, Math.round((mySum / targetSum) * 100))) : 50;
      if (diffSum >= 0) {
        netTip = `Harika! #1 hedefin ${top.university} için net eşiğini +${diffSum.toFixed(1).replace('.', ',')} net aştın.`;
      } else {
        netTip = `#1 hedefin ${top.university} için toplam +${Math.abs(diffSum).toFixed(1).replace('.', ',')} net kaldı.`;
      }
    } else {
      const st = String(top.scoreType || 'SAY').toUpperCase();
      const myRank = est[st]?.rank || est.SAY?.rank || est.EA?.rank;
      if (myRank && top.latestRank) {
        const ratio = top.latestRank / Math.max(1, myRank);
        netPct = Math.max(10, Math.min(100, Math.round(Math.min(1, ratio) * 100)));
        netTip =
          myRank <= top.latestRank
            ? `Tahmini sıran (${formatRank(myRank)}) #1 hedefin içinde!`
            : `#1 hedef (${formatRank(top.latestRank)}) için ~${formatRank(myRank - top.latestRank)} sıra tırmanış gerekiyor.`;
      }
    }
  } else if (top && !est) {
    netPct = 15;
    netTip = `${top.university} için net farkını görmek üzere üstten "Netlerim" bilgini gir.`;
  }

  // Ring 3 (Blue — Stand): Preparation Completeness (Target Rank, Notes, Checklist, Roadmap, List Size)
  let prepScore = 0;
  if (state.targetRank > 0) prepScore += 22;
  if (total >= 8) prepScore += 26;
  else prepScore += Math.round((total / 8) * 26);

  const notedCount = programs.filter((p) => (p.notes || '').trim().length > 0 || (p.rating || 0) > 0).length;
  if (total > 0) prepScore += Math.min(20, Math.round((notedCount / Math.min(4, total)) * 20));

  const roadmap = state.roadmapTasks || [];
  const doneRoadmap = roadmap.filter((t) => t.done).length;
  if (roadmap.length > 0) prepScore += Math.min(18, Math.round((doneRoadmap / roadmap.length) * 18));
  else prepScore += 6;

  if ((state.examHistory || []).length >= 1) prepScore += 14;
  else if (est) prepScore += 8;

  const prepPct = Math.max(total > 0 ? 12 : 5, Math.min(100, Math.round(prepScore)));
  let prepTip = 'Hazırlık profilin tam! Tüm veriler ve hedefler güncel.';
  if (!state.targetRank) prepTip = 'Hedef sıralamanı girerek otomatik risk etiketlerini aç.';
  else if (total < 8) prepTip = `En az ${8 - total} bölüm daha ekleyerek liste kapsamını genişlet.`;
  else if (notedCount === 0) prepTip = 'Bölümlere yıldız puanı veya kişisel not ekleyerek karar kaliteni artır.';
  else if ((state.examHistory || []).length === 0) prepTip = 'Analiz → Gelişim sekmesine ilk denemeni ekleyerek mavi halkayı kapat.';

  const overall = Math.round((balancePct + netPct + prepPct) / 3);
  return {
    overall,
    rings: [
      { id: 'balance', label: 'Tercih Dengesi', pct: balancePct, color: '#FF2D55', track: 'rgba(255,45,85,0.16)', r: 34, tip: balanceTip },
      { id: 'net', label: 'Net Hedefi', pct: netPct, color: '#30D158', track: 'rgba(48,209,88,0.16)', r: 24.5, tip: netTip },
      { id: 'prep', label: 'Hazırlık', pct: prepPct, color: '#0A84FF', track: 'rgba(10,132,255,0.16)', r: 15, tip: prepTip },
    ],
  };
}

export function renderActivityRingsCard(data, { expanded = false } = {}) {
  if (!data) return '';
  const ringSvg = `
    <svg class="fitness-rings-svg" width="82" height="82" viewBox="0 0 82 82" aria-hidden="true">
      <defs>
        <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.4" flood-opacity="0.35" />
        </filter>
      </defs>
      ${data.rings
        .map((rg) => {
          const c = 2 * Math.PI * rg.r;
          const dashOffset = c * (1 - Math.max(0.04, rg.pct / 100));
          return `
            <circle cx="41" cy="41" r="${rg.r}" fill="none" stroke="${rg.track}" stroke-width="6.4" />
            <circle class="fitness-ring-arc" cx="41" cy="41" r="${rg.r}" fill="none" stroke="${rg.color}" stroke-width="6.4"
              stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${dashOffset.toFixed(2)}"
              transform="rotate(-90 41 41)" filter="url(#ringGlow)" />
          `;
        })
        .join('')}
    </svg>
  `;

  return `
    <section class="fitness-rings-card ${expanded ? 'expanded' : ''}" id="fitnessRingsCard" aria-label="YKS Aktivite Halkaları">
      <div class="fitness-rings-main" id="fitnessRingsToggle" role="button" tabindex="0" aria-expanded="${expanded ? 'true' : 'false'}">
        <div class="fitness-rings-left">
          ${ringSvg}
          <div class="fitness-rings-stats">
            <div class="fitness-rings-kicker">YKS Aktivite Halkaları · <span class="tabular">%${data.overall}</span></div>
            <div class="fitness-rings-pills tabular">
              ${data.rings
                .map(
                  (rg) => `<span class="fitness-ring-pill">
                    <i style="background:${rg.color};"></i>
                    <span>${rg.label}</span>
                    <strong>%${rg.pct}</strong>
                  </span>`,
                )
                .join('')}
            </div>
          </div>
        </div>
        <div class="fitness-rings-actions">
          <button class="btn btn-soft btn-sm" type="button" id="openStandbyQuickBtn" title="iOS StandBy Tam Ekran Çalışma & Pomodoro">
            <svg class="sf-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
            <span>StandBy</span>
          </button>
          <span class="fitness-chevron" aria-hidden="true">
            <svg class="sf-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
          </span>
        </div>
      </div>
      ${expanded
        ? `<div class="fitness-rings-drawer">
            ${data.rings
              .map(
                (rg) => `<div class="fitness-tip-row">
                  <span class="fitness-tip-dot" style="background:${rg.color};"></span>
                  <div style="min-width:0;flex:1;">
                    <strong>${rg.label} (%${rg.pct})</strong>
                    <p>${escapeHtml(rg.tip)}</p>
                  </div>
                </div>`,
              )
              .join('')}
          </div>`
        : ''}
    </section>
  `;
}

// ============================================================================
// Feature 3: iOS "StandBy" Fullscreen YKS 2027 Study & Pomodoro Mode
// ============================================================================
const STANDBY_STATS_KEY = 'tercihatlas_standby_stats_v1';

function loadStandbyStats() {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = JSON.parse(localStorage.getItem(STANDBY_STATS_KEY) || '{}');
    if (raw.date === today) {
      return { date: today, minutes: Number(raw.minutes) || 0, sessions: Number(raw.sessions) || 0, theme: raw.theme || 'night' };
    }
    return { date: today, minutes: 0, sessions: 0, theme: raw.theme || 'night' };
  } catch {
    return { date: today, minutes: 0, sessions: 0, theme: 'night' };
  }
}

function saveStandbyStats(stats) {
  try {
    localStorage.setItem(STANDBY_STATS_KEY, JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

function playStandbyChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.72);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.75);
    });
  } catch {
    /* ignore */
  }
}

export function createStandbyController({ getState, compareWithMyNets, onToast }) {
  let stats = loadStandbyStats();
  let presetMins = 25;
  let remainingSec = presetMins * 60;
  let running = false;
  let timerId = null;
  let clockId = null;
  let open = false;

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getCountdownParts = () => {
    const target = new Date('2027-06-19T10:15:00+03:00').getTime();
    const diff = Math.max(0, target - Date.now());
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return { days, hours, mins, secs };
  };

  const updateLiveTick = () => {
    const host = document.getElementById('standbyHost');
    if (!host || !open) return;

    const timerEl = host.querySelector('#sbTimerDisplay');
    const progEl = host.querySelector('#sbRingProgress');
    const nowClockEl = host.querySelector('#sbWallClock');
    const yksEl = host.querySelector('#sbYksLive');

    if (timerEl) timerEl.textContent = formatTimer(remainingSec);
    if (progEl) {
      const total = Math.max(1, presetMins * 60);
      const frac = remainingSec / total;
      const circ = 2 * Math.PI * 86;
      progEl.setAttribute('stroke-dashoffset', (circ * (1 - frac)).toFixed(2));
    }
    if (nowClockEl) {
      const now = new Date();
      nowClockEl.textContent = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    }
    if (yksEl) {
      const c = getCountdownParts();
      yksEl.innerHTML = `
        <div class="sb-cd-box"><strong>${c.days}</strong><span>GÜN</span></div>
        <div class="sb-cd-box"><strong>${String(c.hours).padStart(2, '0')}</strong><span>SAAT</span></div>
        <div class="sb-cd-box"><strong>${String(c.mins).padStart(2, '0')}</strong><span>DK</span></div>
        <div class="sb-cd-box"><strong>${String(c.secs).padStart(2, '0')}</strong><span>SN</span></div>
      `;
    }
  };

  const render = () => {
    const overlay = document.getElementById('standbyOverlay');
    const host = document.getElementById('standbyHost');
    if (!overlay || !host) return;

    const state = getState();
    const top = state.programs?.[0] || null;
    const gap = top ? compareWithMyNets?.(top, state.myNets) : null;
    const logo = top ? getLogoUrl(top.universityId) : '';
    const initials = top ? escapeHtml(getUniInitials(top.university)) : 'TA';
    const circ = (2 * Math.PI * 86).toFixed(2);
    const frac = remainingSec / Math.max(1, presetMins * 60);
    const offset = (Number(circ) * (1 - frac)).toFixed(2);

    overlay.setAttribute('data-sb-theme', stats.theme || 'night');

    let gapLine = 'Net profilini girerek canlı hedef mesafeni gör';
    if (gap && (gap.tytDiff !== null || gap.aytDiff !== null)) {
      const parts = [];
      if (gap.tytDiff !== null) parts.push(`TYT ${formatSignedNet(gap.tytDiff)}`);
      if (gap.aytDiff !== null) parts.push(`${gap.isDil ? 'YDT' : 'AYT'} ${formatSignedNet(gap.aytDiff)}`);
      gapLine = parts.join(' · ');
    }

    host.innerHTML = `
      <div class="sb-topbar">
        <div class="sb-brand">
          <span class="sb-live-dot" aria-hidden="true"></span>
          <span>StandBy · YKS 2027 Odak</span>
          <span class="sb-wall-clock tabular" id="sbWallClock"></span>
        </div>
        <div class="sb-top-controls">
          <div class="segmented sb-theme-seg" role="tablist" aria-label="StandBy teması">
            <button class="seg-btn seg-btn-sm ${stats.theme === 'night' ? 'active' : ''}" data-sb-theme="night">Gece</button>
            <button class="seg-btn seg-btn-sm ${stats.theme === 'oled' ? 'active' : ''}" data-sb-theme="oled">OLED</button>
            <button class="seg-btn seg-btn-sm ${stats.theme === 'aurora' ? 'active' : ''}" data-sb-theme="aurora">Aurora</button>
          </div>
          <button class="btn btn-sm sb-exit-btn" type="button" id="closeStandbyBtn">Çık (Esc)</button>
        </div>
      </div>

      <div class="sb-widgets">
        <div class="sb-widget sb-pomo-widget">
          <div class="sb-presets">
            ${[25, 45, 50, 5]
              .map(
                (m) =>
                  `<button class="sb-preset-btn ${presetMins === m ? 'active' : ''}" type="button" data-sb-preset="${m}">${m === 5 ? '5 dk Mola' : `${m} dk`}</button>`,
              )
              .join('')}
          </div>
          <div class="sb-ring-stage">
            <svg class="sb-ring-svg" width="196" height="196" viewBox="0 0 196 196">
              <circle cx="98" cy="98" r="86" fill="none" stroke="currentColor" stroke-opacity="0.14" stroke-width="8" />
              <circle id="sbRingProgress" cx="98" cy="98" r="86" fill="none" stroke="var(--sb-accent)" stroke-width="8"
                stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" transform="rotate(-90 98 98)" />
            </svg>
            <div class="sb-ring-center">
              <div class="sb-timer-digits tabular" id="sbTimerDisplay">${formatTimer(remainingSec)}</div>
              <div class="sb-timer-sub">${running ? 'Odaklanılıyor...' : presetMins === 5 ? 'Kısa Mola' : 'Etüt Hazır'}</div>
            </div>
          </div>
          <div class="sb-pomo-controls">
            <button class="btn btn-primary sb-play-btn" type="button" id="sbToggleTimerBtn">${running ? 'Duraklat' : 'Başlat'}</button>
            <button class="btn sb-reset-btn" type="button" id="sbResetTimerBtn">Sıfırla</button>
          </div>
          <div class="sb-daily-stats tabular">
            <span>Bugün: <strong>${stats.minutes} dk</strong> odak</span>
            <span>·</span>
            <span><strong>${stats.sessions}</strong> etüt tamamlandı</span>
          </div>
        </div>

        <div class="sb-widget sb-right-widget">
          <div class="sb-kicker">YKS 2027 GERİ SAYIM</div>
          <div class="sb-cd-grid tabular" id="sbYksLive"></div>

          <div class="sb-target-card">
            <div class="sb-target-head">
              <div class="sb-target-sq">
                ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(top.university)}" onerror="this.style.display='none';this.parentElement.textContent='${initials}'" />` : initials}
              </div>
              <div style="min-width:0;flex:1;">
                <span class="sb-kicker">#1 HEDEFİN</span>
                <div class="sb-target-dept">${escapeHtml(top?.department || 'Henüz 1. tercih eklenmedi')}</div>
                <div class="sb-target-uni">${escapeHtml(top ? `${top.university} · ${formatRank(top.latestRank)}` : 'TercihAtlas YKS 2027')}</div>
              </div>
            </div>
            <div class="sb-target-gap tabular">${escapeHtml(gapLine)}</div>
          </div>
        </div>
      </div>
    `;

    host.querySelector('#closeStandbyBtn')?.addEventListener('click', close);
    host.querySelectorAll('[data-sb-theme]').forEach((btn) => {
      btn.addEventListener('click', () => {
        stats.theme = btn.dataset.sbTheme;
        saveStandbyStats(stats);
        playHapticTick('step');
        render();
      });
    });
    host.querySelectorAll('[data-sb-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        presetMins = Number(btn.dataset.sbPreset) || 25;
        remainingSec = presetMins * 60;
        running = false;
        clearInterval(timerId);
        timerId = null;
        playHapticTick('step');
        render();
      });
    });
    host.querySelector('#sbToggleTimerBtn')?.addEventListener('click', () => {
      running = !running;
      playHapticTick('commit');
      if (running) {
        clearInterval(timerId);
        timerId = setInterval(() => {
          remainingSec = Math.max(0, remainingSec - 1);
          updateLiveTick();
          if (remainingSec === 0) {
            running = false;
            clearInterval(timerId);
            timerId = null;
            if (presetMins >= 15) {
              stats.minutes += presetMins;
              stats.sessions += 1;
              saveStandbyStats(stats);
            }
            playStandbyChime();
            onToast?.(`${presetMins} dk etüt tamamlandı! Harika odaklandın.`, 'success');
            remainingSec = presetMins * 60;
            render();
          }
        }, 1000);
      } else {
        clearInterval(timerId);
        timerId = null;
      }
      render();
    });
    host.querySelector('#sbResetTimerBtn')?.addEventListener('click', () => {
      running = false;
      clearInterval(timerId);
      timerId = null;
      remainingSec = presetMins * 60;
      playHapticTick('step');
      render();
    });

    updateLiveTick();
  };

  const openModal = () => {
    const overlay = document.getElementById('standbyOverlay');
    if (!overlay) return;
    open = true;
    stats = loadStandbyStats();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('standby-open');
    render();
    clearInterval(clockId);
    clockId = setInterval(updateLiveTick, 1000);
    playHapticTick('commit');
  };

  const close = () => {
    if (!open) return;
    open = false;
    const overlay = document.getElementById('standbyOverlay');
    overlay?.classList.remove('open');
    overlay?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('standby-open');
    clearInterval(clockId);
    clockId = null;
  };

  return { open: openModal, close, isOpen: () => open };
}

// ============================================================================
// Feature 4: macOS "Stage Manager / Mission Control" 3D Scenario Card Deck
// ============================================================================
export function renderStageManagerHtml(state) {
  const scenarios = state.scenarios || [];
  const cards = scenarios
    .map((sc) => {
      const progs = sc.programs || [];
      const active = sc.id === state.activeScenarioId;
      const top = progs[0] || null;
      const logo = top ? getLogoUrl(top.universityId) : '';
      const initials = top ? escapeHtml(getUniInitials(top.university)) : 'TA';
      const hayal = progs.filter((p) => p.risk === 'hayal').length;
      const hedef = progs.filter((p) => p.risk === 'hedef').length;
      const guvenli = progs.filter((p) => p.risk === 'guvenli').length;
      const total = progs.length;
      const pct = (n) => (total ? (n / total) * 100 : 0);
      const ranks = progs.map((p) => p.latestRank).filter((r) => r && r > 0);
      const band = ranks.length ? `${formatRank(Math.min(...ranks))} – ${formatRank(Math.max(...ranks))}` : '—';

      return `
        <article class="stage-card ${active ? 'is-active' : ''}" data-stage-pick="${escapeHtml(sc.id)}">
          <div class="stage-card-head">
            <strong class="stage-card-title">${escapeHtml(sc.name)}</strong>
            ${active ? `<span class="pill" style="background:var(--accent-soft);color:var(--accent);">Aktif Plan</span>` : `<span class="pill tabular">${total}/24</span>`}
          </div>
          <div class="stage-card-top">
            <div class="stage-uni-sq">
              ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(top.university)}" onerror="this.style.display='none';this.parentElement.textContent='${initials}'" />` : initials}
            </div>
            <div style="min-width:0;flex:1;">
              <div class="stage-top-dept">${escapeHtml(top?.department || 'Boş Plan')}</div>
              <div class="stage-top-uni">${escapeHtml(top ? `${top.university} · ${formatRank(top.latestRank)}` : 'Henüz bölüm eklenmedi')}</div>
            </div>
          </div>
          <div class="stage-risk-bar">
            ${hayal ? `<i style="width:${pct(hayal)}%;background:var(--rose);"></i>` : ''}
            ${hedef ? `<i style="width:${pct(hedef)}%;background:var(--accent);"></i>` : ''}
            ${guvenli ? `<i style="width:${pct(guvenli)}%;background:var(--green-bright);"></i>` : ''}
          </div>
          <div class="stage-meta-row tabular">
            <span>${hayal}H · ${hedef}O · ${guvenli}G</span>
            <span>${band}</span>
          </div>
          <div class="stage-card-footer">
            <button class="btn ${active ? 'btn-soft' : 'btn-primary'} btn-sm" type="button" data-stage-switch="${escapeHtml(sc.id)}">${active ? 'Açık' : 'Bu Plana Geç'}</button>
            <button class="btn btn-sm" type="button" data-stage-dup="${escapeHtml(sc.id)}" title="Bu planı kopyala">Kopyala</button>
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <div class="stage-shell">
      <div class="stage-header">
        <div>
          <span class="stage-kicker">MISSION CONTROL · STAGE MANAGER</span>
          <h3>Tercih Planı Destesi (${scenarios.length})</h3>
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" type="button" id="closeStageManagerBtn" aria-label="Kapat">
          <svg class="sf-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="stage-deck">
        ${cards}
        <button class="stage-card stage-add-card" type="button" id="stageNewScenarioBtn">
          <span class="stage-add-plus">+</span>
          <strong>Yeni Tercih Planı</strong>
          <span>Sıfırdan yeni senaryo aç</span>
        </button>
      </div>
    </div>
  `;
}

// ============================================================================
// Feature 6: iPadOS "Split View" Draggable Glass Divider Side-by-Side Inspector
// ============================================================================
export function renderSplitViewHtml(programs, leftCode, rightCode, { myNets, compute2027Projection, compareWithMyNets }) {
  const left = programs.find((p) => p.code === leftCode) || programs[0];
  const right = programs.find((p) => p.code === rightCode && p.code !== left?.code) || programs.find((p) => p.code !== left?.code) || programs[0];
  if (!left || !right) return '';

  const renderPane = (p, side, other) => {
    const logo = getLogoUrl(p.universityId);
    const initials = escapeHtml(getUniInitials(p.university));
    const proj = compute2027Projection?.(p);
    const gap = compareWithMyNets?.(p, myNets);
    const net0 = p.nets?.[0] || null;
    const aytFields = getAytFieldsForScoreType(p.scoreType);
    const rankWins = p.latestRank && other?.latestRank && p.latestRank < other.latestRank;
    const riskMeta = RISK_META[p.risk] || RISK_META.hedef;

    return `
      <div class="split-pane" data-split-side="${side}">
        <div class="split-pane-picker">
          <select class="select toolbar-select split-select" data-split-select="${side}" aria-label="${side === 'left' ? 'Sol bölüm' : 'Sağ bölüm'}">
            ${programs
              .map(
                (item, idx) =>
                  `<option value="${escapeHtml(item.code)}" ${item.code === p.code ? 'selected' : ''}>#${String(idx + 1).padStart(2, '0')} ${escapeHtml(item.university)} — ${escapeHtml(item.department)}</option>`,
              )
              .join('')}
          </select>
        </div>

        <div class="split-pane-hero">
          <div class="uni-avatar" style="width:42px;height:42px;border-radius:12px;">
            ${logo ? `<img src="${escapeHtml(logo)}" alt="${escapeHtml(p.university)}" onerror="this.style.display='none';this.parentElement.textContent='${initials}'" />` : initials}
          </div>
          <div style="min-width:0;flex:1;">
            <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:3px;">
              <span class="pill pill-risk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(riskMeta.label)}</span>
              <span class="pill">${escapeHtml(p.scoreType)}</span>
              ${rankWins ? `<span class="pill" style="background:var(--green-soft);color:var(--green);">Daha Yüksek Taban</span>` : ''}
            </div>
            <h4 class="split-dept">${escapeHtml(p.department)}</h4>
            <div class="split-uni">${escapeHtml(p.university)} · ${escapeHtml(p.city)}</div>
          </div>
        </div>

        <div class="split-metrics tabular">
          <div class="split-metric">
            <span>${escapeHtml(p.latestYear || 2026)} Sıra</span>
            <strong class="${rankWins ? 'compare-best' : ''}">${formatRank(p.latestRank)}</strong>
          </div>
          <div class="split-metric">
            <span>2027 Tahmini</span>
            <strong style="color:var(--accent);">${proj ? `${formatRank(proj.low)}–${formatRank(proj.high)}` : '—'}</strong>
          </div>
          <div class="split-metric">
            <span>Taban Puan</span>
            <strong>${formatScore(p.latestScore)}</strong>
          </div>
          <div class="split-metric">
            <span>Kontenjan</span>
            <strong>${p.quota ?? '—'}${p.tuition ? ` · ${formatCurrency(p.tuition)}` : ''}</strong>
          </div>
        </div>

        <div class="split-block">
          <div class="split-block-title">4 Yıllık Taban Trendi</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
            ${renderSparkline(p.history, { width: 150, height: 42 })}
            <div class="split-hist-list tabular">
              ${(p.history || [])
                .slice(0, 4)
                .map((h) => `<span><strong>${h.year}:</strong> ${formatRank(h.rank)}</span>`)
                .join('')}
            </div>
          </div>
        </div>

        ${net0
          ? `<div class="split-block">
              <div class="split-block-title">Son Yerleşen Net Ortalaması (${net0.year || p.latestYear})</div>
              <div class="split-net-pills tabular">
                <span class="pill">TYT <strong>${formatNet(net0.tytTotal)}</strong>${gap?.tytDiff !== null && gap?.tytDiff !== undefined ? ` <em class="${gap.tytDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}">${formatSignedNet(gap.tytDiff)}</em>` : ''}</span>
                <span class="pill">${p.scoreType === 'DİL' ? 'YDT' : 'AYT'} <strong>${formatNet(p.scoreType === 'DİL' ? net0.ydt : net0.aytTotal)}</strong>${gap?.aytDiff !== null && gap?.aytDiff !== undefined ? ` <em class="${gap.aytDiff >= 0 ? 'net-delta-pos' : 'net-delta-neg'}">${formatSignedNet(gap.aytDiff)}</em>` : ''}</span>
              </div>
              <div class="split-sub-nets tabular">
                ${aytFields
                  .slice(0, 4)
                  .map((f) => {
                    const v = p.scoreType === 'DİL' ? net0.ydt : net0.ayt?.[f.key];
                    return `<span>${escapeHtml(f.label)}: <strong>${formatNet(v)}</strong></span>`;
                  })
                  .join('')}
              </div>
            </div>`
          : ''}

        ${p.notes
          ? `<div class="split-block">
              <div class="split-block-title">Kişisel Notun</div>
              <p class="split-note">${escapeHtml(p.notes)}</p>
            </div>`
          : ''}
      </div>
    `;
  };

  return `
    <div class="split-modal-shell">
      <div class="split-topbar">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="pill" style="background:var(--accent-soft);color:var(--accent);">iPadOS Split View</span>
          <span class="split-hint">Ortadaki cam çubuğu sağa/sola sürükle · Çift tıkla %50/%50</span>
        </div>
        <button class="btn btn-ghost btn-icon btn-sm" type="button" id="closeSplitViewBtn" aria-label="Kapat">
          <svg class="sf-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="split-stage" id="splitViewStage" style="--split-left: 50%;">
        ${renderPane(left, 'left', right)}
        <div class="split-divider" id="splitViewDivider" role="separator" aria-orientation="vertical" aria-label="Bölüm ayırıcı" tabindex="0">
          <span class="split-divider-handle"></span>
        </div>
        ${renderPane(right, 'right', left)}
      </div>
    </div>
  `;
}

export function bindSplitDivider(stageEl, dividerEl) {
  if (!stageEl || !dividerEl) return;
  let dragging = false;
  let ratio = 50;

  const applyRatio = (pct) => {
    ratio = Math.max(28, Math.min(72, pct));
    stageEl.style.setProperty('--split-left', `${ratio.toFixed(1)}%`);
  };

  dividerEl.addEventListener('pointerdown', (e) => {
    dragging = true;
    dividerEl.classList.add('dragging');
    try {
      dividerEl.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    playHapticTick('step');
    e.preventDefault();
  });

  dividerEl.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const rect = stageEl.getBoundingClientRect();
    if (!rect.width) return;
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    applyRatio(pct);
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    dividerEl.classList.remove('dragging');
    try {
      if (e && dividerEl.hasPointerCapture?.(e.pointerId)) dividerEl.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    playHapticTick('commit');
  };

  dividerEl.addEventListener('pointerup', endDrag);
  dividerEl.addEventListener('pointercancel', endDrag);
  dividerEl.addEventListener('dblclick', () => {
    applyRatio(50);
    playHapticTick('commit');
  });
}

// ============================================================================
// Feature 5A: iOS Quick-Jump Scrubber (#01-#24)
// ============================================================================
export function renderAndBindScrubber(programs, { visible = true } = {}) {
  const host = document.getElementById('prefScrubber');
  if (!host) return;
  if (!visible || !Array.isArray(programs) || programs.length < 6) {
    host.classList.remove('open');
    host.setAttribute('aria-hidden', 'true');
    host.innerHTML = '';
    return;
  }

  host.innerHTML = `
    <div class="scrubber-rail" id="scrubberRail">
      ${programs
        .map(
          (p, i) =>
            `<span class="scrubber-tick" data-scrub-idx="${i}">${i === 0 || i === programs.length - 1 || (i + 1) % 3 === 0 ? i + 1 : '·'}</span>`,
        )
        .join('')}
    </div>
    <div class="scrubber-loupe tabular" id="scrubberLoupe" aria-hidden="true"></div>
  `;
  host.classList.add('open');
  host.setAttribute('aria-hidden', 'false');

  const rail = host.querySelector('#scrubberRail');
  const loupe = host.querySelector('#scrubberLoupe');
  if (!rail || !loupe) return;

  let active = false;
  let lastIdx = -1;

  const scrubToClientY = (clientY) => {
    const rect = rail.getBoundingClientRect();
    if (!rect.height) return;
    const norm = Math.max(0, Math.min(0.9999, (clientY - rect.top) / rect.height));
    const idx = Math.floor(norm * programs.length);
    const prog = programs[idx];
    if (!prog) return;

    const relY = Math.max(8, Math.min(rect.height - 8, clientY - rect.top));
    loupe.style.top = `${relY.toFixed(1)}px`;
    loupe.innerHTML = `<strong>#${String(idx + 1).padStart(2, '0')}</strong> <span>${escapeHtml(prog.university.slice(0, 18))}</span>`;
    loupe.classList.add('visible');

    if (idx !== lastIdx) {
      lastIdx = idx;
      playHapticTick('step');
      const targetEl = document.querySelector(`#programList [data-code="${CSS.escape(prog.code)}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  };

  rail.addEventListener('pointerdown', (e) => {
    active = true;
    lastIdx = -1;
    try {
      rail.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    rail.classList.add('scrubbing');
    scrubToClientY(e.clientY);
    e.preventDefault();
  });

  rail.addEventListener('pointermove', (e) => {
    if (!active) return;
    scrubToClientY(e.clientY);
  });

  const endScrub = (e) => {
    if (!active) return;
    active = false;
    rail.classList.remove('scrubbing');
    loupe.classList.remove('visible');
    try {
      if (e && rail.hasPointerCapture?.(e.pointerId)) rail.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  rail.addEventListener('pointerup', endScrub);
  rail.addEventListener('pointercancel', endScrub);
}

// ============================================================================
// Feature 5B: iOS Elastic Pull-to-Refresh (Touch Top-of-Page Pull)
// ============================================================================
let ptrInitialized = false;

export function initPullToRefresh({ canRefresh, onRefresh }) {
  if (ptrInitialized || typeof window === 'undefined') return;
  ptrInitialized = true;

  const pill = document.getElementById('pullRefreshPill');
  if (!pill) return;

  let tracking = false;
  let startY = 0;
  let startX = 0;
  let pullDist = 0;
  let armed = false;

  window.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length !== 1) return;
      if (window.scrollY > 2) return;
      if (document.querySelector('.modal-overlay.open, .drawer.open, .standby-overlay.open')) return;
      if (e.target.closest('.drawer, .modal, .mobile-nav, input, textarea, select')) return;
      tracking = true;
      armed = false;
      pullDist = 0;
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
    },
    { passive: true },
  );

  window.addEventListener(
    'touchmove',
    (e) => {
      if (!tracking) return;
      const dy = e.touches[0].clientY - startY;
      const dx = Math.abs(e.touches[0].clientX - startX);
      if (dy <= 6 || dx > dy * 0.9 || window.scrollY > 2) {
        if (pullDist > 0) {
          pill.classList.remove('pulling', 'armed');
          pill.style.transform = '';
          pullDist = 0;
        }
        return;
      }
      // Rubber-band curve
      pullDist = Math.min(96, dy * 0.48);
      pill.classList.add('pulling');
      pill.style.transform = `translate(-50%, ${Math.round(pullDist - 46)}px)`;
      const nowArmed = pullDist >= 64;
      if (nowArmed !== armed) {
        armed = nowArmed;
        pill.classList.toggle('armed', armed);
        if (armed) playHapticTick('commit');
      }
      const lbl = pill.querySelector('.ptr-label');
      if (lbl) lbl.textContent = armed ? 'Bırak · Canlı Doğrula' : 'Yenilemek için çek';
    },
    { passive: true },
  );

  const finishPull = () => {
    if (!tracking) return;
    tracking = false;
    if (armed && canRefresh?.()) {
      pill.classList.add('refreshing');
      const lbl = pill.querySelector('.ptr-label');
      if (lbl) lbl.textContent = 'YÖK Atlas doğrulanıyor...';
      Promise.resolve(onRefresh?.()).finally(() => {
        setTimeout(() => {
          pill.classList.remove('pulling', 'armed', 'refreshing');
          pill.style.transform = '';
        }, 420);
      });
    } else {
      pill.classList.remove('pulling', 'armed');
      pill.style.transform = '';
    }
    armed = false;
    pullDist = 0;
  };

  window.addEventListener('touchend', finishPull, { passive: true });
  window.addEventListener('touchcancel', finishPull, { passive: true });
}

// ============================================================================
// Feature 1: iOS "Swipe Actions" (Apple Mail Horizontal Swipe on Cards & Rows)
// ============================================================================
let activeSwipeClose = null;

export function closeActiveSwipe() {
  if (typeof activeSwipeClose === 'function') {
    activeSwipeClose();
    activeSwipeClose = null;
  }
}

export function bindSwipeActions(listEl, { isCompared, onCompare, onMoveTop, onCycleRisk, onDelete, disabled = false }) {
  closeActiveSwipe();
  if (!listEl || disabled) return;

  const hud = document.getElementById('swipeActionHud');
  if (!hud) return;

  const items = listEl.querySelectorAll('[data-code]');
  items.forEach((el) => {
    const code = el.dataset.code;
    if (!code) return;

    let startX = 0;
    let startY = 0;
    let locked = null; // 'h' | 'v' | null
    let dx = 0;
    let armedDir = null; // 'left' | 'right' | null

    const snapBack = () => {
      el.style.transition = 'transform 280ms cubic-bezier(0.22, 1.12, 0.36, 1)';
      el.style.transform = '';
      el.classList.remove('swiping-active');
      hud.classList.remove('open');
      hud.innerHTML = '';
      setTimeout(() => {
        el.style.transition = '';
      }, 290);
      if (activeSwipeClose === snapBack) activeSwipeClose = null;
    };

    const positionHud = (offsetX, committed) => {
      const rect = el.getBoundingClientRect();
      const absX = Math.abs(offsetX);
      if (absX < 18) {
        hud.classList.remove('open');
        return;
      }
      const isRight = offsetX > 0;
      const cmpNow = isCompared?.(code);
      hud.style.top = `${Math.round(rect.top)}px`;
      hud.style.height = `${Math.round(rect.height)}px`;

      if (isRight) {
        hud.style.left = `${Math.round(rect.left - offsetX)}px`;
        hud.style.width = `${Math.max(76, Math.round(offsetX - 6))}px`;
        hud.innerHTML = committed
          ? `<button class="swipe-pill swipe-blue swipe-armed" type="button" data-sw-act="compare">${cmpNow ? 'Çıkar' : 'Kıyasla'}</button>`
          : `<button class="swipe-pill swipe-blue" type="button" data-sw-act="compare">${cmpNow ? 'Çıkar' : 'Kıyasla'}</button>
             <button class="swipe-pill swipe-indigo" type="button" data-sw-act="top">#1 Yap</button>`;
      } else {
        hud.style.left = `${Math.round(rect.right + 6)}px`;
        hud.style.width = `${Math.max(76, Math.round(absX - 6))}px`;
        hud.innerHTML = committed
          ? `<button class="swipe-pill swipe-red swipe-armed" type="button" data-sw-act="delete">Bırak · Sil</button>`
          : `<button class="swipe-pill swipe-amber" type="button" data-sw-act="risk">Risk</button>
             <button class="swipe-pill swipe-red" type="button" data-sw-act="delete">Sil</button>`;
      }

      hud.classList.add('open');
      hud.querySelectorAll('[data-sw-act]').forEach((btn) => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          const act = btn.dataset.swAct;
          snapBack();
          if (act === 'compare') onCompare?.(code);
          else if (act === 'top') onMoveTop?.(code);
          else if (act === 'risk') onCycleRisk?.(code);
          else if (act === 'delete') onDelete?.(code);
        };
      });
    };

    // Touch swipe (iPhone / iPad)
    el.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length !== 1) return;
        if (e.target.closest('button, a, input, select')) return;
        if (activeSwipeClose && activeSwipeClose !== snapBack) closeActiveSwipe();
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        locked = null;
        dx = 0;
        armedDir = null;
      },
      { passive: true },
    );

    el.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length !== 1 || locked === 'v') return;
        const curX = e.touches[0].clientX - startX;
        const curY = e.touches[0].clientY - startY;

        if (!locked) {
          if (Math.abs(curY) > 10 && Math.abs(curY) >= Math.abs(curX) * 0.9) {
            locked = 'v';
            return;
          }
          if (Math.abs(curX) > 12 && Math.abs(curX) > Math.abs(curY) * 1.35) {
            locked = 'h';
            el.classList.add('swiping-active');
            el.style.transition = 'none';
          } else {
            return;
          }
        }

        e.preventDefault();
        // Rubber-band past 148px
        const limit = 152;
        dx = Math.abs(curX) > limit ? Math.sign(curX) * (limit + (Math.abs(curX) - limit) * 0.25) : curX;
        el.style.transform = `translate3d(${dx.toFixed(1)}px, 0, 0)`;

        const nextArmed = dx >= 118 ? 'right' : dx <= -118 ? 'left' : null;
        if (nextArmed !== armedDir) {
          armedDir = nextArmed;
          if (armedDir) playHapticTick('commit');
        }
        positionHud(dx, Boolean(armedDir));
      },
      { passive: false },
    );

    const endTouch = () => {
      if (locked !== 'h') return;
      locked = null;
      if (armedDir === 'right') {
        snapBack();
        onCompare?.(code);
        return;
      }
      if (armedDir === 'left') {
        snapBack();
        onDelete?.(code);
        return;
      }
      if (Math.abs(dx) >= 54) {
        const openX = dx > 0 ? 128 : -128;
        el.style.transition = 'transform 260ms cubic-bezier(0.22, 1.12, 0.36, 1)';
        el.style.transform = `translate3d(${openX}px, 0, 0)`;
        setTimeout(() => positionHud(openX, false), 40);
        activeSwipeClose = snapBack;
        playHapticTick('step');
      } else {
        snapBack();
      }
    };

    el.addEventListener('touchend', endTouch, { passive: true });
    el.addEventListener('touchcancel', snapBack, { passive: true });

    // macOS Trackpad two-finger horizontal swipe
    let wheelAccum = 0;
    let wheelTimer = null;
    el.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.8 || Math.abs(e.deltaX) < 10) return;
        e.preventDefault();
        if (activeSwipeClose && activeSwipeClose !== snapBack) closeActiveSwipe();
        wheelAccum = Math.max(-132, Math.min(132, wheelAccum - e.deltaX * 0.9));
        el.style.transition = 'none';
        el.style.transform = `translate3d(${wheelAccum.toFixed(1)}px, 0, 0)`;
        positionHud(wheelAccum, false);
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => {
          if (Math.abs(wheelAccum) >= 56) {
            const openX = wheelAccum > 0 ? 128 : -128;
            el.style.transition = 'transform 240ms cubic-bezier(0.22, 1.12, 0.36, 1)';
            el.style.transform = `translate3d(${openX}px, 0, 0)`;
            setTimeout(() => positionHud(openX, false), 30);
            activeSwipeClose = snapBack;
            playHapticTick('step');
          } else {
            snapBack();
          }
          wheelAccum = 0;
        }, 120);
      },
      { passive: false },
    );
  });
}
