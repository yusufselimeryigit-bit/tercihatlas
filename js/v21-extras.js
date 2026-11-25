/**
 * TercihAtlas v21 Extras:
 *  - Dynamic University Logo Brand Color Extraction (Apple Music Ambient Glow)
 *  - YKS 2027 & Abroad (Germany/Italy) Countdown + Interactive Roadmap
 *  - Apple Keynote-Grade High-Res PNG Summary Card Exporter (1080x1350)
 */

import { escapeHtml, formatRank, RISK_META } from './utils.js';

// ============================================================================
// 1. Dynamic Brand Color Extraction from Local University Logos (0ms cached)
// ============================================================================
const brandColorCache = new Map();

export async function extractLogoAmbientColor(logoUrl) {
  if (!logoUrl) return null;
  if (brandColorCache.has(logoUrl)) return brandColorCache.get(logoUrl);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 28;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        // Quantize into buckets weighted by saturation so authentic brand hues win over grey/white backgrounds
        const buckets = new Map();
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 140) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const lum = (max + min) / 2;
          const sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));

          // Skip near-white and near-black pixels
          if (lum > 235 || lum < 22) continue;
          if (sat < 0.14) continue;

          const qr = Math.round(r / 24) * 24;
          const qg = Math.round(g / 24) * 24;
          const qb = Math.round(b / 24) * 24;
          const key = `${qr},${qg},${qb}`;
          const weight = (sat * 2.2 + 0.35) * (a / 255);
          const prev = buckets.get(key) || { w: 0, r: 0, g: 0, b: 0 };
          prev.w += weight;
          prev.r += r * weight;
          prev.g += g * weight;
          prev.b += b * weight;
          buckets.set(key, prev);
        }

        let best = null;
        for (const b of buckets.values()) {
          if (!best || b.w > best.w) best = b;
        }

        if (!best || best.w <= 0) {
          brandColorCache.set(logoUrl, null);
          return resolve(null);
        }

        const r = Math.min(255, Math.max(0, Math.round(best.r / best.w)));
        const g = Math.min(255, Math.max(0, Math.round(best.g / best.w)));
        const b = Math.min(255, Math.max(0, Math.round(best.b / best.w)));
        const res = { r, g, b, rgb: `${r}, ${g}, ${b}` };
        brandColorCache.set(logoUrl, res);
        resolve(res);
      } catch {
        brandColorCache.set(logoUrl, null);
        resolve(null);
      }
    };
    img.onerror = () => {
      brandColorCache.set(logoUrl, null);
      resolve(null);
    };
    img.src = logoUrl;
  });
}

// ============================================================================
// 2. YKS 2027 & Abroad Countdown + Personal Roadmap
// ============================================================================
export const ROADMAP_EVENTS = [
  {
    id: 'yks2027',
    title: 'YKS 2027 (TYT & AYT)',
    subtitle: 'Tahmini sınav hafta sonu · Hazırlık hedefi',
    dateIso: '2027-06-19',
    accent: '#0071E3',
    badge: 'TR · YKS',
  },
  {
    id: 'tercih2027',
    title: 'ÖSYM Tercih Dönemi',
    subtitle: '24 tercihlik nihai liste teslimi',
    dateIso: '2027-07-25',
    accent: '#34C759',
    badge: 'ÖSYM AİS',
  },
  {
    id: 'germany_uniassist',
    title: 'Almanya Uni-Assist (WS 27/28)',
    subtitle: 'NC & birçok devlet üniversitesi son başvuru',
    dateIso: '2027-07-15',
    accent: '#FF9F0A',
    badge: '🇩🇪 Almanya',
  },
  {
    id: 'italy_tolc',
    title: 'İtalya TOLC / DSU Burs Dönemi',
    subtitle: 'Erken başvuru & ISEE/DSU evrak hazırlığı',
    dateIso: '2027-05-15',
    accent: '#AF52DE',
    badge: '🇮🇹 İtalya',
  },
];

