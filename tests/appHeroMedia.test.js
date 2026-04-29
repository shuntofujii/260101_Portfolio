import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../videoCache.js', () => ({
  ensureVideoPlayUrl: vi.fn((url) => Promise.resolve(url))
}));

import { ensureVideoPlayUrl } from '../videoCache.js';
import { updateHeroMedia } from '../appHeroMedia.js';

describe('updateHeroMedia', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal('requestAnimationFrame', (cb) => {
      cb();
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('同一 canonical src では再初期化しない', () => {
    const video = document.createElement('video');
    video.dataset.canonicalVideoSrc = '/hero.webm';
    updateHeroMedia(
      { type: 'video', src: '/hero.webm' },
      video,
      { videoUpdateFadeDelayMs: 0, videoShowFallbackMs: 200 }
    );
    expect(ensureVideoPlayUrl).not.toHaveBeenCalled();
  });

  it('新しい src ではフェード後に動画URL解決を呼ぶ', async () => {
    const video = document.createElement('video');
    video.play = vi.fn(() => Promise.resolve());
    video.load = vi.fn();
    updateHeroMedia(
      { type: 'video', src: '/next.webm' },
      video,
      { videoUpdateFadeDelayMs: 50, videoShowFallbackMs: 200 }
    );

    expect(ensureVideoPlayUrl).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    await Promise.resolve();

    expect(ensureVideoPlayUrl).toHaveBeenCalledWith('/next.webm');
    expect(video.dataset.canonicalVideoSrc).toBe('/next.webm');
    expect(video.src).toContain('/next.webm');
    expect(video.style.position).toBe('fixed');
    expect(video.style.inset).toBe('0px');
    expect(video.style.width).toBe('100vw');
    expect(video.style.height).toBe('100svh');
    expect(video.style.objectFit).toBe('cover');
    expect(video.style.objectPosition).toBe('center center');
    expect(video.style.getPropertyValue('transform')).toBe('');
  });

  it('準備完了イベントまで opacity 0 を維持し、準備後に再生する', async () => {
    const video = document.createElement('video');
    video.play = vi.fn(() => Promise.resolve());
    video.load = vi.fn();

    updateHeroMedia(
      { type: 'video', src: '/ready.webm' },
      video,
      { videoUpdateFadeDelayMs: 0, videoShowFallbackMs: 200 }
    );

    vi.advanceTimersByTime(0);
    await Promise.resolve();

    expect(video.style.opacity).toBe('0');
    expect(video.play).not.toHaveBeenCalled();

    Object.defineProperty(video, 'readyState', {
      configurable: true,
      get: () => 2
    });
    video.dispatchEvent(new Event('loadeddata'));
    await Promise.resolve();

    expect(video.play).toHaveBeenCalledTimes(1);
    expect(video.style.opacity).toBe('1');
  });
});
