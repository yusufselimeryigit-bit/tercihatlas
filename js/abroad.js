/**
 * TercihAtlas — Phase 2 Live Module: Germany & Italy University Tracker
 * Fully synced via the same Personal Key Cloud Sync state.
 */

import { escapeHtml } from './utils.js';

export const ABROAD_STATUS_META = {
  researching: { label: 'Araştırılıyor', color: 'var(--text-secondary)', bg: 'var(--bg-grouped)' },
  preparing: { label: 'Evrak Hazırlanıyor', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  applied: { label: 'Başvuruldu', color: 'var(--accent)', bg: 'var(--accent-soft)' },
  accepted: { label: 'Kabul Alındı', color: 'var(--green)', bg: 'var(--green-soft)' },
};

export const ABROAD_COUNTRIES = {
  DE: { label: 'Almanya', flag: '🇩🇪', badge: 'DE' },
  IT: { label: 'İtalya', flag: '🇮🇹', badge: 'IT' },
  OTHER: { label: 'Diğer Avrupa', flag: '🇪🇺', badge: 'EU' },
};

export const ABROAD_PRESETS = [
  {
    country: 'DE',
    university: 'Technical University of Munich (TUM)',
    department: 'B.Sc. Informatics / Information Engineering',
    city: 'Münih',
    language: 'Almanca / İngilizce',
    admissionReq: 'YKS 4 yıllık yerleştirme + VPD (Uni-Assist)',
    languageReq: 'TestDaF 4x4 / Goethe C1 veya IELTS 6.5',
    tuition: '€2.000–3.000 / dönem (AB dışı) · Muafiyet/Burs mevcut',
    portal: 'TUMonline + Uni-Assist',
    deadline: '2027-07-15',
    url: 'https://www.tum.de/en/studies/degree-programs',
  },
  {
    country: 'DE',
    university: 'RWTH Aachen University',
    department: 'B.Sc. Informatik (Computer Science)',
    city: 'Aachen',
    language: 'Almanca',
    admissionReq: 'YKS yerleştirme + NC / TestAS',
    languageReq: 'TestDaF 4x4 / DSH-2 / Goethe C1',
    tuition: '~€320 / dönem (Harçsız · Sadece dönem katkısı)',
    portal: 'RWTHonline',
    deadline: '2027-07-15',
    url: 'https://www.rwth-aachen.de',
  },
  {
    country: 'DE',
    university: 'Karlsruhe Institute of Technology (KIT)',
    department: 'B.Sc. Mechanical Engineering (International)',
    city: 'Karlsruhe',
    language: 'İngilizce',
    admissionReq: 'YKS yerleştirme + SAT (min. 1200)',
    languageReq: 'IELTS 6.5 / TOEFL 90',
    tuition: '€1.500 / dönem (Baden-Württemberg)',
    portal: 'KIT CBS / Carl Benz School',
    deadline: '2027-04-30',
    url: 'https://www.kit.edu',
  },
  {
    country: 'IT',
    university: 'Politecnico di Milano',
    department: 'B.Sc. Computer Science and Engineering',
    city: 'Milano',
    language: 'İtalyanca / İngilizce (Seçili programlar)',
    admissionReq: 'TOL-I / SAT + YKS baraj/yerleştirme',
    languageReq: 'IELTS 6.0 / TOLC',
    tuition: '€900 – €3.898 / yıl (DSU/ISEE bursuyla €0)',
    portal: 'PoliMi Online + Universitaly',
    deadline: '2027-05-20',
    url: 'https://www.polimi.it/en',
  },
  {
    country: 'IT',
    university: 'Politecnico di Torino',
    department: 'B.Sc. Computer Engineering (English)',
    city: 'Torino',
    language: 'İngilizce',
    admissionReq: 'TIL-I veya SAT (min. 1040+)',
    languageReq: 'IELTS 5.5+ / B2',
    tuition: '€160 – €2.600 / yıl (EDISU bursuyla ücretsiz + yurt)',
    portal: 'Apply@PoliTo + Universitaly',
    deadline: '2027-04-15',
    url: 'https://www.polito.it/en',
  },
  {
    country: 'IT',
    university: 'Sapienza University of Rome',
    department: 'B.Sc. Applied Computer Science and AI',
    city: 'Roma',
    language: 'İngilizce',
    admissionReq: 'English TOLC-I veya SAT',
    languageReq: 'IELTS 5.5+ / B2',
    tuition: '€1.000 / yıl (LAZIOdisco DSU bursu mevcut)',
    portal: 'Infostud + Universitaly',
    deadline: '2027-05-15',
    url: 'https://www.uniroma1.it/en',
  },
];

export const ABROAD_CHECKLIST_ITEMS = [
  { key: 'transcript', label: 'Transkript & Diploma' },
  { key: 'language', label: 'Dil Belgesi (IELTS / TestDaF)' },
  { key: 'exam', label: 'Sınav (TOLC / SAT / TestAS)' },
  { key: 'visa', label: 'Vize / Bloke Hesap / DSU' },
];

export function formatDeadlineCountdown(isoDate) {
  if (!isoDate) return null;
  const target = new Date(`${isoDate}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  const diffDays = Math.ceil((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { text: 'Son tarih geçti', tone: 'rose', days: diffDays };
  if (diffDays <= 30) return { text: `${diffDays} gün kaldı`, tone: 'rose', days: diffDays };
  if (diffDays <= 90) return { text: `${diffDays} gün kaldı`, tone: 'amber', days: diffDays };
  return { text: `${diffDays} gün kaldı`, tone: 'accent', days: diffDays };
}

export function createAbroadRecord(data) {
  return {
    id: data.id || `ab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    country: data.country || 'DE',
    university: String(data.university || '').trim(),
    department: String(data.department || '').trim(),
    city: String(data.city || '').trim(),
    language: String(data.language || 'İngilizce').trim(),
    admissionReq: String(data.admissionReq || '').trim(),
    languageReq: String(data.languageReq || '').trim(),
    tuition: String(data.tuition || '').trim(),
    portal: String(data.portal || '').trim(),
    deadline: String(data.deadline || '').trim(),
    url: String(data.url || '').trim(),
    status: data.status || 'researching',
    notes: String(data.notes || '').trim(),
    checklist: {
      transcript: false,
      language: false,
      exam: false,
      visa: false,
      ...(data.checklist || {}),
    },
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

export function renderAbroadView(abroadPrograms, activeFilter = 'ALL') {
  const list = activeFilter === 'ALL' ? abroadPrograms : abroadPrograms.filter((p) => p.country === activeFilter);
  const deCount = abroadPrograms.filter((p) => p.country === 'DE').length;
  const itCount = abroadPrograms.filter((p) => p.country === 'IT').length;
  const appliedCount = abroadPrograms.filter((p) => p.status === 'applied' || p.status === 'accepted').length;

  const headerHtml = `<div class="page-header">
    <div>
      <div class="page-eyebrow">Avrupa Lisans Başvuruları</div>
      <h1 class="page-title">Yurt Dışı</h1>
      <p class="page-subtitle">Almanya & İtalya üniversiteleri, dil/sınav şartları, burs ve son başvuru geri sayımları</p>
    </div>
    <button class="btn btn-primary" id="openAbroadAddBtn">+ Yurt Dışı Program Ekle</button>
  </div>`;

  const kpiHtml = `<section class="kpi-strip">
    <div class="kpi-card">
      <div class="kpi-head"><span class="kpi-label">Toplam Program</span></div>
      <div class="kpi-value tabular">${abroadPrograms.length}</div>
      <div class="kpi-sub">Bulutta otomatik eşitlenir</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-head"><span class="kpi-label">Almanya (DE)</span></div>
      <div class="kpi-value tabular">${deCount}</div>
      <div class="kpi-sub">Uni-Assist · TestDaF / Goethe / IELTS</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-head"><span class="kpi-label">İtalya (IT)</span></div>
      <div class="kpi-value tabular">${itCount}</div>
      <div class="kpi-sub">TOLC / SAT · DSU Bursu · Universitaly</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-head"><span class="kpi-label">Başvurulan / Kabul</span></div>
      <div class="kpi-value tabular">${appliedCount}</div>
      <div class="kpi-sub">Evrak & takvim takibi aktif</div>
    </div>
  </section>`;

  const filterBar = `<div class="toolbar">
    <div class="filter-pills">
      <button class="filter-pill ${activeFilter === 'ALL' ? 'active' : ''}" data-abroad-filter="ALL">Tümü (${abroadPrograms.length})</button>
      <button class="filter-pill ${activeFilter === 'DE' ? 'active' : ''}" data-abroad-filter="DE">Almanya (${deCount})</button>
      <button class="filter-pill ${activeFilter === 'IT' ? 'active' : ''}" data-abroad-filter="IT">İtalya (${itCount})</button>
      <button class="filter-pill ${activeFilter === 'OTHER' ? 'active' : ''}" data-abroad-filter="OTHER">Diğer</button>
    </div>
  </div>`;

  if (!abroadPrograms.length) {
    return `${headerHtml}${kpiHtml}
    <section class="apple-hero" style="padding:40px 28px;">
      <div class="apple-hero-content">
        <h2 style="font-size:26px;">Almanya & İtalya hedeflerini ekle.</h2>
        <p style="font-size:15px;">Aşağıdaki popüler Avrupa mühendislik/ekonomi programlarını tek tıkla ekleyebilir veya kendi hedef üniversiteni oluşturabilirsin.</p>
        <button class="btn btn-primary" id="heroAbroadAddBtn">+ Özel Program Oluştur</button>
      </div>
      <div class="sample-tiles" style="grid-template-columns:repeat(3, minmax(0, 1fr));max-width:780px;">
        ${ABROAD_PRESETS.map(
          (pr, idx) => `<button class="sample-tile" data-abroad-preset="${idx}">
            <strong>${escapeHtml(pr.university)}</strong>
            <span>${escapeHtml(pr.city)} · ${escapeHtml(pr.department)}</span>
          </button>`,
        ).join('')}
      </div>
    </section>`;
  }

  const cardsHtml = `<section class="cards-grid">
    ${list
      .map((p) => {
        const st = ABROAD_STATUS_META[p.status] || ABROAD_STATUS_META.researching;
        const cInfo = ABROAD_COUNTRIES[p.country] || ABROAD_COUNTRIES.OTHER;
        const cd = formatDeadlineCountdown(p.deadline);
        const doneCount = ABROAD_CHECKLIST_ITEMS.filter((it) => p.checklist?.[it.key]).length;

        return `<article class="prog-card" style="cursor:default;">
          <div class="card-top">
            <div class="card-left-head">
              <div class="uni-avatar" style="font-size:13px;font-weight:700;">${escapeHtml(cInfo.badge)}</div>
              <div class="card-titles">
                <div class="card-dept">${escapeHtml(p.department)}</div>
                <div class="card-uni">${escapeHtml(p.university)}</div>
                <div class="card-meta-line">${escapeHtml([cInfo.label, p.city, p.language].filter(Boolean).join(' · '))}</div>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
              <select class="select toolbar-select" data-abroad-status="${escapeHtml(p.id)}" style="height:28px;font-size:11.5px;padding:0 22px 0 10px;background:${st.bg};color:${st.color};font-weight:600;box-shadow:none;">
                ${Object.entries(ABROAD_STATUS_META)
                  .map(([k, v]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${v.label}</option>`)
                  .join('')}
              </select>
              ${cd ? `<span class="pill" style="background:var(--${cd.tone}-soft);color:var(--${cd.tone});">${escapeHtml(cd.text)}</span>` : ''}
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 0;border-top:0.5px solid var(--separator-subtle);border-bottom:0.5px solid var(--separator-subtle);font-size:12.5px;">
            <div>
              <div class="metric-label">Kabul / Sınav Şartı</div>
              <div style="font-weight:500;margin-top:2px;">${escapeHtml(p.admissionReq || '—')}</div>
            </div>
            <div>
              <div class="metric-label">Dil Şartı</div>
              <div style="font-weight:500;margin-top:2px;">${escapeHtml(p.languageReq || '—')}</div>
            </div>
            <div>
              <div class="metric-label">Harç / Burs</div>
              <div style="font-weight:500;margin-top:2px;">${escapeHtml(p.tuition || '—')}</div>
            </div>
            <div>
              <div class="metric-label">Portal & Son Tarih</div>
              <div style="font-weight:500;margin-top:2px;">${escapeHtml(p.portal || '—')}${p.deadline ? ` · <span class="tabular">${escapeHtml(p.deadline)}</span>` : ''}</div>
            </div>
          </div>

          <div style="padding-top:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:11.5px;font-weight:600;color:var(--text-tertiary);">EVRAK KONTROLÜ (${doneCount}/${ABROAD_CHECKLIST_ITEMS.length})</span>
              <div style="display:flex;gap:6px;">
                ${p.url ? `<a class="mini-action" href="${escapeHtml(p.url)}" target="_blank" rel="noopener">Site ↗</a>` : ''}
                <button class="mini-action" data-abroad-edit="${escapeHtml(p.id)}">Düzenle</button>
                <button class="mini-action" style="color:var(--rose);" data-abroad-del="${escapeHtml(p.id)}">Sil</button>
              </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${ABROAD_CHECKLIST_ITEMS.map((it) => {
                const checked = Boolean(p.checklist?.[it.key]);
                return `<button class="check-chip ${checked ? 'checked' : ''}" data-abroad-check="${escapeHtml(p.id)}" data-check-key="${it.key}">
                  <span>${checked ? '✓' : '○'}</span> ${escapeHtml(it.label)}
                </button>`;
              }).join('')}
            </div>
            ${p.notes ? `<div style="margin-top:10px;font-size:12.5px;color:var(--text-secondary);background:var(--surface-secondary);padding:8px 11px;border-radius:10px;">${escapeHtml(p.notes)}</div>` : ''}
          </div>
        </article>`;
      })
      .join('')}
  </section>`;

  return `${headerHtml}${kpiHtml}${filterBar}${cardsHtml}`;
}
