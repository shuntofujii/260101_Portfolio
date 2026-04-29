// プロフィールモーダル（入場アニメは profileIntro 系で後段から接続）
import { getRefs } from './domRefs.js';
import { state } from './state.js';
import { escapeHtml, createFocusTrap } from './utils.js';
import { setBackgroundModalState } from './modalChrome.js';
import { baseAssetsUrl } from './constants.js';

const ASSETS_V = '?v=20260429';

const PROFILE_BIO_PARAGRAPHS = [
  '大手通信事業社でM&Aやメディア立ち上げなどを担当。現在は全社のマーケティング戦略を策定している。',
  'フリーランスとしては、Microsoft社主催イベントのクリエイティブディレクションや、「AR×Web3」を掲げるIZUMOxr社のコミュニティマネジメントなど、さまざまなプロジェクトに携わる。',
  '美術監督を務めた『グーチョキデッド』は、ゆうばり国際ファンタスティック映画にノミネートされた。',
  '好きな食べ物はうどん。'
];

const PROFILE_META_ITEMS = [
  {
    label: '専門領域',
    value:
      'クリエイティブディレクション / サービスデザイン / マーケティング戦略策定 / 事業開発 / など',
    icon: `${baseAssetsUrl}/icons/focus.svg${ASSETS_V}`
  },
  {
    label: 'スキル',
    value:
      'Illustrator / Figma / Photoshop / After Effects / DaVinci Resolve / Blender / 撮影 / など',
    icon: `${baseAssetsUrl}/icons/toolkits.svg${ASSETS_V}`
  },
  {
    label: '取引先実績',
    value:
      '日本マイクロソフト株式会社 / 株式会社MuuMu / IVS株式会社 / StudioZ株式会社 / など',
    icon: `${baseAssetsUrl}/icons/client.svg${ASSETS_V}`
  }
];

function buildProfileMetaHtml() {
  return `
    <div class="modal-meta">
      ${PROFILE_META_ITEMS.map((it) => `
      <div class="modal-meta-item">
        ${it.icon ? `<img src="${it.icon}" alt="${escapeHtml(it.label)}" class="modal-meta-icon" width="18" height="18" decoding="async" loading="lazy" />` : ''}
        <div class="modal-meta-content">
          <span class="modal-meta-label">${escapeHtml(it.label)}</span>
          <span class="modal-meta-value">${escapeHtml(it.value)}</span>
        </div>
      </div>
      `).join('')}
    </div>
  `;
}

export function renderProfileContent(modalContentEl) {
  const profileImg = `${baseAssetsUrl}/profile/profile.webp${ASSETS_V}`;
  const bodyHtml = PROFILE_BIO_PARAGRAPHS.map((p) => {
    const t = escapeHtml(p).replace(/\n/g, '<br>');
    return `<p class="profile-modal-paragraph">${t}</p>`;
  }).join('');
  const metaHtml = buildProfileMetaHtml();

  modalContentEl.innerHTML = `
    <h2 class="visually-hidden" id="profileModalTitleHeading">Profile</h2>
    <h3 class="case-title">藤井 洵斗 / SHUNTO FUJII (30)</h3>
    <div class="profile-modal-hero">
      <img
        class="profile-modal-photo"
        src="${profileImg}"
        alt=""
        width="800"
        height="800"
        decoding="async"
        fetchpriority="high"
      />
    </div>
    <div class="profile-modal-bio modal-description">
      ${bodyHtml}
    </div>
    ${metaHtml}
  `;
}

function finalizeProfileClose(refs) {
  if (!refs.profileModalOverlay || !refs.profileModalContainer) return;
  if (refs.__profileCloseOnEnd) {
    refs.profileModalContainer.removeEventListener('transitionend', refs.__profileCloseOnEnd);
    refs.__profileCloseOnEnd = null;
  }
  if (refs.__profileCloseFallback) {
    window.clearTimeout(refs.__profileCloseFallback);
    refs.__profileCloseFallback = null;
  }
  refs.profileModalContainer.dataset.state = 'closed';
  refs.profileModalContainer.dataset.swipeSettled = '';
  refs.profileModalOverlay.hidden = true;
  refs.profileModalContainer.hidden = true;
  refs.profileModalOverlay.setAttribute('aria-hidden', 'true');
  if (refs.profileModalContent) refs.profileModalContent.innerHTML = '';
  if (state.profileFocusTrapHandler) {
    document.removeEventListener('keydown', state.profileFocusTrapHandler);
    state.profileFocusTrapHandler = null;
  }
  if (state.profileModalTriggerElement && document.body.contains(state.profileModalTriggerElement)) {
    state.profileModalTriggerElement.setAttribute('tabindex', '-1');
    state.profileModalTriggerElement.focus();
  }
  state.profileModalTriggerElement = null;
  state.profileModalOpen = false;
  state.profileIsClosing = false;
  document.dispatchEvent(new CustomEvent('portfolio:profilemodalclose'));
}

