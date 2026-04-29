// タブのアイコンを Canvas で合成・更新（2枚の WebP を重ね、中心周りに不規則に揺らす）
import { baseAssetsUrl } from './constants.js';

const FAVICON_CACHE_BUSTER = 'v=20260429';
const CANVAS_PX = 48;
const MAX_SWING_RAD = (15 * Math.PI) / 180;
/** shuntofujii_2 の上下揺れ（px、キャンバス中心基準） */
const MAX_OFFSET_Y_PX = CANVAS_PX * 0.14;
/** 静止モードに入る確率（長期的に約 1 割が静止） */
const STILL_MODE_PROB = 0.1;
const MODE_DURATION_MS_MIN = 280;
const MODE_DURATION_MS_MAX = 1400;
const FAVICON_UPDATE_INTERVAL_MS = 90;

const imgUrl = (name) =>
  `${baseAssetsUrl}/top/${name}.webp?${FAVICON_CACHE_BUSTER}`;

/** 動的ファビコンが使えない・使わない場合のフォールバック（top/favicon.ico） */
const staticFaviconHref = `${baseAssetsUrl}/top/favicon.ico?${FAVICON_CACHE_BUSTER}`;

function randRange(a, b) {
  return a + Math.random() * (b - a);
}

function pickNextMode() {
  return Math.random() < STILL_MODE_PROB ? 'still' : 'shake';
}

function nextModeDeadline() {
  return performance.now() + randRange(MODE_DURATION_MS_MIN, MODE_DURATION_MS_MAX);
}

/**
 * @param {number} seed
 * @param {number} tSec
 * @param {number} jitter01 0..1 ノイズ（カタカタ感）
 */
function shakeAngleRad(seed, tSec, jitter01) {
  const s = seed * 1.7;
  const a = Math.sin(tSec * (2.1 + s * 0.08) + s);
  const b = Math.sin(tSec * (4.7 + s * 0.11) * 1.3 + s * 2.1);
  const c = Math.sin(tSec * (11.3 + s * 0.05) + seed * 4.2);
  const mix = a * 0.45 + b * 0.35 + c * 0.2;
  const n = (jitter01 - 0.5) * 0.35;
  let ang = (mix + n) * MAX_SWING_RAD;
  if (ang > MAX_SWING_RAD) ang = MAX_SWING_RAD;
  if (ang < -MAX_SWING_RAD) ang = -MAX_SWING_RAD;
  return ang;
}

/**
 * shuntofujii_2 用：上下方向のターゲットオフセット（px）
 * @param {number} seed
 * @param {number} tSec
 * @param {number} jitter01
 */
function shakeOffsetYPx(seed, tSec, jitter01) {
  const s = seed * 1.4;
  const a = Math.sin(tSec * (2.8 + s * 0.07) + s * 1.3);
  const b = Math.sin(tSec * (5.2 + s * 0.09) * 1.2 + s * 2.4);
  const c = Math.sin(tSec * (9.1 + s * 0.06) + seed * 3.7);
  const mix = a * 0.4 + b * 0.4 + c * 0.2;
  const n = (jitter01 - 0.5) * 0.4;
  let y = (mix + n) * MAX_OFFSET_Y_PX;
  if (y > MAX_OFFSET_Y_PX) y = MAX_OFFSET_Y_PX;
  if (y < -MAX_OFFSET_Y_PX) y = -MAX_OFFSET_Y_PX;
  return y;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error(`favicon image: ${src}`));
    im.src = src;
  });
}

