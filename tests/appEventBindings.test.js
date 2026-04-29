import { describe, expect, it, vi } from 'vitest';
import { bindGlobalEventListeners } from '../appEventBindings.js';

function createRefs() {
  const modalClose = document.createElement('button');
  const modalOverlay = document.createElement('div');
  const portfolioTitle = document.createElement('button');
  const focusVisual = document.createElement('div');
  const lightboxOverlay = document.createElement('div');
  const lightboxClose = document.createElement('button');
  return {
    modalClose,
    modalOverlay,
    portfolioTitle,
    focusVisual,
    lightboxOverlay,
    lightboxClose
  };
}

describe('appEventBindings', () => {
  it('close ボタン連打時も onCloseModal を取りこぼさない', () => {
    const refs = createRefs();
    const onCloseModal = vi.fn();
    bindGlobalEventListeners(refs, {
      onCloseModal,
      onEscapeKey: vi.fn(),
      onCloseLightbox: vi.fn(),
      onPortfolioTitleClick: vi.fn(),
      onFocusVisualTouchStart: vi.fn()
    });

    refs.modalClose.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
    refs.modalClose.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));

    expect(onCloseModal).toHaveBeenCalledTimes(2);
  });

  it('モーダル close の touchend が document まで伝播する', () => {
    const refs = createRefs();
    const onCloseModal = vi.fn();
    const onDocTouchEnd = vi.fn();
    document.body.appendChild(refs.modalClose);
    document.addEventListener('touchend', onDocTouchEnd);
    bindGlobalEventListeners(refs, {
      onCloseModal,
      onEscapeKey: vi.fn(),
      onCloseLightbox: vi.fn(),
      onPortfolioTitleClick: vi.fn(),
      onFocusVisualTouchStart: vi.fn()
    });

    refs.modalClose.dispatchEvent(new Event('touchend', { bubbles: true, cancelable: true }));

    expect(onCloseModal).toHaveBeenCalledTimes(1);
    expect(onDocTouchEnd).toHaveBeenCalledTimes(1);
    document.removeEventListener('touchend', onDocTouchEnd);
    refs.modalClose.remove();
  });
});
