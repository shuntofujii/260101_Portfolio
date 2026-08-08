import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppBootstrapController } from '../appBootstrap.js';
import { state } from '../state.js';
import { PERF_MODE_FULL } from '../perfMode.js';

function createController(overrides = {}) {
  state.projects = [];
  state.perfMode = PERF_MODE_FULL;
  document.documentElement.removeAttribute('data-perf-mode');
  document.body.removeAttribute('data-portfolio-page-slug');

  const refs = {
    guidanceText: document.createElement('div'),
    projectNavigation: document.createElement('nav')
  };
  const deps = {
    state,
    refs,
    isMobileViewport: () => false,
    constants: {
      videoPreloadLinkMaxMobile: 2,
      videoPreloadLinkMaxDesktop: 4,
      heroVideoPrefetchCountMobile: 1,
      heroVideoPrefetchCountDesktop: 2
    },
    collectProjectVideoUrls: vi.fn(() => ({ hero: ['a.webm', 'b.webm', 'c.webm'] })),
    collectVideoUrlsForProject: vi.fn(() => ({ urls: ['x.webm'], heroVideo: 'x.webm' })),
    injectVideoLinkPreloads: vi.fn(),
    scheduleIdleVideoPreload: vi.fn(),
    ensureVideoPlayUrl: vi.fn(() => Promise.resolve('ok')),
    initGuidanceTypewriter: vi.fn(),
    applyInitialRoute: vi.fn(),
    renderInitialState: vi.fn(),
    renderProjectNavigation: vi.fn(),
    setupEventListeners: vi.fn(),
    fetchProjectsData: vi.fn(async () => [{ id: 'project-01' }]),
    showErrorState: vi.fn(),
    ...overrides
  };
  return {
    controller: createAppBootstrapController(deps),
    deps,
    state,
    refs
  };
}

describe('appBootstrap', () => {
  beforeEach(() => {
    state.perfMode = PERF_MODE_FULL;
    document.documentElement.removeAttribute('data-perf-mode');
    document.body.removeAttribute('data-portfolio-page-slug');
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      configurable: true,
      get: () => 8
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      get: () => 8
    });
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      get: () => ({ saveData: false, effectiveType: '4g' })
    });
  });

  it('init で取得→先読み→UI起動（カーソルは非同期）を実行する', async () => {
    const { controller, deps, state: appState } = createController();
    await controller.init();

    expect(deps.fetchProjectsData).toHaveBeenCalled();
    expect(appState.projects).toHaveLength(1);
    expect(deps.injectVideoLinkPreloads).toHaveBeenCalledWith(['a.webm', 'b.webm', 'c.webm'], 4);
    expect(deps.ensureVideoPlayUrl).toHaveBeenCalledTimes(2);
    expect(deps.renderInitialState).toHaveBeenCalled();
    expect(deps.renderProjectNavigation).toHaveBeenCalled();
    expect(deps.setupEventListeners).toHaveBeenCalled();
    expect(deps.applyInitialRoute).toHaveBeenCalled();
    expect(deps.initGuidanceTypewriter).toHaveBeenCalled();
    expect(deps.showErrorState).not.toHaveBeenCalled();
  });

  it('早期 lite 時は動画 warmup とガイダンス TT をスキップする', async () => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      get: () => ({ saveData: true, effectiveType: '4g' })
    });
    const { controller, deps, refs } = createController();
    refs.guidanceText.innerHTML =
      '<span class="guidance-main">Please select a project</span><span class="guidance-cursor">_</span>';
    await controller.init();

    expect(state.perfMode).toBe('lite');
    expect(deps.injectVideoLinkPreloads).not.toHaveBeenCalled();
    expect(deps.ensureVideoPlayUrl).not.toHaveBeenCalled();
    expect(deps.initGuidanceTypewriter).not.toHaveBeenCalled();
    expect(deps.renderProjectNavigation).toHaveBeenCalled();
    expect(refs.guidanceText.querySelector('.guidance-lite-line')?.textContent).toBe(
      'Operating in Lite Mode'
    );
  });

  it('preloadProjectVideos は project がある時のみキューに積む', () => {
    const { controller, deps } = createController();

    controller.preloadProjectVideos(null);
    expect(deps.scheduleIdleVideoPreload).not.toHaveBeenCalled();

    controller.preloadProjectVideos({ id: 'project-02' });
    expect(deps.collectVideoUrlsForProject).toHaveBeenCalled();
    expect(deps.scheduleIdleVideoPreload).toHaveBeenCalledWith(['x.webm'], ['x.webm']);
  });

  it('lite 時は preloadProjectVideos を積まない', () => {
    const { controller, deps } = createController();
    state.perfMode = 'lite';

    controller.preloadProjectVideos({ id: 'project-02' });
    expect(deps.scheduleIdleVideoPreload).not.toHaveBeenCalled();
  });

  it('fetch 失敗時は showErrorState を呼ぶ', async () => {
    const failingFetch = vi.fn(async () => {
      throw new Error('fail');
    });
    const { controller, deps } = createController({ fetchProjectsData: failingFetch });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await controller.init();

    expect(deps.showErrorState).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
