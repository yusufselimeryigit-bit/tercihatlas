/**
 * TercihAtlas — Client-Side Dershane Exam Result PDF Parser (TYT & AYT)
 * Runs 100% locally in the browser using PDF.js — your PDF never leaves your device.
 * Supports Turkish dershane score-ordered tables (Final, Bilgi Sarmal, Hız ve Renk, 3D, K12, etc.)
 * as well as individual student report cards.
 */

const PDFJS_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.min.mjs';
const PDFJS_WORKER_CDN = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';

let pdfjsLibPromise = null;

async function getPdfJs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import(PDFJS_CDN).then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      return lib;
    });
  }
  return pdfjsLibPromise;
}

export function foldTurkish(str) {
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
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDecimalToken(str) {
  const s = String(str || '').trim();
  if (!/^-?\d{1,3}[.,]\d{1,2}$/.test(s)) return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Classifies a PDF table header label into a canonical subject key.
 */
function classifyHeader(rawLabel, examType) {
  const f = foldTurkish(rawLabel).replace(/\./g, ' ').replace(/\s+/g, ' ').trim();
  if (!f || f.length > 24) return null;
  if (/^(d|y|n|sira|sinif|sube|der|tg|og no|adi|soyadi|puan|puani|tyt|ayt|say|ea|soz)$/.test(f)) return null;
  if (f.includes('toplam')) return 'toplam';

  if (examType === 'TYT') {
    if (f.includes('turkce') || f === 'trk' || f === 'tur') return 'turkce';
    if (f.includes('sosyal') || f === 'sos') return 'sosyal';
    if (f.includes('tarih') || f === 'tar') return 'tar';
    if (f.includes('cografya') || f === 'cog') return 'cog';
    if (f === 's fel' || f === 'sfel' || f.includes('sec fel') || f.includes('felsefe') || f === 'fel') return 'fel';
    if (f.includes('din') || f === 'dkab') return 'din';
    if (f.includes('geo')) return 'geo';
    if (f.includes('mat')) return 'mat';
    if (f.includes('fen')) return 'fen';
    if (f.includes('fiz')) return 'fiz';
    if (f.includes('kim')) return 'kim';
    if (f.includes('biy')) return 'biy';
    return null;
  }

  // AYT mode
  if (f.includes('geo')) return 'geo';
  if (f.includes('mat')) return 'matematik';
  if (f.includes('fiz')) return 'fizik';
  if (f.includes('kim')) return 'kimya';
  if (f.includes('biy')) return 'biyoloji';
  if (f.includes('edeb') || f === 'tde' || f.includes('turk dili')) return 'edebiyat';
  if (f.includes('tar 2') || f === 'tar2' || f.includes('tarih 2') || f.includes('tarih-2')) return 'tarih2';
  if (f.includes('tar') || f === 'tar1') return 'tarih1';
  if (f.includes('cog 2') || f === 'cog2' || f.includes('cografya 2') || f.includes('cografya-2')) return 'cografya2';
  if (f.includes('cog') || f === 'cog1') return 'cografya1';
  if (f.includes('fel') || f.includes('psik') || f.includes('sosy') || f.includes('mant')) return 'felsefe';
  if (f.includes('din') || f === 'dkab') return 'din';
  return null;
}

/**
 * Groups PDF.js text items on one page into visual horizontal rows sorted top-to-bottom,
 * with items inside each row sorted left-to-right by X coordinate.
 */
function groupItemsIntoRows(textItems) {
  const rows = [];
  for (const item of textItems) {
    const text = String(item.str || '').trim();
    if (!text) continue;
    const x = item.transform[4];
    const y = item.transform[5];
    const w = item.width || 0;

    let row = rows.find((r) => Math.abs(r.y - y) <= 4.5);
    if (!row) {
      row = { y, items: [] };
      rows.push(row);
    }
    row.items.push({ text, x, y, cx: x + w / 2, w });
  }
  rows.sort((a, b) => b.y - a.y); // top of PDF page has larger Y
  for (const r of rows) {
    r.items.sort((a, b) => a.x - b.x);
    r.text = r.items.map((i) => i.text).join(' ');
  }
  return rows;
}

/**
 * Finds subject header columns & their X positions from the top rows of page 1.
 */
function detectColumns(page1Rows, examType) {
  const topRows = page1Rows.slice(0, 18);
  const columns = [];

  for (const row of topRows) {
    // Skip title/student rows
    const hits = [];
    for (const item of row.items) {
      const key = classifyHeader(item.text, examType);
      if (key) {
        hits.push({ key, label: item.text, x: item.x, cx: item.cx, y: row.y });
      }
    }
    if (hits.length >= 3) {
      columns.push(...hits);
    }
  }

  // Deduplicate columns that are very close in X
  columns.sort((a, b) => a.x - b.x);
  const deduped = [];
  for (const col of columns) {
    const prev = deduped[deduped.length - 1];
    if (prev && Math.abs(prev.cx - col.cx) < 12 && prev.key === col.key) continue;
    deduped.push(col);
  }

  // Look for "N." sub-column positions directly under headers to get exact Net X center
  const subNPositions = [];
  for (const row of topRows) {
    for (const item of row.items) {
      if (/^n\.?$/i.test(item.text.trim())) {
        subNPositions.push(item.cx);
      }
    }
  }

  if (subNPositions.length >= deduped.length - 2 && deduped.length > 0) {
    subNPositions.sort((a, b) => a - b);
    for (const col of deduped) {
      // Find closest N. position slightly to the right (or nearest) of the header center
      let bestX = col.cx;
      let bestDist = Infinity;
      for (const nx of subNPositions) {
        const dist = Math.abs(nx - (col.cx + 10));
        if (dist < bestDist && dist < 42) {
          bestDist = dist;
          bestX = nx;
        }
      }
      col.netX = bestX;
    }
  } else {
    for (const col of deduped) col.netX = col.cx;
  }

  return deduped;
}

function extractExamMeta(page1Rows, fileName) {
  const topLines = page1Rows.slice(0, 10).map((r) => r.text);
  let examDate = null;
  let examName = fileName.replace(/\.pdf$/i, '');

  for (const line of topLines) {
    const dateMatch = line.match(/(\d{2}\.\d{2}\.\d{4})/);
    if (dateMatch && !examDate) examDate = dateMatch[1];
    if (
      !line.includes('Sezon') &&
      !line.includes('Şehir') &&
      !line.includes('Sınav Tarihi') &&
      !line.includes('SIRALI LİSTE') &&
      !line.includes('ÖĞ.NO') &&
      /(TYT|AYT|YKS|DENEME|SARMAL|RENK|ÖZDEBİR|TÖDER|3D|APOTEMİ|AYDIN|ENDEMİK|PROLİG)/i.test(line)
    ) {
      examName = line.replace(/^Sınav Adı\s*:?\s*/i, '').trim();
    }
  }

  return { examName, examDate };
}

function matchesStudent(rowText, queryTokens) {
  const norm = foldTurkish(rowText);
  return queryTokens.every((t) => norm.includes(t));
}

function aggregateNets(colValues, examType) {
  const r2 = (v) => Number(v.toFixed(2));
  const sumKeys = (keys) => {
    let sum = 0;
    let found = false;
    for (const k of keys) {
      if (colValues[k] !== undefined && colValues[k] !== null) {
        sum += colValues[k];
        found = true;
      }
    }
    return found ? r2(sum) : null;
  };

  if (examType === 'TYT') {
    const turkce = sumKeys(['turkce']);
    const sosyal = colValues.sosyal !== undefined ? r2(colValues.sosyal) : sumKeys(['tar', 'cog', 'fel', 'din']);
    const matematik = sumKeys(['mat', 'geo']);
    const fen = colValues.fen !== undefined ? r2(colValues.fen) : sumKeys(['fiz', 'kim', 'biy']);
    const total = r2((turkce || 0) + (sosyal || 0) + (matematik || 0) + (fen || 0));
    return {
      tyt: { turkce, sosyal, matematik, fen },
      total,
    };
  }

  // AYT
  const ayt = {
    matematik: sumKeys(['matematik', 'geo']),
    fizik: sumKeys(['fizik']),
    kimya: sumKeys(['kimya']),
    biyoloji: sumKeys(['biyoloji']),
    edebiyat: sumKeys(['edebiyat']),
    tarih1: sumKeys(['tarih1']),
    cografya1: sumKeys(['cografya1']),
    tarih2: sumKeys(['tarih2']),
    cografya2: sumKeys(['cografya2']),
    felsefe: sumKeys(['felsefe']),
    din: sumKeys(['din']),
  };
  const total = r2(Object.values(ayt).filter((v) => v !== null).reduce((a, b) => a + b, 0));
  return { ayt, total };
}

/**
 * Fallback parser for vertical individual report card PDFs (one subject per row).
 */
function parseVerticalReportCard(allRows, examType) {
  const colValues = {};
  for (const row of allRows) {
    const text = row.text;
    const key = classifyHeader(text.split(/\d/)[0] || '', examType);
    if (!key || key === 'toplam') continue;
    // Find decimal numbers on the row; first decimal is usually student's NET, second is class average
    const decimals = [];
    for (const item of row.items) {
      const n = parseDecimalToken(item.text);
      if (n !== null && n >= -10 && n <= 45) decimals.push(n);
    }
    if (decimals.length > 0 && colValues[key] === undefined) {
      colValues[key] = decimals[0];
    }
  }
  if (!Object.keys(colValues).length) return null;
  return aggregateNets(colValues, examType);
}

/**
 * Main entry point: parses an uploaded File (PDF) for a student's TYT or AYT nets.
 * @param {File} file
 * @param {{ examType: 'TYT'|'AYT', studentName: string }} options
 */
export async function parseExamPdfFile(file, { examType = 'TYT', studentName = 'Yusuf Selim Eryiğit' } = {}) {
  const pdfjs = await getPdfJs();
  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;

  const pageRows = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    pageRows.push(groupItemsIntoRows(tc.items));
  }

  const page1Rows = pageRows[0] || [];
  const { examName, examDate } = extractExamMeta(page1Rows, file.name);
  const queryTokens = foldTurkish(studentName).split(' ').filter((t) => t.length >= 2);
  if (!queryTokens.length) {
    throw new Error('Aranacak öğrenci adı boş olamaz.');
  }

  const columns = detectColumns(page1Rows, examType);
  const allRows = pageRows.flat();

  // Search for student's row across all pages
  let matchedRow = null;
  let matchedNextRow = null;
  for (const rows of pageRows) {
    for (let idx = 0; idx < rows.length; idx++) {
      if (matchesStudent(rows[idx].text, queryTokens)) {
        matchedRow = rows[idx];
        if (idx + 1 < rows.length && Math.abs(rows[idx].y - rows[idx + 1].y) <= 14) {
          matchedNextRow = rows[idx + 1];
        }
        break;
      }
    }
    if (matchedRow) break;
  }

  if (!matchedRow) {
    throw new Error(`PDF içinde "${studentName}" bulunamadı. İsim yazımını veya öğrenci numarasını kontrol et.`);
  }

  // Extract decimal tokens (net values) on the student's horizontal row
  // Note: 3-decimal scores like 363,099 are excluded automatically by parseDecimalToken (1-2 decimals only)
  const extractDecimals = (row) =>
    row.items
      .map((item) => ({ ...item, num: parseDecimalToken(item.text) }))
      .filter((item) => item.num !== null && item.num >= -15 && item.num <= 125);

  let decimalItems = extractDecimals(matchedRow);
  if (decimalItems.length < 2 && matchedNextRow) {
    decimalItems = extractDecimals(matchedNextRow);
  }

  // Horizontal coordinate-based mapping (with exact 1-to-1 fast path when counts match!)
  if (columns.length >= 3 && decimalItems.length >= 2) {
    const colValues = {};

    if (decimalItems.length === columns.length) {
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        if (col.key === 'toplam') continue;
        colValues[col.key] = (colValues[col.key] || 0) + decimalItems[i].num;
      }
    } else {
      const usedDecimalIdx = new Set();
      for (const col of columns) {
        if (col.key === 'toplam') continue;
        let bestIdx = -1;
        let bestDist = Infinity;
        for (let i = 0; i < decimalItems.length; i++) {
          if (usedDecimalIdx.has(i)) continue;
          const dist = Math.abs(decimalItems[i].cx - col.netX);
          if (dist < bestDist && dist < 38) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        if (bestIdx !== -1) {
          usedDecimalIdx.add(bestIdx);
          colValues[col.key] = (colValues[col.key] || 0) + decimalItems[bestIdx].num;
        }
      }
    }

    if (Object.keys(colValues).length >= 2) {
      const agg = aggregateNets(colValues, examType);
      return {
        examType,
        examName,
        examDate,
        matchedLine: matchedRow.text,
        rawSubjects: colValues,
        ...agg,
      };
    }
  }

  // Fallback: individual student vertical report card
  const vertical = parseVerticalReportCard(allRows, examType);
  if (vertical) {
    return {
      examType,
      examName,
      examDate,
      matchedLine: matchedRow.text,
      rawSubjects: {},
      ...vertical,
    };
  }

  throw new Error(
    `PDF'de "${studentName}" satırı bulundu ancak ${examType} ders sütunları otomatik okunamadı. Farklı bir sınav türü (TYT/AYT) seçmiş olabilirsin.`,
  );
}
