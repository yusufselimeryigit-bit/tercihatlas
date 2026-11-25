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
    catalogPromise = fetch('./data/yokatlas-index.json?v=21')
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

const DEPT_STOP_WORDS = new Set([
  'ingilizce',
  'almanca',
  'fransizca',
  'turkce',
  'burslu',
  'indirimli',
  'ucretli',
  'ucretsiz',
  'devlet',
  'vakif',
  'ogretim',
  'ikinci',
  've',
  'ile',
  'bolumu',
  'programi',
  'kktc',
  'uyruklu',
  '50',
  '25',
  '75',
  '100',
  '30',
]);

function extractDeptCoreTokens(department) {
  return foldTr(department)
    .split(' ')
    .filter((t) => t.length >= 3 && !DEPT_STOP_WORDS.has(t));
}

/**
 * Finds the top N similar alternatives from the 12,239-program built-in catalog
 * based on core department keywords, scoreType, rank band closeness, and language/type.
 */
export async function findSimilarProgramsInCatalog(program, { excludeCodes = [], limit = 5 } = {}) {
  if (!program) return [];
  const cat = await loadCatalog();
  const excluded = new Set([String(program.code || ''), ...excludeCodes.map(String)]);
  const targetRank = Number(program.latestRank) || null;
  const scoreType = String(program.scoreType || '').toUpperCase();
  const coreTokens = extractDeptCoreTokens(program.department);
  const primaryToken = coreTokens[0] || '';
  const targetLang = foldTr(program.language || '');
  const targetUniType = String(program.universityType || '').toUpperCase();

  const scored = [];
  for (const item of cat.items) {
    if (excluded.has(item.code)) continue;
    if (scoreType && item.scoreType !== scoreType) continue;
    if (!item.latestRank || item.latestRank <= 0) continue;

    const itemTokens = extractDeptCoreTokens(item.department);
    if (!itemTokens.length) continue;

    let overlap = 0;
    for (const t of coreTokens) {
      if (itemTokens.includes(t)) overlap += 1;
    }
    if (coreTokens.length && overlap === 0) continue;

    const overlapRatio = coreTokens.length ? overlap / Math.max(coreTokens.length, itemTokens.length) : 0;
    const primaryMatch = primaryToken && itemTokens.includes(primaryToken) ? 1 : 0;

    let rankScore = 0.5;
    let relDiff = 0;
    if (targetRank) {
      relDiff = (item.latestRank - targetRank) / Math.max(targetRank, 500);
      const absRel = Math.abs(relDiff);
      if (absRel > 1.25 && Math.abs(item.latestRank - targetRank) > 25000) continue;
      rankScore = Math.max(0, 1 - absRel * 0.9);
    }

    const sameLang = targetLang && foldTr(item.language || '') === targetLang ? 1 : 0;
    const sameUniType = targetUniType && item.universityType === targetUniType ? 1 : 0;
    const diffUniBonus = foldTr(item.university) !== foldTr(program.university) ? 1 : 0.35;

    const score =
      overlapRatio * 48 +
      primaryMatch * 16 +
      rankScore * 28 +
      sameLang * 5 +
      sameUniType * 4 +
      diffUniBonus * 6;

    let reason = 'Benzer bölüm';
    if (targetRank) {
      const pct = Math.round(relDiff * 100);
      if (Math.abs(pct) <= 8) reason = 'Neredeyse aynı sıralama';
      else if (pct > 8) reason = `%${pct} daha erişilebilir`;
      else reason = `%${Math.abs(pct)} daha rekabetçi`;
    }
    if (sameLang && /ingilizce/i.test(item.language || '')) {
      reason += ' · İngilizce';
    }

    scored.push({
      score,
      reason,
      item: {
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
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => ({ ...s.item, similarityReason: s.reason }));
}

/**
 * Suggests catalog programs whose latestRank sits inside a rank gap [lowRank, highRank],
 * tailored to the user's dominant scoreType and department keywords.
 */
export async function findGapFillersInCatalog(lowRank, highRank, { programs = [], excludeCodes = [], limit = 3 } = {}) {
  const low = Number(lowRank);
  const high = Number(highRank);
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return [];

  const cat = await loadCatalog();
  const excluded = new Set([...excludeCodes.map(String), ...programs.map((p) => String(p.code || ''))]);

  // Dominant scoreType & department keywords from user's existing list
  const stCounts = new Map();
  const kwCounts = new Map();
  for (const p of programs) {
    if (p.scoreType) stCounts.set(p.scoreType, (stCounts.get(p.scoreType) || 0) + 1);
    for (const tok of extractDeptCoreTokens(p.department)) {
      kwCounts.set(tok, (kwCounts.get(tok) || 0) + 1);
    }
  }
  const domScoreType = [...stCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const topKeywords = [...kwCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([k]) => k);

  const mid = Math.sqrt(low * high); // geometric midpoint fits log-distributed YKS ranks best
  const scored = [];

  for (const item of cat.items) {
    if (excluded.has(item.code)) continue;
    if (domScoreType && item.scoreType !== domScoreType) continue;
    if (!item.latestRank || item.latestRank <= low * 1.04 || item.latestRank >= high * 0.96) continue;

    const itemTokens = extractDeptCoreTokens(item.department);
    let kwScore = 0;
    for (let i = 0; i < topKeywords.length; i += 1) {
      if (itemTokens.includes(topKeywords[i])) kwScore += 18 - i * 3;
    }
    if (topKeywords.length && kwScore === 0) continue;

    const dist = Math.abs(Math.log(item.latestRank) - Math.log(mid));
    const midScore = Math.max(0, 30 - dist * 25);
    const devletBonus = item.universityType === 'DEVLET' || /burslu/i.test(item.scholarship || '') ? 6 : 0;

    scored.push({
      score: kwScore + midScore + devletBonus,
      item: {
        code: item.code,
        universityId: item.universityId,
        university: item.university,
        universityType: item.universityType,
        department: item.department,
        city: item.city,
        scoreType: item.scoreType,
        language: item.language,
        scholarship: item.scholarship,
        latestRank: item.latestRank,
        quota: item.quota,
      },
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}
