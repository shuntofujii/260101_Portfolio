// カーソルエフェクト（色相・Three.js 軌跡）
// 休止軌道の数式・モード判定・サムネ Node キャッシュは cursorTrailSleep / cursorTrailMode / cursorTrailThumbnails。
// 色相の CSS 変数更新は accentColorTheme.js と共有
import { state } from './state.js';
import { getRefs } from './domRefs.js';
import { CURSOR_CONFIG, CURSOR_Z_INDEX } from './constants.js';
import { hexToRgb, getColorFromHue, startColorTransition } from './accentColorTheme.js';
import { createSleepTrailRuntime, stepSleepTrailFrame } from './cursorTrailSleep.js';
import { shouldUseSleepTrajectory } from './cursorTrailMode.js';
import { createThumbNodeCache } from './cursorTrailThumbnails.js';

function createCustomCursorEffect(THREE, initialColor) {
  const el = document.body;
  const config = { ...CURSOR_CONFIG };

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.pointerEvents = 'none';
  // 「比較(明)」合成（対応ブラウザでは背景との明部優先で合成）
  renderer.domElement.style.mixBlendMode = 'lighten';
  renderer.domElement.style.zIndex = String(CURSOR_Z_INDEX);
  el.appendChild(renderer.domElement);

  const rgb = hexToRgb(initialColor);
  if (!rgb) {
    console.error('[Cursor Effect] Failed to parse color:', initialColor);
    return null;
  }
  const colorVec = new THREE.Vector3(rgb.r / 255, rgb.g / 255, rgb.b / 255);

  const uPointsUniform = [];
  for (let i = 0; i < config.shaderPoints; i++) uPointsUniform.push(new THREE.Vector2());
  const uRatio = new THREE.Vector2();
  const uSize = new THREE.Vector2();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uRatio: { value: uRatio },
      uSize: { value: uSize },
      uPoints: { value: uPointsUniform },
      uColor: { value: colorVec },
      uOpacity: { value: 1 }
    },
    defines: { SHADER_POINTS: config.shaderPoints },
    vertexShader: `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
    `,
    fragmentShader: `
      float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C) {
        vec2 a = B - A;
        vec2 b = A - 2.0*B + C;
        vec2 c = a * 2.0;
        vec2 d = A - pos;
        float kk = 1.0 / dot(b,b);
        float kx = kk * dot(a,b);
        float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
        float kz = kk * dot(d,a);
        float res = 0.0;
        float p = ky - kx*kx;
        float p3 = p*p*p;
        float q = kx*(2.0*kx*kx - 3.0*ky) + kz;
        float h = q*q + 4.0*p3;
        if(h >= 0.0){
          h = sqrt(h);
          vec2 x = (vec2(h, -h) - q) / 2.0;
          vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
          float t = uv.x + uv.y - kx;
          t = clamp( t, 0.0, 1.0 );
          vec2 qos = d + (c + b*t)*t;
          res = length(qos);
        } else {
          float z = sqrt(-p);
          float v = acos( q/(p*z*2.0) ) / 3.0;
          float m = cos(v);
          float n = sin(v)*1.732050808;
          vec3 t = vec3(m + m, -n - m, n - m) * z - kx;
          t = clamp( t, 0.0, 1.0 );
          vec2 qos = d + (c + b*t.x)*t.x;
          float dis = dot(qos,qos);
          res = dis;
          qos = d + (c + b*t.y)*t.y;
          dis = dot(qos,qos);
          res = min(res,dis);
          qos = d + (c + b*t.z)*t.z;
          dis = dot(qos,qos);
          res = min(res,dis);
          res = sqrt( res );
        }
        return res;
      }
      uniform vec2 uRatio;
      uniform vec2 uSize;
      uniform vec2 uPoints[SHADER_POINTS];
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float intensity = 1.0;
        vec2 pos = (vUv - 0.5) * uRatio;
        vec2 c = (uPoints[0] + uPoints[1]) / 2.0;
        vec2 c_prev;
        float dist = 10000.0;
        for(int i = 0; i < SHADER_POINTS - 1; i++){
          c_prev = c;
          c = (uPoints[i] + uPoints[i + 1]) / 2.0;
          dist = min(dist, sdBezier(pos, c_prev, uPoints[i], c));
        }
        dist = max(0.0, dist);
        float glow = pow(uSize.y / dist, intensity);
        vec3 col = vec3(0.0);
        col += 10.0 * vec3(smoothstep(uSize.x, 0.0, dist));
        col += glow * uColor;
        col = 1.0 - exp(-col);
        col = pow(col, vec3(0.4545));
        gl_FragColor = vec4(col, uOpacity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const mouse = new THREE.Vector2();
  const target = new THREE.Vector2();
  const clock = new THREE.Clock();
  let prevAnimClockTime = null;
  /** 初回表示フェード用（マウント直後のみ 0→1） */
  let initialRevealStartTimeSec = null;
  /** 崩れの視覚強度（UI の state より遅れて追従・戻りはゆっくり） */
  let brokenVisualBlend = 0;
  const curvePoints = new Array(config.curvePoints).fill(0).map(() => new THREE.Vector2());
  mouse.set(0, 0);
  target.set(0, 0);

  let isMouseActive = false;
  let isTouchDevice = false;
  const sleepTrail = createSleepTrailRuntime();
  const SLEEP_RADIUS_FONT_MULTIPLIER = 12;
  let currentSleepRadiusX = 150;
  let currentSleepRadiusY = 150;

  /** サムネイルと軌跡が重なるとき 0 に近づける（シェーダ uOpacity） */
  let trailOverlapOpacity = 1;
  // フェーズ演出用: 軌跡が追従する/しない、暗くする/消すを外部から制御
  let isCursorFollowEnabled = true;
  let externalOpacityMultiplier = 1;
  // { active, startTimeSec, moveDurationSec, waitDurationSec, fadeDurationSec, fromX, fromY, toX, toY, jitterX, jitterY, jitterStepX, jitterStepY, jitterRadiusX, jitterRadiusY, wobbleAmp, wobbleHz, wobbleSeed, resolve }
  let trailScript = null;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  /** 直前フレームでポインタがサムネ上だったか（退出時に履歴をリセットする） */
  let wasPointerOverThumb = false;
  /** 軌跡先端がサムネに入ったときに一度だけ hover 相当を起動するための直近インデックス */
  let trailHitHoverLastIndex = null;
  /** 直前フレームが休止軌跡（画面外／未操作／崩れ）だったか（追従復帰時のスナップ用） */
  let prevUseSleepTrajectory = false;
  const thumbNodeCache = createThumbNodeCache();
  const detectTouchDevice = () => { isTouchDevice = true; };

  const handleMouseMove = (e) => {
    if (!isCursorFollowEnabled) return;
    if (isTouchDevice) return;
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    target.set(x, y);
    isMouseActive = true;
  };

  const handleMouseLeave = (e) => {
    if (isTouchDevice) return;
    if (!e.relatedTarget || e.relatedTarget === null) isMouseActive = false;
  };

  const handleTouchStart = (e) => {
    if (!isCursorFollowEnabled) return;
    detectTouchDevice();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      target.set(x, y);
      isMouseActive = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!isCursorFollowEnabled) return;
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = renderer.domElement.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      target.set(x, y);
      isMouseActive = true;
    }
  };

  const handleTouchEnd = () => { isMouseActive = false; };
  const handleTouchCancel = () => { isMouseActive = false; };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseleave', handleMouseLeave);
  document.addEventListener('mouseout', handleMouseLeave);
  document.addEventListener('touchstart', handleTouchStart, { passive: true });
  document.addEventListener('touchmove', handleTouchMove, { passive: true });
  document.addEventListener('touchend', handleTouchEnd, { passive: true });
  document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

  const handleResize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width >= height) {
      uRatio.set(1, height / width);
      uSize.set(config.radius1, config.radius2);
      uSize.multiplyScalar(1 / width);
    } else {
      uRatio.set(width / height, 1);
      uSize.set(config.radius1, config.radius2);
      uSize.multiplyScalar(1 / height);
    }
    material.uniforms.uRatio.value = uRatio;
    material.uniforms.uSize.value = uSize;

    const guidanceText = getRefs().guidanceText;
    if (guidanceText) {
      const computedStyle = window.getComputedStyle(guidanceText);
      const fontSize = parseFloat(computedStyle.fontSize);
      currentSleepRadiusX = fontSize * SLEEP_RADIUS_FONT_MULTIPLIER;
      currentSleepRadiusY = fontSize * SLEEP_RADIUS_FONT_MULTIPLIER;
    } else {
      currentSleepRadiusX = 150;
      currentSleepRadiusY = 150;
    }
    thumbNodeCache.invalidate();
  };
  window.addEventListener('resize', handleResize);
  handleResize();

  function animate() {
    state.cursorAnimationFrameId = requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    if (initialRevealStartTimeSec === null) initialRevealStartTimeSec = time;
    const revealDur = config.cursorTrailInitialRevealSec ?? 0;
    const revealElapsed = time - initialRevealStartTimeSec;
    const revealT =
      revealDur <= 0 ? 1 : Math.min(1, revealElapsed / Math.max(0.001, revealDur));
    const initialRevealOpacity = revealDur <= 0 ? 1 : easeOutCubic(revealT);

    const dtAnim =
      prevAnimClockTime == null ? 0 : Math.max(0, Math.min(0.08, time - prevAnimClockTime));
    prevAnimClockTime = time;

    const blendTgt = state.brokenPeriodActive ? 1 : 0;
    const bIn = config.brokenVisualBlendInPerSec;
    const bOut = config.brokenVisualBlendOutPerSec;
    if (brokenVisualBlend < blendTgt) {
      brokenVisualBlend = Math.min(blendTgt, brokenVisualBlend + dtAnim * bIn);
    } else if (brokenVisualBlend > blendTgt) {
      brokenVisualBlend = Math.max(blendTgt, brokenVisualBlend - dtAnim * bOut);
    }
    const snapEps = config.brokenVisualBlendSnapEps ?? 0.03;
    if (!state.brokenPeriodActive && brokenVisualBlend > 0 && brokenVisualBlend < snapEps) {
      brokenVisualBlend = 0;
    }

    const perfNow =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const idleThresholdSec = config.cursorIdleSleepTrajectorySec ?? 18;
    const useSleepTrajectory = shouldUseSleepTrajectory(
      isMouseActive,
      perfNow,
      state.lastUserActivityPerfMs,
      idleThresholdSec
    );

    const canvasRect = renderer.domElement.getBoundingClientRect();
    const pad = config.thumbnailOverlapPadPx;
    // .project-item は拡大前のレイアウト枠（90px 等）。img の scale は rect に乗らない
    const thumbNodes = thumbNodeCache.getElements();
    const rects = [];
    for (let i = 0; i < thumbNodes.length; i++) {
      rects.push(thumbNodes[i].getBoundingClientRect());
    }
    let pointerOverThumb = false;
    let hitProjectIndex = null;
    if (rects.length > 0) {
      const head =
        isMouseActive && (trailScript?.active || !useSleepTrajectory)
          ? target
          : curvePoints[0];
      const cx = canvasRect.left + ((head.x + 1) / 2) * canvasRect.width;
      const cy = canvasRect.top + ((1 - head.y) / 2) * canvasRect.height;
      for (let j = 0; j < rects.length && !pointerOverThumb; j++) {
        const r = rects[j];
        if (r.width <= 0 || r.height <= 0) continue;
        if (
          cx >= r.left - pad &&
          cx <= r.right + pad &&
          cy >= r.top - pad &&
          cy <= r.bottom + pad
        ) {
          pointerOverThumb = true;
          const raw = thumbNodes[j]?.dataset?.projectIndex;
          const pi = raw !== undefined && raw !== '' ? parseInt(raw, 10) : NaN;
          if (!Number.isNaN(pi)) hitProjectIndex = pi;
        }
      }
    }

    if (!pointerOverThumb) {
      trailHitHoverLastIndex = null;
    } else if (hitProjectIndex !== null && hitProjectIndex !== trailHitHoverLastIndex) {
      document.dispatchEvent(
        new CustomEvent('portfolio:trailthumbnailhit', {
          detail: { projectIndex: hitProjectIndex }
        })
      );
      trailHitHoverLastIndex = hitProjectIndex;
    }
    let curveLerpNow = pointerOverThumb ? config.curveLerpOnThumbnail : config.curveLerp;

    if (trailScript?.active) {
      // 外部スクリプト（プロフィール演出など）: カーソル追従を止めて目標へイーズアウト
      curveLerpNow = config.curveLerp;
      const elapsedSec = time - trailScript.startTimeSec;
      const moveDurationSec = Math.max(0.001, trailScript.moveDurationSec);
      const waitDurationSec = Math.max(0, trailScript.waitDurationSec || 0);
      const fadeDurationSec = Math.max(0.001, trailScript.fadeDurationSec);

      // 目標点の周囲でランダムに揺れ続ける（元目標の半径10px以内）
      trailScript.jitterX += (Math.random() * 2 - 1) * trailScript.jitterStepX;
      trailScript.jitterY += (Math.random() * 2 - 1) * trailScript.jitterStepY;
      const jx = trailScript.jitterX / Math.max(trailScript.jitterRadiusX, 1e-6);
      const jy = trailScript.jitterY / Math.max(trailScript.jitterRadiusY, 1e-6);
      const jr = Math.hypot(jx, jy);
      if (jr > 1) {
        trailScript.jitterX /= jr;
        trailScript.jitterY /= jr;
      }
      const toXJittered = trailScript.toX + trailScript.jitterX;
      const toYJittered = trailScript.toY + trailScript.jitterY;

      let headX = toXJittered;
      let headY = toYJittered;
      if (elapsedSec < moveDurationSec) {
        const tMove = Math.max(0, Math.min(1, elapsedSec / moveDurationSec));
        const eased = easeOutCubic(tMove);
        const baseX = trailScript.fromX + (toXJittered - trailScript.fromX) * eased;
        const baseY = trailScript.fromY + (toYJittered - trailScript.fromY) * eased;

        // 目標へ直進せず、終盤で収束する「よろよろ」横揺れを与える
        const dirX = toXJittered - trailScript.fromX;
        const dirY = toYJittered - trailScript.fromY;
        const dirLen = Math.hypot(dirX, dirY) || 1;
        const nx = -dirY / dirLen;
        const ny = dirX / dirLen;
        const wobbleEnvelope = Math.pow(1 - tMove, 1.2);
        const wobblePhase = trailScript.wobbleSeed + tMove * trailScript.wobbleHz * Math.PI * 2;
        const wobblePrimary = Math.sin(wobblePhase);
        const wobbleSecondary = 0.45 * Math.sin(wobblePhase * 2.15 + 1.1);
        const wobble = (wobblePrimary + wobbleSecondary) * trailScript.wobbleAmp * wobbleEnvelope;

        headX = baseX + nx * wobble;
        headY = baseY + ny * wobble;
        externalOpacityMultiplier = 1;
      } else if (elapsedSec < moveDurationSec + waitDurationSec) {
        // 到着後の待機（明るさ維持）
        externalOpacityMultiplier = 1;
      } else {
        const fadeT = Math.max(
          0,
          Math.min(1, (elapsedSec - moveDurationSec - waitDurationSec) / fadeDurationSec)
        );
        // 到着後はゆっくり暗くする
        externalOpacityMultiplier = Math.max(0, 1 - easeOutCubic(fadeT));
      }

      for (let i = config.curvePoints - 1; i > 0; i--) {
        curvePoints[i].lerp(curvePoints[i - 1], curveLerpNow);
      }
      curvePoints[0].set(headX, headY);

      if (elapsedSec >= moveDurationSec + waitDurationSec + fadeDurationSec) {
        externalOpacityMultiplier = 0;
        const resolve = trailScript.resolve;
        trailScript.active = false;
        trailScript.resolve = null;
        if (typeof resolve === 'function') resolve();
      }
      prevUseSleepTrajectory = useSleepTrajectory;
    } else {
      if (prevUseSleepTrajectory && !useSleepTrajectory) {
        // 休止→追従は画面外からの入室と同じ：履歴を潰さず、先端と mouse を揃えてから lerpu でカーソルへ
        mouse.copy(curvePoints[0]);
      }

      if (useSleepTrajectory) {
        const wWidth = window.innerWidth;
        const wHeight = window.innerHeight;
        const width = renderer.domElement.width / renderer.getPixelRatio();
        const I = (currentSleepRadiusX * wWidth) / width;
        const F = (currentSleepRadiusY * wWidth) / width;
        stepSleepTrailFrame({
          runtime: sleepTrail,
          clockTimeSec: time,
          config,
          brokenVisualBlend,
          I,
          F,
          wWidth,
          wHeight,
          curveLerpNow,
          curvePoints
        });
      } else if (isMouseActive) {
        if (pointerOverThumb) {
          // サムネ上: 追従しない（mouse / curvePoints は更新しない）
        } else {
          if (wasPointerOverThumb) {
            // サムネから出た直後も履歴を潰さず、先端と mouse を揃えてから lerpu
            mouse.copy(curvePoints[0]);
          }
          mouse.lerp(target, config.curveLerp);
          for (let i = config.curvePoints - 1; i > 0; i--) {
            curvePoints[i].lerp(curvePoints[i - 1], config.curveLerp);
          }
          curvePoints[0].copy(mouse);
        }
        // 休止に戻ったフレームで dt が暴れないよう、追従中は前回時刻を無効化
        sleepTrail.prevSleepFrameTime = null;
      }

      prevUseSleepTrajectory = useSleepTrajectory;
    }

    if (curvePoints.length >= 2) {
      const curve = new THREE.CatmullRomCurve3(
        curvePoints.map(p => new THREE.Vector3(p.x, p.y, 0)),
        false,
        'centripetal'
      );
      for (let i = 0; i < config.shaderPoints; i++) {
        const t = i / (config.shaderPoints - 1);
        const point = curve.getPoint(t);
        uPointsUniform[i].set(0.5 * point.x * uRatio.x, 0.5 * point.y * uRatio.y);
      }
    } else {
      for (let i = 0; i < config.shaderPoints; i++) {
        uPointsUniform[i].set(0.5 * mouse.x * uRatio.x, 0.5 * mouse.y * uRatio.y);
      }
    }

    if (material.uniforms.uPoints && material.uniforms.uPoints.value) {
      for (let i = 0; i < config.shaderPoints; i++) {
        if (material.uniforms.uPoints.value[i]) {
          material.uniforms.uPoints.value[i].copy(uPointsUniform[i]);
        } else {
          material.uniforms.uPoints.value[i] = uPointsUniform[i].clone();
        }
      }
      material.uniforms.uPoints.needsUpdate = true;
    }

    const targetOpacity = pointerOverThumb ? 0 : 1;
    if (!trailScript?.active && wasPointerOverThumb && !pointerOverThumb) trailOverlapOpacity = 1;
    const lerpK = config.thumbnailOpacityLerp;
    if (!trailScript?.active) {
      trailOverlapOpacity += (targetOpacity - trailOverlapOpacity) * lerpK;
      if (Math.abs(trailOverlapOpacity - targetOpacity) < 0.002) trailOverlapOpacity = targetOpacity;
    }
    const finalOpacity =
      (trailScript?.active ? 1 : trailOverlapOpacity) *
      externalOpacityMultiplier *
      initialRevealOpacity;
    material.uniforms.uOpacity.value = finalOpacity;

    wasPointerOverThumb = pointerOverThumb;

    renderer.render(scene, camera);
  }
  animate();

  function destroy() {
    if (state.cursorAnimationFrameId) {
      cancelAnimationFrame(state.cursorAnimationFrameId);
      state.cursorAnimationFrameId = null;
    }
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseleave', handleMouseLeave);
    document.removeEventListener('mouseout', handleMouseLeave);
    document.removeEventListener('touchstart', handleTouchStart);
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.removeEventListener('touchcancel', handleTouchCancel);
    window.removeEventListener('resize', handleResize);
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer.dispose();
    material.dispose();
    geometry.dispose();
  }

  return {
    scene,
    camera,
    renderer,
    material,
    geometry,
    mesh,
    destroy,
    updateColor: (color) => {
      const rgb = hexToRgb(color);
      if (rgb) {
        const colorVec = new THREE.Vector3(rgb.r / 255, rgb.g / 255, rgb.b / 255);
        material.uniforms.uColor.value = colorVec;
      }
    },
    /** カーソル追従の on/off（プロフィール演出中などに利用） */
    setCursorFollow: (enabled) => {
      isCursorFollowEnabled = Boolean(enabled);
      if (!isCursorFollowEnabled) {
        isMouseActive = false;
      }
    },
    /** 外部から軌跡の明るさ（暗くする/消す）を上書きする係数 */
    setCursorTrailOpacityMultiplier: (v) => {
      externalOpacityMultiplier = Math.max(0, Math.min(1, Number(v)));
    },
    /**
     * 背景軌跡を指定座標へイーズアウト移動→暗くして消す
     * @returns {Promise<void>}
     */
    animateTrailToScreenPointAndFadeToZero: (xPx, yPx, options = {}) => {
      const moveDurationMs = options.moveDurationMs ?? 420;
      const waitDurationMs = options.waitDurationMs ?? 0;
      const fadeDurationMs = options.fadeDurationMs ?? 650;

      const rect = renderer.domElement.getBoundingClientRect();
      const xNorm = ((xPx - rect.left) / rect.width) * 2 - 1;
      const yNorm = -((yPx - rect.top) / rect.height) * 2 + 1;
      const jitterRadiusPx = 10;
      const jitterRadiusX = (jitterRadiusPx * 2) / rect.width;
      const jitterRadiusY = (jitterRadiusPx * 2) / rect.height;

      // 現在の先端を開始点として保存
      const fromX = curvePoints[0].x;
      const fromY = curvePoints[0].y;
      const dx = xNorm - fromX;
      const dy = yNorm - fromY;
      const dist = Math.hypot(dx, dy);
      const wobbleAmp = Math.min(0.1, Math.max(0.01, dist * 0.16));
      const wobbleHz = 2.8 + Math.random() * 1.7;
      const wobbleSeed = Math.random() * Math.PI * 2;

      return new Promise((resolve) => {
        // 既存のスクリプトが走っていたら置き換える
        trailScript = {
          active: true,
          startTimeSec: clock.getElapsedTime(),
          moveDurationSec: Math.max(0.001, moveDurationMs / 1000),
          waitDurationSec: Math.max(0, waitDurationMs / 1000),
          fadeDurationSec: Math.max(0.001, fadeDurationMs / 1000),
          fromX,
          fromY,
          toX: xNorm,
          toY: yNorm,
          jitterX: 0,
          jitterY: 0,
          jitterStepX: jitterRadiusX * 0.03,
          jitterStepY: jitterRadiusY * 0.03,
          jitterRadiusX,
          jitterRadiusY,
          wobbleAmp,
          wobbleHz,
          wobbleSeed,
          resolve
        };

        externalOpacityMultiplier = 1;
        isCursorFollowEnabled = false;
        isMouseActive = false;
      });
    }
  };
}

export async function initCursorEffect() {
  try {
    const THREE = await import('/vendor/three.module.js');
    if (state.cursorEffectInstance) destroyCursorEffect();
    if (state.initialHue === null) state.initialHue = Math.random() * 360;
    const initialColor = getColorFromHue(state.initialHue);
    state.currentAccentColor = initialColor;
    state.cursorEffectInstance = createCustomCursorEffect(THREE, initialColor);
    document.documentElement.style.setProperty('--accent-color', initialColor);
    startColorTransition({
      syncWebGlColor: (color) => {
        if (!state.cursorEffectInstance) return;
        try {
          state.cursorEffectInstance.updateColor(color);
        } catch (err) {
          console.error('[Cursor Effect] Failed to update color:', err);
        }
      }
    });
  } catch (error) {
    console.error('[Cursor Effect] Failed to initialize cursor effect:', error);
  }
}

export function destroyCursorEffect() {
  if (state.cursorEffectInstance) {
    state.cursorEffectInstance.destroy();
    state.cursorEffectInstance = null;
  }
}
