/**
 * TercihAtlas — YKS Karar Destek Araçları (v26):
 *  - ÖSYM Özel Koşul (Bk.) Sade Türkçe Tercümanı
 *  - 3 Yıllık Trend (2024 → 2025 → 2026) & Yeni Açılan / Kontenjanı Artan Analizi
 *  - Karşılaştırma Kişisel Puanlama Matrisi (Şehir 1-10, Kampüs 1-10, İlgi 1-10)
 *  - Sunucusuz Base64URL Liste Paylaşımı (?list=...)
 *  - Resmi ÖSYM AİS Formatında PDF / Yazdır & Tablo Kopyalama
 */

import { escapeHtml, formatRank, RISK_META } from './utils.js';

// ============================================================================
// 1. ÖSYM Özel Koşul (Bk. Kodu) Sade Türkçe Tercümanı
// ============================================================================
export const BK_DICTIONARY = {
  '1': {
    title: 'Vakıf Üniversitesi Ücretli Program',
    plainTr: 'Bu bölüm vakıf üniversitesine bağlıdır ve yıllık öğrenim ücretine tabidir. Kayıt öncesi güncel TL ücreti ve taksit koşullarını kontrol et.',
    tone: 'amber',
  },
  '3': {
    title: 'Burs Süresi & Devam Şartı',
    plainTr: 'Vakıf bursları genellikle normal eğitim süresi (+1 yıl hazırlık) boyunca geçerlidir; akademik başarıya veya disiplin durumuna göre kesilmez.',
    tone: 'accent',
  },
  '4': {
    title: 'İkinci Öğretim / Katkı Payı',
    plainTr: 'Program ikinci öğretim veya öğrenim ücretli statüdedir; her dönem belirlenen katkı payı ödenir.',
    tone: 'amber',
  },
  '15': {
    title: 'Staj / Uygulama Zorunluluğu',
    plainTr: 'Mezuniyet için zorunlu mesleki staj veya saha uygulaması gerekir.',
    tone: 'accent',
  },
  '17': {
    title: 'Zorunlu Yabancı Dil Hazırlık',
    plainTr: 'Bölüme başlamadan önce 1 yıl zorunlu yabancı dil hazırlık sınıfı vardır. Üniversitenin muafiyet sınavını geçersen doğrudan 1. sınıftan başlarsın.',
    tone: 'accent',
  },
  '21': {
    title: 'Zorunlu İngilizce Hazırlık Sınıfı',
    plainTr: '1 yıl zorunlu İngilizce hazırlık eğitimi uygulanır. YDS/TOEFL veya üniversitenin kendi yeterlilik sınavıyla muaf olabilirsin.',
    tone: 'accent',
  },
  '22': {
    title: 'İsteğe Bağlı Hazırlık Sınıfı',
    plainTr: 'Hazırlık sınıfı zorunlu değildir; istersen 1 yıl dil hazırlık okuyabilir ya da doğrudan 1. sınıfa geçebilirsin.',
    tone: 'green',
  },
  '23': {
    title: 'Kısmen (%30) Yabancı Dil Eğitim',
    plainTr: 'Derslerin en az %30’u İngilizce/yabancı dilde işlenir ve zorunlu hazırlık sınıfı bulunur.',
    tone: 'accent',
  },
  '24': {
    title: 'Almanca / Fransızca Hazırlık',
    plainTr: 'Eğitim dili nedeniyle 1 yıl zorunlu Almanca veya Fransızca hazırlık sınıfı bulunur; dil yeterliliği olanlar muaf sayılır.',
    tone: 'accent',
  },
  '25': {
    title: 'Tamamen (%100) Yabancı Dil Eğitim',
    plainTr: 'Tüm bölüm dersleri %100 yabancı dilde (İngilizce/Almanca/Fransızca) verilir; muafiyet geçilemezse 1 yıl hazırlık zorunludur.',
    tone: 'accent',
  },
  '28': {
    title: 'Yabancı Dil Yeterlilik Koşulu',
    plainTr: 'Hazırlık sınıfında 2 yıl içinde başarılı olunamazsa Türkçe eşdeğer programa geçiş hakkı veya ilişik kesme kuralları uygulanır.',
    tone: 'amber',
  },
  '46': {
    title: 'Burslu Kontenjan Güvencesi',
    plainTr: 'Burslu yerleştiğinde normal eğitim süresi boyunca eğitim ücreti ödemezsin; yurt/yemek destekleri üniversiteye göre değişir.',
    tone: 'green',
  },
  '64': {
    title: 'Vakıf Burs & İndirim Koşulları',
    plainTr: 'Burs/indirim oranı sadece eğitim ücretini kapsar. Hazırlık dahil kapsam süresi ve ek başarı burslarını üniversitenin sitesinden doğrula.',
    tone: 'accent',
  },
  '86': {
    title: 'ÖSYM Başarı Sırası Barajı',
    plainTr: 'Bu bölümde ÖSYM taban başarı sırası barajı uygulanır (Tıp 50 bin, Diş 80 bin, Eczacılık 100 bin, Hukuk 100/125 bin, Mimarlık 250 bin, Mühendislik/Öğretmenlik 300 bin).',
    tone: 'rose',
  },
  '144': {
    title: 'Mühendislik / Özel Baraj Kuralı',
    plainTr: 'Mühendislik programları için Y-SAY ilk 300.000 başarı sırası şartı aranır; bu sıranın gerisindeki adaylar tercih edemez.',
    tone: 'rose',
  },
  '151': {
    title: 'KKTC Kampüsü / Yaşam & Ulaşım',
    plainTr: 'Program Kuzey Kıbrıs Türk Cumhuriyeti’nde eğitim verir. Ulaşım, konaklama ve KKTC öğrenci izni süreçlerini planlamana ekle.',
    tone: 'amber',
  },
  '152': {
    title: 'Yurt Dışı Ortak / Çift Diploma',
    plainTr: 'Eğitimin bir bölümü yurt dışındaki ortak üniversitede geçer; ek harç, vize ve yaşam masrafı doğabilir.',
    tone: 'amber',
  },
  '204': {
    title: 'Sağlık Kurulu Raporu Şartı',
    plainTr: 'Kayıt sırasında mesleği yapmaya engel sağlık sorunu olmadığını gösteren tam teşekküllü hastane raporu istenir.',
    tone: 'rose',
  },
  '239': {
    title: 'Pilotaj / Havacılık Sağlık & Uçuş Ücreti',
    plainTr: 'Sivil Havacılık (SHGM) 1. Sınıf sağlık sertifikası gerekir; uçuş eğitim ücretleri vakıf bursuna dahil olmayabilir.',
    tone: 'rose',
  },
  '296': {
    title: 'Mesleki Kıyafet & Donanım',
    plainTr: 'Uygulamalı dersler/stajlar için okulun belirlediği üniforma veya mesleki ekipmanı temin etmen gerekir.',
    tone: 'accent',
  },
  '708': {
    title: 'Yüksek Sıralama Ek Burs İmkanı',
    plainTr: 'İlk derecelerde (ör. ilk 1.000 / 5.000) yerleşen öğrencilere nakdi cep harçlığı, ücretsiz yurt veya dizüstü bilgisayar desteği sunulabilir.',
    tone: 'green',
  },
};

