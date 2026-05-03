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
   * Three.js + cursorEffect は重いため、projects 取得・ナビ描画・イベント後にだけ読み込む。
   * fetch と並列に走らせない／init の完了も待たせない（ファースト操作までの体感を優先）。
   * requestIdleCallback でメインスレッドの空きに載せ、timeout で遅れすぎないようにする。
   */
  function scheduleCursorEffectInit() {
    const run = async () => {
      const m = await import('./cursorEffect.js');
      await m.initCursorEffect();
    };
    const mobile = isMobileViewport();
    const idleTimeoutMs = mobile ? 2800 : 1600;
    return new Promise((resolve) => {
      const exec = () => run().then(resolve).catch(resolve);
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(exec, { timeout: idleTimeoutMs });
      } else {
        setTimeout(exec, mobile ? 450 : 180);
      }
    });
  }

  async function init() {
    try {
      state.projects = await fetchProjectsData();
      warmupInitialHeroVideos(state.projects);
      bootstrapUiAfterDataReady();
      void scheduleCursorEffectInit();
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
