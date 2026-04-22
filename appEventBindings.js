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

  refs.modalClose.addEventListener('click', onCloseModal);
  refs.modalOverlay.addEventListener('click', (e) => {
    if (e.target === refs.modalOverlay) onCloseModal();
  });
  if (typeof onModalTouchStart === 'function') {
    refs.modalOverlay.addEventListener('touchstart', onModalTouchStart, { passive: true });
  }
  if (typeof onModalTouchMove === 'function') {
    refs.modalOverlay.addEventListener('touchmove', onModalTouchMove, { passive: false });
  }
  if (typeof onModalTouchEnd === 'function') {
    refs.modalOverlay.addEventListener('touchend', onModalTouchEnd, { passive: true });
    refs.modalOverlay.addEventListener('touchcancel', onModalTouchEnd, { passive: true });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') onEscapeKey();
  });

  if (refs.lightboxClose) {
    refs.lightboxClose.addEventListener('click', onCloseLightbox);
  }
  if (refs.lightboxOverlay) {
    refs.lightboxOverlay.addEventListener('click', (e) => {
      if (e.target === refs.lightboxOverlay) onCloseLightbox();
    });
  }

  refs.portfolioTitle.addEventListener('click', onPortfolioTitleClick);

  if (refs.focusVisual) {
    refs.focusVisual.addEventListener('touchstart', onFocusVisualTouchStart, { passive: true });
  }
}
