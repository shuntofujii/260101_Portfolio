/** HTML属性・テキスト用のエスケープ（& < > " ' を実体参照に） */
export function escapeHtml(str) {
  if (str == null || typeof str !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, (c) => map[c]);
}

/** コンテナ内のフォーカス可能要素を document 順で返す */
export function getFocusableElements(container) {
  if (!container) return [];
  const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selector)).filter((el) => {
    return !el.hasAttribute('disabled') && el.getAttribute('tabindex') !== '-1' && !el.hidden;
  });
}

/** フォーカストラップ用の keydown ハンドラを返す（Tab/Shift+Tab でループ） */
export function createFocusTrap(container) {
  return (e) => {
    if (e.key !== 'Tab') return;
    const focusables = getFocusableElements(container);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
}
