/**
 * matter-js の読み込み
 * - 本番ブラウザ: プロフィール入場時まで遅延し、必要になったら /vendor/matter.js を注入して window.Matter を付与（初期 JS の実行時間・ネットワーク競合を抑える）
 * - Vitest: グローバルが無いときは node_modules の matter-js を import
 */
function loadMatterVendorScript(src) {
  return new Promise((resolve, reject) => {
    const g = typeof globalThis !== 'undefined' ? globalThis : {};
    if (g.Matter?.Engine?.create && g.Matter?.Body?.create) {
      resolve();
      return;
    }
    const existing = document.querySelector(`script[data-matter-vendor="1"][src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Matter script: ${src}`)), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.dataset.matterVendor = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Matter script: ${src}`));
    document.head.appendChild(s);
  });
}

function isVitestEnv() {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test') return true;
  } catch {
    /* ignore */
  }
  return typeof process !== 'undefined' && process.env?.VITEST;
}

export const Matter = await (async () => {
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  if (g.Matter?.Engine?.create && g.Matter?.Body?.create) {
    return g.Matter;
  }
  if (!isVitestEnv() && typeof document !== 'undefined') {
    await loadMatterVendorScript('/vendor/matter.js');
    if (g.Matter?.Engine?.create && g.Matter?.Body?.create) {
      return g.Matter;
    }
  }
  const mod = await import('matter-js');
  const resolved = mod.default ?? mod;
  if (!resolved?.Engine?.create) {
    throw new Error('[matterResolve] Matter.js を読み込めませんでした。');
  }
  return resolved;
})();
