// ライトボックスの開閉
import { state } from './state.js';
import { getRefs } from './domRefs.js';
import { createFocusTrap } from './utils.js';
import { LIGHTBOX_CLOSE_DURATION_MS, LIGHTBOX_VIDEO_PLAY_DELAY_MS } from './constants.js';

function finishLightboxClose(mediaType) {
  const refs = getRefs();
  refs.lightboxOverlay.setAttribute('hidden', '');
  refs.lightboxOverlay.classList.remove('closing');
  if (mediaType === 'video' && refs.lightboxVideo) {
    refs.lightboxVideo.src = '';
    refs.lightboxVideo.style.display = 'none';
    refs.lightboxVideo.style.position = '';
    refs.lightboxVideo.style.left = '';
    refs.lightboxVideo.style.top = '';
    refs.lightboxVideo.style.width = '';
    refs.lightboxVideo.style.height = '';
    refs.lightboxVideo.style.transform = '';
    refs.lightboxVideo.style.transformOrigin = '';
    refs.lightboxVideo.style.transition = '';
    refs.lightboxVideo.style.objectFit = '';
  }
  if (mediaType === 'image' && refs.lightboxImage) {
    refs.lightboxImage.src = '';
    refs.lightboxImage.style.position = '';
    refs.lightboxImage.style.left = '';
    refs.lightboxImage.style.top = '';
    refs.lightboxImage.style.width = '';
    refs.lightboxImage.style.height = '';
    refs.lightboxImage.style.transform = '';
    refs.lightboxImage.style.transformOrigin = '';
    refs.lightboxImage.style.transition = '';
    refs.lightboxImage.style.objectFit = '';
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

export function openLightboxVideo(videoSrc, originElement) {
  const refs = getRefs();
  if (!refs.lightboxOverlay || !refs.lightboxVideo) return;

  state.lightboxType = 'video';
  state.lightboxTriggerElement = originElement || null;

  if (originElement) {
    const rect = originElement.getBoundingClientRect();
    state.lightboxOriginRect = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  } else {
    state.lightboxOriginRect = null;
  }

  if (refs.lightboxImage) refs.lightboxImage.style.display = 'none';
  refs.lightboxVideo.style.display = 'block';
  refs.lightboxVideo.src = videoSrc;
  refs.lightboxVideo.muted = true;
  refs.lightboxVideo.playsInline = true;
  refs.lightboxVideo.setAttribute('playsinline', 'true');
  refs.lightboxVideo.setAttribute('controlslist', 'nodownload noplaybackrate noremoteplayback');
  refs.lightboxVideo.setAttribute('disablepictureinpicture', 'true');
  refs.lightboxOverlay.removeAttribute('hidden');
  refs.lightboxOverlay.classList.remove('closing');

  requestAnimationFrame(() => {
    if (refs.lightboxClose) refs.lightboxClose.focus();
    if (state.lightboxFocusTrapHandler) document.removeEventListener('keydown', state.lightboxFocusTrapHandler);
    state.lightboxFocusTrapHandler = createFocusTrap(refs.lightboxOverlay);
    document.addEventListener('keydown', state.lightboxFocusTrapHandler);
  });

  const handleVideoLoad = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (state.lightboxOriginRect) {
      const { x: originX, y: originY, width: originWidth, height: originHeight } = state.lightboxOriginRect;
      const finalX = viewportWidth / 2;
      const finalY = viewportHeight / 2;
      const videoAspectRatio = refs.lightboxVideo.videoWidth / refs.lightboxVideo.videoHeight;
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
      refs.lightboxVideo.style.position = '';
      refs.lightboxVideo.style.left = '';
      refs.lightboxVideo.style.top = '';
      refs.lightboxVideo.style.width = '';
      refs.lightboxVideo.style.height = '';
      refs.lightboxVideo.style.opacity = '1';
      refs.lightboxVideo.style.transform = 'translate(-50%, -50%) scale(1)';
      refs.lightboxVideo.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    }
  };
  refs.lightboxVideo.addEventListener('loadedmetadata', handleVideoLoad, { once: true });
  if (refs.lightboxVideo.readyState >= 1) handleVideoLoad();
}

export function openLightbox(imageSrc, originElement) {
  const refs = getRefs();
  if (!refs.lightboxOverlay || !refs.lightboxImage) return;

  state.lightboxType = 'image';
  state.lightboxTriggerElement = originElement || null;

  if (originElement) {
    const rect = originElement.getBoundingClientRect();
    state.lightboxOriginRect = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height
    };
  } else {
    state.lightboxOriginRect = null;
  }

  if (refs.lightboxVideo) {
    refs.lightboxVideo.style.display = 'none';
    refs.lightboxVideo.pause();
    refs.lightboxVideo.src = '';
  }
  if (refs.lightboxImage) refs.lightboxImage.style.display = 'block';
  refs.lightboxImage.src = imageSrc;
  const originImg = originElement?.querySelector?.('img');
  refs.lightboxImage.alt = (originImg && originImg.alt) ? originImg.alt : '画像の拡大表示';
  refs.lightboxOverlay.removeAttribute('hidden');
  refs.lightboxOverlay.classList.remove('closing');

  requestAnimationFrame(() => {
    if (refs.lightboxClose) refs.lightboxClose.focus();
    if (state.lightboxFocusTrapHandler) document.removeEventListener('keydown', state.lightboxFocusTrapHandler);
    state.lightboxFocusTrapHandler = createFocusTrap(refs.lightboxOverlay);
    document.addEventListener('keydown', state.lightboxFocusTrapHandler);
  });

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
      refs.lightboxImage.style.position = '';
      refs.lightboxImage.style.left = '';
      refs.lightboxImage.style.top = '';
      refs.lightboxImage.style.width = '';
      refs.lightboxImage.style.height = '';
      refs.lightboxImage.style.opacity = '1';
      refs.lightboxImage.style.transform = 'translate(-50%, -50%) scale(1)';
      refs.lightboxImage.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    }
  };
  refs.lightboxImage.onload = handleImageLoad;
  if (refs.lightboxImage.complete && refs.lightboxImage.naturalWidth > 0) handleImageLoad();
}
