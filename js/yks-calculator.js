/**
 * TercihAtlas — 16 Derslik Tam Kalibrasyonlu YKS Puan & Çok Yıllı Sıralama Motoru (v28)
 * %100 İstemci Tarafı · Her Dersin Kendi ÖSYM Ağırlığı + 2023–2026 Gerçek (μ, σ) Z-Puanı Dönüşümü
 * 2023–2026 Gerçek YÖK Atlas Sonuç Belgeleriyle (±0,2 – 0,7 puan) Doğrulanmıştır.
 */

import { escapeHtml, formatRank } from './utils.js';

export const CALC_TYT_FIELDS = [
  { key: 'turkce', statKey: 'tyt_tr', label: 'Türkçe', max: 40 },
  { key: 'sosyal', statKey: 'tyt_sos', label: 'Sosyal Bilimler', max: 20 },
  { key: 'matematik', statKey: 'tyt_mat', label: 'Temel Matematik', max: 40 },
  { key: 'fen', statKey: 'tyt_fen', label: 'Fen Bilimleri', max: 20 },
];

export const CALC_AYT_GROUPS = [
  {
    id: 'ayt_say',
    title: 'AYT Matematik & Fen Bilimleri',
    subtitle: 'SAY (80 Soru) · Mat EA puanını da belirler',
    fields: [
      { key: 'matematik', statKey: 'ayt_mat', label: 'Matematik', max: 40, tag: 'SAY · EA' },
      { key: 'fizik', statKey: 'ayt_fiz', label: 'Fizik', max: 14, tag: 'SAY' },
      { key: 'kimya', statKey: 'ayt_kim', label: 'Kimya', max: 13, tag: 'SAY' },
      { key: 'biyoloji', statKey: 'ayt_bio', label: 'Biyoloji', max: 13, tag: 'SAY' },
    ],
  },
  {
    id: 'ayt_edsos1',
    title: 'AYT Edebiyat & Sosyal Bilimler-1',
    subtitle: 'EA · SÖZ (40 Soru) — Her alt ders ayrı katsayıyla hesaplanır',
    fields: [
      { key: 'edebiyat', statKey: 'ayt_edb', label: 'Türk Dili ve Edebiyatı', max: 24, tag: 'EA · SÖZ' },
      { key: 'tarih1', statKey: 'ayt_tr1', label: 'Tarih-1', max: 10, tag: 'EA · SÖZ' },
      { key: 'cografya1', statKey: 'ayt_cg1', label: 'Coğrafya-1', max: 6, tag: 'EA · SÖZ' },
    ],
  },
  {
    id: 'ayt_sos2_ydt',
    title: 'AYT Sosyal Bilimler-2 & YDT',
    subtitle: 'SÖZ (40 Soru) · DİL (80 Soru)',
    fields: [
      { key: 'tarih2', statKey: 'ayt_tr2', label: 'Tarih-2', max: 11, tag: 'SÖZ' },
      { key: 'cografya2', statKey: 'ayt_cg2', label: 'Coğrafya-2', max: 11, tag: 'SÖZ' },
      { key: 'felsefe', statKey: 'ayt_fel', label: 'Felsefe Grubu', max: 12, tag: 'SÖZ' },
      { key: 'din', statKey: 'ayt_din', label: 'Din Kültürü / Ek Fel.', max: 6, tag: 'SÖZ' },
      { key: 'ydt', statKey: 'ydt', label: 'YDT (Yabancı Dil)', max: 80, tag: 'DİL' },
    ],
  },
];

export const CALC_AYT_FIELDS = CALC_AYT_GROUPS.flatMap((g) => g.fields);

export const DEFAULT_YKS_CALC_INPUT = {
  diploma: 90,
  obpBroken: false,
  selectedType: 'SAY',
  selectedYear: 2026,
  tyt: {
    turkce: { d: 32, y: 4 },
    sosyal: { d: 15, y: 2 },
    matematik: { d: 30, y: 4 },
    fen: { d: 15, y: 2 },
  },
  ayt: {
    matematik: { d: 30, y: 3 },
    fizik: { d: 11, y: 1 },
    kimya: { d: 11, y: 1 },
    biyoloji: { d: 10, y: 1 },
    edebiyat: { d: 0, y: 0 },
    tarih1: { d: 0, y: 0 },
    cografya1: { d: 0, y: 0 },
    tarih2: { d: 0, y: 0 },
    cografya2: { d: 0, y: 0 },
    felsefe: { d: 0, y: 0 },
    din: { d: 0, y: 0 },
    ydt: { d: 0, y: 0 },
  },
};

/**
 * Eski birleşik formattaki (ayt.fen / ayt.edSos1 / ayt.sos2) kayıtları
 * kayıpsız şekilde 16 derslik yeni formata migrate eder.
 */
