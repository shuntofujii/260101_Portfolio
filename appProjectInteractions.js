import { THUMB_TAP_MOVE_MAX_PX, THUMB_TAP_MAX_DURATION_MS } from './constants.js';

let thumbTouchTracking = null;

/** ナビ再描画時など、window に付けたリスナだけ外す */
export function clearProjectTouchPreviewTracking() {
  if (!thumbTouchTracking) return;
  window.removeEventListener('pointermove', thumbTouchTracking.move);
  window.removeEventListener('pointerup', thumbTouchTracking.up);
  window.removeEventListener('pointercancel', thumbTouchTracking.up);
  thumbTouchTracking = null;
}

/** タッチ終了後の合成 click を 1 回だけ無視する（対象サムネ要素） */
const suppressSyntheticClickForThumb = new WeakMap();

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

  function projectFromNavItemEl(itemEl) {
    const idx = parseInt(itemEl.dataset.projectIndex, 10);
    const list = state.projects;
    if (!Array.isArray(list) || Number.isNaN(idx) || idx < 0 || idx >= list.length) return null;
    return list[idx];
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
   * タッチ／ペンのみ。
   * MECE:
   * - いずれのサムネ上にも指がない → 動画なし（leave）
   * - サムネ上にあり、かつ「モーダル用タップ」ではない間 → そのサムネの動画（hover）
   * - 「タップ」（短時間・小移動）→ モーダル（pointerdown 開始サムネの案件）。動画との排他はタップ判定で分ける。
   */
  function handleProjectItemPointerDown(project, item, event) {
    if (!shouldProcessProjectPointerInteraction()) return;
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

    clearProjectTouchPreviewTracking();

    const nav = refs.projectNavigation;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    const t0 = performance.now();
    /** モーダル判定は「どのサムネで押し始めたか」のみを使う */
    const modalProject = project;
    const modalSuppressEl = item;

    const syncHoverUnderFinger = (ev) => {
      if (ev.pointerId !== pointerId) return;
      if (!nav) return;
      const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('.project-item');
      if (!hit || !nav.contains(hit)) {
        handleProjectLeave();
        return;
      }
      const p = projectFromNavItemEl(hit);
      if (!p) return;
      if (state.hoveredProject?.id === p.id) return;
      handleProjectHover(p, hit);
    };

    const finish = (ev) => {
      if (ev.pointerId !== pointerId) return;
      clearProjectTouchPreviewTracking();

      suppressSyntheticClickForThumb.set(modalSuppressEl, true);

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const elapsed = performance.now() - t0;
      const cancelled = ev.type === 'pointercancel';
      const distSq = dx * dx + dy * dy;
      const opensModal =
        !cancelled &&
        distSq <= tapMoveSq &&
        elapsed <= THUMB_TAP_MAX_DURATION_MS;

      if (opensModal) {
        clearHoverLeaveTimer();
        openProjectModalFromRoute(modalProject);
      } else {
        handleProjectLeave();
      }
    };

    thumbTouchTracking = { move: syncHoverUnderFinger, up: finish };
    window.addEventListener('pointermove', syncHoverUnderFinger, { passive: true });
    window.addEventListener('pointerup', finish, { passive: true });
    window.addEventListener('pointercancel', finish, { passive: true });

    handleProjectHover(project, item);
  }

  function handleProjectItemClick(project, item, event) {
    if (suppressSyntheticClickForThumb.has(item)) {
      suppressSyntheticClickForThumb.delete(item);
      event?.preventDefault?.();
      event?.stopPropagation?.();
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
