export function createAppBootstrapController(deps) {
  const {
    state,
    refs,
    isMobileViewport,
    constants,
    collectProjectVideoUrls,
    collectVideoUrlsForProject,
    injectVideoLinkPreloads,
    scheduleIdleVideoPreload,
    ensureVideoPlayUrl,
    initGuidanceTypewriter,
    applyInitialRoute,
    renderInitialState,
    renderProjectNavigation,
    setupEventListeners,
    fetchProjectsData,
    showErrorState
  } = deps;

  const {
    videoPreloadLinkMaxMobile,
    videoPreloadLinkMaxDesktop,
    heroVideoPrefetchCountMobile,
    heroVideoPrefetchCountDesktop
  } = constants;

  function getHeroVideoPreloadConfig() {
    const mobile = isMobileViewport();
    return {
      linkMax: mobile ? videoPreloadLinkMaxMobile : videoPreloadLinkMaxDesktop,
      heroPrefetchCount: mobile ? heroVideoPrefetchCountMobile : heroVideoPrefetchCountDesktop
    };
  }

  function isConservativeVideoPreload() {
    try {
      const c = navigator.connection;
      if (c && c.saveData) return true;
      const t = c && c.effectiveType;
      if (t === 'slow-2g' || t === '2g') return true;
      return false;
    } catch {
      return false;
    }
  }

  function warmupInitialHeroVideos(projects) {
    const { hero: heroVideoUrls } = collectProjectVideoUrls(projects);
    const conservative = isConservativeVideoPreload();
    if (conservative) return;

    const { linkMax, heroPrefetchCount } = getHeroVideoPreloadConfig();
    injectVideoLinkPreloads(heroVideoUrls, linkMax);
    heroVideoUrls.slice(0, heroPrefetchCount).forEach((url) => {
      ensureVideoPlayUrl(url).catch(() => {});
    });
  }

  function bootstrapUiAfterDataReady() {
    renderInitialState();
    renderProjectNavigation();
    setupEventListeners();
    applyInitialRoute();
    if (!document.body.dataset.portfolioPageSlug) {
      initGuidanceTypewriter(refs.guidanceText);
    }
  }

  function preloadProjectVideos(project) {
    if (!project || isConservativeVideoPreload()) return;
    const { urls, heroVideo } = collectVideoUrlsForProject(project);
    if (!urls.length) return;
    const priorityFirst = heroVideo ? [heroVideo] : [];
    scheduleIdleVideoPreload(urls, priorityFirst);
  }

  /**
   * cursorEffect（Three.js 軌跡）を動的 import。モバイルはアイドル後に開始して初期描画を優先するが、軌跡は表示する。
   */
  function scheduleCursorEffectInit() {
    const run = async () => {
      const m = await import('./cursorEffect.js');
      await m.initCursorEffect();
    };
    if (!isMobileViewport()) {
      return run();
    }
    return new Promise((resolve) => {
      const exec = () => run().then(resolve).catch(resolve);
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(exec, { timeout: 1200 });
      } else {
        setTimeout(exec, 200);
      }
    });
  }

  async function init() {
    try {
      const cursorInitPromise = scheduleCursorEffectInit();
      state.projects = await fetchProjectsData();
      warmupInitialHeroVideos(state.projects);
      bootstrapUiAfterDataReady();
      await cursorInitPromise;
    } catch (error) {
      console.error('Error loading projects:', error);
      showErrorState();
    }
  }

  return {
    init,
    preloadProjectVideos
  };
}
