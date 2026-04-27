// 本ファイルは https://shuntofujii.com/ のポートフォリオテンプレートに基づきます。
// 二次利用・改変時も上記出典表記は残してください（ライセンス・出典の明示のため）。
// ============================================
// エントリポイント（main）
// ============================================
import { state } from './state.js';
import { initializeAppRefs } from './appDomSetup.js';
import {
  VIDEO_UPDATE_FADE_DELAY_MS,
  VIDEO_SHOW_FALLBACK_MS,
  baseAssetsUrl,
  OPENING_SOON_PROJECT_ID,
  BREAKPOINT_MOBILE_PX,
  VIDEO_PRELOAD_LINK_MAX_MOBILE,
  VIDEO_PRELOAD_LINK_MAX_DESKTOP,
  HERO_VIDEO_PREFETCH_COUNT_MOBILE,
  HERO_VIDEO_PREFETCH_COUNT_DESKTOP,
  PROJECT_THUMBNAIL_SIZE_PX,
  THUMBNAIL_FETCH_PRIORITY_COUNT
} from './constants.js';
import { escapeHtml } from './utils.js';
import { initCursorEffect } from './cursorEffect.js';
import { initGuidanceTypewriter } from './guidanceTypewriter.js';
import { openModal, closeModal, renderModalContent } from './modal.js';
import { openLightbox, openLightboxVideo, closeLightbox } from './lightbox.js';
import { stopAllInlineVideos } from './media.js';
import { injectVideoLinkPreloads, scheduleIdleVideoPreload, ensureVideoPlayUrl } from './videoCache.js';
import { collectProjectVideoUrls, collectVideoUrlsForProject } from './projectVideoUrls.js';
import { pathForProjectSlug, parseProjectSlugFromPath } from './routing.js';
import { renderProjectNavigation as renderProjectNavigationView } from './appNavigation.js';
import { updateHeroMedia as updateHeroMediaView } from './appHeroMedia.js';
import { bindGlobalEventListeners } from './appEventBindings.js';
import { createModalSwipeController } from './appModalSwipeController.js';
import { createProjectInteractionController } from './appProjectInteractions.js';
import { createAppBootstrapController } from './appBootstrap.js';
import { createModalRoutingController } from './appModalRoutingController.js';
import {
  clearHoverLeaveTimer as clearHoverLeaveTimerState,
  clearProjectSelections as clearProjectSelectionsView,
  resetHeroVideoBase as resetHeroVideoBaseView,
  beginBackgroundFadeOutToInitialState as beginBackgroundFadeOutToInitialStateView,
  resetToInitialState as resetToInitialStateView
} from './appStateTransitions.js';
import {
  normalizePathname,
  getPathnameProjectSlug,
  findLegacyProjectFromHash,
  applyModalHistoryForProject,
  restoreBaseHistoryOnModalClose,
  applyModalDocumentMeta,
  restoreBaseDocumentMeta
} from './appRouting.js';

const BASE_PAGE_TITLE = document.title;
const metaDescriptionEl = document.querySelector('meta[name="description"]');
const BASE_META_DESCRIPTION = metaDescriptionEl?.getAttribute('content') ?? '';
const PROJECT_SWIPE_MAX_Y = 72;
const PROJECT_SWIPE_LOCK_Y = 14;
const PROJECT_SWIPE_COMMIT_MS = 260;

const refs = initializeAppRefs({ openLightbox, openLightboxVideo });

const modalRoutingController = createModalRoutingController({
  state,
  refs,
  basePageTitle: BASE_PAGE_TITLE,
  baseMetaDescription: BASE_META_DESCRIPTION,
  metaDescriptionEl,
  clearProjectSelections,
  preloadProjectVideos,
  openModal,
  closeModalAndStopVideos,
  renderModalContent,
  getProjects: () => state.projects,
  parseProjectSlugFromPath,
  normalizePathname,
  getPathnameProjectSlug,
  findLegacyProjectFromHash,
  pathForProjectSlug,
  applyModalHistoryForProject,
  restoreBaseHistoryOnModalClose,
  applyModalDocumentMeta,
  restoreBaseDocumentMeta
});
modalRoutingController.bindRouteEventListeners();