export function translateBkCondition(code, rawText = '') {
  const cleanCode = String(code || '').replace(/[^\d]/g, '').trim();
  const known = BK_DICTIONARY[cleanCode];
  if (known) {
    return {
      code: cleanCode || String(code || ''),
      title: known.title,
      plainTr: known.plainTr,
      rawText: rawText || '',
      tone: known.tone,
    };
  }

  // Fallback smart Turkish simplifier for any other ÖSYM condition text
  const txt = String(rawText || '').trim();
  const low = txt.toLocaleLowerCase('tr-TR');
  let title = `ÖSYM Özel Koşul (Bk. ${cleanCode || code})`;
  let plainTr = txt || 'Bu koşulun tam detayını ÖSYM tercih kılavuzundan incele.';
  let tone = 'accent';

  if (/hazırlık|yabancı dil|ingilizce|almanca|fransızca/.test(low)) {
    title = 'Yabancı Dil / Hazırlık Koşulu';
    plainTr = 'Yabancı dil hazırlık sınıfı veya muafiyet sınavı şartı içerir. Muafiyet geçilirse doğrudan 1. sınıftan başlanır.';
    tone = 'accent';
  } else if (/başarı sırası|baraj|300\.000|50\.000|80\.000|100\.000|125\.000|250\.000/.test(low)) {
    title = 'ÖSYM Başarı Sırası Barajı';
    plainTr = 'Bu programa yerleşebilmek için ÖSYM’nin belirlediği minimum başarı sırası barajının içinde olman gerekir.';
    tone = 'rose';
  } else if (/burs|ücret|öğrenim ücreti|indirim/.test(low)) {
    title = 'Ücret & Burs Koşulu';
    plainTr = 'Vakıf öğrenim ücreti, burs süresi veya indirim kapsamıyla ilgili resmi bilgilendirme içerir.';
    tone = 'amber';
  } else if (/sağlık|heyet|rapor|boy|kilo/.test(low)) {
    title = 'Sağlık / Fiziki Yeterlilik Şartı';
    plainTr = 'Kayıt öncesi yetkili hastaneden sağlık raporu veya fiziki uygunluk belgesi talep edilebilir.';
    tone = 'rose';
  } else if (/kktc|kıbrıs|yurt dışı|çift diploma/.test(low)) {
    title = 'Kampüs Konumu / Ortak Program';
    plainTr = 'Eğitim KKTC kampüsünde veya yurt dışı ortak üniversite anlaşması kapsamında yürütülür.';
    tone = 'amber';
  } else if (/staj|uygulama|kıyafet|üniforma/.test(low)) {
    title = 'Staj & Uygulama Koşulu';
    plainTr = 'Zorunlu mesleki staj, saha uygulaması veya kıyafet düzeni uygulanır.';
    tone = 'green';
  } else if (txt.length > 170) {
    plainTr = `${txt.slice(0, 168).trim()}…`;
  }

  return {
    code: cleanCode || String(code || ''),
    title,
    plainTr,
    rawText: txt,
    tone,
  };
}

