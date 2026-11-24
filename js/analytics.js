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
