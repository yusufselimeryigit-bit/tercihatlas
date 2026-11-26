/**
 * TercihAtlas — Apple Craft Micro-Interactions Engine (v34)
 * 1. Digital Crown Haptic Audio Tick (Web Audio API, toggleable)
 * 2. Apple Stocks Smooth Number Rolling (Odometer interpolation)
 * 3. Liquid Glass Draggable Sliders (Floating glass bubble + droplet thumb)
 * 4. visionOS Specular Pointer Light + Micro 3D Card Tilt (Desktop fine-pointer only)
 * 5. Micro Celebration Sparkle Burst (for rank upgrades & winner transitions)
 */

const HAPTIC_STORAGE_KEY = 'tercihatlas_haptics_v1';
let audioCtx = null;
let hapticsEnabled = true;

try {
  const saved = localStorage.getItem(HAPTIC_STORAGE_KEY);
  if (saved === '0' || saved === 'false') hapticsEnabled = false;
} catch {
  /* ignore storage restrictions */
}

export function isHapticsEnabled() {
  return hapticsEnabled;
}

export function setHapticsEnabled(enabled) {
  hapticsEnabled = Boolean(enabled);
  try {
    localStorage.setItem(HAPTIC_STORAGE_KEY, hapticsEnabled ? '1' : '0');
  } catch {
    /* ignore */
  }
  if (hapticsEnabled) playHapticTick('commit');
}

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try {
      audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

let lastTickTime = 0;

/**
 * Synthesizes an ultra-subtle 8ms Apple Watch Digital Crown mechanical tick.
 * @param {'step'|'commit'|'success'} kind
 */
export function playHapticTick(kind = 'step') {
  if (!hapticsEnabled) return;
  const nowMs = performance.now();
  if (kind === 'step' && nowMs - lastTickTime < 28) return;
  lastTickTime = nowMs;

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(kind === 'success' ? [8, 28, 10] : kind === 'commit' ? 7 : 4);
    } catch {
      /* ignore */
    }
  }

  const ctx = getAudioContext();
  if (!ctx || ctx.state !== 'running') return;

  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'bandpass';
    filter.Q.value = 2.2;

    if (kind === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1180, t);
      osc.frequency.exponentialRampToValueAtTime(1760, t + 0.045);
      filter.frequency.value = 1500;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.036, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
      return;
    }

    const isCommit = kind === 'commit';
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isCommit ? 1560 : 1920, t);
    osc.frequency.exponentialRampToValueAtTime(isCommit ? 680 : 940, t + 0.011);
    filter.frequency.value = isCommit ? 1350 : 1750;

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(isCommit ? 0.032 : 0.022, t + 0.0018);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + (isCommit ? 0.018 : 0.011));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.022);
  } catch {
    /* ignore audio errors */
  }
}

// ============================================================================
// 1. Apple Stocks Smooth Number Rolling (Odometer Interpolation)
// ============================================================================
const prevNumericValues = new Map();
const activeRollRafs = new Map();

export function animateNumberRoll(el, key, toValue, formatter, { duration = 280 } = {}) {
  if (!el || !Number.isFinite(toValue)) return;

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const fromValue = prevNumericValues.has(key) ? prevNumericValues.get(key) : toValue;
  prevNumericValues.set(key, toValue);

  if (activeRollRafs.has(key)) {
    cancelAnimationFrame(activeRollRafs.get(key));
    activeRollRafs.delete(key);
  }

  if (reduced || Math.abs(toValue - fromValue) < 1e-4) {
    el.textContent = formatter(toValue);
    return;
  }

  const start = performance.now();
  el.classList.add('is-rolling');

  const frame = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const cur = fromValue + (toValue - fromValue) * eased;
    el.textContent = formatter(cur);

    if (t < 1) {
      activeRollRafs.set(key, requestAnimationFrame(frame));
    } else {
      el.textContent = formatter(toValue);
      el.classList.remove('is-rolling');
      activeRollRafs.delete(key);
    }
  };

  activeRollRafs.set(key, requestAnimationFrame(frame));
}

// ============================================================================
// 2. Liquid Glass Draggable Sliders (Floating Bubble + Droplet Thumb)
// ============================================================================
function formatSliderBubble(input) {
  const val = Number(input.value);
  if (input.dataset.matrixKey) return `${val} / 10`;
  if (input.id === 'simTytSlider' || input.id === 'simAytSlider') return `+${val} net`;
  if (input.dataset.weightKey) return `${val}`;
  return String(val);
}

