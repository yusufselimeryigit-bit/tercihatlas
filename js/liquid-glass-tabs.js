/**
 * TercihAtlas — Authentic iOS 26 Liquid Glass Tab Bar Engine (Vanilla ES Module)
 * Spring-physics magnifying glass droplet, evenodd clip-path silhouette cutout,
 * velocity stretch/squash, rubber-band overscroll & symmetric chromatic rim.
 */

export const LG_ICONS = {
  preferences: `<svg viewBox="0 0 24 24" class="lg-icon" fill="currentColor" aria-hidden="true">
    <path d="M6.75 3.5h10.5A2.25 2.25 0 0 1 19.5 5.75v14.32a.85.85 0 0 1-1.36.68L12 16.15l-6.14 4.6a.85.85 0 0 1-1.36-.68V5.75A2.25 2.25 0 0 1 6.75 3.5Z"/>
  </svg>`,
  compare: `<svg viewBox="0 0 24 24" class="lg-icon" fill="currentColor" aria-hidden="true">
    <rect x="3" y="4" width="8" height="16" rx="2.6"/>
    <rect x="13" y="4" width="8" height="16" rx="2.6" opacity="0.88"/>
  </svg>`,
  analysis: `<svg viewBox="0 0 24 24" class="lg-icon" fill="currentColor" aria-hidden="true">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.75a9.25 9.25 0 1 0 0 18.5 9.25 9.25 0 0 0 0-18.5Zm3.85 5.4L13.85 13.85 8.15 15.85 10.15 10.15 15.85 8.15ZM12 10.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"/>
  </svg>`,
  abroad: `<svg viewBox="0 0 24 24" class="lg-icon" fill="currentColor" aria-hidden="true">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.75a9.25 9.25 0 1 0 0 18.5 9.25 9.25 0 0 0 0-18.5Zm-7.2 8.45h3.02c.1-2.06.66-3.9 1.54-5.22a7.52 7.52 0 0 0-4.56 5.22Zm4.72 0h4.96c-.12-2.2-.74-4.18-1.66-5.4a6.4 6.4 0 0 0-.82-.74 6.4 6.4 0 0 0-.82.74c-.92 1.22-1.54 3.2-1.66 5.4Zm6.66 0h3.02a7.52 7.52 0 0 0-4.56-5.22c.88 1.32 1.44 3.16 1.54 5.22Zm3.02 1.6h-3.02c-.1 2.06-.66 3.9-1.54 5.22a7.52 7.52 0 0 0 4.56-5.22Zm-4.72 0H9.52c.12 2.2.74 4.18 1.66 5.4.27.35.55.6.82.74.27-.14.55-.39.82-.74.92-1.22 1.54-3.2 1.66-5.4Zm-6.66 0H4.8a7.52 7.52 0 0 0 4.56 5.22c-.88-1.32-1.44-3.16-1.54-5.22Z"/>
  </svg>`,
};

function rubberBandClamp(val, min, max, overscroll = 14) {
  if (val < min) {
    const excess = min - val;
    return min - overscroll * (1 - Math.exp(-excess / 42));
  }
  if (val > max) {
    const excess = val - max;
    return max + overscroll * (1 - Math.exp(-excess / 42));
  }
  return val;
}

/**
 * Mounts an interactive Liquid Glass Tab Bar inside `container`.
 * Supports both mobile bottom tab bar (`variant: 'mobile'`) and desktop top capsule (`variant: 'desktop'`).
 */
