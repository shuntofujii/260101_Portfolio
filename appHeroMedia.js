import { ensureVideoPlayUrl } from './videoCache.js';
import { BREAKPOINT_MOBILE_PX } from './constants.js';

function teardownHeroVideoViewportSync(video) {
  if (video?._vvCleanup) {
    video._vvCleanup();
    video._vvCleanup = null;
  }
}

function attachHeroVideoViewportSync(video) {
  teardownHeroVideoViewportSync(video);
  const vv = window.visualViewport;
  if (!vv) return;

  let debounceId = null;
  const sync = () => {
    applyHeroVideoBaseLayout(video);
  };
  const schedule = () => {
    if (debounceId !== null) clearTimeout(debounceId);
    debounceId = window.setTimeout(() => {
      debounceId = null;
      sync();
    }, 48);
  };

  vv.addEventListener('resize', schedule);
  vv.addEventListener('scroll', schedule);
  video._vvCleanup = () => {
    vv.removeEventListener('resize', schedule);
    vv.removeEventListener('scroll', schedule);
    if (debounceId !== null) {
      clearTimeout(debounceId);
      debounceId = null;
    }
  };
}

function cleanupHeroVideoRuntimeHandlers(video) {
  if (!video) return;
  teardownHeroVideoViewportSync(video);
  if (video._layoutMetaHandler) {
    video.removeEventListener('loadedmetadata', video._layoutMetaHandler);
    video._layoutMetaHandler = null;
  }
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

function revealHeroVideoFrame(video) {
  applyHeroVideoBaseLayout(video);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      video.style.visibility = 'visible';
      video.style.opacity = '1';
      video.classList.remove('fade-in');
    });
  });
}

function setupHeroVideoVisibilityHandlers(video, videoShowFallbackMs) {
  const showVideo = () => {
    if (video.style.opacity === '1') return;
    if (video._showFallbackId) {
      clearTimeout(video._showFallbackId);
      video._showFallbackId = null;
    }
    revealHeroVideoFrame(video);
    video.removeEventListener('playing', showVideo);
  };
  video._showHandler = showVideo;
  video.addEventListener('loadeddata', showVideo, { once: true });
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
    revealHeroVideoFrame(video);
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
  // Hover背景動画は無音で自動再生し、ブラウザの autoplay 制約を回避する。
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('loop', 'true');
  video.setAttribute('muted', 'true');
  video.setAttribute('playsinline', 'true');
  video.style.display = 'block';
  video.style.opacity = '0';
  video.style.visibility = 'hidden';
  video.dataset.canonicalVideoSrc = canonical;
}

function applyHeroVideoBaseLayout(video) {
  // ヒーロー背景は常に同一レイアウトに固定し、
  // データ定義（fit/width/height）による見え方の揺れを排除する。
  video.classList.remove('hero-video-custom-size');
  video.style.removeProperty('--hero-video-width');
  video.style.removeProperty('--hero-video-height');
  video.style.position = 'fixed';
  video.style.inset = '0';
  video.style.top = '0';
  video.style.left = '0';
  video.style.right = '0';
  video.style.bottom = '0';
  video.style.width = '100vw';
  // dvh: 動的ツールバー変化への追従（未対応ブラウザは svh のみ）
  if (typeof CSS !== 'undefined' && CSS.supports?.('height', '100dvh')) {
    video.style.height = '100dvh';
    video.style.minHeight = '100svh';
  } else {
    video.style.height = '100svh';
    video.style.minHeight = '';
  }
  video.style.maxWidth = 'none';
  video.style.maxHeight = 'none';
  video.style.transform = 'none';
  video.style.objectFit = 'cover';
  video.style.objectPosition = 'center center';
}

function setupHeroVideoLoopHandler(video) {
  const loopHandler = function () {
    video.currentTime = 0;
    video.play().catch((e) => { console.log('Video replay error:', e); });
  };
  video.removeEventListener('ended', loopHandler);
  video.addEventListener('ended', loopHandler);
}

function setupHeroVideoMetadataLayout(video) {
  const onMeta = () => {
    applyHeroVideoBaseLayout(video);
  };
  video._layoutMetaHandler = onMeta;
  video.addEventListener('loadedmetadata', onMeta);
}

function updateHeroVideoElement(video, heroMedia, config) {
  const { videoUpdateFadeDelayMs, videoShowFallbackMs } = config;
  if (!video || !heroMedia?.src) return;
  applyHeroVideoBaseLayout(video);

  video.style.opacity = '0';
  video.style.visibility = 'hidden';

  const fadeDelay =
    typeof window.matchMedia === 'function' &&
    window.matchMedia(`(max-width: ${BREAKPOINT_MOBILE_PX}px)`).matches
      ? 0
      : videoUpdateFadeDelayMs;

  setTimeout(() => {
    cleanupHeroVideoRuntimeHandlers(video);

    const canonical = heroMedia.src;
    video.dataset.canonicalVideoSrc = canonical;

    ensureVideoPlayUrl(canonical).then((playUrl) => {
      if (video.dataset.canonicalVideoSrc !== canonical) return;

      applyHeroVideoSource(video, canonical, playUrl);
      setupHeroVideoLoopHandler(video);
      setupHeroVideoMetadataLayout(video);
      setupHeroVideoVisibilityHandlers(video, videoShowFallbackMs);
      setupHeroVideoPlayLifecycleHandlers(video);
      attachHeroVideoViewportSync(video);

      video.load();
      ensureHeroVideoPlayWithGestureFallback(video);
    });
  }, fadeDelay);
}

export function updateHeroMedia(heroMedia, heroVideoBase, config) {
  if (!heroMedia || !heroVideoBase) return;
  if (heroMedia.type !== 'video') return;
  if (heroVideoBase.dataset.canonicalVideoSrc === heroMedia.src) return;
  updateHeroVideoElement(heroVideoBase, heroMedia, config);
}
