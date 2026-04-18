// 動画のフェッチ→Blob URL キャッシュ（同一URLは1回だけネットワーク取得）
const inflight = new Map();
/** @type {Map<string, string>} canonicalUrl -> playUrl (blob: またはフォールバックの元URL) */
const resolved = new Map();
const blobUrls = new Set();
let webmSupportChecked = false;
let canPlayWebm = true;

let pagehideHooked = false;
function hookPageHideForRevoke() {
  if (pagehideHooked || typeof window === 'undefined') return;
  pagehideHooked = true;
  window.addEventListener('pagehide', () => {
    blobUrls.forEach((u) => URL.revokeObjectURL(u));
    blobUrls.clear();
  });
}

function rememberBlobUrl(url) {
  if (url && url.startsWith('blob:')) {
    blobUrls.add(url);
    hookPageHideForRevoke();
  }
}

function supportsWebmPlayback() {
  if (webmSupportChecked) return canPlayWebm;
  webmSupportChecked = true;
  if (typeof document === 'undefined') {
    canPlayWebm = true;
    return canPlayWebm;
  }
  const probe = document.createElement('video');
  if (!probe || typeof probe.canPlayType !== 'function') {
    canPlayWebm = true;
    return canPlayWebm;
  }
  const vp9 = probe.canPlayType('video/webm; codecs="vp9,opus"');
  const generic = probe.canPlayType('video/webm');
  canPlayWebm = Boolean(vp9 || generic);
  return canPlayWebm;
}

export function resolvePlayableVideoUrl(canonicalUrl) {
  if (!canonicalUrl || typeof canonicalUrl !== 'string') return canonicalUrl;
  if (!canonicalUrl.endsWith('.webm')) return canonicalUrl;
  return supportsWebmPlayback() ? canonicalUrl : canonicalUrl.replace(/\.webm(\?.*)?$/i, '.mp4$1');
}

function getPlayUrlIfCached(canonicalUrl) {
  if (!canonicalUrl) return null;
  const v = resolved.get(canonicalUrl);
  return v ?? null;
}

/**
 * 動画を取得し、可能なら Blob URL を返す。CORS失敗時は元URLを返す。
 * @param {string} canonicalUrl
 * @returns {Promise<string>}
 */
export function ensureVideoPlayUrl(canonicalUrl) {
  if (!canonicalUrl || typeof canonicalUrl !== 'string') return Promise.resolve(canonicalUrl);
  if (resolved.has(canonicalUrl)) return Promise.resolve(resolved.get(canonicalUrl));
  if (inflight.has(canonicalUrl)) return inflight.get(canonicalUrl);
  const fetchTargetUrl = resolvePlayableVideoUrl(canonicalUrl);

  const p = (async () => {
    try {
      const res = await fetch(fetchTargetUrl, {
        mode: 'cors',
        credentials: 'omit',
        cache: 'force-cache',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (!blob || !blob.size) throw new Error('empty body');
      const objectUrl = URL.createObjectURL(blob);
      rememberBlobUrl(objectUrl);
      resolved.set(canonicalUrl, objectUrl);
      return objectUrl;
    } catch (e) {
      console.warn('Video preload (fetch) failed, using direct URL:', fetchTargetUrl, e);
      resolved.set(canonicalUrl, fetchTargetUrl);
      return fetchTargetUrl;
    } finally {
      inflight.delete(canonicalUrl);
    }
  })();

  inflight.set(canonicalUrl, p);
  return p;
}

/**
 * モーダル内インライン動画: ネットワーク二重取得を避けるため、キャッシュ済みまで src を付けない（ポスターのみ表示）
 * @param {HTMLVideoElement} videoEl
 * @param {string} canonicalSrc
 */
export function attachVideoElement(videoEl, canonicalSrc) {
  if (!videoEl || !canonicalSrc) return;
  videoEl.dataset.canonicalVideoSrc = canonicalSrc;

  const cached = getPlayUrlIfCached(canonicalSrc);
  if (cached) {
    videoEl.src = cached;
    videoEl.preload = cached.startsWith('blob:') ? 'auto' : 'metadata';
    return;
  }

  videoEl.removeAttribute('src');
  videoEl.preload = 'none';

  ensureVideoPlayUrl(canonicalSrc).then((playUrl) => {
    if (videoEl.dataset.canonicalVideoSrc !== canonicalSrc) return;
    videoEl.src = playUrl;
    videoEl.preload = 'auto';
    videoEl.load();
  });
}

const preloadQueue = [];
let preloadActive = 0;
const MAX_PARALLEL_PRELOAD = 3;

function pumpPreloadQueue() {
  while (preloadActive < MAX_PARALLEL_PRELOAD && preloadQueue.length > 0) {
    const url = preloadQueue.shift();
    if (!url || resolved.has(url) || inflight.has(url)) continue;
    preloadActive += 1;
    ensureVideoPlayUrl(url)
      .catch(() => {})
      .finally(() => {
        preloadActive -= 1;
        if (preloadQueue.length > 0) pumpPreloadQueue();
      });
  }
}

/**
 * アイドル時に順次プリロード（優先URLはキュー先頭に）
 * @param {string[]} urls
 * @param {string[]} [priorityFirst]
 */
export function scheduleIdleVideoPreload(urls, priorityFirst = []) {
  const seen = new Set();
  const ordered = [];
  for (const u of [...priorityFirst, ...urls]) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    ordered.push(u);
  }

  const enqueueBatch = (start) => {
    for (let i = start; i < ordered.length; i++) {
      const u = ordered[i];
      if (!resolved.has(u) && !inflight.has(u) && !preloadQueue.includes(u)) {
        preloadQueue.push(u);
      }
    }
    pumpPreloadQueue();
  };

  const run = () => enqueueBatch(0);

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => run(), { timeout: 4000 });
  } else {
    setTimeout(run, 150);
  }
}

/**
 * ブラウザネイティブの先読みヒント（HTTPキャッシュ温め）
 * @param {string[]} urls
 * @param {number} [max]
 */
export function injectVideoLinkPreloads(urls, max = 10) {
  const head = document.head;
  if (!head || !urls.length) return;
  const cap = Math.min(max, urls.length);
  for (let i = 0; i < cap; i++) {
    const href = urls[i];
    if (!href) continue;
    const dup = Array.from(head.querySelectorAll('link[data-video-preload]')).some(
      (el) => el.getAttribute('data-video-preload') === href
    );
    if (dup) continue;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = href;
    link.crossOrigin = 'anonymous';
    link.setAttribute('data-video-preload', href);
    head.appendChild(link);
  }
}
