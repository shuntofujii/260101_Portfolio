/**
 * プロフィール入場：Matter.js 落下・サムネイル衝突・静止後に差し替え → プロフィールモーダルへ
 */
import { Matter } from './matterResolve.js';
import { state } from './state.js';
import { getRefs } from './domRefs.js';
import {
  baseAssetsUrl,
  PROFILE_INTRO_ASSETS_V,
  PROFILE_INTRO_FACE_COLLIDER_HEIGHT_RATIO,
  PROFILE_INTRO_FACE_COLLIDER_WIDTH_RATIO,
  PROFILE_INTRO_FACE_POLYGON_SIDES,
  PROFILE_INTRO_GRAVITY_SCALE,
  PROFILE_INTRO_GRAVITY_Y,
  PROFILE_INTRO_KINETIC_EPS,
  PROFILE_INTRO_LAUNCH_FROM_UP_MAX_DEG,
  PROFILE_INTRO_LAUNCH_FROM_UP_MIN_DEG,
  PROFILE_INTRO_MAX_MS,
  PROFILE_INTRO_SETTLE_MS,
  PROFILE_INTRO_START_SIZE_PX,
  PROFILE_INTRO_START_SIZE_SCALE_MAX,
  PROFILE_INTRO_START_SIZE_SCALE_MIN,
  PROFILE_INTRO_SWAP_HOLD_MS,
  PROFILE_INTRO_TARGET_WIDTH_FRAC
} from './constants.js';

const HERO_IMG = `${baseAssetsUrl}/top/shuntofujii.webp${PROFILE_INTRO_ASSETS_V}`;
const STACK_IMG_1 = `${baseAssetsUrl}/top/shuntofujii_1.webp${PROFILE_INTRO_ASSETS_V}`;
const STACK_IMG_2 = `${baseAssetsUrl}/top/shuntofujii_2.webp${PROFILE_INTRO_ASSETS_V}`;

let activeCleanup = null;
let swapTimer = null;

// 顔輪郭（SVG path）。viewBox=0 0 609 720 に対応。
// これを getPointAtLength でサンプリングして頂点列にし、Matter.js の fromVertices へ渡します。
const PROFILE_INTRO_FACE_SVG_PATH_D =
  'M312.47.49c55.39,3.77,105.73,31.89,152.45,60.06,5.94,4.59,14.31,8.93,19.61,14.07,4.28,4.52,8.62,8.05,13.85,11.41,3.89,4.72,16.66,20.8,20.83,25.76,10.9,16.3,22.4,35.79,28.13,54.54,13.96,42.16,13.81,90.92,12.67,134.97-.37,4.12-1.7,36.85-2.76,40.43-.5,4.41-.83,33,2.57,36.47,26.87,27.4-9.67,159.31-41.83,162.69-7.65.8-18.18,41.49-22.48,48.89-8.37,15.28-25.78,45.96-34.6,61.05-12.29,17.09-30.49,28.71-47.9,39.83-6.4,4.77-26.75,10.49-34.27,13.66-4.6,2.28-18.34,5.02-23.47,6.2-9.05,2.37-27.9,6.52-37.13,8.39-19.44-3.09-39.97,3.06-59.43-.42,0,0-35.18-7.91-35.18-7.91-16.43-4.88-38.78-16.26-53.23-25.39-14.19-7.5-30.12-17.92-40.19-30.46-14.51-13.87-24.78-34.56-30.07-53.8-4.69-13.64-11.04-34-15-47.81-16.9,6.69-85.31-114.99-38.16-170.68.74-.88,4.35-3.3,5.28-3.75s.35-3.26.53-4.42c0,0,2.58-16.31,2.58-16.31,1.77-5.11-1.06-43.41-1.21-49.53-.97-11.91-.69-30.97-.55-42.98-2.11-46.72,14.35-94.76,36.41-135.49C134.53,56.71,225.07-2.66,312.47.49Z';

const PROFILE_INTRO_FACE_SVG_SAMPLES = 80;
const PROFILE_INTRO_FACE_SVG_DUP_EPS = 0.35;

let cachedFaceSVGVertices = null;
let cachedFaceSVGBounds = null; // { minX, minY, w, h }