function applyInitialRoute() {
  modalRoutingController.applyInitialRoute();
}

function openProjectModalFromRoute(project) {
  modalRoutingController.openProjectModalFromRoute(project);
}

function updateModalProjectInPlace(project, options = {}) {
  modalRoutingController.updateModalProjectInPlace(project, options);
}

const appBootstrapController = createAppBootstrapController({
  state,
  refs,
  isMobileViewport,
  constants: {
    videoPreloadLinkMaxMobile: VIDEO_PRELOAD_LINK_MAX_MOBILE,
    videoPreloadLinkMaxDesktop: VIDEO_PRELOAD_LINK_MAX_DESKTOP,
    heroVideoPrefetchCountMobile: HERO_VIDEO_PREFETCH_COUNT_MOBILE,
    heroVideoPrefetchCountDesktop: HERO_VIDEO_PREFETCH_COUNT_DESKTOP
  },
  collectProjectVideoUrls,
  collectVideoUrlsForProject,
  injectVideoLinkPreloads,
  scheduleIdleVideoPreload,
  ensureVideoPlayUrl,
  initGuidanceTypewriter,
  initCursorEffect,
  applyInitialRoute,
  renderInitialState,
  renderProjectNavigation,
  setupEventListeners,
  fetchProjectsData,
  showErrorState
});

function isMobileViewport() {
  return window.matchMedia(`(max-width: ${BREAKPOINT_MOBILE_PX}px)`).matches;
}

function clearHoverLeaveTimer() {
  clearHoverLeaveTimerState(state);
}

function clearProjectSelections() {
  clearProjectSelectionsView();
}

function resetHeroVideoBase() {
  resetHeroVideoBaseView(refs.heroVideoBase);
}

function closeModalAndStopVideos() {
  closeModal(stopAllInlineVideos);
}

function handleEscapeKey() {
  if (refs.lightboxOverlay && !refs.lightboxOverlay.hidden) {
    closeLightbox();
    return;
  }
  if (state.currentState === 'modal') {
    closeModalAndStopVideos();
  }
}

function openHomeFromStaticProjectPage() {
  window.location.href = '/';
}

function shouldResetFromFocusVisualTouch(target) {
  if (target?.closest('.project-item')) return false;
  if (state.currentState === 'modal') return false;
  return state.currentState === 'hover' && refs.heroVideoBase && !refs.heroVideoBase.paused;
}

function handlePortfolioTitleClick() {
  if (document.body.dataset.portfolioPageSlug) {
    openHomeFromStaticProjectPage();
    return;
  }
  if (state.currentState === 'modal') {
    closeModalAndStopVideos();
    return;
  }
  resetToInitialState();
}

function handleFocusVisualTouchStart(e) {
  if (shouldResetFromFocusVisualTouch(e.target)) {
    resetToInitialState();
  }
}

/**
 * モーダル内の前後案件スワイプ（モバイル）
 * - 旧: `data-portfolio-page-slug` 付きページのみ有効にしていた。
 * - 案件ページでモーダルを閉じると `portfolio:modalclose` で `/` へ遷移し、
 *   トップの body には当該属性が無い → 再オープン後ずっとスワイプ不能になる。
 * - そのため「モバイルかつ複数案件があれば」モーダル表示中は常に有効とする。
 */
function isMobileProjectPageSwipeEnabled() {
  if (!isMobileViewport()) return false;
  if (!Array.isArray(state.projects) || state.projects.length < 2) return false;
  return true;
}

function getCurrentSelectedProjectIndex() {
  if (!state.projects?.length || !state.selectedProject?.id) return -1;
  return state.projects.findIndex((p) => p.id === state.selectedProject.id);
}

function navigateProjectByDelta(delta) {
  if (!delta || !state.projects?.length) return;
  const curIndex = getCurrentSelectedProjectIndex();
  if (curIndex < 0) return;
  const nextIndex = curIndex + delta;
  if (nextIndex < 0 || nextIndex >= state.projects.length) return;
  openProjectModalFromRoute(state.projects[nextIndex]);
}

function beginBackgroundFadeOutToInitialState() {
  beginBackgroundFadeOutToInitialStateView(state, refs.bgLayer, renderInitialState);
}

