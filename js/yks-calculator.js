/**
 * TercihAtlas — YKS Puan & Çok Yıllı Sıralama Hesaplama Robotu (Ertan Sinan Şahin Mantığı)
 * %100 İstemci Tarafı · ÖSYM Standart Katsayıları · 2023–2026 Gerçek YÖK Atlas Kalibrasyonlu
 * Lineer İnterpolasyon Motoru
 */

import { escapeHtml, formatRank } from './utils.js';

export const CALC_TYT_FIELDS = [
  { key: 'turkce', label: 'Türkçe', max: 40 },
  { key: 'sosyal', label: 'Sosyal Bilimler', max: 20 },
  { key: 'matematik', label: 'Temel Matematik', max: 40 },
  { key: 'fen', label: 'Fen Bilimleri', max: 20 },
];

export const CALC_AYT_FIELDS = [
  { key: 'matematik', label: 'AYT Matematik', max: 40, tag: 'SAY · EA' },
  { key: 'fen', label: 'AYT Fen Bilimleri', max: 40, tag: 'SAY' },
  { key: 'edSos1', label: 'Edebiyat-Sosyal-1', max: 40, tag: 'EA · SÖZ' },
  { key: 'sos2', label: 'Sosyal Bilimler-2', max: 40, tag: 'SÖZ' },
  { key: 'ydt', label: 'YDT (Yabancı Dil)', max: 80, tag: 'DİL' },
];

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
    fen: { d: 32, y: 3 },
    edSos1: { d: 0, y: 0 },
    sos2: { d: 0, y: 0 },
    ydt: { d: 0, y: 0 },
  },
};

/**
 * 2023–2026 YKS Yerleştirme Puanı → Türkiye Sıralaması Referans Tabloları.
 * SAY, EA, SÖZ, DİL eğrileri 2023–2026 gerçek YÖK Atlas lisans taban verileriyle kalibre edilmiştir;
 * TYT eğrileri ÖSYM 2023–2026 Y-TYT yığılma dağılımına göre kalibre edilmiştir.
 * Her dizi puan azalan sırada ([yerlestirmePuani, siralama]) tutulur.
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

export const CALC_YEARS = [2023, 2024, 2025, 2026];
export const CALC_SCORE_TYPES = ['TYT', 'SAY', 'EA', 'SÖZ', 'DİL'];

/**
 * Doğru ve Yanlış sayılarını soru limitine göre doğrular (D + Y <= max)
 * ve Net = Doğru - (Yanlış / 4) formülünü uygular.
 */
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

/**
 * Verilen puan-sıralama referans dizisinde (puan azalan sırada)
 * parçalı lineer interpolasyon ile hassas sıralama tahmini yapar.
 */
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
      const t = (sHigh - score) / span; // 0 at sHigh, 1 at sLow
      const interpolated = rHigh + t * (rLow - rHigh);
      return Math.max(1, Math.round(interpolated));
    }
  }
  return Math.round(last[1]);
}

/**
 * ÖSYM standart katsayılarıyla TYT, SAY, EA, SÖZ ve DİL için
 * Ham Puan, Yerleştirme Puanı ve 2023–2026 tahmini sıralamalarını hesaplar.
 */
