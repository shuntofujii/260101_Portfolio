export function createModalRoutingController(deps) {
  const {
    state,
    refs,
    basePageTitle,
    baseMetaDescription,
    metaDescriptionEl,
    clearProjectSelections,
    preloadProjectVideos,
    openModal,
    closeModalAndStopVideos,
    renderModalContent,
    getProjects,
    parseProjectSlugFromPath,
    normalizePathname,
    getPathnameProjectSlug,
    findLegacyProjectFromHash,
    pathForProjectSlug,
    applyModalHistoryForProject,
    restoreBaseHistoryOnModalClose,
    applyModalDocumentMeta,
    restoreBaseDocumentMeta
  } = deps;

  function findProjectByPageSlug(slug) {
    const projects = getProjects();
    if (!slug || !projects?.length) return null;
    return projects.find((p) => p.pageSlug === slug) || null;
  }

  function findProjectItemElements(projectId) {
    if (!projectId) return [];
    const id = String(projectId);
    const safe = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return Array.from(document.querySelectorAll(`[data-project-id="${safe}"]`));
  }

  function applyModalProjectSideEffects(project) {
    if (!project || !project.pageSlug) return;
    preloadProjectVideos(project);
    applyModalHistoryForProject(project);
    applyModalDocumentMeta(project, metaDescriptionEl);
  }

  function updateModalProjectInPlace(project, options = {}) {
    const { fromSwipe = false } = options;
    if (!project || !refs.modalContent) return;
    const items = findProjectItemElements(project.id);
    const item = items[0] || null;
    state.currentState = 'modal';
    state.selectedProject = project;
    clearProjectSelections();
    items.forEach((el) => el.classList.add('selected'));
    if (item) state.modalTriggerElement = item;
    if (refs.modalContainer) {
      refs.modalContainer.dataset.swipeSettled = fromSwipe ? '1' : '';
    }
    renderModalContent(project, refs.modalContent);
    refs.modalContent.scrollTop = 0;
    if (refs.modalContainer) refs.modalContainer.scrollTop = 0;
    applyModalProjectSideEffects(project);
  }

  function openProjectModalFromRoute(project, triggerItemEl = null) {
    if (!project) return;
    const matchingItems = findProjectItemElements(project.id);
    const item =
      triggerItemEl &&
      triggerItemEl.isConnected &&
      String(triggerItemEl.dataset?.projectId) === String(project.id)
        ? triggerItemEl
        : (matchingItems[0] || null);
    state.currentState = 'modal';
    state.selectedProject = project;
    clearProjectSelections();
    matchingItems.forEach((el) => el.classList.add('selected'));
    if (item) item.classList.add('selected');
    openModal(project, item ?? null);
  }

  function onPortfolioModalOpen(e) {
    const project = e.detail?.project;
    applyModalProjectSideEffects(project);
  }

  function onPortfolioModalClose() {
    if (document.body.dataset.portfolioPageSlug) {
      try {
        history.replaceState(null, basePageTitle, '/');
        document.body.removeAttribute('data-portfolio-page-slug');
      } catch {
        window.location.replace('/');
        return;
      }
    }
    restoreBaseHistoryOnModalClose(basePageTitle);
    restoreBaseDocumentMeta(basePageTitle, baseMetaDescription, metaDescriptionEl);
  }

  function onPopState() {
    const slug = parseProjectSlugFromPath(normalizePathname(window.location.pathname));
    const project = slug ? findProjectByPageSlug(slug) : null;

    if (state.currentState === 'modal' && !project) {
      closeModalAndStopVideos();
      return;
    }
    if (project && state.currentState !== 'modal') {
      openProjectModalFromRoute(project);
    }
  }

  function applyInitialRoute() {
    const slug = getPathnameProjectSlug();
    if (slug) {
      const project = findProjectByPageSlug(slug);
      openProjectModalFromRoute(project);
      return;
    }
    const legacy = findLegacyProjectFromHash(getProjects());
    if (legacy && legacy.pageSlug) {
      history.replaceState(null, '', pathForProjectSlug(legacy.pageSlug));
      openProjectModalFromRoute(legacy);
    }
  }

  function bindRouteEventListeners() {
    document.addEventListener('portfolio:modalopen', onPortfolioModalOpen);
    document.addEventListener('portfolio:modalclose', onPortfolioModalClose);
    window.addEventListener('popstate', onPopState);
  }

  return {
    bindRouteEventListeners,
    applyInitialRoute,
    openProjectModalFromRoute,
    updateModalProjectInPlace
  };
}
