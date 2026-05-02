/**
 * アクセント色（--accent-color）の色相アニメーション。
 * WebGL カーソル（cursorEffect.js）からも参照される共有ロジック。
 */
import { state } from './state.js';
import { COLOR_TRANSITION_DURATION, COLOR_UPDATE_THROTTLE_MS } from './constants.js';

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

export function getColorFromHue(hue) {
  const saturation = 100;
  const value = 100;
  const c = (value / 100) * (saturation / 100);
  const x = c * (1 - Math.abs((hue / 60) % 2 - 1));
  const m = value / 100 - c;
  let r;
  let g;
  let b;
  if (hue < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (hue < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (hue < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (hue < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const red = Math.round((r + m) * 255);
  const green = Math.round((g + m) * 255);
  const blue = Math.round((b + m) * 255);
  return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

export function getCurrentAccentColor() {
  if (state.colorTransitionStartTime === null) {
    if (state.initialHue === null) state.initialHue = Math.random() * 360;
    return getColorFromHue(state.initialHue);
  }
  const currentTime = performance.now();
  const elapsed = currentTime - state.colorTransitionStartTime;
  const hue = (state.initialHue + (elapsed / COLOR_TRANSITION_DURATION) * 360) % 360;
  return getColorFromHue(hue);
}

/**
 * @param {object} [options]
 * @param {(color: string) => void} [options.syncWebGlColor] デスクトップのカーソルシェーダと色を同期するとき
 */
export function updateAccentColor(options = {}) {
  const color = getCurrentAccentColor();
  state.currentAccentColor = color;
  document.documentElement.style.setProperty('--accent-color', color);
  if (typeof options.syncWebGlColor === 'function') {
    options.syncWebGlColor(color);
  }
  return color;
}

/**
 * @param {object} [options] updateAccentColor にそのまま渡す（毎フレーム同じ hook を使う）
 */
export function startColorTransition(options = {}) {
  if (state.colorAnimationFrameId) cancelAnimationFrame(state.colorAnimationFrameId);
  state.colorTransitionStartTime = performance.now();
  state.lastColorUpdateTime = 0;

  function animateColor() {
    const now = performance.now();
    if (now - state.lastColorUpdateTime >= COLOR_UPDATE_THROTTLE_MS) {
      state.lastColorUpdateTime = now;
      updateAccentColor(options);
    }
    state.colorAnimationFrameId = requestAnimationFrame(animateColor);
  }
  animateColor();
}
