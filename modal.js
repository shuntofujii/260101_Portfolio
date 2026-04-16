// モーダルの開閉
import { state } from './state.js';
import { getRefs } from './domRefs.js';
import { escapeHtml, createFocusTrap } from './utils.js';
import { appendExplicitModal, createCaseSection, createInitiativeCard } from './media.js';
import { closeLightbox } from './lightbox.js';

export function openModal(project, triggerElement) {
  const refs = getRefs();
  state.modalTriggerElement = triggerElement || null;

  let focusValue = project.role || '';
  if (project.scope) {
    focusValue = focusValue ? `${focusValue} / ${project.scope}` : project.scope;
  }

  const safeTitle = escapeHtml(project.title);
  const safeTagline = project.tagline ? escapeHtml(project.tagline) : '';
  const safeCategory = escapeHtml(project.category);
  const safeYear = escapeHtml(project.year);
  const safeFocusValue = focusValue ? escapeHtml(focusValue) : '';
  const safeToolsStr = project.tools && project.tools.length > 0 ? escapeHtml(project.tools.join(' / ')) : '';
  const safeDescription = project.description
    ? escapeHtml(project.description).replace(/\n/g, '<br>')
    : '';
  // modal-meta の共通ラベル（プロジェクト差し替え前提のダミー値）
  const safeClient = escapeHtml('日本マイクロソフト株式会社');
  const safeDirectionAndCreated = escapeHtml('藤井 洵斗');

  const modalMetaHtml = `
    <div class="modal-meta">
      <div class="modal-meta-item">
        <img src="https://assets.shuntofujii.com/icons/client.svg" alt="Client" class="modal-meta-icon" width="18" height="18" decoding="async" loading="lazy" />
        <div class="modal-meta-content">
          <span class="modal-meta-label">Client</span>
          <span class="modal-meta-value">${safeClient}</span>
        </div>
      </div>
      <div class="modal-meta-item">
        <img src="https://assets.shuntofujii.com/icons/created.svg" alt="Direction & Created" class="modal-meta-icon" width="18" height="18" decoding="async" loading="lazy" />
        <div class="modal-meta-content">
          <span class="modal-meta-label">Direction & Created</span>
          <span class="modal-meta-value">${safeDirectionAndCreated}</span>
        </div>
      </div>
      <div class="modal-meta-item">
        <img src="https://assets.shuntofujii.com/icons/domain.svg" alt="Domain" class="modal-meta-icon" width="18" height="18" decoding="async" loading="lazy" />
        <div class="modal-meta-content">
          <span class="modal-meta-label">Domain</span>
          <span class="modal-meta-value">${safeCategory}</span>
        </div>
      </div>
      <div class="modal-meta-item">
        <img src="https://assets.shuntofujii.com/icons/year.svg" alt="Year" class="modal-meta-icon" width="18" height="18" decoding="async" loading="lazy" />
        <div class="modal-meta-content">
          <span class="modal-meta-label">Year</span>
          <span class="modal-meta-value">${safeYear}</span>
        </div>
      </div>
      ${safeFocusValue ? `
      <div class="modal-meta-item">
        <img src="https://assets.shuntofujii.com/icons/focus.svg" alt="Focus" class="modal-meta-icon" width="18" height="18" decoding="async" loading="lazy" />
        <div class="modal-meta-content">
          <span class="modal-meta-label">Focus</span>
          <span class="modal-meta-value">${safeFocusValue}</span>
        </div>
      </div>
      ` : ''}
      ${safeToolsStr ? `
      <div class="modal-meta-item">
        <img src="https://assets.shuntofujii.com/icons/toolkits.svg" alt="Toolkits" class="modal-meta-icon" width="18" height="18" decoding="async" loading="lazy" />
        <div class="modal-meta-content">
          <span class="modal-meta-label">Toolkits</span>
          <span class="modal-meta-value">${safeToolsStr}</span>
        </div>
      </div>
      ` : ''}
    </div>
  `;

  refs.modalContent.innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${safeTitle}</h2>
      ${safeTagline ? `<p class="modal-tagline">${safeTagline}</p>` : ''}
    </div>
    ${safeDescription ? `<div class="modal-description">${safeDescription}</div>` : ''}
  `;

  if (project.explicitModal && project.projectSlug) {
    const explicitSection = document.createElement('section');
    explicitSection.className = 'modal-initiatives explicit-modal';
    appendExplicitModal(project, explicitSection);
    refs.modalContent.appendChild(explicitSection);
  } else if (project.cases && project.cases.length > 0 && project.projectSlug) {
    const casesSection = document.createElement('section');
    casesSection.className = 'modal-initiatives';
    project.cases.forEach(caseData => {
      casesSection.appendChild(createCaseSection(caseData, project.projectSlug));
    });
    refs.modalContent.appendChild(casesSection);
  } else if (project.initiatives && project.initiatives.length > 0 && project.projectSlug) {
    const initiativesSection = document.createElement('section');
    initiativesSection.className = 'modal-initiatives';
    const initiativeList = document.createElement('div');
    initiativeList.className = 'initiative-list';
    project.initiatives.forEach(initiative => {
      initiativeList.appendChild(createInitiativeCard(initiative, project.projectSlug));
    });
    initiativesSection.appendChild(initiativeList);
    refs.modalContent.appendChild(initiativesSection);
  }

  // modal-meta をモーダル内の最下部に寄せる（footer的配置）
  // modal-content の flex レイアウトにより、末尾に置いた要素が下に押し出される。
  if (modalMetaHtml) {
    const tmp = document.createElement('div');
    tmp.innerHTML = modalMetaHtml.trim();
    const metaEl = tmp.firstElementChild;
    if (metaEl) refs.modalContent.appendChild(metaEl);
  }

  if (refs.modalOverlay && refs.modalContainer) {
    refs.modalOverlay.hidden = false;
    refs.modalContainer.hidden = false;
    state.isClosing = false;
    refs.modalContainer.dataset.state = 'closed';
    requestAnimationFrame(() => {
      document.body.classList.add('modal-open');
      refs.modalContainer.dataset.state = 'open';
      requestAnimationFrame(() => {
        if (refs.modalClose) refs.modalClose.focus();
        if (state.modalFocusTrapHandler) document.removeEventListener('keydown', state.modalFocusTrapHandler);
        state.modalFocusTrapHandler = createFocusTrap(refs.modalContainer);
        document.addEventListener('keydown', state.modalFocusTrapHandler);
      });
    });
  }

  document.body.style.overflow = 'hidden';
  if (refs.guidanceText) refs.guidanceText.classList.remove('visible');
  if (refs.focusVisual) refs.focusVisual.classList.add('modal-background');
  if (refs.titleBackground) refs.titleBackground.classList.add('modal-background');
  if (refs.contextPanel) refs.contextPanel.classList.add('modal-background');
  if (refs.projectNavigation) refs.projectNavigation.classList.add('modal-background');
}

export function closeModal(stopAllInlineVideos) {
  const refs = getRefs();
  if (refs.lightboxOverlay && !refs.lightboxOverlay.hidden) closeLightbox();
  if (typeof stopAllInlineVideos === 'function') stopAllInlineVideos();

  if (!refs.modalOverlay || !refs.modalContainer) return;
  if (state.isClosing) return;
  state.isClosing = true;

  refs.modalContainer.dataset.state = 'closing';
  document.body.classList.remove('modal-open');

  const onEnd = (e) => {
    if (e.target !== refs.modalContainer || e.propertyName !== 'transform') return;
    refs.modalContainer.removeEventListener('transitionend', onEnd);
    refs.modalContainer.dataset.state = 'closed';
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
  };
  refs.modalContainer.addEventListener('transitionend', onEnd);

  document.body.style.overflow = '';
  if (refs.guidanceText) refs.guidanceText.classList.add('visible');
  if (refs.focusVisual) refs.focusVisual.classList.remove('modal-background');
  if (refs.titleBackground) refs.titleBackground.classList.remove('modal-background');
  if (refs.contextPanel) refs.contextPanel.classList.remove('modal-background');
  if (refs.projectNavigation) refs.projectNavigation.classList.remove('modal-background');

  state.selectedProject = null;
  state.hoveredProject = null;
  state.currentState = 'initial';
}
