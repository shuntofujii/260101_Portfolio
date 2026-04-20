export function bindGlobalEventListeners(refs, handlers) {
  const {
    onCloseModal,
    onEscapeKey,
    onCloseLightbox,
    onPortfolioTitleClick,
    onFocusVisualTouchStart
  } = handlers;

  refs.modalClose.addEventListener('click', onCloseModal);
  refs.modalOverlay.addEventListener('click', (e) => {
    if (e.target === refs.modalOverlay) onCloseModal();
  });

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
