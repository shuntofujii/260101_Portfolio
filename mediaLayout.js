import { baseAssetsUrl } from './constants.js';

function buildAssetPrefix(initiativeName, caseName = null) {
  return caseName ? `${initiativeName}_${caseName}` : initiativeName;
}

export function buildImageUrl(projectSlug, initiativeName, caseName = null, number = 1) {
  const prefix = buildAssetPrefix(initiativeName, caseName);
  return `${baseAssetsUrl}/${projectSlug}/${prefix}_p_${number}.webp`;
}

export function buildVideoUrl(projectSlug, initiativeName, caseName = null, number = 1) {
  const prefix = buildAssetPrefix(initiativeName, caseName);
  return `${baseAssetsUrl}/${projectSlug}/${prefix}_m_${number}.webm`;
}

export function getImageGridLayout(count, isMobile) {
  if (isMobile) {
    switch (count) {
      case 2: return { columns: 2, spans: [] };
      case 3: return { columns: 2, spans: [{ index: 2, span: 2 }] };
      case 4: return { columns: 2, spans: [] };
      case 5: return { columns: 2, spans: [{ index: 4, span: 2 }] };
      default: return { columns: 1, spans: [] };
    }
  }

  switch (count) {
    case 2: return { columns: 2, spans: [] };
    case 3: return { columns: 3, spans: [] };
    case 4: return { columns: 2, spans: [] };
    case 5:
      return {
        columns: 6,
        spans: [
          { index: 0, span: 2 }, { index: 1, span: 2 }, { index: 2, span: 2 },
          { index: 3, span: 3 }, { index: 4, span: 3 }
        ]
      };
    default: return { columns: 1, spans: [] };
  }
}

export function getLayoutSpan(layout, index) {
  if (!layout || !Array.isArray(layout.spans)) return null;
  return layout.spans.find((s) => s.index === index) || null;
}