export const ROADMAP_CHECKLIST_ITEMS = [
  { id: 'rm_shortlist', group: 'Tercih Stratejisi', label: 'İlk 10 hayal / hedef / güvenli bölüm taslağını oluştur' },
  { id: 'rm_campus', group: 'Tercih Stratejisi', label: 'Hedef üniversitelerin tanıtım günleri / kampüs turu planla' },
  { id: 'rm_students', group: 'Tercih Stratejisi', label: 'Bölümlerde okuyan en az 3 öğrenciyle sorulacak soruları konuş' },
  { id: 'rm_scholarship', group: 'Bütçe & Burs', label: 'KYK, vakıf başarı bursları ve özel yurt fiyatlarını kıyasla' },
  { id: 'rm_dead_check', group: 'Tercih Stratejisi', label: 'Ölü tercih ve sıralama boşluğu denetiminden tam puan al' },
  { id: 'rm_de_lang', group: 'Yurt Dışı (DE/IT)', label: 'Dil sınavı hedefini belirle (TestDaF / Goethe / IELTS)' },
  { id: 'rm_de_docs', group: 'Yurt Dışı (DE/IT)', label: 'Lise transkripti, pasaport ve apostil evrak listesini hazırla' },
  { id: 'rm_it_tolc', group: 'Yurt Dışı (DE/IT)', label: 'TOLC-I / CENT-S denemeleri ve DSU gelir belgesi takvimini kur' },
];

export function getDaysUntil(dateIso) {
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const [y, m, d] = String(dateIso).split('-').map(Number);
  if (!y || !m || !d) return 0;
  const targetUtc = Date.UTC(y, m - 1, d);
  return Math.ceil((targetUtc - todayUtc) / 86400000);
}

