/**
 * TercihAtlas — Interactive Apple Maps-Style Turkey Campus Map,
 * 4-Year Cost Calculator (TR + DE/IT) & YKS 2027 Timeline (.ics Export)
 */

import { escapeHtml, formatRank, formatCurrency } from './utils.js';

// Normalized coordinates on viewBox="0 0 1000 440" covering Turkey (lon 25.8..44.8, lat 35.8..42.2)
const CITY_COORDS = {
  EDİRNE: [54, 48],
  KIRKLARELİ: [86, 40],
  TEKİRDAĞ: [90, 74],
  İSTANBUL: [152, 74],
  ÇANAKKALE: [58, 128],
  KOCAELİ: [195, 92],
  YALOVA: [168, 108],
  SAKARYA: [224, 96],
  BURSA: [162, 134],
  BALIKESİR: [108, 152],
  BİLECİK: [206, 136],
  DÜZCE: [256, 90],
  BOLU: [282, 100],
  ZONGULDAK: [272, 62],
  BARTIN: [298, 52],
  KARABÜK: [314, 76],
  KASTAMONU: [364, 58],
  SİNOP: [428, 38],
  ÇANKIRI: [358, 114],
  ANKARA: [338, 154],
  ESKİŞEHİR: [238, 166],
  KÜTAHYA: [184, 184],
  MANİSA: [98, 214],
  İZMİR: [78, 234],
  UŞAK: [164, 224],
  AFYONKARAHİSAR: [226, 226],
  AYDIN: [110, 274],
  DENİZLİ: [162, 272],
  MUĞLA: [130, 314],
  BURDUR: [216, 286],
  ISPARTA: [240, 272],
  ANTALYA: [244, 332],
  KONYA: [322, 268],
  KARAMAN: [356, 318],
  AKSARAY: [388, 232],
  KIRIKKALE: [374, 154],
  KIRŞEHİR: [396, 188],
  NEVŞEHİR: [420, 214],
  NİĞDE: [426, 260],
  MERSİN: [406, 336],
  ADANA: [466, 312],
  OSMANİYE: [506, 308],
  HATAY: [502, 374],
  GAZİANTEP: [560, 326],
  KİLİS: [550, 356],
  KAHRAMANMARAŞ: [540, 274],
  KAYSERİ: [472, 218],
  YOZGAT: [436, 154],
  ÇORUM: [424, 108],
  AMASYA: [468, 96],
  SAMSUN: [496, 62],
  TOKAT: [506, 118],
  ORDU: [560, 74],
  GİRESUN: [596, 82],
  SİVAS: [544, 162],
  TRABZON: [648, 78],
  GÜMÜŞHANE: [634, 114],
  BAYBURT: [676, 118],
  RİZE: [692, 74],
  ARTVİN: [744, 66],
  ERZİNCAN: [634, 160],
  TUNCELİ: [636, 198],
  MALATYA: [586, 232],
  ELAZIĞ: [636, 224],
  ADIYAMAN: [596, 278],
  ŞANLIURFA: [626, 324],
  DİYARBAKIR: [686, 268],
  BİNGÖL: [694, 210],
  ERZURUM: [734, 146],
  ARDAHAN: [792, 72],
  KARS: [816, 108],
  IĞDIR: [866, 146],
  AĞRI: [818, 164],
  MUŞ: [744, 214],
  BİTLİS: [774, 236],
  BATMAN: [730, 268],
  MARDİN: [718, 314],
  SİİRT: [766, 268],
  ŞIRNAK: [786, 298],
  VAN: [834, 240],
  HAKKARİ: [868, 298],
  LEFKOŞA: [368, 412],
  GAZİMAĞUSA: [398, 410],
  GİRNE: [366, 396],
};

function normalizeCityKey(city) {
  return String(city || '')
    .trim()
    .toLocaleUpperCase('tr');
}

// Clean stylized Turkey landmass silhouette (Apple Maps minimal vector style)
const TURKEY_SILHOUETTE_PATH =
  'M 42 52 L 96 34 L 146 64 L 222 80 L 298 44 L 424 30 L 538 66 L 680 68 L 764 56 L 828 96 L 882 146 L 870 218 L 892 294 L 842 326 L 758 312 L 664 338 L 570 348 L 516 382 L 484 358 L 456 324 L 388 358 L 314 348 L 242 346 L 170 330 L 106 322 L 70 264 L 58 206 L 44 134 L 78 110 L 66 78 Z';