/**
 * Programın kendi ÖSYM koşulları varsa onları tercüme eder;
 * çevrimdışı katalogdan eklendiyse bölüm özelliklerinden ilgili resmi Bk. koşullarını otomatik çıkarır.
 */
export function deriveProgramBkTags(program) {
  if (!program) return [];
  if (Array.isArray(program.conditions) && program.conditions.length > 0) {
    return program.conditions.slice(0, 4).map((c) => translateBkCondition(c.code, c.text));
  }

  const tags = [];
  const deptLow = String(program.department || '').toLocaleLowerCase('tr-TR');
  const langLow = String(program.language || '').toLocaleLowerCase('tr-TR');
  const schLow = String(program.scholarship || '').toLocaleLowerCase('tr-TR');
  const cityLow = String(program.city || '').toLocaleLowerCase('tr-TR');

  // Başarı sırası barajı olan bölümler (Bk. 86 / 144)
  if (/tıp|diş hekim|eczacılık|hukuk|mimarlık|mühendisli|öğretmenli/.test(deptLow)) {
    let customBaraj = BK_DICTIONARY['86'].plainTr;
    if (/tıp/.test(deptLow)) customBaraj = 'Tıp programları için Y-SAY ilk 50.000 başarı sırası barajı zorunludur.';
    else if (/diş hekim/.test(deptLow)) customBaraj = 'Diş Hekimliği için Y-SAY ilk 80.000 başarı sırası barajı zorunludur.';
    else if (/eczacılık/.test(deptLow)) customBaraj = 'Eczacılık için Y-SAY ilk 100.000 başarı sırası barajı zorunludur.';
    else if (/hukuk/.test(deptLow)) customBaraj = 'Hukuk programları için Y-EA başarı sırası barajı (100.000 / 125.000) uygulanır.';
    else if (/mimarlık/.test(deptLow)) customBaraj = 'Mimarlık programları için Y-SAY ilk 250.000 başarı sırası barajı zorunludur.';
    else if (/mühendisli/.test(deptLow)) customBaraj = 'Mühendislik programları için Y-SAY ilk 300.000 başarı sırası barajı zorunludur.';
    else if (/öğretmenli/.test(deptLow)) customBaraj = 'Öğretmenlik programları için ilgili puan türünde ilk 300.000 barajı zorunludur.';

    tags.push({
      code: '86',
      title: 'Başarı Sırası Barajı',
      plainTr: customBaraj,
      rawText: '',
      tone: 'rose',
    });
  }

  // Yabancı dil hazırlık (Bk. 25 / 23 / 24)
  if (/30/.test(langLow)) {
    tags.push(translateBkCondition('23'));
  } else if (/ingilizce/.test(langLow)) {
    tags.push(translateBkCondition('25'));
  } else if (/almanca|fransızca|rusça|arapça/.test(langLow)) {
    tags.push(translateBkCondition('24'));
  }

  // Vakıf burs / ücret (Bk. 64 / 1)
  if (program.universityType === 'VAKIF') {
    if (/burslu|indirim/.test(schLow)) tags.push(translateBkCondition('64'));
    else tags.push(translateBkCondition('1'));
  }

  // KKTC (Bk. 151)
  if (/kıbrıs|kktc|lefkoşa|gazimağusa|girne/.test(cityLow) || program.universityType === 'KKTC/DİĞER') {
    tags.push(translateBkCondition('151'));
  }

  // Pilotaj (Bk. 239)
  if (/pilotaj/.test(deptLow)) {
    tags.push(translateBkCondition('239'));
  }

  return tags.slice(0, 3);
}