export function renderRoadmapPanelHtml(state) {
  const checks = state.roadmapChecks || {};
  const custom = Array.isArray(state.customMilestones) ? state.customMilestones : [];

  const doneCount = ROADMAP_CHECKLIST_ITEMS.filter((it) => checks[it.id]).length + custom.filter((c) => c.done).length;
  const totalCount = ROADMAP_CHECKLIST_ITEMS.length + custom.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;

  const countdownCards = ROADMAP_EVENTS.map((ev) => {
    const days = getDaysUntil(ev.dateIso);
    const weeks = Math.max(0, Math.floor(days / 7));
    const dateLabel = new Date(`${ev.dateIso}T12:00:00`).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return `
      <div class="roadmap-countdown-card" style="--rm-accent:${ev.accent};">
        <div class="roadmap-cd-top">
          <span class="roadmap-cd-badge">${escapeHtml(ev.badge)}</span>
          <span class="roadmap-cd-date">${escapeHtml(dateLabel)}</span>
        </div>
        <div class="roadmap-cd-days tabular">${days > 0 ? `${days}` : 'Bugün'}<span>${days > 0 ? 'gün' : ''}</span></div>
        <div class="roadmap-cd-title">${escapeHtml(ev.title)}</div>
        <div class="roadmap-cd-sub">${escapeHtml(ev.subtitle)} · ~${weeks} hafta</div>
      </div>`;
  }).join('');

  const grouped = new Map();
  for (const item of ROADMAP_CHECKLIST_ITEMS) {
    if (!grouped.has(item.group)) grouped.set(item.group, []);
    grouped.get(item.group).push(item);
  }

  const groupsHtml = [...grouped.entries()]
    .map(
      ([groupName, items]) => `
      <div class="roadmap-group">
        <div class="roadmap-group-title">${escapeHtml(groupName)}</div>
        <div class="roadmap-list">
          ${items
            .map(
              (it) => `
            <label class="roadmap-check-row ${checks[it.id] ? 'done' : ''}">
              <input type="checkbox" data-roadmap-check="${escapeHtml(it.id)}" ${checks[it.id] ? 'checked' : ''} />
              <span>${escapeHtml(it.label)}</span>
            </label>`,
            )
            .join('')}
        </div>
      </div>`,
    )
    .join('');

  const customHtml = custom
    .map(
      (c) => `
      <div class="roadmap-check-row ${c.done ? 'done' : ''}">
        <label style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer;">
          <input type="checkbox" data-custom-milestone-toggle="${escapeHtml(c.id)}" ${c.done ? 'checked' : ''} />
          <span>${escapeHtml(c.text)}${c.date ? ` <em style="color:var(--text-tertiary);font-style:normal;font-size:12px;">(${escapeHtml(c.date)})</em>` : ''}</span>
        </label>
        <button class="btn btn-ghost btn-sm" type="button" data-custom-milestone-del="${escapeHtml(c.id)}" title="Sil" style="padding:2px 7px;min-height:24px;">✕</button>
      </div>`,
    )
    .join('');

  return `
    <div class="roadmap-wrap">
      <div class="roadmap-countdown-grid">${countdownCards}</div>

      <div class="health-card" style="margin-top:16px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
          <div>
            <h3 style="margin:0;font-size:17px;">YKS 2027 & Başvuru Yol Haritası</h3>
            <p class="subtitle" style="margin:3px 0 0;">Tüm cihazlarında Firebase üzerinden anlık eşitlenir.</p>
          </div>
          <div class="roadmap-progress-pill tabular">${doneCount} / ${totalCount} tamamlandı (%${pct})</div>
        </div>

        <div class="roadmap-progress-bar">
          <div class="roadmap-progress-fill" style="width:${pct}%;"></div>
        </div>

        <div class="roadmap-groups-grid" style="margin-top:16px;">
          ${groupsHtml}
        </div>

        <div class="roadmap-group" style="margin-top:16px;">
          <div class="roadmap-group-title">Kişisel Hedeflerim & Tarihler</div>
          <div class="roadmap-list" style="margin-bottom:10px;">
            ${customHtml || '<div style="font-size:12.5px;color:var(--text-tertiary);padding:6px 2px;">Henüz kişisel hedef eklemedin — kampüs gezisi veya sınav tarihini aşağıdan ekleyebilirsin.</div>'}
          </div>
          <div class="roadmap-add-row">
            <input type="text" id="customMilestoneText" class="input" placeholder="Örn: İTÜ Ayazağa kampüs gezisi veya IELTS kaydı..." style="flex:1;min-width:180px;" />
            <input type="date" id="customMilestoneDate" class="input" style="width:155px;" />
            <button type="button" class="btn btn-primary btn-sm" id="addCustomMilestoneBtn">+ Ekle</button>
          </div>
        </div>
      </div>
    </div>`;
}

