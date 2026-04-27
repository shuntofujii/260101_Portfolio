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

  function findProjectItemElement(projectId) {
    if (!projectId) return null;
    const id = String(projectId);
    const safe = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return document.querySelector(`[data-project-id="${safe}"]`);
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
    const item = findProjectItemElement(project.id);
    state.currentState = 'modal';
    state.selectedProject = project;
    clearProjectSelections();
    if (item) {
      item.classList.add('selected');
      state.modalTriggerElement = item;
    }
    if (refs.modalContainer) {
      refs.modalContainer.dataset.swipeSettled = fromSwipe ? '1' : '';
    }
    renderModalContent(project, refs.modalContent);
    applyModalProjectSideEffects(project);
  }

  function openProjectModalFromRoute(project, triggerItemEl = null) {
    if (!project) return;
    const item =
      triggerItemEl &&
      triggerItemEl.isConnected &&
      triggerItemEl.dataset?.projectId === project.id
        ? triggerItemEl
        : findProjectItemElement(project.id);
    if (!item) return;
    state.currentState = 'modal';
    state.selectedProject = project;
    clearProjectSelections();
    item.classList.add('selected');
    openModal(project, item);
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
