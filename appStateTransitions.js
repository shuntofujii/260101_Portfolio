export function clearHoverLeaveTimer(state) {
  if (!state.hoverLeaveTimer) return;
  clearTimeout(state.hoverLeaveTimer);
  state.hoverLeaveTimer = null;
}

export function clearProjectSelections() {
  document.querySelectorAll('.project-item').forEach((item) => {
    item.classList.remove('selected');
  });
}

export function resetHeroVideoBase(heroVideoBase) {
  if (!heroVideoBase) return;
  if (heroVideoBase._showFallbackId) {
    clearTimeout(heroVideoBase._showFallbackId);
    heroVideoBase._showFallbackId = null;
  }
  heroVideoBase.pause();
  heroVideoBase.currentTime = 0;
  heroVideoBase.style.display = 'none';
  heroVideoBase.style.opacity = '0';
  heroVideoBase.style.objectFit = '';
  heroVideoBase.classList.remove('hero-video-custom-size');
  heroVideoBase.style.removeProperty('--hero-video-width');
  heroVideoBase.style.removeProperty('--hero-video-height');
  heroVideoBase.removeAttribute('data-canonical-video-src');
}

export function beginBackgroundFadeOutToInitialState(state, bgLayer, onFadeComplete) {
  if (!bgLayer) {
    onFadeComplete();
    return;
  }

  bgLayer.classList.add('isFading');
  state.bgLayerFadeCompleteHandler = function fadeComplete(e) {
    if (e.target !== bgLayer) return;
    bgLayer.classList.remove('isFading');
    bgLayer.removeEventListener('transitionend', state.bgLayerFadeCompleteHandler);
    state.bgLayerFadeCompleteHandler = null;
    onFadeComplete();
  };
  bgLayer.addEventListener('transitionend', state.bgLayerFadeCompleteHandler);
}

export function resetToInitialState(state, refs) {
  clearHoverLeaveTimer(state);

  state.currentState = 'initial';
  state.hoveredProject = null;
  state.selectedProject = null;

  refs.contextPanel.classList.remove('visible');
  resetHeroVideoBase(refs.heroVideoBase);
  refs.titleText.textContent = 'PORTFOLIO';
  refs.guidanceText.classList.add('visible');
  clearProjectSelections();
}
