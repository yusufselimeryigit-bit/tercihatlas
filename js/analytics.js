/**
 * TercihAtlas — YKS 2027 Projection, Net Gap Comparison, ÖSYM Health Check & PDF Report
 */

import {
  escapeHtml,
  formatRank,
  formatScore,
  formatNet,
  RISK_META,
  TYT_FIELDS,
  getAytFieldsForScoreType,
} from './utils.js';

/**
 * Computes a realistic 2027 rank projection range & quota change warning
 * from 2023–2026 historical ranks and quotas.
 */
export function compute2027Projection(program) {
  const history = (program.history || []).filter((h) => h.rank && h.rank > 0);
  if (!history.length) return null;

  const latest = history[history.length - 1];
  const latestRank = latest.rank;

  // Quota change analysis (latest vs previous year)
  let quotaChangePct = null;
  let quotaAlert = null;
  const prevWithQuota = history.length >= 2 ? history[history.length - 2] : null;
  if (latest.quota && prevWithQuota?.quota && prevWithQuota.quota > 0) {
    quotaChangePct = Math.round(((latest.quota - prevWithQuota.quota) / prevWithQuota.quota) * 100);
    if (quotaChangePct <= -10) {
      quotaAlert = {
        type: 'warn',
        text: `Kontenjan %${Math.abs(quotaChangePct)} azaldı (${prevWithQuota.quota} → ${latest.quota}) — sıralama öne çekebilir.`,
      };
    } else if (quotaChangePct >= 15) {
      quotaAlert = {
        type: 'good',
        text: `Kontenjan %${quotaChangePct} arttı (${prevWithQuota.quota} → ${latest.quota}) — sıralama bir miktar gevşeyebilir.`,
      };
    }
  }

  if (history.length < 2) {
    const low = Math.max(1, Math.round(latestRank * 0.85));
    const high = Math.round(latestRank * 1.15);
    return {
      low,
      high,
      midpoint: latestRank,
      direction: 'stable',
      summary: 'Tek yıllık veri — geniş bant öngörüsü',
      quotaChangePct,
      quotaAlert,
    };
  }

  // Compute weighted YoY relative changes (clamped to avoid absurd spikes)
  const ratios = [];
  for (let i = 1; i < history.length; i++) {
    const prevR = history[i - 1].rank;
    const curR = history[i].rank;
    if (prevR > 0 && curR > 0) {
      const rawPct = (curR - prevR) / prevR; // negative = became harder/better rank
      const clamped = Math.max(-0.35, Math.min(0.45, rawPct));
      ratios.push({ pct: clamped, weight: i }); // newer years carry more weight
    }
  }

  const totalW = ratios.reduce((s, r) => s + r.weight, 0) || 1;
  const weightedPct = ratios.reduce((s, r) => s + r.pct * r.weight, 0) / totalW;

  // Adjust mildly for quota drop/increase
  let quotaBias = 0;
  if (quotaChangePct !== null) {
    if (quotaChangePct <= -10) quotaBias = -0.05;
    else if (quotaChangePct >= 15) quotaBias = 0.05;
  }

  // Dampen extrapolation by 0.55 so projections stay grounded
  const projectedFactor = 1 + (weightedPct * 0.55 + quotaBias);
  const midpoint = Math.max(1, Math.round(latestRank * projectedFactor));

  // Volatility determines band width
  const spread = Math.min(0.24, Math.max(0.08, Math.abs(weightedPct) * 0.55 + 0.08));
  const low = Math.max(1, Math.round(midpoint * (1 - spread)));
  const high = Math.max(low + 1, Math.round(midpoint * (1 + spread)));

  let direction = 'stable';
  let summary = 'İstikrarlı seyir bekleniyor';
  if (midpoint < latestRank * 0.94) {
    direction = 'rising';
    summary = 'Talep yükseliyor · Sıralama öne çekebilir';
  } else if (midpoint > latestRank * 1.07) {
    direction = 'easing';
    summary = 'Gevşeme eğilimi · Biraz daha erişilebilir';
  }

  return {
    low,
    high,
    midpoint,
    direction,
    summary,
    quotaChangePct,
    quotaAlert,
  };
}

/**
 * Compares user's own TYT/AYT/YDT nets against a program's latest placed net averages.
 */
