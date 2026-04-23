export function createProjectInteractionController(deps) {
  const {
    state,
    refs,
    openingSoonProjectId,
    escapeHtml,
    clearHoverLeaveTimer,
    clearProjectSelections,
    resetHeroVideoBase,
    beginBackgroundFadeOutToInitialState,
    updateHeroMedia,
    preloadProjectVideos,
    openProjectModalFromRoute
  } = deps;

  function shouldProcessProjectPointerInteraction() {
    return state.currentState !== 'modal';
  }

  function updateContextPanel(project) {
    const tools = project.tools ? project.tools.join(' / ') : null;

    let categoryYear = '';
    if (project.id === openingSoonProjectId) {
      categoryYear = `${project.category} (Opening Soon)`;
    } else {
      categoryYear = `${project.category} (${project.year})`;
    }

    const disciplines = String(project.disciplines ?? '').trim();

    const safeCategoryYear = escapeHtml(categoryYear);
    const safeDisciplinesLine = escapeHtml(disciplines);
    const safeTools = tools ? escapeHtml(tools) : '';

    refs.contextPanel.innerHTML = `
      <div class="context-content">
        <div class="context-info">
          <div class="context-info-item">
            <span class="context-info-value">${safeCategoryYear}</span>
          </div>
          <div class="context-info-item">
            <span class="context-info-value value">${safeDisciplinesLine}</span>
          </div>
          ${safeTools ? `
          <div class="context-info-item row">
            <img src="https://assets.shuntofujii.com/icons/toolkits.svg" alt="Toolkits" class="toolkit-icon" width="14" height="14" decoding="async" loading="lazy" />
            <span class="context-info-value value">${safeTools}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function handleProjectHover(project, itemElement) {
    clearHoverLeaveTimer();

    state.currentState = 'hover';
    state.hoveredProject = project;

    updateHeroMedia(project.heroMedia);
    preloadProjectVideos(project);

    if (refs.bgLayer) {
      if (state.bgLayerFadeCompleteHandler) {
        refs.bgLayer.removeEventListener('transitionend', state.bgLayerFadeCompleteHandler);
        state.bgLayerFadeCompleteHandler = null;
      }
      refs.bgLayer.classList.remove('isFading');
      refs.bgLayer.style.opacity = '1';
    }

    refs.guidanceText.classList.remove('visible');
    refs.contextPanel.classList.add('visible');
    updateContextPanel(project);
  }

  function handleProjectLeave() {
    clearHoverLeaveTimer();

    if (state.currentState !== 'modal' && !state.selectedProject) {
      refs.titleText.textContent = 'PORTFOLIO';
      resetHeroVideoBase();
      refs.guidanceText.classList.add('visible');
      beginBackgroundFadeOutToInitialState();
      refs.contextPanel.classList.remove('visible');
      clearProjectSelections();
    }
  }

  function handleProjectItemMouseEnter(project, item) {
    if (shouldProcessProjectPointerInteraction()) {
      handleProjectHover(project, item);
    }
  }

  function handleProjectItemMouseLeave() {
    if (shouldProcessProjectPointerInteraction()) {
      handleProjectLeave();
    }
  }

  function handleProjectItemTouchStart(project, item) {
    if (shouldProcessProjectPointerInteraction()) {
      handleProjectHover(project, item);
    }
  }

  function handleProjectClick(project) {
    clearHoverLeaveTimer();
    openProjectModalFromRoute(project);
  }

  return {
    handleProjectItemMouseEnter,
    handleProjectItemMouseLeave,
    handleProjectItemTouchStart,
    handleProjectClick
  };
}
