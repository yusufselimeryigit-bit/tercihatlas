/**
 * YÖK Atlas 2026+ REST API client & normalizer.
 * Pure standard Fetch ES module — shared by Cloudflare Worker and local dev server.
 */

const YOK_API = 'https://yokatlas.yok.gov.tr/api';

function toNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  const cleaned = String(val).trim().replace(/\s+/g, '');
  if (!cleaned || cleaned === '---' || cleaned === '-' || cleaned.toLowerCase().includes('dol')) {
    return null;
  }
  // Handle Turkish comma decimals or dot decimals
  const normalized = cleaned.includes(',') && cleaned.includes('.')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(',', '.');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
}

function normalizeConditionList(kosulList) {
  if (!Array.isArray(kosulList)) return [];
  return kosulList
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const [code, text] = Object.entries(entry)[0] || [];
      if (!code || !text) return null;
      return {
        code: String(code),
        text: String(text).replace(/\r+/g, '\n').replace(/\n{2,}/g, '\n').trim(),
      };
    })
    .filter(Boolean);
}

function cleanUniName(rawName, ilAdi) {
  if (!rawName) return '';
  let name = String(rawName).trim();
  if (ilAdi) {
    const suffix = `(${ilAdi})`;
    if (name.toUpperCase().endsWith(suffix.toUpperCase())) {
      name = name.slice(0, -suffix.length).trim();
    }
  }
  return name;
}

function computeEffectiveTuition(row, scholarship) {
  const base = toNumber(row.ucret);
  if (!base) return null;
  const s = String(scholarship || '').toLowerCase();
  if (s.includes('ücretsiz') || s === 'burslu' || s.includes('%100')) return null;
  if (s.includes('%50')) return Math.round(base * 0.5);
  if (s.includes('%25')) return Math.round(base * 0.75);
  if (s.includes('ücretli')) return base;
  return null;
}

function deriveScholarship(row) {
  if (row.bursOraniAdi) return String(row.bursOraniAdi).trim();
  const tur = String(row.universiteTuru || '').toUpperCase();
  if (tur === 'DEVLET') return 'Ücretsiz (Devlet)';
  const adi = String(row.birimAdi || '');
  if (/Burslu/i.test(adi)) return 'Burslu';
  if (/%50\s*İndirimli/i.test(adi)) return '%50 İndirimli';
  if (/%25\s*İndirimli/i.test(adi)) return '%25 İndirimli';
  if (/Ücretli/i.test(adi)) return 'Ücretli';
  return tur === 'VAKIF' ? 'Vakıf' : 'Ücretsiz';
}

function buildNetsList(netRows) {
  if (!Array.isArray(netRows)) return [];
  return netRows
    .map((n) => {
      const tyt = {
        turkce: toNumber(n.tytTrkNet),
        sosyal: toNumber(n.tytSosNet),
        matematik: toNumber(n.tytMatNet),
        fen: toNumber(n.tytFenNet),
      };
      const ayt = {
        matematik: toNumber(n.aytMatNet),
        fizik: toNumber(n.aytFizNet),
        kimya: toNumber(n.aytKimNet),
        biyoloji: toNumber(n.aytBioNet),
        edebiyat: toNumber(n.aytTdeNet),
        tarih1: toNumber(n.aytTrh1Net),
        cografya1: toNumber(n.aytCog1Net),
        tarih2: toNumber(n.aytTrh2Net),
        cografya2: toNumber(n.aytCog2Net),
        felsefe: toNumber(n.aytFelNet),
        din: toNumber(n.aytDinNet),
      };
      const ydt = toNumber(n.ydtYdilNet);

      const sumNonNull = (obj) => {
        const vals = Object.values(obj).filter((v) => v !== null);
        if (!vals.length) return null;
        return Number(vals.reduce((acc, v) => acc + v, 0).toFixed(2));
      };

      return {
        year: Number(n.yil),
        puanTuru: n.puanTuru || null,
        tabanPuan: toNumber(n.tabanPuan),
        obp: toNumber(n.obp),
        katsayi: toNumber(n.katsayi),
        tyt,
        tytTotal: sumNonNull(tyt),
        ayt,
        aytTotal: sumNonNull(ayt),
        ydt,
      };
    })
    .filter((entry) => Number.isFinite(entry.year))
    .sort((a, b) => b.year - a.year);
}