export function compareWithMyNets(program, myNets) {
  if (!myNets || !program?.nets?.length) return null;
  const ref = program.nets[0];

  const hasAnyMyNet =
    Object.values(myNets.tyt || {}).some((v) => v !== null && v !== undefined && v !== '') ||
    Object.values(myNets.ayt || {}).some((v) => v !== null && v !== undefined && v !== '') ||
    (myNets.ydt !== null && myNets.ydt !== undefined && myNets.ydt !== '');

  if (!hasAnyMyNet) return null;

  const numOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  let myTytTotal = 0;
  let hasTyt = false;
  const tytDiffs = {};
  for (const f of TYT_FIELDS) {
    const mine = numOrNull(myNets.tyt?.[f.key]);
    const target = ref.tyt?.[f.key];
    if (mine !== null) {
      myTytTotal += mine;
      hasTyt = true;
    }
    if (mine !== null && target !== null && target !== undefined) {
      tytDiffs[f.key] = Number((mine - target).toFixed(2));
    }
  }

  const tytDiff = hasTyt && ref.tytTotal !== null ? Number((myTytTotal - ref.tytTotal).toFixed(2)) : null;

  const isDil = String(program.scoreType || '').toUpperCase() === 'DİL';
  let aytDiff = null;
  let myAytTotal = null;
  const aytDiffs = {};

  if (isDil) {
    const mine = numOrNull(myNets.ydt);
    if (mine !== null && ref.ydt !== null && ref.ydt !== undefined) {
      myAytTotal = mine;
      aytDiff = Number((mine - ref.ydt).toFixed(2));
    }
  } else {
    const fields = getAytFieldsForScoreType(program.scoreType);
    let sum = 0;
    let hasAyt = false;
    for (const f of fields) {
      const mine = numOrNull(myNets.ayt?.[f.key]);
      const target = ref.ayt?.[f.key];
      if (mine !== null) {
        sum += mine;
        hasAyt = true;
      }
      if (mine !== null && target !== null && target !== undefined) {
        aytDiffs[f.key] = Number((mine - target).toFixed(2));
      }
    }
    if (hasAyt && ref.aytTotal !== null) {
      myAytTotal = Number(sum.toFixed(2));
      aytDiff = Number((sum - ref.aytTotal).toFixed(2));
    }
  }

  const myObp = numOrNull(myNets.obp);
  const obpDiff = myObp !== null && ref.obp !== null ? Number((myObp - ref.obp).toFixed(2)) : null;

  return {
    refYear: ref.year,
    myTytTotal: hasTyt ? Number(myTytTotal.toFixed(2)) : null,
    myAytTotal,
    tytDiff,
    aytDiff,
    obpDiff,
    tytDiffs,
    aytDiffs,
    isDil,
  };
}

/**
 * ÖSYM Preference List Health Check — produces a 0–100 score and actionable guidance cards.
 */
