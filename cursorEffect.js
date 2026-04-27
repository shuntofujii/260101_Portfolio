// カーソルエフェクト（色相・Three.js 軌跡）
import { state } from './state.js';
import { getRefs } from './domRefs.js';
import {
  COLOR_TRANSITION_DURATION,
  COLOR_UPDATE_THROTTLE_MS,
  CURSOR_CONFIG,
  CURSOR_Z_INDEX
} from './constants.js';
import { sleepTrajectoryParams, trajectoryR } from './sleepTrajectory.js';

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

function getColorFromHue(hue) {
  const saturation = 100;
  const value = 100;
  const c = (value / 100) * (saturation / 100);
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = value / 100 - c;
  let r, g, b;
  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const red = Math.round((r + m) * 255);
  const green = Math.round((g + m) * 255);
  const blue = Math.round((b + m) * 255);
  return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

function getCurrentAccentColor() {
  if (state.colorTransitionStartTime === null) {
    if (state.initialHue === null) state.initialHue = Math.random() * 360;
    return getColorFromHue(state.initialHue);
  }
  const currentTime = performance.now();
  const elapsed = currentTime - state.colorTransitionStartTime;
  const hue = (state.initialHue + (elapsed / COLOR_TRANSITION_DURATION) * 360) % 360;
  return getColorFromHue(hue);
}

function updateCursorEffectColor(color) {
  if (!state.cursorEffectInstance) return;
  try {
    state.cursorEffectInstance.updateColor(color);
  } catch (error) {
    console.error('[Cursor Effect] Failed to update color:', error);
  }
}

function updateAccentColor() {
  const color = getCurrentAccentColor();
  state.currentAccentColor = color;
  document.documentElement.style.setProperty('--accent-color', color);
  updateCursorEffectColor(color);
  return color;
}

function startColorTransition() {
  if (state.colorAnimationFrameId) cancelAnimationFrame(state.colorAnimationFrameId);
  state.colorTransitionStartTime = performance.now();
  state.lastColorUpdateTime = 0;

  function animateColor() {
    const now = performance.now();
    if (now - state.lastColorUpdateTime >= COLOR_UPDATE_THROTTLE_MS) {
      state.lastColorUpdateTime = now;
      updateAccentColor();
    }
    state.colorAnimationFrameId = requestAnimationFrame(animateColor);
  }
  animateColor();
}

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
  const curvePoints = new Array(config.curvePoints).fill(0).map(() => new THREE.Vector2());
  mouse.set(0, 0);
  target.set(0, 0);

  let isMouseActive = false;
  let isTouchDevice = false;
  let sleepModeStartTime = null;
  const SLEEP_RADIUS_FONT_MULTIPLIER = 12;
  let currentSleepRadiusX = 150;
  let currentSleepRadiusY = 150;

  /** サムネイルと軌跡が重なるとき 0 に近づける（シェーダ uOpacity） */
  let trailOverlapOpacity = 1;
  /** 直前フレームでポインタがサムネ上だったか（退出時に履歴をリセットする） */
  let wasPointerOverThumb = false;

  const detectTouchDevice = () => { isTouchDevice = true; };

  const handleMouseMove = (e) => {
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
  };
  window.addEventListener('resize', handleResize);
  handleResize();

  function animate() {
    state.cursorAnimationFrameId = requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    const canvasRect = renderer.domElement.getBoundingClientRect();
    const pad = config.thumbnailOverlapPadPx;
    // .project-item は拡大前のレイアウト枠（90px 等）。img の scale は rect に乗らない
    const thumbNodes = document.querySelectorAll('.project-item');
    const rects = [];
    for (let i = 0; i < thumbNodes.length; i++) {
      rects.push(thumbNodes[i].getBoundingClientRect());
    }
    let pointerOverThumb = false;
    if (rects.length > 0) {
      const head = isMouseActive ? target : curvePoints[0];
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
        }
      }
    }
    const curveLerpNow = pointerOverThumb ? config.curveLerpOnThumbnail : config.curveLerp;

    if (isMouseActive) {
      if (pointerOverThumb) {
        // サムネ上: 追従しない（mouse / curvePoints は更新しない）
      } else if (wasPointerOverThumb) {
        // サムネから出た直後: 履歴を捨て、表示開始位置を現在のポインタにそろえる
        mouse.copy(target);
        for (let i = 0; i < config.curvePoints; i++) curvePoints[i].copy(target);
      } else {
        mouse.lerp(target, config.curveLerp);
        for (let i = config.curvePoints - 1; i > 0; i--) {
          curvePoints[i].lerp(curvePoints[i - 1], config.curveLerp);
        }
        curvePoints[0].copy(mouse);
      }
    } else {
      const wWidth = window.innerWidth;
      const wHeight = window.innerHeight;
      const width = renderer.domElement.width / renderer.getPixelRatio();
      const I = (currentSleepRadiusX * wWidth) / width;
      const F = (currentSleepRadiusY * wWidth) / width;

      if (sleepModeStartTime === null) {
        sleepModeStartTime = time;
        const { theta: th0, tForR: tr0 } = sleepTrajectoryParams(0, config);
        const R0 = trajectoryR(tr0);
        const initialD = I * R0 * Math.cos(th0);
        const initialV = F * R0 * Math.sin(th0);
        const initialX = initialD / (wWidth / 2);
        const initialY = -initialV / (wHeight / 2);
        for (let i = 0; i < config.curvePoints; i++) curvePoints[i].set(initialX, initialY);
      }

      const elapsedSinceSleep = time - sleepModeStartTime;
      const { theta, tForR } = sleepTrajectoryParams(elapsedSinceSleep, config);
      const R = trajectoryR(tForR);
      const D = I * R * Math.cos(theta);
      const V = F * R * Math.sin(theta);
      const x = D / (wWidth / 2);
      const y = -V / (wHeight / 2);

      for (let i = config.curvePoints - 1; i > 0; i--) {
        curvePoints[i].lerp(curvePoints[i - 1], curveLerpNow);
      }
      curvePoints[0].set(x, y);
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
    if (wasPointerOverThumb && !pointerOverThumb) trailOverlapOpacity = 1;
    const lerpK = config.thumbnailOpacityLerp;
    trailOverlapOpacity += (targetOpacity - trailOverlapOpacity) * lerpK;
    if (Math.abs(trailOverlapOpacity - targetOpacity) < 0.002) trailOverlapOpacity = targetOpacity;
    material.uniforms.uOpacity.value = trailOverlapOpacity;

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
    }
  };
}

export async function initCursorEffect() {
  try {
    const THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
    if (state.cursorEffectInstance) destroyCursorEffect();
    if (state.initialHue === null) state.initialHue = Math.random() * 360;
    const initialColor = getColorFromHue(state.initialHue);
    state.currentAccentColor = initialColor;
    state.cursorEffectInstance = createCustomCursorEffect(THREE, initialColor);
    document.documentElement.style.setProperty('--accent-color', initialColor);
    startColorTransition();
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
