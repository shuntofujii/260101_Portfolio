import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setRefs } from '../domRefs.js';
import { state } from '../state.js';
import { openLightbox, openLightboxVideo } from '../lightbox.js';

function defineSizeProp(el, key, value) {
  Object.defineProperty(el, key, {
    configurable: true,
    get: () => value
  });
}

function setupLightboxDom() {
  document.body.innerHTML = '';
  const modalContent = document.createElement('div');
  const item1 = document.createElement('div');
  item1.className = 'mediaItem';
  const img1 = document.createElement('img');
  img1.src = 'https://example.com/1.jpg';
  item1.appendChild(img1);
  const item2 = document.createElement('div');
  item2.className = 'mediaItem';
  const img2 = document.createElement('img');
  img2.src = 'https://example.com/2.jpg';
  item2.appendChild(img2);
  const item3 = document.createElement('div');
  item3.className = 'mediaItem';
  const img3 = document.createElement('img');
  img3.src = 'https://example.com/3.jpg';
  item3.appendChild(img3);
  modalContent.appendChild(item1);
  modalContent.appendChild(item2);
  modalContent.appendChild(item3);

  const lightboxOverlay = document.createElement('div');
  lightboxOverlay.hidden = true;
  const lightboxImage = document.createElement('img');
  const lightboxVideo = document.createElement('video');
  const lightboxClose = document.createElement('button');
  lightboxOverlay.appendChild(lightboxImage);
  lightboxOverlay.appendChild(lightboxVideo);
  lightboxOverlay.appendChild(lightboxClose);
  document.body.appendChild(modalContent);
  document.body.appendChild(lightboxOverlay);

  setRefs({
    modalContent,
    lightboxOverlay,
    lightboxImage,
    lightboxVideo,
    lightboxClose
  });

  defineSizeProp(lightboxImage, 'naturalWidth', 1200);
  defineSizeProp(lightboxImage, 'naturalHeight', 800);
  Object.defineProperty(lightboxImage, 'complete', { configurable: true, get: () => true });
  lightboxImage.getBoundingClientRect = () => ({
    left: 100,
    width: 200,
    top: 40,
    right: 300,
    bottom: 240,
    height: 200
  });

  return { modalContent, item1, item2, item3, lightboxImage, lightboxVideo };
}

function setupVideoItems(modalContent) {
  modalContent.innerHTML = '';
  const vItem1 = document.createElement('div');
  vItem1.className = 'video-shell';
  const v1 = document.createElement('video');
  v1.className = 'video';
  v1.src = 'https://example.com/v1.webm';
  v1.dataset.canonicalVideoSrc = 'https://example.com/v1.webm';
  vItem1.appendChild(v1);

  const vItem2 = document.createElement('div');
  vItem2.className = 'video-shell';
  const v2 = document.createElement('video');
  v2.className = 'video';
  v2.src = 'https://example.com/v2.webm';
  v2.dataset.canonicalVideoSrc = 'https://example.com/v2.webm';
  vItem2.appendChild(v2);

  const vItem3 = document.createElement('div');
  vItem3.className = 'video-shell';
  const v3 = document.createElement('video');
  v3.className = 'video';
  v3.src = 'https://example.com/v3.webm';
  v3.dataset.canonicalVideoSrc = 'https://example.com/v3.webm';
  vItem3.appendChild(v3);

  modalContent.appendChild(vItem1);
  modalContent.appendChild(vItem2);
  modalContent.appendChild(vItem3);

  return { vItem1, vItem2, vItem3 };
}

describe('lightbox click navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
    state.lightboxTriggerElement = null;
    state.lightboxOriginRect = null;
    state.lightboxType = 'image';
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('画像: 右半分で左スワイプ、左半分で右スワイプ', () => {
    const { modalContent, item1, item2, item3, lightboxImage, lightboxVideo } = setupLightboxDom();
    openLightbox('https://example.com/2.jpg', item2, { useOriginAnimation: false });

    lightboxImage.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 260 }));
    vi.advanceTimersByTime(620);

    expect(state.lightboxTriggerElement).toBe(item3);
    expect(lightboxImage.src).toContain('https://example.com/3.jpg');

    lightboxImage.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 120 }));
    vi.advanceTimersByTime(620);

    expect(state.lightboxTriggerElement).toBe(item2);
    expect(lightboxImage.src).toContain('https://example.com/2.jpg');

    const { vItem1, vItem2 } = setupVideoItems(modalContent);
    openLightboxVideo('https://example.com/v2.webm', vItem2, { useOriginAnimation: false });
    lightboxVideo.getBoundingClientRect = () => ({
      left: 100,
      width: 200,
      top: 40,
      right: 300,
      bottom: 240,
      height: 200
    });

    lightboxVideo.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 260 }));
    vi.advanceTimersByTime(620);
    expect(state.lightboxTriggerElement).toBe(vItem2);

    lightboxVideo.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 120 }));
    vi.advanceTimersByTime(620);
    expect(state.lightboxTriggerElement).toBe(vItem2);

    // 動画ではPCクリックスワイプを無効化（境界でも遷移しない）
    openLightboxVideo('https://example.com/v1.webm', vItem1, { useOriginAnimation: false });
    lightboxVideo.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 120 }));
    vi.advanceTimersByTime(620);
    expect(state.lightboxTriggerElement).toBe(vItem1);
  });
});