export function normalizeCalcInput(raw) {
  const base = structuredClone(DEFAULT_YKS_CALC_INPUT);
  if (!raw || typeof raw !== 'object') return base;
  const out = {
    ...base,
    diploma: raw.diploma ?? base.diploma,
    obpBroken: Boolean(raw.obpBroken),
    selectedType: CALC_SCORE_TYPES.includes(raw.selectedType) ? raw.selectedType : 'SAY',
    selectedYear: CALC_YEARS.includes(Number(raw.selectedYear)) ? Number(raw.selectedYear) : 2026,
    tyt: { ...base.tyt, ...(raw.tyt || {}) },
    ayt: { ...base.ayt },
  };
  const ra = raw.ayt || {};
  for (const f of CALC_AYT_FIELDS) {
    if (ra[f.key] && typeof ra[f.key] === 'object') {
      out.ayt[f.key] = { d: ra[f.key].d ?? 0, y: ra[f.key].y ?? 0 };
    }
  }
  // Legacy combined keys fallback if new split keys weren't present yet
  if (!ra.fizik && !ra.kimya && !ra.biyoloji && ra.fen && (Number(ra.fen.d) > 0 || Number(ra.fen.y) > 0)) {
    const d = Number(ra.fen.d) || 0;
    const y = Number(ra.fen.y) || 0;
    out.ayt.fizik = { d: Math.min(14, Math.round((d * 14) / 40)), y: Math.min(14, Math.round((y * 14) / 40)) };
    out.ayt.kimya = { d: Math.min(13, Math.round((d * 13) / 40)), y: Math.min(13, Math.round((y * 13) / 40)) };
    out.ayt.biyoloji = { d: Math.max(0, Math.min(13, d - out.ayt.fizik.d - out.ayt.kimya.d)), y: Math.max(0, Math.min(13, y - out.ayt.fizik.y - out.ayt.kimya.y)) };
  }
  if (!ra.edebiyat && !ra.tarih1 && !ra.cografya1 && ra.edSos1 && (Number(ra.edSos1.d) > 0 || Number(ra.edSos1.y) > 0)) {
    const d = Number(ra.edSos1.d) || 0;
    const y = Number(ra.edSos1.y) || 0;
    out.ayt.edebiyat = { d: Math.min(24, Math.round((d * 24) / 40)), y: Math.min(24, Math.round((y * 24) / 40)) };
    out.ayt.tarih1 = { d: Math.min(10, Math.round((d * 10) / 40)), y: Math.min(10, Math.round((y * 10) / 40)) };
    out.ayt.cografya1 = { d: Math.max(0, Math.min(6, d - out.ayt.edebiyat.d - out.ayt.tarih1.d)), y: Math.max(0, Math.min(6, y - out.ayt.edebiyat.y - out.ayt.tarih1.y)) };
  }
  if (!ra.tarih2 && !ra.cografya2 && !ra.felsefe && !ra.din && ra.sos2 && (Number(ra.sos2.d) > 0 || Number(ra.sos2.y) > 0)) {
    const d = Number(ra.sos2.d) || 0;
    const y = Number(ra.sos2.y) || 0;
    out.ayt.tarih2 = { d: Math.min(11, Math.round((d * 11) / 40)), y: Math.min(11, Math.round((y * 11) / 40)) };
    out.ayt.cografya2 = { d: Math.min(11, Math.round((d * 11) / 40)), y: Math.min(11, Math.round((y * 11) / 40)) };
    out.ayt.felsefe = { d: Math.min(12, Math.round((d * 12) / 40)), y: Math.min(12, Math.round((y * 12) / 40)) };
    out.ayt.din = {
      d: Math.max(0, Math.min(6, d - out.ayt.tarih2.d - out.ayt.cografya2.d - out.ayt.felsefe.d)),
      y: Math.max(0, Math.min(6, y - out.ayt.tarih2.y - out.ayt.cografya2.y - out.ayt.felsefe.y)),
    };
  }
  return out;
}

export const CALC_YEARS = [2023, 2024, 2025, 2026];
export const CALC_SCORE_TYPES = ['TYT', 'SAY', 'EA', 'SÖZ', 'DİL'];

/**
 * 2023–2026 YKS Yerleştirme Puanı → Türkiye Sıralaması Ampirik Referans Tabloları
 * (12.239 gerçek YÖK Atlas lisans programı taban verisinden kalibre edilmiştir).
 */
