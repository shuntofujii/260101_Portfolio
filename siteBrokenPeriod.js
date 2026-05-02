/**
 * サイト全体の「通常期間 / 崩れ期間」を一元管理する。
 *
 * タイミング（目安・ジッターは一様乱数）:
 * - 通常中: 約 (EVAL_MIN_MS + EVAL_JITTER_MS/2) 秒ごとに 1 回、崩れへ入るか抽選
 * - 崩れ中: 約 (EVAL_MIN_MS_WHILE_BROKEN + JITTER/2) 秒ごとに 1 回、通常へ戻るか抽選
 *
 * 通常→崩れの実効確率 = ベース + 未操作 + 連続崩れ + 滞在 + 滞在×未操作シナジー（上限 CAP）。
 * 「滞在が長い」「未操作が続く」の両方が強いほど崩れ寄り（崩れ→通常はより稀に）。
 *
 * - カーソルは `brokenVisualBlend` で視覚だけ遅れて追従（cursorEffect.js）
 */

import { state } from './state.js';
import {
  SITE_BROKEN_GRACE_AFTER_LAND_MS,
  SITE_BROKEN_EVAL_MIN_MS,
  SITE_BROKEN_EVAL_MIN_MS_WHILE_BROKEN,
  SITE_BROKEN_EVAL_JITTER_MS,
  SITE_BROKEN_TO_NORMAL_CHANCE,
  SITE_BROKEN_TO_BROKEN_CHANCE,
  SITE_BROKEN_TO_BROKEN_IDLE_MAX_EXTRA,
  SITE_BROKEN_IDLE_BOOST_SATURATION_SEC,
  SITE_BROKEN_REPEAT_WINDOW_SEC,
  SITE_BROKEN_REPEAT_BROKEN_EXTRA,
  SITE_BROKEN_TO_BROKEN_CAP,
  SITE_BROKEN_DWELL_BIAS_START_SEC,
  SITE_BROKEN_DWELL_BIAS_SAT_SEC,
  SITE_BROKEN_DWELL_TO_NORMAL_SCALE_MIN,
  SITE_BROKEN_DWELL_TO_BROKEN_EXTRA,
  SITE_BROKEN_DWELL_IDLE_SYNERGY_EXTRA,
  SITE_BROKEN_POLL_MS
} from './constants.js';

function nowMs() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let landTimeMs = 0;
let nextEvalAtMs = 0;
let intervalId = null;

function scheduleNextEval() {
  const minMs = state.brokenPeriodActive
    ? SITE_BROKEN_EVAL_MIN_MS_WHILE_BROKEN
    : SITE_BROKEN_EVAL_MIN_MS;
  nextEvalAtMs = nowMs() + minMs + Math.random() * SITE_BROKEN_EVAL_JITTER_MS;
}

function markActivity() {
  const n = nowMs();
  state.lastUserActivityPerfMs = n;
}

function tick() {
  if (prefersReducedMotion()) {
    state.brokenPeriodActive = false;
    return;
  }

  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return;
  }

  const now = nowMs();

  if (now - landTimeMs < SITE_BROKEN_GRACE_AFTER_LAND_MS) {
    state.brokenPeriodActive = false;
    return;
  }

  if (now < nextEvalAtMs) {
    return;
  }

  scheduleNextEval();

  const sessionSec = (now - landTimeMs) / 1000;
  const dwellSpan = Math.max(0.001, SITE_BROKEN_DWELL_BIAS_SAT_SEC - SITE_BROKEN_DWELL_BIAS_START_SEC);
  const dwellGain = Math.min(
    1,
    Math.max(0, (sessionSec - SITE_BROKEN_DWELL_BIAS_START_SEC) / dwellSpan)
  );

  const lastAct = state.lastUserActivityPerfMs;
  const idleSec = lastAct == null ? 0 : Math.max(0, (now - lastAct) / 1000);
  const idleSat = Math.max(0.001, SITE_BROKEN_IDLE_BOOST_SATURATION_SEC);
  const idleGain = Math.min(1, idleSec / idleSat);

  /** 滞在も未操作も強いほど 1 に近い（どちらか弱いと緩む） */
  const stayBrokenAffinity = 1 - (1 - dwellGain) * (1 - idleGain);

  if (state.brokenPeriodActive) {
    const exitScale =
      1 + (SITE_BROKEN_DWELL_TO_NORMAL_SCALE_MIN - 1) * stayBrokenAffinity;
    const pNormal = SITE_BROKEN_TO_NORMAL_CHANCE * exitScale;
    if (Math.random() < pNormal) {
      state.brokenPeriodActive = false;
      state.lastBrokenExitPerfMs = now;
    }
  } else {
    let pBroken = SITE_BROKEN_TO_BROKEN_CHANCE;
    pBroken += idleGain * SITE_BROKEN_TO_BROKEN_IDLE_MAX_EXTRA;

    pBroken += dwellGain * SITE_BROKEN_DWELL_TO_BROKEN_EXTRA;

    pBroken += dwellGain * idleGain * SITE_BROKEN_DWELL_IDLE_SYNERGY_EXTRA;

    const exitAt = state.lastBrokenExitPerfMs;
    if (exitAt != null) {
      const sinceExit = (now - exitAt) / 1000;
      const win = SITE_BROKEN_REPEAT_WINDOW_SEC;
      if (sinceExit < win && win > 0) {
        pBroken += SITE_BROKEN_REPEAT_BROKEN_EXTRA * (1 - sinceExit / win);
      }
    }

    pBroken = Math.min(SITE_BROKEN_TO_BROKEN_CAP, Math.max(0, pBroken));

    if (Math.random() < pBroken) {
      state.brokenPeriodActive = true;
      state.lastBrokenExitPerfMs = null;
    }
  }
}

/**
 * データ読み込み・主要 UI 準備が終わったあとに 1 回だけ呼ぶ（app.js）。
 */
export function initSiteBrokenPeriod() {
  if (typeof window === 'undefined') return;

  const t0 = nowMs();
  landTimeMs = t0;
  state.lastUserActivityPerfMs = t0;

  nextEvalAtMs =
    t0 +
    SITE_BROKEN_GRACE_AFTER_LAND_MS +
    SITE_BROKEN_EVAL_MIN_MS +
    Math.random() * SITE_BROKEN_EVAL_JITTER_MS;

  const opts = { capture: true, passive: true };
  window.addEventListener('mousemove', markActivity, opts);
  window.addEventListener('mousedown', markActivity, opts);
  window.addEventListener('pointerdown', markActivity, opts);
  window.addEventListener('click', markActivity, opts);
  window.addEventListener('touchstart', markActivity, opts);
  window.addEventListener('touchmove', markActivity, opts);
  window.addEventListener('keydown', markActivity, opts);

  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
  intervalId = window.setInterval(tick, SITE_BROKEN_POLL_MS);
  tick();
}