export function enhanceLiquidGlassSliders(root = document) {
  const sliders = root.querySelectorAll('input[type="range"].apple-slider');
  sliders.forEach((slider) => {
    if (slider.dataset.lgSliderInit === '1') {
      slider._lgSyncVisual?.();
      return;
    }
    slider.dataset.lgSliderInit = '1';

    const wrap = document.createElement('div');
    wrap.className = 'lg-slider-wrap';
    slider.parentNode?.insertBefore(wrap, slider);
    wrap.appendChild(slider);

    const fill = document.createElement('div');
    fill.className = 'lg-slider-fill';
    fill.setAttribute('aria-hidden', 'true');
    wrap.insertBefore(fill, slider);

    const bubble = document.createElement('div');
    bubble.className = 'lg-slider-bubble tabular';
    bubble.setAttribute('aria-hidden', 'true');
    wrap.appendChild(bubble);

    let lastVal = slider.value;

    const syncVisual = () => {
      const min = Number(slider.min) || 0;
      const max = Number(slider.max) || 100;
      const val = Number(slider.value) || 0;
      const pct = max > min ? ((val - min) / (max - min)) * 100 : 0;
      fill.style.width = `${pct.toFixed(2)}%`;
      bubble.style.left = `${pct.toFixed(2)}%`;
      bubble.textContent = formatSliderBubble(slider);
    };

    slider._lgSyncVisual = syncVisual;
    syncVisual();

    const activate = () => wrap.classList.add('is-active');
    const deactivate = () => wrap.classList.remove('is-active');

    slider.addEventListener('pointerdown', activate, { passive: true });
    slider.addEventListener('pointerup', deactivate, { passive: true });
    slider.addEventListener('pointercancel', deactivate, { passive: true });
    slider.addEventListener('blur', deactivate);
    slider.addEventListener('input', () => {
      syncVisual();
      if (slider.value !== lastVal) {
        lastVal = slider.value;
        playHapticTick('step');
      }
    });
  });
}

// ============================================================================
// 5 & 8. visionOS Specular Pointer Light + Micro 3D Card Tilt (Desktop Only)
// ============================================================================
let desktopPhysicsBound = false;

export function initDesktopGlassPhysics() {
  if (desktopPhysicsBound || typeof window === 'undefined') return;
  const finePointer = window.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (!finePointer || reduced) return;
  desktopPhysicsBound = true;

  const SPECULAR_SELECTOR = '.prog-card, .kpi-card, .sample-tile, .yks-hero-result, .radar-compare-wrap';
  const TILT_SELECTOR = '.prog-card:not(.dragging):not(.is-selected), .sample-tile';

  let activeCard = null;
  let rafId = 0;
  let lastEv = null;

  const resetCard = (el) => {
    if (!el) return;
    el.classList.remove('vg-lit');
    el.style.removeProperty('--tilt-x');
    el.style.removeProperty('--tilt-y');
  };

  const applyFrame = () => {
    rafId = 0;
    const e = lastEv;
    if (!e) return;
    const target = e.target?.closest?.(SPECULAR_SELECTOR) || null;
    if (activeCard && activeCard !== target) {
      resetCard(activeCard);
    }
    activeCard = target;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;

    target.style.setProperty('--mx', `${(relX * 100).toFixed(1)}%`);
    target.style.setProperty('--my', `${(relY * 100).toFixed(1)}%`);
    target.classList.add('vg-lit');

    if (target.matches(TILT_SELECTOR)) {
      const tiltY = ((relX - 0.5) * 3.6).toFixed(2); // ±1.8deg
      const tiltX = ((0.5 - relY) * 3.6).toFixed(2); // ±1.8deg
      target.style.setProperty('--tilt-x', `${tiltX}deg`);
      target.style.setProperty('--tilt-y', `${tiltY}deg`);
    }
  };

  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      lastEv = e;
      if (!rafId) rafId = requestAnimationFrame(applyFrame);
    },
    { passive: true },
  );

  document.addEventListener(
    'pointerleave',
    () => {
      resetCard(activeCard);
      activeCard = null;
    },
    { passive: true },
  );
}

// ============================================================================
// 7. Subtle Apple Celebration Sparkle Burst (on Upgrade / Winner)
// ============================================================================
export function triggerCelebrationSpark(anchorEl) {
  if (!anchorEl || typeof document === 'undefined') return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (reduced) return;

  const rect = anchorEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const host = document.createElement('div');
  host.className = 'apple-spark-burst';
  host.style.left = `${rect.left + rect.width / 2}px`;
  host.style.top = `${rect.top + Math.min(28, rect.height / 2)}px`;

  const colors = ['#0071E3', '#34C759', '#FF9F0A', '#AF52DE', '#38BDF8'];
  const count = 10;
  for (let i = 0; i < count; i += 1) {
    const p = document.createElement('i');
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const dist = 26 + Math.random() * 26;
    p.style.setProperty('--sx', `${(Math.cos(angle) * dist).toFixed(1)}px`);
    p.style.setProperty('--sy', `${(Math.sin(angle) * dist - 6).toFixed(1)}px`);
    p.style.setProperty('--sc', colors[i % colors.length]);
    host.appendChild(p);
  }

  document.body.appendChild(host);
  playHapticTick('success');
  setTimeout(() => host.remove(), 680);
}
