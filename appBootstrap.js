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
    initCursorEffect,
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

  function scheduleCursorEffectInit() {
    if (!isMobileViewport()) {
      return initCursorEffect();
    }
    const run = () => initCursorEffect();
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => run(), { timeout: 2800 });
    } else {
      setTimeout(run, 200);
    }
    return Promise.resolve();
  }

  async function init() {
    try {
      state.projects = await fetchProjectsData();
      warmupInitialHeroVideos(state.projects);
      bootstrapUiAfterDataReady();
      await scheduleCursorEffectInit();
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
