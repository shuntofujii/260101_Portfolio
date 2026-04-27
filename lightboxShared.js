import { state } from './state.js';
import { getRefs } from './domRefs.js';

export function clearElementInlineBoxStyles(el) {
  if (!el) return;
  el.style.position = '';
  el.style.left = '';
  el.style.top = '';
  el.style.width = '';
  el.style.height = '';
  el.style.transform = '';
  el.style.transformOrigin = '';
  el.style.transition = '';
  el.style.objectFit = '';
}

export function setOriginRectFromElement(originElement) {
  if (!originElement) {
    state.lightboxOriginRect = null;
    return;
  }
  const rect = originElement.getBoundingClientRect();
  state.lightboxOriginRect = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    width: rect.width,
    height: rect.height
  };
}

export function getLightboxSequenceElements() {
  const refs = getRefs();
  if (!refs.modalContent) return [];
  return Array.from(refs.modalContent.querySelectorAll('.mediaItem, .video-shell'));
}

export function currentLightboxMediaElement() {
  const refs = getRefs();
  if (state.lightboxType === 'video' && refs.lightboxVideo && refs.lightboxVideo.style.display !== 'none') {
    return refs.lightboxVideo;
  }
  if (refs.lightboxImage && refs.lightboxImage.style.display !== 'none') {
    return refs.lightboxImage;
  }
  return null;
}
