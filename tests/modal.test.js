import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setRefs } from '../domRefs.js';
import { state } from '../state.js';
import { closeModal, openModal } from '../modal.js';

function setupModalRefs() {
  const modalOverlay = document.createElement('div');
  const modalContainer = document.createElement('div');
  const modalContent = document.createElement('div');
  const modalClose = document.createElement('button');
  const guidanceText = document.createElement('div');
  const lightboxOverlay = document.createElement('div');
  modalOverlay.hidden = true;
  modalContainer.hidden = true;
  lightboxOverlay.hidden = true;
  modalContainer.appendChild(modalClose);
  modalContainer.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  document.body.appendChild(modalContainer);
  setRefs({
    modalOverlay,
    modalContainer,
    modalContent,
    modalClose,
    guidanceText,
    focusVisual: document.createElement('div'),
    titleBackground: document.createElement('div'),
    contextPanel: document.createElement('div'),
    projectNavigation: document.createElement('div'),
    lightboxOverlay
  });
  return { modalOverlay, modalContainer, modalContent };
}

describe('modal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    state.isClosing = false;
    state.currentState = 'modal';
    state.selectedProject = { id: 'p1' };
    state.hoveredProject = { id: 'p1' };
    state.modalFocusTrapHandler = null;
    state.modalTriggerElement = null;
    state.profileModalOpen = false;
  });

  it('openModal はモーダルを表示し本文を描画する', () => {
    const { modalOverlay, modalContainer, modalContent } = setupModalRefs();
    openModal({ title: 'T', description: 'D', projectSlug: 'slug' }, null);
    expect(modalOverlay.hidden).toBe(false);
    expect(modalContainer.hidden).toBe(false);
    expect(modalContent.textContent).toContain('T');
  });

  it('hideModalHeader 時は見た目のヘッダーを出さずタイトルは残す', () => {
    const { modalContent } = setupModalRefs();
    openModal(
      {
        title: 'Others',
        tagline: '作ること全般が好きです。',
        hideModalHeader: true,
        projectSlug: 'others'
      },
      null
    );
    expect(modalContent.querySelector('.modal-header')).toBeNull();
    expect(modalContent.querySelector('#modalTitleHeading')?.classList.contains('visually-hidden')).toBe(
      true
    );
    expect(modalContent.querySelector('#modalTitleHeading')?.textContent).toBe('Others');
  });

  it('openModal はスクロール位置を先頭に戻す', () => {
    const { modalContainer, modalContent } = setupModalRefs();
    modalContainer.scrollTop = 180;
    modalContent.scrollTop = 120;

    openModal({ title: 'T', description: 'D', projectSlug: 'slug' }, null);

    expect(modalContainer.scrollTop).toBe(0);
    expect(modalContent.scrollTop).toBe(0);
  });

  it('closeModal は状態を初期化し modalclose を発火する', () => {
    const { modalOverlay, modalContainer, modalContent } = setupModalRefs();
    modalOverlay.hidden = false;
    modalContainer.hidden = false;
    modalContainer.dataset.swipeSettled = '1';
    modalContent.innerHTML = '<p>content</p>';
    const stopAllInlineVideos = vi.fn();
    const closeListener = vi.fn();
    document.addEventListener('portfolio:modalclose', closeListener);

    closeModal(stopAllInlineVideos);

    expect(stopAllInlineVideos).toHaveBeenCalledOnce();
    expect(modalOverlay.hidden).toBe(true);
    expect(modalContainer.hidden).toBe(true);
    expect(modalContent.innerHTML).toBe('');
    expect(closeListener).toHaveBeenCalledOnce();
    expect(state.currentState).toBe('initial');
    expect(state.selectedProject).toBe(null);
    expect(state.hoveredProject).toBe(null);
  });
});