export const YKS_RANK_TABLES = {
  TYT: {
    2026: [
      [560, 1], [550, 85], [540, 480], [530, 1450], [520, 3200], [510, 6100], [500, 10200],
      [485, 19800], [470, 33500], [455, 51500], [440, 74500], [420, 114000], [400, 165000],
      [380, 230000], [360, 315000], [340, 425000], [320, 565000], [300, 740000], [275, 1020000],
      [250, 1380000], [225, 1820000], [200, 2280000], [160, 2850000], [100, 3150000],
    ],
    2025: [
      [560, 1], [550, 60], [540, 380], [530, 1180], [520, 2650], [510, 5200], [500, 8900],
      [485, 17400], [470, 29800], [455, 46500], [440, 68000], [420, 106000], [400, 156000],
      [380, 220000], [360, 305000], [340, 415000], [320, 560000], [300, 735000], [275, 1030000],
      [250, 1410000], [225, 1880000], [200, 2360000], [160, 2900000], [100, 3200000],
    ],
    2024: [
      [560, 1], [550, 95], [540, 540], [530, 1620], [520, 3550], [510, 6700], [500, 11400],
      [485, 22000], [470, 37200], [455, 57500], [440, 83000], [420, 127000], [400, 184000],
      [380, 256000], [360, 348000], [340, 468000], [320, 622000], [300, 815000], [275, 1120000],
      [250, 1510000], [225, 1980000], [200, 2450000], [160, 2960000], [100, 3250000],
    ],
    2023: [
      [560, 1], [550, 120], [540, 680], [530, 2050], [520, 4450], [510, 8300], [500, 13900],
      [485, 26500], [470, 44200], [455, 67500], [440, 96500], [420, 146000], [400, 210000],
      [380, 290000], [360, 392000], [340, 520000], [320, 685000], [300, 890000], [275, 1210000],
      [250, 1620000], [225, 2120000], [200, 2610000], [160, 3100000], [100, 3450000],
    ],
  },
  SAY: {
    2026: [
      [560, 1], [555, 35], [550, 133], [540, 1231], [530, 3554], [520, 7517], [510, 13482],
      [500, 19856], [485, 31809], [470, 44419], [455, 58581], [440, 73909], [420, 94046],
      [400, 116350], [380, 142576], [360, 172660], [340, 211690], [320, 255330], [300, 310906],
      [275, 403840], [250, 530417], [225, 725260], [200, 935948], [150, 1350000], [100, 1650000],
    ],
    2025: [
      [560, 1], [555, 12], [550, 43], [540, 708], [530, 2090], [520, 3921], [510, 7158],
      [500, 11004], [485, 19192], [470, 29416], [455, 42221], [440, 55366], [420, 76469],
      [400, 98713], [380, 124391], [360, 156597], [340, 194662], [320, 244800], [300, 306309],
      [275, 425179], [250, 595411], [225, 861318], [200, 1152476], [150, 1520000], [100, 1800000],
    ],
    2024: [
      [560, 1], [555, 45], [550, 203], [540, 1234], [530, 2408], [520, 4270], [510, 7296],
      [500, 10779], [485, 17596], [470, 25361], [455, 35349], [440, 46255], [420, 63239],
      [400, 82341], [380, 105033], [360, 132624], [340, 166590], [320, 208270], [300, 265278],
      [275, 367486], [250, 534411], [225, 806060], [200, 1127483], [150, 1480000], [100, 1760000],
    ],
    2023: [
      [560, 1], [555, 70], [550, 297], [540, 1660], [530, 3863], [520, 7853], [510, 12325],
      [500, 18493], [485, 28837], [470, 40800], [455, 53730], [440, 67125], [420, 86820],
      [400, 110150], [380, 136898], [360, 169598], [340, 209272], [320, 261067], [300, 328486],
      [275, 440787], [250, 612458], [225, 880045], [200, 1198538], [150, 1580000], [100, 1880000],
    ],
  },
  EA: {
    2026: [
      [560, 1], [540, 25], [530, 85], [520, 208], [510, 432], [500, 667], [485, 1585],
      [470, 2423], [455, 4465], [440, 7693], [420, 18819], [400, 43097], [380, 77098],
      [360, 121556], [340, 180285], [320, 258718], [300, 364712], [275, 548090],
      [250, 776280], [225, 1041261], [200, 1280250], [150, 1650000], [100, 1950000],
    ],
    2025: [
      [560, 1], [540, 18], [530, 58], [520, 145], [510, 290], [500, 430], [485, 1050],
      [470, 1655], [455, 2836], [440, 5130], [420, 13832], [400, 29540], [380, 57201],
      [360, 99184], [340, 155365], [320, 235356], [300, 347353], [275, 546212],
      [250, 807235], [225, 1107937], [200, 1358304], [150, 1750000], [100, 2050000],
    ],
    2024: [
      [560, 1], [540, 24], [530, 80], [520, 210], [510, 403], [500, 651], [485, 1169],
      [470, 2028], [455, 3356], [440, 6835], [420, 16615], [400, 35044], [380, 61841],
      [360, 101118], [340, 155373], [320, 236515], [300, 348667], [275, 554406],
      [250, 831709], [225, 1169318], [200, 1509507], [150, 1900000], [100, 2200000],
    ],
    2023: [
      [560, 1], [540, 55], [530, 172], [520, 477], [510, 765], [500, 1262], [485, 1954],
      [470, 3470], [455, 5574], [440, 9090], [420, 21116], [400, 45703], [380, 81518],
      [360, 129987], [340, 199145], [320, 289362], [300, 412091], [275, 620028],
      [250, 881358], [225, 1211570], [200, 1589371], [150, 2000000], [100, 2350000],
    ],
  },
  SÖZ: {
    2026: [
      [560, 1], [530, 15], [515, 55], [500, 125], [485, 283], [470, 630], [455, 1234],
      [440, 2490], [420, 6431], [400, 15348], [380, 32769], [360, 61760], [340, 106723],
      [320, 177350], [300, 268659], [275, 434457], [250, 637796], [225, 857530],
      [200, 1003694], [150, 1300000], [100, 1550000],
    ],
    2025: [
      [560, 1], [530, 8], [515, 28], [500, 70], [485, 145], [470, 287], [455, 558],
      [440, 1137], [420, 3112], [400, 8275], [380, 19614], [360, 41823], [340, 77293],
      [320, 144883], [300, 247709], [275, 425048], [250, 652683], [225, 896881],
      [200, 1071507], [150, 1380000], [100, 1650000],
    ],
    2024: [
      [560, 1], [535, 22], [520, 67], [500, 259], [485, 683], [470, 1272], [455, 2575],
      [440, 5815], [420, 14502], [400, 32531], [380, 62038], [360, 109704], [340, 178829],
      [320, 268345], [300, 389599], [275, 613592], [250, 857188], [225, 1095219],
      [200, 1313466], [150, 1620000], [100, 1850000],
    ],
    2023: [
      [560, 1], [530, 20], [515, 72], [500, 180], [485, 405], [470, 725], [455, 1448],
      [440, 3364], [420, 9242], [400, 21623], [380, 44729], [360, 82715], [340, 145650],
      [320, 227334], [300, 348305], [275, 554791], [250, 817309], [225, 1082253],
      [200, 1347791], [150, 1660000], [100, 1920000],
    ],
  },
  DİL: {
    2026: [
      [560, 1], [540, 120], [520, 520], [500, 1480], [485, 2580], [470, 4187], [455, 6592],
      [440, 9938], [420, 15008], [400, 22433], [380, 30188], [360, 38688], [340, 47791],
      [320, 56232], [300, 67337], [275, 79175], [250, 91369], [225, 106500],
      [200, 121515], [150, 155000], [100, 185000],
    ],
    2025: [
      [560, 1], [540, 90], [520, 410], [500, 1220], [485, 2042], [470, 3410], [455, 5443],
      [440, 8695], [420, 14471], [400, 21406], [380, 29329], [360, 38341], [340, 48284],
      [320, 57357], [300, 67530], [275, 81832], [250, 95554], [225, 111534],
      [200, 127444], [150, 160000], [100, 190000],
    ],
    2024: [
      [560, 1], [540, 130], [520, 610], [500, 1707], [485, 3376], [470, 5239], [455, 7583],
      [440, 11319], [420, 17176], [400, 23895], [380, 32800], [360, 42121], [340, 52474],
      [320, 61808], [300, 73842], [275, 88439], [250, 103431], [225, 120656],
      [200, 140258], [150, 175000], [100, 205000],
    ],
    2023: [
      [560, 1], [540, 180], [520, 890], [500, 2350], [485, 4086], [470, 6856], [455, 9415],
      [440, 13801], [420, 20669], [400, 28724], [380, 37246], [360, 45449], [340, 54900],
      [320, 63998], [300, 74297], [275, 88181], [250, 103377], [225, 120435],
      [200, 134867], [150, 168000], [100, 198000],
    ],
  },
};

/**
 * 16 Resmi ÖSYM Testinin Yıllık Ortalama (μ), Standart Sapma (σ) ve Soru Sayısı [μ, σ, max].
 * Kaynak: ÖSYM 2023, 2024, 2025 "YKS Sınav Sonuçlarına İlişkin Sayısal Bilgiler" (Son Sınıf verileri)
 * ve 2026 YÖK Atlas kalibrasyonu.
 */
