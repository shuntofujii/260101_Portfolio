// 状態管理（単一の state オブジェクト）
export const state = {
  projects: [],
  currentState: 'initial', // 'initial' | 'hover' | 'modal'
  hoveredProject: null,
  selectedProject: null,
  hoverLeaveTimer: null,

  isClosing: false,
  modalTriggerElement: null,
  modalFocusTrapHandler: null,

  lightboxTriggerElement: null,
  lightboxFocusTrapHandler: null,
  lightboxOriginRect: null,
  lightboxType: 'image',

  bgLayerFadeCompleteHandler: null,

  cursorEffectInstance: null,
  colorAnimationFrameId: null,
  colorTransitionStartTime: null,
  lastColorUpdateTime: null,
  cursorAnimationFrameId: null,
  initialHue: null,
  currentAccentColor: null,

  currentPlayingVideo: null,
};
