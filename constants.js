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
  /** 角 θ の初期位相（x = R cos θ の θ 開始値） */
  trajectoryThetaMin: 1,
  /** R(t) に渡す t：0 ↔ 1000 を同じレートで往復 */
  trajectoryRMin: 0,
  trajectoryRMax: 1000,
  /** この秒数までは R 用 t のみ極めて緩やか（見た目は長く真円に近い） */
  trajectoryQuietHoldSec: 9,
  /** ホールド中の R 用 t の増加速度（秒あたり・小さいほど真円が長持ち） */
  trajectoryNoiseQuietRate: 0.035,
  /** 描画の角速度（rad/秒）。ホールド前後で一定＝最初から崩れ始めと同程度の速さで円を描く */
  trajectoryAngularRate: 1.15,
  /** ホールド後の R 用 t の増加速度（ノイズが大きくなる） */
  trajectoryChaosRate: 1.15,
  /** .project-item の矩形に足す余白（0 なら拡大前レイアウト枠ぴったり） */
  thumbnailOverlapPadPx: 0,
  /** 重なり時の不透明度を 0/1 に近づける補間係数（毎フレーム） */
  thumbnailOpacityLerp: 0.22,
};

export const baseAssetsUrl = 'https://assets.shuntofujii.com';

/** コンテキストパネルで「Opening Soon」を付与するプロジェクト id（projects.json の id と一致） */
export const OPENING_SOON_PROJECT_ID = 'project-08';

/** 動画 `<link rel="preload">` の上限（デスクトップと同値にした場合はモバイル帯域消費が増える） */
export const VIDEO_PRELOAD_LINK_MAX_MOBILE = 8;
export const VIDEO_PRELOAD_LINK_MAX_DESKTOP = 8;

/** 起動時に先読みヒントで温めるヒーロー動画本数 */
export const HERO_VIDEO_PREFETCH_COUNT_MOBILE = 8;
export const HERO_VIDEO_PREFETCH_COUNT_DESKTOP = 8;

/** `.project-item` / `.project-thumbnail` の表示サイズ（CLS 用 width/height と一致） */
export const PROJECT_THUMBNAIL_SIZE_PX = 90;

/** 優先読み込みするサムネイル数（残りは lazy） */
export const THUMBNAIL_FETCH_PRIORITY_COUNT = 2;

/** ガイダンス「Please select a project」タイプライター（文字追加・削除の間隔・停止） */

/** 通常入力の文字間隔（ms）の乱数範囲 */
export const GUIDANCE_TYPE_MS_MIN = 68;
export const GUIDANCE_TYPE_MS_MAX = 105;

/** 文末からの一括削除時、1文字あたりの間隔（ms）の乱数範囲 */
export const GUIDANCE_DELETE_MS_MIN = 42;
export const GUIDANCE_DELETE_MS_MAX = 72;

export const GUIDANCE_PAUSE_AT_FULL_MS = 3000;
/** 削除完了後〜再入力開始までの短い休止 */
export const GUIDANCE_PAUSE_AT_EMPTY_MS = 400;

/** 1文字入力時に隣接キー誤入力へ分岐する確率（0〜1・ベース値） */
export const GUIDANCE_TYPO_PROBABILITY = 0.14;
/**
 * 直前まで連続してタイプミスしていたとき、ベース確率に掛ける減衰（1回ごとに乗算）。
 * 例: 0.65 なら 2連続で 0.65^2
 */
export const GUIDANCE_TYPO_CONSECUTIVE_DECAY = 0.66;

/** 誤字を直さずに「本来の次の文字」を打ち足すときのベース確率（0〜1） */
export const GUIDANCE_TYPO_CHAIN_CONTINUE_BASE = 0.36;
/** 誤字のあとに足した正しい文字が多いほど、さらに打ち足す確率に掛ける減衰 */
export const GUIDANCE_TYPO_CHAIN_CONTINUE_DECAY = 0.5;
/** 誤字のまま先へ進める正しい文字の最大数（連鎖の上限） */
export const GUIDANCE_TYPO_MAX_APPEND_WHILE_WRONG = 5;

/** 誤入力文字を表示している時間（気づくまで）（ms）—通常の文字間より長めの範囲 */
export const GUIDANCE_TYPO_WRONG_HOLD_MS_MIN = 100;
export const GUIDANCE_TYPO_WRONG_HOLD_MS_MAX = 175;

/** 誤入力あと削除するまでのためらい（ms）の乱数範囲 */
export const GUIDANCE_TYPO_PAUSE_BEFORE_DELETE_MIN_MS = 210;
export const GUIDANCE_TYPO_PAUSE_BEFORE_DELETE_MAX_MS = 400;

/**
 * 正しい文字を打ち直したあと、次の入力へ進むまでの待ち（ms）。
 * 下限・上限は GUIDANCE_TYPE_* に「タイプミス後のひと休み」を足したレンジ。
 */
export const GUIDANCE_TYPO_AFTER_FIX_EXTRA_MIN_MS = 95;
export const GUIDANCE_TYPO_AFTER_FIX_EXTRA_MAX_MS = 270;
