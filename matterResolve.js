/**
 * matter-js の読み込み
 * - ブラウザ: index.html で先に <script src="/vendor/matter.js"></script> が window.Matter を付与（UMD は default export が無く app 全体が落ちるのを防ぐ）
 * - Vitest: グローバルが無いときのみ動的 import で node_modules を参照
 */
export const Matter = await (async () => {
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  if (g.Matter?.Engine?.create && g.Matter?.Body?.create) {
    return g.Matter;
  }
  const mod = await import('matter-js');
  const resolved = mod.default ?? mod;
  if (!resolved?.Engine?.create) {
    throw new Error(
      '[matterResolve] Matter.js を読み込めませんでした。index.html に <script src="/vendor/matter.js"></script> を app.js より前に置いてください。'
    );
  }
  return resolved;
})();
