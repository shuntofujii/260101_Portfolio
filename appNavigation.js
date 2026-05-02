import { ASSETS_CACHE_V } from './constants.js';

function createThumbnail(project, index, options) {
  const {
    baseAssetsUrl,
    projectThumbnailSizePx,
    thumbnailFetchPriorityCount
  } = options;

  const thumbnail = document.createElement('img');
  thumbnail.className = 'project-thumbnail';
  thumbnail.src = project.thumbnail || `${baseAssetsUrl}/top/placeholder-image.jpg${ASSETS_CACHE_V}`;
  thumbnail.alt = '';
  thumbnail.width = projectThumbnailSizePx;
  thumbnail.height = projectThumbnailSizePx;
  thumbnail.decoding = 'async';

  if (index < thumbnailFetchPriorityCount) {
    thumbnail.fetchPriority = 'high';
  } else {
    thumbnail.loading = 'lazy';
  }

  thumbnail.onerror = function () {
    this.src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3E${project.title.substring(0, 2)}%3C/text%3E%3C/svg%3E`;
  };

  return thumbnail;
}

const LOOP_SEGMENT_COUNT = 3;
const LOOP_RECENTER_LOW_BOUND = 0.5;
const LOOP_RECENTER_HIGH_BOUND = 1.5;
const TOUCH_TAP_MAX_MOVE_PX = 10;
const TOUCH_SYNTHETIC_CLICK_GUARD_MS = 650;

function teardownInfiniteScroll(projectNavigationEl) {
  const cleanup = projectNavigationEl.__projectNavigationCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }
  projectNavigationEl.__projectNavigationCleanup = null;
}

function teardownNavDelegation(projectNavigationEl) {
  const fn = projectNavigationEl.__navDelegationCleanup;
  if (typeof fn === 'function') {
    fn();
  }
  projectNavigationEl.__navDelegationCleanup = null;
}

function recenterLoopPosition(projectNavigationEl, singleSegmentWidth) {
  if (!singleSegmentWidth) return;
  const viewportWidth = projectNavigationEl.clientWidth || 0;
  const centerAlignedOffset = Math.max(0, (singleSegmentWidth - viewportWidth) / 2);
  projectNavigationEl.scrollLeft = Math.round(singleSegmentWidth + centerAlignedOffset);
}

function bindInfiniteHorizontalScroll(projectNavigationEl, projectCount) {
  teardownInfiniteScroll(projectNavigationEl);

  if (projectCount < 2) return;

  let isRecentering = false;
  let recenterRafId = null;
  const getSingleSegmentWidth = () => projectNavigationEl.scrollWidth / LOOP_SEGMENT_COUNT;

  const applyRecentering = () => {
    const singleSegmentWidth = getSingleSegmentWidth();
    const lowerBound = singleSegmentWidth * LOOP_RECENTER_LOW_BOUND;
    const upperBound = singleSegmentWidth * LOOP_RECENTER_HIGH_BOUND;
    const currentScrollLeft = projectNavigationEl.scrollLeft;

    if (currentScrollLeft < lowerBound) {
      isRecentering = true;
      projectNavigationEl.scrollLeft = Math.round(currentScrollLeft + singleSegmentWidth);
      isRecentering = false;
      return;
    }

    if (currentScrollLeft > upperBound) {
      isRecentering = true;
      projectNavigationEl.scrollLeft = Math.round(currentScrollLeft - singleSegmentWidth);
      isRecentering = false;
    }
  };

  const handleScroll = () => {
    if (isRecentering) return;
    applyRecentering();
  };

  const handleResize = () => {
    if (recenterRafId !== null) {
      cancelAnimationFrame(recenterRafId);
    }
    recenterRafId = requestAnimationFrame(() => {
      recenterRafId = null;
      recenterLoopPosition(projectNavigationEl, getSingleSegmentWidth());
    });
  };

  projectNavigationEl.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  recenterLoopPosition(projectNavigationEl, getSingleSegmentWidth());

  projectNavigationEl.__projectNavigationCleanup = () => {
    projectNavigationEl.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleResize);
    if (recenterRafId !== null) {
      cancelAnimationFrame(recenterRafId);
      recenterRafId = null;
    }
  };
}

function shouldEnableInfiniteLoop(projectNavigationEl, projectCount) {
  if (projectCount < 2) return false;
  return projectNavigationEl.scrollWidth > projectNavigationEl.clientWidth + 1;
}

function appendProjectItems(projectNavigationEl, projects, options, passCount) {
  for (let pass = 0; pass < passCount; pass += 1) {
    projects.forEach((project, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'project-item';
      item.dataset.projectId = project.id;
      item.dataset.projectIndex = String(index);
      item.setAttribute('aria-label', `${project.title} の詳細を開く`);

      const thumbnail = createThumbnail(project, index, options);
      item.appendChild(thumbnail);
      projectNavigationEl.appendChild(item);
    });
  }
}

function setupProjectItemListeners(projectNavigationEl, projects, handlers) {
  const {
    onMouseEnter,
    onMouseLeave,
    onTouchStart,
    onClick
  } = handlers;

  teardownNavDelegation(projectNavigationEl);
  let touchCandidateItem = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let suppressClickUntil = 0;

  const resolveProjectByItem = (item) => {
    if (!item || !projectNavigationEl.contains(item)) return null;
    const projectIndex = parseInt(item.dataset.projectIndex, 10);
    if (Number.isNaN(projectIndex)) return null;
    const project = projects[projectIndex];
    if (!project) return null;
    return { project, item };
  };

  const onNavClickCapture = (e) => {
    if (Date.now() < suppressClickUntil) {
      e.stopPropagation();
      return;
    }
    const resolved = resolveProjectByItem(e.target.closest('.project-item'));
    if (!resolved) return;
    e.stopPropagation();
    onClick(resolved.project, resolved.item);
  };

  const onNavTouchStartCapture = (e) => {
    const touch = e.touches?.[0];
    const resolved = resolveProjectByItem(e.target.closest('.project-item'));
    if (!touch || !resolved) {
      touchCandidateItem = null;
      return;
    }
    touchCandidateItem = resolved.item;
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    onTouchStart(resolved.project, resolved.item);
  };

  const onNavTouchMoveCapture = (e) => {
    if (!touchCandidateItem) return;
    const touch = e.touches?.[0];
    if (!touch) {
      touchCandidateItem = null;
      return;
    }
    const movedX = Math.abs(touch.clientX - touchStartX);
    const movedY = Math.abs(touch.clientY - touchStartY);
    if (movedX > TOUCH_TAP_MAX_MOVE_PX || movedY > TOUCH_TAP_MAX_MOVE_PX) {
      touchCandidateItem = null;
    }
  };

  const onNavTouchEndCapture = (e) => {
    if (!touchCandidateItem) return;
    const resolved = resolveProjectByItem(touchCandidateItem);
    touchCandidateItem = null;
    if (!resolved) return;
    // タップ確定時に既定動作（合成 click）を止め、モーダル表示直後の click-through を防ぐ。
    if (e?.cancelable) e.preventDefault();
    e?.stopPropagation?.();
    suppressClickUntil = Date.now() + TOUCH_SYNTHETIC_CLICK_GUARD_MS;
    onClick(resolved.project, resolved.item);
  };

  const onNavTouchCancelCapture = () => {
    touchCandidateItem = null;
  };

  projectNavigationEl.addEventListener('click', onNavClickCapture, true);
  projectNavigationEl.addEventListener('touchstart', onNavTouchStartCapture, { capture: true, passive: true });
  projectNavigationEl.addEventListener('touchmove', onNavTouchMoveCapture, { capture: true, passive: true });
  projectNavigationEl.addEventListener('touchend', onNavTouchEndCapture, { capture: true, passive: false });
  projectNavigationEl.addEventListener('touchcancel', onNavTouchCancelCapture, { capture: true, passive: true });

  projectNavigationEl.__navDelegationCleanup = () => {
    projectNavigationEl.removeEventListener('click', onNavClickCapture, true);
    projectNavigationEl.removeEventListener('touchstart', onNavTouchStartCapture, true);
    projectNavigationEl.removeEventListener('touchmove', onNavTouchMoveCapture, true);
    projectNavigationEl.removeEventListener('touchend', onNavTouchEndCapture, true);
    projectNavigationEl.removeEventListener('touchcancel', onNavTouchCancelCapture, true);
  };

  projectNavigationEl.querySelectorAll('.project-item').forEach((item) => {
    const projectIndex = parseInt(item.dataset.projectIndex, 10);
    const project = projects[projectIndex];
    if (!project) return;

    item.addEventListener('mouseenter', () => onMouseEnter(project, item));
    item.addEventListener('mouseleave', () => onMouseLeave());
  });
}

export function renderProjectNavigation(projectNavigationEl, projects, options) {
  const { handlers } = options;
  teardownNavDelegation(projectNavigationEl);
  teardownInfiniteScroll(projectNavigationEl);
  projectNavigationEl.innerHTML = '';
  projectNavigationEl.classList.remove('is-infinite-loop');
  projectNavigationEl.scrollLeft = 0;

  appendProjectItems(projectNavigationEl, projects, options, 1);

  if (shouldEnableInfiniteLoop(projectNavigationEl, projects.length)) {
    projectNavigationEl.innerHTML = '';
    appendProjectItems(projectNavigationEl, projects, options, LOOP_SEGMENT_COUNT);
    projectNavigationEl.classList.add('is-infinite-loop');
    bindInfiniteHorizontalScroll(projectNavigationEl, projects.length);
  }

  setupProjectItemListeners(projectNavigationEl, projects, handlers);
}
