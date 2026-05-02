/**
 * プロフィールボタン（_1 / _2）に常時ゆらぎを与える。
 * - 各レイヤーは独立ランダム（連動しない）
 * - 画像中心を軸に左右回転
 * - ローカルYは定位置（translateY 0）を平均とし、その周りをガクガク行き来
 * - サイト通常期間（state.brokenPeriodActive === false）では静止
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
    pauseUntilMs: 0
  };
}

export function initProfileOpenButtonMotion() {
  if (typeof document === 'undefined' || typeof requestAnimationFrame !== 'function') return;
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const backState = createLayerState(Math.random() * 10 + 0.31, -1); // 波形の向きを反転（見た目の差）
  const frontState = createLayerState(Math.random() * 10 + 0.79, 1);
  const MAX_SWING_DEG = 9;
  const MAX_SWING_RAD = (MAX_SWING_DEG * Math.PI) / 180;
  const STEP_MIN_MS = 50;
  const STEP_MAX_MS = 150;

  let rafId = 0;
  let lastNow = 0;

  const tickLayer = (layerState, nowMs, imgEl) => {
    if (!state.brokenPeriodActive) {
      imgEl.style.transform = '';
      imgEl.style.removeProperty('transform-origin');
      return;
    }

    if (nowMs < layerState.nextStepAtMs) return;

    // ランダムに一時停止（速度ゼロ）
    if (nowMs >= layerState.pauseUntilMs && Math.random() < 0.14) {
      layerState.pauseUntilMs = nowMs + randRange(120, 420);
    }

    const stepMs = randRange(STEP_MIN_MS, STEP_MAX_MS);
    layerState.nextStepAtMs = nowMs + stepMs;

    // 停止中は値を据え置き（カクッと止まる）
    if (nowMs < layerState.pauseUntilMs) return;

    const dtSec = stepMs / 1000;
    layerState.t += dtSec;
    layerState.jitterT += dtSec * randRange(11, 17);

    const s = layerState.seed;
    const t = layerState.t;

    // 回転ターゲット（左右揺れ）
    const a = Math.sin(t * (1.8 + s * 0.06) + s);
    const b = Math.sin(t * (3.9 + s * 0.1) + s * 1.7);
    const c = Math.sin(t * (7.2 + s * 0.08) + s * 2.9);
    const jitter = (Math.sin(layerState.jitterT * 1.9 + s * 3.1) * 0.5 + 0.5 - 0.5) * 0.26;
    let targetAngle = (a * 0.45 + b * 0.35 + c * 0.2 + jitter) * MAX_SWING_RAD;
    if (targetAngle > MAX_SWING_RAD) targetAngle = MAX_SWING_RAD;
    if (targetAngle < -MAX_SWING_RAD) targetAngle = -MAX_SWING_RAD;

    // ローカルY: 平均0（元位置）。高めの周波数＋ステップごと対称ノイズでガク感
    const ampPx = Math.max(0.8, imgEl.clientHeight * 0.04);
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
    // rotate + translateY: 傾きに対して垂直方向（ローカルY）へ移動
    imgEl.style.transform = `rotate(${layerState.angle}rad) translateY(${layerState.offsetY}px)`;
  };

  const loop = (now) => {
    lastNow = now;

    const back = document.querySelector('#profileOpenBtn .profile-open-img--back');
    const front = document.querySelector('#profileOpenBtn .profile-open-img--front');

    if (back instanceof HTMLElement) tickLayer(backState, now, back);
    if (front instanceof HTMLElement) tickLayer(frontState, now, front);

    rafId = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    lastNow = 0;
  };

  const start = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(loop);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stop();
    else start();
  });

  start();
}
