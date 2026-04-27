import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../videoCache.js', () => ({
  ensureVideoPlayUrl: vi.fn((url) => Promise.resolve(url))
}));

import { ensureVideoPlayUrl } from '../videoCache.js';
import { updateHeroMedia } from '../appHeroMedia.js';

describe('updateHeroMedia', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
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
});