function drawLayer(ctx, img, cx, cy, drawW, drawH, angleRad, offsetYPx = 0) {
  ctx.save();
  ctx.translate(cx, cy + offsetYPx);
  ctx.rotate(angleRad);
  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

/** Canvas の data URL 出力が可能か・視覚的動きを抑える設定でないか */
function canUseAnimatedFavicon() {
  try {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const pctx = probe.getContext('2d');
    if (!pctx) return false;
    pctx.fillStyle = '#000';
    pctx.fillRect(0, 0, 1, 1);
    probe.toDataURL('image/png');
  } catch {
    return false;
  }
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  return true;
}

export function initAnimatedFavicon() {
  if (typeof document === 'undefined') return;

  const iconLink = document.querySelector('link[rel="icon"]');
  if (!iconLink) return;

  const applyStaticFavicon = () => {
    iconLink.href = staticFaviconHref;
  };

  applyStaticFavicon();

  if (!canUseAnimatedFavicon()) {
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_PX;
  canvas.height = CANVAS_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const layer = (seed) => ({
    seed,
    mode: pickNextMode(),
    modeUntil: nextModeDeadline(),
    angle: 0,
    jitterT: 0,
    offsetY: 0,
    jitterTY: 0
  });
  const layers = [layer(0.31), layer(0.79)];

  let raf = 0;
  let lastFaviconPush = 0;
  let lastFrameNow = 0;
  let running = false;

  Promise.all([loadImage(imgUrl('shuntofujii_1')), loadImage(imgUrl('shuntofujii_2'))])
    .then(([img1, img2]) => {
      const cx = CANVAS_PX / 2;
      const cy = CANVAS_PX / 2;
      const scale =
        (CANVAS_PX * 0.86) /
        Math.max(img1.naturalWidth, img1.naturalHeight, img2.naturalWidth, img2.naturalHeight);
      const w1 = img1.naturalWidth * scale;
      const h1 = img1.naturalHeight * scale;
      const w2 = img2.naturalWidth * scale;
      const h2 = img2.naturalHeight * scale;

      const tick = (now) => {
        if (!running) return;

        const tSec = now / 1000;
        const dtSec = lastFrameNow ? Math.min(0.05, (now - lastFrameNow) / 1000) : 0.016;
        lastFrameNow = now;

        for (let i = 0; i < layers.length; i++) {
          const L = layers[i];
          if (now >= L.modeUntil) {
            L.mode = pickNextMode();
            L.modeUntil = nextModeDeadline();
          }
          if (L.mode === 'still') {
            L.angle *= 0.82;
            if (Math.abs(L.angle) < 0.002) L.angle = 0;
            if (i === 1) {
              L.offsetY *= 0.82;
              if (Math.abs(L.offsetY) < 0.05) L.offsetY = 0;
            }
          } else {
            L.jitterT += dtSec * (14 + L.seed * 5);
            const jitter01 = 0.5 + 0.5 * Math.sin(L.jitterT * 17 + L.seed * 10);
            const target = shakeAngleRad(L.seed + i * 2.2, tSec + L.seed, jitter01);
            L.angle += (target - L.angle) * randRange(0.35, 0.65);
            if (i === 1) {
              L.jitterTY += dtSec * (16 + L.seed * 4);
              const jitterY01 = 0.5 + 0.5 * Math.sin(L.jitterTY * 19 + L.seed * 7);
              const targetY = shakeOffsetYPx(L.seed + 1.1, tSec + L.seed * 0.9, jitterY01);
              L.offsetY += (targetY - L.offsetY) * randRange(0.35, 0.65);
            }
          }
        }

        ctx.clearRect(0, 0, CANVAS_PX, CANVAS_PX);
        drawLayer(ctx, img1, cx, cy, w1, h1, layers[0].angle, 0);
        drawLayer(ctx, img2, cx, cy, w2, h2, layers[1].angle, layers[1].offsetY);

        if (now - lastFaviconPush >= FAVICON_UPDATE_INTERVAL_MS) {
          lastFaviconPush = now;
          try {
            iconLink.href = canvas.toDataURL('image/png');
          } catch {
            applyStaticFavicon();
            running = false;
            return;
          }
        }

        raf = requestAnimationFrame(tick);
      };

      const start = () => {
        if (running) return;
        running = true;
        lastFrameNow = 0;
        raf = requestAnimationFrame(tick);
      };

      const stop = () => {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        lastFrameNow = 0;
        applyStaticFavicon();
      };

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') stop();
        else start();
      });

      if (document.visibilityState !== 'hidden') start();
    })
    .catch(() => {
      applyStaticFavicon();
    });
}
