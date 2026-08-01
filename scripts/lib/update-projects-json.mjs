import fs from 'fs';
import path from 'path';
import { repoRoot } from './env.mjs';
import {
  findInitiative,
  findProject,
  getInitiativeImageCount,
  getInitiativeVideoCount,
} from './asset-paths.mjs';

export const PROJECTS_JSON_PATH = path.join(repoRoot, 'projects.json');

/** @returns {Array<Record<string, unknown>>} */
export function readProjectsJson(filePath = PROJECTS_JSON_PATH) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

/** @param {Array<Record<string, unknown>>} projects */
export function writeProjectsJson(projects, filePath = PROJECTS_JSON_PATH) {
  fs.writeFileSync(filePath, `${JSON.stringify(projects, null, 2)}\n`, 'utf8');
}

/**
 * @param {object} options
 * @param {string} options.projectSlug
 * @param {string} [options.assetPrefix]
 * @param {'image' | 'video'} [options.mediaType]
 * @param {number} options.number
 * @param {string} [options.caseTitle]
 * @param {'hero' | 'thumbnail'} [options.target]
 * @param {string} [options.publicUrl]
 */
export function applyProjectsJsonUpdate(options, projects = readProjectsJson()) {
  const project = findProject(projects, options.projectSlug);
  if (!project) {
    throw new Error(`projects.json に projectSlug="${options.projectSlug}" が見つかりません。`);
  }

  if (options.target === 'hero') {
    if (!options.publicUrl) throw new Error('hero 更新には publicUrl が必要です。');
    project.heroMedia = { type: 'video', src: options.publicUrl };
    return { projects, initiative: null };
  }

  if (options.target === 'thumbnail') {
    if (!options.publicUrl) throw new Error('thumbnail 更新には publicUrl が必要です。');
    project.thumbnail = options.publicUrl;
    return { projects, initiative: null };
  }

  if (!options.assetPrefix || !options.mediaType) {
    throw new Error('case メディア更新には assetPrefix と mediaType が必要です。');
  }

  const initiative = findInitiative(project, options.assetPrefix, options.caseTitle);
  if (!initiative) {
    const hint = options.caseTitle
      ? `case="${options.caseTitle}" 内の assetPrefix="${options.assetPrefix}"`
      : `assetPrefix="${options.assetPrefix}"`;
    throw new Error(`projects.json に ${hint} が見つかりません。`);
  }

  if (options.mediaType === 'image') {
    const current = getInitiativeImageCount(initiative);
    const next = Math.max(current, options.number);

    if (Array.isArray(initiative.imageGroups) && initiative.imageGroups.length > 0) {
      const total = getInitiativeImageCount(initiative);
      if (options.number > total) {
        initiative.imageGroups[initiative.imageGroups.length - 1] += options.number - total;
      }
    } else {
      initiative.images = next;
    }
  } else {
    const current = getInitiativeVideoCount(initiative);
    const next = Math.max(current, options.number);
    delete initiative.hasVideo;
    initiative.videos = next;
  }

  return { projects, initiative };
}

/**
 * 次の通番を決定（--number 未指定時）
 * @param {Record<string, unknown>} initiative
 * @param {'image' | 'video'} mediaType
 */
export function resolveNextNumber(initiative, mediaType) {
  if (mediaType === 'image') {
    return getInitiativeImageCount(initiative) + 1;
  }
  return getInitiativeVideoCount(initiative) + 1;
}
