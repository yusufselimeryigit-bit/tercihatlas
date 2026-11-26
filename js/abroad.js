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

export const DEFAULT_ABROAD_TOOLS = {
  diplomaScore: 92,
  yksScore: 480,
  sperrkontoSaved: 0,
  sperrkontoTarget: 11904,
  iseeEstimate: 15000,
  ieltsScore: '',
  testdafScore: '',
  tolcScore: '',
};

/**
 * Bavarian Formula (Modifizierte bayerische Formel):
 * N = 1 + 3 * (N_max - N_d) / (N_max - N_min)
 * German scale: 1.0 (best) -> 4.0 (minimum passing)
 */
export function calculateBavarianGrade(score, maxScore = 100, minScore = 50) {
  const v = Number(score);
  if (!Number.isFinite(v)) return null;
  const clamped = Math.max(minScore, Math.min(maxScore, v));
  const raw = 1 + 3 * ((maxScore - clamped) / Math.max(1, maxScore - minScore));
  const grade = Math.min(4.0, Math.max(1.0, Number(raw.toFixed(2))));
  let badge = 'İyi / Kabul Edilebilir';
  let tone = 'accent';
  if (grade <= 1.5) {
    badge = 'Sehr Gut · TUM / RWTH / KIT için çok güçlü';
    tone = 'green';
  } else if (grade <= 2.3) {
    badge = 'Gut · Çoğu devlet üniversitesi NC bandında';
    tone = 'accent';
  } else if (grade <= 3.0) {
    badge = 'Befriedigend · NC-frei bölümlerde güçlü';
    tone = 'amber';
  } else {
    badge = 'Ausreichend · NC-frei başvurular önerilir';
    tone = 'rose';
  }
  return { grade, badge, tone };
}