export function renderTurkeyCampusMap(programs, selectedCity = null) {
  const byCity = new Map();
  for (const p of programs) {
    const key = normalizeCityKey(p.city);
    if (!key) continue;
    if (!byCity.has(key)) byCity.set(key, []);
    byCity.get(key).push(p);
  }

  const pins = [];
  for (const [city, list] of byCity.entries()) {
    const coords = CITY_COORDS[city];
    if (!coords) continue;
    const [x, y] = coords;
    const active = selectedCity === city;
    const r = Math.min(20, 11 + list.length * 1.8);
    pins.push(`
      <g class="map-pin ${active ? 'active' : ''}" data-map-city="${escapeHtml(city)}" style="cursor:pointer;">
        <circle cx="${x}" cy="${y}" r="${r + 7}" fill="var(--accent)" fill-opacity="${active ? '0.26' : '0.12'}"/>
        <circle cx="${x}" cy="${y}" r="${r}" fill="${active ? 'var(--rose)' : 'var(--accent)'}" stroke="var(--surface)" stroke-width="2.5"/>
        <text x="${x}" y="${y + 4}" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="700" font-family="var(--font-sans)">${list.length}</text>
        <text x="${x}" y="${y - r - 6}" text-anchor="middle" class="map-city-label">${escapeHtml(city)}</text>
      </g>
    `);
  }

  const cityPrograms = selectedCity ? byCity.get(selectedCity) || [] : [];

  return `
    <div class="panel panel-full">
      <div class="panel-title">
        <span>Türkiye Kampüs Haritası</span>
        <span style="font-size:12.5px;font-weight:500;color:var(--text-tertiary)">${byCity.size} farklı şehir · Detay için bir şehre dokun</span>
      </div>
      <div class="map-stage">
        <svg viewBox="0 0 940 420" width="100%" class="turkey-svg" role="img" aria-label="Türkiye kampüs haritası">
          <path d="${TURKEY_SILHOUETTE_PATH}" class="turkey-land"/>
          <!-- Cyprus outline -->
          <path d="M 332 406 L 392 396 L 418 408 L 366 420 Z" class="turkey-land"/>
          ${pins.join('')}
        </svg>
      </div>
      ${selectedCity
        ? `<div style="margin-top:16px;padding-top:16px;border-top:0.5px solid var(--separator-subtle);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <strong style="font-size:15px;">${escapeHtml(selectedCity)} (${cityPrograms.length} program)</strong>
              <button class="btn btn-sm btn-ghost" id="clearMapCityBtn">Seçimi Kaldır</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:10px;">
              ${cityPrograms
                .map(
                  (p) => `<button class="sample-tile" data-open-code="${escapeHtml(p.code)}" style="background:var(--surface-secondary);">
                    <strong>${escapeHtml(p.department)}</strong>
                    <span>${escapeHtml(p.university)} · Sıra: ${formatRank(p.latestRank)}</span>
                  </button>`,
                )
                .join('')}
            </div>
          </div>`
        : ''}
    </div>
  `;
}