// ============================================================================
// 2. 3 Yıllık Trend (2024 → 2025 → 2026) & Yeni Açılan / Kontenjan Artışı
// ============================================================================
export function isNewProgram(program) {
  if (!program) return false;
  const hist = Array.isArray(program.history) ? program.history : [];
  const rankedYears = hist.filter((h) => Number(h.rank) > 0);
  if (rankedYears.length === 0) return true;
  if (rankedYears.length === 1 && rankedYears[0].year >= 2025) return true;
  return false;
}

export function getQuotaChangeInfo(program) {
  const hist = (Array.isArray(program?.history) ? program.history : [])
    .filter((h) => Number(h.quota) > 0)
    .sort((a, b) => a.year - b.year);
  if (hist.length < 2) return { prevQuota: null, latestQuota: program?.quota ?? null, delta: 0, increased: false };
  const prev = hist[hist.length - 2].quota;
  const latest = hist[hist.length - 1].quota;
  const delta = latest - prev;
  return { prevQuota: prev, latestQuota: latest, delta, increased: delta > 0 };
}

/**
 * Son 3 yılın (ör. 2024 → 2025 → 2026) taban sıralama değişimini hesaplar.
 * delta > 0 => sıralama öne çekti (yükseldi / zorlaştı)
 * delta < 0 => sıralama geriledi (gevşedi / kolaylaştı)
 */
export function computeThreeYearTrend(program) {
  const hist = (Array.isArray(program?.history) ? program.history : [])
    .filter((h) => Number(h.rank) > 0)
    .sort((a, b) => a.year - b.year);

  if (!hist.length) return null;
  const recent = hist.slice(-3); // up to last 3 years: e.g. 2024, 2025, 2026
  const pathText = recent.map((h) => `${h.year}: #${formatRank(h.rank)}`).join(' → ');

  if (recent.length < 2) {
    return {
      isNew: true,
      fromYear: recent[0].year,
      toYear: recent[0].year,
      delta: null,
      direction: 'new',
      shortRange: `${recent[0].year} Yeni`,
      pathText,
    };
  }

  const first = recent[0];
  const last = recent[recent.length - 1];
  const delta = first.rank - last.rank; // positive = better rank (moved closer to #1)
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';

  return {
    isNew: false,
    fromYear: first.year,
    toYear: last.year,
    delta,
    direction,
    shortRange: `${String(first.year).slice(-2)}→${String(last.year).slice(-2)}`,
    pathText,
  };
}

// ============================================================================
// 3. Karşılaştırma Kişisel Puanlama Matrisi (1–10)
// ============================================================================
export const MATRIX_CRITERIA = [
  { key: 'city', label: 'Şehir & Yaşam', hint: 'Ulaşım, iklim, sosyal hayat' },
  { key: 'campus', label: 'Kampüs & Üniversite', hint: 'Olanaklar, kulüpler, prestij' },
  { key: 'interest', label: 'Bölüm İlgisi', hint: 'Dersler, mesleki tutku, kariyer' },
];

export function getProgramMatrixScores(program) {
  const m = program?.matrixScores || {};
  const clamp = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.round(n) : 7;
  };
  const city = clamp(m.city);
  const campus = clamp(m.campus);
  const interest = clamp(m.interest);
  return { city, campus, interest, total: city + campus + interest };
}

export function computeMatrixRanking(programs) {
  return (programs || [])
    .map((p) => ({ program: p, scores: getProgramMatrixScores(p) }))
    .sort((a, b) => b.scores.total - a.scores.total);
}

