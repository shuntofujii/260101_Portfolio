// ライトボックスの開閉
import { state } from './state.js';
import { getRefs } from './domRefs.js';
import { createFocusTrap } from './utils.js';
import { LIGHTBOX_CLOSE_DURATION_MS, LIGHTBOX_VIDEO_PLAY_DELAY_MS } from './constants.js';
import { ensureVideoPlayUrl } from './videoCache.js';
import {
  clearElementInlineBoxStyles,
  setOriginRectFromElement,
  getLightboxSequenceElements,
  currentLightboxMediaElement
} from './lightboxShared.js';

const LIGHTBOX_SWIPE_MIN_X = 48;
const LIGHTBOX_SWIPE_MAX_Y = 64;
const LIGHTBOX_SWIPE_MAX_VERTICAL_LOCK = 14;
const LIGHTBOX_SWIPE_RETURN_MS = 280;
const LIGHTBOX_SWIPE_COMMIT_MS = 340;
const LIGHTBOX_SWIPE_ENTER_MS = 380;
const LIGHTBOX_CLICK_SWIPE_COMMIT_MS = 520;
const LIGHTBOX_SWIPE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const LIGHTBOX_CLICK_SWIPE_EASING = 'cubic-bezier(0.16, 0.92, 0.22, 1)';
const LIGHTBOX_CLICK_PREVIEW_START_MULTIPLIER = 1.18;

let lightboxTouchStartX = null;
let lightboxTouchStartY = null;
let lightboxSwipeDx = 0;
let lightboxSwipeDirectionLocked = false;
let lightboxSwipeHandlersBound = false;
let lightboxSwipePreviewEl = null;
let lightboxSwipePreviewDirection = 0;
let lightboxSwipePreviewTargetEl = null;
let lightboxClickNavigateQueued = false;