export function analyzePreferenceHealth(programs, targetRank) {
  if (!programs || !programs.length) {
    return { score: 0, alerts: [] };
  }

  const alerts = [];
  let score = 100;

  // 1. Dead-choice / inverted rank ordering check
  const inversions = [];
  for (let i = 0; i < programs.length - 1; i++) {
    const upper = programs[i];
    const lower = programs[i + 1];
    if (upper.latestRank && lower.latestRank && lower.latestRank < upper.latestRank * 0.72) {
      inversions.push({
        upperIdx: i + 1,
        lowerIdx: i + 2,
        upperName: `${upper.university} (${formatRank(upper.latestRank)})`,
        lowerName: `${lower.university} (${formatRank(lower.latestRank)})`,
      });
    }
  }

  if (inversions.length) {
    score -= Math.min(28, inversions.length * 14);
    const first = inversions[0];
    alerts.push({
      level: 'danger',
      title: `Ölü Tercih Riski (${inversions.length} ters sıralama)`,
      detail: `#${first.upperIdx} sıradaki ${first.upperName}, altındaki #${first.lowerIdx} ${first.lowerName} bölümünden belirgin şekilde daha düşük sıralamayla kapatmış. Gerçekten daha çok istemiyorsan sıralamayı gözden geçir.`,
    });
  } else if (programs.length >= 3) {
    alerts.push({
      level: 'good',
      title: 'Sıralama Akışı Tutarlı',
      detail: 'Tercih sıran genel olarak yüksek sıralamadan güvenli banda doğru mantıklı akıyor.',
    });
  }

  // 2. Risk distribution balance
  const hayal = programs.filter((p) => p.risk === 'hayal').length;
  const hedef = programs.filter((p) => p.risk === 'hedef').length;
  const guvenli = programs.filter((p) => p.risk === 'guvenli').length;

  if (programs.length >= 4 && guvenli === 0) {
    score -= 22;
    alerts.push({
      level: 'danger',
      title: 'Güvenli Bant Eksik',
      detail: 'Listende hiç "Güvenli" kategorisinde bölüm yok. Açıkta kalma riskini önlemek için hedef sıralamanın %30–60 gerisinden en az 2–3 güvenli tercih eklemen önerilir.',
    });
  } else if (programs.length >= 5 && guvenli < 2) {
    score -= 10;
    alerts.push({
      level: 'warn',
      title: 'Güvenli Bant Dar',
      detail: `Listende sadece ${guvenli} adet Güvenli bölüm var. Sınav yılı sapmalarına karşı en az 2–3 güvenli tercih bırakmak rahatlatır.`,
    });
  }

  if (programs.length >= 5) {
    const top5Hayal = programs.slice(0, 5).filter((p) => p.risk === 'hayal').length;
    if (top5Hayal === 5) {
      score -= 8;
      alerts.push({
        level: 'warn',
        title: 'İlk 5 Tercihin Tamamı Hayal Bandında',
        detail: 'Üst sıralarda hayal bölümleri olması normal, ancak 4–5. sıralardan itibaren hedef bandına geçiş yapmak listeni dengeler.',
      });
    }
  }

  if (programs.length >= 3 && hedef === 0) {
    score -= 12;
    alerts.push({
      level: 'warn',
      title: 'Hedef Bandı Boş',
      detail: 'Hedef sıralamanla doğrudan örtüşen (Hedef) hiç bölüm yok; listeyi dengelemek için hedef aralığından seçenekler ekle.',
    });
  }

  // 3. Target rank safety margin check
  if (targetRank && targetRank > 0 && programs.length >= 2) {
    const validRanks = programs.map((p) => p.latestRank).filter((r) => r && r > 0);
    if (validRanks.length) {
      const safest = Math.max(...validRanks);
      if (safest < targetRank * 1.15) {
        score -= 12;
        alerts.push({
          level: 'warn',
          title: 'Son Tercihin Hedefine Çok Yakın',
          detail: `En güvenli tercihin ${formatRank(safest)} ile hedef sıralamana (${formatRank(targetRank)}) çok yakın. En alt tercihi en az ${formatRank(Math.round(targetRank * 1.35))} civarına kadar genişletmek güvenli olur.`,
        });
      }
    }
  }

  // 4. Quota drop alert across list
  const quotaDrops = programs.filter((p) => {
    const proj = compute2027Projection(p);
    return proj && proj.quotaChangePct !== null && proj.quotaChangePct <= -10;
  });
  if (quotaDrops.length) {
    alerts.push({
      level: 'warn',
      title: `${quotaDrops.length} Bölümde Kontenjan Düşüşü Var`,
      detail: `${quotaDrops
        .slice(0, 2)
        .map((p) => `${p.university} ${p.department}`)
        .join(', ')} gibi bölümlerde kontenjan daralması tespit edildi; 2027'de sıralamalar öne çekebilir.`,
    });
  }

  // 5. Total count nudge
  if (programs.length < 6) {
    score -= 8;
    alerts.push({
      level: 'info',
      title: `Liste Henüz Kısa (${programs.length} / 24)`,
      detail: '24 tercih hakkın bulunuyor; farklı şehir ve sıralama bantlarından alternatifler ekleyerek listeni güçlendirebilirsin.',
    });
  } else if (guvenli >= 2 && hedef >= 2 && !inversions.length) {
    alerts.push({
      level: 'good',
      title: 'Dengeli Risk Dağılımı',
      detail: `${hayal} Hayal, ${hedef} Hedef ve ${guvenli} Güvenli tercih ile sağlıklı bir ÖSYM bandı oluşturdun.`,
    });
  }

  return {
    score: Math.max(25, Math.min(100, score)),
    alerts,
  };
}

/**
 * Generates an Apple-editorial printable HTML document and triggers native browser Print / Save as PDF.
 */