export function renderCompareDecisionMatrix(selectedPrograms) {
  if (!Array.isArray(selectedPrograms) || selectedPrograms.length < 2) return '';
  const list = selectedPrograms.slice(0, 4);
  const ranked = computeMatrixRanking(list);
  const winner = ranked[0];
  const runnerUp = ranked[1];
  const margin = winner && runnerUp ? winner.scores.total - runnerUp.scores.total : 0;

  return `
    <div class="panel panel-full matrix-panel" style="margin-top:18px;">
      <div class="panel-title" style="margin-bottom:8px;">
        <div>
          <span style="display:block;">Kişisel Karar Matrisi (1 – 10 Puanlama)</span>
          <span style="font-size:12.5px;font-weight:450;color:var(--text-secondary);">Her bölüm için Şehir, Kampüs/Üniversite ve Bölüm İlgisi puanını ver; sistem toplam puana göre en mantıklı seçeneği önersin.</span>
        </div>
      </div>

      ${winner
        ? `<div class="matrix-winner-banner" id="matrixWinnerBanner">
            <div>
              <div style="font-size:11.5px;font-weight:650;text-transform:uppercase;letter-spacing:.04em;color:var(--green);">En Mantıklı Seçenek</div>
              <strong style="font-size:15.5px;color:var(--text);">${escapeHtml(winner.program.university)} — ${escapeHtml(winner.program.department)}</strong>
              <span style="display:block;font-size:12.5px;color:var(--text-secondary);margin-top:2px;">
                ${margin > 0 ? `2. sıradaki ${escapeHtml(runnerUp.program.university)} seçeneğinden +${margin} puan önde.` : 'İlk iki seçenek eşit puanda — kişisel önceliğine göre netleştirebilirsin.'}
              </span>
            </div>
            <div class="matrix-winner-score tabular">${winner.scores.total}<span>/ 30</span></div>
          </div>`
        : ''}

      <div class="matrix-grid" style="grid-template-columns:repeat(${Math.min(list.length, 4)}, minmax(0, 1fr));">
        ${list
          .map((p) => {
            const sc = getProgramMatrixScores(p);
            const isWin = winner && winner.program.code === p.code && margin > 0;
            return `<div class="matrix-card ${isWin ? 'winner' : ''}" data-matrix-card="${escapeHtml(p.code)}">
              <div class="matrix-card-head">
                <div style="min-width:0;">
                  <strong style="display:block;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.university)}</strong>
                  <span style="display:block;font-size:11.5px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.department)}</span>
                </div>
                <span class="matrix-total-pill tabular" id="matrixTotal_${escapeHtml(p.code)}">${sc.total}/30</span>
              </div>

              <div class="matrix-sliders">
                ${MATRIX_CRITERIA.map(
                  (cr) => `<div class="matrix-slider-row">
                    <div class="matrix-slider-top">
                      <span>${escapeHtml(cr.label)}</span>
                      <strong class="tabular" id="matrixVal_${escapeHtml(p.code)}_${cr.key}">${sc[cr.key]} / 10</strong>
                    </div>
                    <input type="range" class="apple-slider" min="1" max="10" step="1" value="${sc[cr.key]}"
                      data-matrix-code="${escapeHtml(p.code)}" data-matrix-key="${cr.key}" aria-label="${escapeHtml(p.university)} ${escapeHtml(cr.label)}" />
                  </div>`,
                ).join('')}
              </div>
            </div>`;
          })
          .join('')}
      </div>
    </div>`;
}

// ============================================================================
// 4. Sunucusuz Base64URL Liste Paylaşımı (?list=...) — Sıfır Veritabanı
// ============================================================================
const RISK_TO_CHAR = { hayal: 'h', hedef: 'd', guvenli: 'g' };
const CHAR_TO_RISK = { h: 'hayal', d: 'hedef', g: 'guvenli' };