/** パス上の拡張子で判定（`...webm?v=1` は endsWith('.webm') にならない） */
function urlPathLooksLikeWebm(url) {
  if (!url || typeof url !== 'string') return false;
  const pathOnly = url.split(/[?#]/)[0];
  return /\.webm$/i.test(pathOnly);
}

function clearLightboxSwipePreview() {
  if (lightboxSwipePreviewEl) {
    lightboxSwipePreviewEl.remove();
  }
  lightboxSwipePreviewEl = null;
  lightboxSwipePreviewDirection = 0;
  lightboxSwipePreviewTargetEl = null;
  lightboxClickNavigateQueued = false;
}

function createLightboxSwipePreviewElement(targetEl) {
  if (!targetEl) return null;
  if (targetEl.classList.contains('mediaItem')) {
    const src = targetEl.querySelector('img')?.src;
    if (!src) return null;
    const img = document.createElement('img');
    img.className = 'lightbox-image';
    img.src = src;
    img.alt = '';
    img.style.display = 'block';
    img.style.position = 'fixed';
    img.style.left = '50%';
    img.style.top = '50%';
    img.style.opacity = '1';
    img.style.pointerEvents = 'none';
    return img;
  }
  if (targetEl.classList.contains('video-shell')) {
    const videoEl = targetEl.querySelector('.video');
    if (!videoEl) return null;
    const previewSrc = videoEl.poster || videoEl.dataset.canonicalVideoSrc || videoEl.src;
    if (!previewSrc) return null;
    if (urlPathLooksLikeWebm(previewSrc)) {
      const v = document.createElement('video');
      v.className = 'lightbox-video';
      v.src = previewSrc;
      v.muted = true;
      v.playsInline = true;
      v.loop = true;
      v.preload = 'metadata';
      v.style.display = 'block';
      v.style.position = 'fixed';
      v.style.left = '50%';
      v.style.top = '50%';
      v.style.opacity = '1';
      v.style.pointerEvents = 'none';
      return v;
    }
    const img = document.createElement('img');
    img.className = 'lightbox-image';
    img.src = previewSrc;
    img.alt = '';
    img.style.display = 'block';
    img.style.position = 'fixed';
    img.style.left = '50%';
    img.style.top = '50%';
    img.style.opacity = '1';
    img.style.pointerEvents = 'none';
    return img;
  }
  return null;
}

function ensureLightboxSwipePreview(direction) {
  const seq = getLightboxSequenceElements();
  if (!seq.length || !state.lightboxTriggerElement) return false;
  const curIndex = seq.findIndex((el) => el === state.lightboxTriggerElement);
  if (curIndex < 0) return false;
  const nextIndex = curIndex + (direction > 0 ? 1 : -1);
  if (nextIndex < 0 || nextIndex >= seq.length) return false;
  const targetEl = seq[nextIndex];
  if (lightboxSwipePreviewEl && lightboxSwipePreviewDirection === direction && lightboxSwipePreviewTargetEl === targetEl) {
    return true;
  }
  clearLightboxSwipePreview();
  const preview = createLightboxSwipePreviewElement(targetEl);
  if (!preview) return false;
  const refs = getRefs();
  refs.lightboxOverlay.appendChild(preview);
  lightboxSwipePreviewEl = preview;
  lightboxSwipePreviewDirection = direction;
  lightboxSwipePreviewTargetEl = targetEl;
  return true;
}

function setLightboxDragTransform(dx) {
  const mediaEl = currentLightboxMediaElement();
  if (!mediaEl) return;
  mediaEl.style.transition = 'none';
  mediaEl.style.transform = `translate(-50%, -50%) translateX(${dx}px)`;
  if (lightboxSwipePreviewEl && lightboxSwipePreviewDirection) {
    lightboxSwipePreviewEl.style.transition = 'none';
    lightboxSwipePreviewEl.style.transform = `translate(-50%, -50%) translateX(${(lightboxSwipePreviewDirection * (window.innerWidth || 390)) + dx}px)`;
  }
}

function getLightboxSwipeCommitThreshold() {
  return (window.innerWidth || 390) / 3;
}

function canNavigateLightboxByDirection(direction) {
  if (!direction || !state.lightboxTriggerElement) return false;
  const seq = getLightboxSequenceElements();
  if (!seq.length) return false;
  const curIndex = seq.findIndex((el) => el === state.lightboxTriggerElement);
  if (curIndex < 0) return false;
  const nextIndex = curIndex + (direction > 0 ? 1 : -1);
  return nextIndex >= 0 && nextIndex < seq.length;
}

function animateLightboxMediaToCenter() {
  const mediaEl = currentLightboxMediaElement();
  if (!mediaEl) return;
  mediaEl.style.transition = `transform ${LIGHTBOX_SWIPE_RETURN_MS}ms ${LIGHTBOX_SWIPE_EASING}`;
  mediaEl.style.transform = 'translate(-50%, -50%) translateX(0)';
  if (lightboxSwipePreviewEl && lightboxSwipePreviewDirection) {
    lightboxSwipePreviewEl.style.transition = `transform ${LIGHTBOX_SWIPE_RETURN_MS}ms ${LIGHTBOX_SWIPE_EASING}`;
    lightboxSwipePreviewEl.style.transform = `translate(-50%, -50%) translateX(${lightboxSwipePreviewDirection * (window.innerWidth || 390)}px)`;
    window.setTimeout(() => clearLightboxSwipePreview(), LIGHTBOX_SWIPE_RETURN_MS + 30);
  }
}

function animateLightboxMediaOut(direction) {
  const mediaEl = currentLightboxMediaElement();
  if (!mediaEl) return;
  const viewportWidth = window.innerWidth || 390;
  const outX = direction > 0 ? viewportWidth * 1.15 : -viewportWidth * 1.15;
  mediaEl.style.transition = `transform ${LIGHTBOX_SWIPE_COMMIT_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
  mediaEl.style.transform = `translate(-50%, -50%) translateX(${outX}px) scale(0.94)`;
}

function openLightboxByElement(el, options = {}) {
  if (!el) return;
  if (el.classList.contains('mediaItem')) {
    const img = el.querySelector('img');
    if (img?.src) openLightbox(img.src, el, options);
    return;
  }
  if (el.classList.contains('video-shell')) {
    const video = el.querySelector('.video');
    const src = video?.dataset?.canonicalVideoSrc || video?.src;
    if (src) openLightboxVideo(src, el, options);
  }
}

function navigateLightboxByDelta(delta, releaseDx = 0, options = {}) {
  if (!delta || !state.lightboxTriggerElement) return;
  const seq = getLightboxSequenceElements();
  if (!seq.length) return;
  const curIndex = seq.findIndex((el) => el === state.lightboxTriggerElement);
  if (curIndex < 0) return;
  const nextIndex = curIndex + delta;
  if (nextIndex < 0 || nextIndex >= seq.length) return;
  const direction = delta > 0 ? 1 : -1;
  const viewportWidth = window.innerWidth || 390;
  const commitMs = Number.isFinite(options.commitMs) ? options.commitMs : LIGHTBOX_SWIPE_COMMIT_MS;
  const easing = options.easing || LIGHTBOX_SWIPE_EASING;
  const enterOffsetX = Number.isFinite(options.enterOffsetX) ? options.enterOffsetX : 0;
  const enterWithScale = options.enterWithScale !== false;
  const previewStartMultiplier = Number.isFinite(options.previewStartMultiplier)
    ? options.previewStartMultiplier
    : 1;
  const previewStartX = direction * viewportWidth * previewStartMultiplier;
  // プレビューを中央へ寄せるための共通移動量。
  // 同じ量を現在メディアにも適用し、2枚の距離を一定に保つ。
  const sharedDelta = -(previewStartX + releaseDx);
  const mediaEl = currentLightboxMediaElement();
  if (mediaEl) {
    mediaEl.style.transition = `transform ${commitMs}ms ${easing}`;
    mediaEl.style.transform = `translate(-50%, -50%) translateX(${releaseDx + sharedDelta}px)`;
  }
  if (lightboxSwipePreviewEl) {
    lightboxSwipePreviewEl.style.transition = `transform ${commitMs}ms ${easing}`;
    lightboxSwipePreviewEl.style.transform = `translate(-50%, -50%) translateX(${previewStartX + releaseDx + sharedDelta}px)`;
  }
  window.setTimeout(() => {
    openLightboxByElement(seq[nextIndex], {
      useOriginAnimation: false,
      enterOffsetX,
      enterWithScale
    });
    clearLightboxSwipePreview();
  }, commitMs + 16);
}

function handleLightboxMediaClick(e) {
  const refs = getRefs();
  if (!refs.lightboxOverlay || refs.lightboxOverlay.hidden) return;
  // PC版クリックスワイプは画像のみ有効。動画では無効化する。
  if (state.lightboxType === 'video') return;
  const mediaEl = currentLightboxMediaElement();
  if (!mediaEl) return;
  if (e.target !== mediaEl) return;
  if (!state.lightboxTriggerElement) return;

  const rect = mediaEl.getBoundingClientRect();
  if (!rect || rect.width <= 0) return;
  // 右半分クリック: 左スワイプ（次へ）/ 左半分クリック: 右スワイプ（前へ）
  const direction = e.clientX >= rect.left + (rect.width / 2) ? 1 : -1;
  if (!canNavigateLightboxByDirection(direction)) return;
  if (lightboxClickNavigateQueued) return;

  if (!ensureLightboxSwipePreview(direction)) return;
  // クリック時は「現在=中央 / 次=画面外」の開始姿勢を1フレーム作ってから遷移する
  // これにより、次メディアが中央に湧くような見え方を防ぐ。
  const viewportWidth = window.innerWidth || 390;
  mediaEl.style.transition = 'none';
  mediaEl.style.transform = 'translate(-50%, -50%) translateX(0)';
  if (lightboxSwipePreviewEl) {
    lightboxSwipePreviewEl.style.transition = 'none';
    lightboxSwipePreviewEl.style.transform = `translate(-50%, -50%) translateX(${direction * viewportWidth * LIGHTBOX_CLICK_PREVIEW_START_MULTIPLIER}px)`;
  }
  const mediaElForFlush = currentLightboxMediaElement();
  if (mediaElForFlush) void mediaElForFlush.offsetWidth;
  if (lightboxSwipePreviewEl) void lightboxSwipePreviewEl.offsetWidth;

  lightboxClickNavigateQueued = true;
  requestAnimationFrame(() => {
    lightboxClickNavigateQueued = false;
    navigateLightboxByDelta(direction, 0, {
      commitMs: LIGHTBOX_CLICK_SWIPE_COMMIT_MS,
      easing: LIGHTBOX_CLICK_SWIPE_EASING,
      enterOffsetX: 0,
      previewStartMultiplier: LIGHTBOX_CLICK_PREVIEW_START_MULTIPLIER,
      enterWithScale: false
    });
  });
}

function bindLightboxSwipeHandlersOnce() {
  if (lightboxSwipeHandlersBound) return;
  const refs = getRefs();
  if (!refs.lightboxOverlay) return;

  refs.lightboxOverlay.addEventListener('touchstart', (e) => {
    if (refs.lightboxOverlay.hidden) return;
    if (!state.lightboxTriggerElement) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    lightboxTouchStartX = t.clientX;
    lightboxTouchStartY = t.clientY;
    lightboxSwipeDx = 0;
    lightboxSwipeDirectionLocked = false;
    clearLightboxSwipePreview();
  }, { passive: true });

  refs.lightboxOverlay.addEventListener('touchmove', (e) => {
    if (refs.lightboxOverlay.hidden) return;
    if (lightboxTouchStartX == null || lightboxTouchStartY == null) return;
    const t = e.changedTouches?.[0];
    if (!t) return;
    const dx = t.clientX - lightboxTouchStartX;
    const dy = t.clientY - lightboxTouchStartY;

    if (!lightboxSwipeDirectionLocked) {
      if (Math.abs(dy) > LIGHTBOX_SWIPE_MAX_VERTICAL_LOCK && Math.abs(dy) > Math.abs(dx)) {
        return;
      }
      if (Math.abs(dx) > 8) {
        lightboxSwipeDirectionLocked = true;
      }
    }
    if (!lightboxSwipeDirectionLocked) return;
    e.preventDefault();
    lightboxSwipeDx = dx;
    const direction = dx < 0 ? 1 : -1;
    ensureLightboxSwipePreview(direction);
    setLightboxDragTransform(dx);
  }, { passive: false });

  refs.lightboxOverlay.addEventListener('touchend', (e) => {
    if (refs.lightboxOverlay.hidden) return;
    if (lightboxTouchStartX == null || lightboxTouchStartY == null) return;
    const t = e.changedTouches?.[0];
    if (!t) return;

    const dx = lightboxSwipeDirectionLocked ? lightboxSwipeDx : (t.clientX - lightboxTouchStartX);
    const dy = t.clientY - lightboxTouchStartY;
    lightboxTouchStartX = null;
    lightboxTouchStartY = null;
    lightboxSwipeDx = 0;
    lightboxSwipeDirectionLocked = false;

    if (Math.abs(dy) > LIGHTBOX_SWIPE_MAX_Y) return;
    const direction = dx < 0 ? 1 : -1;
    if (Math.abs(dx) < getLightboxSwipeCommitThreshold() || !canNavigateLightboxByDirection(direction)) {
      animateLightboxMediaToCenter();
      return;
    }
    navigateLightboxByDelta(direction, dx);
  }, { passive: true });

  refs.lightboxOverlay.addEventListener('click', handleLightboxMediaClick);

  lightboxSwipeHandlersBound = true;
}

function setupLightboxFocusTrap() {
  const refs = getRefs();
  requestAnimationFrame(() => {
    if (refs.lightboxClose) refs.lightboxClose.focus();
    if (state.lightboxFocusTrapHandler) document.removeEventListener('keydown', state.lightboxFocusTrapHandler);
    state.lightboxFocusTrapHandler = createFocusTrap(refs.lightboxOverlay);
    document.addEventListener('keydown', state.lightboxFocusTrapHandler);
  });
}

function finishLightboxClose(mediaType) {
  const refs = getRefs();
  refs.lightboxOverlay.setAttribute('hidden', '');
  refs.lightboxOverlay.classList.remove('closing');
  if (mediaType === 'video' && refs.lightboxVideo) {
    refs.lightboxVideo.src = '';
    refs.lightboxVideo.removeAttribute('data-lightbox-canonical-src');
    refs.lightboxVideo.style.display = 'none';
    clearElementInlineBoxStyles(refs.lightboxVideo);
  }
  if (mediaType === 'image' && refs.lightboxImage) {
    refs.lightboxImage.src = '';
    clearElementInlineBoxStyles(refs.lightboxImage);
  }
  state.lightboxOriginRect = null;
}

export function closeLightbox() {
  const refs = getRefs();
  if (!refs.lightboxOverlay) return;

  if (state.lightboxFocusTrapHandler) {
    document.removeEventListener('keydown', state.lightboxFocusTrapHandler);
    state.lightboxFocusTrapHandler = null;
  }
  if (state.lightboxTriggerElement && document.body.contains(state.lightboxTriggerElement)) {
    state.lightboxTriggerElement.setAttribute('tabindex', '-1');
    state.lightboxTriggerElement.focus();
  }
  state.lightboxTriggerElement = null;
  clearLightboxSwipePreview();

  refs.lightboxOverlay.classList.add('closing');

  if (state.lightboxType === 'video' && refs.lightboxVideo) {
    refs.lightboxVideo.pause();
    if (state.lightboxOriginRect) {
      const { x: originX, y: originY, width: originWidth, height: originHeight } = state.lightboxOriginRect;
      refs.lightboxVideo.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      refs.lightboxVideo.style.left = `${originX}px`;
      refs.lightboxVideo.style.top = `${originY}px`;
      refs.lightboxVideo.style.width = `${originWidth}px`;
      refs.lightboxVideo.style.height = `${originHeight}px`;
      refs.lightboxVideo.style.opacity = '0';
      refs.lightboxVideo.style.objectFit = 'cover';
    } else {
      refs.lightboxVideo.style.opacity = '0';
      refs.lightboxVideo.style.transform = 'translate(-50%, -50%) scale(0.9)';
    }
    setTimeout(() => finishLightboxClose('video'), LIGHTBOX_CLOSE_DURATION_MS);
    return;
  }

  if (!refs.lightboxImage) return;

  if (state.lightboxOriginRect) {
    const { x: originX, y: originY, width: originWidth, height: originHeight } = state.lightboxOriginRect;
    refs.lightboxImage.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    refs.lightboxImage.style.left = `${originX}px`;
    refs.lightboxImage.style.top = `${originY}px`;
    refs.lightboxImage.style.width = `${originWidth}px`;
    refs.lightboxImage.style.height = `${originHeight}px`;
    refs.lightboxImage.style.opacity = '0';
  } else {
    refs.lightboxImage.style.opacity = '0';
    refs.lightboxImage.style.transform = 'translate(-50%, -50%) scale(0.9)';
  }
  setTimeout(() => finishLightboxClose('image'), LIGHTBOX_CLOSE_DURATION_MS);
}

export function openLightboxVideo(videoSrc, originElement, options = {}) {
  const refs = getRefs();
  if (!refs.lightboxOverlay || !refs.lightboxVideo) return;
  const { useOriginAnimation = true, enterOffsetX = 0, enterWithScale = true } = options;

  state.lightboxType = 'video';
  state.lightboxTriggerElement = originElement || null;
  if (useOriginAnimation) setOriginRectFromElement(originElement);
  else state.lightboxOriginRect = null;

  if (refs.lightboxImage) refs.lightboxImage.style.display = 'none';
  refs.lightboxVideo.style.display = 'block';
  refs.lightboxVideo.removeAttribute('src');
  refs.lightboxVideo.dataset.lightboxCanonicalSrc = videoSrc;
  refs.lightboxVideo.muted = false;
  refs.lightboxVideo.playsInline = true;
  refs.lightboxVideo.setAttribute('playsinline', 'true');
  refs.lightboxVideo.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
  refs.lightboxVideo.setAttribute('disablepictureinpicture', 'true');
  refs.lightboxOverlay.removeAttribute('hidden');
  refs.lightboxOverlay.classList.remove('closing');
  bindLightboxSwipeHandlersOnce();
  setupLightboxFocusTrap();

  let layoutApplied = false;

  const runVideoLayout = () => {
    if (layoutApplied) return;
    const vw = refs.lightboxVideo.videoWidth;
    const vh = refs.lightboxVideo.videoHeight;
    if (!vw || !vh) return;
    layoutApplied = true;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (state.lightboxOriginRect) {
      const { x: originX, y: originY, width: originWidth, height: originHeight } = state.lightboxOriginRect;
      const finalX = viewportWidth / 2;
      const finalY = viewportHeight / 2;
      const videoAspectRatio = vw / vh;
      let finalWidth = viewportWidth * 0.9;
      let finalHeight = finalWidth / videoAspectRatio;
      if (finalHeight > viewportHeight * 0.9) {
        finalHeight = viewportHeight * 0.9;
        finalWidth = finalHeight * videoAspectRatio;
      }
      refs.lightboxVideo.style.position = 'fixed';
      refs.lightboxVideo.style.left = `${originX}px`;
      refs.lightboxVideo.style.top = `${originY}px`;
      refs.lightboxVideo.style.width = `${originWidth}px`;
      refs.lightboxVideo.style.height = `${originHeight}px`;
      refs.lightboxVideo.style.transform = 'translate(-50%, -50%)';
      refs.lightboxVideo.style.transformOrigin = 'center center';
      refs.lightboxVideo.style.opacity = '1';
      refs.lightboxVideo.style.transition = 'none';
      refs.lightboxVideo.style.objectFit = 'cover';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          refs.lightboxVideo.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
          refs.lightboxVideo.style.left = `${finalX}px`;
          refs.lightboxVideo.style.top = `${finalY}px`;
          refs.lightboxVideo.style.width = `${finalWidth}px`;
          refs.lightboxVideo.style.height = `${finalHeight}px`;
          refs.lightboxVideo.style.objectFit = 'contain';
          setTimeout(() => {
            refs.lightboxVideo.play().catch(e => console.warn('Video autoplay prevented:', e));
          }, LIGHTBOX_VIDEO_PLAY_DELAY_MS);
        });
      });
    } else {
      refs.lightboxVideo.style.position = 'fixed';
      refs.lightboxVideo.style.left = '50%';
      refs.lightboxVideo.style.top = '50%';
      refs.lightboxVideo.style.width = '';
      refs.lightboxVideo.style.height = '';
      refs.lightboxVideo.style.opacity = '1';
      if (enterOffsetX) {
        refs.lightboxVideo.style.transform = enterWithScale
          ? `translate(-50%, -50%) translateX(${enterOffsetX}px) scale(1.06)`
          : `translate(-50%, -50%) translateX(${enterOffsetX}px)`;
        refs.lightboxVideo.style.transition = 'none';
        requestAnimationFrame(() => {
          refs.lightboxVideo.style.transition = `transform ${LIGHTBOX_SWIPE_ENTER_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
          refs.lightboxVideo.style.transform = enterWithScale
            ? 'translate(-50%, -50%) translateX(0) scale(1)'
            : 'translate(-50%, -50%) translateX(0)';
        });
      } else {
        /* スワイプ確定遷移では追加の再補間をさせない（バウンド抑止） */
        refs.lightboxVideo.style.transition = 'none';
        refs.lightboxVideo.style.transform = 'translate(-50%, -50%)';
      }
    }
  };

  const applySrc = (playUrl) => {
    if (state.lightboxType !== 'video') return;
    if (refs.lightboxVideo.dataset.lightboxCanonicalSrc !== videoSrc) return;

    const tryLayout = () => {
      runVideoLayout();
    };

    // src 代入より前に付ける（即時デコード・キャッシュ時の競合を避ける）
    refs.lightboxVideo.addEventListener('loadedmetadata', tryLayout, { once: true });
    refs.lightboxVideo.addEventListener('loadeddata', tryLayout, { once: true });

    refs.lightboxVideo.src = playUrl;

    if (refs.lightboxVideo.readyState >= 1) {
      tryLayout();
    }
  };

  ensureVideoPlayUrl(videoSrc).then(applySrc);
}