function buildHistory(row, sonucAciklandi) {
  const baseYear = Number(row.yil) || 2026;
  const published = sonucAciklandi !== 0;

  // When current year results are published (H === 1):
  // current = baseYear, *1 = baseYear - 1, *2 = baseYear - 2, *3 = baseYear - 3
  // When not yet published (H === 0):
  // current = baseYear - 1, *1 = baseYear - 2, *2 = baseYear - 3, *3 = baseYear - 4
  const offset = published ? 0 : 1;

  const entries = [
    {
      year: baseYear - offset,
      quota: toNumber(row.kontenjan),
      quotaSchoolFirst: toNumber(row.kontenjanObs),
      placed: toNumber(row.gkY),
      placedSchoolFirst: toNumber(row.obkY),
      minScore: toNumber(row.minPuan),
      rank: toNumber(row.basariSirasi),
    },
    {
      year: baseYear - offset - 1,
      quota: toNumber(row.gk1),
      placed: null,
      minScore: toNumber(row.minPuan1),
      rank: toNumber(row.basariSirasi1),
    },
    {
      year: baseYear - offset - 2,
      quota: toNumber(row.gk2),
      placed: null,
      minScore: toNumber(row.minPuan2),
      rank: toNumber(row.basariSirasi2),
    },
    {
      year: baseYear - offset - 3,
      quota: toNumber(row.gk3),
      placed: null,
      minScore: toNumber(row.minPuan3),
      rank: toNumber(row.basariSirasi3),
    },
  ];

  return entries
    .filter((e) => e.rank !== null || e.minScore !== null || e.quota !== null)
    .sort((a, b) => a.year - b.year);
}

async function fetchJson(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'TercihAtlas/1.0',
      ...(options && options.headers ? options.headers : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`YÖK Atlas yanıt hatası (${res.status})`);
  }
  return res.json();
}

