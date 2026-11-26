/**
 * TercihAtlas — v35 Signature Apple Features
 * 1. iOS Jiggle Mode Pointer/Touch Drag-to-Reorder Engine
 * 2. Apple Wallet 3D Holographic "YKS 2027 Aday Kartı" + Story PNG Exporter
 * 3. macOS Spotlight Smart Command Palette (⌘K Actions)
 * 4. Apple Live Activity Target & Next-Unlock Strip
 */

import { escapeHtml, formatRank, RISK_META, getUniInitials } from './utils.js?v=26';
import { getLogoUrl } from './api.js?v=26';
import { playHapticTick } from './apple-craft.js?v=34';

// ============================================================================
// Feature 6: Apple Live Activity Strip (YKS 2027 Countdown + Next Unlock Goal)
// ============================================================================
const LIVE_ACTIVITY_KEY = 'tercihatlas_live_activity_v1';

export function isLiveActivityEnabled() {
  try {
    const v = localStorage.getItem(LIVE_ACTIVITY_KEY);
    return v !== '0' && v !== 'false';
  } catch {
    return true;
  }
}

export function setLiveActivityEnabled(enabled) {
  try {
    localStorage.setItem(LIVE_ACTIVITY_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function computeLiveActivityData(state, { estimateYksRankFromNets, compareWithMyNets }) {
  const yksDate = new Date('2027-06-19T10:15:00+03:00');
  const diffMs = Math.max(0, yksDate.getTime() - Date.now());
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);

  const programs = state.programs || [];
  const est = estimateYksRankFromNets?.(state.myNets) || null;

  let missionText = '';
  let missionAction = 'nets';
  let missionCode = '';
  let missionTone = 'accent';

  if (!programs.length) {
    missionText = 'İlk hedef bölümünü ekle — canlı kilit takibi başlasın';
    missionAction = 'add';
  } else if (!est) {
    const top = programs[0];
    missionText = `1. Hedef: ${top.university} (${formatRank(top.latestRank)}) · Netlerini girerek kilit mesafeni gör`;
    missionAction = 'nets';
  } else {
    // Find the closest program the student doesn't yet comfortably reach (smallest positive net gap or rank gap)
    let closestLocked = null;
    let bestScore = Infinity;

    for (const p of programs) {
      const st = String(p.scoreType || 'SAY').toUpperCase();
      const myRank = est[st]?.rank || est.SAY?.rank || est.EA?.rank;
      if (!myRank || !p.latestRank) continue;
      if (myRank > p.latestRank * 1.03) {
        const gap = compareWithMyNets?.(p, state.myNets);
        const aytNeed = gap?.aytDiff !== null && gap?.aytDiff < 0 ? Math.abs(gap.aytDiff) : null;
        const tytNeed = gap?.tytDiff !== null && gap?.tytDiff < 0 ? Math.abs(gap.tytDiff) : null;
        const rankRatio = myRank / Math.max(1, p.latestRank);
        if (rankRatio < bestScore) {
          bestScore = rankRatio;
          closestLocked = { p, aytNeed, tytNeed, myRank };
        }
      }
    }

    if (closestLocked) {
      const { p, aytNeed, tytNeed } = closestLocked;
      let needStr = '';
      if (aytNeed && aytNeed > 0.2) {
        needStr = `${p.scoreType === 'DİL' ? 'YDT' : 'AYT'} +${aytNeed.toFixed(1).replace('.', ',')} net`;
      } else if (tytNeed && tytNeed > 0.2) {
        needStr = `TYT +${tytNeed.toFixed(1).replace('.', ',')} net`;
      } else {
        const rankDiff = Math.max(100, Math.round(closestLocked.myRank - p.latestRank));
        needStr = `${formatRank(rankDiff)} sıra`;
      }
      missionText = `Sonraki Kilit: ${p.university} ${p.department} için ~${needStr}`;
      missionAction = 'drawer';
      missionCode = p.code;
      missionTone = 'amber';
    } else {
      const top = programs[0];
      missionText = `Harika! Mevcut netlerinle #1 hedefin ${top.university} ulaşılabilir bandında`;
      missionAction = 'drawer';
      missionCode = top.code;
      missionTone = 'green';
    }
  }

  return { days, hours, missionText, missionAction, missionCode, missionTone, programCount: programs.length };
}

export function renderLiveActivityStrip(data) {
  if (!data) return '';
  return `
    <div class="live-activity-wrap">
      <div class="live-activity-pill" role="region" aria-label="YKS 2027 Canlı Hedef Şeridi">
        <button class="la-countdown-btn tabular" type="button" id="laOpenTimelineBtn" title="YKS 2027 Takvim & Yol Haritası">
          <span class="la-live-dot" aria-hidden="true"></span>
          <strong>YKS 2027</strong>
          <span>${data.days}g ${data.hours}sa</span>
        </button>
        <span class="la-sep" aria-hidden="true"></span>
        <button class="la-mission-btn tone-${data.missionTone}" type="button" id="laMissionBtn"
          data-la-action="${escapeHtml(data.missionAction)}" data-la-code="${escapeHtml(data.missionCode)}">
          <span class="la-mission-text">${escapeHtml(data.missionText)}</span>
        </button>
        <div class="la-right-actions">
          <button class="la-mini-btn" type="button" id="laOpenWalletBtn" title="3D Holografik YKS 2027 Aday Kartı">
            <svg class="sf-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/></svg>
            <span>Kartım</span>
          </button>
          <button class="la-close-btn" type="button" id="laDismissBtn" aria-label="Canlı şeridi gizle" title="Gizle (Görünüm menüsünden tekrar açabilirsin)">
            <svg class="sf-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// Feature 3: macOS Spotlight Smart Command Palette (⌘K Actions)
// ============================================================================
function normTr(str) {
  return String(str || '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

const SPOTLIGHT_COMMANDS = [
  { id: 'calc', title: 'Net & Sıralama Hesapla (16 Ders)', desc: 'Analiz → Puan Hesapla robotunu aç', badge: 'Araç', keywords: ['puan hesapla', 'net hesapla', 'siralama hesapla', 'yks hesapla', 'hesaplama', 'obp'] },
  { id: 'wallet', title: '3D Holografik YKS 2027 Aday Kartı', desc: 'Apple Wallet tarzı etkileşimli kartını aç ve PNG indir', badge: 'Kart', keywords: ['aday karti', 'hologram', 'wallet', 'kartim', 'story', 'paylasim karti'] },
  { id: 'jiggle', title: 'Titreşimli Sıralama Modu (Jiggle)', desc: 'Kartları tutup sürükleyerek sırasını değiştir', badge: 'Sırala', keywords: ['sirala', 'jiggle', 'tutup sirala', 'surukle', 'duzenle'] },
  { id: 'smart-sort', title: 'Tercihleri Sıralamaya Göre Akıllı Diz', desc: 'Ölü tercihleri temizle ve taban sırasına göre diz', badge: 'ÖSYM', keywords: ['akilli diz', 'siralamaya diz', 'olu tercih', 'otomatik sirala', 'duzelt'] },
  { id: 'theme-dark', title: 'Koyu Temaya Geç (OLED Dark)', desc: 'Karanlık Apple arayüzünü aç', badge: 'Tema', keywords: ['koyu mod', 'koyu tema', 'karanlik', 'dark mode', 'gece'] },
  { id: 'theme-light', title: 'Açık Temaya Geç (Light)', desc: 'Aydınlık Apple arayüzünü aç', badge: 'Tema', keywords: ['acik mod', 'acik tema', 'aydinlik', 'light mode', 'gunduz'] },
  { id: 'theme-auto', title: 'Sistem Temasını Kullan', desc: 'Cihazının açık/koyu ayarıyla eşitle', badge: 'Tema', keywords: ['sistem temasi', 'otomatik tema', 'auto theme'] },
  { id: 'surface-aurora', title: 'Aurora Cam Atmosferi', desc: 'Renkli aurora zemin efektini aç', badge: 'Görünüm', keywords: ['aurora', 'atmosfer', 'cam zemin'] },
  { id: 'tab-compare', title: 'Karşılaştır Sekmesine Git', desc: '4 bölümü radar ve karar matrisiyle kıyasla', badge: 'Sekme', keywords: ['karsilastir', 'kiyasla', 'radar', 'matris'] },
  { id: 'tab-simulator', title: 'ÖSYM Yerleştirme Simülatörü', desc: 'Sıralamam bu gelirse nereye girerim?', badge: 'Analiz', keywords: ['simulator', 'yerlestirme', 'ne olursa', 'ders kilidi'] },
  { id: 'tab-map', title: 'Türkiye Kampüs Haritası', desc: 'Tercihlerini şehir bazlı haritada gör', badge: 'Analiz', keywords: ['harita', 'kampus haritasi', 'sehirler', 'turkiye'] },
  { id: 'tab-cost', title: '4 Yıllık Maliyet Hesaplayıcı', desc: 'Vakıf, şehir yaşamı ve Avrupa bütçe kıyaslaması', badge: 'Analiz', keywords: ['maliyet', 'butce', 'ucret', 'yurt', 'vakif'] },
  { id: 'tab-timeline', title: 'YKS 2027 Takvim & Yol Haritası', desc: 'Geri sayım ve kişisel yapılacaklar listesi', badge: 'Analiz', keywords: ['takvim', 'geri sayim', 'yol haritasi', 'roadmap'] },
  { id: 'tab-abroad', title: 'Yurt Dışı (Almanya & İtalya)', desc: 'Bavarian notu, Sperrkonto ve DSU takibi', badge: 'Sekme', keywords: ['yurt disi', 'yurtdisi', 'almanya', 'italya', 'bavarian', 'dsu'] },
  { id: 'open-nets', title: 'Netlerim & Dershane PDF Yükle', desc: 'TYT/AYT net profilini güncelle veya PDF yükle', badge: 'Profil', keywords: ['netlerim', 'pdf yukle', 'deneme', 'dershane'] },
  { id: 'open-osym', title: 'ÖSYM AİS Kopyalama & Paylaşım Linki', desc: 'Resmi 5 sütunlu PDF ve veritabanısız paylaşım linki', badge: 'Çıktı', keywords: ['pdf', 'yazdir', 'ais', 'osym', 'paylas', 'link kopyala'] },
  { id: 'toggle-live', title: 'Canlı Hedef Şeridini Aç / Kapat', desc: 'Üstteki YKS 2027 Live Activity çubuğunu değiştir', badge: 'Ayar', keywords: ['live activity', 'canli serit', 'hedef seridi'] },
  { id: 'toggle-haptics', title: 'Dokunsal Sesi (Haptik) Aç / Kapat', desc: 'Liquid Glass mekanik tık sesini aç/kapat', badge: 'Ayar', keywords: ['haptik', 'ses', 'dokunsal', 'tik sesi', 'sessiz'] },
];

export function matchSpotlightCommands(rawQuery) {
  const q = normTr(rawQuery);
  if (!q) {
    // Featured instant actions when Spotlight opens empty
    const featuredIds = ['calc', 'wallet', 'jiggle', 'smart-sort'];
    return SPOTLIGHT_COMMANDS.filter((c) => featuredIds.includes(c.id));
  }
  if (q.length < 2) return [];
  // Ignore pure 9-digit program codes
  if (/^\d{5,}$/.test(q)) return [];

  const scored = [];
  for (const cmd of SPOTLIGHT_COMMANDS) {
    const titleN = normTr(cmd.title);
    const descN = normTr(cmd.desc);
    let score = 0;
    for (const kw of cmd.keywords) {
      if (kw === q) score = Math.max(score, 100);
      else if (kw.startsWith(q)) score = Math.max(score, 85);
      else if (kw.includes(q)) score = Math.max(score, 70);
      else if (q.includes(kw) && kw.length >= 4) score = Math.max(score, 65);
    }
    if (titleN.includes(q)) score = Math.max(score, 78);
    else if (descN.includes(q)) score = Math.max(score, 50);

    if (score > 0) scored.push({ cmd, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((s) => s.cmd);
}

// ============================================================================
// Feature 2: Apple Wallet 3D Holographic "YKS 2027 Aday Kartı" + PNG Export
// ============================================================================
export function renderWalletCardModalHtml(state, { finish = 'titanium', activeScenarioName = 'Plan A' } = {}) {
  const programs = state.programs || [];
  const top = programs[0] || null;
  const top3 = programs.slice(0, 3);
  const hayal = programs.filter((p) => p.risk === 'hayal').length;
  const hedef = programs.filter((p) => p.risk === 'hedef').length;
  const guvenli = programs.filter((p) => p.risk === 'guvenli').length;
  const total = programs.length;
  const pct = (n) => (total ? (n / total) * 100 : 0);

  const yksDate = new Date('2027-06-19T10:15:00+03:00');
  const daysLeft = Math.max(0, Math.floor((yksDate.getTime() - Date.now()) / 86400000));

  const logoUrl = top ? getLogoUrl(top.universityId) : '';
  const initials = top ? escapeHtml(getUniInitials(top.university)) : 'TA';
  const avatarInner = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(top.university)}" decoding="async" onerror="this.style.display='none';this.parentElement.textContent='${initials}'" />`
    : initials;

  return `
    <div class="wallet-modal-shell">
      <div class="wallet-controls-row">
        <div class="segmented" role="tablist" aria-label="Kart materyali">
          <button class="seg-btn seg-btn-sm ${finish === 'titanium' ? 'active' : ''}" type="button" data-wallet-finish="titanium">Titanyum</button>
          <button class="seg-btn seg-btn-sm ${finish === 'obsidian' ? 'active' : ''}" type="button" data-wallet-finish="obsidian">Obsidyen</button>
          <button class="seg-btn seg-btn-sm ${finish === 'aurora' ? 'active' : ''}" type="button" data-wallet-finish="aurora">Aurora Cam</button>
        </div>
        <button class="btn btn-sm" type="button" id="walletGyroBtn" style="display:none;">Jiroskopu Aç</button>
      </div>

      <div class="wallet-stage">
        <div class="wallet-holo-card finish-${escapeHtml(finish)}" id="walletHoloCard" tabindex="0" aria-label="YKS 2027 3D Holografik Aday Kartı">
          <div class="wallet-foil" aria-hidden="true"></div>
          <div class="wallet-sheen" aria-hidden="true"></div>
          <div class="wallet-rim" aria-hidden="true"></div>

          <div class="wallet-card-content">
            <div class="wallet-top-row">
              <div class="wallet-brand-mark">
                <img src="icon-192.png?v=13" alt="TercihAtlas" />
                <div>
                  <span class="wallet-kicker">YKS 2027 · ADAY KARTI</span>
                  <strong class="wallet-plan-name">${escapeHtml(activeScenarioName)}</strong>
                </div>
              </div>
              <div class="wallet-days-badge tabular">
                <strong>${daysLeft}</strong>
                <span>GÜN</span>
              </div>
            </div>

            <div class="wallet-hero-target">
              <div class="wallet-uni-sq">${avatarInner}</div>
              <div style="min-width:0;flex:1;">
                <span class="wallet-sub-label">1. TERCİH HEDEFİ</span>
                <div class="wallet-dept">${top ? escapeHtml(top.department) : 'Henüz bölüm eklenmedi'}</div>
                <div class="wallet-uni">${top ? `${escapeHtml(top.university)} · ${escapeHtml(top.city || '')}` : 'Listene bölüm ekleyince burada parlar'}</div>
              </div>
            </div>

            <div class="wallet-stats-strip tabular">
              <div class="wallet-stat">
                <span>HEDEF SIRALAMA</span>
                <strong>${state.targetRank ? formatRank(state.targetRank) : '—'}</strong>
              </div>
              <div class="wallet-stat">
                <span>TERCİH LİSTESİ</span>
                <strong>${total} / 24</strong>
              </div>
              <div class="wallet-stat">
                <span>1. TABAN SIRA</span>
                <strong>${top?.latestRank ? formatRank(top.latestRank) : '—'}</strong>
              </div>
            </div>

            <div class="wallet-risk-bar">
              ${hayal ? `<i style="width:${pct(hayal)}%;background:#FF375F;"></i>` : ''}
              ${hedef ? `<i style="width:${pct(hedef)}%;background:#0A84FF;"></i>` : ''}
              ${guvenli ? `<i style="width:${pct(guvenli)}%;background:#30D158;"></i>` : ''}
              ${!total ? `<i style="width:100%;background:rgba(255,255,255,0.22);"></i>` : ''}
            </div>
            <div class="wallet-risk-meta tabular">
              <span>${hayal} Hayal · ${hedef} Hedef · ${guvenli} Güvenli</span>
              <span>tercihatlas</span>
            </div>

            ${top3.length
              ? `<div class="wallet-top3-list">
                  ${top3
                    .map(
                      (p, idx) => `<div class="wallet-top3-item">
                        <span class="wallet-top3-ord">#0${idx + 1}</span>
                        <span class="wallet-top3-name">${escapeHtml(p.university)} — ${escapeHtml(p.department)}</span>
                        <strong class="tabular">${formatRank(p.latestRank)}</strong>
                      </div>`,
                    )
                    .join('')}
                </div>`
              : ''}
          </div>
        </div>
      </div>

      <p class="wallet-hint">Kartın üzerinde fareni gezdir veya parmağınla eğ — holografik Liquid Glass yansıması canlı hareket eder.</p>

      <div class="wallet-footer-actions">
        <button class="btn btn-primary" type="button" id="walletExportPngBtn">Story PNG İndir (1080×1350)</button>
      </div>
    </div>
  `;
}

export function initWalletCard3DPhysics(cardEl, gyroBtn) {
  if (!cardEl) return () => {};
  let rx = 0;
  let ry = 0;
  let tx = 0;
  let ty = 0;
  let gx = 50;
  let gy = 50;
  let tgx = 50;
  let tgy = 50;
  let rafId = null;
  let destroyed = false;

  const tick = () => {
    if (destroyed) return;
    rx += (tx - rx) * 0.14;
    ry += (ty - ry) * 0.14;
    gx += (tgx - gx) * 0.14;
    gy += (tgy - gy) * 0.14;

    cardEl.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    cardEl.style.setProperty('--hx', `${gx.toFixed(1)}%`);
    cardEl.style.setProperty('--hy', `${gy.toFixed(1)}%`);
    cardEl.style.setProperty('--hangle', `${(118 + ry * 4.5).toFixed(1)}deg`);

    const moving =
      Math.abs(tx - rx) > 0.04 ||
      Math.abs(ty - ry) > 0.04 ||
      Math.abs(tgx - gx) > 0.15 ||
      Math.abs(tgy - gy) > 0.15;
    if (moving) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  };

  const kick = () => {
    if (rafId === null && !destroyed) rafId = requestAnimationFrame(tick);
  };

  const setFromNormalized = (nx, ny) => {
    const cx = Math.max(-1, Math.min(1, nx));
    const cy = Math.max(-1, Math.min(1, ny));
    ty = cx * 13;
    tx = -cy * 11;
    tgx = 50 + cx * 42;
    tgy = 50 + cy * 42;
    kick();
  };

  const onPointerMove = (e) => {
    const rect = cardEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    setFromNormalized(nx, ny);
  };

  const onPointerLeave = () => {
    tx = 0;
    ty = 0;
    tgx = 50;
    tgy = 50;
    kick();
  };

  cardEl.addEventListener('pointermove', onPointerMove, { passive: true });
  cardEl.addEventListener('pointerleave', onPointerLeave, { passive: true });
  cardEl.addEventListener('pointerup', onPointerLeave, { passive: true });

  // Optional DeviceOrientation (gyroscope) on phones
  const onOrientation = (e) => {
    if (e.gamma == null || e.beta == null) return;
    const nx = Math.max(-1, Math.min(1, e.gamma / 30));
    const ny = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
    setFromNormalized(nx, ny);
  };

  let gyroListening = false;
  const startGyro = () => {
    if (gyroListening) return;
    gyroListening = true;
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    if (gyroBtn) gyroBtn.style.display = 'none';
  };

  if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && window.matchMedia?.('(pointer: coarse)')?.matches) {
    if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      if (gyroBtn) {
        gyroBtn.style.display = '';
        gyroBtn.addEventListener('click', async () => {
          try {
            const res = await window.DeviceOrientationEvent.requestPermission();
            if (res === 'granted') {
              startGyro();
              playHapticTick('success');
            }
          } catch {
            /* ignore */
          }
        });
      }
    } else {
      startGyro();
    }
  }

  return () => {
    destroyed = true;
    if (rafId !== null) cancelAnimationFrame(rafId);
    cardEl.removeEventListener('pointermove', onPointerMove);
    cardEl.removeEventListener('pointerleave', onPointerLeave);
    cardEl.removeEventListener('pointerup', onPointerLeave);
    if (gyroListening) window.removeEventListener('deviceorientation', onOrientation);
  };
}

