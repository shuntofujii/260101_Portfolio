// 動画URLの正規化キャッシュ（過度な先読みを避け、再生はブラウザ標準に任せる）
/** @type {Map<string, string>} canonicalUrl -> playUrl */
const resolved = new Map();

function getPlayUrlIfCached(canonicalUrl) {
  if (!canonicalUrl) return null;
  const v = resolved.get(canonicalUrl);
  return v ?? null;
}

/**
 * 動画再生URLを返す（複雑な fetch 先読みは行わない）
 * @param {string} canonicalUrl
 * @returns {Promise<string>}
 */
export function ensureVideoPlayUrl(canonicalUrl) {
  if (!canonicalUrl || typeof canonicalUrl !== 'string') return Promise.resolve(canonicalUrl);
  const cached = resolved.get(canonicalUrl);
  if (cached) return Promise.resolve(cached);
  resolved.set(canonicalUrl, canonicalUrl);
  return Promise.resolve(canonicalUrl);
}

/**
 * モーダル内インライン動画をシンプルに接続（src 直指定 + metadata）
 * @param {HTMLVideoElement} videoEl
 * @param {string} canonicalSrc
 */
export function attachVideoElement(videoEl, canonicalSrc) {
  if (!videoEl || !canonicalSrc) return;
  videoEl.dataset.canonicalVideoSrc = canonicalSrc;
  const playUrl = getPlayUrlIfCached(canonicalSrc) || canonicalSrc;
  videoEl.src = playUrl;
  videoEl.preload = 'metadata';
  videoEl.load();
}

const preloadQueue = [];
let preloadActive = 0;
const MAX_PARALLEL_PRELOAD = 3;

function pumpPreloadQueue() {
  while (preloadActive < MAX_PARALLEL_PRELOAD && preloadQueue.length > 0) {
    const url = preloadQueue.shift();
    if (!url || resolved.has(url)) continue;
    preloadActive += 1;
    resolved.set(url, url);
    injectVideoLinkPreloads([url], 1);
    Promise.resolve().finally(() => {
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
      if (!resolved.has(u) && !preloadQueue.includes(u)) {
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
