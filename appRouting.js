import {
  pathForProfileModal,
  pathForProjectSlug,
  parseProfileModalFromPath,
  parseProjectSlugFromPath
} from './routing.js';

export function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

/** 静的プロジェクトページの data 属性、または URL パスから pageSlug を取得 */
export function getPathnameProjectSlug() {
  const fromBody = document.body?.dataset?.portfolioPageSlug;
  if (fromBody) return fromBody;
  return parseProjectSlugFromPath(normalizePathname(window.location.pathname));
}

/** 旧URL互換: #ejic や #project-02 など */
export function findLegacyProjectFromHash(projects) {
  const raw = location.hash.replace(/^#/, '');
  if (!raw) return null;
  const key = decodeURIComponent(raw);
  return (
    projects.find(
      (p) =>
        (p.pageSlug && p.pageSlug === key) ||
        (p.projectSlug && p.projectSlug === key) ||
        p.id === key
    ) || null
  );
}

export function applyModalHistoryForProject(project) {
  if (!project?.pageSlug) return;
  const targetPath = pathForProjectSlug(project.pageSlug);
  const currentPath = normalizePathname(window.location.pathname);
  const expectedPath = normalizePathname(targetPath);
  if (currentPath !== expectedPath) {
    history.pushState({ portfolioModal: true }, '', targetPath);
  }
}

export function isProfileModalPath(pathname = window.location.pathname) {
  return parseProfileModalFromPath(normalizePathname(pathname));
}

export function applyHistoryForProfileModal() {
  const targetPath = pathForProfileModal();
  const currentPath = normalizePathname(window.location.pathname);
  const expectedPath = normalizePathname(targetPath);
  if (currentPath !== expectedPath) {
    history.pushState({ profileModal: true }, '', targetPath);
  }
}

export function restoreBaseHistoryOnModalClose(basePageTitle) {
  if (parseProjectSlugFromPath(normalizePathname(window.location.pathname))) {
    history.replaceState(null, basePageTitle, '/');
    return;
  }
  if (location.hash) {
    history.replaceState(null, basePageTitle, `${location.pathname}${location.search}`);
  }
}

export function restoreBaseHistoryOnProfileModalClose(basePageTitle) {
  if (isProfileModalPath()) {
    history.replaceState(null, basePageTitle, '/');
    return;
  }
  if (location.hash) {
    history.replaceState(null, basePageTitle, `${location.pathname}${location.search}`);
  }
}

function toMetaDescriptionText(project) {
  const raw = (project.description || project.tagline || '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';
  return raw.length > 155 ? `${raw.slice(0, 152)}...` : raw;
}

export function applyModalDocumentMeta(project, metaDescriptionEl) {
  document.title = `${project.title} | SHUNTO FUJII`;
  if (!metaDescriptionEl) return;
  const desc = toMetaDescriptionText(project);
  if (desc) {
    metaDescriptionEl.setAttribute('content', desc);
  }
}

export function restoreBaseDocumentMeta(basePageTitle, baseMetaDescription, metaDescriptionEl) {
  document.title = basePageTitle;
  if (metaDescriptionEl && baseMetaDescription) {
    metaDescriptionEl.setAttribute('content', baseMetaDescription);
  }
}
