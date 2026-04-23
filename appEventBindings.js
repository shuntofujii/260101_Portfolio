export function bindGlobalEventListeners(refs, handlers) {
  const {
    onCloseModal,
    onEscapeKey,
    onCloseLightbox,
    onPortfolioTitleClick,
    onFocusVisualTouchStart,
    onModalTouchStart,
    onModalTouchMove,
    onModalTouchEnd
  } = handlers;

  const removeListeners = [];
  const addListener = (target, type, listener, options) => {
    if (!target || typeof listener !== 'function') return;
    target.addEventListener(type, listener, options);
    removeListeners.push(() => target.removeEventListener(type, listener, options));
  };

  const triggerModalClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onCloseModal();
  };
  addListener(refs.modalClose, 'click', triggerModalClose);
  // click 合成が落ちる端末向けに pointer/touch も受ける
  addListener(refs.modalClose, 'pointerup', triggerModalClose, { passive: false });
  addListener(refs.modalClose, 'touchend', triggerModalClose, { passive: false });
  addListener(refs.modalOverlay, 'click', (e) => {
    if (e.target === refs.modalOverlay) onCloseModal();
  });
  if (typeof onModalTouchStart === 'function') {
    addListener(refs.modalOverlay, 'touchstart', onModalTouchStart, { passive: true });
  }
  if (typeof onModalTouchMove === 'function') {
    addListener(refs.modalOverlay, 'touchmove', onModalTouchMove, { passive: false });
  }
  if (typeof onModalTouchEnd === 'function') {
    addListener(refs.modalOverlay, 'touchend', onModalTouchEnd, { passive: true });
    addListener(refs.modalOverlay, 'touchcancel', onModalTouchEnd, { passive: true });
  }

  addListener(document, 'keydown', (e) => {
    if (e.key === 'Escape') onEscapeKey();
  });

  if (refs.lightboxClose) {
    addListener(refs.lightboxClose, 'click', onCloseLightbox);
  }
  if (refs.lightboxOverlay) {
    addListener(refs.lightboxOverlay, 'click', (e) => {
      if (e.target === refs.lightboxOverlay) onCloseLightbox();
    });
  }

  addListener(refs.portfolioTitle, 'click', onPortfolioTitleClick);

  if (refs.focusVisual) {
    addListener(refs.focusVisual, 'touchstart', onFocusVisualTouchStart, { passive: true });
  }

  return () => {
    while (removeListeners.length > 0) {
      const unbind = removeListeners.pop();
      try {
        unbind();
      } catch (_) {
        /* noop */
      }
    }
  };
}
