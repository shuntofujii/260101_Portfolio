// 状態管理（単一の state オブジェクト）
export const state = {
  // Data
  projects: [],

  // UI mode
  currentState: 'initial', // 'initial' | 'hover' | 'modal'
  hoveredProject: null,
  selectedProject: null,
  hoverLeaveTimer: null,

  // Modal
  isClosing: false,
  modalTriggerElement: null,
  modalFocusTrapHandler: null,

  // Lightbox
  lightboxTriggerElement: null,
  lightboxFocusTrapHandler: null,
  lightboxOriginRect: null,
  lightboxType: 'image',

  // Background/visual transition
  bgLayerFadeCompleteHandler: null,

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
