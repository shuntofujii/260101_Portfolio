export function createModalSwipeController(deps) {
  const {
    refs,
    state,
    isMobileProjectPageSwipeEnabled,
    isLightboxOpen,
    getCurrentSelectedProjectIndex,
    getProjects,
    renderModalContent,
    updateModalProjectInPlace,
    onGestureFinalized,
    config
  } = deps;

  let modalTouchStartX = null;
  let modalTouchStartY = null;
  let modalSwipeDx = 0;
  let modalSwipeLocked = false;
  let modalSwipeIntent = false;
  let modalSwipeGhostContainer = null;
  let modalSwipeGhostContent = null;
  let modalSwipeTargetProject = null;
  let modalSwipeDirection = 0;
  let modalSwipeCommitTimer = null;

  const getModalSwipeCommitThreshold = () => window.innerWidth / 4;

  const clearModalSwipeInlineStyles = () => {
    refs.modalContainer.style.transition = '';
    refs.modalContainer.style.transform = '';
    refs.modalContainer.style.transformOrigin = '';
  };

  const clearModalSwipeCommitTimer = () => {
    if (!modalSwipeCommitTimer) return;
    window.clearTimeout(modalSwipeCommitTimer);
    modalSwipeCommitTimer = null;
  };

  const settleModalContainerAtCenterWithoutRebound = () => {
    refs.modalContainer.style.transition = 'none';
    refs.modalContainer.style.transformOrigin = 'center center';
    refs.modalContainer.style.transform = 'translateX(0)';
    // eslint-disable-next-line no-unused-expressions
    refs.modalContainer.offsetWidth;
    refs.modalContainer.style.transform = '';
    refs.modalContainer.style.transition = '';
    refs.modalContainer.style.transformOrigin = '';
  };

  const hideModalSwipeGhost = () => {
    if (!modalSwipeGhostContainer) return;
    modalSwipeGhostContainer.style.display = 'none';
    modalSwipeGhostContainer.style.transform = '';
    modalSwipeGhostContainer.style.transition = '';
    modalSwipeGhostContainer.style.transformOrigin = '';
    modalSwipeGhostContainer.style.left = '';
    modalSwipeGhostContainer.style.top = '';
    modalSwipeGhostContainer.style.width = '';
    modalSwipeGhostContainer.style.height = '';
    modalSwipeTargetProject = null;
    modalSwipeDirection = 0;
  };

  const finalizeModalSwipeGesture = () => {
    clearModalSwipeCommitTimer();
    modalTouchStartX = null;
    modalTouchStartY = null;
    modalSwipeDx = 0;
    modalSwipeLocked = false;
    modalSwipeIntent = false;
    modalSwipeTargetProject = null;
    modalSwipeDirection = 0;
    clearModalSwipeInlineStyles();
    hideModalSwipeGhost();
    if (typeof onGestureFinalized === 'function') onGestureFinalized();
  };

  const ensureModalSwipeGhost = () => {
    if (modalSwipeGhostContainer && modalSwipeGhostContent) return;
    const ghost = document.createElement('div');
    ghost.className = 'modal-container modal-swipe-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.position = 'fixed';
    ghost.style.margin = '0';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '';
    ghost.style.opacity = '1';
    ghost.style.transition = 'none';
    const ghostContent = document.createElement('div');
    ghostContent.className = 'modal-content';
    ghost.appendChild(ghostContent);
    refs.modalOverlay.appendChild(ghost);
    modalSwipeGhostContainer = ghost;
    modalSwipeGhostContent = ghostContent;
  };

  const computeModalSwipeGutter = (rect) => {
    const vw = window.innerWidth;
    return Math.max(12, Math.min(rect.left, vw - rect.right, (vw - rect.width) / 2));
  };

  const animateModalBackToCenter = () => {
    refs.modalContainer.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
    refs.modalContainer.style.transform = 'translateX(0)';
    if (modalSwipeGhostContainer && modalSwipeDirection) {
      const rect = refs.modalContainer.getBoundingClientRect();
      const gutter = computeModalSwipeGutter(rect);
      const vw = window.innerWidth;
      modalSwipeGhostContainer.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';
      modalSwipeGhostContainer.style.transformOrigin = 'center center';
      if (modalSwipeDirection > 0) {
        modalSwipeGhostContainer.style.left = `${rect.right + gutter}px`;
        modalSwipeGhostContainer.style.top = `${rect.top}px`;
        modalSwipeGhostContainer.style.transform = `translateX(${vw}px)`;
      } else {
        modalSwipeGhostContainer.style.left = `${rect.left - gutter - rect.width}px`;
        modalSwipeGhostContainer.style.top = `${rect.top}px`;
        modalSwipeGhostContainer.style.transform = `translateX(${-vw}px)`;
      }
    }
    window.setTimeout(() => {
      clearModalSwipeInlineStyles();
      hideModalSwipeGhost();
    }, 240);
  };

  const getProjectByDelta = (delta) => {
    if (!delta) return false;
    const projects = getProjects();
    if (!projects?.length) return false;
    const curIndex = getCurrentSelectedProjectIndex();
    if (curIndex < 0) return null;
    const nextIndex = curIndex + delta;
    if (nextIndex < 0 || nextIndex >= projects.length) return null;
    return projects[nextIndex];
  };

  const syncModalGhostTransform = () => {
    if (!modalSwipeGhostContainer || !modalSwipeTargetProject || !modalSwipeDirection) return;
    const rect = refs.modalContainer.getBoundingClientRect();
    const gutter = computeModalSwipeGutter(rect);
    refs.modalContainer.style.transition = 'none';
    refs.modalContainer.style.transformOrigin = 'center center';
    refs.modalContainer.style.transform = `translateX(${modalSwipeDx}px)`;
    modalSwipeGhostContainer.style.display = 'block';
    modalSwipeGhostContainer.style.width = `${rect.width}px`;
    modalSwipeGhostContainer.style.height = `${rect.height}px`;
    modalSwipeGhostContainer.style.transition = 'none';
    modalSwipeGhostContainer.style.transformOrigin = 'center center';
    if (modalSwipeDirection > 0) {
      modalSwipeGhostContainer.style.left = `${rect.right + gutter}px`;
      modalSwipeGhostContainer.style.top = `${rect.top}px`;
      modalSwipeGhostContainer.style.transform = 'translateX(0)';
    } else {
      modalSwipeGhostContainer.style.left = `${rect.left - gutter - rect.width}px`;
      modalSwipeGhostContainer.style.top = `${rect.top}px`;
      modalSwipeGhostContainer.style.transform = 'translateX(0)';
    }
  };

  const onTouchStart = (e) => {
    clearModalSwipeCommitTimer();
    if (!isMobileProjectPageSwipeEnabled()) return;
    if (state.currentState !== 'modal') return;
    if (isLightboxOpen()) return;
    const target = e.target;
    if (target.closest('a, button, input, textarea, select, .mediaItem, .video-shell, .video-controls, .seek')) {
      finalizeModalSwipeGesture();
      return;
    }
    const t = e.changedTouches?.[0];
    if (!t) return;
    modalTouchStartX = t.clientX;
    modalTouchStartY = t.clientY;
    modalSwipeDx = 0;
    modalSwipeLocked = false;
    modalSwipeIntent = true;
    modalSwipeTargetProject = null;
    modalSwipeDirection = 0;
    ensureModalSwipeGhost();
    hideModalSwipeGhost();
  };

  const onTouchMove = (e) => {
    if (!modalSwipeIntent) return;
    if (!isMobileProjectPageSwipeEnabled()) return;
    if (state.currentState !== 'modal') return;
    if (isLightboxOpen()) return;
    if (modalTouchStartX == null || modalTouchStartY == null) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - modalTouchStartX;
    const dy = t.clientY - modalTouchStartY;

    if (!modalSwipeLocked) {
      if (Math.abs(dy) > config.swipeLockY && Math.abs(dy) > Math.abs(dx)) {
        modalSwipeIntent = false;
        return;
      }
      if (Math.abs(dx) > 8) {
        modalSwipeLocked = true;
      }
    }
    if (!modalSwipeLocked) return;

    e.preventDefault();
    modalSwipeDx = dx;
    const direction = dx < 0 ? 1 : -1;
    if (direction !== modalSwipeDirection) {
      modalSwipeDirection = direction;
      modalSwipeTargetProject = getProjectByDelta(direction);
      if (modalSwipeTargetProject && modalSwipeGhostContent) {
        try {
          renderModalContent(modalSwipeTargetProject, modalSwipeGhostContent);
        } catch (err) {
          console.warn('modal ghost render', err);
          modalSwipeTargetProject = null;
        }
      }
    }
    if (!modalSwipeTargetProject) {
      refs.modalContainer.style.transition = 'none';
      refs.modalContainer.style.transformOrigin = 'center center';
      refs.modalContainer.style.transform = `translateX(${dx}px)`;
      return;
    }
    try {
      syncModalGhostTransform();
    } catch (err) {
      console.warn('modal swipe sync', err);
      finalizeModalSwipeGesture();
    }
  };

  const onTouchEnd = (e) => {
    if (!modalSwipeIntent) {
      finalizeModalSwipeGesture();
      return;
    }

    const t = e.changedTouches?.[0] ?? e.touches?.[0];
    const dx = modalSwipeLocked ? modalSwipeDx : (modalTouchStartX != null && t ? t.clientX - modalTouchStartX : 0);
    const dy = modalTouchStartY != null && t ? t.clientY - modalTouchStartY : 0;

    const savedDir = modalSwipeDirection;
    const savedTarget = modalSwipeTargetProject;

    modalTouchStartX = null;
    modalTouchStartY = null;
    modalSwipeDx = 0;
    modalSwipeLocked = false;
    modalSwipeIntent = false;

    if (!isMobileProjectPageSwipeEnabled() || state.currentState !== 'modal' || isLightboxOpen()) {
      modalSwipeTargetProject = null;
      modalSwipeDirection = 0;
      clearModalSwipeInlineStyles();
      hideModalSwipeGhost();
      return;
    }

    if (Math.abs(dy) > config.swipeMaxY || Math.abs(dx) < getModalSwipeCommitThreshold() || !savedTarget) {
      modalSwipeDirection = savedDir;
      modalSwipeTargetProject = savedTarget;
      animateModalBackToCenter();
      return;
    }
    const ghostEl = modalSwipeGhostContainer;

    try {
      if (!ghostEl) {
        modalSwipeDirection = savedDir;
        modalSwipeTargetProject = savedTarget;
        animateModalBackToCenter();
        return;
      }

      const gRect = ghostEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const targetCenterX = vw / 2;
      const ghostCenterX = gRect.left + (gRect.width / 2);
      const sharedDelta = targetCenterX - ghostCenterX;

      if (!Number.isFinite(sharedDelta)) {
        try {
          updateModalProjectInPlace(savedTarget);
        } finally {
          finalizeModalSwipeGesture();
        }
        return;
      }

      modalSwipeDirection = savedDir;
      modalSwipeTargetProject = savedTarget;

      refs.modalContainer.style.transition = `transform ${config.swipeCommitMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      refs.modalContainer.style.transform = `translateX(${dx + sharedDelta}px)`;
      ghostEl.style.transition = `transform ${config.swipeCommitMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
      ghostEl.style.transformOrigin = 'center center';
      ghostEl.style.transform = `translateX(${sharedDelta}px)`;

      clearModalSwipeCommitTimer();
      modalSwipeCommitTimer = window.setTimeout(() => {
        modalSwipeCommitTimer = null;
        if (state.currentState !== 'modal' || state.isClosing || refs.modalOverlay.hidden) return;
        try {
          updateModalProjectInPlace(savedTarget, { fromSwipe: true });
        } finally {
          settleModalContainerAtCenterWithoutRebound();
          hideModalSwipeGhost();
        }
      }, config.swipeCommitMs + 16);
    } catch (err) {
      console.warn('modal swipe touchend', err);
      modalSwipeDirection = savedDir;
      modalSwipeTargetProject = savedTarget;
      try {
        if (savedTarget) updateModalProjectInPlace(savedTarget, { fromSwipe: true });
      } catch (_) {
        /* ignore */
      }
      finalizeModalSwipeGesture();
    }
  };

  const onModalClosed = () => {
    clearModalSwipeCommitTimer();
    finalizeModalSwipeGesture();
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onModalClosed
  };
}