function getFaceSVGVertices() {
  if (cachedFaceSVGVertices && cachedFaceSVGBounds) {
    return { vertices: cachedFaceSVGVertices, bounds: cachedFaceSVGBounds };
  }
  // jsdom や環境差で getPointAtLength が使えない場合はフォールバック
  if (typeof document === 'undefined' || !document.createElementNS) {
    return null;
  }
  try {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 609 720');
    svg.setAttribute('width', '609');
    svg.setAttribute('height', '720');
    svg.style.position = 'absolute';
    svg.style.left = '-9999px';
    svg.style.top = '-9999px';

    const path = document.createElementNS(NS, 'path');
    // ユーザー貼り付け時に "M312.47.49" のように区切りが欠けるケースがあるため、
    // 最初の数値だけ期待値（y=49）になるように保険をかけます。
    const d = PROFILE_INTRO_FACE_SVG_PATH_D.replace(/^M312\.47\.49/, 'M312.47,49');
    path.setAttribute('d', d);
    svg.appendChild(path);
    document.body.appendChild(svg);

    const total = typeof path.getTotalLength === 'function' ? path.getTotalLength() : 0;
    if (!total) {
      svg.remove();
      return null;
    }

    const vertices = [];
    let prev = null;
    for (let i = 0; i < PROFILE_INTRO_FACE_SVG_SAMPLES; i += 1) {
      const t = i / PROFILE_INTRO_FACE_SVG_SAMPLES;
      const pt = path.getPointAtLength(total * t);
      if (!pt) continue;
      const x = pt.x;
      const y = pt.y;
      // 近すぎる点は捨てる（fromVertices の安定のため）
      if (
        prev &&
        Math.hypot(x - prev.x, y - prev.y) < PROFILE_INTRO_FACE_SVG_DUP_EPS
      ) {
        continue;
      }
      vertices.push({ x, y });
      prev = { x, y };
    }

    svg.remove();

    const xs = vertices.map((p) => p.x);
    const ys = vertices.map((p) => p.y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);
    const w = maxX - minX;
    const h = maxY - minY;
    if (!(w > 10 && h > 10)) return null;

    cachedFaceSVGVertices = vertices;
    cachedFaceSVGBounds = { minX, minY, w, h };
    return { vertices, bounds: cachedFaceSVGBounds };
  } catch {
    return null;
  }
}

function createProfileFaceBodyFromSVG(x, y, width, height, options) {
  const svgData = getFaceSVGVertices();
  if (!svgData) {
    // SVG サンプリング不能なら従来の楕円近似
    return createEllipseBody(x, y, width, height, options);
  }

  const { vertices, bounds } = svgData;
  const body = Matter.Bodies.fromVertices(
    x,
    y,
    [vertices],
    options,
    false,
    0.02,
    10,
    0.02
  );

  // SVG の輪郭が viewBox いっぱいでない可能性があるので、実測 bounds からスケール
  const sx = width / bounds.w;
  const sy = height / bounds.h;
  Matter.Body.scale(body, sx, sy, { x, y });
  return body;
}

function uniqueProjectItems(navEl) {
  const viewportW = window.innerWidth || 0;
  const viewportH = window.innerHeight || 0;
  const viewportCx = viewportW / 2;
  const grouped = new Map();
  [...navEl.querySelectorAll('.project-item')].forEach((el) => {
    const idx = el.dataset.projectIndex ?? '';
    if (!grouped.has(idx)) grouped.set(idx, []);
    grouped.get(idx).push(el);
  });

  const selected = [];
  grouped.forEach((items) => {
    let best = null;
    let bestScore = -Infinity;
    items.forEach((el) => {
      const r = el.getBoundingClientRect();
      const visW = Math.max(0, Math.min(r.right, viewportW) - Math.max(r.left, 0));
      const visH = Math.max(0, Math.min(r.bottom, viewportH) - Math.max(r.top, 0));
      const visArea = visW * visH;
      const cx = r.left + r.width / 2;
      const distPenalty = Math.abs(cx - viewportCx);
      const score = visArea * 10 - distPenalty;
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    });
    if (best) selected.push(best);
  });
  return selected;
}

function clearThumbTransforms(navEl) {
  if (!navEl) return;
  navEl.querySelectorAll('.project-item').forEach((el) => {
    el.style.transform = '';
    el.style.transformOrigin = '';
  });
}

