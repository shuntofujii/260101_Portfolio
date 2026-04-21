// 定数（時間・z-index・URL・カーソル設定など）
/** CSS のレスポンシブブレークポイント（スマホ判定）と揃える */
export const BREAKPOINT_MOBILE_PX = 768;

export const LIGHTBOX_CLOSE_DURATION_MS = 400;
export const LIGHTBOX_VIDEO_PLAY_DELAY_MS = 500;
export const VIDEO_UPDATE_FADE_DELAY_MS = 100;
export const VIDEO_SHOW_FALLBACK_MS = 1200;
export const CURSOR_Z_INDEX = 100;

export const COLOR_TRANSITION_DURATION = 60000;
export const COLOR_UPDATE_THROTTLE_MS = 50;

export const CURSOR_CONFIG = {
  shaderPoints: 16,
  curvePoints: 80,
  curveLerp: 0.5,
  /** サムネイル上では追従を強めて尻尾を短く（0〜1、大きいほど短い） */
  curveLerpOnThumbnail: 1,
  radius1: 3,
  radius2: 5,
  sleepTimeCoefX: 1.0,
  sleepTimeCoefY: 1.0,
  /** .project-item の矩形に足す余白（0 なら拡大前レイアウト枠ぴったり） */
  thumbnailOverlapPadPx: 0,
  /** 重なり時の不透明度を 0/1 に近づける補間係数（毎フレーム） */
  thumbnailOpacityLerp: 0.22,
};

export const baseAssetsUrl = 'https://assets.shuntofujii.com';

/** コンテキストパネルで「Opening Soon」を付与するプロジェクト id（projects.json の id と一致） */
export const OPENING_SOON_PROJECT_ID = 'project-08';

/** 動画 `<link rel="preload">` の上限（モバイルは帯域を LCP 向けに譲る） */
export const VIDEO_PRELOAD_LINK_MAX_MOBILE = 1;
export const VIDEO_PRELOAD_LINK_MAX_DESKTOP = 8;

/** 起動時に Blob 取得で先に温めるヒーロー動画本数 */
export const HERO_VIDEO_PREFETCH_COUNT_MOBILE = 1;
export const HERO_VIDEO_PREFETCH_COUNT_DESKTOP = 8;

/** `.project-item` / `.project-thumbnail` の表示サイズ（CLS 用 width/height と一致） */
export const PROJECT_THUMBNAIL_SIZE_PX = 90;

/** 優先読み込みするサムネイル数（残りは lazy） */
export const THUMBNAIL_FETCH_PRIORITY_COUNT = 2;