export function createLiquidGlassTabBar(
  container,
  {
    items = [],
    initialId,
    variant = 'mobile',
    ariaLabel = 'App Navigation',
    onChange = null,
  } = {},
) {
  if (!container || !items.length) return null;

  const isDesktop = variant === 'desktop';
  const padding = isDesktop ? 4 : 5;
  const defaultHeight = isDesktop ? 46 : 64;
  const liftExtraW = isDesktop ? 18 : 24;
  const liftExtraH = isDesktop ? 14 : 18;
  const magAmount = isDesktop ? 0.11 : 0.16;

  let activeId = initialId || items[0].id;
  let activeIndex = Math.max(
    0,
    items.findIndex((it) => it.id === activeId),
  );

  const renderSlotHtml = (item, idx, isAccentLayer) => {
    const badgeHtml = item.hasBadge
      ? `<span class="lg-count tabular" data-lg-badge="${item.id}">${item.badge ?? 0}</span>`
      : '';
    if (isDesktop) {
      return `<div class="lg-slot lg-slot-desktop" ${!isAccentLayer ? `role="tab" aria-selected="${idx === activeIndex}"` : ''} data-lg-tab="${item.id}">
        ${item.icon ? `<span class="lg-desktop-icon">${item.icon}</span>` : ''}
        <span class="lg-label">${item.label}</span>
        ${badgeHtml}
      </div>`;
    }
    return `<div class="lg-slot lg-slot-mobile" ${!isAccentLayer ? `role="tab" aria-selected="${idx === activeIndex}"` : ''} data-lg-tab="${item.id}">
      <span class="lg-icon-wrap">${item.icon || ''}${badgeHtml}</span>
      <span class="lg-label">${item.label}</span>
    </div>`;
  };

  container.classList.add('lg-tabbar-host', isDesktop ? 'lg-desktop' : 'lg-mobile');
  container.innerHTML = `
    <div class="lg-bar ${isDesktop ? 'lg-bar-desktop' : 'lg-bar-mobile'}" role="tablist" aria-label="${ariaLabel}" tabindex="0">
      <div class="lg-bar-bg" aria-hidden="true">
        <div class="lg-bar-rim"></div>
      </div>

      <div class="lg-base-layer">
        <div class="lg-grid" style="grid-template-columns:repeat(${items.length}, minmax(0, 1fr));">
          ${items.map((it, idx) => renderSlotHtml(it, idx, false)).join('')}
        </div>
      </div>

      <div class="lg-lens" aria-hidden="true" style="opacity:0;">
        <div class="lg-rest-fill"></div>
        <div class="lg-accent-layer">
          <div class="lg-grid" style="grid-template-columns:repeat(${items.length}, minmax(0, 1fr));">
            ${items.map((it, idx) => renderSlotHtml(it, idx, true)).join('')}
          </div>
        </div>
        <div class="lg-glass-shell">
          <div class="lg-specular-ring"></div>
          <div class="lg-chromatic-ring"></div>
        </div>
      </div>
    </div>
  `;

  const barEl = container.querySelector('.lg-bar');
  const baseLayerEl = container.querySelector('.lg-base-layer');
  const lensEl = container.querySelector('.lg-lens');
  const restFillEl = container.querySelector('.lg-rest-fill');
  const accentLayerEl = container.querySelector('.lg-accent-layer');
  const glassShellEl = container.querySelector('.lg-glass-shell');

  const physics = {
    x: 0,
    vx: 0,
    targetX: 0,
    lift: 0,
    vLift: 0,
    targetLift: 0,
    dragging: false,
    initialized: false,
    barWidth: 0,
    barHeight: defaultHeight,
    padding,
    slotWidth: 0,
    reducedMotion:
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  };

  const gesture = {
    downX: 0,
    downTime: 0,
    didDrag: false,
    startCenterX: 0,
  };

  let rafId = null;
  let lastTime = null;
  let settleTimer = null;

  const getTabCenter = (index, slotW, pad) => pad + (index + 0.5) * slotW;

  const measureGeometry = () => {
    const rect = barEl.getBoundingClientRect();
    if (!rect.width || rect.width < 10) return null;
    const barWidth = rect.width;
    const barHeight = rect.height || defaultHeight;
    const innerWidth = Math.max(0, barWidth - padding * 2);
    const slotWidth = innerWidth / Math.max(1, items.length);
    return { barWidth, barHeight, padding, slotWidth };
  };

  const applyDOM = (centerX, vx, lift) => {
    if (!physics.slotWidth || !physics.barWidth || !lensEl) return;

    const W = physics.barWidth;
    const H = physics.barHeight;
    const clampedLift = Math.max(0, Math.min(1.18, lift));
    const visualLift = Math.max(0, Math.min(1, lift));

    const restW = physics.slotWidth;
    const restH = H - 8;
    const liftedW = physics.slotWidth + liftExtraW;
    const liftedH = H + liftExtraH;

    const speed = physics.reducedMotion ? 0 : Math.abs(vx);
    const velNorm = Math.min(1, speed / 1150);
    const velStretchX = 1 + velNorm * 0.28 * visualLift;
    const velSquashY = 1 - velNorm * 0.14 * visualLift;

    const w = (restW + (liftedW - restW) * clampedLift) * velStretchX;
    const h = Math.max(restH, (restH + (liftedH - restH) * clampedLift) * velSquashY);

    const bx = centerX - w / 2;
    const by = H / 2 - h / 2;

    lensEl.style.opacity = '1';
    lensEl.style.width = `${w.toFixed(2)}px`;
    lensEl.style.height = `${h.toFixed(2)}px`;
    lensEl.style.transform = `translate3d(${bx.toFixed(2)}px, ${by.toFixed(2)}px, 0)`;

    if (restFillEl) {
      restFillEl.style.opacity = `${Math.max(0, 1 - visualLift * 1.9).toFixed(3)}`;
    }
    if (glassShellEl) {
      glassShellEl.style.opacity = `${Math.min(1, visualLift * 1.25).toFixed(3)}`;
    }

    if (accentLayerEl) {
      const mag = physics.reducedMotion ? 1 : 1 + magAmount * visualLift;
      const tx = w / 2 - centerX * mag;
      const ty = h / 2 - (H / 2) * mag;
      accentLayerEl.style.width = `${W.toFixed(2)}px`;
      accentLayerEl.style.height = `${H.toFixed(2)}px`;
      accentLayerEl.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${mag.toFixed(4)})`;
    }

    if (baseLayerEl) {
      const r = Math.max(0, Math.min(w, h) / 2 - 0.05);
      const x1 = bx + r;
      const x2 = Math.max(x1, bx + w - r);
      const y1 = by;
      const y2 = by + h;
      baseLayerEl.style.clipPath = `path(evenodd, "M -120 -120 H ${(W + 120).toFixed(1)} V ${(H + 120).toFixed(1)} H -120 Z M ${x1.toFixed(2)} ${y1.toFixed(2)} H ${x2.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} H ${x1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z")`;
    }
  };

  const startLoop = () => {
    if (rafId !== null) return;
    lastTime = performance.now();

    const step = (now) => {
      const prev = lastTime ?? now;
      const dt = Math.min(0.032, Math.max(0.001, (now - prev) / 1000));
      lastTime = now;

      const posStiffness = physics.dragging ? 540 : 280;
      const posDamping = physics.dragging ? 31 : 20.5;
      const ax = (physics.targetX - physics.x) * posStiffness - physics.vx * posDamping;
      physics.vx += ax * dt;
      physics.x += physics.vx * dt;

      const liftStiffness = physics.targetLift > physics.lift ? 420 : 280;
      const liftDamping = physics.targetLift > physics.lift ? 23 : 22;
      const aLift = (physics.targetLift - physics.lift) * liftStiffness - physics.vLift * liftDamping;
      physics.vLift += aLift * dt;
      physics.lift += physics.vLift * dt;
      if (physics.lift < 0) physics.lift = 0;

      applyDOM(physics.x, physics.vx, physics.lift);

      const settled =
        !physics.dragging &&
        Math.abs(physics.targetX - physics.x) < 0.06 &&
        Math.abs(physics.vx) < 0.35 &&
        Math.abs(physics.targetLift - physics.lift) < 0.002 &&
        Math.abs(physics.vLift) < 0.015;

      if (settled) {
        physics.x = physics.targetX;
        physics.vx = 0;
        physics.lift = physics.targetLift;
        physics.vLift = 0;
        applyDOM(physics.x, 0, physics.lift);
        rafId = null;
        return;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
  };

  const updateAriaSelected = () => {
    baseLayerEl.querySelectorAll('[role="tab"]').forEach((tabEl, idx) => {
      tabEl.setAttribute('aria-selected', String(idx === activeIndex));
    });
  };

  const syncLayout = ({ snap = false } = {}) => {
    const geo = measureGeometry();
    if (!geo || !geo.slotWidth) return;
    physics.barWidth = geo.barWidth;
    physics.barHeight = geo.barHeight;
    physics.padding = geo.padding;
    physics.slotWidth = geo.slotWidth;

    const centerX = getTabCenter(activeIndex, geo.slotWidth, geo.padding);
    if (!physics.initialized || snap) {
      physics.x = centerX;
      physics.targetX = centerX;
      physics.vx = 0;
      physics.initialized = true;
      applyDOM(centerX, 0, physics.lift);
    } else if (!physics.dragging) {
      physics.targetX = centerX;
      startLoop();
    }
  };

  const findNearestIndex = (x, slotW, pad) => {
    const rawIdx = Math.round((x - pad) / Math.max(1, slotW) - 0.5);
    return Math.max(0, Math.min(items.length - 1, rawIdx));
  };

  const commitTab = (index, withFlight = false) => {
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    const targetItem = items[clamped];
    if (!targetItem) return;

    const changed = targetItem.id !== activeId;
    activeId = targetItem.id;
    activeIndex = clamped;
    updateAriaSelected();

    physics.targetX = getTabCenter(clamped, physics.slotWidth, physics.padding);

    if (withFlight) {
      physics.targetLift = 1;
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (!physics.dragging) {
          physics.targetLift = 0;
          startLoop();
        }
      }, 210);
    }

    startLoop();
    if (changed && typeof onChange === 'function') {
      onChange(targetItem.id);
    }
  };

  barEl.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    try {
      barEl.setPointerCapture(e.pointerId);
    } catch {
      /* ignore capture errors on synthetic events */
    }

    if (settleTimer !== null) {
      window.clearTimeout(settleTimer);
      settleTimer = null;
    }

    const geo = measureGeometry();
    if (geo) {
      physics.barWidth = geo.barWidth;
      physics.barHeight = geo.barHeight;
      physics.padding = geo.padding;
      physics.slotWidth = geo.slotWidth;
    }

    const rect = barEl.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const touchedIdx = findNearestIndex(localX, physics.slotWidth, physics.padding);
    const exactCenter = getTabCenter(touchedIdx, physics.slotWidth, physics.padding);

    physics.dragging = true;
    physics.targetLift = 1;
    physics.targetX = exactCenter;

    gesture.downX = e.clientX;
    gesture.downTime = performance.now();
    gesture.didDrag = false;
    gesture.startCenterX = exactCenter;

    startLoop();
  });

  barEl.addEventListener('pointermove', (e) => {
    if (!physics.dragging) return;
    const deltaX = e.clientX - gesture.downX;
    if (!gesture.didDrag) {
      if (Math.abs(deltaX) <= 3) return;
      gesture.didDrag = true;
    }

    const minX = getTabCenter(0, physics.slotWidth, physics.padding);
    const maxX = getTabCenter(items.length - 1, physics.slotWidth, physics.padding);
    const nextX = gesture.startCenterX + deltaX;
    physics.targetX = rubberBandClamp(nextX, minX, maxX, 14);
    startLoop();
  });

  const handlePointerEnd = () => {
    if (!physics.dragging) return;
    physics.dragging = false;

    const elapsed = performance.now() - gesture.downTime;
    const isQuickTap = !gesture.didDrag && elapsed < 240;

    const projectedX = gesture.didDrag ? physics.targetX + physics.vx * 0.03 : physics.targetX;
    const targetIdx = findNearestIndex(projectedX, physics.slotWidth, physics.padding);

    if (isQuickTap) {
      commitTab(targetIdx, true);
    } else {
      physics.targetLift = 0;
      commitTab(targetIdx, false);
    }
  };

  barEl.addEventListener('pointerup', handlePointerEnd);
  barEl.addEventListener('pointercancel', handlePointerEnd);
  barEl.addEventListener('contextmenu', (e) => e.preventDefault());

  barEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      commitTab((activeIndex + 1) % items.length, true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      commitTab((activeIndex - 1 + items.length) % items.length, true);
    } else if (e.key === 'Home') {
      e.preventDefault();
      commitTab(0, true);
    } else if (e.key === 'End') {
      e.preventDefault();
      commitTab(items.length - 1, true);
    }
  });

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => syncLayout({ snap: !physics.initialized })) : null;
  ro?.observe(barEl);
  requestAnimationFrame(() => syncLayout({ snap: true }));

  return {
    setActive(id, { animate = true } = {}) {
      const idx = items.findIndex((it) => it.id === id);
      if (idx === -1) return;
      activeId = id;
      activeIndex = idx;
      updateAriaSelected();

      const geo = measureGeometry();
      if (!geo || !geo.slotWidth) return;
      physics.barWidth = geo.barWidth;
      physics.barHeight = geo.barHeight;
      physics.padding = geo.padding;
      physics.slotWidth = geo.slotWidth;

      const centerX = getTabCenter(idx, geo.slotWidth, geo.padding);
      if (!physics.initialized || !animate) {
        physics.x = centerX;
        physics.targetX = centerX;
        physics.vx = 0;
        physics.initialized = true;
        applyDOM(centerX, 0, physics.lift);
      } else if (!physics.dragging) {
        physics.targetX = centerX;
        startLoop();
      }
    },
    setBadge(id, count) {
      const text = String(count ?? 0);
      container.querySelectorAll(`[data-lg-badge="${id}"]`).forEach((el) => {
        el.textContent = text;
        el.classList.toggle('is-zero', Number(count) === 0);
      });
    },
    syncLayout,
    destroy() {
      ro?.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
    },
  };
}

// ============================================================================
// Universal Draggable Liquid Glass Segmented Control Engine
// Powers ALL .segmented switchers (Kart/Liste, Risk, Analiz 9 Tabs, Puan Türü,
// Sınav Yılı, Karşılaştır, Detay Çekmecesi, Görünüm/Tema, Yurt Dışı Filtre)
// ============================================================================
const attachedSegmentedMap = new WeakMap();
const segmentedHandoffState = new Map();

/**
 * Enhances a `.segmented` element with hold-to-lift, drag-across-options
 * spring physics, rubber-band overscroll, velocity stretch/squash, and
 * Liquid Glass optical droplet shell + chromatic dispersion rim.
 * Safe to call repeatedly after DOM updates or resize events.
 */
export function enhanceLiquidGlassSegmented(seg, keyFallback = '') {
  if (!seg || seg.offsetWidth === 0) return;

  const existing = attachedSegmentedMap.get(seg);
  if (existing) {
    existing.syncActive({ animate: true });
    return;
  }

  const key = seg.id || seg.getAttribute('aria-label') || keyFallback;
  const getButtons = () => Array.from(seg.querySelectorAll('.seg-btn'));

  let thumb = seg.querySelector('.seg-thumb');
  if (!thumb) {
    thumb = document.createElement('div');
    thumb.className = 'seg-thumb seg-lg-thumb';
    thumb.setAttribute('aria-hidden', 'true');
    thumb.innerHTML = `
      <div class="seg-lg-rest-fill"></div>
      <div class="seg-lg-shell">
        <div class="seg-lg-specular"></div>
        <div class="seg-lg-chromatic"></div>
      </div>
    `;
    seg.prepend(thumb);
  } else if (!thumb.classList.contains('seg-lg-thumb')) {
    thumb.classList.add('seg-lg-thumb');
    thumb.innerHTML = `
      <div class="seg-lg-rest-fill"></div>
      <div class="seg-lg-shell">
        <div class="seg-lg-specular"></div>
        <div class="seg-lg-chromatic"></div>
      </div>
    `;
  }

  seg.classList.add('has-thumb', 'lg-draggable-seg');

  const restFillEl = thumb.querySelector('.seg-lg-rest-fill');
  const shellEl = thumb.querySelector('.seg-lg-shell');

  const physics = {
    x: 0,
    vx: 0,
    targetX: 0,
    w: 0,
    vw: 0,
    targetW: 0,
    lift: 0,
    vLift: 0,
    targetLift: 0,
    dragging: false,
    initialized: false,
    barHeight: 34,
    visible: false,
    reducedMotion:
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
  };

  const gesture = {
    downX: 0,
    downTime: 0,
    didDrag: false,
    startCenterX: 0,
    activePointerId: null,
    suppressNextClick: false,
  };

  let rafId = null;
  let lastTime = null;
  let settleTimer = null;
  let hoveredBtn = null;

  const measureButtons = () => {
    const btns = getButtons();
    if (!btns.length) return [];
    const segRect = seg.getBoundingClientRect();
    const padOffset = seg.scrollLeft || 0;
    return btns.map((btn, idx) => {
      const r = btn.getBoundingClientRect();
      const left = r.left - segRect.left + padOffset;
      const width = r.width;
      return { btn, idx, left, width, center: left + width / 2 };
    });
  };

  const findNearestMetric = (metrics, cx) => {
    if (!metrics.length) return null;
    let best = metrics[0];
    let bestDist = Math.abs(cx - best.center);
    for (let i = 1; i < metrics.length; i += 1) {
      const d = Math.abs(cx - metrics[i].center);
      if (d < bestDist) {
        bestDist = d;
        best = metrics[i];
      }
    }
    return best;
  };

  const setHoverBtn = (btn) => {
    if (hoveredBtn === btn) return;
    hoveredBtn?.classList.remove('lg-hover-target');
    hoveredBtn = btn;
    hoveredBtn?.classList.add('lg-hover-target');
  };

  const applyDOM = (centerX, curW, vx, lift) => {
    if (!physics.visible || curW <= 2) {
      thumb.style.opacity = '0';
      return;
    }

    const H = physics.barHeight || seg.offsetHeight || 34;
    const clampedLift = Math.max(0, Math.min(1.18, lift));
    const visualLift = Math.max(0, Math.min(1, lift));

    const restH = Math.max(22, H - 6);
    const liftedH = H + 10;
    const extraW = 14 * clampedLift;

    const speed = physics.reducedMotion ? 0 : Math.abs(vx);
    const velNorm = Math.min(1, speed / 900);
    const velStretchX = 1 + velNorm * 0.24 * visualLift;
    const velSquashY = 1 - velNorm * 0.14 * visualLift;

    const w = Math.max(24, (curW + extraW) * velStretchX);
    const h = Math.max(restH, (restH + (liftedH - restH) * clampedLift) * velSquashY);

    const bx = centerX - w / 2;
    const by = H / 2 - h / 2;

    thumb.style.opacity = '1';
    thumb.style.width = `${w.toFixed(2)}px`;
    thumb.style.height = `${h.toFixed(2)}px`;
    thumb.style.transform = `translate3d(${bx.toFixed(2)}px, ${by.toFixed(2)}px, 0)`;

    if (restFillEl) {
      restFillEl.style.opacity = `${Math.max(0, 1 - visualLift * 1.85).toFixed(3)}`;
    }
    if (shellEl) {
      shellEl.style.opacity = `${Math.min(1, visualLift * 1.3).toFixed(3)}`;
    }
  };

  const startLoop = () => {
    if (rafId !== null) return;
    lastTime = performance.now();

    const step = (now) => {
      const prev = lastTime ?? now;
      const dt = Math.min(0.032, Math.max(0.001, (now - prev) / 1000));
      lastTime = now;

      const posStiffness = physics.dragging ? 560 : 300;
      const posDamping = physics.dragging ? 32 : 22;

      const ax = (physics.targetX - physics.x) * posStiffness - physics.vx * posDamping;
      physics.vx += ax * dt;
      physics.x += physics.vx * dt;

      const aw = (physics.targetW - physics.w) * 340 - physics.vw * 24;
      physics.vw += aw * dt;
      physics.w += physics.vw * dt;

      const liftStiffness = physics.targetLift > physics.lift ? 440 : 280;
      const liftDamping = physics.targetLift > physics.lift ? 23 : 22;
      const aLift = (physics.targetLift - physics.lift) * liftStiffness - physics.vLift * liftDamping;
      physics.vLift += aLift * dt;
      physics.lift += physics.vLift * dt;
      if (physics.lift < 0) physics.lift = 0;

      applyDOM(physics.x, physics.w, physics.vx, physics.lift);

      const settled =
        !physics.dragging &&
        Math.abs(physics.targetX - physics.x) < 0.08 &&
        Math.abs(physics.vx) < 0.4 &&
        Math.abs(physics.targetW - physics.w) < 0.12 &&
        Math.abs(physics.targetLift - physics.lift) < 0.003 &&
        Math.abs(physics.vLift) < 0.02;

      if (settled) {
        physics.x = physics.targetX;
        physics.vx = 0;
        physics.w = physics.targetW;
        physics.vw = 0;
        physics.lift = physics.targetLift;
        physics.vLift = 0;
        applyDOM(physics.x, physics.w, 0, physics.lift);
        rafId = null;
        return;
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
  };

  const syncActive = ({ animate = true, useHandoff = false } = {}) => {
    const metrics = measureButtons();
    physics.barHeight = seg.offsetHeight || 34;
    const activeMetric = metrics.find((m) => m.btn.classList.contains('active'));
    if (!activeMetric) {
      physics.visible = false;
      applyDOM(0, 0, 0, 0);
      return;
    }

    physics.visible = true;
    physics.targetX = activeMetric.center;
    physics.targetW = activeMetric.width;

    if (useHandoff && key) {
      const prev = segmentedHandoffState.get(key);
      if (prev && performance.now() - prev.ts < 500) {
        physics.x = prev.x;
        physics.w = prev.w;
        physics.vx = prev.vx || 0;
        physics.lift = prev.lift;
        physics.targetLift = 0;
        physics.initialized = true;
        segmentedHandoffState.delete(key);
        applyDOM(physics.x, physics.w, physics.vx, physics.lift);
        startLoop();
        return;
      }
    }

    if (!physics.initialized || !animate) {
      physics.x = activeMetric.center;
      physics.w = activeMetric.width;
      physics.vx = 0;
      physics.vw = 0;
      physics.initialized = true;
      applyDOM(physics.x, physics.w, 0, physics.lift);
    } else if (!physics.dragging) {
      startLoop();
    }
  };

  // Capture-phase click guard so pointer-drag commits fire exactly once (no double click)
  seg.addEventListener(
    'click',
    (e) => {
      if (gesture.suppressNextClick) {
        gesture.suppressNextClick = false;
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true,
  );

  seg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const metrics = measureButtons();
    if (!metrics.length) return;

    if (settleTimer !== null) {
      window.clearTimeout(settleTimer);
      settleTimer = null;
    }

    try {
      seg.setPointerCapture(e.pointerId);
    } catch {
      /* ignore capture errors */
    }

    physics.barHeight = seg.offsetHeight || 34;
    const segRect = seg.getBoundingClientRect();
    const localX = e.clientX - segRect.left + (seg.scrollLeft || 0);
    const touched = findNearestMetric(metrics, localX);
    if (!touched) return;

    physics.visible = true;
    physics.dragging = true;
    physics.targetLift = 1;
    physics.targetX = touched.center;
    physics.targetW = touched.width;
    if (!physics.initialized) {
      physics.x = touched.center;
      physics.w = touched.width;
      physics.initialized = true;
    }

    gesture.downX = e.clientX;
    gesture.downTime = performance.now();
    gesture.didDrag = false;
    gesture.startCenterX = touched.center;
    gesture.activePointerId = e.pointerId;

    seg.classList.add('is-dragging');
    setHoverBtn(touched.btn);
    startLoop();
  });

  seg.addEventListener('pointermove', (e) => {
    if (!physics.dragging) return;
    const deltaX = e.clientX - gesture.downX;
    if (!gesture.didDrag) {
      if (Math.abs(deltaX) <= 3) return;
      gesture.didDrag = true;
    }

    const metrics = measureButtons();
    if (!metrics.length) return;

    // Auto-pan scrollable parent (.analysis-tabs-scroll) if user drags near its edges
    const scrollParent = seg.closest('.analysis-tabs-scroll');
    if (scrollParent && scrollParent.scrollWidth > scrollParent.clientWidth + 4) {
      const spRect = scrollParent.getBoundingClientRect();
      if (e.clientX > spRect.right - 34) {
        scrollParent.scrollLeft += 10;
        gesture.startCenterX += 10;
      } else if (e.clientX < spRect.left + 34) {
        scrollParent.scrollLeft -= 10;
        gesture.startCenterX -= 10;
      }
    }

    const minX = metrics[0].center;
    const maxX = metrics[metrics.length - 1].center;
    const nextX = rubberBandClamp(gesture.startCenterX + deltaX, minX, maxX, 11);
    physics.targetX = nextX;

    const nearest = findNearestMetric(metrics, nextX);
    if (nearest) {
      physics.targetW = nearest.width;
      setHoverBtn(nearest.btn);
    }
    startLoop();
  });

  const handlePointerEnd = (e) => {
    if (!physics.dragging) return;
    physics.dragging = false;
    seg.classList.remove('is-dragging');
    setHoverBtn(null);

    try {
      if (gesture.activePointerId !== null && seg.hasPointerCapture?.(gesture.activePointerId)) {
        seg.releasePointerCapture(gesture.activePointerId);
      }
    } catch {
      /* ignore */
    }
    gesture.activePointerId = null;

    const metrics = measureButtons();
    if (!metrics.length) {
      physics.targetLift = 0;
      startLoop();
      return;
    }

    const elapsed = performance.now() - gesture.downTime;
    const isQuickTap = !gesture.didDrag && elapsed < 240;
    const projectedX = gesture.didDrag ? physics.targetX + physics.vx * 0.025 : physics.targetX;
    const target = findNearestMetric(metrics, projectedX);

    if (!target) {
      physics.targetLift = 0;
      startLoop();
      return;
    }

    physics.targetX = target.center;
    physics.targetW = target.width;

    const alreadyActive = target.btn.classList.contains('active');
    if (alreadyActive) {
      physics.targetLift = 0;
      gesture.suppressNextClick = gesture.didDrag;
      startLoop();
      return;
    }

    // Store live momentum/lift state so if target.btn.click() triggers renderAll(),
    // the freshly mounted .segmented seamlessly lands the Liquid Glass droplet!
    if (key) {
      segmentedHandoffState.set(key, {
        x: physics.x,
        w: physics.w,
        vx: physics.vx,
        lift: Math.max(physics.lift, isQuickTap ? 0.88 : 0.72),
        ts: performance.now(),
      });
    }

    if (isQuickTap) {
      physics.targetLift = 1;
      settleTimer = window.setTimeout(() => {
        if (!physics.dragging) {
          physics.targetLift = 0;
          startLoop();
        }
      }, 175);
    } else {
      physics.targetLift = 0;
    }

    startLoop();

    // Prevent the browser's own follow-up click from double-firing, then trigger target button
    if (e.type !== 'pointercancel') {
      gesture.suppressNextClick = true;
      setTimeout(() => {
        gesture.suppressNextClick = false;
      }, 80);
      // Temporarily allow our programmatic click through the capture guard
      gesture.suppressNextClick = false;
      target.btn.click();
      // Suppress any subsequent native click that fires right after pointerup
      gesture.suppressNextClick = true;
      requestAnimationFrame(() => {
        gesture.suppressNextClick = false;
      });
    }
  };

  seg.addEventListener('pointerup', handlePointerEnd);
  seg.addEventListener('pointercancel', handlePointerEnd);
  seg.addEventListener('contextmenu', (e) => {
    if (physics.dragging) e.preventDefault();
  });

  const api = { syncActive };
  attachedSegmentedMap.set(seg, api);
  syncActive({ animate: false, useHandoff: true });
}

