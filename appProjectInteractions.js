import {
  THUMBNAIL_PREVIEW_ACTIVE_CLASS,
  TRAIL_THUMBNAIL_HOVER_MIN_MS,
  TRAIL_THUMBNAIL_HOVER_MAX_MS
} from './constants.js';

export function createProjectInteractionController(deps) {
  const {
    state,
    refs,
    openingSoonProjectId,
    escapeHtml,
    clearHoverLeaveTimer,
    clearTrailThumbnailHoverTimer,
    clearProjectSelections,
    resetHeroVideoBase,
    beginBackgroundFadeOutToInitialState,
    updateHeroMedia,
    preloadProjectVideos,
    openProjectModalFromRoute
  } = deps;

  function shouldProcessProjectPointerInteraction() {
    return (
      state.currentState !== 'modal' &&
      !state.profileModalOpen &&
      !state.profileIntroActive
    );
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
            <img src="https://assets.shuntofujii.com/icons/toolkits.svg?v=20260503" alt="Toolkits" class="toolkit-icon" width="14" height="14" decoding="async" loading="lazy" />
            <span class="context-info-value value">${safeTools}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function syncThumbnailPreviewItem(itemElement) {
    if (!refs.projectNavigation) return;
    refs.projectNavigation.querySelectorAll('.project-item').forEach((el) => {
      el.classList.remove(THUMBNAIL_PREVIEW_ACTIVE_CLASS);
    });
    if (!itemElement) return;
    const index = itemElement.dataset.projectIndex;
    if (index !== undefined && index !== '') {
      refs.projectNavigation
        .querySelectorAll(`.project-item[data-project-index="${CSS.escape(String(index))}"]`)
        .forEach((el) => {
          el.classList.add(THUMBNAIL_PREVIEW_ACTIVE_CLASS);
        });
    } else {
      itemElement.classList.add(THUMBNAIL_PREVIEW_ACTIVE_CLASS);
    }
  }

  function handleProjectHover(project, itemElement) {
    clearHoverLeaveTimer();
    clearTrailThumbnailHoverTimer();

    syncThumbnailPreviewItem(itemElement);

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
    clearTrailThumbnailHoverTimer();

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

  function handleProjectClick(project, triggerItemEl) {
    if (state.profileModalOpen || state.profileIntroActive) return;
    clearHoverLeaveTimer();
    clearTrailThumbnailHoverTimer();
    openProjectModalFromRoute(project, triggerItemEl ?? null);
  }

  function escapeProjectIdForSelector(projectId) {
    return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(String(projectId))
      : String(projectId).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  /** 実ポインタが該当サムネ上にいるか（軌跡ヒットのタイマー終了時と同じ判定） */
  function isRealPointerOverHoveredProjectItem(project) {
    const nav = refs.projectNavigation;
    if (!nav || !project) return false;
    const safeId = escapeProjectIdForSelector(project.id);
    try {
      return Boolean(nav.querySelector(`.project-item[data-project-id="${safeId}"]:hover`));
    } catch {
      return false;
    }
  }

  /**
   * 軌跡ヒットで始めた hover 維持タイマーがある状態で、ユーザーがマウスを動かす／クリック等したら解除。
   * 実機カーソルがまだサムネ上なら通常 hover とみなしてそのまま。
   */
  function cancelTrailHoverOnUserActivity() {
    if (state.trailThumbnailHoverTimer == null) return;
    clearTrailThumbnailHoverTimer();
    const project = state.hoveredProject;
    if (!project || !shouldProcessProjectPointerInteraction()) return;
    if (isRealPointerOverHoveredProjectItem(project)) return;
    handleProjectLeave();
  }

  /** カーソル軌跡がサムネと重なったとき（sleep 軌道含む）— 通常の hover/touch と同じ見た目を一定時間維持 */
  function handleTrailThumbnailHit(project, itemElement) {
    if (!shouldProcessProjectPointerInteraction()) return;
    if (!project || !itemElement) return;

    clearTrailThumbnailHoverTimer();
    handleProjectHover(project, itemElement);

    const span = Math.max(0, TRAIL_THUMBNAIL_HOVER_MAX_MS - TRAIL_THUMBNAIL_HOVER_MIN_MS);
    const durationMs = TRAIL_THUMBNAIL_HOVER_MIN_MS + Math.floor(Math.random() * (span + 1));

    state.trailThumbnailHoverTimer = window.setTimeout(() => {
      state.trailThumbnailHoverTimer = null;
      if (!shouldProcessProjectPointerInteraction()) return;
      if (state.hoveredProject?.id !== project.id) return;
      const nav = refs.projectNavigation;
      if (nav) {
        const safeId = escapeProjectIdForSelector(project.id);
        try {
          if (nav.querySelector(`.project-item[data-project-id="${safeId}"]:hover`)) return;
        } catch {
          /* ignore */
        }
      }
      handleProjectLeave();
    }, durationMs);
  }

  return {
    handleProjectItemMouseEnter,
    handleProjectItemMouseLeave,
    handleProjectItemTouchStart,
    handleProjectClick,
    handleTrailThumbnailHit,
    cancelTrailHoverOnUserActivity
  };
}
