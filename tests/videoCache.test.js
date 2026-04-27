import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadModule() {
  vi.resetModules();
  return import('../videoCache.js');
}

describe('videoCache', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    vi.useFakeTimers();
  });

  it('injectVideoLinkPreloads は重複linkを作らない', async () => {
    const { injectVideoLinkPreloads } = await loadModule();
    injectVideoLinkPreloads(['/a.webm', '/a.webm', '/b.webm'], 10);
    injectVideoLinkPreloads(['/a.webm', '/c.webm'], 10);
    const links = Array.from(document.head.querySelectorAll('link[data-video-preload]'));
    const hrefs = links.map((el) => el.getAttribute('data-video-preload'));
    expect(hrefs).toEqual(['/a.webm', '/b.webm', '/c.webm']);
  });

  it('scheduleIdleVideoPreload は重複を除いてキュー投入する', async () => {
    const { scheduleIdleVideoPreload } = await loadModule();
    globalThis.requestIdleCallback = undefined;

    scheduleIdleVideoPreload(['/x.webm', '/x.webm', '/y.webm'], ['/y.webm']);
    vi.advanceTimersByTime(180);
    await Promise.resolve();

    const links = Array.from(document.head.querySelectorAll('link[data-video-preload]'));
    const hrefs = links.map((el) => el.getAttribute('data-video-preload'));
    expect(hrefs).toEqual(['/y.webm', '/x.webm']);
  });
});
