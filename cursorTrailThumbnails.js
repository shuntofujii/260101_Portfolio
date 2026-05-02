/**
 * プロジェクトサムネの NodeList をキャッシュし、毎フレーム querySelectorAll しない。
 * リサイズ時は無効化（レイアウト変化）。
 */

export function createThumbNodeCache() {
  let cached = /** @type {NodeListOf<Element> | null} */ (null);

  return {
    /** @returns {NodeListOf<Element>} */
    getElements() {
      if (!cached || cached.length === 0) {
        cached = document.querySelectorAll('.project-item');
      }
      return cached;
    },
    invalidate() {
      cached = null;
    }
  };
}
