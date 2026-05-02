// モーダルの開閉
import { state } from './state.js';
import { clearTrailThumbnailHoverTimer } from './appStateTransitions.js';
import { getRefs } from './domRefs.js';
import { escapeHtml, createFocusTrap } from './utils.js';
import { appendExplicitModal, createCaseSection, createInitiativeCard } from './media.js';
import { closeLightbox } from './lightbox.js';
import { setBackgroundModalState } from './modalChrome.js';
import { closeProfileModalIfOpen } from './profileModal.js';

const DEFAULT_MODAL_META_ITEMS = [
  { label: 'Domain', value: '$domain', icon: 'https://assets.shuntofujii.com/icons/domain.svg?v=20260429' },
  { label: 'Year', value: '$year', icon: 'https://assets.shuntofujii.com/icons/year.svg?v=20260429' },
  { label: 'Disciplines', value: '$disciplines', icon: 'https://assets.shuntofujii.com/icons/focus.svg?v=20260429' },
  { label: 'Toolkits', value: '$toolkits', icon: 'https://assets.shuntofujii.com/icons/toolkits.svg?v=20260429' }
];

function buildModalMetaItems(project) {
  const disciplinesValue = String(project.disciplines ?? '').trim();
  const category = project.category || '';
  const year = project.year || '';
  const toolsStr = project.tools && project.tools.length > 0 ? project.tools.join(' / ') : '';
  const metaTokens = {
    $domain: category,
    $year: year,
    $disciplines: disciplinesValue,
    $toolkits: toolsStr
  };
  const rawMetaItems = Array.isArray(project.modalMetaItems) ? project.modalMetaItems : DEFAULT_MODAL_META_ITEMS;

  return rawMetaItems
    .map((it) => {
      if (!it || !it.label) return null;
      const rawValue = it.value ?? '';
      const resolved = (typeof rawValue === 'string' && rawValue in metaTokens)
        ? metaTokens[rawValue]
        : rawValue;
      const valueStr = String(resolved ?? '').trim();
      if (!valueStr) return null;
      return {
        label: String(it.label),
        value: valueStr,
        icon: String(it.icon || '')
      };
    })
    .filter(Boolean);
}

