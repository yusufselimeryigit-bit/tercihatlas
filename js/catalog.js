/**
 * TercihAtlas — Instant 0ms Built-In YÖK Atlas 2026 Lisans Catalog Engine
 * Hosted directly on GitHub Pages (./data/yokatlas-index.json) so search, discovery,
 * and program lookup work instantaneously on Mac, iPad, and iPhone on ANY network or offline.
 */

let catalogPromise = null;
let parsedCache = null;

function foldTr(str) {
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
    .replace(/[-/(),.]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const TOKEN_ALIASES = {
  itu: 'istanbul teknik',
  odtu: 'orta dogu teknik',
  metu: 'orta dogu teknik',
  boun: 'bogazici',
  ytu: 'yildiz teknik',
  iu: 'istanbul universitesi',
  iuc: 'istanbul universitesi cerrahpasa',
  gtu: 'gebze teknik',
  iyte: 'izmir yuksek teknoloji',
  deu: 'dokuz eylul',
  koc: 'koc universitesi',
  sabanci: 'sabanci universitesi',
  bilkent: 'ihsan dogramaci bilkent',
  tobb: 'tobb ekonomi ve teknoloji',
  bau: 'bahcesehir',
  omu: 'ondokuz mayis',
  ktu: 'karadeniz teknik',
  ceng: 'bilgisayar muhendisligi',
  cs: 'bilgisayar muhendisligi',
  pc: 'bilgisayar',
  eem: 'elektrik elektronik',
  ee: 'elektrik',
  ie: 'endustri',
  ai: 'yapay zeka',
  yz: 'yapay zeka',
  muh: 'muhendisligi',
  muhendislik: 'muhendisligi',
  ing: 'ingilizce',
  burs: 'burslu',
};

export async function loadCatalog() {
  if (parsedCache) return parsedCache;
  if (!catalogPromise) {
    catalogPromise = fetch('./data/yokatlas-index.json?v=20')
      .then((r) => {
        if (!r.ok) throw new Error(`Katalog yüklenemedi (${r.status})`);
        return r.json();
      })
      .then((raw) => {
        const byCode = new Map();
        const items = raw.rows.map((r) => {
          const uni = raw.unis[r[1]] || [0, '', 'D'];
          const uniType = uni[2] === 'D' ? 'DEVLET' : uni[2] === 'V' ? 'VAKIF' : 'KKTC/DİĞER';
          const city = raw.cities[r[4]] || '';
          const scoreType = raw.scoreTypes[r[5]] || '';
          const language = raw.langs[r[6]] || 'Türkçe';
          const scholarship = raw.schols[r[7]] || '';
          const faculty = raw.faculties[r[3]] || '';
          const accred = raw.accreds[r[27]] || '';

          const entry = {
            code: r[0],
            universityId: uni[0] || null,
            university: uni[1],
            universityType: uniType,
            department: r[2],
            faculty,
            city,
            scoreType,
            language,
            scholarship,
            tuition: r[8] || null,
            latestYear: r[9],
            latestRank: r[10],
            latestScore: r[11],
            quota: r[12],
            placed: r[13],
            raw: r,
            accreditation: accred || null,
            _search: foldTr(`${r[0]} ${uni[1]} ${r[2]} ${city} ${scoreType} ${language} ${scholarship} ${uniType}`),
          };
          byCode.set(entry.code, entry);
          return entry;
        });

        parsedCache = { raw, items, byCode };
        return parsedCache;
      })
      .catch((err) => {
        catalogPromise = null;
        throw err;
      });
  }
  return catalogPromise;
}

function expandToFullProgram(entry) {
  const r = entry.raw;
  const y0 = r[9] || 2026;
  const history = [
    { year: y0, rank: r[10], minScore: r[11], quota: r[12], placed: r[13] },
    { year: y0 - 1, rank: r[14], minScore: r[15], quota: r[16], placed: null },
    { year: y0 - 2, rank: r[17], minScore: r[18], quota: r[19], placed: null },
    { year: y0 - 3, rank: r[20], minScore: r[21], quota: r[22], placed: null },
  ]
    .filter((h) => h.rank !== null || h.minScore !== null || h.quota !== null)
    .sort((a, b) => a.year - b.year);

  const validRanks = history.filter((h) => h.rank !== null);
  let rankTrendDelta = null;
  if (validRanks.length >= 2) {
    rankTrendDelta = validRanks[validRanks.length - 2].rank - validRanks[validRanks.length - 1].rank;
  }

  return {
    code: entry.code,
    isLisans: true,
    universityId: entry.universityId,
    university: entry.university,
    universityType: entry.universityType,
    faculty: entry.faculty,
    department: entry.department,
    city: entry.city,
    district: '',
    scoreType: entry.scoreType,
    language: entry.language,
    scholarship: entry.scholarship,
    tuition: entry.tuition,
    accreditation: entry.accreditation,
    accreditationDesc: '',
    minRankRequirement: '',
    latestYear: entry.latestYear,
    latestRank: entry.latestRank,
    latestScore: entry.latestScore,
    quota: entry.quota,
    placed: entry.placed,
    rankTrendDelta,
    history,
    nets: [],
    academicStaff: {
      prof: r[23] || 0,
      doc: r[24] || 0,
      drOgr: r[25] || 0,
      arGor: r[26] || 0,
    },
    conditions: [],
    yokAtlasUrl: `https://yokatlas.yok.gov.tr/lisans.php?y=${entry.code}`,
    fetchedAt: new Date().toISOString(),
    fromCatalog: true,
  };
}

export async function lookupProgramInCatalog(code) {
  const cat = await loadCatalog();
  const hit = cat.byCode.get(String(code || '').trim());
  return hit ? expandToFullProgram(hit) : null;
}

export async function searchProgramsInCatalog({
  q = '',
  puanTuru = '',
  uniTuru = '',
  minRank = '',
  maxRank = '',
  size = 20,
} = {}) {
  const cat = await loadCatalog();
  let filterPuan = String(puanTuru || '').trim().toUpperCase();
  let filterUni = String(uniTuru || '').trim().toUpperCase();
  const minR = Number(minRank) > 0 ? Number(minRank) : null;
  const maxR = Number(maxRank) > 0 ? Number(maxRank) : null;
  const limit = Math.min(40, Math.max(5, Number(size) || 20));

  const rawTokens = foldTr(q).split(' ').filter(Boolean);
  const terms = [];

  for (const tok of rawTokens) {
    if (tok === 'say' || tok === 'sayisal') {
      if (!filterPuan) filterPuan = 'SAY';
      continue;
    }
    if (tok === 'ea' || tok === 'esit') {
      if (!filterPuan) filterPuan = 'EA';
      continue;
    }
    if (tok === 'soz' || tok === 'sozel') {
      if (!filterPuan) filterPuan = 'SÖZ';
      continue;
    }
    if (tok === 'dil') {
      if (!filterPuan) filterPuan = 'DİL';
      continue;
    }
    if (tok === 'devlet') {
      if (!filterUni) filterUni = 'DEVLET';
      continue;
    }
    if (tok === 'vakif' || tok === 'ozel') {
      if (!filterUni) filterUni = 'VAKIF';
      continue;
    }
    const expanded = TOKEN_ALIASES[tok];
    if (expanded) {
      terms.push(...expanded.split(' '));
    } else {
      terms.push(tok);
    }
  }

  const matches = [];
  for (const item of cat.items) {
    if (filterPuan && item.scoreType !== filterPuan) continue;
    if (filterUni && item.universityType !== filterUni) continue;
    if (minR !== null && (!item.latestRank || item.latestRank < minR)) continue;
    if (maxR !== null && (!item.latestRank || item.latestRank > maxR)) continue;
    if (terms.length && !terms.every((t) => item._search.includes(t))) continue;
    matches.push(item);
  }

  matches.sort((a, b) => (a.latestRank ?? 9e9) - (b.latestRank ?? 9e9));

  return {
    items: matches.slice(0, limit).map((item) => ({
      code: item.code,
      universityId: item.universityId,
      university: item.university,
      universityType: item.universityType,
      faculty: item.faculty,
      department: item.department,
      city: item.city,
      scoreType: item.scoreType,
      language: item.language,
      scholarship: item.scholarship,
      latestYear: item.latestYear,
      latestRank: item.latestRank,
      latestScore: item.latestScore,
      quota: item.quota,
    })),
    total: matches.length,
    query: q,
    source: 'catalog',
  };
}