// ============================================================================
// 4-Year Education & Living Cost Calculator (TR + Germany / Italy)
// ============================================================================
export function renderCostCalculator(programs, abroadPrograms, costSettings) {
  const cfg = {
    eurTry: 39,
    monthlyIstanbul: 22000,
    monthlyMetro: 17000, // Ankara, İzmir
    monthlyOther: 13000,
    monthsPerYear: 9,
    ...(costSettings || {}),
  };

  const getMonthlyForCity = (city) => {
    const c = normalizeCityKey(city);
    if (c === 'İSTANBUL') return cfg.monthlyIstanbul;
    if (c === 'ANKARA' || c === 'İZMİR') return cfg.monthlyMetro;
    return cfg.monthlyOther;
  };

  const trRows = programs.map((p) => {
    const years = p.durationYears || 4;
    const annualTuition = p.tuition || 0;
    const annualLiving = getMonthlyForCity(p.city) * cfg.monthsPerYear;
    const totalAnnual = annualTuition + annualLiving;
    const totalDegree = totalAnnual * years;
    return { p, years, annualTuition, annualLiving, totalAnnual, totalDegree };
  });

  // Germany Bloke Hesap: €11,904/year + ~€640/year semester fee
  const deAnnualEur = 11904 + 640;
  const deTotalTry = Math.round(deAnnualEur * 3 * cfg.eurTry); // 3-year B.Sc. in Germany

  // Italy: DSU Scholarship (~€0 tuition + free/subsidized dorm + €3,000-5,000 living net) vs self-funded (~€9,500/yr)
  const itDsuAnnualEur = 3200;
  const itFullAnnualEur = 10500;

  return `
    <div class="panel panel-full">
      <div class="panel-title">
        <span>4 Yıllık Eğitim & Yaşam Maliyeti Hesaplayıcısı</span>
        <span style="font-size:12.5px;font-weight:500;color:var(--text-tertiary)">Vakıf ücretleri + şehir yurt/yaşam + Avrupa kıyaslaması</span>
      </div>

      <div class="cost-controls">
        <div>
          <label class="field-label" for="costIst">İstanbul Aylık (₺)</label>
          <input id="costIst" class="input tabular" type="number" step="1000" value="${cfg.monthlyIstanbul}" />
        </div>
        <div>
          <label class="field-label" for="costMetro">Ankara / İzmir Aylık (₺)</label>
          <input id="costMetro" class="input tabular" type="number" step="1000" value="${cfg.monthlyMetro}" />
        </div>
        <div>
          <label class="field-label" for="costOther">Diğer Şehirler Aylık (₺)</label>
          <input id="costOther" class="input tabular" type="number" step="1000" value="${cfg.monthlyOther}" />
        </div>
        <div>
          <label class="field-label" for="costEur">EUR / TRY Kuru</label>
          <input id="costEur" class="input tabular" type="number" step="0.5" value="${cfg.eurTry}" />
        </div>
      </div>

      ${trRows.length
        ? `<div class="table-wrap" style="margin-top:16px;box-shadow:none;border:0.5px solid var(--separator-subtle);">
            <table class="prog-table" style="min-width:680px;">
              <thead>
                <tr>
                  <th>Üniversite & Bölüm</th>
                  <th>Şehir / Burs</th>
                  <th>Yıllık Okul Ücreti</th>
                  <th>Yıllık Yaşam (${cfg.monthsPerYear} ay)</th>
                  <th>Toplam (${trRows[0].years} Yıl)</th>
                </tr>
              </thead>
              <tbody class="tabular">
                ${trRows
                  .map(
                    (r) => `<tr data-open-code="${escapeHtml(r.p.code)}">
                      <td><strong>${escapeHtml(r.p.department)}</strong><div style="font-size:12px;color:var(--text-secondary);">${escapeHtml(r.p.university)}</div></td>
                      <td>${escapeHtml(r.p.city)} · ${escapeHtml(r.p.scholarship)}</td>
                      <td>${r.annualTuition ? formatCurrency(r.annualTuition) : '<span style="color:var(--green);font-weight:600;">Ücretsiz</span>'}</td>
                      <td>${formatCurrency(r.annualLiving)}</td>
                      <td style="font-weight:700;">${formatCurrency(r.totalDegree)}</td>
                    </tr>`,
                  )
                  .join('')}
              </tbody>
            </table>
          </div>`
        : `<div class="chart-empty" style="margin-top:14px;">Türkiye listene program eklediğinde yıllık ve 4 yıllık toplam maliyet tablosu burada hesaplanır.</div>`}

      <div class="abroad-grid" style="margin-top:18px;">
        <div class="abroad-card" style="background:var(--surface-secondary);box-shadow:none;">
          <h3>🇩🇪 Almanya Referans Maliyeti (3 Yıl Lisans)</h3>
          <div class="tabular" style="font-family:var(--font-display);font-size:22px;font-weight:700;">~€${(deAnnualEur * 3).toLocaleString('tr-TR')} <span style="font-size:13px;font-weight:500;color:var(--text-secondary)">(≈ ${formatCurrency(deTotalTry)})</span></div>
          <p>Devlet üniversiteleri çoğu eyalette harçsızdır (~€320/dönem). Vize için yıllık <strong>€11.904 Bloke Hesap</strong> gerekir; yarı zamanlı öğrenci çalışmasıyla (Werkstudent) masrafın büyük kısmı karşılanabilir.</p>
        </div>
        <div class="abroad-card" style="background:var(--surface-secondary);box-shadow:none;">
          <h3>🇮🇹 İtalya Referans Maliyeti (3 Yıl Lisans)</h3>
          <div class="tabular" style="font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--green);">DSU ile ~€${(itDsuAnnualEur * 3).toLocaleString('tr-TR')} <span style="font-size:13px;font-weight:500;color:var(--text-secondary)">· Burssuz ~€${(itFullAnnualEur * 3).toLocaleString('tr-TR')}</span></div>
          <p><strong>DSU / ISEE Bursu</strong> çıktığında okul harcı €0 olur, yemek/yurt desteği ve yıllık cep harçlığı sağlanır (${abroadPrograms.filter((x) => x.country === 'IT').length} İtalya programın kayıtlı).</p>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// YKS 2027 & Europe Application Timeline + Apple Calendar (.ics) Export
// ============================================================================
export function buildTimelineEvents(abroadPrograms = []) {
  const baseEvents = [
    {
      id: 'yks-basvuru',
      date: '2027-02-12',
      title: 'YKS 2027 Başvuru Dönemi (Tahmini)',
      category: 'TR · ÖSYM',
      tone: 'accent',
      desc: 'ÖSYM AİS üzerinden TYT / AYT / YDT başvurularının yapılması.',
    },
    {
      id: 'yks-sinav',
      date: '2027-06-19',
      title: 'YKS 2027 Sınav Hafta Sonu (TYT & AYT)',
      category: 'TR · ÖSYM',
      tone: 'rose',
      desc: 'Cumartesi TYT, Pazar AYT & YDT oturumları (tahmini Haziran 3. hafta sonu).',
    },
    {
      id: 'yks-sonuc',
      date: '2027-07-20',
      title: 'YKS 2027 Sonuçlarının Açıklanması (Tahmini)',
      category: 'TR · ÖSYM',
      tone: 'amber',
      desc: 'Sıralamaların kesinleşmesi ve TercihAtlas senaryolarının final haline getirilmesi.',
    },
    {
      id: 'yks-tercih',
      date: '2027-07-29',
      title: 'ÖSYM Tercih Dönemi Başlangıcı (Tahmini)',
      category: 'TR · ÖSYM',
      tone: 'green',
      desc: 'TercihAtlas ÖSYM AİS Kopyalama Asistanı ile 24 tercihin girilmesi.',
    },
  ];

  const abroadEvents = (abroadPrograms || [])
    .filter((p) => p.deadline)
    .map((p) => ({
      id: `ab-${p.id}`,
      date: p.deadline,
      title: `${p.university} — Son Başvuru (${p.department})`,
      category: p.country === 'DE' ? 'Almanya · DE' : p.country === 'IT' ? 'İtalya · IT' : 'Avrupa',
      tone: 'accent',
      desc: [p.portal, p.admissionReq, p.languageReq].filter(Boolean).join(' · '),
    }));

  return [...baseEvents, ...abroadEvents].sort((a, b) => a.date.localeCompare(b.date));
}

export function renderTimelineView(abroadPrograms = []) {
  const events = buildTimelineEvents(abroadPrograms);

  const daysUntil = (iso) => {
    const diff = Math.ceil((new Date(`${iso}T10:00:00`).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Geçti';
    if (diff === 0) return 'Bugün';
    return `${diff} gün kaldı`;
  };

  return `
    <div class="panel panel-full">
      <div class="panel-title">
        <span>YKS 2027 & Avrupa Başvuru Zaman Çizelgesi</span>
        <button class="btn btn-primary btn-sm" id="exportIcsBtn">Apple Takvim'e Aktar (.ics)</button>
      </div>
      <div class="timeline-list">
        ${events
          .map((ev) => {
            const dStr = new Date(`${ev.date}T12:00:00`).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });
            return `<div class="timeline-item">
              <div class="timeline-dot" style="background:var(--${ev.tone})"></div>
              <div class="timeline-card">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <span class="pill" style="background:var(--${ev.tone}-soft);color:var(--${ev.tone});">${escapeHtml(ev.category)}</span>
                    <strong style="font-size:14.5px;">${escapeHtml(ev.title)}</strong>
                  </div>
                  <span class="pill tabular" style="font-weight:650;">${escapeHtml(dStr)} · ${escapeHtml(daysUntil(ev.date))}</span>
                </div>
                ${ev.desc ? `<div style="font-size:12.5px;color:var(--text-secondary);margin-top:5px;">${escapeHtml(ev.desc)}</div>` : ''}
              </div>
            </div>`;
          })
          .join('')}
      </div>
    </div>
  `;
}

export function downloadTimelineIcs(abroadPrograms = []) {
  const events = buildTimelineEvents(abroadPrograms);
  const esc = (s) => String(s || '').replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TercihAtlas//YKS 2027 Takvim//TR',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:TercihAtlas YKS 2027',
  ];

  for (const ev of events) {
    const dt = ev.date.replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.id}@tercihatlas`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${dt}`,
      `SUMMARY:${esc(ev.title)}`,
      `DESCRIPTION:${esc(`${ev.category} — ${ev.desc}`)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'TercihAtlas_YKS2027_Takvim.ics';
  a.click();
  URL.revokeObjectURL(url);
}
