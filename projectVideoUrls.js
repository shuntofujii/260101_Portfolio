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
 * 1プロジェクトに紐づく動画 URL のみ抽出（一覧ホバー・モーダル時の先読み用）
 * heroMedia・cases・initiatives・explicitModal の動画のみ（モーダルが実際に参照する URL と一致）
 * @param {object} project projects.json の1要素
 * @returns {{ urls: string[], heroVideo: string | null }}
 */
export function collectVideoUrlsForProject(project) {
  if (!project) return { urls: [], heroVideo: null };

  const set = new Set();
  let heroVideo = null;

  if (project.heroMedia?.type === 'video' && project.heroMedia.src) {
    set.add(project.heroMedia.src);
    heroVideo = project.heroMedia.src;
  }

  const slug = project.projectSlug;
  if (slug) {
    walkCases(set, slug, project.cases);
    project.initiatives?.forEach((init) => addInitiativeVideos(set, slug, init));
    project.explicitModal?.segments?.forEach((seg) => {
      if (seg?.type === 'video' && seg.file) {
        set.add(`${baseAssetsUrl}/${slug}/${seg.file}`);
      }
      if (seg?.type === 'mediaRow' && Array.isArray(seg.items)) {
        seg.items.forEach((item) => {
          if (item?.type === 'video' && item.file) {
            set.add(`${baseAssetsUrl}/${slug}/${item.file}`);
          }
        });
      }
    });
  }

  return { urls: [...set], heroVideo };
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
    if (project.projectSlug) {
      walkCases(all, project.projectSlug, project.cases);
      project.initiatives?.forEach((init) => addInitiativeVideos(all, project.projectSlug, init));
      project.explicitModal?.segments?.forEach((seg) => {
        if (seg?.type === 'video' && seg.file) {
          all.add(`${baseAssetsUrl}/${project.projectSlug}/${seg.file}`);
        }
        if (seg?.type === 'mediaRow' && Array.isArray(seg.items)) {
          seg.items.forEach((item) => {
            if (item?.type === 'video' && item.file) {
              all.add(`${baseAssetsUrl}/${project.projectSlug}/${item.file}`);
            }
          });
        }
      });
    }
  });

  return { all: [...all], hero };
}