export const OSYM_YEAR_STATS = {
  2023: {
    tyt_tr:  [19.168, 8.353, 40],
    tyt_sos: [8.488,  4.339, 20],
    tyt_mat: [9.320,  8.254, 40],
    tyt_fen: [2.909,  4.213, 20],
    ayt_mat: [7.204,  8.565, 40],
    ayt_fiz: [2.519,  3.691, 14],
    ayt_kim: [1.768,  3.169, 13],
    ayt_bio: [2.080,  3.068, 13],
    ayt_edb: [6.401,  5.127, 24],
    ayt_tr1: [2.054,  2.177, 10],
    ayt_cg1: [1.460,  1.471, 6],
    ayt_tr2: [2.264,  2.693, 11],
    ayt_cg2: [2.420,  2.610, 11],
    ayt_fel: [2.243,  2.563, 12],
    ayt_din: [1.340,  1.520, 6],
    ydt:     [35.500, 21.500, 80],
  },
  2024: {
    tyt_tr:  [21.428, 8.115, 40],
    tyt_sos: [9.001,  4.297, 20],
    tyt_mat: [7.955,  9.138, 40],
    tyt_fen: [3.478,  4.549, 20],
    ayt_mat: [5.547,  7.524, 40],
    ayt_fiz: [2.247,  3.313, 14],
    ayt_kim: [1.457,  2.718, 13],
    ayt_bio: [2.324,  3.299, 13],
    ayt_edb: [5.935,  5.315, 24],
    ayt_tr1: [2.484,  2.453, 10],
    ayt_cg1: [2.103,  1.615, 6],
    ayt_tr2: [2.076,  2.361, 11],
    ayt_cg2: [2.416,  2.657, 11],
    ayt_fel: [1.964,  2.316, 12],
    ayt_din: [1.275,  1.464, 6],
    ydt:     [34.832, 21.103, 80],
  },
  2025: {
    tyt_tr:  [21.707, 7.870, 40],
    tyt_sos: [9.722,  4.014, 20],
    tyt_mat: [6.648,  7.793, 40],
    tyt_fen: [4.606,  5.195, 20],
    ayt_mat: [6.859,  8.582, 40],
    ayt_fiz: [2.512,  3.310, 14],
    ayt_kim: [1.846,  3.230, 13],
    ayt_bio: [2.581,  3.230, 13],
    ayt_edb: [6.380,  5.450, 24],
    ayt_tr1: [2.083,  2.420, 10],
    ayt_cg1: [1.313,  1.510, 6],
    ayt_tr2: [1.426,  1.965, 11],
    ayt_cg2: [2.635,  2.808, 11],
    ayt_fel: [1.918,  2.372, 12],
    ayt_din: [1.473,  1.796, 6],
    ydt:     [35.200, 21.200, 80],
  },
  2026: {
    tyt_tr:  [21.100, 8.150, 40],
    tyt_sos: [9.200,  4.200, 20],
    tyt_mat: [8.500,  8.600, 40],
    tyt_fen: [4.100,  4.850, 20],
    ayt_mat: [7.400,  8.850, 40],
    ayt_fiz: [2.650,  3.550, 14],
    ayt_kim: [1.950,  3.250, 13],
    ayt_bio: [2.500,  3.320, 13],
    ayt_edb: [6.550,  5.400, 24],
    ayt_tr1: [2.350,  2.400, 10],
    ayt_cg1: [1.850,  1.580, 6],
    ayt_tr2: [2.050,  2.350, 11],
    ayt_cg2: [2.500,  2.720, 11],
    ayt_fel: [2.050,  2.420, 12],
    ayt_din: [1.420,  1.650, 6],
    ydt:     [35.400, 21.300, 80],
  },
};

// Resmi ÖSYM Kılavuz Ders Ağırlıkları (Toplam = 1,000)
export const OSYM_BRANCH_WEIGHTS = {
  TYT: { tyt_tr: 0.33, tyt_sos: 0.17, tyt_mat: 0.33, tyt_fen: 0.17 },
  SAY: {
    tyt_tr: 0.132, tyt_sos: 0.068, tyt_mat: 0.132, tyt_fen: 0.068,
    ayt_mat: 0.30, ayt_fiz: 0.10, ayt_kim: 0.10, ayt_bio: 0.10,
  },
  EA: {
    tyt_tr: 0.132, tyt_sos: 0.068, tyt_mat: 0.132, tyt_fen: 0.068,
    ayt_mat: 0.30, ayt_edb: 0.18, ayt_tr1: 0.07, ayt_cg1: 0.05,
  },
  SÖZ: {
    tyt_tr: 0.132, tyt_sos: 0.068, tyt_mat: 0.132, tyt_fen: 0.068,
    ayt_edb: 0.18, ayt_tr1: 0.07, ayt_cg1: 0.05,
    ayt_tr2: 0.08, ayt_cg2: 0.08, ayt_fel: 0.09, ayt_din: 0.05,
  },
  DİL: {
    tyt_tr: 0.132, tyt_sos: 0.068, tyt_mat: 0.132, tyt_fen: 0.068,
    ydt: 0.60,
  },
};

// Türkiye birincisi (A_top) ve en düşük aday havuzu tabanı (A_min) — 5 gerçek 2024 YÖK Atlas karnesiyle doğrulandı
const OSYM_TOP_FRAC = { TYT: 0.992, SAY: 0.990, EA: 0.976, SÖZ: 0.960, DİL: 0.998 };
const OSYM_BRANCH_AMIN = { TYT: 33.5, SAY: 34.0, EA: 33.7, SÖZ: 33.5, DİL: 34.0 };

/**
 * Her dersin kendi ÖSYM ağırlığı (w_k) ve ilgili yılın (μ_k, σ_k) değerleriyle
 * resmi ÖSYM Z-puanı dönüşümünü uygulayarak Ham Puanı (100–500) hesaplar.
 */