export function openPrintableReport(state) {
  const programs = state.programs || [];
  const health = analyzePreferenceHealth(programs, state.targetRank);
  const dateStr = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });

  const rowsHtml = programs
    .map((p, idx) => {
      const proj = compute2027Projection(p);
      const net0 = p.nets?.[0];
      const riskLabel = RISK_META[p.risk]?.label || 'Hedef';
      const netTxt = net0
        ? `TYT ${formatNet(net0.tytTotal)} / ${p.scoreType === 'DİL' ? `YDT ${formatNet(net0.ydt)}` : `AYT ${formatNet(net0.aytTotal)}`}`
        : '—';
      const projTxt = proj ? `${formatRank(proj.low)} – ${formatRank(proj.high)}` : '—';
      return `<tr>
        <td class="num"><strong>#${String(idx + 1).padStart(2, '0')}</strong></td>
        <td class="mono">${escapeHtml(p.code)}</td>
        <td>
          <strong>${escapeHtml(p.department)}</strong>
          <div class="sub">${escapeHtml(p.university)} · ${escapeHtml(p.city)} · ${escapeHtml(p.language)} · ${escapeHtml(p.scholarship)}</div>
          ${p.notes ? `<div class="note">Not: ${escapeHtml(p.notes)}</div>` : ''}
        </td>
        <td><span class="tag tag-${escapeHtml(p.risk || 'hedef')}">${escapeHtml(riskLabel)}</span></td>
        <td class="num"><strong>${formatRank(p.latestRank)}</strong><div class="sub">${formatScore(p.latestScore)}</div></td>
        <td class="num">${projTxt}</td>
        <td class="num">${p.quota ?? '—'}</td>
        <td class="num">${escapeHtml(netTxt)}</td>
      </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <title>TercihAtlas — YKS 2027 Tercih Raporu</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
      color: #1D1D1F;
      background: #FFFFFF;
      font-size: 11.5px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 14px;
      border-bottom: 1.5px solid #E5E5EA;
      margin-bottom: 16px;
    }
    h1 { margin: 0; font-size: 24px; letter-spacing: -0.03em; }
    .meta { color: #6E6E73; font-size: 12px; margin-top: 3px; }
    .kpis { display: flex; gap: 18px; }
    .kpi { background: #F5F5F7; padding: 8px 14px; border-radius: 10px; }
    .kpi span { display: block; font-size: 10px; color: #6E6E73; font-weight: 600; text-transform: uppercase; }
    .kpi strong { font-size: 15px; font-variant-numeric: tabular-nums; }
    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #6E6E73;
      padding: 9px 10px;
      border-bottom: 1px solid #D1D1D6;
      background: #F5F5F7;
    }
    td { padding: 9px 10px; border-bottom: 1px solid #EFEFF4; vertical-align: top; }
    .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .mono { font-family: "SF Mono", ui-monospace, monospace; font-size: 11px; color: #48484A; }
    .sub { font-size: 10.5px; color: #6E6E73; margin-top: 2px; }
    .note { font-size: 10.5px; color: #0071E3; margin-top: 3px; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
    .tag-hayal { background: #FFEBF0; color: #E01E4C; }
    .tag-hedef { background: #E8F3FF; color: #0071E3; }
    .tag-guvenli { background: #E9F9EE; color: #1E8E3E; }
    .footer { margin-top: 16px; font-size: 10.5px; color: #86868B; display: flex; justify-content: space-between; }
    .no-print { margin-bottom: 14px; display: flex; gap: 10px; }
    .print-btn {
      background: #0071E3; color: #fff; border: none; border-radius: 999px;
      padding: 8px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">PDF Olarak Kaydet / Yazdır</button>
  </div>
  <div class="header">
    <div>
      <h1>TercihAtlas — YKS 2027 Tercih Listesi</h1>
      <div class="meta">Oluşturulma Tarihi: ${escapeHtml(dateStr)} · Kaynak: YÖK Atlas Güncel Verileri</div>
    </div>
    <div class="kpis">
      <div class="kpi"><span>Toplam Tercih</span><strong>${programs.length} / 24</strong></div>
      <div class="kpi"><span>Hedef Sıralama</span><strong>${state.targetRank ? formatRank(state.targetRank) : '—'}</strong></div>
      <div class="kpi"><span>Sağlık Skoru</span><strong>${health.score} / 100</strong></div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Sıra</th>
        <th>Kod</th>
        <th>Üniversite & Bölüm</th>
        <th>Kategori</th>
        <th>Son Sıra / Puan</th>
        <th>2027 Tahmini</th>
        <th>Kont.</th>
        <th>Ort. Netler</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="8" style="text-align:center;padding:24px;color:#86868B;">Henüz program eklenmedi.</td></tr>'}
    </tbody>
  </table>
  <div class="footer">
    <span>TercihAtlas · YKS 2027 Kişisel Tercih Rehberi</span>
    <span>2027 tahmini sıralama aralıkları geçmiş yıl trendlerine dayalı bilgilendirme amaçlıdır.</span>
  </div>
  <script>setTimeout(() => window.print(), 350);</script>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=1120,height=780');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}

// ============================================================================
// YKS 2027 Estimated Score & Rank Engine (from User's TYT/AYT/YDT Nets + OBP)
// ============================================================================
function interpolateScoreToRank(score, anchors) {
  if (!Number.isFinite(score)) return null;
  if (score >= anchors[0][0]) return anchors[0][1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [s1, r1] = anchors[i];
    const [s2, r2] = anchors[i + 1];
    if (score <= s1 && score >= s2) {
      const t = (s1 - score) / (s1 - s2 || 1);
      // Log-linear interpolation matches real YKS bell-curve rank density
      const logR = Math.log10(r1) + t * (Math.log10(r2) - Math.log10(r1));
      return Math.max(1, Math.round(Math.pow(10, logR)));
    }
  }
  return anchors[anchors.length - 1][1];
}

const RANK_ANCHORS = {
  SAY: [
    [555, 50],
    [545, 500],
    [535, 2000],
    [525, 5200],
    [510, 12000],
    [490, 25000],
    [465, 48000],
    [435, 85000],
    [400, 145000],
    [350, 280000],
    [290, 600000],
    [220, 1400000],
  ],
  EA: [
    [535, 50],
    [515, 500],
    [495, 2200],
    [475, 7000],
    [450, 19000],
    [420, 48000],
    [390, 105000],
    [355, 220000],
    [310, 480000],
    [250, 1100000],
  ],
  SÖZ: [
    [525, 50],
    [500, 600],
    [475, 2800],
    [450, 9500],
    [420, 28000],
    [385, 78000],
    [345, 190000],
    [295, 480000],
    [240, 1050000],
  ],
  DİL: [
    [535, 50],
    [515, 600],
    [490, 2600],
    [465, 7500],
    [435, 18000],
    [400, 38000],
    [355, 78000],
    [300, 140000],
  ],
};

/**
 * Estimates placement scores (Y-SAY, Y-EA, Y-SÖZ, Y-DİL) and approximate Turkey ranks
 * from the user's entered/PDF-imported TYT, AYT, YDT nets and OBP.
 */
export function estimateYksRankFromNets(myNets) {
  if (!myNets) return null;
  const num = (v) => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);

  const tTr = num(myNets.tyt?.turkce);
  const tSos = num(myNets.tyt?.sosyal);
  const tMat = num(myNets.tyt?.matematik);
  const tFen = num(myNets.tyt?.fen);
  const hasTyt = [tTr, tSos, tMat, tFen].some((v) => v !== null);
  if (!hasTyt) return null;

  const tytContrib = (tTr || 0) * 1.32 + (tSos || 0) * 1.36 + (tMat || 0) * 1.32 + (tFen || 0) * 1.36;
  const obp = num(myNets.obp) ?? 450; // sensible default 450 (90 diploma) if omitted
  const obpContrib = obp * 0.12;
  const base = 100;

  const aMat = num(myNets.ayt?.matematik);
  const aFiz = num(myNets.ayt?.fizik);
  const aKim = num(myNets.ayt?.kimya);
  const aBio = num(myNets.ayt?.biyoloji);
  const aEdb = num(myNets.ayt?.edebiyat);
  const aTr1 = num(myNets.ayt?.tarih1);
  const aCg1 = num(myNets.ayt?.cografya1);
  const aTr2 = num(myNets.ayt?.tarih2);
  const aCg2 = num(myNets.ayt?.cografya2);
  const aFel = num(myNets.ayt?.felsefe);
  const aDin = num(myNets.ayt?.din);
  const ydt = num(myNets.ydt);

  const out = {};

  if ([aMat, aFiz, aKim, aBio].some((v) => v !== null)) {
    const score = Number((base + tytContrib + (aMat || 0) * 3.0 + (aFiz || 0) * 2.85 + (aKim || 0) * 3.07 + (aBio || 0) * 3.07 + obpContrib).toFixed(2));
    out.SAY = { score, rank: interpolateScoreToRank(score, RANK_ANCHORS.SAY) };
  }

  if ([aMat, aEdb, aTr1, aCg1].some((v) => v !== null)) {
    const score = Number((base + tytContrib + (aMat || 0) * 3.0 + (aEdb || 0) * 3.0 + (aTr1 || 0) * 2.8 + (aCg1 || 0) * 3.33 + obpContrib).toFixed(2));
    out.EA = { score, rank: interpolateScoreToRank(score, RANK_ANCHORS.EA) };
  }

  if ([aEdb, aTr1, aCg1, aTr2, aCg2, aFel, aDin].some((v) => v !== null)) {
    const score = Number(
      (
        base +
        tytContrib +
        (aEdb || 0) * 3.0 +
        (aTr1 || 0) * 2.8 +
        (aCg1 || 0) * 3.33 +
        (aTr2 || 0) * 2.91 +
        (aCg2 || 0) * 2.91 +
        (aFel || 0) * 3.0 +
        (aDin || 0) * 3.33 +
        obpContrib
      ).toFixed(2),
    );
    out.SÖZ = { score, rank: interpolateScoreToRank(score, RANK_ANCHORS.SÖZ) };
  }

  if (ydt !== null) {
    const score = Number((base + tytContrib + ydt * 3.0 + obpContrib).toFixed(2));
    out.DİL = { score, rank: interpolateScoreToRank(score, RANK_ANCHORS.DİL) };
  }

  return Object.keys(out).length ? { ...out, obpUsed: obp, obpEstimated: num(myNets.obp) === null } : null;
}

/**
 * Checks whether the user's current estimated rank for a program's scoreType qualifies for the program.
 */
export function isProgramCurrentlyReachable(program, estimatedRanks) {
  if (!program?.latestRank || !estimatedRanks) return false;
  const st = String(program.scoreType || '').toUpperCase();
  const est = estimatedRanks[st];
  if (!est || !est.rank) return false;
  return est.rank <= program.latestRank * 1.05; // within 5% safety band
}

// ============================================================================
// Weighted Personal Decision Score Engine (0 – 100 Fit Score)
// ============================================================================
export const DEFAULT_DECISION_WEIGHTS = {
  rank: 25,
  academic: 20,
  language: 20,
  cost: 15,
  personal: 20,
};

export function computeDecisionScores(programs, weights = DEFAULT_DECISION_WEIGHTS, costSettings = {}) {
  if (!programs || !programs.length) return [];

  const w = { ...DEFAULT_DECISION_WEIGHTS, ...(weights || {}) };
  const totalW = Math.max(1, w.rank + w.academic + w.language + w.cost + w.personal);

  const validRanks = programs.map((p) => p.latestRank).filter((r) => r && r > 0);
  const logMinR = validRanks.length ? Math.log10(Math.max(1, Math.min(...validRanks))) : 1;
  const logMaxR = validRanks.length ? Math.log10(Math.max(10, Math.max(...validRanks))) : 5;
  const logSpan = Math.max(0.25, logMaxR - logMinR);

  const staffCounts = programs.map((p) => {
    const s = p.academicStaff || {};
    return (s.prof || 0) * 3 + (s.doc || 0) * 2 + (s.drOgr || 0) * 1.2 + (s.arGor || 0) * 0.5;
  });
  const maxStaff = Math.max(10, ...staffCounts);

  const monthlyIst = costSettings.monthlyIstanbul || 22000;
  const monthlyMetro = costSettings.monthlyMetro || 17000;
  const monthlyOther = costSettings.monthlyOther || 13000;
  const annualCost = (p) => {
    const c = String(p.city || '').toLocaleUpperCase('tr');
    const m = c === 'İSTANBUL' ? monthlyIst : c === 'ANKARA' || c === 'İZMİR' ? monthlyMetro : monthlyOther;
    return (p.tuition || 0) + m * 9;
  };
  const costs = programs.map(annualCost);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(minCost + 1, ...costs);

  return programs
    .map((p, idx) => {
      // 1. Rank / Prestige score (smaller rank = higher score)
      const rankScore = p.latestRank
        ? Math.round(100 - ((Math.log10(Math.max(1, p.latestRank)) - logMinR) / logSpan) * 70)
        : 45;

      // 2. Academic strength + Accreditation bonus
      const acBonus = p.accreditation ? 22 : 0;
      const academicScore = Math.min(100, Math.round((staffCounts[idx] / maxStaff) * 78 + acBonus));

      // 3. Language score (English/German/French > %30 > Turkish)
      const lang = String(p.language || '').toLocaleLowerCase('tr');
      const dept = String(p.department || '').toLocaleLowerCase('tr');
      let languageScore = 60;
      if (lang.includes('ingilizce') || lang.includes('almanca') || lang.includes('fransızca')) {
        languageScore = dept.includes('%30') ? 82 : 100;
      }

      // 4. Cost advantage (cheaper = higher score)
      const costNorm = (costs[idx] - minCost) / (maxCost - minCost);
      const costScore = Math.round(100 - costNorm * 75);

      // 5. Personal rating + pros/cons sentiment
      const starPart = (p.rating || 3) * 16; // default neutral 48 if unrated
      const prosConsBonus = Math.max(-20, Math.min(20, ((p.pros?.length || 0) - (p.cons?.length || 0)) * 5));
      const personalScore = Math.max(10, Math.min(100, Math.round(starPart + prosConsBonus)));

      const fitScore = Math.round(
        (rankScore * w.rank +
          academicScore * w.academic +
          languageScore * w.language +
          costScore * w.cost +
          personalScore * w.personal) /
          totalW,
      );

      return {
        program: p,
        fitScore,
        breakdown: { rankScore, academicScore, languageScore, costScore, personalScore },
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);
}

// ============================================================================
// Subject-Level Weak Link & YKS Rank Leverage Analysis (from PDFs + My Nets)
// ============================================================================
export function analyzeSubjectLeverage(myNets, examHistory, targetProgram, fallbackTargetRank = 15000) {
  const refNet = targetProgram?.nets?.[0] || null;
  const scoreType = String(targetProgram?.scoreType || 'SAY').toUpperCase();
  const est = estimateYksRankFromNets(myNets);
  const baseRank = est?.[scoreType]?.rank || est?.SAY?.rank || est?.EA?.rank || Number(fallbackTargetRank) || 15000;

  const num = (v) => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
  const chrono = [...(examHistory || [])].reverse(); // oldest -> newest

  const subjects = [];

  // TYT subjects
  for (const f of TYT_FIELDS) {
    const historyPts = chrono
      .filter((e) => e.examType === 'TYT' && num(e.tyt?.[f.key]) !== null)
      .map((e) => num(e.tyt[f.key]));
    const current = num(myNets?.tyt?.[f.key]) ?? (historyPts.length ? historyPts[historyPts.length - 1] : null);
    const avg = historyPts.length ? Number((historyPts.reduce((a, b) => a + b, 0) / historyPts.length).toFixed(2)) : null;
    const target = num(refNet?.tyt?.[f.key]);
    const gap = current !== null && target !== null ? Number((current - target).toFixed(2)) : null;
    const deficit = gap !== null && gap < 0 ? Math.abs(gap) : 0;
    const rankGain = deficit > 0 ? Math.max(10, Math.round(baseRank * (1 - Math.pow(0.981, deficit)))) : 0;

    subjects.push({
      group: 'TYT',
      key: `tyt_${f.key}`,
      label: f.label,
      max: f.max,
      current,
      avg,
      target,
      gap,
      rankGain,
      history: historyPts,
      leverageScore: deficit * 1.9,
    });
  }

  // AYT or YDT subjects
  if (scoreType === 'DİL') {
    const current = num(myNets?.ydt);
    const target = num(refNet?.ydt);
    const gap = current !== null && target !== null ? Number((current - target).toFixed(2)) : null;
    const deficit = gap !== null && gap < 0 ? Math.abs(gap) : 0;
    const rankGain = deficit > 0 ? Math.max(10, Math.round(baseRank * (1 - Math.pow(0.96, deficit)))) : 0;
    subjects.push({
      group: 'YDT',
      key: 'ydt',
      label: 'YDT (Yabancı Dil)',
      max: 80,
      current,
      avg: null,
      target,
      gap,
      rankGain,
      history: [],
      leverageScore: deficit * 4.0,
    });
  } else {
    const aytFields = getAytFieldsForScoreType(scoreType);
    for (const f of aytFields) {
      const historyPts = chrono
        .filter((e) => e.examType === 'AYT' && num(e.ayt?.[f.key]) !== null)
        .map((e) => num(e.ayt[f.key]));
      const current = num(myNets?.ayt?.[f.key]) ?? (historyPts.length ? historyPts[historyPts.length - 1] : null);
      const avg = historyPts.length ? Number((historyPts.reduce((a, b) => a + b, 0) / historyPts.length).toFixed(2)) : null;
      const target = num(refNet?.ayt?.[f.key]);
      const gap = current !== null && target !== null ? Number((current - target).toFixed(2)) : null;
      const deficit = gap !== null && gap < 0 ? Math.abs(gap) : 0;
      const rankGain = deficit > 0 ? Math.max(10, Math.round(baseRank * (1 - Math.pow(0.956, deficit)))) : 0;

      subjects.push({
        group: 'AYT',
        key: `ayt_${f.key}`,
        label: f.label,
        max: f.max,
        current,
        avg,
        target,
        gap,
        rankGain,
        history: historyPts,
        leverageScore: deficit * 4.4,
      });
    }
  }

  const withData = subjects.filter((s) => s.current !== null || s.target !== null || s.history.length > 0);
  const priority = [...withData].filter((s) => s.gap !== null && s.gap < 0).sort((a, b) => b.leverageScore - a.leverageScore)[0] || null;

  return {
    scoreType,
    baseRank,
    targetProgram,
    subjects: withData,
    priority,
  };
}

// ============================================================================
// Apple Fitness Activity Rings & Weekly Net Plan toward YKS 2027
// ============================================================================
export function computeGoalRingsAndWeeklyPlan(programs, myNets, targetDateIso = '2027-06-19') {
  const now = Date.now();
  const examTs = new Date(`${targetDateIso}T10:15:00+03:00`).getTime();
  const daysLeft = Math.max(1, Math.ceil((examTs - now) / (1000 * 60 * 60 * 24)));
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));

  const topProg = programs?.[0] || null;
  const topNet = topProg?.nets?.[0] || null;
  const gap = topProg ? compareWithMyNets(topProg, myNets) : null;

  // Ring 1: TYT %
  const targetTyt = topNet?.tytTotal || 95;
  const myTyt = gap?.myTytTotal ?? null;
  const tytPct = myTyt !== null && targetTyt > 0 ? Math.min(100, Math.max(0, Math.round((myTyt / targetTyt) * 100))) : 0;
  const tytDeficit = myTyt !== null && targetTyt ? Math.max(0, Number((targetTyt - myTyt).toFixed(2))) : null;

  // Ring 2: AYT / YDT %
  const isDil = topProg?.scoreType === 'DİL';
  const targetAyt = isDil ? topNet?.ydt || 65 : topNet?.aytTotal || 60;
  const myAyt = gap?.myAytTotal ?? null;
  const aytPct = myAyt !== null && targetAyt > 0 ? Math.min(100, Math.max(0, Math.round((myAyt / targetAyt) * 100))) : 0;
  const aytDeficit = myAyt !== null && targetAyt ? Math.max(0, Number((targetAyt - myAyt).toFixed(2))) : null;

  // Ring 3: Research Checklist %
  const checklistKeys = ['mufredat', 'kampusYurt', 'mezun', 'erasmus'];
  const totalChecks = (programs?.length || 0) * checklistKeys.length;
  let doneChecks = 0;
  for (const p of programs || []) {
    for (const k of checklistKeys) {
      if (p.checklist?.[k]) doneChecks += 1;
    }
  }
  const researchPct = totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0;

  return {
    daysLeft,
    weeksLeft,
    topProg,
    isDil,
    tytPct,
    aytPct,
    researchPct,
    myTyt,
    targetTyt,
    tytDeficit,
    tytPerWeek: tytDeficit !== null ? Number((tytDeficit / weeksLeft).toFixed(2)) : null,
    myAyt,
    targetAyt,
    aytDeficit,
    aytPerWeek: aytDeficit !== null ? Number((aytDeficit / weeksLeft).toFixed(2)) : null,
    doneChecks,
    totalChecks,
  };
}

// ============================================================================
// Side-by-Side Scenario Comparison (Plan A vs Plan B)
// ============================================================================
export function compareScenarios(scenarioA, scenarioB, targetRank, costSettings = {}) {
  const monthlyIst = costSettings.monthlyIstanbul || 22000;
  const monthlyMetro = costSettings.monthlyMetro || 17000;
  const monthlyOther = costSettings.monthlyOther || 13000;

  const summarize = (sc) => {
    const progs = sc?.programs || [];
    const health = analyzePreferenceHealth(progs, targetRank);
    const validRanks = progs.map((p) => p.latestRank).filter((r) => r && r > 0).sort((a, b) => a - b);
    const bestRank = validRanks.length ? validRanks[0] : null;
    const worstRank = validRanks.length ? validRanks[validRanks.length - 1] : null;
    const medianRank = validRanks.length ? validRanks[Math.floor(validRanks.length / 2)] : null;
    const cities = [...new Set(progs.map((p) => p.city).filter(Boolean))];

    const fourYearCosts = progs.map((p) => {
      const c = String(p.city || '').toLocaleUpperCase('tr');
      const m = c === 'İSTANBUL' ? monthlyIst : c === 'ANKARA' || c === 'İZMİR' ? monthlyMetro : monthlyOther;
      return ((p.tuition || 0) + m * 9) * 4;
    });
    const avgFourYearCost = fourYearCosts.length
      ? Math.round(fourYearCosts.reduce((a, b) => a + b, 0) / fourYearCosts.length)
      : 0;

    return {
      id: sc?.id,
      name: sc?.name || 'Plan',
      count: progs.length,
      healthScore: health.score,
      hayal: progs.filter((p) => p.risk === 'hayal').length,
      hedef: progs.filter((p) => p.risk === 'hedef').length,
      guvenli: progs.filter((p) => p.risk === 'guvenli').length,
      bestRank,
      medianRank,
      worstRank,
      cityCount: cities.length,
      cities,
      avgFourYearCost,
      programs: progs,
    };
  };

  const a = summarize(scenarioA);
  const b = summarize(scenarioB);
  const codesA = new Set(a.programs.map((p) => p.code));
  const codesB = new Set(b.programs.map((p) => p.code));

  const common = a.programs.filter((p) => codesB.has(p.code));
  const onlyA = a.programs.filter((p) => !codesB.has(p.code));
  const onlyB = b.programs.filter((p) => !codesA.has(p.code));

  return { a, b, common, onlyA, onlyB };
}
