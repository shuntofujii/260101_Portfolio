import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppBootstrapController } from '../appBootstrap.js';

function createController(overrides = {}) {
  const state = { projects: [] };
  const refs = { guidanceText: document.createElement('div') };
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
    initCursorEffect: vi.fn(() => Promise.resolve()),
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
    document.body.removeAttribute('data-portfolio-page-slug');
  });

  it('init で取得→先読み→UI起動（カーソルは並列開始）を実行する', async () => {
    const { controller, deps, state } = createController();
    await controller.init();

    expect(deps.fetchProjectsData).toHaveBeenCalled();
    expect(state.projects).toHaveLength(1);
    expect(deps.injectVideoLinkPreloads).toHaveBeenCalledWith(['a.webm', 'b.webm', 'c.webm'], 4);
    expect(deps.ensureVideoPlayUrl).toHaveBeenCalledTimes(2);
    expect(deps.renderInitialState).toHaveBeenCalled();
    expect(deps.renderProjectNavigation).toHaveBeenCalled();
    expect(deps.setupEventListeners).toHaveBeenCalled();
    expect(deps.applyInitialRoute).toHaveBeenCalled();
    expect(deps.initGuidanceTypewriter).toHaveBeenCalled();
    expect(deps.showErrorState).not.toHaveBeenCalled();
  });

  it('preloadProjectVideos は project がある時のみキューに積む', () => {
    const { controller, deps } = createController();

    controller.preloadProjectVideos(null);
    expect(deps.scheduleIdleVideoPreload).not.toHaveBeenCalled();

    controller.preloadProjectVideos({ id: 'project-02' });
    expect(deps.collectVideoUrlsForProject).toHaveBeenCalled();
    expect(deps.scheduleIdleVideoPreload).toHaveBeenCalledWith(['x.webm'], ['x.webm']);
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
