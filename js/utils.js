/**
 * TercihAtlas — Utility helpers
 */

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Extracts one or more 9-digit (7-11 digit) YÖK Atlas program codes
 * from raw numbers, YÖK Atlas URLs (/detay/102210277 or lisans.php?y=102210277),
 * or multiline/comma-separated batch text.
 */
export function extractProgramCodes(input) {
  const text = String(input || '').trim();
  if (!text) return [];
  const matches = new Set();

  // Match explicit URL parameters first
  const urlPatterns = [
    /\/detay\/(\d{7,11})/gi,
    /[?&]y=(\d{7,11})/gi,
    /lisans\.php\/y=(\d{7,11})/gi,
  ];
  for (const rx of urlPatterns) {
    let m;
    while ((m = rx.exec(text)) !== null) {
      matches.add(m[1]);
    }
  }

  // Also match standalone 8-10 digit codes (ÖSYM codes are 9 digits)
  const rawMatches = text.match(/\b\d{8,10}\b/g) || [];
  for (const code of rawMatches) {
    matches.add(code);
  }

  return Array.from(matches);
}

export function formatRank(rank) {
  if (rank === null || rank === undefined || !Number.isFinite(Number(rank))) return 'Dolmadı / —';
  return Number(rank).toLocaleString('tr-TR');
}

export function formatScore(score) {
  if (score === null || score === undefined || !Number.isFinite(Number(score))) return '—';
  return Number(score).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatNet(net) {
  if (net === null || net === undefined || !Number.isFinite(Number(net))) return '—';
  return Number(net).toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

export function formatCurrency(amount) {
  if (!amount || !Number.isFinite(Number(amount))) return null;
  return `${Number(amount).toLocaleString('tr-TR')} ₺`;
}

export function formatRelativeTime(iso) {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa önce`;
  const days = Math.floor(hrs / 24);
  return `${days} gün önce`;
}

export function suggestRisk(programRank, targetRank) {
  if (!programRank || !targetRank) return 'hedef';
  const ratio = Number(programRank) / Number(targetRank);
  if (ratio < 0.78) return 'hayal';
  if (ratio <= 1.25) return 'hedef';
  return 'guvenli';
}

export const RISK_META = {
  hayal: { label: 'Hayal', color: '#F43F5E', desc: 'Hedefinin üstünde, yüksek rekabet' },
  hedef: { label: 'Hedef', color: '#6366F1', desc: 'Hedef sıralamanla uyumlu' },
  guvenli: { label: 'Güvenli', color: '#10B981', desc: 'Garanti / güvenlik bandı' },
};

export function getUniInitials(name) {
  const words = String(name || '')
    .replace(/\([^)]*\)/g, '')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !['ÜNİVERSİTESİ', 'UNIVERSITESI', 'VE'].includes(w.toUpperCase()));
  if (!words.length) return 'ÜN';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export const TYT_FIELDS = [
  { key: 'turkce', label: 'TYT Türkçe', max: 40 },
  { key: 'matematik', label: 'TYT Matematik', max: 40 },
  { key: 'sosyal', label: 'TYT Sosyal', max: 20 },
  { key: 'fen', label: 'TYT Fen', max: 20 },
];

export function getAytFieldsForScoreType(scoreType) {
  const st = String(scoreType || '').toUpperCase();
  if (st === 'SAY') {
    return [
      { key: 'matematik', label: 'AYT Matematik', max: 40 },
      { key: 'fizik', label: 'AYT Fizik', max: 14 },
      { key: 'kimya', label: 'AYT Kimya', max: 13 },
      { key: 'biyoloji', label: 'AYT Biyoloji', max: 13 },
    ];
  }
  if (st === 'EA') {
    return [
      { key: 'matematik', label: 'AYT Matematik', max: 40 },
      { key: 'edebiyat', label: 'AYT Edebiyat', max: 24 },
      { key: 'tarih1', label: 'AYT Tarih-1', max: 10 },
      { key: 'cografya1', label: 'AYT Coğrafya-1', max: 6 },
    ];
  }
  if (st === 'SÖZ' || st === 'SOZ') {
    return [
      { key: 'edebiyat', label: 'AYT Edebiyat', max: 24 },
      { key: 'tarih1', label: 'AYT Tarih-1', max: 10 },
      { key: 'cografya1', label: 'AYT Coğrafya-1', max: 6 },
      { key: 'tarih2', label: 'AYT Tarih-2', max: 11 },
      { key: 'cografya2', label: 'AYT Coğrafya-2', max: 11 },
      { key: 'felsefe', label: 'AYT Felsefe Grubu', max: 12 },
      { key: 'din', label: 'AYT Din Kültürü', max: 6 },
    ];
  }
  return [];
}

export function generateSyncKey() {
  const words = ['atlas', 'hedef', 'pusula', 'yildiz', 'kampus', 'zirve', 'rota', 'ufuk'];
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const w1 = words[bytes[0] % words.length];
  const w2 = words[bytes[1] % words.length];
  const hex = Array.from(bytes.slice(2))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${w1}-${w2}-${hex}`;
}

export function exportProgramsToCsv(programs) {
  const headers = [
    'Tercih Sırası',
    'Program Kodu',
    'Üniversite',
    'Fakülte',
    'Bölüm',
    'Şehir',
    'Tür',
    'Burs/Ücret',
    'Dil',
    'Puan Türü',
    'Kategori',
    'Son Yıl',
    'Taban Sıralama',
    'Taban Puan',
    'Kontenjan',
    'Yerleşen',
    'TYT Ort. Net',
    'AYT Ort. Net',
    'Yıldız',
    'Notlar',
  ];

  const rows = programs.map((p, idx) => {
    const net0 = p.nets?.[0];
    return [
      idx + 1,
      p.code,
      p.university,
      p.faculty,
      p.department,
      p.city,
      p.universityType,
      p.scholarship,
      p.language,
      p.scoreType,
      RISK_META[p.risk]?.label || p.risk || '',
      p.latestYear || '',
      p.latestRank ?? '',
      p.latestScore ?? '',
      p.quota ?? '',
      p.placed ?? '',
      net0?.tytTotal ?? '',
      net0?.aytTotal ?? net0?.ydt ?? '',
      p.rating || 0,
      (p.notes || '').replace(/\n/g, ' '),
    ];
  });

  const csvCell = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const content = '\uFEFF' + [headers, ...rows].map((r) => r.map(csvCell).join(';')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `TercihAtlas_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
