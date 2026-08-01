/**
 * アセット命名規則（README / mediaLayout.js と一致）
 */

/** @param {'image' | 'video'} mediaType */
export function buildCaseFilename(prefix, mediaType, number) {
  const kind = mediaType === 'video' ? 'm' : 'p';
  const ext = mediaType === 'video' ? 'webm' : 'webp';
  return `${prefix}_${kind}_${number}.${ext}`;
}

/** @param {string} folder projectSlug または top 等 */
export function buildR2Key(folder, filename) {
  return `${folder}/${filename}`;
}

/** @param {string} baseUrl */
export function buildPublicUrl(baseUrl, folder, filename) {
  const base = baseUrl.replace(/\/$/, '');
  return `${base}/${folder}/${filename}`;
}

/**
 * initiative から現在の画像・動画本数を取得
 * @param {Record<string, unknown>} initiative
 */
export function getInitiativeImageCount(initiative) {
  if (Array.isArray(initiative.imageGroups) && initiative.imageGroups.length > 0) {
    return initiative.imageGroups.reduce((sum, n) => sum + Number(n), 0);
  }
  return Number(initiative.images) || 0;
}

/** @param {Record<string, unknown>} initiative */
export function getInitiativeVideoCount(initiative) {
  if (typeof initiative.videos === 'number') return initiative.videos;
  if (initiative.hasVideo) return 1;
  return 0;
}

/**
 * @param {Array<Record<string, unknown>>} projects
 * @param {string} projectSlug
 */
export function findProject(projects, projectSlug) {
  return projects.find((p) => p.projectSlug === projectSlug) ?? null;
}

/**
 * @param {Record<string, unknown>} project
 * @param {string} assetPrefix
 * @param {string | undefined} caseTitle
 */
export function findInitiative(project, assetPrefix, caseTitle) {
  const cases = project.cases;
  if (!Array.isArray(cases)) return null;

  for (const caseData of cases) {
    if (caseTitle && caseData.title !== caseTitle) continue;
    const initiatives = caseData.initiatives;
    if (!Array.isArray(initiatives)) continue;
    const match = initiatives.find((i) => i.assetPrefix === assetPrefix);
    if (match) return match;
  }

  if (caseTitle) return null;

  for (const caseData of cases) {
    const initiatives = caseData.initiatives;
    if (!Array.isArray(initiatives)) continue;
    const match = initiatives.find((i) => i.assetPrefix === assetPrefix);
    if (match) return match;
  }

  return null;
}