export function calculateYksResults(rawInput = {}) {
  const diplomaRaw = Number(rawInput.diploma);
  const diploma = Number.isFinite(diplomaRaw) ? Math.min(100, Math.max(50, diplomaRaw)) : 90;
  const obpBroken = Boolean(rawInput.obpBroken);
  const obp = Number((diploma * 5).toFixed(2));
  const obpCoeff = obpBroken ? 0.06 : 0.12;
  const obpAdd = Number((obp * obpCoeff).toFixed(3));

  const tyt = {};
  let tytTotalNet = 0;
  let tytTotalD = 0;
  let tytTotalY = 0;
  for (const f of CALC_TYT_FIELDS) {
    const pair = sanitizeFieldPair(rawInput.tyt?.[f.key]?.d, rawInput.tyt?.[f.key]?.y, f.max);
    tyt[f.key] = pair;
    tytTotalNet += pair.net;
    tytTotalD += pair.d;
    tytTotalY += pair.y;
  }
  tytTotalNet = Number(tytTotalNet.toFixed(2));

  const ayt = {};
  for (const f of CALC_AYT_FIELDS) {
    ayt[f.key] = sanitizeFieldPair(rawInput.ayt?.[f.key]?.d, rawInput.ayt?.[f.key]?.y, f.max);
  }

  // ÖSYM Standart Katsayıları (Ham Puanlar: 100 – 500)
  const clampRaw = (v) => Number(Math.min(500, Math.max(100, v)).toFixed(3));
  const clampPlace = (v) => Number(Math.min(560, Math.max(100, v)).toFixed(3));

  const tytRaw = clampRaw(
    100 +
      tyt.turkce.net * 3.3 +
      tyt.sosyal.net * 3.4 +
      tyt.matematik.net * 3.3 +
      tyt.fen.net * 3.4,
  );

  // AYT/YDT puanlarında %40 TYT katkısı (max 160 puan) + %60 AYT/YDT katkısı (max 240 puan)
  const tyt40 =
    tyt.turkce.net * 1.32 +
    tyt.sosyal.net * 1.36 +
    tyt.matematik.net * 1.32 +
    tyt.fen.net * 1.36;

  const sayRaw = clampRaw(100 + tyt40 + ayt.matematik.net * 3.0 + ayt.fen.net * 3.0);
  const eaRaw = clampRaw(100 + tyt40 + ayt.matematik.net * 3.0 + ayt.edSos1.net * 3.0);
  const sozRaw = clampRaw(100 + tyt40 + ayt.edSos1.net * 3.0 + ayt.sos2.net * 3.0);
  const dilRaw = clampRaw(100 + tyt40 + ayt.ydt.net * 3.0);

  const buildBranch = (type, rawScore, active) => {
    const placement = clampPlace(rawScore + obpAdd);
    const ranks = {};
    for (const yr of CALC_YEARS) {
      ranks[yr] = interpolateRankLinear(placement, YKS_RANK_TABLES[type][yr]);
    }
    const rankVals = CALC_YEARS.map((yr) => ranks[yr]).filter(Boolean);
    return {
      type,
      raw: rawScore,
      placement,
      ranks,
      bestYearRank: rankVals.length ? Math.min(...rankVals) : null,
      worstYearRank: rankVals.length ? Math.max(...rankVals) : null,
      active,
    };
  };

  const hasTytAny = tytTotalD > 0 || tytTotalY > 0;
  const branches = {
    TYT: buildBranch('TYT', tytRaw, hasTytAny),
    SAY: buildBranch('SAY', sayRaw, ayt.matematik.d + ayt.matematik.y + ayt.fen.d + ayt.fen.y > 0),
    EA: buildBranch('EA', eaRaw, ayt.matematik.d + ayt.matematik.y + ayt.edSos1.d + ayt.edSos1.y > 0),
    SÖZ: buildBranch('SÖZ', sozRaw, ayt.edSos1.d + ayt.edSos1.y + ayt.sos2.d + ayt.sos2.y > 0),
    DİL: buildBranch('DİL', dilRaw, ayt.ydt.d + ayt.ydt.y > 0),
  };

  return {
    diploma,
    obp,
    obpBroken,
    obpCoeff,
    obpAdd,
    tyt,
    tytTotalNet,
    tytTotalD,
    tytTotalY,
    ayt,
    branches,
  };
}

/**
 * Mevcut TercihAtlas state.myNets verisini hesaplayıcı formatına dönüştürür.
 */
