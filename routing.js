/**
 * ポートフォリオのプロジェクト別URL（/{pageSlug}/）用ルーティング補助
 */

/** 静的ファイル等と誤認しないよう、ルート1セグメント目を案件として扱わないもの */
const RESERVED_ROOT_SEGMENTS = new Set(['projects']);

/** ルート直下の実ファイルと衝突するパス（拡張子付きリクエスト） */
const STATIC_FILE_SEGMENT_RE = /\.(css|js|json|html?|ico|xml|webmanifest|map|txt|md|woff2?)$/i;

/**
 * パスから pageSlug を取得（例: /ejic/ → ejic）
 * 単一セグメントのみ。/styles.css 等は null。
 */
export function parseProjectSlugFromPath(pathname) {
  if (!pathname || pathname === '/') return null;
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return null;
  const m = p.match(/^\/([^/]+)$/);
  if (!m) return null;
  const seg = decodeURIComponent(m[1]);
  if (RESERVED_ROOT_SEGMENTS.has(seg)) return null;
  if (STATIC_FILE_SEGMENT_RE.test(seg)) return null;
  return seg;
}

/** プロジェクトページのパス（末尾スラッシュ付き・サイトルート基準） */
export function pathForProjectSlug(slug) {
  return `/${encodeURIComponent(slug)}/`;
}