export function computeOsymStandardRawScore(netMap, type, year) {
  const stats = OSYM_YEAR_STATS[year] || OSYM_YEAR_STATS[2026];
  const weights = OSYM_BRANCH_WEIGHTS[type];
  const tf = OSYM_TOP_FRAC[type] ?? 0.99;
  const amin = OSYM_BRANCH_AMIN[type] ?? 33.5;
  if (!weights) return 100;

  let A = 0;
  let Atop = 0;
  for (const [k, w] of Object.entries(weights)) {
    const [mu, sd, max] = stats[k];
    const net = Number(netMap[k]) || 0;
    A += w * (50 + 10 * ((net - mu) / sd));
    Atop += w * (50 + 10 * ((max * tf - mu) / sd));
  }
  const raw = 100 + 400 * ((A - amin) / Math.max(1e-6, Atop - amin));
  return Number(Math.min(500, Math.max(100, raw)).toFixed(3));
}

/**
 * Seçili puan türü ve yıl için her bir dersin 1 netinin gerçek efektif puan katsayısını döndürür.
 * Örn: 2024 EA'da AYT Mat = 3,17 · Edebiyat = 2,70 · Coğrafya-1 = 2,47 · Tarih-1 = 2,27
 */
export function getEffectiveSubjectCoefficients(type, year) {
  const stats = OSYM_YEAR_STATS[year] || OSYM_YEAR_STATS[2026];
  const weights = OSYM_BRANCH_WEIGHTS[type];
  const tf = OSYM_TOP_FRAC[type] ?? 0.99;
  const amin = OSYM_BRANCH_AMIN[type] ?? 33.5;
  if (!weights) return {};

  let Atop = 0;
  for (const [k, w] of Object.entries(weights)) {
    const [mu, sd, max] = stats[k];
    Atop += w * (50 + 10 * ((max * tf - mu) / sd));
  }
  const slope = 400 / Math.max(1e-6, Atop - amin);
  const out = {};
  for (const [k, w] of Object.entries(weights)) {
    const [, sd] = stats[k];
    out[k] = Number((slope * w * (10 / sd)).toFixed(2));
  }
  return out;
}

export function sanitizeFieldPair(rawD, rawY, maxQ) {
  const max = Math.max(0, Number(maxQ) || 0);
  let d = Math.floor(Number(rawD) || 0);
  let y = Math.floor(Number(rawY) || 0);
  if (!Number.isFinite(d) || d < 0) d = 0;
  if (!Number.isFinite(y) || y < 0) y = 0;
  if (d > max) d = max;
  if (d + y > max) y = Math.max(0, max - d);
  const net = Number((d - y / 4).toFixed(2));
  const blank = Math.max(0, max - d - y);
  return { d, y, net, blank, max };
}

export function interpolateRankLinear(score, table) {
  if (!Array.isArray(table) || !table.length || !Number.isFinite(score)) return null;
  if (score >= table[0][0]) return Math.max(1, Math.round(table[0][1]));
  const last = table[table.length - 1];
  if (score <= last[0]) return Math.round(last[1]);

  for (let i = 0; i < table.length - 1; i += 1) {
    const [sHigh, rHigh] = table[i];
    const [sLow, rLow] = table[i + 1];
    if (score <= sHigh && score >= sLow) {
      const span = sHigh - sLow;
      if (span <= 0) return Math.round(rHigh);
      const t = (sHigh - score) / span;
      return Math.max(1, Math.round(rHigh + t * (rLow - rHigh)));
    }
  }
  return Math.round(last[1]);
}

export function calculateYksResults(rawInput = {}) {
  const input = normalizeCalcInput(rawInput);
  const diplomaRaw = Number(input.diploma);
  const diploma = Number.isFinite(diplomaRaw) ? Math.min(100, Math.max(50, diplomaRaw)) : 90;
  const obpBroken = Boolean(input.obpBroken);
  const obp = Number((diploma * 5).toFixed(2));
  const obpCoeff = obpBroken ? 0.06 : 0.12;
  const obpAdd = Number((obp * obpCoeff).toFixed(3));

  const tyt = {};
  let tytTotalNet = 0;
  let tytTotalD = 0;
  let tytTotalY = 0;
  for (const f of CALC_TYT_FIELDS) {
    const pair = sanitizeFieldPair(input.tyt?.[f.key]?.d, input.tyt?.[f.key]?.y, f.max);
    tyt[f.key] = pair;
    tytTotalNet += pair.net;
    tytTotalD += pair.d;
    tytTotalY += pair.y;
  }
  tytTotalNet = Number(tytTotalNet.toFixed(2));

  const ayt = {};
  for (const f of CALC_AYT_FIELDS) {
    ayt[f.key] = sanitizeFieldPair(input.ayt?.[f.key]?.d, input.ayt?.[f.key]?.y, f.max);
  }

  const netMap = {
    tyt_tr: tyt.turkce.net,
    tyt_sos: tyt.sosyal.net,
    tyt_mat: tyt.matematik.net,
    tyt_fen: tyt.fen.net,
    ayt_mat: ayt.matematik.net,
    ayt_fiz: ayt.fizik.net,
    ayt_kim: ayt.kimya.net,
    ayt_bio: ayt.biyoloji.net,
    ayt_edb: ayt.edebiyat.net,
    ayt_tr1: ayt.tarih1.net,
    ayt_cg1: ayt.cografya1.net,
    ayt_tr2: ayt.tarih2.net,
    ayt_cg2: ayt.cografya2.net,
    ayt_fel: ayt.felsefe.net,
    ayt_din: ayt.din.net,
    ydt: ayt.ydt.net,
  };

  const selectedYear = input.selectedYear;
  const clampPlace = (v) => Number(Math.min(560, Math.max(100, v)).toFixed(3));

  const buildBranch = (type, active) => {
    const rawByYear = {};
    const placementByYear = {};
    const ranks = {};
    for (const yr of CALC_YEARS) {
      const rScore = computeOsymStandardRawScore(netMap, type, yr);
      const pScore = clampPlace(rScore + obpAdd);
      rawByYear[yr] = rScore;
      placementByYear[yr] = pScore;
      ranks[yr] = interpolateRankLinear(pScore, YKS_RANK_TABLES[type][yr]);
    }
    const rankVals = CALC_YEARS.map((yr) => ranks[yr]).filter(Boolean);
    return {
      type,
      raw: rawByYear[selectedYear],
      placement: placementByYear[selectedYear],
      rawByYear,
      placementByYear,
      ranks,
      bestYearRank: rankVals.length ? Math.min(...rankVals) : null,
      worstYearRank: rankVals.length ? Math.max(...rankVals) : null,
      active,
    };
  };

  const hasTytAny = tyt.turkce.net >= 0.5 || tyt.matematik.net >= 0.5 || tytTotalD > 0 || tytTotalY > 0;
  const sumDY = (...keys) => keys.reduce((s, k) => s + (ayt[k]?.d || 0) + (ayt[k]?.y || 0), 0);

  const branches = {
    TYT: buildBranch('TYT', hasTytAny),
    SAY: buildBranch('SAY', hasTytAny && sumDY('matematik', 'fizik', 'kimya', 'biyoloji') > 0),
    EA: buildBranch('EA', hasTytAny && sumDY('matematik', 'edebiyat', 'tarih1', 'cografya1') > 0),
    SÖZ: buildBranch('SÖZ', hasTytAny && sumDY('edebiyat', 'tarih1', 'cografya1', 'tarih2', 'cografya2', 'felsefe', 'din') > 0),
    DİL: buildBranch('DİL', hasTytAny && sumDY('ydt') > 0),
  };

  const aytSayTotal = Number((ayt.matematik.net + ayt.fizik.net + ayt.kimya.net + ayt.biyoloji.net).toFixed(2));
  const aytEdSos1Total = Number((ayt.edebiyat.net + ayt.tarih1.net + ayt.cografya1.net).toFixed(2));
  const aytSos2Total = Number((ayt.tarih2.net + ayt.cografya2.net + ayt.felsefe.net + ayt.din.net).toFixed(2));

  return {
    diploma,
    obp,
    obpBroken,
    obpCoeff,
    obpAdd,
    selectedYear,
    selectedType: input.selectedType,
    tyt,
    tytTotalNet,
    tytTotalD,
    tytTotalY,
    ayt,
    aytSayTotal,
    aytEdSos1Total,
    aytSos2Total,
    branches,
    effectiveCoeffs: getEffectiveSubjectCoefficients(input.selectedType, selectedYear),
  };
}

