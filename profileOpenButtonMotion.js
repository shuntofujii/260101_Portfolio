/**
 * プロフィールボタン（_1 / _2）に常時ゆらぎを与える。
 * - 各レイヤーは独立ランダム（連動しない）
 * - 画像中心を軸に左右回転
 * - ローカルYは定位置（translateY 0）を平均とし、その周りをガクガク行き来
 * - サイト通常期間（state.brokenPeriodActive === false）では静止（rAF も停止）
 */

import { state } from './state.js';

function randRange(a, b) {
  return a + Math.random() * (b - a);
}

function createLayerState(seed, directionSign) {
  return {
    seed,
    directionSign,
    t: 0,
    jitterT: randRange(0, Math.PI * 2),
    angle: 0,
    offsetY: 0,
    nextStepAtMs: 0,
    pauseUntilMs: 0,
    /** clientHeight のキャッシュ（毎ステップの強制レイアウトを避ける） */
    cachedHeightPx: 0
  };
}

export function initProfileOpenButtonMotion() {
  if (typeof document === 'undefined' || typeof requestAnimationFrame !== 'function') return;
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const backState = createLayerState(Math.random() * 10 + 0.31, -1);
  const frontState = createLayerState(Math.random() * 10 + 0.79, 1);
  const MAX_SWING_DEG = 9;
  const MAX_SWING_RAD = (MAX_SWING_DEG * Math.PI) / 180;
  const STEP_MIN_MS = 90;
  const STEP_MAX_MS = 180;

  let rafId = 0;
  let backImg = /** @type {HTMLElement | null} */ (null);
  let frontImg = /** @type {HTMLElement | null} */ (null);
  let wasBroken = false;

  const resolveImages = () => {
    backImg = document.querySelector('#profileOpenBtn .profile-open-img--back');
    frontImg = document.querySelector('#profileOpenBtn .profile-open-img--front');
    if (backImg instanceof HTMLElement) {
      backState.cachedHeightPx = backImg.clientHeight || backState.cachedHeightPx;
    }
    if (frontImg instanceof HTMLElement) {
      frontState.cachedHeightPx = frontImg.clientHeight || frontState.cachedHeightPx;
    }
  };

  const resetLayerVisual = (imgEl) => {
    if (!(imgEl instanceof HTMLElement)) return;
    imgEl.style.transform = '';
    imgEl.style.removeProperty('transform-origin');
  };

  const tickLayer = (layerState, nowMs, imgEl) => {
    if (!(imgEl instanceof HTMLElement)) return;

    if (nowMs < layerState.nextStepAtMs) return;

    if (nowMs >= layerState.pauseUntilMs && Math.random() < 0.14) {
      layerState.pauseUntilMs = nowMs + randRange(120, 420);
    }

    const stepMs = randRange(STEP_MIN_MS, STEP_MAX_MS);
    layerState.nextStepAtMs = nowMs + stepMs;

    if (nowMs < layerState.pauseUntilMs) return;

    const dtSec = stepMs / 1000;
    layerState.t += dtSec;
    layerState.jitterT += dtSec * randRange(11, 17);

    const s = layerState.seed;
    const t = layerState.t;

    const a = Math.sin(t * (1.8 + s * 0.06) + s);
    const b = Math.sin(t * (3.9 + s * 0.1) + s * 1.7);
    const c = Math.sin(t * (7.2 + s * 0.08) + s * 2.9);
    const jitter = (Math.sin(layerState.jitterT * 1.9 + s * 3.1) * 0.5 + 0.5 - 0.5) * 0.26;
    let targetAngle = (a * 0.45 + b * 0.35 + c * 0.2 + jitter) * MAX_SWING_RAD;
    if (targetAngle > MAX_SWING_RAD) targetAngle = MAX_SWING_RAD;
    if (targetAngle < -MAX_SWING_RAD) targetAngle = -MAX_SWING_RAD;

    const heightPx = layerState.cachedHeightPx || 46;
    const ampPx = Math.max(0.8, heightPx * 0.04);
    const yWave = Math.sin(t * (4.9 + s * 0.09) + s * 1.2);
    const yJitter = Math.sin(layerState.jitterT * (2.25 + s * 0.05) + s * 4.7);
    const yFast = Math.sin(t * (9.2 + s * 0.11) + s * 2.05);
    const yBlend = yWave * 0.52 + yJitter * 0.33 + yFast * 0.15;
    const chopY = (Math.random() - 0.5) * ampPx * 0.62;
    const targetOffsetY = layerState.directionSign * ampPx * 0.92 * yBlend + chopY;

    const lerpKAngle = 0.24;
    const lerpKY = 0.44;
    layerState.angle += (targetAngle - layerState.angle) * lerpKAngle;
    layerState.offsetY += (targetOffsetY - layerState.offsetY) * lerpKY;

    imgEl.style.transformOrigin = '50% 50%';
    imgEl.style.transform = `rotate(${layerState.angle}rad) translateY(${layerState.offsetY}px)`;
  };

  const loop = (now) => {
    rafId = 0;

    if (!state.brokenPeriodActive) {
      if (wasBroken) {
        resetLayerVisual(backImg);
        resetLayerVisual(frontImg);
        wasBroken = false;
      }
      return;
    }

    wasBroken = true;
    if (!backImg || !frontImg) resolveImages();
    tickLayer(backState, now, backImg);
    tickLayer(frontState, now, frontImg);
    rafId = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const startIfNeeded = () => {
    if (document.visibilityState === 'hidden') return;
    if (!state.brokenPeriodActive) return;
    if (rafId) return;
    resolveImages();
    rafId = requestAnimationFrame(loop);
  };

  // brokenPeriod のポーリング間隔に合わせて起動判定（通常時は rAF ゼロ）
  const pollId = setInterval(() => {
    if (state.brokenPeriodActive) startIfNeeded();
    else if (wasBroken) {
      stop();
      resetLayerVisual(backImg);
      resetLayerVisual(frontImg);
      wasBroken = false;
    }
  }, 500);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      stop();
    } else {
      startIfNeeded();
    }
  });

  window.addEventListener(
    'resize',
    () => {
      if (backImg instanceof HTMLElement) backState.cachedHeightPx = backImg.clientHeight || backState.cachedHeightPx;
      if (frontImg instanceof HTMLElement) frontState.cachedHeightPx = frontImg.clientHeight || frontState.cachedHeightPx;
    },
    { passive: true }
  );

  startIfNeeded();

  // テスト／将来の teardown 用（現状はページ寿命と同一）
  return () => {
    clearInterval(pollId);
    stop();
  };
}