/**
 * プロジェクトモーダル等を開く直前に呼ぶ。トランジションなしで閉じる。
 */
export function closeProfileModalIfOpen() {
  if (!state.profileModalOpen) return;
  const refs = getRefs();
  if (state.profileFocusTrapHandler) {
    document.removeEventListener('keydown', state.profileFocusTrapHandler);
    state.profileFocusTrapHandler = null;
  }
  if (refs.profileModalOverlay) {
    refs.profileModalOverlay.style.transition = '';
    refs.profileModalOverlay.hidden = true;
    refs.profileModalOverlay.setAttribute('aria-hidden', 'true');
  }
  if (refs.profileModalContainer) {
    refs.profileModalContainer.style.transition = '';
    refs.profileModalContainer.hidden = true;
    refs.profileModalContainer.dataset.state = 'closed';
    if (refs.__profileCloseOnEnd) {
      refs.profileModalContainer.removeEventListener('transitionend', refs.__profileCloseOnEnd);
      refs.__profileCloseOnEnd = null;
    }
  }
  if (refs.profileModalContent) refs.profileModalContent.innerHTML = '';
  if (refs.__profileCloseFallback) {
    window.clearTimeout(refs.__profileCloseFallback);
    refs.__profileCloseFallback = null;
  }
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';
  if (refs.guidanceText) refs.guidanceText.classList.add('visible');
  setBackgroundModalState(false);
  state.profileModalOpen = false;
  state.profileIsClosing = false;
  state.profileModalTriggerElement = null;
}

export function openProfileModal(triggerElement) {
  const refs = getRefs();
  state.profileModalTriggerElement = triggerElement || null;

  if (!refs.profileModalOverlay || !refs.profileModalContainer || !refs.profileModalContent) return;

  renderProfileContent(refs.profileModalContent);

  refs.profileModalOverlay.style.transition = '';
  refs.profileModalContainer.style.transition = '';
  refs.profileModalContainer.dataset.swipeSettled = '';
  refs.profileModalOverlay.hidden = false;
  refs.profileModalContainer.hidden = false;
  refs.profileModalOverlay.setAttribute('aria-hidden', 'false');
  state.profileIsClosing = false;
  refs.profileModalContainer.dataset.state = 'closed';

  state.profileModalOpen = true;

  requestAnimationFrame(() => {
    document.body.classList.add('modal-open');
    refs.profileModalContainer.dataset.state = 'open';
    requestAnimationFrame(() => {
      if (refs.profileModalClose) refs.profileModalClose.focus();
      if (state.profileFocusTrapHandler) document.removeEventListener('keydown', state.profileFocusTrapHandler);
      state.profileFocusTrapHandler = createFocusTrap(refs.profileModalContainer);
      document.addEventListener('keydown', state.profileFocusTrapHandler);
    });
  });

  document.body.style.overflow = 'hidden';
  if (refs.guidanceText) refs.guidanceText.classList.remove('visible');
  setBackgroundModalState(true);

  document.dispatchEvent(new CustomEvent('portfolio:profilemodalopen'));
}

export function closeProfileModal() {
  const refs = getRefs();
  if (!refs.profileModalOverlay || !refs.profileModalContainer) return;
  if (!state.profileModalOpen || state.profileIsClosing) return;

  state.profileIsClosing = true;
  refs.profileModalOverlay.style.transition = 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)';
  refs.profileModalContainer.style.transition =
    'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)';

  refs.profileModalContainer.dataset.state = 'closing';
  document.body.classList.remove('modal-open');

  let didFinalize = false;
  const runFinalize = () => {
    if (didFinalize) return;
    didFinalize = true;
    finalizeProfileClose(refs);
  };

  const onEnd = (e) => {
    if (e.target !== refs.profileModalContainer) return;
    if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
    runFinalize();
  };
  refs.__profileCloseOnEnd = onEnd;
  refs.profileModalContainer.addEventListener('transitionend', onEnd);
  refs.__profileCloseFallback = window.setTimeout(runFinalize, 320);

  document.body.style.overflow = '';
  if (refs.guidanceText) refs.guidanceText.classList.add('visible');
  setBackgroundModalState(false);
}