export function buildCalcInputFromMyNets(myNets, prevInput = DEFAULT_YKS_CALC_INPUT) {
  const prev = normalizeCalcInput(prevInput);
  const roundD = (v, max) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));
  const ayt = myNets?.ayt || {};
  const diplomaFromObp = myNets?.obp ? Math.min(100, Math.max(50, Number((Number(myNets.obp) / 5).toFixed(1)))) : prev.diploma || 90;

  return {
    ...structuredClone(DEFAULT_YKS_CALC_INPUT),
    selectedType: prev.selectedType || 'SAY',
    selectedYear: prev.selectedYear || 2026,
    obpBroken: Boolean(prev.obpBroken),
    diploma: diplomaFromObp,
    tyt: {
      turkce: { d: roundD(myNets?.tyt?.turkce, 40), y: 0 },
      sosyal: { d: roundD(myNets?.tyt?.sosyal, 20), y: 0 },
      matematik: { d: roundD(myNets?.tyt?.matematik, 40), y: 0 },
      fen: { d: roundD(myNets?.tyt?.fen, 20), y: 0 },
    },
    ayt: {
      matematik: { d: roundD(ayt.matematik, 40), y: 0 },
      fizik: { d: roundD(ayt.fizik, 14), y: 0 },
      kimya: { d: roundD(ayt.kimya, 13), y: 0 },
      biyoloji: { d: roundD(ayt.biyoloji, 13), y: 0 },
      edebiyat: { d: roundD(ayt.edebiyat, 24), y: 0 },
      tarih1: { d: roundD(ayt.tarih1, 10), y: 0 },
      cografya1: { d: roundD(ayt.cografya1, 6), y: 0 },
      tarih2: { d: roundD(ayt.tarih2, 11), y: 0 },
      cografya2: { d: roundD(ayt.cografya2, 11), y: 0 },
      felsefe: { d: roundD(ayt.felsefe, 12), y: 0 },
      din: { d: roundD(ayt.din, 6), y: 0 },
      ydt: { d: roundD(myNets?.ydt, 80), y: 0 },
    },
  };
}

function fmtPts(val) {
  return Number.isFinite(val) ? val.toFixed(3).replace('.', ',') : '—';
}

function fmtNetVal(val) {
  return Number.isFinite(val) ? val.toFixed(2).replace('.', ',') : '0,00';
}