function resetThumbnailOpacity(navEl) {
  if (!navEl) return;
  navEl.classList.remove('profile-intro-contacted');
  navEl.querySelectorAll('.project-item').forEach((el) => {
    el.style.opacity = '';
  });
}

function forceAllThumbnailOpacity(navEl) {
  if (!navEl) return;
  navEl.classList.add('profile-intro-contacted');
  navEl.querySelectorAll('.project-item').forEach((el) => {
    el.style.opacity = '1';
  });
}

function wrapRad(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function createEllipseBody(x, y, width, height, options = {}) {
  const rx = Math.max(8, width / 2);
  const ry = Math.max(8, height / 2);
  const sides = Math.max(16, PROFILE_INTRO_FACE_POLYGON_SIDES);
  // 円を多角形化してから楕円へスケール: 角が立たず、衝突応答が自然になる
  const base = Matter.Bodies.polygon(x, y, sides, 1, options);
  Matter.Body.scale(base, rx, ry, { x, y });
  return base;
}

function computeLeftLaunchBoost(viewportW) {
  // 画面が広いほど左向き初速を強くする（PC優先）
  const t = Math.max(0, Math.min(1, (viewportW - 768) / 1200));
  const base = 1.9 + 4.2 * t; // SP: 1.9, PC: 6.1
  const random = 0.8 + Math.random() * 2.1; // 0.80x ~ 2.90x
  return base * random;
}

/** テクスチャを確実に読み込んでから物理開始（decode 待ち・CDN 失敗時は _1 にフォールバック） */
function swapProfileOpenBtnToHeroSingle(refs) {
  const btn = refs.profileOpenBtn;
  if (!btn) return;
  const stack = btn.querySelector('.profile-open-stack');
  if (!stack) return;
  stack.replaceChildren();
  const img = document.createElement('img');
  img.className = 'profile-open-img';
  img.src = HERO_IMG;
  img.alt = '';
  img.width = 609;
  img.height = 720;
  img.decoding = 'async';
  img.loading = 'eager';
  img.referrerPolicy = 'no-referrer';
  stack.appendChild(img);
}

/** 放出と同時にヘッダーから顔を消し、空スロットだけ残す */
function vacateProfileOpenBtnSlot(refs) {
  const btn = refs.profileOpenBtn;
  if (!btn) return;
  const stack = btn.querySelector('.profile-open-stack');
  if (!stack) return;
  btn.classList.add('profile-open-btn--vacant');
  btn.setAttribute('aria-hidden', 'true');
  btn.setAttribute('tabindex', '-1');
  stack.replaceChildren();
}

function restoreProfileOpenBtnStack(refs) {
  const btn = refs.profileOpenBtn;
  if (!btn) return;
  btn.classList.remove('profile-open-btn--vacant');
  btn.removeAttribute('aria-hidden');
  btn.removeAttribute('tabindex');
  const stack = btn.querySelector('.profile-open-stack');
  if (!stack) return;
  stack.replaceChildren();
  const imgBack = document.createElement('img');
  imgBack.className = 'profile-open-img profile-open-img--back';
  imgBack.src = STACK_IMG_1;
  imgBack.alt = '';
  imgBack.width = 609;
  imgBack.height = 720;
  imgBack.decoding = 'async';
  imgBack.loading = 'eager';
  const imgFront = document.createElement('img');
  imgFront.className = 'profile-open-img profile-open-img--front';
  imgFront.src = STACK_IMG_2;
  imgFront.alt = '';
  imgFront.width = 609;
  imgFront.height = 720;
  imgFront.decoding = 'async';
  imgFront.loading = 'eager';
  stack.appendChild(imgBack);
  stack.appendChild(imgFront);
}

async function loadHeroTextureInto(imgEl) {
  imgEl.alt = '';
  imgEl.loading = 'eager';
  imgEl.referrerPolicy = 'no-referrer';
  imgEl.decoding = 'async';

  const attempt = (src) =>
    new Promise((resolve, reject) => {
      const onLoad = () => {
        cleanup();
        resolve();
      };
      const onErr = () => {
        cleanup();
        reject(new Error('img-load'));
      };
      const cleanup = () => {
        imgEl.removeEventListener('load', onLoad);
        imgEl.removeEventListener('error', onErr);
      };
      imgEl.addEventListener('load', onLoad);
      imgEl.addEventListener('error', onErr);
      imgEl.src = src;
    });

  try {
    await attempt(HERO_IMG);
  } catch {
    await attempt(STACK_IMG_1);
  }

  if (typeof imgEl.decode === 'function') {
    try {
      await imgEl.decode();
    } catch {
      /* load 済みなら続行 */
    }
  }
}

/**
 * @param {{ openProfileModal: (trigger: HTMLElement | null) => void }} options
 */
export function runProfileIntroAnimation(options) {
  const { openProfileModal } = options;
  const refs = getRefs();

  if (typeof activeCleanup === 'function') {
    try {
      activeCleanup();
    } catch (_) {
      /* noop */
    }
    activeCleanup = null;
  }

  let engine = null;
  let rafId = null;
  let lastFrame = performance.now();
  let settleEnergySince = 0;
  let aborted = false;
  let overlayNode = null;
  let didFirstThumbCollision = false;
  let firstThumbCollisionAtMs = null;

  const removeOverlayNode = () => {
    if (overlayNode?.parentNode) {
      overlayNode.remove();
    }
    overlayNode = null;
  };

  const finishToModal = () => {
    if (aborted) return;
    aborted = true;
    if (typeof activeCleanup === 'function') {
      try {
        activeCleanup();
      } catch (_) {
        /* noop */
      }
    }
    activeCleanup = null;
    swapTimer = null;
    state.profileIntroActive = false;
    document.body.classList.remove('profile-intro-running');
    removeOverlayNode();
    clearThumbTransforms(refs.projectNavigation);
    resetThumbnailOpacity(refs.projectNavigation);
    openProfileModal(refs.profileOpenBtn ?? null);
  };

  const enterSwapPhase = (overlay, heroImg, thumbRecords, heroSnapshot, heroVisual, onDone) => {
    // physics 停止してから演出へ移行
    if (engine) {
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
      engine = null;
    }

    heroImg.style.opacity = '0';

    const { x: heroX, y: heroY, angle: heroAngle } = heroSnapshot;
    const { w: heroVisualW, h: heroVisualH } = heroVisual;

    // 折り返し（重ね表示）: 着地時の位置・角度をそのまま反映
    const stack = document.createElement('div');
    stack.className = 'profile-intro-stack';
    stack.style.width = `${heroVisualW}px`;
    stack.style.height = `${heroVisualH}px`;
    stack.style.left = `${heroX - heroVisualW / 2}px`;
    stack.style.top = `${heroY - heroVisualH / 2}px`;
    stack.style.transformOrigin = '50% 50%';
    stack.style.transform = `rotate(${heroAngle}rad)`;

    const imgBack = document.createElement('img');
    imgBack.src = STACK_IMG_1;
    imgBack.className = 'profile-intro-stack-img profile-intro-stack-img--back';
    imgBack.alt = '';

    const imgFront = document.createElement('img');
    imgFront.src = STACK_IMG_2;
    imgFront.className = 'profile-intro-stack-img profile-intro-stack-img--front';
    imgFront.alt = '';

    // まずは着地状態（0px）で揃え、その後 +20px（画面縦方向）へ
    imgFront.style.transform = 'translate(0px, 0px)';
    imgFront.style.willChange = 'transform';

    stack.appendChild(imgBack);
    stack.appendChild(imgFront);
    overlay.appendChild(stack);

    const moveDownPx = heroVisualH / 12;
    // 顔の傾きに追従した「まっすぐ置いた時の下方向」へ動かす（stack のローカルY+）
    const dxLocal = 0;
    const dyLocal = moveDownPx;

    // 目標点: 中心点〜（まっすぐ置いた時の）下限の間で「下から2/5」
    // = 中心から下へ 3/10 * 高さ（ローカル座標）を、現在の角度で画面座標へ回転
    const cursorLocalDownOffset = heroVisualH * 0.3;
    const cursorTargetX = heroX - Math.sin(heroAngle) * cursorLocalDownOffset;
    const cursorTargetY = heroY + Math.cos(heroAngle) * cursorLocalDownOffset;

    const cursorInst = state.cursorEffectInstance;
    const moveDurationMs = 1100;
    const waitDurationMs = 1500;
    const fadeDurationMs = 500;

    const cursorPromise =
      cursorInst && typeof cursorInst.animateTrailToScreenPointAndFadeToZero === 'function'
        ? cursorInst.animateTrailToScreenPointAndFadeToZero(cursorTargetX, cursorTargetY, {
          moveDurationMs,
          waitDurationMs,
          fadeDurationMs
        })
        : Promise.resolve();

    // _2 の移動中（下げ開始〜上げ終了）は、中心まわりに少し円運動させる
    // 「カクカク感」を出すため、時間をステップ化して更新する
    const phaseTotalMs = moveDurationMs + waitDurationMs + fadeDurationMs;
    const randomStepMinMs = 50;
    const randomStepMaxMs = 150;
    const wobbleRadiusX = Math.max(1.5, heroVisualW * 0.015);
    const wobbleRadiusY = Math.max(1.0, heroVisualH * 0.01);
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const wobbleStartMs = performance.now();
    let quantizedElapsedMs = 0;
    let nextStepAtMs = 0;
    let wobblePhase = 0;
    // 左右揺れの「止める」演出（横方向のみホールド）
    let wobbleXHoldUntilMs = 0;
    let wobbleXHoldValue = 0;

    const animateFront = (now) => {
      if (!imgFront.isConnected) return;
      const elapsed = Math.max(0, now - wobbleStartMs);
      while (elapsed >= nextStepAtMs && quantizedElapsedMs < phaseTotalMs) {
        const stepMs = randomStepMinMs + Math.random() * (randomStepMaxMs - randomStepMinMs);
        const progress = Math.max(0, Math.min(1, quantizedElapsedMs / phaseTotalMs));
        // 進行倍率を大きく揺らして「緩急」を強める
        const tempoWave =
          1 +
          0.95 * Math.sin(progress * Math.PI * 2 * 1.8 + 0.4) +
          0.45 * Math.sin(progress * Math.PI * 2 * 4.6 + 1.2);
        const tempo = Math.max(0.45, Math.min(1.95, tempoWave));
        quantizedElapsedMs = Math.min(phaseTotalMs, quantizedElapsedMs + stepMs * tempo);
        wobblePhase += (Math.PI * 2 * stepMs * (0.0018 + 0.0024 * tempo));

        // たまに左右揺れを止める（ホールド時間もランダム）
        if (quantizedElapsedMs >= wobbleXHoldUntilMs && Math.random() < 0.42) {
          const holdMs = 110 + Math.random() * 280;
          wobbleXHoldUntilMs = Math.min(phaseTotalMs, quantizedElapsedMs + holdMs);
          wobbleXHoldValue = 0;
        }
        nextStepAtMs += stepMs;
      }
      const stepped = quantizedElapsedMs;

      let baseY = 0;
      if (stepped < moveDurationMs) {
        const p = stepped / moveDurationMs;
        baseY = dyLocal * easeOut(p);
      } else if (stepped < moveDurationMs + waitDurationMs) {
        baseY = dyLocal;
      } else {
        const p = (stepped - moveDurationMs - waitDurationMs) / fadeDurationMs;
        baseY = dyLocal * (1 - easeOut(p));
      }

      const tAll = stepped / phaseTotalMs;
      const decay = Math.pow(1 - tAll, 0.45);
      const angle = wobblePhase;
      const wobbleXRaw = Math.cos(angle) * wobbleRadiusX * decay;
      const wobbleX = stepped < wobbleXHoldUntilMs ? wobbleXHoldValue : wobbleXRaw;
      const wobbleY = Math.sin(angle * 1.12 + 0.7) * wobbleRadiusY * decay;

      imgFront.style.transform = `translate(${dxLocal + wobbleX}px, ${baseY + wobbleY}px)`;

      if (stepped < phaseTotalMs) {
        requestAnimationFrame(animateFront);
      } else {
        imgFront.style.transform = 'translate(0px, 0px)';
      }
    };
    requestAnimationFrame(animateFront);

    // 軌跡が完全に消えてから白フラッシュ → モーダルへ
    cursorPromise
      .catch(() => {})
      .then(() => {
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.inset = '0';
        flash.style.background = '#fff';
        flash.style.opacity = '0';
        flash.style.pointerEvents = 'none';
        flash.style.zIndex = '2501';
        flash.style.transition = 'opacity 260ms ease-out';
        document.body.appendChild(flash);

        requestAnimationFrame(() => {
          flash.style.opacity = '1';
        });

        window.setTimeout(() => {
          // いったんプロフィールボタンを復元してからモーダルへ
          restoreProfileOpenBtnStack(refs);
          onDone();
        }, 180);

        // 少し待って白フラッシュを消す（モーダル表示の通常状態へ）
        window.setTimeout(() => {
          flash.style.opacity = '0';
          window.setTimeout(() => flash.remove(), 320);
        }, 560);

        // カーソル追従を復帰
        window.setTimeout(() => {
          try {
            cursorInst?.setCursorTrailOpacityMultiplier?.(1);
            cursorInst?.setCursorFollow?.(true);
          } catch (_) {
            /* noop */
          }
        }, 900);
      });
  };

  const setup = async () => {
    state.profileIntroActive = true;
    document.body.classList.add('profile-intro-running');
    lastFrame = performance.now();
    settleEnergySince = 0;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const targetHeroMajor = Math.min(W, H) * PROFILE_INTRO_TARGET_WIDTH_FRAC;

    const preloadEl = document.createElement('img');
    await loadHeroTextureInto(preloadEl);
    swapProfileOpenBtnToHeroSingle(refs);
    await new Promise((r) => requestAnimationFrame(() => r()));

    const btnRect = refs.profileOpenBtn?.getBoundingClientRect?.() ?? {
      left: W - 80,
      top: 24,
      width: 48,
      height: 48
    };
    const startCx = btnRect.left + btnRect.width / 2;
    const startCy = btnRect.top + btnRect.height / 2;

    const launchSpeed = 11 + Math.random() * 16;
    const leftLaunchBoost = computeLeftLaunchBoost(W);

    const overlay = document.createElement('div');
    overlayNode = overlay;
    overlay.className = 'profile-intro-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    const heroWrap = document.createElement('div');
    heroWrap.className = 'profile-intro-hero-wrap';

    const heroImg = document.createElement('img');
    heroImg.className = 'profile-intro-hero-img';
    // 読み込み〜最初の sync までの間に intrinsic サイズで一瞬描画されないようにする
    heroImg.style.opacity = '0';
    heroImg.style.width = `${btnRect.width}px`;
    heroImg.style.height = `${btnRect.height}px`;
    heroWrap.appendChild(heroImg);
    overlay.appendChild(heroWrap);
    document.body.appendChild(overlay);

    await loadHeroTextureInto(heroImg);

    const nw = Math.max(1, heroImg.naturalWidth || 1);
    const nh = Math.max(1, heroImg.naturalHeight || 1);
    const aspectWOverH = nw / nh;

    const startScale =
      PROFILE_INTRO_START_SIZE_SCALE_MIN +
      Math.random() * (PROFILE_INTRO_START_SIZE_SCALE_MAX - PROFILE_INTRO_START_SIZE_SCALE_MIN);
    const baseStartPx = PROFILE_INTRO_START_SIZE_PX * startScale;
    let startH = Math.min(baseStartPx, btnRect.height || baseStartPx);
    let startW = startH * aspectWOverH;
    const maxBtnW = Math.max(16, btnRect.width || startW);
    const maxBtnH = Math.max(16, btnRect.height || startH);
    if (startW > maxBtnW) {
      startW = maxBtnW;
      startH = startW / aspectWOverH;
    }
    if (startH > maxBtnH) {
      startH = maxBtnH;
      startW = startH * aspectWOverH;
    }

    engine = Matter.Engine.create({ enableSleeping: true });
    engine.gravity.y = PROFILE_INTRO_GRAVITY_Y;
    engine.gravity.scale = PROFILE_INTRO_GRAVITY_SCALE;

    const colliderW = startW * PROFILE_INTRO_FACE_COLLIDER_WIDTH_RATIO;
    const colliderH = startH * PROFILE_INTRO_FACE_COLLIDER_HEIGHT_RATIO;
    const heroBody = createProfileFaceBodyFromSVG(
      startCx,
      startCy,
      colliderW,
      colliderH,
      {
        friction: 0.97,
        frictionStatic: 2.05,
        frictionAir: 0.028,
        restitution: 0.34,
        density: 0.0062,
        slop: 0.01
      }
    );

    const sweepSpanDeg =
      PROFILE_INTRO_LAUNCH_FROM_UP_MAX_DEG - PROFILE_INTRO_LAUNCH_FROM_UP_MIN_DEG;
    const fromUpDeg =
      PROFILE_INTRO_LAUNCH_FROM_UP_MIN_DEG + Math.random() * sweepSpanDeg;
    const fromUpRad = (fromUpDeg * Math.PI) / 180;
    // 真上(0)〜真左(90°): 左上象限、vy<=0, vx<=0
    let vx = -Math.sin(fromUpRad) * launchSpeed;
    let vy = -Math.cos(fromUpRad) * launchSpeed;
    vx -= leftLaunchBoost;
    Matter.Body.setVelocity(heroBody, { x: vx, y: vy });
    // 放出ごとにランダム回転（左右どちらにも回る）
    const launchSpin = (Math.random() - 0.5) * 0.44;
    Matter.Body.setAngularVelocity(heroBody, launchSpin);
    let heroVisualW = startW;
    let heroVisualH = startH;

    const thumbRecords = [];
    const thumbConstraints = [];
    if (refs.projectNavigation) {
      const items = uniqueProjectItems(refs.projectNavigation);
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        const rw = Math.max(24, r.width);
        const rh = Math.max(24, r.height);
        const cx = r.left + rw / 2;
        const cy = r.top + rh / 2;
        const body = Matter.Bodies.rectangle(cx, cy, rw, rh, {
          friction: 1,
          frictionStatic: 3.1,
          frictionAir: 0.24,
          restitution: 0.04,
          density: 0.0022,
          chamfer: { radius: 6 }
        });
        const tether = Matter.Constraint.create({
          pointA: { x: cx, y: cy },
          bodyB: body,
          pointB: { x: 0, y: 0 },
          length: 0,
          stiffness: 0.018,
          damping: 0.38
        });
        thumbRecords.push({
          el,
          body,
          ix: cx,
          iy: cy
        });
        thumbConstraints.push(tether);
      });
    }

    const ground = Matter.Bodies.rectangle(W / 2, H + 60, W + 200, 120, {
      isStatic: true,
      friction: 1,
      restitution: 0.03
    });

    const wallL = Matter.Bodies.rectangle(-40, H / 2, 80, H + 200, { isStatic: true });
    const wallR = Matter.Bodies.rectangle(W + 40, H / 2, 80, H + 200, { isStatic: true });

    Matter.World.add(engine.world, [
      heroBody,
      ground,
      wallL,
      wallR,
      ...thumbRecords.map((t) => t.body),
      ...thumbConstraints
    ]);

    const thumbBodies = new Set(thumbRecords.map((t) => t.body));
    Matter.Events.on(engine, 'collisionStart', (evt) => {
      if (didFirstThumbCollision) return;
      const hit = evt.pairs?.some((p) => {
        const a = p.bodyA;
        const b = p.bodyB;
        return (a === heroBody && thumbBodies.has(b)) || (b === heroBody && thumbBodies.has(a));
      });
      if (!hit) return;
      didFirstThumbCollision = true;
      firstThumbCollisionAtMs = performance.now();
      forceAllThumbnailOpacity(refs.projectNavigation);
    });

    const t0 = performance.now();

    const syncHeroDom = () => {
      const b = heroBody;
      const verts = b.vertices;
      const xs = verts.map((v) => v.x);
      const ys = verts.map((v) => v.y);
      heroImg.style.width = `${heroVisualW}px`;
      heroImg.style.height = `${heroVisualH}px`;
      heroImg.style.opacity = '1';
      heroImg.style.transform = `translate(${b.position.x - heroVisualW / 2}px, ${b.position.y - heroVisualH / 2}px) rotate(${b.angle}rad)`;
    };

    const syncThumbs = () => {
      thumbRecords.forEach(({ el, body, ix, iy }) => {
        const dx2 = body.position.x - ix;
        const dy2 = body.position.y - iy;
        const dAng = wrapRad(body.angle);
        el.style.transformOrigin = 'center center';
        el.style.transform = `translate(${dx2}px, ${dy2}px) rotate(${dAng}rad)`;
      });
    };

    const scaleHeroTowardTarget = () => {
      const verts = heroBody.vertices;
      const xs = verts.map((v) => v.x);
      const ys = verts.map((v) => v.y);
      const bw = Math.max(...xs) - Math.min(...xs);
      const bh = Math.max(...ys) - Math.min(...ys);
      const visualMajor = Math.max(heroVisualW, heroVisualH);
      if (visualMajor >= targetHeroMajor * 0.985) return;
      const factor = Math.min(1.045, targetHeroMajor / Math.max(visualMajor, 8));
      Matter.Body.scale(heroBody, factor, factor, heroBody.position);
      heroVisualW *= factor;
      heroVisualH *= factor;
    };

    const kineticEstimate = () => {
      let k = 0;
      k += Matter.Body.getSpeed(heroBody) ** 2 * heroBody.mass;
      thumbRecords.forEach(({ body }) => {
        k += Matter.Body.getSpeed(body) ** 2 * body.mass;
      });
      return k;
    };

    const loop = (now) => {
      if (aborted) return;
      const dt = Math.min(48, now - lastFrame);
      lastFrame = now;

      const step = Math.min(dt, 1000 / 60);
      Matter.Engine.update(engine, step);
      scaleHeroTowardTarget();
      syncHeroDom();
      syncThumbs();

      const ke = kineticEstimate();
      if (ke < PROFILE_INTRO_KINETIC_EPS) {
        settleEnergySince += dt;
      } else {
        settleEnergySince = 0;
      }

      const elapsed = now - t0;
      const settledByTouch =
        firstThumbCollisionAtMs !== null && now - firstThumbCollisionAtMs >= 3000;
      const settledByFallback =
        firstThumbCollisionAtMs === null &&
        (settleEnergySince >= PROFILE_INTRO_SETTLE_MS || elapsed > PROFILE_INTRO_MAX_MS);
      const settled = settledByTouch || settledByFallback;

      if (settled) {
        cancelAnimationFrame(rafId);
        rafId = null;
        const heroSnapshot = {
          x: heroBody.position.x,
          y: heroBody.position.y,
          angle: heroBody.angle
        };
        const heroVisual = { w: heroVisualW, h: heroVisualH };
        enterSwapPhase(overlay, heroImg, thumbRecords, heroSnapshot, heroVisual, () => finishToModal());
        return;
      }

      rafId = requestAnimationFrame(loop);
    };

    vacateProfileOpenBtnSlot(refs);
    syncHeroDom();
    syncThumbs();
    rafId = requestAnimationFrame(loop);

    activeCleanup = () => {
      aborted = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (swapTimer !== null) {
        window.clearTimeout(swapTimer);
        swapTimer = null;
      }
      if (engine) {
        Matter.World.clear(engine.world, false);
        Matter.Engine.clear(engine);
        engine = null;
      }
      removeOverlayNode();
      state.profileIntroActive = false;
      document.body.classList.remove('profile-intro-running');
      clearThumbTransforms(refs.projectNavigation);
      resetThumbnailOpacity(refs.projectNavigation);
    };
  };

  setup().catch(() => {
    finishToModal();
  });
}

/** 入場アニメのみ中止（オーバーレイ・物理・サムネ transform を復帰） */
export function abortProfileIntroOnly() {
  const refs = getRefs();
  if (typeof activeCleanup === 'function') {
    try {
      activeCleanup();
    } catch (_) {
      /* noop */
    }
    activeCleanup = null;
  }
  if (swapTimer !== null) {
    window.clearTimeout(swapTimer);
    swapTimer = null;
  }
  state.profileIntroActive = false;
  document.body.classList.remove('profile-intro-running');
  clearThumbTransforms(refs.projectNavigation);
  resetThumbnailOpacity(refs.projectNavigation);
  restoreProfileOpenBtnStack(refs);
}

/** Esc 等で即モーダルへスキップ */
export function abortProfileIntroAndOpenModal(openProfileModal) {
  abortProfileIntroOnly();
  openProfileModal(getRefs().profileOpenBtn ?? null);
}
