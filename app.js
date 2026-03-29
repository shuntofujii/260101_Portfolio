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
  OPENING_SOON_PROJECT_ID
} from './constants.js';
import { escapeHtml } from './utils.js';
import { initCursorEffect } from './cursorEffect.js';
import { openModal, closeModal } from './modal.js';
import { openLightbox, openLightboxVideo, closeLightbox } from './lightbox.js';
import { stopAllInlineVideos } from './media.js';
import { injectVideoLinkPreloads, scheduleIdleVideoPreload, ensureVideoPlayUrl } from './videoCache.js';
import { collectProjectVideoUrls } from './projectVideoUrls.js';

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

// ============================================
// 初期化
// ============================================
async function init() {
  try {
    const response = await fetch('projects.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    state.projects = await response.json();

    const { all: allVideoUrls, hero: heroVideoUrls } = collectProjectVideoUrls(state.projects);
    injectVideoLinkPreloads(heroVideoUrls, 10);
    heroVideoUrls.slice(0, 3).forEach((u) => {
      ensureVideoPlayUrl(u).catch(() => {});
    });
    scheduleIdleVideoPreload(allVideoUrls, heroVideoUrls);

    renderInitialState();
    renderProjectNavigation();
    setupEventListeners();
    await initCursorEffect();
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

  if (refs.heroVideoBase) {
    refs.heroVideoBase.style.display = 'none';
    refs.heroVideoBase.pause();
    refs.heroVideoBase.currentTime = 0;
    refs.heroVideoBase.style.opacity = '0';
    refs.heroVideoBase.removeAttribute('data-canonical-video-src');
  }

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
  refs.projectNavigation.innerHTML = '';

  state.projects.forEach((project, index) => {
    const item = document.createElement('div');
    item.className = 'project-item';
    item.dataset.projectId = project.id;
    item.dataset.projectIndex = index;

    const thumbnail = document.createElement('img');
    thumbnail.className = 'project-thumbnail';
    thumbnail.src = project.thumbnail || `${baseAssetsUrl}/top/placeholder-image.jpg`;
    thumbnail.alt = project.title;
    thumbnail.onerror = function () {
      this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23333" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="12"%3E' + project.title.substring(0, 2) + '%3C/text%3E%3C/svg%3E';
    };

    item.appendChild(thumbnail);
    refs.projectNavigation.appendChild(item);
  });

  setupProjectItemListeners();
}

// ============================================
// プロジェクトアイテムのイベントリスナー設定
// ============================================
function setupProjectItemListeners() {
  const projectItems = document.querySelectorAll('.project-item');
  projectItems.forEach(item => {
    const projectIndex = parseInt(item.dataset.projectIndex, 10);
    const project = state.projects[projectIndex];

    if (!project) return;

    item.addEventListener('mouseenter', () => {
      if (state.currentState !== 'modal') handleProjectHover(project, item);
    });

    item.addEventListener('mouseleave', () => {
      if (state.currentState !== 'modal') handleProjectLeave();
    });

    item.addEventListener('touchstart', () => {
      if (state.currentState !== 'modal') handleProjectHover(project, item);
    }, { passive: true });

    item.addEventListener('click', () => {
      handleProjectClick(project, item);
    });
  });
}

// ============================================
// イベントリスナーの設定
// ============================================
function setupEventListeners() {
  refs.modalClose.addEventListener('click', () => closeModal(stopAllInlineVideos));
  refs.modalOverlay.addEventListener('click', (e) => {
    if (e.target === refs.modalOverlay) closeModal(stopAllInlineVideos);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (refs.lightboxOverlay && !refs.lightboxOverlay.hidden) {
        closeLightbox();
      } else if (state.currentState === 'modal') {
        closeModal(stopAllInlineVideos);
      }
    }
  });

  if (refs.lightboxClose) {
    refs.lightboxClose.addEventListener('click', closeLightbox);
  }
  if (refs.lightboxOverlay) {
    refs.lightboxOverlay.addEventListener('click', (e) => {
      if (e.target === refs.lightboxOverlay) closeLightbox();
    });
  }

  refs.portfolioTitle.addEventListener('click', () => {
    resetToInitialState();
  });

  if (refs.focusVisual) {
    refs.focusVisual.addEventListener('touchstart', (e) => {
      if (e.target.closest('.project-item')) return;
      if (state.currentState === 'modal') return;
      if (state.currentState === 'hover' && refs.heroVideoBase && !refs.heroVideoBase.paused) {
        resetToInitialState();
      }
    }, { passive: true });
  }
}

// ============================================
// プロジェクトhover処理（一時的フォーカス）
// ============================================
function handleProjectHover(project, itemElement) {
  if (state.hoverLeaveTimer) {
    clearTimeout(state.hoverLeaveTimer);
    state.hoverLeaveTimer = null;
  }

  state.currentState = 'hover';
  state.hoveredProject = project;

  updateHeroMedia(project.heroMedia);

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
  if (state.hoverLeaveTimer) {
    clearTimeout(state.hoverLeaveTimer);
    state.hoverLeaveTimer = null;
  }

  if (state.currentState !== 'modal' && !state.selectedProject) {
    refs.titleText.textContent = 'PORTFOLIO';

    if (refs.heroVideoBase) {
      if (refs.heroVideoBase._showFallbackId) {
        clearTimeout(refs.heroVideoBase._showFallbackId);
        refs.heroVideoBase._showFallbackId = null;
      }
      if (refs.heroVideoBase._resizeHandler) {
        window.removeEventListener('resize', refs.heroVideoBase._resizeHandler);
        refs.heroVideoBase._resizeHandler = null;
      }
      refs.heroVideoBase.pause();
      refs.heroVideoBase.currentTime = 0;
      refs.heroVideoBase.style.display = 'none';
      refs.heroVideoBase.style.opacity = '0';
      refs.heroVideoBase.removeAttribute('data-canonical-video-src');
    }

    refs.guidanceText.classList.add('visible');

    if (refs.bgLayer) {
      refs.bgLayer.classList.add('isFading');
      state.bgLayerFadeCompleteHandler = function fadeComplete(e) {
        if (e.target !== refs.bgLayer) return;
        refs.bgLayer.classList.remove('isFading');
        refs.bgLayer.removeEventListener('transitionend', state.bgLayerFadeCompleteHandler);
        state.bgLayerFadeCompleteHandler = null;
        renderInitialState();
      };
      refs.bgLayer.addEventListener('transitionend', state.bgLayerFadeCompleteHandler);
    } else {
      renderInitialState();
    }

    refs.contextPanel.classList.remove('visible');

    document.querySelectorAll('.project-item').forEach(item => {
      item.classList.remove('selected');
    });
  }
}

// ============================================
// プロジェクトクリック処理（モーダルを開く）
// ============================================
function handleProjectClick(project, itemElement) {
  state.currentState = 'modal';
  state.selectedProject = project;

  if (state.hoverLeaveTimer) {
    clearTimeout(state.hoverLeaveTimer);
    state.hoverLeaveTimer = null;
  }

  document.querySelectorAll('.project-item').forEach(item => {
    item.classList.remove('selected');
  });
  itemElement.classList.add('selected');

  openModal(project, itemElement);
}

// ============================================
// ヒーローメディアの更新（動画を自動再生・遅めの切り替え）
// ============================================
function updateHeroMedia(heroMedia) {
  if (!heroMedia) return;

  if (heroMedia.type === 'video') {
    if (refs.heroVideoBase && refs.heroVideoBase.dataset.canonicalVideoSrc === heroMedia.src) {
      return;
    }

    const updateVideo = (video) => {
      if (!video) return;

      video.style.opacity = '0';

      setTimeout(() => {
        if (video._showFallbackId) {
          clearTimeout(video._showFallbackId);
          video._showFallbackId = null;
        }
        if (video._resizeHandler) {
          window.removeEventListener('resize', video._resizeHandler);
          video._resizeHandler = null;
        }
        const existingListeners = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'error'];
        existingListeners.forEach(eventType => {
          video.removeEventListener(eventType, video._playHandler);
          video.removeEventListener(eventType, video._showHandler);
          video.removeEventListener(eventType, video._errorHandler);
        });
        video._playHandler = null;
        video._showHandler = null;
        video._errorHandler = null;

        const canonical = heroMedia.src;
        video.dataset.canonicalVideoSrc = canonical;

        ensureVideoPlayUrl(canonical).then((playUrl) => {
          if (video.dataset.canonicalVideoSrc !== canonical) return;

          video.src = playUrl;
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.preload = 'auto';
          video.setAttribute('loop', 'true');
          video.setAttribute('muted', 'true');
          video.setAttribute('playsinline', 'true');
          video.style.display = 'block';
          video.style.opacity = '0';
          video.style.width = '';
          video.style.height = '';

          const loopHandler = function () {
            video.currentTime = 0;
            video.play().catch(e => { console.log('Video replay error:', e); });
          };
          video.removeEventListener('ended', loopHandler);
          video.addEventListener('ended', loopHandler);

          const attemptPlay = () => {
            if (video.readyState >= 2) {
              video.play().catch(e => {
                console.log('Video autoplay prevented:', e);
                const retryPlay = () => {
                  video.play().catch(() => {});
                  document.removeEventListener('pointerdown', retryPlay);
                  document.removeEventListener('touchstart', retryPlay);
                  document.removeEventListener('click', retryPlay);
                };
                document.addEventListener('pointerdown', retryPlay, { once: true });
                document.addEventListener('touchstart', retryPlay, { once: true });
                document.addEventListener('click', retryPlay, { once: true });
              });
            }
          };

          const applyViewportSize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            video.style.width = w + 'px';
            video.style.height = h + 'px';
          };
          const showVideo = () => {
            if (video.style.opacity === '1') return;
            if (video._showFallbackId) {
              clearTimeout(video._showFallbackId);
              video._showFallbackId = null;
            }
            applyViewportSize();
            video.style.opacity = '1';
            video.classList.remove('fade-in');
            video.removeEventListener('playing', showVideo);
          };
          video._showHandler = showVideo;
          video._resizeHandler = () => {
            if (video.style.opacity === '1') applyViewportSize();
          };
          video.addEventListener('playing', showVideo, { once: true });
          window.addEventListener('resize', video._resizeHandler);
          video._showFallbackId = setTimeout(showVideo, VIDEO_SHOW_FALLBACK_MS);

          const playHandler = () => {
            attemptPlay();
            video.removeEventListener('loadeddata', playHandler);
            video.removeEventListener('canplay', playHandler);
            video.removeEventListener('canplaythrough', playHandler);
          };
          video._playHandler = playHandler;

          const errorHandler = (e) => {
            console.error('Video load error:', e, heroMedia.src);
            video.removeEventListener('error', errorHandler);
            video.style.opacity = '1';
            if (video._showFallbackId) {
              clearTimeout(video._showFallbackId);
              video._showFallbackId = null;
            }
          };
          video._errorHandler = errorHandler;
          video.addEventListener('error', errorHandler);

          video.addEventListener('loadeddata', playHandler, { once: true });
          video.addEventListener('canplay', playHandler, { once: true });
          video.addEventListener('canplaythrough', playHandler, { once: true });

          video.load();

          if (video.readyState >= 2) attemptPlay();
        });
      }, VIDEO_UPDATE_FADE_DELAY_MS);
    };

    updateVideo(refs.heroVideoBase);
  }
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

  const roleScope = [project.role, project.scope].filter(Boolean).join(' / ') || '';

  const safeCategoryYear = escapeHtml(categoryYear);
  const safeRoleScope = escapeHtml(roleScope);
  const safeTools = tools ? escapeHtml(tools) : '';

  refs.contextPanel.innerHTML = `
    <div class="context-content">
      <div class="context-info">
        <div class="context-info-item">
          <span class="context-info-value">${safeCategoryYear}</span>
        </div>
        <div class="context-info-item">
          <span class="context-info-value value">${safeRoleScope}</span>
        </div>
        ${safeTools ? `
        <div class="context-info-item row">
          <img src="https://assets.shuntofujii.com/icons/toolkits.svg" alt="Toolkits" class="toolkit-icon" />
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
  if (state.hoverLeaveTimer) {
    clearTimeout(state.hoverLeaveTimer);
    state.hoverLeaveTimer = null;
  }

  state.currentState = 'initial';
  state.hoveredProject = null;
  state.selectedProject = null;

  refs.contextPanel.classList.remove('visible');

  if (refs.heroVideoBase) {
    refs.heroVideoBase.pause();
    refs.heroVideoBase.currentTime = 0;
    refs.heroVideoBase.style.display = 'none';
    refs.heroVideoBase.style.opacity = '0';
    refs.heroVideoBase.removeAttribute('data-canonical-video-src');
  }

  refs.titleText.textContent = 'PORTFOLIO';
  refs.guidanceText.classList.add('visible');

  document.querySelectorAll('.project-item').forEach(item => {
    item.classList.remove('selected');
  });
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
