import { TOUCH_THUMB_SCROLL_THRESHOLD_PX } from './constants.js';

let touchPreviewSession = null;

/** ナビ再描画などでポインター追跡だけ残さないために外部からも呼ぶ */
export function clearProjectTouchPreviewTracking() {
  if (!touchPreviewSession) return;
  window.removeEventListener('pointermove', touchPreviewSession.move);
  window.removeEventListener('pointerup', touchPreviewSession.up);
  window.removeEventListener('pointercancel', touchPreviewSession.up);
  touchPreviewSession = null;
}

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

  const scrollThresholdSq = TOUCH_THUMB_SCROLL_THRESHOLD_PX * TOUCH_THUMB_SCROLL_THRESHOLD_PX;

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
            <img src="https://assets.shuntofujii.com/icons/toolkits.svg?v=20260427" alt="Toolkits" class="toolkit-icon" width="14" height="14" decoding="async" loading="lazy" />
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

  /**
   * 指・スタイラス（pointerType が touch / pen）のときの pointerdown。
   * PC のマウス／トラックパッドは mouseenter のみでプレビューする。
   * ・押した直後にそのプロジェクトのヒーロー動画・概要を表示
   * ・一定距離以上ドラッグしたら横スクロールとみなし、プレビューを解除（一覧を動かしただけの誤爆を防ぐ）
   */
  function handleProjectItemPointerDown(project, item, event) {
    if (!shouldProcessProjectPointerInteraction()) return;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

    clearProjectTouchPreviewTracking();

    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    let scrollCancelled = false;

    const move = (ev) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (dx * dx + dy * dy <= scrollThresholdSq || scrollCancelled) return;
      scrollCancelled = true;
      handleProjectLeave();
    };

    const up = (ev) => {
      if (ev.pointerId !== pointerId) return;
      clearProjectTouchPreviewTracking();
    };

    touchPreviewSession = { pointerId, move, up };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });

    handleProjectHover(project, item);
  }

  function handleProjectClick(project) {
    clearHoverLeaveTimer();
    openProjectModalFromRoute(project);
  }

  return {
    handleProjectItemMouseEnter,
    handleProjectItemMouseLeave,
    handleProjectItemPointerDown,
    handleProjectClick
  };
}