function renderAbroadToolsSection(abroadTools, eurTry = 38) {
  const t = { ...DEFAULT_ABROAD_TOOLS, ...(abroadTools || {}) };
  const dip = calculateBavarianGrade(t.diplomaScore, 100, 50);
  const yks = calculateBavarianGrade(t.yksScore, 560, 180);
  const saved = Math.max(0, Number(t.sperrkontoSaved) || 0);
  const target = Math.max(1000, Number(t.sperrkontoTarget) || 11904);
  const pct = Math.min(100, Math.round((saved / target) * 100));
  const remainingEur = Math.max(0, target - saved);
  const remainingTry = Math.round(remainingEur * (Number(eurTry) || 38));
  const isee = Number(t.iseeEstimate) || 0;
  const dsuOk = isee > 0 && isee <= 23000;

  const fmtEur = (n) => `€${Math.round(n).toLocaleString('tr-TR')}`;
  const fmtTry = (n) => `${Math.round(n).toLocaleString('tr-TR')} ₺`;

  return `
    <section class="abroad-tools-grid" aria-label="Almanya ve İtalya başvuru araçları">
      <div class="panel">
        <div class="panel-title">
          <span>🇩🇪 Alman Notu Çevirici (Bavarian Formula)</span>
          <span class="pill pill-accent">1.0 – 4.0 NC</span>
        </div>
        <div class="form-grid-2" style="margin-bottom:12px;">
          <div>
            <label class="field-label" for="abToolDiploma">Lise Diploma Notun (100'lük)</label>
            <input id="abToolDiploma" class="input tabular" type="number" step="0.1" min="50" max="100" value="${escapeHtml(t.diplomaScore)}" />
          </div>
          <div>
            <label class="field-label" for="abToolYks">Tahmini YKS Puanın (180 – 560)</label>
            <input id="abToolYks" class="input tabular" type="number" step="1" min="180" max="560" value="${escapeHtml(t.yksScore)}" />
          </div>
        </div>
        <div class="bavarian-result-grid tabular">
          <div class="bavarian-tile">
            <span class="metric-label">Diploma Alman Notu</span>
            <strong style="color:var(--${dip?.tone || 'accent'});">${dip ? dip.grade.toFixed(2) : '—'}</strong>
            <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">${dip ? escapeHtml(dip.badge) : ''}</div>
          </div>
          <div class="bavarian-tile">
            <span class="metric-label">YKS Alman Karşılığı</span>
            <strong style="color:var(--${yks?.tone || 'accent'});">${yks ? yks.grade.toFixed(2) : '—'}</strong>
            <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">Uni-Assist VPD (50/50 karma) ≈ <strong>${dip && yks ? ((dip.grade + yks.grade) / 2).toFixed(2) : '—'}</strong></div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">
          <span>💶 Bloke Hesap (Sperrkonto) & 🇮🇹 DSU Bursu</span>
          <span class="pill pill-risk-guvenli tabular">%${pct}</span>
        </div>
        <div class="form-grid-2" style="margin-bottom:10px;">
          <div>
            <label class="field-label" for="abToolSperrSaved">Biriken Bloke Hesap (€)</label>
            <input id="abToolSperrSaved" class="input tabular" type="number" step="100" min="0" value="${escapeHtml(saved)}" />
          </div>
          <div>
            <label class="field-label" for="abToolIsee">İtalya Tahmini ISEE (€ / yıl)</label>
            <input id="abToolIsee" class="input tabular" type="number" step="500" min="0" value="${escapeHtml(isee)}" />
          </div>
        </div>
        <div style="margin-bottom:10px;">
          <div class="abroad-sperr-row tabular">
            <span style="color:var(--text-secondary);">Hedef: <strong>${fmtEur(target)}</strong> (€992/ay × 12)</span>
            <span style="color:var(--text-tertiary);">Kalan: <strong>${fmtEur(remainingEur)}</strong> (~${fmtTry(remainingTry)})</span>
          </div>
          <div class="bar-track" style="height:8px;"><div class="bar-fill" style="width:${pct}%;background:var(--green-bright);"></div></div>
        </div>
        <div class="${dsuOk ? 'quota-alert-good' : 'quota-alert-warn'}" style="margin-bottom:10px;">
          ${dsuOk
            ? `🇮🇹 ISEE ≤ €23.000: İtalya DSU bölgesel bursu (harç muafiyeti + yurt + yıllık ~€5.000–7.000 destek) bandındasın.`
            : `🇮🇹 ISEE > €23.000: Tam DSU bursu sınırı €23.000; gelir beyanına göre kademeli harç indirimi alabilirsin.`}
        </div>
        <div class="abroad-exam-row">
          <div>
            <label class="field-label" for="abToolIelts" style="font-size:11.5px;">IELTS</label>
            <input id="abToolIelts" class="input" type="text" value="${escapeHtml(t.ieltsScore)}" placeholder="Örn: 6.5" style="padding:6px 10px;font-size:12.5px;" />
          </div>
          <div>
            <label class="field-label" for="abToolTestdaf" style="font-size:11.5px;">TestDaF / Goethe</label>
            <input id="abToolTestdaf" class="input" type="text" value="${escapeHtml(t.testdafScore)}" placeholder="Örn: C1 / 4x4" style="padding:6px 10px;font-size:12.5px;" />
          </div>
          <div>
            <label class="field-label" for="abToolTolc" style="font-size:11.5px;">TOLC-I / SAT</label>
            <input id="abToolTolc" class="input" type="text" value="${escapeHtml(t.tolcScore)}" placeholder="Örn: SAT 1350" style="padding:6px 10px;font-size:12.5px;" />
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderAbroadView(abroadPrograms, activeFilter = 'ALL', abroadTools = DEFAULT_ABROAD_TOOLS, eurTry = 38) {
  const list = activeFilter === 'ALL' ? abroadPrograms : abroadPrograms.filter((p) => p.country === activeFilter);
  const deCount = abroadPrograms.filter((p) => p.country === 'DE').length;
  const itCount = abroadPrograms.filter((p) => p.country === 'IT').length;
  const appliedCount = abroadPrograms.filter((p) => p.status === 'applied' || p.status === 'accepted').length;

  const headerHtml = `<div class="page-header">
    <div>
      <h1 class="page-title">Yurt Dışı</h1>
      <p class="page-status tabular">Almanya (${deCount}) · İtalya (${itCount}) · ${appliedCount} başvuru</p>
    </div>
    <button class="btn btn-primary" id="openAbroadAddBtn">+ Program Ekle</button>
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

  const toolsHtml = renderAbroadToolsSection(abroadTools, eurTry);

  const filterBar = `<div class="toolbar">
    <div class="filter-pills">
      <button class="filter-pill ${activeFilter === 'ALL' ? 'active' : ''}" data-abroad-filter="ALL">Tümü (${abroadPrograms.length})</button>
      <button class="filter-pill ${activeFilter === 'DE' ? 'active' : ''}" data-abroad-filter="DE">Almanya (${deCount})</button>
      <button class="filter-pill ${activeFilter === 'IT' ? 'active' : ''}" data-abroad-filter="IT">İtalya (${itCount})</button>
      <button class="filter-pill ${activeFilter === 'OTHER' ? 'active' : ''}" data-abroad-filter="OTHER">Diğer</button>
    </div>
  </div>`;

  if (!abroadPrograms.length) {
    return `${headerHtml}${kpiHtml}${toolsHtml}
    <section class="apple-hero" style="padding:40px 28px;">
      <div class="apple-hero-content">
        <h2 style="font-size:26px;">Almanya & İtalya hedeflerini ekle.</h2>
        <p style="font-size:15px;">Aşağıdaki popüler Avrupa mühendislik/ekonomi programlarını tek tıkla ekleyebilir veya kendi hedef üniversiteni oluşturabilirsin.</p>
        <button class="btn btn-primary" id="heroAbroadAddBtn">+ Özel Program Oluştur</button>
      </div>
      <div class="sample-tiles abroad-sample-tiles">
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
            <div class="card-top-right">
              <select class="select toolbar-select" data-abroad-status="${escapeHtml(p.id)}" style="height:28px;font-size:11.5px;padding:0 22px 0 10px;background:${st.bg};color:${st.color};font-weight:600;box-shadow:none;">
                ${Object.entries(ABROAD_STATUS_META)
                  .map(([k, v]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${v.label}</option>`)
                  .join('')}
              </select>
              ${cd ? `<span class="pill" style="background:var(--${cd.tone}-soft);color:var(--${cd.tone});">${escapeHtml(cd.text)}</span>` : ''}
            </div>
          </div>

          <div class="abroad-card-meta-grid">
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
            <div class="abroad-check-head">
              <span style="font-size:11.5px;font-weight:600;color:var(--text-tertiary);">EVRAK KONTROLÜ (${doneCount}/${ABROAD_CHECKLIST_ITEMS.length})</span>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
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

  return `${headerHtml}${kpiHtml}${toolsHtml}${filterBar}${cardsHtml}`;
}