export function openLightbox(imageSrc, originElement, options = {}) {
  const refs = getRefs();
  if (!refs.lightboxOverlay || !refs.lightboxImage) return;
  const { useOriginAnimation = true, enterOffsetX = 0, enterWithScale = true } = options;

  state.lightboxType = 'image';
  state.lightboxTriggerElement = originElement || null;
  if (useOriginAnimation) setOriginRectFromElement(originElement);
  else state.lightboxOriginRect = null;

  if (refs.lightboxVideo) {
    refs.lightboxVideo.style.display = 'none';
    refs.lightboxVideo.pause();
    refs.lightboxVideo.src = '';
    refs.lightboxVideo.removeAttribute('data-lightbox-canonical-src');
  }
  if (refs.lightboxImage) refs.lightboxImage.style.display = 'block';
  refs.lightboxImage.src = imageSrc;
  const originImg = originElement?.querySelector?.('img');
  refs.lightboxImage.alt = (originImg && originImg.alt) ? originImg.alt : '画像の拡大表示';
  refs.lightboxOverlay.removeAttribute('hidden');
  refs.lightboxOverlay.classList.remove('closing');
  bindLightboxSwipeHandlersOnce();
  setupLightboxFocusTrap();

  const handleImageLoad = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (state.lightboxOriginRect) {
      const { x: originX, y: originY, width: originWidth, height: originHeight } = state.lightboxOriginRect;
      const finalX = viewportWidth / 2;
      const finalY = viewportHeight / 2;
      const imageAspectRatio = refs.lightboxImage.naturalWidth / refs.lightboxImage.naturalHeight;
      let finalWidth = viewportWidth * 0.9;
      let finalHeight = finalWidth / imageAspectRatio;
      if (finalHeight > viewportHeight * 0.9) {
        finalHeight = viewportHeight * 0.9;
        finalWidth = finalHeight * imageAspectRatio;
      }
      refs.lightboxImage.style.position = 'fixed';
      refs.lightboxImage.style.left = `${originX}px`;
      refs.lightboxImage.style.top = `${originY}px`;
      refs.lightboxImage.style.width = `${originWidth}px`;
      refs.lightboxImage.style.height = `${originHeight}px`;
      refs.lightboxImage.style.transform = 'translate(-50%, -50%)';
      refs.lightboxImage.style.transformOrigin = 'center center';
      refs.lightboxImage.style.opacity = '1';
      refs.lightboxImage.style.transition = 'none';
      refs.lightboxImage.style.objectFit = 'cover';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          refs.lightboxImage.style.transition = 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
          refs.lightboxImage.style.left = `${finalX}px`;
          refs.lightboxImage.style.top = `${finalY}px`;
          refs.lightboxImage.style.width = `${finalWidth}px`;
          refs.lightboxImage.style.height = `${finalHeight}px`;
          refs.lightboxImage.style.objectFit = 'contain';
        });
      });
    } else {
      refs.lightboxImage.style.position = 'fixed';
      refs.lightboxImage.style.left = '50%';
      refs.lightboxImage.style.top = '50%';
      refs.lightboxImage.style.width = '';
      refs.lightboxImage.style.height = '';
      refs.lightboxImage.style.opacity = '1';
      if (enterOffsetX) {
        refs.lightboxImage.style.transform = enterWithScale
          ? `translate(-50%, -50%) translateX(${enterOffsetX}px) scale(1.06)`
          : `translate(-50%, -50%) translateX(${enterOffsetX}px)`;
        refs.lightboxImage.style.transition = 'none';
        requestAnimationFrame(() => {
          refs.lightboxImage.style.transition = `transform ${LIGHTBOX_SWIPE_ENTER_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
          refs.lightboxImage.style.transform = enterWithScale
            ? 'translate(-50%, -50%) translateX(0) scale(1)'
            : 'translate(-50%, -50%) translateX(0)';
        });
      } else {
        /* スワイプ確定遷移では追加の再補間をさせない（バウンド抑止） */
        refs.lightboxImage.style.transition = 'none';
        refs.lightboxImage.style.transform = 'translate(-50%, -50%)';
      }
    }
  };
  refs.lightboxImage.onload = handleImageLoad;
  if (refs.lightboxImage.complete && refs.lightboxImage.naturalWidth > 0) handleImageLoad();
}
