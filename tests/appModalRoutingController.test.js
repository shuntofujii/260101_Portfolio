import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createModalRoutingController } from '../appModalRoutingController.js';

function createSetup(overrides = {}) {
  const state = {
    currentState: 'initial',
    selectedProject: null,
    modalTriggerElement: null
  };
  const modalContent = document.createElement('div');
  const modalContainer = document.createElement('div');
  const refs = { modalContent, modalContainer };

  const projects = [
    { id: 'p1', pageSlug: 'ejic' },
    { id: 'p2', pageSlug: 'sepila' }
  ];

  const deps = {
    state,
    refs,
    basePageTitle: 'Base',
    baseMetaDescription: 'Base Desc',
    metaDescriptionEl: document.createElement('meta'),
    clearProjectSelections: vi.fn(),
    preloadProjectVideos: vi.fn(),
    openModal: vi.fn(),
    closeModalAndStopVideos: vi.fn(),
    renderModalContent: vi.fn(),
    getProjects: () => projects,
    parseProjectSlugFromPath: (pathname) => {
      const normalized = pathname.replace(/\/+$/, '');
      const seg = normalized.replace(/^\//, '');
      return seg || null;
    },
    normalizePathname: (pathname) => pathname.replace(/\/+$/, '') || '/',
    getPathnameProjectSlug: vi.fn(() => null),
    findLegacyProjectFromHash: vi.fn(() => null),
    pathForProjectSlug: (slug) => `/${slug}/`,
    applyModalHistoryForProject: vi.fn(),
    restoreBaseHistoryOnModalClose: vi.fn(),
    applyModalDocumentMeta: vi.fn(),
    restoreBaseDocumentMeta: vi.fn(),
    ...overrides
  };

  const controller = createModalRoutingController(deps);
  return { controller, deps, state, refs, projects };
}

describe('appModalRoutingController', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.removeAttribute('data-portfolio-page-slug');
    history.replaceState(null, '', '/');
  });

  it('applyInitialRoute: pathname slug からモーダルを開く', () => {
    const { controller, deps } = createSetup({
      getPathnameProjectSlug: () => 'ejic'
    });
    const item = document.createElement('button');
    item.dataset.projectId = 'p1';
    document.body.appendChild(item);

    controller.applyInitialRoute();

    expect(deps.openModal).toHaveBeenCalledTimes(1);
    expect(deps.openModal.mock.calls[0][0].id).toBe('p1');
  });

  it('applyInitialRoute: legacy hash から URL を置換して開く', () => {
    const replaceSpy = vi.spyOn(history, 'replaceState');
    const { controller, deps } = createSetup({
      getPathnameProjectSlug: () => null,
      findLegacyProjectFromHash: () => ({ id: 'p2', pageSlug: 'sepila' })
    });
    const item = document.createElement('button');
    item.dataset.projectId = 'p2';
    document.body.appendChild(item);

    controller.applyInitialRoute();

    expect(replaceSpy).toHaveBeenCalledWith(null, '', '/sepila/');
    expect(deps.openModal).toHaveBeenCalledTimes(1);
  });

  it('updateModalProjectInPlace: 選択状態と副作用を更新する', () => {
    const { controller, deps, state, refs } = createSetup();
    const item = document.createElement('div');
    item.dataset.projectId = 'p2';
    document.body.appendChild(item);

    controller.updateModalProjectInPlace({ id: 'p2', pageSlug: 'sepila' }, { fromSwipe: true });

    expect(state.currentState).toBe('modal');
    expect(state.selectedProject?.id).toBe('p2');
    expect(item.classList.contains('selected')).toBe(true);
    expect(refs.modalContainer.dataset.swipeSettled).toBe('1');
    expect(deps.renderModalContent).toHaveBeenCalled();
    expect(deps.preloadProjectVideos).toHaveBeenCalled();
    expect(deps.applyModalHistoryForProject).toHaveBeenCalled();
    expect(deps.applyModalDocumentMeta).toHaveBeenCalled();
  });

  it('bindRouteEventListeners: popstate で閉じる分岐が動く', () => {
    const { controller, deps, state } = createSetup();
    state.currentState = 'modal';

    controller.bindRouteEventListeners();
    history.replaceState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(deps.closeModalAndStopVideos).toHaveBeenCalled();
  });

  it('bindRouteEventListeners: static project page の close はソフト復帰する', () => {
    const replaceSpy = vi.spyOn(history, 'replaceState');
    const { controller, deps } = createSetup();
    document.body.dataset.portfolioPageSlug = 'ejic';

    controller.bindRouteEventListeners();
    document.dispatchEvent(new CustomEvent('portfolio:modalclose'));

    expect(replaceSpy).toHaveBeenCalledWith(null, 'Base', '/');
    expect(document.body.dataset.portfolioPageSlug).toBeUndefined();
    expect(deps.restoreBaseDocumentMeta).toHaveBeenCalled();
  });
});
