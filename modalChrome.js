// プロジェクト／プロフィール共通のモーダル時に背面 UI を抑える
import { getRefs } from './domRefs.js';

export function setBackgroundModalState(isModalOpen) {
  const refs = getRefs();
  const method = isModalOpen ? 'add' : 'remove';
  if (refs.focusVisual) refs.focusVisual.classList[method]('modal-background');
  if (refs.titleBackground) refs.titleBackground.classList[method]('modal-background');
  if (refs.contextPanel) refs.contextPanel.classList[method]('modal-background');
  if (refs.projectNavigation) refs.projectNavigation.classList[method]('modal-background');
}
