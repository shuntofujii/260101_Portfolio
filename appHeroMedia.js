import { ensureVideoPlayUrl } from './videoCache.js';

function cleanupHeroVideoRuntimeHandlers(video) {
  if (!video) return;
  video._heroReadyHandled = false;
  const existingListeners = ['loadeddata', 'canplay', 'canplaythrough', 'error'];
  existingListeners.forEach((eventType) => {
    video.removeEventListener(eventType, video._readyHandler);
    video.removeEventListener(eventType, video._errorHandler);
  });
  video._readyHandler = null;
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

function revealHeroVideo(video) {
  if (!video || video.style.opacity === '1') return;
  video.style.visibility = 'visible';
  video.style.opacity = '1';
  video.classList.remove('fade-in');
}

function setupHeroVideoReadyLifecycleHandlers(video) {
  const onReady = () => {
    if (video._heroReadyHandled) return;
    video._heroReadyHandled = true;
    ensureHeroVideoPlayWithGestureFallback(video);
    // SP Safari は表示直後の合成が不安定なため、レイアウト確定後に表示する。
    requestAnimationFrame(() => {
      requestAnimationFrame(() => revealHeroVideo(video));
    });
    video.removeEventListener('loadeddata', onReady);
    video.removeEventListener('canplay', onReady);
    video.removeEventListener('canplaythrough', onReady);
  };
  video._readyHandler = onReady;

  const errorHandler = () => {
    video.removeEventListener('error', errorHandler);
    revealHeroVideo(video);
  };
  video._errorHandler = errorHandler;
  video.addEventListener('error', errorHandler);

  video.addEventListener('loadeddata', onReady, { once: true });
  video.addEventListener('canplay', onReady, { once: true });
  video.addEventListener('canplaythrough', onReady, { once: true });

  if (video.readyState >= 2) {
    onReady();
  }
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
  video.style.visibility = 'hidden';
  video.style.opacity = '0';
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
  video.style.height = '100svh';
  video.style.maxWidth = 'none';
  video.style.maxHeight = 'none';
  video.style.removeProperty('transform');
  video.style.objectFit = 'cover';
  video.style.objectPosition = 'center center';
  video.style.visibility = 'hidden';
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
  const { videoUpdateFadeDelayMs } = config;
  if (!video || !heroMedia?.src) return;
  applyHeroVideoBaseLayout(video);

  video.style.opacity = '0';

  setTimeout(() => {
    cleanupHeroVideoRuntimeHandlers(video);

    const canonical = heroMedia.src;
    video.dataset.canonicalVideoSrc = canonical;

    ensureVideoPlayUrl(canonical).then((playUrl) => {
      if (video.dataset.canonicalVideoSrc !== canonical) return;

      applyHeroVideoSource(video, canonical, playUrl);
      setupHeroVideoLoopHandler(video);
      setupHeroVideoReadyLifecycleHandlers(video);

      video.load();
    });
  }, videoUpdateFadeDelayMs);
}

export function updateHeroMedia(heroMedia, heroVideoBase, config) {
  if (!heroMedia || !heroVideoBase) return;
  if (heroMedia.type !== 'video') return;
  if (heroVideoBase.dataset.canonicalVideoSrc === heroMedia.src) return;
  updateHeroVideoElement(heroVideoBase, heroMedia, config);
}
