// 状態管理（単一の state オブジェクト）
export const state = {
  // Data
  projects: [],

  // UI mode
  currentState: 'initial', // 'initial' | 'hover' | 'modal'
  /** 'full' | 'lite' — 低スペック／起動遅延時は演出を抑える（perfMode.js） */
  perfMode: 'full',
  hoveredProject: null,
  selectedProject: null,
  hoverLeaveTimer: null,
  /** 軌跡ヒット時の一時 hover を解除するタイマー */
  trailThumbnailHoverTimer: null,

  // Modal
  isClosing: false,
  modalTriggerElement: null,
  modalFocusTrapHandler: null,

  // Profile modal / intro（入場アニメは profileIntroActive で排他）
  profileModalOpen: false,
  profileIsClosing: false,
  profileIntroActive: false,
  profileModalTriggerElement: null,
  profileFocusTrapHandler: null,

  // Lightbox
  lightboxTriggerElement: null,
  lightboxFocusTrapHandler: null,
  lightboxOriginRect: null,
  lightboxType: 'image',

  // Background/visual transition
  bgLayerFadeCompleteHandler: null,

  /**
   * サイト全体の「崩れ」期間（休止時カーソル軌跡の混沌・プロフィールボタン揺らぎ・ガイダンス誤字）。
   * `siteBrokenPeriod.js` が評価し、各演出が参照する。
   */
  brokenPeriodActive: false,

  /**
   * 最後のユーザー操作時刻（performance.now）。未操作時間の算出用。
   * `siteBrokenPeriod.js` の markActivity / init で更新。
   */
  lastUserActivityPerfMs: null,

  /**
   * 直近「崩れ→通常」に戻った時刻（performance.now）。
   * 連続して崩れやすくするブースト用（siteBrokenPeriod.js）。
   */
  lastBrokenExitPerfMs: null,

  // Cursor effect
  cursorEffectInstance: null,
  colorAnimationFrameId: null,
  colorTransitionStartTime: null,
  lastColorUpdateTime: null,
  cursorAnimationFrameId: null,
  initialHue: null,
  currentAccentColor: null,

  // Media playback
  currentPlayingVideo: null,
};
