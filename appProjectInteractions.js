import { THUMB_TAP_MOVE_MAX_PX, THUMB_TAP_MAX_DURATION_MS } from './constants.js';

let touchPreviewSession = null;

/** 指・ペンのジェスチャ終了後にブラウザが送る合成 click を無視する（1 回分） */
const suppressNextThumbClick = new WeakMap();

/** ナビ再描画などでポインター追跡だけ残さないために外部からも呼ぶ */
export function clearProjectTouchPreviewTracking() {
  if (!touchPreviewSession) return;
  if (touchPreviewSession.move) {
    window.removeEventListener('pointermove', touchPreviewSession.move);
  }
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

  const tapMoveSq = THUMB_TAP_MOVE_MAX_PX * THUMB_TAP_MOVE_MAX_PX;

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
   * 指・ペン: 押している間ヒーローを再生し、離すときに「タップ」ならモーダルのみ開く。
   * PC のマウスは mouseenter / click のみ。
   */
  function handleProjectItemPointerDown(project, item, event) {
    if (!shouldProcessProjectPointerInteraction()) return;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

    clearProjectTouchPreviewTracking();

    const startX = event.clientX;
    const startY = event.clientY;
    const pointerId = event.pointerId;
    const t0 = performance.now();

    const finish = (ev) => {
      if (ev.pointerId !== pointerId) return;
      clearProjectTouchPreviewTracking();

      suppressNextThumbClick.set(item, true);

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const elapsed = performance.now() - t0;
      const cancelled = ev.type === 'pointercancel';
      const distSq = dx * dx + dy * dy;
      const isTap =
        !cancelled &&
        distSq <= tapMoveSq &&
        elapsed <= THUMB_TAP_MAX_DURATION_MS;

      if (isTap) {
        clearHoverLeaveTimer();
        openProjectModalFromRoute(project);
      } else {
        handleProjectLeave();
      }
    };

    touchPreviewSession = { move: null, up: finish };
    window.addEventListener('pointerup', finish, { passive: true });
    window.addEventListener('pointercancel', finish, { passive: true });

    handleProjectHover(project, item);
  }

  function handleProjectItemClick(project, item, event) {
    if (suppressNextThumbClick.has(item)) {
      suppressNextThumbClick.delete(item);
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
      return;
    }
    clearHoverLeaveTimer();
    openProjectModalFromRoute(project);
  }

  return {
    handleProjectItemMouseEnter,
    handleProjectItemMouseLeave,
    handleProjectItemPointerDown,
    handleProjectItemClick
  };
}
