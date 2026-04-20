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

function setupProjectItemListeners(projectNavigationEl, projects, handlers) {
  const {
    onMouseEnter,
    onMouseLeave,
    onTouchStart,
    onClick
  } = handlers;
  const projectItems = projectNavigationEl.querySelectorAll('.project-item');

  projectItems.forEach((item) => {
    const projectIndex = parseInt(item.dataset.projectIndex, 10);
    const project = projects[projectIndex];
    if (!project) return;

    item.addEventListener('mouseenter', () => onMouseEnter(project, item));
    item.addEventListener('mouseleave', () => onMouseLeave());
    item.addEventListener('touchstart', () => onTouchStart(project, item), { passive: true });
    item.addEventListener('click', () => onClick(project, item));
  });
}

export function renderProjectNavigation(projectNavigationEl, projects, options) {
  const { handlers } = options;
  projectNavigationEl.innerHTML = '';

  projects.forEach((project, index) => {
    const item = document.createElement('div');
    item.className = 'project-item';
    item.dataset.projectId = project.id;
    item.dataset.projectIndex = index;

    const thumbnail = createThumbnail(project, index, options);
    item.appendChild(thumbnail);
    projectNavigationEl.appendChild(item);
  });

  setupProjectItemListeners(projectNavigationEl, projects, handlers);
}