export async function fetchProgramFromYokAtlas(rawCode) {
  const code = String(rawCode || '').replace(/\D/g, '');
  if (code.length < 7 || code.length > 11) {
    throw new Error('Geçersiz YÖK Atlas program kodu. Genellikle 9 haneli sayıdır (ör. 102210277).');
  }

  const [programRes, netRes, sonucRes] = await Promise.all([
    fetchJson(`${YOK_API}/tercih-kilavuz/search`, {
      method: 'POST',
      body: JSON.stringify({ filters: { kilavuzKodu: code }, page: 0, size: 10 }),
    }),
    fetchJson(`${YOK_API}/netler/search`, {
      method: 'POST',
      body: JSON.stringify({ filters: { kilavuzKodu: code }, page: 0, size: 10 }),
    }).catch(() => ({ content: [] })),
    fetchJson(`${YOK_API}/parameters/sonuc-aciklandi`, { method: 'GET' }).catch(() => 1),
  ]);

  const rows = Array.isArray(programRes?.content) ? programRes.content : [];
  const row = rows.find((r) => String(r.kilavuzKodu) === code) || rows[0];

  if (!row) {
    throw new Error(`${code} kodlu program YÖK Atlas'ta bulunamadı.`);
  }

  const birimTuru = String(row.birimTuruAdi || '').toUpperCase();
  const isLisans = birimTuru.includes('LISANS') && !birimTuru.includes('ONLISANS') && !birimTuru.includes('ÖNLİSANS');

  const sonucAciklandi = typeof sonucRes === 'number'
    ? sonucRes
    : typeof sonucRes?.value === 'number'
      ? sonucRes.value
      : 1;

  const history = buildHistory(row, sonucAciklandi);
  const nets = buildNetsList(netRes?.content);
  const latest = [...history].reverse().find((h) => h.rank !== null || h.minScore !== null) || history[history.length - 1] || null;
  const prev = history.length >= 2 ? history[history.length - 2] : null;

  // Positive rankChange means program became MORE competitive (rank number got smaller, e.g. 2000 -> 1500 = +500)
  let rankTrendDelta = null;
  let rankTrendPercent = null;
  if (latest?.rank && prev?.rank) {
    rankTrendDelta = prev.rank - latest.rank;
    rankTrendPercent = Number(((rankTrendDelta / prev.rank) * 100).toFixed(1));
  }

  const scholarship = deriveScholarship(row);
  return {
    country: 'TR',
    code: String(row.kilavuzKodu),
    isLisans,
    degreeType: row.birimTuruAdi || 'LISANS',
    universityId: row.universiteId || null,
    university: cleanUniName(row.universiteAdi, row.ilAdi || row.uniIlAdi),
    universityFull: row.universiteAdi || '',
    universityType: row.universiteTuru || '',
    faculty: row.fymkAdi || '',
    department: row.birimAdi || '',
    departmentGroup: row.birimGrupAdi || '',
    city: row.ilAdi || row.uniIlAdi || '',
    district: row.ilceAdi || row.uniIlceAdi || '',
    scoreType: row.puanTuru || '',
    language: row.ogrenimDiliAdi || 'Türkçe',
    educationType: row.ogrenimTuruAdi || 'Örgün Öğretim',
    durationYears: toNumber(row.ogrenimSuresi) || 4,
    scholarship,
    tuition: computeEffectiveTuition(row, scholarship),
    latestYear: latest?.year || Number(row.yil) || 2026,
    latestRank: latest?.rank ?? null,
    latestScore: latest?.minScore ?? null,
    quota: toNumber(row.kontenjan),
    quotaSchoolFirst: toNumber(row.kontenjanObs),
    placed: toNumber(row.gkY),
    placedSchoolFirst: toNumber(row.obkY),
    rankTrendDelta,
    rankTrendPercent,
    history,
    nets,
    academicStaff: {
      prof: toNumber(row.prof) || 0,
      doc: toNumber(row.doc) || 0,
      drOgr: toNumber(row.dou) || 0,
      arGor: toNumber(row.arGor) || 0,
    },
    accreditation: row.akreditasyon || null,
    accreditationDesc: row.akreditasyonAck || null,
    minRankRequirement: row.minBasariSirasiKosul || null,
    conditions: normalizeConditionList(row.kosulList),
    yokAtlasUrl: `https://yokatlas.yok.gov.tr/detay/${row.kilavuzKodu}`,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchUniversityLogo(uniId) {
  const cleanId = String(uniId || '').replace(/\D/g, '');
  if (!cleanId) return null;
  const res = await fetch(`${YOK_API}/universite-logo?universiteId=${cleanId}`, {
    headers: { 'User-Agent': 'TercihAtlas/1.0' },
  });
  if (!res.ok) return null;
  return res;
}

// ============================================================================
// Live YÖK Atlas Natural-Language & Filtered Search
// ============================================================================
function foldTurkish(str) {
  return String(str || '')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const UNI_ALIASES = {
  itu: 'istanbul teknik',
  odtu: 'orta dogu teknik',
  ytu: 'yildiz teknik',
  boun: 'bogazici',
  gsu: 'galatasaray',
  tobb: 'tobb ekonomi',
  iyte: 'izmir yuksek teknoloji',
  gtu: 'gebze teknik',
  ktu: 'karadeniz teknik',
  deu: 'dokuz eylul',
  msgu: 'mimar sinan',
  agu: 'abdullah gul',
  medipol: 'medipol',
  bilkent: 'ihsan dogramaci bilkent',
  koc: 'koc universitesi',
  sabanci: 'sabanci',
  ozyegin: 'ozyegin',
  bahcesehir: 'bahcesehir',
  bau: 'bahcesehir',
  hacettepe: 'hacettepe',
};

const STOP_WORDS = new Set([
  'universitesi',
  'uni',
  'bolumu',
  'bolum',
  'programi',
  'lisans',
  'devlet',
  'vakif',
  'say',
  'ea',
  'soz',
  'dil',
  'ilk',
  'ingilizce',
  'turkce',
  'burslu',
  've',
]);

async function loadMetadata(kv) {
  const cacheKey = 'yokatlas:meta:v1';
  if (kv) {
    const cached = await kv.get(cacheKey, { type: 'json' });
    if (cached && cached.unis && cached.progs && cached.cities) return cached;
  }

  const [unis, progs, cities] = await Promise.all([
    fetchJson(`${YOK_API}/tercih-kilavuz/universiteler`, { method: 'GET' }),
    fetchJson(`${YOK_API}/tercih-kilavuz/universite-programlar`, { method: 'GET' }),
    fetchJson(`${YOK_API}/tercih-kilavuz/universite-iller`, { method: 'GET' }),
  ]);

  const meta = {
    unis: (Array.isArray(unis) ? unis : []).map((u) => ({
      id: u.universiteId,
      name: u.universiteAdi,
      norm: foldTurkish(u.universiteAdi),
    })),
    progs: (Array.isArray(progs) ? progs : []).map((p) => ({
      id: p.birimGrupId,
      name: p.birimGrupAdi,
      puanTuru: p.puanTuru,
      norm: foldTurkish(p.birimGrupAdi),
    })),
    cities: (Array.isArray(cities) ? cities : []).map((c) => ({
      id: c.ilKodu,
      name: c.ilAdi,
      norm: foldTurkish(c.ilAdi),
    })),
  };

  if (kv) {
    await kv.put(cacheKey, JSON.stringify(meta), { expirationTtl: 60 * 60 * 24 }).catch(() => {});
  }
  return meta;
}

export async function searchProgramsFromYokAtlas(params = {}, kv = null) {
  const rawQuery = String(params.q || '').trim();
  const normQuery = foldTurkish(rawQuery);
  const tokens = normQuery ? normQuery.split(' ').filter(Boolean) : [];

  const meta = await loadMetadata(kv);

  let puanTuru = params.puanTuru ? String(params.puanTuru).toUpperCase() : null;
  let universiteTuru = params.universiteTuru ? String(params.universiteTuru).toUpperCase() : null;
  let minRank = toNumber(params.minRank);
  let maxRank = toNumber(params.maxRank);

  // Infer score type or university type from query tokens if not explicitly selected
  if (!puanTuru) {
    if (tokens.includes('say')) puanTuru = 'SAY';
    else if (tokens.includes('ea')) puanTuru = 'EA';
    else if (tokens.includes('soz')) puanTuru = 'SÖZ';
    else if (tokens.includes('dil')) puanTuru = 'DİL';
  }
  if (!universiteTuru) {
    if (tokens.includes('devlet')) universiteTuru = 'DEVLET';
    else if (tokens.includes('vakif')) universiteTuru = 'VAKIF';
  }

  // Extract alias & university matches
  const matchedUniIds = new Set();
  const matchedCityIds = new Set();
  const remainingTokens = [];

  for (const tok of tokens) {
    if (STOP_WORDS.has(tok)) continue;

    // Check explicit alias first
    if (UNI_ALIASES[tok]) {
      const target = UNI_ALIASES[tok];
      for (const u of meta.unis) {
        if (u.norm.includes(target)) matchedUniIds.add(u.id);
      }
      continue;
    }

    // Check exact city match (only if >= 3 chars)
    const cityHit = tok.length >= 3 ? meta.cities.find((c) => c.norm === tok) : null;
    if (cityHit) {
      // Wait: "istanbul", "ankara", "izmir" can also be part of uni name like "Ankara Üniversitesi"
      // Treat as city filter if user also typed a department word or other tokens
      if (tokens.length > 1) {
        matchedCityIds.add(cityHit.id);
        continue;
      }
    }

    remainingTokens.push(tok);
  }

  // Try matching remaining tokens against universities AND department groups
  const matchedProgIds = new Set();
  const deptTokens = [];

  for (const tok of remainingTokens) {
    if (tok.length < 2) continue;
    const uniHits = meta.unis.filter((u) => u.norm.split(' ').some((w) => w.startsWith(tok)));
    const progHits = meta.progs.filter((p) => p.norm.includes(tok));

    // If token uniquely/strongly hits universities and NOT programs (e.g. "bogazici", "marmara", "ege", "akdeniz")
    if (uniHits.length > 0 && uniHits.length <= 12 && progHits.length === 0) {
      for (const u of uniHits) matchedUniIds.add(u.id);
    } else {
      deptTokens.push(tok);
    }
  }

  // Match department groups using all deptTokens together first, then fallback to any token
  if (deptTokens.length > 0) {
    let candidates = meta.progs.filter((p) => deptTokens.every((t) => p.norm.includes(t)));
    // Expand common short forms like "muh" -> "muhendisligi", "pc"/"bilg" -> "bilgisayar", "eem" -> "elektrik"
    if (!candidates.length) {
      const expanded = deptTokens.map((t) => {
        if (t === 'muh' || t === 'muhendislik') return 'muhendisligi';
        if (t === 'eem') return 'elektrik-elektronik';
        if (t === 'ceng' || t === 'cs') return 'bilgisayar';
        if (t === 'ee') return 'elektrik';
        if (t === 'ie') return 'endustri';
        if (t === 'ai' || t === 'yz') return 'yapay zeka';
        return t;
      });
      candidates = meta.progs.filter((p) => expanded.every((t) => p.norm.includes(t)));
    }
    if (!candidates.length) {
      // Try matching as university name if no department matched (e.g. "yildiz", "dokuz eylul")
      const uniCandidates = meta.unis.filter((u) => deptTokens.every((t) => u.norm.includes(t)));
      for (const u of uniCandidates.slice(0, 10)) matchedUniIds.add(u.id);
    } else {
      // Prefer exact/shorter matches first, limit to 12 group IDs
      candidates
        .sort((a, b) => a.norm.length - b.norm.length)
        .slice(0, 12)
        .forEach((p) => matchedProgIds.add(p.id));
    }
  }

  // If single city token was provided alone
  if (!matchedUniIds.size && !matchedProgIds.size && !matchedCityIds.size && tokens.length === 1) {
    const cityHit = meta.cities.find((c) => c.norm.startsWith(tokens[0]));
    if (cityHit) matchedCityIds.add(cityHit.id);
  }

  const filters = {
    puanTuru: puanTuru || null,
    universiteId: matchedUniIds.size ? Array.from(matchedUniIds) : [],
    birimGrupId: matchedProgIds.size ? Array.from(matchedProgIds) : [],
    ilKodu: matchedCityIds.size ? Array.from(matchedCityIds) : [],
    birimTuruId: 46, // LISANS only
    universiteTuru: universiteTuru || null,
    bursOraniId: null,
    ogrenimTuruId: null,
    kilavuzKodu: null,
    minBasariSirasi: minRank,
    maxBasariSirasi: maxRank,
  };

  if (
    !filters.puanTuru &&
    !filters.universiteId.length &&
    !filters.birimGrupId.length &&
    !filters.ilKodu.length &&
    !filters.universiteTuru &&
    !filters.minBasariSirasi &&
    !filters.maxBasariSirasi
  ) {
    return { items: [], total: 0, query: rawQuery };
  }

  const size = Math.min(30, Math.max(5, Number(params.size) || 20));
  const res = await fetchJson(`${YOK_API}/tercih-kilavuz/search`, {
    method: 'POST',
    body: JSON.stringify({
      filters,
      page: 0,
      size,
      sortBy: 'basariSirasi',
      direction: 'ASC',
    }),
  });

  const rows = Array.isArray(res?.content) ? res.content : [];
  const items = rows.map((row) => {
    const scholarship = deriveScholarship(row);
    return {
      code: String(row.kilavuzKodu),
      universityId: row.universiteId || null,
      university: cleanUniName(row.universiteAdi, row.ilAdi || row.uniIlAdi),
      universityType: row.universiteTuru || '',
      faculty: row.fymkAdi || '',
      department: row.birimAdi || '',
      city: row.ilAdi || row.uniIlAdi || '',
      scoreType: row.puanTuru || '',
      language: row.ogrenimDiliAdi || 'Türkçe',
      scholarship,
      latestYear: Number(row.yil) || 2026,
      latestRank: toNumber(row.basariSirasi),
      latestScore: toNumber(row.minPuan),
      quota: toNumber(row.kontenjan),
    };
  });

  return {
    items,
    total: Number(res?.totalElements) || items.length,
    query: rawQuery,
  };
}