async function fetchProjectsData() {
  const response = await fetch('/projects.json');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

function preloadProjectVideos(project) {
  appBootstrapController.preloadProjectVideos(project);
}

// ============================================
// 初期化
// ============================================
async function init() {
  await appBootstrapController.init();
}

// ============================================
// 初期状態の描画
// ============================================
function renderInitialState() {
  refs.contextPanel.classList.remove('visible');
  resetHeroVideoBase();

  if (refs.bgLayer) {
    refs.bgLayer.style.opacity = '0';
    refs.bgLayer.classList.remove('isFading');
  }

  refs.titleText.textContent = 'PORTFOLIO';
  refs.guidanceText.classList.add('visible');
}

// ============================================
// プロジェクト選択UIの描画
// ============================================
function renderProjectNavigation() {
  const projectInteractionController = createProjectInteractionController({
    state,
    refs,
    openingSoonProjectId: OPENING_SOON_PROJECT_ID,
    escapeHtml,
    clearHoverLeaveTimer,
    clearProjectSelections,
    resetHeroVideoBase,
    beginBackgroundFadeOutToInitialState,
    updateHeroMedia,
    preloadProjectVideos,
    openProjectModalFromRoute
  });

  renderProjectNavigationView(refs.projectNavigation, state.projects, {
    baseAssetsUrl,
    projectThumbnailSizePx: PROJECT_THUMBNAIL_SIZE_PX,
    thumbnailFetchPriorityCount: THUMBNAIL_FETCH_PRIORITY_COUNT,
    handlers: {
      onMouseEnter: projectInteractionController.handleProjectItemMouseEnter,
      onMouseLeave: projectInteractionController.handleProjectItemMouseLeave,
      onPointerDown: projectInteractionController.handleProjectItemPointerDown,
      onClick: projectInteractionController.handleProjectItemClick
    }
  });
}

// ============================================
// イベントリスナーの設定
// ============================================
function setupEventListeners() {
  const modalSwipeController = createModalSwipeController({
    refs,
    state,
    isMobileProjectPageSwipeEnabled,
    isLightboxOpen: () => refs.lightboxOverlay && !refs.lightboxOverlay.hidden,
    getCurrentSelectedProjectIndex,
    getProjects: () => state.projects,
    renderModalContent,
    updateModalProjectInPlace,
    config: {
      swipeMaxY: PROJECT_SWIPE_MAX_Y,
      swipeLockY: PROJECT_SWIPE_LOCK_Y,
      swipeCommitMs: PROJECT_SWIPE_COMMIT_MS
    }
  });

  bindGlobalEventListeners(refs, {
    onCloseModal: closeModalAndStopVideos,
    onEscapeKey: handleEscapeKey,
    onCloseLightbox: closeLightbox,
    onPortfolioTitleClick: handlePortfolioTitleClick,
    onFocusVisualTouchStart: handleFocusVisualTouchStart,
    onModalTouchStart: modalSwipeController.onTouchStart,
    onModalTouchMove: modalSwipeController.onTouchMove,
    onModalTouchEnd: modalSwipeController.onTouchEnd
  });

  document.addEventListener('portfolio:modalclose', modalSwipeController.onModalClosed);
}

// ============================================
// ヒーローメディアの更新（動画を自動再生・遅めの切り替え）
// ============================================
function updateHeroMedia(heroMedia) {
  updateHeroMediaView(heroMedia, refs.heroVideoBase, {
    videoUpdateFadeDelayMs: VIDEO_UPDATE_FADE_DELAY_MS,
    videoShowFallbackMs: VIDEO_SHOW_FALLBACK_MS
  });
}

// ============================================
// State0（未選択状態）にリセット
// ============================================
function resetToInitialState() {
  resetToInitialStateView(state, refs);
}

// ============================================
// エラー表示
// ============================================
function showErrorState() {
  refs.contextPanel.classList.add('visible');
  refs.contextPanel.innerHTML = `
    <div class="context-content">
      <p class="context-text">プロジェクトデータの読み込みに失敗しました。</p>
    </div>
  `;
  refs.titleText.textContent = 'ERROR';
}

// 初期化実行
init();