export function buildCalcInputFromMyNets(myNets, prevInput = DEFAULT_YKS_CALC_INPUT) {
  const roundD = (v, max) => Math.min(max, Math.max(0, Math.round(Number(v) || 0)));
  const ayt = myNets?.ayt || {};
  const fenSum = (Number(ayt.fizik) || 0) + (Number(ayt.kimya) || 0) + (Number(ayt.biyoloji) || 0);
  const edSos1Sum = (Number(ayt.edebiyat) || 0) + (Number(ayt.tarih1) || 0) + (Number(ayt.cografya1) || 0);
  const sos2Sum =
    (Number(ayt.tarih2) || 0) +
    (Number(ayt.cografya2) || 0) +
    (Number(ayt.felsefe) || 0) +
    (Number(ayt.din) || 0);
  const diplomaFromObp = myNets?.obp ? Math.min(100, Math.max(50, Number((Number(myNets.obp) / 5).toFixed(1)))) : prevInput.diploma || 90;

  return {
    ...structuredClone(DEFAULT_YKS_CALC_INPUT),
    selectedType: prevInput.selectedType || 'SAY',
    selectedYear: prevInput.selectedYear || 2026,
    obpBroken: Boolean(prevInput.obpBroken),
    diploma: diplomaFromObp,
    tyt: {
      turkce: { d: roundD(myNets?.tyt?.turkce, 40), y: 0 },
      sosyal: { d: roundD(myNets?.tyt?.sosyal, 20), y: 0 },
      matematik: { d: roundD(myNets?.tyt?.matematik, 40), y: 0 },
      fen: { d: roundD(myNets?.tyt?.fen, 20), y: 0 },
    },
    ayt: {
      matematik: { d: roundD(ayt.matematik, 40), y: 0 },
      fen: { d: roundD(fenSum, 40), y: 0 },
      edSos1: { d: roundD(edSos1Sum, 40), y: 0 },
      sos2: { d: roundD(sos2Sum, 40), y: 0 },
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

/**
 * Canlı özet kartı + 2023–2026 çok yıllı sıralama tablosu HTML'ini üretir.
 * Kullanıcı yazarken input odağını kaybetmemek için yalnızca bu blok anlık güncellenebilir.
 */
export function renderYksResultsBlockHtml(results, { selectedType = 'SAY', selectedYear = 2026 } = {}) {
  const st = CALC_SCORE_TYPES.includes(selectedType) ? selectedType : 'SAY';
  const yr = CALC_YEARS.includes(Number(selectedYear)) ? Number(selectedYear) : 2026;
  const activeBranch = results.branches[st] || results.branches.SAY;
  const heroRank = activeBranch.ranks[yr];
  const canFilterCatalog = st !== 'TYT';

  const tableRows = CALC_SCORE_TYPES.map((code) => {
    const b = results.branches[code];
    const isSel = code === st;
    const isMuted = !b.active && code !== 'TYT';
    return `<tr class="yks-res-row ${isSel ? 'selected' : ''} ${isMuted ? 'muted' : ''}" data-calc-select-type="${code}">
      <td>
        <div style="display:flex;align-items:center;gap:7px;">
          <span class="yks-type-pill ${isSel ? 'active' : ''}">${code}</span>
          ${isMuted ? `<span style="font-size:11px;color:var(--text-tertiary);">Boş</span>` : ''}
        </div>
      </td>
      <td class="tabular">${fmtPts(b.raw)}</td>
      <td class="tabular"><strong>${fmtPts(b.placement)}</strong></td>
      <td class="tabular ${yr === 2023 ? 'yks-yr-hl' : ''}">${formatRank(b.ranks[2023])}</td>
      <td class="tabular ${yr === 2024 ? 'yks-yr-hl' : ''}">${formatRank(b.ranks[2024])}</td>
      <td class="tabular ${yr === 2025 ? 'yks-yr-hl' : ''}">${formatRank(b.ranks[2025])}</td>
      <td class="tabular ${yr === 2026 ? 'yks-yr-hl' : ''}"><strong>${formatRank(b.ranks[2026])}</strong></td>
      <td style="text-align:right;">
        ${code !== 'TYT'
          ? `<button class="mini-action" type="button" data-calc-filter-row="${code}" data-calc-filter-rank="${b.ranks[yr]}" title="${code} ${yr} sıralamasıyla bölümleri filtrele">Filtrele →</button>`
          : `<span style="font-size:11.5px;color:var(--text-tertiary);">Ön Lisans</span>`}
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
              <span>Ham Puan</span>
              <strong>${fmtPts(activeBranch.raw)}</strong>
            </div>
            <div class="yks-score-pill-box accent">
              <span>Yerleştirme Puanı</span>
              <strong>${fmtPts(activeBranch.placement)}</strong>
            </div>
            <div class="yks-score-pill-box">
              <span>OBP Katkısı ${results.obpBroken ? '(Kırık)' : ''}</span>
              <strong>+${results.obpAdd.toFixed(2).replace('.', ',')}</strong>
            </div>
          </div>
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
            <th>Ham Puan</th>
            <th>Yerleştirme</th>
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

/**
 * Tam "Net & Sıralama Hesapla" sekme görünümünü üretir.
 */
export function renderYksCalculatorPanel(calcInput, { hasMyNets = false } = {}) {
  const input = {
    ...structuredClone(DEFAULT_YKS_CALC_INPUT),
    ...(calcInput || {}),
    tyt: { ...structuredClone(DEFAULT_YKS_CALC_INPUT.tyt), ...(calcInput?.tyt || {}) },
    ayt: { ...structuredClone(DEFAULT_YKS_CALC_INPUT.ayt), ...(calcInput?.ayt || {}) },
  };
  const results = calculateYksResults(input);

  const renderInputRows = (fields, group) =>
    fields
      .map((f) => {
        const st = results[group][f.key];
        const pct = f.max > 0 ? Math.max(0, Math.min(100, (st.net / f.max) * 100)) : 0;
        return `<div class="yks-field-row" data-calc-row="${group}.${f.key}">
          <div class="yks-field-meta">
            <div class="yks-field-name">
              <span>${escapeHtml(f.label)}</span>
              ${f.tag ? `<span class="yks-field-tag">${escapeHtml(f.tag)}</span>` : ''}
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
          <span style="display:block;">YKS Puan & Çok Yıllı Sıralama Hesaplama Robotu</span>
          <span style="font-size:12.5px;font-weight:450;color:var(--text-secondary);">ÖSYM katsayıları ve 2023–2026 gerçek YÖK Atlas yığılma eğrileriyle anlık Ham / Yerleştirme Puanı ve tahmini sıralama</span>
        </div>
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;">
          ${hasMyNets ? `<button class="btn btn-soft btn-sm" type="button" id="calcPullMyNetsBtn">Netlerimden Aktar</button>` : ''}
          <button class="btn btn-sm" type="button" id="calcSyncToMyNetsBtn" title="Buradaki TYT/AYT netlerini Netlerim profiline kaydet">Netlerime Kaydet</button>
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

      <!-- TYT + AYT/YDT 2-Column Input Grid -->
      <div class="yks-inputs-grid">
        <div class="yks-input-card">
          <div class="yks-input-card-head">
            <div>
              <h4>TYT Testleri</h4>
              <span>120 Soru · Doğru − (Yanlış / 4)</span>
            </div>
            <span class="pill pill-accent tabular" id="calcTytTotalBadge">Toplam: <strong>${fmtNetVal(results.tytTotalNet)}</strong> net</span>
          </div>
          <div class="yks-field-list">${renderInputRows(CALC_TYT_FIELDS, 'tyt')}</div>
        </div>

        <div class="yks-input-card">
          <div class="yks-input-card-head">
            <div>
              <h4>AYT & YDT Testleri</h4>
              <span>İlgili alanların Doğru / Yanlış sayılarını gir</span>
            </div>
            <span class="pill tabular">4 Yanlış 1 Doğru</span>
          </div>
          <div class="yks-field-list">${renderInputRows(CALC_AYT_FIELDS, 'ayt')}</div>
        </div>
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
