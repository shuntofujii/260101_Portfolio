// 本ファイルは https://shuntofujii.com/ のポートフォリオテンプレートに基づきます。
// 二次利用・改変時も上記出典表記は残してください（ライセンス・出典の明示のため）。
// ============================================
// エントリポイント（main）
// ============================================
import { state } from './state.js';
import { setRefs, getRefs } from './domRefs.js';
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
import { openModal, closeModal } from './modal.js';
import { openLightbox, openLightboxVideo, closeLightbox } from './lightbox.js';
import { stopAllInlineVideos } from './media.js';
import { injectVideoLinkPreloads, scheduleIdleVideoPreload, ensureVideoPlayUrl } from './videoCache.js';
import { collectProjectVideoUrls, collectVideoUrlsForProject } from './projectVideoUrls.js';
import { pathForProjectSlug, parseProjectSlugFromPath } from './routing.js';
import { renderProjectNavigation as renderProjectNavigationView } from './appNavigation.js';
import { updateHeroMedia as updateHeroMediaView } from './appHeroMedia.js';
import { bindGlobalEventListeners } from './appEventBindings.js';
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

function findProjectByPageSlug(slug) {
  if (!slug || !state.projects?.length) return null;
  return state.projects.find((p) => p.pageSlug === slug) || null;
}

function findProjectItemElement(projectId) {
  if (!projectId) return null;
  return document.querySelector(`[data-project-id="${projectId}"]`);
}

function openProjectModalFromRoute(project) {
  if (!project) return;
  const item = findProjectItemElement(project.id);
  if (item) openModal(project, item);
}

function onPortfolioModalOpen(e) {
  const project = e.detail?.project;
  if (!project || !project.pageSlug) return;

  preloadProjectVideos(project);
  applyModalHistoryForProject(project);
  applyModalDocumentMeta(project, metaDescriptionEl);
}

function onPortfolioModalClose() {
  if (document.body.dataset.portfolioPageSlug) {
    window.location.replace('/');
    return;
  }

  restoreBaseHistoryOnModalClose(BASE_PAGE_TITLE);
  restoreBaseDocumentMeta(BASE_PAGE_TITLE, BASE_META_DESCRIPTION, metaDescriptionEl);
}

function onPopState() {
  const slug = parseProjectSlugFromPath(normalizePathname(window.location.pathname));
  const project = slug ? findProjectByPageSlug(slug) : null;

  if (state.currentState === 'modal' && !project) {
    closeModal(stopAllInlineVideos);
    return;
  }
  if (project && state.currentState !== 'modal') {
    openProjectModalFromRoute(project);
  }
}

function applyInitialRoute() {
  let slug = getPathnameProjectSlug();
  if (slug) {
    const project = findProjectByPageSlug(slug);
    openProjectModalFromRoute(project);
    return;
  }

  const legacy = findLegacyProjectFromHash(state.projects);
  if (legacy && legacy.pageSlug) {
    history.replaceState(null, '', pathForProjectSlug(legacy.pageSlug));
    openProjectModalFromRoute(legacy);
  }
}

document.addEventListener('portfolio:modalopen', onPortfolioModalOpen);
document.addEventListener('portfolio:modalclose', onPortfolioModalClose);
window.addEventListener('popstate', onPopState);

// DOM参照を取得し、refs に登録（他モジュールから getRefs() で参照）
const portfolioTitle = document.getElementById('portfolioTitle');
const contextPanel = document.getElementById('contextPanel');
const focusVisual = document.getElementById('focusVisual');
const heroVideoBase = document.getElementById('bgVideo');
const bgLayer = document.getElementById('bgLayer');
const titleBackground = document.getElementById('titleBackground');
const titleText = document.getElementById('titleText');
const guidanceText = document.getElementById('guidanceText');
const projectNavigation = document.getElementById('projectNavigation');
const modalOverlay = document.getElementById('modalOverlay');
const modalContainer = document.querySelector('.modal-container');
const modalClose = document.getElementById('modalClose');
const modalContent = document.getElementById('modalContent');
const lightboxOverlay = document.getElementById('lightboxOverlay');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxVideo = document.getElementById('lightboxVideo');
const lightboxClose = document.getElementById('lightboxClose');

