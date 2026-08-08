import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { state } from '../state.js';
import { setRefs } from '../domRefs.js';
import {
  PERF_MODE_FULL,
  PERF_MODE_LITE,
  areNavThumbnailsReady,
  collectUniqueNavThumbnailSettled,
  enterLiteMode,
  getPerfMode,
  isLiteMode,
  shouldPreferLiteModeEarly,
  startNavReadyWatchdog
} from '../perfMode.js';

function resetPerfState() {
  state.perfMode = PERF_MODE_FULL;
  state.brokenPeriodActive = true;
  state.cursorEffectInstance = null;
  document.documentElement.removeAttribute('data-perf-mode');
}

function makeThumb(src, { complete = false, naturalWidth = 0 } = {}) {
  const img = document.createElement('img');
  img.className = 'project-thumbnail';
  img.dataset.canonicalSrc = src;
  Object.defineProperty(img, 'complete', { configurable: true, get: () => complete });
  Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => naturalWidth });
  img.src = src;
  return img;
}

describe('shouldPreferLiteModeEarly', () => {
  it('saveData / 低速回線 / 低メモリ / 低コア / reduced-motion で true', () => {
    expect(
      shouldPreferLiteModeEarly({
        connection: { saveData: true, effectiveType: '4g' },
        deviceMemory: 16,
        hardwareConcurrency: 16
      })
    ).toBe(true);

    expect(
      shouldPreferLiteModeEarly({
        connection: { saveData: false, effectiveType: '2g' },
        deviceMemory: 16,
        hardwareConcurrency: 16
      })
    ).toBe(true);

    expect(
      shouldPreferLiteModeEarly({
        connection: { saveData: false, effectiveType: '4g' },
        deviceMemory: 4,
        hardwareConcurrency: 16
      })
    ).toBe(true);

    expect(
      shouldPreferLiteModeEarly({
        connection: { saveData: false, effectiveType: '4g' },
        deviceMemory: 16,
        hardwareConcurrency: 4
      })
    ).toBe(true);

    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(
      shouldPreferLiteModeEarly({
        connection: { saveData: false, effectiveType: '4g' },
        deviceMemory: 16,
        hardwareConcurrency: 16
      })
    ).toBe(true);
  });

  it('余裕のある環境では false', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(
      shouldPreferLiteModeEarly({
        connection: { saveData: false, effectiveType: '4g' },
        deviceMemory: 8,
        hardwareConcurrency: 8
      })
    ).toBe(false);
  });
});

describe('areNavThumbnailsReady', () => {
  it('ユニーク URL の過半数が settled なら Ready', () => {
    const nav = document.createElement('nav');
    nav.appendChild(makeThumb('https://cdn/a.webp', { complete: true, naturalWidth: 90 }));
    nav.appendChild(makeThumb('https://cdn/b.webp', { complete: false }));
    nav.appendChild(makeThumb('https://cdn/a.webp', { complete: false })); // duplicate URL
    expect(collectUniqueNavThumbnailSettled(nav).size).toBe(2);
    expect(areNavThumbnailsReady(nav)).toBe(true);
  });

  it('過半数未満なら Ready ではない', () => {
    const nav = document.createElement('nav');
    nav.appendChild(makeThumb('https://cdn/a.webp', { complete: true, naturalWidth: 90 }));
    nav.appendChild(makeThumb('https://cdn/b.webp', { complete: false }));
    nav.appendChild(makeThumb('https://cdn/c.webp', { complete: false }));
    expect(areNavThumbnailsReady(nav)).toBe(false);
  });
});

describe('enterLiteMode', () => {
  beforeEach(() => {
    resetPerfState();
    setRefs({ projectNavigation: document.createElement('nav') });
  });

  afterEach(() => {
    resetPerfState();
  });

  it('冪等で dataset と perfMode を更新する', () => {
    expect(enterLiteMode({ reason: 'test' })).toBe(true);
    expect(isLiteMode()).toBe(true);
    expect(getPerfMode()).toBe(PERF_MODE_LITE);
    expect(document.documentElement.dataset.perfMode).toBe('lite');
    expect(state.brokenPeriodActive).toBe(false);

    expect(enterLiteMode({ reason: 'again' })).toBe(false);
    expect(getPerfMode()).toBe(PERF_MODE_LITE);
  });
});

describe('startNavReadyWatchdog', () => {
  beforeEach(() => {
    resetPerfState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetPerfState();
  });

  it('timeout までに Ready でなければ onTimeout（lite）', () => {
    const nav = document.createElement('nav');
    nav.appendChild(makeThumb('https://cdn/a.webp', { complete: false }));
    nav.appendChild(makeThumb('https://cdn/b.webp', { complete: false }));

    const onTimeout = vi.fn(() => {
      enterLiteMode({ reason: 'watchdog' });
    });
    startNavReadyWatchdog(nav, { timeoutMs: 10_000, onTimeout });

    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(isLiteMode()).toBe(true);
  });

  it('Ready になれば timeout しても lite にしない', () => {
    const nav = document.createElement('nav');
    const img = makeThumb('https://cdn/a.webp', { complete: false });
    nav.appendChild(img);

    const onTimeout = vi.fn();
    startNavReadyWatchdog(nav, { timeoutMs: 10_000, onTimeout });

    Object.defineProperty(img, 'complete', { configurable: true, get: () => true });
    Object.defineProperty(img, 'naturalWidth', { configurable: true, get: () => 90 });
    img.dispatchEvent(new Event('load', { bubbles: true }));

    vi.advanceTimersByTime(10_000);
    expect(onTimeout).not.toHaveBeenCalled();
    expect(isLiteMode()).toBe(false);
  });
});
