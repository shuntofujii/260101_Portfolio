import { ensureVideoPlayUrl } from './videoCache.js';

function cleanupHeroVideoRuntimeHandlers(video) {
  if (!video) return;
  if (video._showFallbackId) {
    clearTimeout(video._showFallbackId);
    video._showFallbackId = null;
  }
  const existingListeners = ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'playing', 'error'];
  existingListeners.forEach((eventType) => {
    video.removeEventListener(eventType, video._playHandler);
    video.removeEventListener(eventType, video._showHandler);
    video.removeEventListener(eventType, video._errorHandler);
  });
  video._playHandler = null;
  video._showHandler = null;
  video._errorHandler = null;
}

function ensureHeroVideoPlayWithGestureFallback(video) {
  if (video.readyState < 2) return;
  video.play().catch((e) => {
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

function setupHeroVideoVisibilityHandlers(video, videoShowFallbackMs) {
  const showVideo = () => {
    if (video.style.opacity === '1') return;
    if (video._showFallbackId) {
      clearTimeout(video._showFallbackId);
      video._showFallbackId = null;
    }
    video.style.opacity = '1';
    video.classList.remove('fade-in');
    video.removeEventListener('playing', showVideo);
  };
  video._showHandler = showVideo;
  video.addEventListener('playing', showVideo, { once: true });
  video._showFallbackId = setTimeout(showVideo, videoShowFallbackMs);
}

function setupHeroVideoPlayLifecycleHandlers(video) {
  const playHandler = () => {
    ensureHeroVideoPlayWithGestureFallback(video);
    video.removeEventListener('loadeddata', playHandler);
    video.removeEventListener('canplay', playHandler);
    video.removeEventListener('canplaythrough', playHandler);
  };
  video._playHandler = playHandler;

  const errorHandler = () => {
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
}

function applyHeroVideoSource(video, canonical, playUrl) {
  video.src = playUrl;
  video.muted = false;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('loop', 'true');
  video.removeAttribute('muted');
  video.setAttribute('playsinline', 'true');
  video.style.display = 'block';
  video.style.opacity = '0';
  video.dataset.canonicalVideoSrc = canonical;
}

function setupHeroVideoLoopHandler(video) {
  const loopHandler = function () {
    video.currentTime = 0;
    video.play().catch((e) => { console.log('Video replay error:', e); });
  };
  video.removeEventListener('ended', loopHandler);
  video.addEventListener('ended', loopHandler);
}

function updateHeroVideoElement(video, heroMedia, config) {
  const { videoUpdateFadeDelayMs, videoShowFallbackMs } = config;
  if (!video || !heroMedia?.src) return;

  video.style.opacity = '0';

  setTimeout(() => {
    cleanupHeroVideoRuntimeHandlers(video);

    const canonical = heroMedia.src;
    video.dataset.canonicalVideoSrc = canonical;

    ensureVideoPlayUrl(canonical).then((playUrl) => {
      if (video.dataset.canonicalVideoSrc !== canonical) return;

      applyHeroVideoSource(video, canonical, playUrl);
      setupHeroVideoLoopHandler(video);
      setupHeroVideoVisibilityHandlers(video, videoShowFallbackMs);
      setupHeroVideoPlayLifecycleHandlers(video);

      video.load();
      ensureHeroVideoPlayWithGestureFallback(video);
    });
  }, videoUpdateFadeDelayMs);
}

export function updateHeroMedia(heroMedia, heroVideoBase, config) {
  if (!heroMedia || !heroVideoBase) return;
  if (heroMedia.type !== 'video') return;
  if (heroVideoBase.dataset.canonicalVideoSrc === heroMedia.src) return;
  updateHeroVideoElement(heroVideoBase, heroMedia, config);
}
