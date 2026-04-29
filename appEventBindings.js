export function bindGlobalEventListeners(refs, handlers) {
  const {
    onCloseModal,
    onEscapeKey,
    onCloseLightbox,
    onPortfolioTitleClick,
    onFocusVisualTouchStart,
    onModalTouchStart,
    onModalTouchMove,
    onModalTouchEnd,
    onCloseProfileModal,
    onProfileOpenClick
  } = handlers;

  const removeListeners = [];
  const addListener = (target, type, listener, options) => {
    if (!target || typeof listener !== 'function') return;
    target.addEventListener(type, listener, options);
    removeListeners.push(() => target.removeEventListener(type, listener, options));
  };

  const triggerModalCloseFromClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onCloseModal();
  };
  const triggerModalCloseFromPointerOrTouch = (e) => {
    if (e) {
      e.preventDefault();
    }
    onCloseModal();
  };
  addListener(refs.modalClose, 'click', triggerModalCloseFromClick);
  // click 合成が落ちる端末向けに pointer/touch も受ける
  addListener(refs.modalClose, 'pointerup', triggerModalCloseFromPointerOrTouch, { passive: false });
  addListener(refs.modalClose, 'touchend', triggerModalCloseFromPointerOrTouch, { passive: false });
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

  const triggerProfileCloseFromClick = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onCloseProfileModal();
  };
  const triggerProfileCloseFromPointerOrTouch = (e) => {
    if (e) {
      e.preventDefault();
    }
    onCloseProfileModal();
  };
  if (refs.profileModalClose && typeof onCloseProfileModal === 'function') {
    addListener(refs.profileModalClose, 'click', triggerProfileCloseFromClick);
    addListener(refs.profileModalClose, 'pointerup', triggerProfileCloseFromPointerOrTouch, { passive: false });
    addListener(refs.profileModalClose, 'touchend', triggerProfileCloseFromPointerOrTouch, { passive: false });
  }
  if (refs.profileModalOverlay && typeof onCloseProfileModal === 'function') {
    addListener(refs.profileModalOverlay, 'click', (e) => {
      if (e.target === refs.profileModalOverlay) onCloseProfileModal();
    });
  }
  if (refs.profileOpenBtn && typeof onProfileOpenClick === 'function') {
    addListener(refs.profileOpenBtn, 'click', (e) => {
      e.stopPropagation();
      onProfileOpenClick(e);
    });
  }

  /*
   * #focusVisual は pointer-events: none のため、ここでは document で拾う。
   * shouldResetFromFocusVisualTouch が .project-item を除外する。
   */
  addListener(document, 'touchstart', onFocusVisualTouchStart, { passive: true });

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