setRefs({
  portfolioTitle,
  contextPanel,
  focusVisual,
  heroVideoBase,
  bgLayer,
  titleBackground,
  titleText,
  guidanceText,
  projectNavigation,
  modalOverlay,
  modalContainer,
  modalClose,
  modalContent,
  lightboxOverlay,
  lightboxImage,
  lightboxVideo,
  lightboxClose,
  openLightbox,
  openLightboxVideo
});

const refs = getRefs();

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

function shouldProcessProjectPointerInteraction() {
  return state.currentState !== 'modal';
}

function handleProjectItemMouseEnter(project, item) {
  if (shouldProcessProjectPointerInteraction()) {
    handleProjectHover(project, item);
  }
}

function handleProjectItemMouseLeave() {
  if (shouldProcessProjectPointerInteraction()) {
    handleProjectLeave();
  }
}

function handleProjectItemTouchStart(project, item) {
  if (shouldProcessProjectPointerInteraction()) {
    handleProjectHover(project, item);
  }
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

function getHeroVideoPreloadConfig() {
  const mobile = isMobileViewport();
  return {
    linkMax: mobile ? VIDEO_PRELOAD_LINK_MAX_MOBILE : VIDEO_PRELOAD_LINK_MAX_DESKTOP,
    heroPrefetchCount: mobile ? HERO_VIDEO_PREFETCH_COUNT_MOBILE : HERO_VIDEO_PREFETCH_COUNT_DESKTOP
  };
}

function warmupInitialHeroVideos(projects) {
  const { hero: heroVideoUrls } = collectProjectVideoUrls(projects);
  const conservative = isConservativeVideoPreload();
  if (conservative) return;

  const { linkMax, heroPrefetchCount } = getHeroVideoPreloadConfig();
  injectVideoLinkPreloads(heroVideoUrls, linkMax);
  heroVideoUrls.slice(0, heroPrefetchCount).forEach((url) => {
    ensureVideoPlayUrl(url).catch(() => {});
  });
}

function bootstrapUiAfterDataReady() {
  renderInitialState();
  renderProjectNavigation();
  setupEventListeners();
  applyInitialRoute();
  // ガイダンスタイプライターはトップのみ（案件ページは body に data-portfolio-page-slug あり）
  if (!document.body.dataset.portfolioPageSlug) {
    initGuidanceTypewriter(refs.guidanceText);
  }
}

/** データ節約モード・極低速回線では起動時の動画先読みを抑える（閲覧中の操作に任せる） */
function isConservativeVideoPreload() {
  try {
    const c = navigator.connection;
    if (c && c.saveData) return true;
    const t = c && c.effectiveType;
    if (t === 'slow-2g' || t === '2g') return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * 選択・閲覧中のプロジェクトの動画だけをアイドル時に順次温める（全件一括はしない）
 * @param {object} project projects.json の1要素
 */
function preloadProjectVideos(project) {
  if (!project || isConservativeVideoPreload()) return;
  const { urls, heroVideo } = collectVideoUrlsForProject(project);
  if (!urls.length) return;
  const priorityFirst = heroVideo ? [heroVideo] : [];
  scheduleIdleVideoPreload(urls, priorityFirst);
}

function scheduleCursorEffectInit() {
  if (!isMobileViewport()) {
    return initCursorEffect();
  }
  const run = () => initCursorEffect();
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => run(), { timeout: 2800 });
  } else {
    setTimeout(run, 200);
  }
  return Promise.resolve();
}

// ============================================
// 初期化
// ============================================
async function init() {
  try {
    state.projects = await fetchProjectsData();
    warmupInitialHeroVideos(state.projects);
    bootstrapUiAfterDataReady();
    await scheduleCursorEffectInit();
  } catch (error) {
    console.error('Error loading projects:', error);
    showErrorState();
  }
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
  renderProjectNavigationView(refs.projectNavigation, state.projects, {
    baseAssetsUrl,
    projectThumbnailSizePx: PROJECT_THUMBNAIL_SIZE_PX,
    thumbnailFetchPriorityCount: THUMBNAIL_FETCH_PRIORITY_COUNT,
    handlers: {
      onMouseEnter: handleProjectItemMouseEnter,
      onMouseLeave: handleProjectItemMouseLeave,
      onTouchStart: handleProjectItemTouchStart,
      onClick: handleProjectClick
    }
  });
}

// ============================================
// イベントリスナーの設定
// ============================================
function setupEventListeners() {
  bindGlobalEventListeners(refs, {
    onCloseModal: closeModalAndStopVideos,
    onEscapeKey: handleEscapeKey,
    onCloseLightbox: closeLightbox,
    onPortfolioTitleClick: handlePortfolioTitleClick,
    onFocusVisualTouchStart: handleFocusVisualTouchStart
  });
}

// ============================================
// プロジェクトhover処理（一時的フォーカス）
// ============================================
function handleProjectHover(project, itemElement) {
  clearHoverLeaveTimer();

  state.currentState = 'hover';
  state.hoveredProject = project;

  updateHeroMedia(project.heroMedia);
  preloadProjectVideos(project);

  if (refs.bgLayer) {
    if (state.bgLayerFadeCompleteHandler) {
      refs.bgLayer.removeEventListener('transitionend', state.bgLayerFadeCompleteHandler);
      state.bgLayerFadeCompleteHandler = null;
    }
    refs.bgLayer.classList.remove('isFading');
    refs.bgLayer.style.opacity = '1';
  }

  refs.guidanceText.classList.remove('visible');
  refs.contextPanel.classList.add('visible');
  updateContextPanel(project);
}

// ============================================
// プロジェクトhover解除処理
// ============================================
function handleProjectLeave() {
  clearHoverLeaveTimer();

  if (state.currentState !== 'modal' && !state.selectedProject) {
    refs.titleText.textContent = 'PORTFOLIO';

    resetHeroVideoBase();

    refs.guidanceText.classList.add('visible');
    beginBackgroundFadeOutToInitialState();

    refs.contextPanel.classList.remove('visible');

    clearProjectSelections();
  }
}

// ============================================
// プロジェクトクリック処理（モーダルを開く）
// ============================================
function handleProjectClick(project, itemElement) {
  state.currentState = 'modal';
  state.selectedProject = project;

  clearHoverLeaveTimer();
  clearProjectSelections();
  itemElement.classList.add('selected');

  openModal(project, itemElement);
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
// コンテキストパネルの更新
// ============================================
function updateContextPanel(project) {
  const tools = project.tools ? project.tools.join(' / ') : null;

  let categoryYear = '';
  if (project.id === OPENING_SOON_PROJECT_ID) {
    categoryYear = `${project.category} (Opening Soon)`;
  } else {
    categoryYear = `${project.category} (${project.year})`;
  }

  const disciplines = String(project.disciplines ?? '').trim();

  const safeCategoryYear = escapeHtml(categoryYear);
  const safeDisciplinesLine = escapeHtml(disciplines);
  const safeTools = tools ? escapeHtml(tools) : '';

  refs.contextPanel.innerHTML = `
    <div class="context-content">
      <div class="context-info">
        <div class="context-info-item">
          <span class="context-info-value">${safeCategoryYear}</span>
        </div>
        <div class="context-info-item">
          <span class="context-info-value value">${safeDisciplinesLine}</span>
        </div>
        ${safeTools ? `
        <div class="context-info-item row">
          <img src="https://assets.shuntofujii.com/icons/toolkits.svg" alt="Toolkits" class="toolkit-icon" width="14" height="14" decoding="async" loading="lazy" />
          <span class="context-info-value value">${safeTools}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;
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