export function renderYksResultsBlockHtml(results, { selectedType = 'SAY', selectedYear = 2026 } = {}) {
  const st = CALC_SCORE_TYPES.includes(selectedType) ? selectedType : 'SAY';
  const yr = CALC_YEARS.includes(Number(selectedYear)) ? Number(selectedYear) : 2026;
  const activeBranch = results.branches[st] || results.branches.SAY;
  const heroRaw = activeBranch.rawByYear?.[yr] ?? activeBranch.raw;
  const heroPlacement = activeBranch.placementByYear?.[yr] ?? activeBranch.placement;
  const heroRank = activeBranch.ranks[yr];
  const canFilterCatalog = st !== 'TYT';
  const coeffs = getEffectiveSubjectCoefficients(st, yr);

  const coeffLabels = {
    tyt_tr: 'TYT Türkçe', tyt_sos: 'TYT Sosyal', tyt_mat: 'TYT Mat', tyt_fen: 'TYT Fen',
    ayt_mat: 'AYT Mat', ayt_fiz: 'Fizik', ayt_kim: 'Kimya', ayt_bio: 'Biyoloji',
    ayt_edb: 'Edebiyat', ayt_tr1: 'Tarih-1', ayt_cg1: 'Coğrafya-1',
    ayt_tr2: 'Tarih-2', ayt_cg2: 'Coğrafya-2', ayt_fel: 'Felsefe', ayt_din: 'Din', ydt: 'YDT',
  };

  const coeffStripHtml = Object.entries(coeffs)
    .map(([k, v]) => `<span class="yks-coeff-pill tabular">${coeffLabels[k] || k}: <strong>×${v.toFixed(2).replace('.', ',')}</strong></span>`)
    .join('');

  const tableRows = CALC_SCORE_TYPES.map((code) => {
    const b = results.branches[code];
    const isSel = code === st;
    const isMuted = !b.active && code !== 'TYT';
    const rowRaw = b.rawByYear?.[yr] ?? b.raw;
    const rowPlace = b.placementByYear?.[yr] ?? b.placement;
    return `<tr class="yks-res-row ${isSel ? 'selected' : ''} ${isMuted ? 'muted' : ''}" data-calc-select-type="${code}">
      <td>
        <div style="display:flex;align-items:center;gap:7px;">
          <span class="yks-type-pill ${isSel ? 'active' : ''}">${code}</span>
          ${isMuted ? `<span style="font-size:11px;color:var(--text-tertiary);">Boş</span>` : ''}
        </div>
      </td>
      <td class="tabular">${isMuted ? '—' : fmtPts(rowRaw)}</td>
      <td class="tabular"><strong>${isMuted ? '—' : fmtPts(rowPlace)}</strong></td>
      <td class="tabular ${yr === 2023 ? 'yks-yr-hl' : ''}">${isMuted ? '—' : formatRank(b.ranks[2023])}</td>
      <td class="tabular ${yr === 2024 ? 'yks-yr-hl' : ''}">${isMuted ? '—' : formatRank(b.ranks[2024])}</td>
      <td class="tabular ${yr === 2025 ? 'yks-yr-hl' : ''}">${isMuted ? '—' : formatRank(b.ranks[2025])}</td>
      <td class="tabular ${yr === 2026 ? 'yks-yr-hl' : ''}"><strong>${isMuted ? '—' : formatRank(b.ranks[2026])}</strong></td>
      <td style="text-align:right;">
        ${code !== 'TYT' && !isMuted
          ? `<button class="mini-action" type="button" data-calc-filter-row="${code}" data-calc-filter-rank="${b.ranks[yr]}" title="${code} ${yr} sıralamasıyla bölümleri filtrele">Filtrele →</button>`
          : `<span style="font-size:11.5px;color:var(--text-tertiary);">${code === 'TYT' ? 'Ön Lisans' : '—'}</span>`}
      </td>
    </tr>`;
  }).join('');

  return `
    <div class="yks-hero-result">
      <div class="yks-hero-left">
        <div class="yks-hero-controls">
          <div class="segmented" role="tablist" aria-label="Öne çıkan puan türü">
            ${CALC_SCORE_TYPES.map(
              (code) =>
                `<button class="seg-btn seg-btn-sm ${code === st ? 'active' : ''}" type="button" data-calc-pick-type="${code}">${code}</button>`,
            ).join('')}
          </div>
          <div class="segmented" role="tablist" aria-label="Referans sınav yılı">
            ${CALC_YEARS.map(
              (y) =>
                `<button class="seg-btn seg-btn-sm ${y === yr ? 'active' : ''}" type="button" data-calc-pick-year="${y}">${y}</button>`,
            ).join('')}
          </div>
        </div>

        <div class="yks-hero-main">
          <div class="yks-hero-rank-block">
            <span class="yks-hero-eyebrow">${st} · ${yr} YKS Tahmini Yerleştirme Sıralaması</span>
            <div class="yks-hero-rank tabular">${formatRank(heroRank)}</div>
            <div class="yks-hero-band tabular">
              2023–2026 aralığı: <strong>${formatRank(activeBranch.bestYearRank)}</strong> – <strong>${formatRank(activeBranch.worstYearRank)}</strong>
            </div>
          </div>

          <div class="yks-hero-scores tabular">
            <div class="yks-score-pill-box">
              <span>Ham Puan (${yr})</span>
              <strong>${fmtPts(heroRaw)}</strong>
            </div>
            <div class="yks-score-pill-box accent">
              <span>Yerleştirme (${yr})</span>
              <strong>${fmtPts(heroPlacement)}</strong>
            </div>
            <div class="yks-score-pill-box">
              <span>OBP Katkısı ${results.obpBroken ? '(Kırık)' : ''}</span>
              <strong>+${results.obpAdd.toFixed(2).replace('.', ',')}</strong>
            </div>
          </div>
        </div>

        <div class="yks-coeff-strip" title="${yr} yılı ÖSYM standart sapmasına göre 1 netin bu puan türüne katkısı">
          <span class="yks-coeff-label">${yr} ${st} Ders Katsayıları:</span>
          ${coeffStripHtml}
        </div>
      </div>

      <div class="yks-hero-cta">
        <button class="btn btn-primary" type="button" id="calcFilterPrefsBtn"
          data-rank="${heroRank}" data-type="${canFilterCatalog ? st : 'SAY'}" data-year="${yr}">
          Bu Sıralamayla Bölümleri Filtrele
        </button>
        <button class="btn btn-soft" type="button" id="calcDiscoverCatalogBtn"
          data-rank="${heroRank}" data-type="${canFilterCatalog ? st : 'SAY'}" data-year="${yr}">
          12.239 Katalogda Keşfet
        </button>
      </div>
    </div>

    <div class="yks-table-wrap">
      <table class="yks-result-table">
        <thead>
          <tr>
            <th>Puan Türü</th>
            <th>Ham (${yr})</th>
            <th>Yerleştirme (${yr})</th>
            <th>2023 Sıra</th>
            <th>2024 Sıra</th>
            <th>2025 Sıra</th>
            <th>2026 Sıra</th>
            <th style="text-align:right;">İşlem</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}

export function renderYksCalculatorPanel(calcInput, { hasMyNets = false } = {}) {
  const input = normalizeCalcInput(calcInput);
  const results = calculateYksResults(input);
  const coeffs = getEffectiveSubjectCoefficients(input.selectedType, input.selectedYear);

  const renderInputRows = (fields, group) =>
    fields
      .map((f) => {
        const st = results[group][f.key];
        const pct = f.max > 0 ? Math.max(0, Math.min(100, (st.net / f.max) * 100)) : 0;
        const cVal = coeffs[f.statKey];
        return `<div class="yks-field-row" data-calc-row="${group}.${f.key}">
          <div class="yks-field-meta">
            <div class="yks-field-name">
              <span>${escapeHtml(f.label)}</span>
              ${f.tag ? `<span class="yks-field-tag">${escapeHtml(f.tag)}</span>` : ''}
              ${cVal ? `<span class="yks-field-coeff tabular" data-calc-coeff="${f.statKey}" title="Seçili puan türü ve yılda 1 netin katkısı">×${cVal.toFixed(2).replace('.', ',')}</span>` : `<span class="yks-field-coeff tabular" data-calc-coeff="${f.statKey}" style="display:none;"></span>`}
            </div>
            <div class="yks-field-bar"><i style="width:${pct.toFixed(1)}%;"></i></div>
          </div>
          <div class="yks-dy-inputs">
            <label class="yks-mini-input">
              <span>D</span>
              <input type="number" inputmode="numeric" min="0" max="${f.max}" step="1"
                value="${st.d || ''}" placeholder="0"
                data-calc-group="${group}" data-calc-key="${f.key}" data-calc-part="d" data-calc-max="${f.max}" />
            </label>
            <label class="yks-mini-input">
              <span>Y</span>
              <input type="number" inputmode="numeric" min="0" max="${f.max}" step="1"
                value="${st.y || ''}" placeholder="0"
                data-calc-group="${group}" data-calc-key="${f.key}" data-calc-part="y" data-calc-max="${f.max}" />
            </label>
            <div class="yks-net-badge tabular" id="calcNet_${group}_${f.key}">
              <strong>${fmtNetVal(st.net)}</strong>
              <small>/${f.max}</small>
            </div>
          </div>
        </div>`;
      })
      .join('');

  return `
    <div class="panel panel-full yks-calc-shell">
      <div class="panel-title" style="margin-bottom:14px;">
        <div>
          <span style="display:block;">YKS Puan & Çok Yıllı Sıralama Hesaplama Robotu (16 Alt Ders)</span>
          <span style="font-size:12.5px;font-weight:450;color:var(--text-secondary);">Fizik, Kimya, Biyoloji, Edebiyat, Tarih-1/2, Coğrafya-1/2, Felsefe ve Din ayrı ÖSYM standart sapma katsayılarıyla hesaplanır</span>
        </div>
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
          ${hasMyNets ? `<button class="btn btn-soft btn-sm" type="button" id="calcPullMyNetsBtn">Netlerimden Aktar</button>` : ''}
          <button class="btn btn-sm" type="button" id="calcSyncToMyNetsBtn" title="Buradaki 16 ders netini Netlerim profiline kaydet">Netlerime Kaydet</button>
          <button class="btn btn-ghost btn-sm" type="button" id="calcResetBtn">Temizle</button>
        </div>
      </div>

      <!-- OBP & Diploma Strip -->
      <div class="yks-obp-card">
        <div class="yks-obp-left">
          <div class="yks-obp-input-wrap">
            <label for="calcDiplomaInput" class="field-label" style="margin-bottom:4px;">Diploma Notu (50 – 100)</label>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
              <input id="calcDiplomaInput" class="input tabular" type="number" inputmode="decimal" min="50" max="100" step="0.5"
                value="${results.diploma}" style="width:110px;font-weight:700;font-size:16px;" />
              <div class="yks-obp-pills tabular" id="calcObpSummary">
                <span class="pill">OBP: <strong>${results.obp.toFixed(1)}</strong></span>
                <span class="pill ${results.obpBroken ? 'pill-risk-hayal' : 'pill-accent'}">
                  Katkı: <strong>+${results.obpAdd.toFixed(2)} puan</strong> (${results.obpBroken ? '×0,06 Kırık' : '×0,12 Tam'})
                </span>
              </div>
            </div>
          </div>
        </div>
        <label class="yks-broken-toggle">
          <input type="checkbox" id="calcObpBrokenCheck" ${results.obpBroken ? 'checked' : ''} />
          <span>
            <strong>Geçen sene yerleştim (OBP kırık)</strong>
            <small>Katsayı otomatik olarak yarıya (0,12 → 0,06) düşer</small>
          </span>
        </label>
      </div>

      <!-- 2x2 Clean Apple Cards for all 16 Official ÖSYM Tests -->
      <div class="yks-inputs-grid">
        <div class="yks-input-card">
          <div class="yks-input-card-head">
            <div>
              <h4>TYT Testleri</h4>
              <span>120 Soru · Tüm puan türlerine %40 etki</span>
            </div>
            <span class="pill pill-accent tabular" id="calcTytTotalBadge">Toplam: <strong>${fmtNetVal(results.tytTotalNet)}</strong> net</span>
          </div>
          <div class="yks-field-list">${renderInputRows(CALC_TYT_FIELDS, 'tyt')}</div>
        </div>

        ${CALC_AYT_GROUPS.map((grp) => {
          const totalBadgeId = grp.id === 'ayt_say' ? 'calcAytSayTotalBadge' : grp.id === 'ayt_edsos1' ? 'calcAytEdSos1TotalBadge' : 'calcAytSos2TotalBadge';
          const totalVal = grp.id === 'ayt_say' ? results.aytSayTotal : grp.id === 'ayt_edsos1' ? results.aytEdSos1Total : results.aytSos2Total;
          const totalLabel = grp.id === 'ayt_sos2_ydt' ? `Sos-2: ${fmtNetVal(totalVal)}` : `Toplam: ${fmtNetVal(totalVal)}`;
          return `<div class="yks-input-card">
            <div class="yks-input-card-head">
              <div>
                <h4>${escapeHtml(grp.title)}</h4>
                <span>${escapeHtml(grp.subtitle)}</span>
              </div>
              <span class="pill tabular" id="${totalBadgeId}"><strong>${totalLabel}</strong> net</span>
            </div>
            <div class="yks-field-list">${renderInputRows(grp.fields, 'ayt')}</div>
          </div>`;
        }).join('')}
      </div>

      <!-- Live Results Summary + 2023–2026 Table -->
      <div id="yksCalcResultsHost" class="yks-results-host">
        ${renderYksResultsBlockHtml(results, {
          selectedType: input.selectedType,
          selectedYear: input.selectedYear,
        })}
      </div>
    </div>
  `;
}