export function exportWalletCardPng(state, { finish = 'titanium', activeScenarioName = 'Plan A' } = {}) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const palettes = {
    titanium: {
      bg1: '#0F172A', bg2: '#1E293B', bg3: '#334155',
      card1: '#E2E8F0', card2: '#F8FAFC', card3: '#CBD5E1',
      text: '#0F172A', sub: '#475569', accent: '#0071E3',
      chipBg: 'rgba(15, 23, 42, 0.08)',
    },
    obsidian: {
      bg1: '#050507', bg2: '#101218', bg3: '#18181F',
      card1: '#1C1C22', card2: '#121216', card3: '#262630',
      text: '#F5F5F7', sub: '#A1A1AA', accent: '#38BDF8',
      chipBg: 'rgba(255, 255, 255, 0.08)',
    },
    aurora: {
      bg1: '#0B1120', bg2: '#1E1B4B', bg3: '#0F172A',
      card1: '#1D4ED8', card2: '#4338CA', card3: '#0F766E',
      text: '#FFFFFF', sub: 'rgba(255,255,255,0.78)', accent: '#38BDF8',
      chipBg: 'rgba(255, 255, 255, 0.14)',
    },
  };
  const pal = palettes[finish] || palettes.titanium;

  // Backdrop
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, pal.bg1);
  bg.addColorStop(0.5, pal.bg2);
  bg.addColorStop(1, pal.bg3);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Ambient Holographic Glow Orbs
  const orb1 = ctx.createRadialGradient(220, 260, 20, 220, 260, 420);
  orb1.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
  orb1.addColorStop(1, 'transparent');
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, W, H);

  const orb2 = ctx.createRadialGradient(860, 1040, 20, 860, 1040, 420);
  orb2.addColorStop(0, 'rgba(251, 146, 60, 0.22)');
  orb2.addColorStop(1, 'transparent');
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, W, H);

  const roundRect = (x, y, w, h, r) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  };

  // Main Holographic Card
  const cx = 76;
  const cy = 110;
  const cw = W - 152;
  const ch = H - 220;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 28;
  roundRect(cx, cy, cw, ch, 56);
  const cg = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
  cg.addColorStop(0, pal.card1);
  cg.addColorStop(0.52, pal.card2);
  cg.addColorStop(1, pal.card3);
  ctx.fillStyle = cg;
  ctx.fill();
  ctx.restore();

  // Prismatic diagonal sheen across card
  ctx.save();
  roundRect(cx, cy, cw, ch, 56);
  ctx.clip();
  const foil = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
  foil.addColorStop(0.15, 'rgba(56, 189, 248, 0.14)');
  foil.addColorStop(0.45, 'rgba(192, 132, 252, 0.14)');
  foil.addColorStop(0.72, 'rgba(251, 146, 60, 0.12)');
  foil.addColorStop(1, 'transparent');
  ctx.fillStyle = foil;
  ctx.fillRect(cx, cy, cw, ch);
  ctx.restore();

  // Specular border
  roundRect(cx, cy, cw, ch, 56);
  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const programs = state.programs || [];
  const top = programs[0] || null;
  const top3 = programs.slice(0, 5);
  const hayal = programs.filter((p) => p.risk === 'hayal').length;
  const hedef = programs.filter((p) => p.risk === 'hedef').length;
  const guvenli = programs.filter((p) => p.risk === 'guvenli').length;
  const daysLeft = Math.max(0, Math.floor((new Date('2027-06-19T10:15:00+03:00').getTime() - Date.now()) / 86400000));

  const pad = cx + 64;
  ctx.fillStyle = pal.accent;
  ctx.font = '700 24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('TERCİHATLAS · YKS 2027 ADAY KARTI', pad, cy + 92);

  ctx.fillStyle = pal.text;
  ctx.font = '700 54px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(activeScenarioName, pad, cy + 162);

  // Days pill top-right
  roundRect(cx + cw - 234, cy + 62, 170, 96, 28);
  ctx.fillStyle = pal.chipBg;
  ctx.fill();
  ctx.fillStyle = pal.text;
  ctx.font = '700 44px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(daysLeft), cx + cw - 149, cy + 114);
  ctx.fillStyle = pal.sub;
  ctx.font = '600 18px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('GÜN KALDI', cx + cw - 149, cy + 142);
  ctx.textAlign = 'left';

  // #1 Target highlight box
  roundRect(pad, cy + 206, cw - 128, 176, 32);
  ctx.fillStyle = pal.chipBg;
  ctx.fill();
  ctx.fillStyle = pal.sub;
  ctx.font = '700 20px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('1. TERCİH HEDEFİ', pad + 34, cy + 254);
  ctx.fillStyle = pal.text;
  ctx.font = '700 38px -apple-system, BlinkMacSystemFont, sans-serif';
  const deptTxt = (top?.department || 'Henüz bölüm eklenmedi').slice(0, 34);
  ctx.fillText(deptTxt, pad + 34, cy + 308);
  ctx.fillStyle = pal.sub;
  ctx.font = '500 26px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(top ? `${top.university} · ${top.city || ''}` : 'tercihatlas', pad + 34, cy + 352);

  // 3 KPI boxes
  const kpiY = cy + 414;
  const boxW = (cw - 128 - 32) / 3;
  const kpis = [
    ['HEDEF SIRALAMA', state.targetRank ? formatRank(state.targetRank) : '—'],
    ['TERCİH SAYISI', `${programs.length} / 24`],
    ['RİSK DENGESİ', `${hayal}H · ${hedef}O · ${guvenli}G`],
  ];
  kpis.forEach(([lbl, val], i) => {
    const bx = pad + i * (boxW + 16);
    roundRect(bx, kpiY, boxW, 126, 26);
    ctx.fillStyle = pal.chipBg;
    ctx.fill();
    ctx.fillStyle = pal.sub;
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(lbl, bx + 24, kpiY + 46);
    ctx.fillStyle = pal.text;
    ctx.font = '700 34px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(val, bx + 24, kpiY + 96);
  });

  // Top 5 list
  ctx.fillStyle = pal.sub;
  ctx.font = '700 20px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('İLK TERCİHLERİM', pad, cy + 596);

  top3.forEach((p, idx) => {
    const ry = cy + 622 + idx * 82;
    roundRect(pad, ry, cw - 128, 68, 20);
    ctx.fillStyle = pal.chipBg;
    ctx.fill();
    ctx.fillStyle = pal.accent;
    ctx.font = '700 24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`#0${idx + 1}`, pad + 24, ry + 43);
    ctx.fillStyle = pal.text;
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(`${p.university} — ${p.department}`.slice(0, 36), pad + 88, ry + 43);
    ctx.textAlign = 'right';
    ctx.fillStyle = pal.sub;
    ctx.font = '700 23px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillText(formatRank(p.latestRank), pad + cw - 152, ry + 43);
    ctx.textAlign = 'left';
  });

  // Footer
  ctx.fillStyle = pal.sub;
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('TercihAtlas · YKS 2027 Karar Destek Sistemi', pad, cy + ch - 46);

  const link = document.createElement('a');
  link.download = `TercihAtlas-YKS2027-${finish}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  return true;
}

// ============================================================================
// Feature 1: iOS "Jiggle Mode" Touch + Mouse Drag-to-Reorder Engine
// ============================================================================
export function bindJigglePointerReorder(listEl, onSwapCodes) {
  if (!listEl || typeof onSwapCodes !== 'function') return;

  const cards = Array.from(listEl.querySelectorAll('[data-code]'));
  cards.forEach((card) => {
    const code = card.dataset.code;
    if (!code) return;

    let active = false;
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let lastSwapTime = 0;

    card.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (e.target.closest('button, a, input, select')) return;
      active = true;
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      try {
        card.setPointerCapture(pointerId);
      } catch {
        /* ignore */
      }
      card.classList.add('jiggle-grabbed');
      playHapticTick('step');
      e.preventDefault();
    });

    card.addEventListener('pointermove', (e) => {
      if (!active || e.pointerId !== pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      card.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(1.03)`;

      const now = performance.now();
      if (now - lastSwapTime < 140) return;

      // Find which sibling card center the pointer is currently over
      const siblings = Array.from(listEl.querySelectorAll('[data-code]'));
      for (const other of siblings) {
        if (other === card) continue;
        const r = other.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          const targetCode = other.dataset.code;
          if (targetCode && targetCode !== code) {
            lastSwapTime = now;
            active = false;
            card.classList.remove('jiggle-grabbed');
            card.style.transform = '';
            try {
              if (card.hasPointerCapture?.(pointerId)) card.releasePointerCapture(pointerId);
            } catch {
              /* ignore */
            }
            playHapticTick('commit');
            onSwapCodes(code, targetCode);
            return;
          }
        }
      }
    });

    const release = (e) => {
      if (!active || (e && e.pointerId !== pointerId)) return;
      active = false;
      card.classList.remove('jiggle-grabbed');
      card.style.transform = '';
      try {
        if (pointerId !== null && card.hasPointerCapture?.(pointerId)) card.releasePointerCapture(pointerId);
      } catch {
        /* ignore */
      }
      pointerId = null;
    };

    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', release);
  });
}