function buildModalMetaHtml(metaItems) {
  if (!metaItems.length) return '';
  return `
    <div class="modal-meta">
      ${metaItems.map((it) => `
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

function appendProjectContentSections(project, modalContent) {
  if (project.explicitModal && project.projectSlug) {
    const explicitSection = document.createElement('section');
    explicitSection.className = 'modal-initiatives explicit-modal';
    appendExplicitModal(project, explicitSection);
    modalContent.appendChild(explicitSection);
    return;
  }

  if (project.cases && project.cases.length > 0 && project.projectSlug) {
    const casesSection = document.createElement('section');
    casesSection.className = 'modal-initiatives';
    project.cases.forEach((caseData) => {
      casesSection.appendChild(createCaseSection(caseData, project.projectSlug));
    });
    modalContent.appendChild(casesSection);
    return;
  }

  if (project.initiatives && project.initiatives.length > 0 && project.projectSlug) {
    const initiativesSection = document.createElement('section');
    initiativesSection.className = 'modal-initiatives';
    const initiativeList = document.createElement('div');
    initiativeList.className = 'initiative-list';
    project.initiatives.forEach((initiative) => {
      initiativeList.appendChild(createInitiativeCard(initiative, project.projectSlug));
    });
    initiativesSection.appendChild(initiativeList);
    modalContent.appendChild(initiativesSection);
  }
}

export function renderModalContent(project, modalContentEl) {
  const safeTitle = escapeHtml(project.title);
  const safeTagline = project.tagline ? escapeHtml(project.tagline) : '';
  const safeDescription = project.description
    ? escapeHtml(project.description).replace(/\n/g, '<br>')
    : '';
  const modalMetaItems = buildModalMetaItems(project);
  const modalMetaHtml = buildModalMetaHtml(modalMetaItems);

  modalContentEl.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title" id="modalTitleHeading">${safeTitle}</h2>
      ${safeTagline ? `<p class="modal-tagline">${safeTagline}</p>` : ''}
    </div>
    ${safeDescription ? `<div class="modal-description">${safeDescription}</div>` : ''}
  `;

  appendProjectContentSections(project, modalContentEl);

  // modal-meta をモーダル内の最下部に寄せる（footer的配置）
  // modal-content の flex レイアウトにより、末尾に置いた要素が下に押し出される。
  if (modalMetaHtml) {
    const tmp = document.createElement('div');
    tmp.innerHTML = modalMetaHtml.trim();
    const metaEl = tmp.firstElementChild;
    if (metaEl) modalContentEl.appendChild(metaEl);
  }
}

export function openModal(project, triggerElement) {
  closeProfileModalIfOpen();
  clearTrailThumbnailHoverTimer(state);
  const refs = getRefs();
  state.modalTriggerElement = triggerElement || null;

  const resetModalScrollPosition = () => {
    if (refs.modalContent) {
      refs.modalContent.scrollTop = 0;
      if (typeof refs.modalContent.scrollTo === 'function') {
        refs.modalContent.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }
    if (refs.modalContainer) {
      refs.modalContainer.scrollTop = 0;
      if (typeof refs.modalContainer.scrollTo === 'function') {
        refs.modalContainer.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }
  };

  renderModalContent(project, refs.modalContent);
  resetModalScrollPosition();

  if (refs.modalOverlay && refs.modalContainer) {
    // クローズ時に上書きした短縮トランジションを毎回リセット
    refs.modalOverlay.style.transition = '';
    refs.modalContainer.style.transition = '';
    refs.modalContainer.dataset.swipeSettled = '';
    refs.modalOverlay.hidden = false;
    refs.modalContainer.hidden = false;
    state.isClosing = false;
    refs.modalContainer.dataset.state = 'closed';
    requestAnimationFrame(() => {
      document.body.classList.add('modal-open');
      refs.modalContainer.dataset.state = 'open';
      // レイアウト確定後に再リセットし、前回スクロール位置の残留を防ぐ
      requestAnimationFrame(() => {
        resetModalScrollPosition();
      });
      requestAnimationFrame(() => {
        if (refs.modalClose) refs.modalClose.focus();
        if (state.modalFocusTrapHandler) document.removeEventListener('keydown', state.modalFocusTrapHandler);
        state.modalFocusTrapHandler = createFocusTrap(refs.modalContainer);
        document.addEventListener('keydown', state.modalFocusTrapHandler);
      });
    });
  }

  document.dispatchEvent(new CustomEvent('portfolio:modalopen', { detail: { project } }));

  document.body.style.overflow = 'hidden';
  if (refs.guidanceText) refs.guidanceText.classList.remove('visible');
  setBackgroundModalState(true);
}

export function closeModal(stopAllInlineVideos) {
  const refs = getRefs();
  if (refs.lightboxOverlay && !refs.lightboxOverlay.hidden) closeLightbox();
  if (typeof stopAllInlineVideos === 'function') stopAllInlineVideos();

  if (!refs.modalOverlay || !refs.modalContainer) return;
  if (state.isClosing) return;
  state.isClosing = true;
  const closeAfterSwipe = refs.modalContainer.dataset.swipeSettled === '1';

  if (closeAfterSwipe) {
    refs.modalOverlay.style.transition = 'none';
    refs.modalContainer.style.transition = 'none';
  } else {
    // 通常クローズは体感優先で短め
    refs.modalOverlay.style.transition = 'opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)';
    refs.modalContainer.style.transition = 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms cubic-bezier(0.22, 1, 0.36, 1)';
  }
  refs.modalContainer.style.transform = '';
  refs.modalContainer.style.transformOrigin = '';

  refs.modalContainer.dataset.state = 'closing';
  document.body.classList.remove('modal-open');

  let didFinalize = false;
  let fallbackTimer = null;
  const finalizeClose = () => {
    if (didFinalize) return;
    didFinalize = true;
    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }
    refs.modalContainer.removeEventListener('transitionend', onEnd);
    refs.modalContainer.dataset.state = 'closed';
    refs.modalContainer.dataset.swipeSettled = '';
    refs.modalOverlay.hidden = true;
    refs.modalContainer.hidden = true;

    if (state.modalFocusTrapHandler) {
      document.removeEventListener('keydown', state.modalFocusTrapHandler);
      state.modalFocusTrapHandler = null;
    }
    if (state.modalTriggerElement && document.body.contains(state.modalTriggerElement)) {
      state.modalTriggerElement.setAttribute('tabindex', '-1');
      state.modalTriggerElement.focus();
    }
    state.modalTriggerElement = null;

    if (refs.modalContent) refs.modalContent.innerHTML = '';
    state.isClosing = false;
    document.dispatchEvent(new CustomEvent('portfolio:modalclose'));
  };

  const onEnd = (e) => {
    if (e.target !== refs.modalContainer) return;
    if (e.propertyName !== 'transform' && e.propertyName !== 'opacity') return;
    finalizeClose();
  };
  if (closeAfterSwipe) {
    // スワイプ直後は間髪入れずクローズ（transitionなし）
    finalizeClose();
  } else {
    refs.modalContainer.addEventListener('transitionend', onEnd);
    // 保険: transitionend が来ない環境/状態でも必ずクローズを完了させる
    fallbackTimer = window.setTimeout(finalizeClose, 320);
  }

  document.body.style.overflow = '';
  if (refs.guidanceText) refs.guidanceText.classList.add('visible');
  setBackgroundModalState(false);

  state.selectedProject = null;
  state.hoveredProject = null;
  state.currentState = 'initial';
}
