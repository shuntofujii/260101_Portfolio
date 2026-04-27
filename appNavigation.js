function createThumbnail(project, index, options) {
  const {
    baseAssetsUrl,
    projectThumbnailSizePx,
    thumbnailFetchPriorityCount
  } = options;

  const thumbnail = document.createElement('img');
  thumbnail.className = 'project-thumbnail';
  thumbnail.src = project.thumbnail || `${baseAssetsUrl}/top/placeholder-image.jpg`;
  thumbnail.alt = project.title;
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

import { clearProjectTouchPreviewTracking } from './appProjectInteractions.js';

function teardownInfiniteScroll(projectNavigationEl) {
  const cleanup = projectNavigationEl.__projectNavigationCleanup;
  if (typeof cleanup === 'function') {
    cleanup();
  }
  projectNavigationEl.__projectNavigationCleanup = null;
}

function recenterLoopPosition(projectNavigationEl, singleSegmentWidth) {
  if (!singleSegmentWidth) return;
  const viewportWidth = projectNavigationEl.clientWidth || 0;
  const centerAlignedOffset = (singleSegmentWidth - viewportWidth) / 2;
  projectNavigationEl.scrollLeft = singleSegmentWidth + Math.max(0, centerAlignedOffset);
}

function bindInfiniteHorizontalScroll(projectNavigationEl, projectCount) {
  teardownInfiniteScroll(projectNavigationEl);

  if (projectCount < 2) return;

  let isRecentering = false;
  let recenterRafId = null;
  /** モバイルのアドレスバー等で高さだけ変わる resize では再センタしない（横の微動・縦ジッタを防ぐ） */
  let lastResizeClientWidth = projectNavigationEl.clientWidth;
  const getSingleSegmentWidth = () => projectNavigationEl.scrollWidth / LOOP_SEGMENT_COUNT;

  const applyRecentering = () => {
    const singleSegmentWidth = getSingleSegmentWidth();
    const lowerBound = singleSegmentWidth * LOOP_RECENTER_LOW_BOUND;
    const upperBound = singleSegmentWidth * LOOP_RECENTER_HIGH_BOUND;
    const currentScrollLeft = projectNavigationEl.scrollLeft;

    if (currentScrollLeft < lowerBound) {
      isRecentering = true;
      projectNavigationEl.scrollLeft = currentScrollLeft + singleSegmentWidth;
      isRecentering = false;
      return;
    }

    if (currentScrollLeft > upperBound) {
      isRecentering = true;
      projectNavigationEl.scrollLeft = currentScrollLeft - singleSegmentWidth;
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
      const cw = projectNavigationEl.clientWidth;
      if (cw === lastResizeClientWidth) return;
      lastResizeClientWidth = cw;
      recenterLoopPosition(projectNavigationEl, getSingleSegmentWidth());
    });
  };

  projectNavigationEl.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  recenterLoopPosition(projectNavigationEl, getSingleSegmentWidth());
  lastResizeClientWidth = projectNavigationEl.clientWidth;

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
      const item = document.createElement('div');
      item.className = 'project-item';
      item.dataset.projectId = project.id;
      item.dataset.projectIndex = index;

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
    onPointerDown,
    onClick
  } = handlers;
  const projectItems = projectNavigationEl.querySelectorAll('.project-item');

  projectItems.forEach((item) => {
    const projectIndex = parseInt(item.dataset.projectIndex, 10);
    const project = projects[projectIndex];
    if (!project) return;

    item.addEventListener('mouseenter', () => onMouseEnter(project, item));
    item.addEventListener('mouseleave', () => onMouseLeave());
    if (typeof onPointerDown === 'function') {
      item.addEventListener('pointerdown', (e) => onPointerDown(project, item, e));
    }
    item.addEventListener('click', () => onClick(project, item));
  });
}

export function renderProjectNavigation(projectNavigationEl, projects, options) {
  const { handlers } = options;
  clearProjectTouchPreviewTracking();
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