// ============================================================================
// 3. Apple Keynote-Grade PNG Summary Card Exporter (1080 × 1350)
// ============================================================================
function drawRoundedRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function truncateText(ctx, text, maxWidth) {
  const str = String(text || '');
  if (ctx.measureText(str).width <= maxWidth) return str;
  let out = str;
  while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

function loadImageSafe(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function exportSummaryPngCard({
  scenarioName = 'Ana Tercih Listem',
  programs = [],
  targetRank = null,
  health = null,
  simResult = null,
  isDark = false,
  accentHex = '#0071E3',
} = {}) {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas oluşturulamadı');

  // Background gradient (Apple Keynote Light / Dark)
  const bg = ctx.createLinearGradient(0, 0, W, H);
  if (isDark) {
    bg.addColorStop(0, '#0B0C10');
    bg.addColorStop(0.55, '#121520');
    bg.addColorStop(1, '#090A0E');
  } else {
    bg.addColorStop(0, '#F5F7FB');
    bg.addColorStop(0.55, '#EEF2F9');
    bg.addColorStop(1, '#F8F9FC');
  }
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle ambient accent halo top-right
  const halo = ctx.createRadialGradient(W * 0.85, 110, 20, W * 0.85, 110, 480);
  halo.addColorStop(0, isDark ? 'rgba(10, 132, 255, 0.24)' : 'rgba(0, 113, 227, 0.13)');
  halo.addColorStop(1, 'rgba(0, 113, 227, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, 620);

  const textPrimary = isDark ? '#F5F5F7' : '#1D1D1F';
  const textSecondary = isDark ? '#A1A1A6' : '#6E6E73';
  const cardBg = isDark ? 'rgba(28, 28, 32, 0.88)' : 'rgba(255, 255, 255, 0.90)';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.11)' : 'rgba(15, 23, 42, 0.08)';
  const fontStack = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';

  // Top Header
  const appLogo = await loadImageSafe('./icon-192.png?v=13');
  if (appLogo) {
    ctx.save();
    drawRoundedRect(ctx, 64, 56, 56, 56, 14);
    ctx.clip();
    ctx.drawImage(appLogo, 64, 56, 56, 56);
    ctx.restore();
  }

  ctx.fillStyle = textPrimary;
  ctx.font = `700 32px ${fontStack}`;
  ctx.fillText('TercihAtlas', 136, 84);
  ctx.fillStyle = textSecondary;
  ctx.font = `500 18px ${fontStack}`;
  const dateStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  ctx.fillText(`YKS 2027 · ${scenarioName} · ${dateStr}`, 136, 110);

  // KPI Pill Strip
  const kpis = [
    { label: 'TERCİH SAYISI', value: `${programs.length} / 24`, color: accentHex },
    { label: 'HEDEF SIRALAMA', value: targetRank ? formatRank(targetRank) : '—', color: '#34C759' },
    { label: 'SAĞLIK SKORU', value: health ? `${health.score} / 100` : '—', color: '#FF9F0A' },
  ];
  const kpiY = 148;
  const kpiW = (W - 128 - 32) / 3;
  kpis.forEach((k, idx) => {
    const x = 64 + idx * (kpiW + 16);
    drawRoundedRect(ctx, x, kpiY, kpiW, 96, 22);
    ctx.fillStyle = cardBg;
    ctx.fill();
    ctx.strokeStyle = cardBorder;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = textSecondary;
    ctx.font = `700 13px ${fontStack}`;
    ctx.fillText(k.label, x + 22, kpiY + 34);

    ctx.fillStyle = textPrimary;
    ctx.font = `700 30px ${fontStack}`;
    ctx.fillText(k.value, x + 22, kpiY + 72);
  });

  // ÖSYM Placement Simulation Banner (if available)
  let listStartY = 272;
  if (simResult) {
    drawRoundedRect(ctx, 64, listStartY, W - 128, 92, 22);
    ctx.fillStyle = isDark ? 'rgba(48, 209, 88, 0.14)' : 'rgba(52, 199, 89, 0.12)';
    ctx.fill();
    ctx.strokeStyle = isDark ? 'rgba(48, 209, 88, 0.35)' : 'rgba(40, 167, 69, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const win = simResult.winner || simResult.borderlineWinner;
    ctx.fillStyle = isDark ? '#30D158' : '#1E8E3E';
    ctx.font = `700 14px ${fontStack}`;
    ctx.fillText(`ÖSYM SİMÜLASYON SONUCU (SIRALAMA: ${formatRank(simResult.actualRank)})`, 88, listStartY + 34);

    ctx.fillStyle = textPrimary;
    ctx.font = `700 22px ${fontStack}`;
    const verdict = win
      ? `#${String(win.order).padStart(2, '0')} · ${win.program.university} — ${win.program.department} (${win.label})`
      : 'Bu sıralama ile açıkta kalma riski bulunuyor — alt güvenlik tercihi önerilir.';
    ctx.fillText(truncateText(ctx, verdict, W - 176), 88, listStartY + 68);
    listStartY += 116;
  }

  // Top 10 Preferences Container
  const topList = programs.slice(0, 10);
  const rowH = 80;
  const containerH = Math.max(180, topList.length * rowH + 62);
  drawRoundedRect(ctx, 64, listStartY, W - 128, Math.min(containerH, H - listStartY - 82), 26);
  ctx.fillStyle = cardBg;
  ctx.fill();
  ctx.strokeStyle = cardBorder;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = textSecondary;
  ctx.font = `700 14px ${fontStack}`;
  ctx.fillText(`ÖNCELİKLİ TERCİH SIRALAMASI (İLK ${topList.length})`, 92, listStartY + 38);

  // Preload bundled university logos in parallel
  const logoImgs = await Promise.all(
    topList.map((p) => (p.universityId ? loadImageSafe(`./logos/${p.universityId}.png`) : Promise.resolve(null))),
  );

  const medalStyles = [
    { bg: '#FFD60A', fg: '#5C4200' },
    { bg: '#E5E5EA', fg: '#3A3A3C' },
    { bg: '#E2A878', fg: '#4D2B12' },
  ];

  topList.forEach((p, i) => {
    const ry = listStartY + 54 + i * rowH;
    if (ry + rowH > H - 72) return;

    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(92, ry);
      ctx.lineTo(W - 92, ry);
      ctx.strokeStyle = cardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Order Pill (#01..#10 with Gold/Silver/Bronze)
    const mStyle = medalStyles[i] || {
      bg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      fg: textSecondary,
    };
    drawRoundedRect(ctx, 92, ry + 20, 48, 36, 12);
    ctx.fillStyle = mStyle.bg;
    ctx.fill();
    ctx.fillStyle = mStyle.fg;
    ctx.font = `700 16px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.fillText(`#${String(i + 1).padStart(2, '0')}`, 116, ry + 44);
    ctx.textAlign = 'left';

    // Uni logo
    const logo = logoImgs[i];
    if (logo) {
      ctx.save();
      drawRoundedRect(ctx, 152, ry + 16, 44, 44, 11);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.clip();
      ctx.drawImage(logo, 154, ry + 18, 40, 40);
      ctx.restore();
    }

    const textX = logo ? 210 : 154;
    ctx.fillStyle = textPrimary;
    ctx.font = `600 20px ${fontStack}`;
    ctx.fillText(truncateText(ctx, p.department, 510), textX, ry + 35);

    ctx.fillStyle = textSecondary;
    ctx.font = `500 15px ${fontStack}`;
    ctx.fillText(truncateText(ctx, `${p.university} · ${p.city || ''} · ${p.language || ''}`, 510), textX, ry + 59);

    // Right side: Rank + Risk Pill
    ctx.textAlign = 'right';
    ctx.fillStyle = textPrimary;
    ctx.font = `700 20px ${fontStack}`;
    ctx.fillText(p.latestRank ? formatRank(p.latestRank) : '—', W - 92, ry + 36);

    const riskInfo = RISK_META[p.risk] || { label: 'Hedef' };
    const riskColor =
      p.risk === 'hayal' ? '#FF375F' : p.risk === 'guvenli' ? '#28A745' : '#0071E3';
    ctx.fillStyle = riskColor;
    ctx.font = `600 14px ${fontStack}`;
    ctx.fillText(riskInfo.label, W - 92, ry + 58);
    ctx.textAlign = 'left';
  });

  // Footer
  ctx.fillStyle = textSecondary;
  ctx.font = `500 16px ${fontStack}`;
  ctx.fillText('TercihAtlas · YKS 2027 Kişisel Tercih Rehberi', 64, H - 36);
  ctx.textAlign = 'right';
  ctx.fillText('yusufselimeryigit-bit.github.io/tercihatlas', W - 64, H - 36);
  ctx.textAlign = 'left';

  // Export PNG blob (prefer native Share Sheet on mobile/iPad if available, else direct download)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
  if (!blob) throw new Error('PNG üretilemedi');

  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `TercihAtlas-Ozet-${stamp}.png`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return fileName;
}