function utf8ToBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToUtf8(b64url) {
  const pad = b64url.length % 4 ? '='.repeat(4 - (b64url.length % 4)) : '';
  const b64 = String(b64url).replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeListToShareParam({ title = 'Tercih Listem', targetRank = null, programs = [] } = {}) {
  const payload = {
    v: 1,
    n: String(title || 'Tercih Listem').slice(0, 48),
    t: Number(targetRank) > 0 ? Math.round(Number(targetRank)) : null,
    c: (programs || []).slice(0, 24).map((p) => [String(p.code), RISK_TO_CHAR[p.risk] || 'd']),
  };
  return utf8ToBase64Url(JSON.stringify(payload));
}

export function decodeListFromShareParam(param) {
  try {
    if (!param) return null;
    const raw = JSON.parse(base64UrlToUtf8(param));
    if (!raw || !Array.isArray(raw.c)) return null;
    return {
      title: String(raw.n || 'Paylaşılan Tercih Listesi'),
      targetRank: Number(raw.t) > 0 ? Number(raw.t) : null,
      items: raw.c
        .filter((entry) => Array.isArray(entry) && entry[0])
        .map(([code, ch]) => ({ code: String(code), risk: CHAR_TO_RISK[ch] || 'hedef' })),
    };
  } catch {
    return null;
  }
}

// ============================================================================
// 5. Resmi ÖSYM AİS Formatında PDF / Yazdır & Panoya Kopyalanabilir Tablo
// ============================================================================
export function buildOsymOfficialTableText(programs) {
  const header = ['Tercih Sırası', 'Program Kodu', 'Üniversite Adı', 'Bölüm Adı', 'Puan Türü'].join('\t');
  const rows = (programs || [])
    .slice(0, 24)
    .map((p, idx) => [idx + 1, p.code, p.university, p.department, p.scoreType || '—'].join('\t'));
  return [header, ...rows].join('\n');
}

export function openOfficialOsymPrintWindow(state) {
  const programs = (state?.programs || []).slice(0, 24);
  const dateStr = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

  const rowsHtml = programs
    .map((p, idx) => {
      const riskLabel = RISK_META[p.risk]?.label || 'Hedef';
      return `<tr>
        <td class="num center"><strong>${idx + 1}</strong></td>
        <td class="mono">${escapeHtml(p.code)}</td>
        <td><strong>${escapeHtml(p.university)}</strong></td>
        <td>${escapeHtml(p.department)}</td>
        <td class="center"><span class="st-pill">${escapeHtml(p.scoreType || '—')}</span></td>
        <td class="num">${formatRank(p.latestRank)}</td>
        <td class="center"><span class="rk rk-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(riskLabel)}</span></td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>ÖSYM AİS Resmi Tercih Taslağı — TercihAtlas</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
      color: #1D1D1F; background: #FFFFFF; font-size: 12px; line-height: 1.45;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #1D1D1F; padding-bottom: 12px; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 20px; letter-spacing: -0.03em; }
    .sub { color: #6E6E73; font-size: 11.5px; margin-top: 3px; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em; background: #F2F2F7; color: #3A3A3C; padding: 9px 10px; border: 1px solid #D1D1D6; }
    td { padding: 8px 10px; border: 1px solid #E5E5EA; vertical-align: middle; }
    .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .center { text-align: center; }
    .mono { font-family: "SF Mono", ui-monospace, monospace; font-weight: 700; font-size: 11.5px; letter-spacing: 0.02em; }
    .st-pill { display: inline-block; padding: 2px 7px; border-radius: 6px; background: #F2F2F7; font-weight: 700; font-size: 10.5px; }
    .rk { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; }
    .rk-hayal { background: #FFEBF0; color: #D7003A; }
    .rk-hedef { background: #E8F3FF; color: #0071E3; }
    .rk-guvenli { background: #E9F9EE; color: #1E8E3E; }
    .bar { margin-bottom: 14px; display: flex; gap: 10px; }
    .btn { background: #0071E3; color: #fff; border: none; border-radius: 999px; padding: 8px 18px; font-weight: 600; font-size: 13px; cursor: pointer; }
    .foot { margin-top: 16px; display: flex; justify-content: space-between; font-size: 10.5px; color: #86868B; }
    @media print { .bar { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="bar"><button class="btn" onclick="window.print()">Resmi PDF Olarak Kaydet / Yazdır</button></div>
  <div class="top">
    <div>
      <h1>ÖSYM AİS Tercih Listesi Taslağı</h1>
      <div class="sub">${escapeHtml(state?.studentName || 'Aday')} · Tarih: ${escapeHtml(dateStr)}${state?.targetRank ? ` · Hedef Sıralama: ${formatRank(state.targetRank)}` : ''}</div>
    </div>
    <div style="text-align:right;font-weight:700;font-size:13px;">${programs.length} / 24 Tercih</div>
  </div>
  <table>
    <thead>
      <tr>
        <th class="center" style="width:58px;">Tercih Sırası</th>
        <th style="width:105px;">Program Kodu</th>
        <th>Üniversite Adı</th>
        <th>Bölüm Adı</th>
        <th class="center" style="width:74px;">Puan Türü</th>
        <th style="width:86px;">Taban Sıra</th>
        <th class="center" style="width:76px;">Risk</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="foot">
    <span>TercihAtlas — YKS Karar Destek Sistemi</span>
    <span>ÖSYM AİS (ais.osym.gov.tr) ekranına sırayla girmek için hazırlanmıştır.</span>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=940,height=780');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
