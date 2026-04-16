// projects.json から動画URL一覧を抽出（media.js の命名規則と一致させる）
import { baseAssetsUrl } from './constants.js';
import { buildVideoUrl } from './media.js';

function addInitiativeVideos(set, projectSlug, initiative) {
  if (!initiative?.assetPrefix || !projectSlug) return;
  const count = initiative.videos ?? (initiative.hasVideo ? 1 : 0);
  if (!count) return;
  for (let i = 1; i <= count; i++) {
    set.add(buildVideoUrl(projectSlug, initiative.assetPrefix, null, i));
  }
}

function walkCases(set, projectSlug, cases) {
  if (!cases) return;
  cases.forEach((caseData) => {
    caseData.initiatives?.forEach((init) => addInitiativeVideos(set, projectSlug, init));
  });
}

/**
 * @param {object[]} projects
 * @returns {{ all: string[], hero: string[] }}
 */
export function collectProjectVideoUrls(projects) {
  const all = new Set();
  const hero = [];

  if (!Array.isArray(projects)) return { all: [], hero: [] };

  projects.forEach((project) => {
    if (project.heroMedia?.type === 'video' && project.heroMedia.src) {
      all.add(project.heroMedia.src);
      hero.push(project.heroMedia.src);
    }
    project.gallery?.forEach((item) => {
      if (item.type === 'video' && item.src) all.add(item.src);
    });
    if (project.projectSlug) {
      walkCases(all, project.projectSlug, project.cases);
      project.initiatives?.forEach((init) => addInitiativeVideos(all, project.projectSlug, init));
      project.explicitModal?.segments?.forEach((seg) => {
        if (seg?.type === 'video' && seg.file) {
          all.add(`${baseAssetsUrl}/${project.projectSlug}/${seg.file}`);
        }
      });
    }
  });

  return { all: [...all], hero };
}
