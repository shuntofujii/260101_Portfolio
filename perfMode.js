/**
 * パフォーマンスモード（full / lite）。
 * 早期シグナルまたはナビサムネ Ready ウォッチドッグで lite に切り替え、演出を抑える。
 */
import { state } from './state.js';
import { getRefs } from './domRefs.js';
import {
  PERF_MODE_DEVICE_MEMORY_MAX,
  PERF_MODE_HARDWARE_CONCURRENCY_MAX,
  PERF_MODE_WATCHDOG_MS
} from './constants.js';
import { retryIncompleteNavThumbnails } from './appNavigation.js';

export const PERF_MODE_FULL = 'full';
export const PERF_MODE_LITE = 'lite';

/** @type {Array<(info: { reason?: string }) => void>} */
const enterLiteHooks = [];

/** @type {ReturnType<typeof setTimeout> | null} */
let watchdogTimerId = null;

/** @type {(() => void) | null} */
let watchdogCleanup = null;

export function isLiteMode() {
  return state.perfMode === PERF_MODE_LITE;
}

export function getPerfMode() {
  return state.perfMode === PERF_MODE_LITE ? PERF_MODE_LITE : PERF_MODE_FULL;
}

/**
 * lite 突入時の追加処理（bootstrap 配線用）。冪等な enterLiteMode 内で一度ずつ呼ばれる。
 * @param {(info: { reason?: string }) => void} fn
 */
export function onEnterLiteMode(fn) {
  if (typeof fn === 'function') enterLiteHooks.push(fn);
}

/**
 * 起動直後に lite へ寄せるべき環境か（saveData / 低速回線 / 低メモリ・低コア / reduced-motion）
 */
export function shouldPreferLiteModeEarly(env = typeof navigator !== 'undefined' ? navigator : null) {
  if (!env) return false;

  try {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
  } catch {
    /* ignore */
  }

  try {
    const connection = env.connection;
    if (connection?.saveData) return true;
    const effectiveType = connection?.effectiveType;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return true;
  } catch {
    /* ignore */
  }

  try {
    const memory = env.deviceMemory;
    if (typeof memory === 'number' && memory > 0 && memory <= PERF_MODE_DEVICE_MEMORY_MAX) {
      return true;
    }
  } catch {
    /* ignore */
  }

  try {
    const cores = env.hardwareConcurrency;
    if (typeof cores === 'number' && cores > 0 && cores <= PERF_MODE_HARDWARE_CONCURRENCY_MAX) {
      return true;
    }
  } catch {
    /* ignore */
  }

  return false;
}

/**
 * ユニークなナビサムネ URL の settled 状態を集計する。
 * @param {ParentNode | null | undefined} navEl
 * @returns {Map<string, boolean>}
 */
export function collectUniqueNavThumbnailSettled(navEl) {
  /** @type {Map<string, boolean>} */
  const map = new Map();
  if (!navEl) return map;

  navEl.querySelectorAll('img.project-thumbnail').forEach((img) => {
    const key = img.dataset.canonicalSrc || img.getAttribute('src') || '';
    if (!key || key.startsWith('data:')) return;
    const settled = Boolean(img.complete);
    const prev = map.get(key);
    map.set(key, Boolean(prev) || settled);
  });

  return map;
}

/**
 * Ready: ユニークサムネの過半数が load/error 済み、またはナビ無しで document 完了。
 * @param {ParentNode | null | undefined} navEl
 */
export function areNavThumbnailsReady(navEl) {
  const unique = collectUniqueNavThumbnailSettled(navEl);
  if (unique.size === 0) {
    return (
      typeof document !== 'undefined' &&
      document.readyState === 'complete' &&
      Boolean(navEl && navEl.childElementCount > 0)
    );
  }

  let settledCount = 0;
  unique.forEach((settled) => {
    if (settled) settledCount += 1;
  });

  // サムネ争奪検知のため、document.complete だけでは Ready にしない（過半数が必要）
  return settledCount >= Math.ceil(unique.size / 2);
}

function clearNavReadyWatchdog() {
  if (watchdogTimerId != null) {
    clearTimeout(watchdogTimerId);
    watchdogTimerId = null;
  }
  if (watchdogCleanup) {
    watchdogCleanup();
    watchdogCleanup = null;
  }
}

/**
 * 軽量モードへ（冪等）。カーソル破棄・サムネリトライ・登録フックを実行。
 * @param {{ reason?: string }} [info]
 * @returns {boolean} 今回新たに lite へ入ったか
 */
export function enterLiteMode(info = {}) {
  if (state.perfMode === PERF_MODE_LITE) return false;

  clearNavReadyWatchdog();

  state.perfMode = PERF_MODE_LITE;
  state.brokenPeriodActive = false;

  if (typeof document !== 'undefined') {
    document.documentElement.dataset.perfMode = 'lite';
  }

  void import('./cursorEffect.js')
    .then((m) => {
      if (typeof m.destroyCursorEffect === 'function') m.destroyCursorEffect();
    })
    .catch(() => {});

  const refs = getRefs();
  retryIncompleteNavThumbnails(refs.projectNavigation);

  const payload = { reason: info.reason };
  enterLiteHooks.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* ignore hook errors */
    }
  });

  return true;
}

/**
 * ナビ描画後に呼び、timeoutMs 内に Ready にならなければ lite へ。
 * @param {ParentNode | null | undefined} navEl
 * @param {{ timeoutMs?: number, onTimeout?: () => void }} [options]
 * @returns {() => void} キャンセル関数
 */
export function startNavReadyWatchdog(navEl, options = {}) {
  clearNavReadyWatchdog();

  if (!navEl || isLiteMode()) {
    return () => {};
  }

  const timeoutMs =
    typeof options.timeoutMs === 'number' ? options.timeoutMs : PERF_MODE_WATCHDOG_MS;
  const onTimeout =
    typeof options.onTimeout === 'function'
      ? options.onTimeout
      : () => {
          enterLiteMode({ reason: 'watchdog' });
        };

  let finished = false;

  const finish = (timedOut) => {
    if (finished) return;
    finished = true;
    clearNavReadyWatchdog();
    if (timedOut) onTimeout();
  };

  const check = () => {
    if (areNavThumbnailsReady(navEl)) finish(false);
  };

  const onImgSettled = (e) => {
    const t = e.target;
    if (!(t instanceof HTMLImageElement)) return;
    if (!t.classList.contains('project-thumbnail')) return;
    check();
  };

  navEl.addEventListener('load', onImgSettled, true);
  navEl.addEventListener('error', onImgSettled, true);

  const onDocReady = () => check();
  if (typeof document !== 'undefined') {
    if (document.readyState === 'complete') {
      check();
    } else {
      document.addEventListener('readystatechange', onDocReady);
    }
  }

  watchdogCleanup = () => {
    navEl.removeEventListener('load', onImgSettled, true);
    navEl.removeEventListener('error', onImgSettled, true);
    if (typeof document !== 'undefined') {
      document.removeEventListener('readystatechange', onDocReady);
    }
  };

  watchdogTimerId = setTimeout(() => finish(true), timeoutMs);
  check();

  return () => finish(false);
}
