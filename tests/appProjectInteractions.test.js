import { describe, expect, it, vi } from 'vitest';
import { createProjectInteractionController } from '../appProjectInteractions.js';

function createRefs() {
  const contextPanel = document.createElement('div');
  contextPanel.className = 'context-panel';
  const guidanceText = document.createElement('div');
  guidanceText.className = 'visible';
  const titleText = document.createElement('div');
  const bgLayer = document.createElement('div');
  return { contextPanel, guidanceText, titleText, bgLayer };
}

describe('appProjectInteractions', () => {
  it('hover で state と UI を更新する', () => {
    const state = {
      currentState: 'initial',
      hoveredProject: null,
      selectedProject: null,
      bgLayerFadeCompleteHandler: null
    };
    const nav = document.createElement('nav');
    const item = document.createElement('div');
    item.className = 'project-item';
    nav.appendChild(item);

    const refs = { ...createRefs(), projectNavigation: nav };
    const updateHeroMedia = vi.fn();
    const preloadProjectVideos = vi.fn();
    const clearHoverLeaveTimer = vi.fn();

    const controller = createProjectInteractionController({
      state,
      refs,
      openingSoonProjectId: 'project-08',
      escapeHtml: (v) => v,
      clearHoverLeaveTimer,
      clearProjectSelections: vi.fn(),
      resetHeroVideoBase: vi.fn(),
      beginBackgroundFadeOutToInitialState: vi.fn(),
      updateHeroMedia,
      preloadProjectVideos,
      openProjectModalFromRoute: vi.fn()
    });

    const project = {
      id: 'project-01',
      category: 'Branding',
      year: '2025',
      disciplines: 'Direction',
      tools: ['Figma'],
      heroMedia: { type: 'video', src: '/x.webm' }
    };

    controller.handleProjectItemMouseEnter(project, item);

    expect(clearHoverLeaveTimer).toHaveBeenCalled();
    expect(item.classList.contains('thumbnail-preview-active')).toBe(true);
    expect(state.currentState).toBe('hover');
    expect(state.hoveredProject).toBe(project);
    expect(updateHeroMedia).toHaveBeenCalledWith(project.heroMedia);
    expect(preloadProjectVideos).toHaveBeenCalledWith(project);
    expect(refs.contextPanel.classList.contains('visible')).toBe(true);
    expect(refs.contextPanel.innerHTML).toContain('Branding (2025)');
  });

  it('modal 中は hover/touch の処理を抑止する', () => {
    const state = {
      currentState: 'modal',
      hoveredProject: null,
      selectedProject: null,
      bgLayerFadeCompleteHandler: null
    };
    const refs = createRefs();
    const updateHeroMedia = vi.fn();
    const preloadProjectVideos = vi.fn();

    const controller = createProjectInteractionController({
      state,
      refs,
      openingSoonProjectId: 'project-08',
      escapeHtml: (v) => v,
      clearHoverLeaveTimer: vi.fn(),
      clearProjectSelections: vi.fn(),
      resetHeroVideoBase: vi.fn(),
      beginBackgroundFadeOutToInitialState: vi.fn(),
      updateHeroMedia,
      preloadProjectVideos,
      openProjectModalFromRoute: vi.fn()
    });

    const project = { id: 'project-01', heroMedia: {} };
    controller.handleProjectItemMouseEnter(project, null);
    controller.handleProjectItemTouchStart(project, null);

    expect(updateHeroMedia).not.toHaveBeenCalled();
    expect(preloadProjectVideos).not.toHaveBeenCalled();
  });

  it('click でモーダル遷移を呼ぶ', () => {
    const openProjectModalFromRoute = vi.fn();
    const clearHoverLeaveTimer = vi.fn();
    const controller = createProjectInteractionController({
      state: { currentState: 'initial', hoveredProject: null, selectedProject: null },
      refs: createRefs(),
      openingSoonProjectId: 'project-08',
      escapeHtml: (v) => v,
      clearHoverLeaveTimer,
      clearProjectSelections: vi.fn(),
      resetHeroVideoBase: vi.fn(),
      beginBackgroundFadeOutToInitialState: vi.fn(),
      updateHeroMedia: vi.fn(),
      preloadProjectVideos: vi.fn(),
      openProjectModalFromRoute
    });

    const project = { id: 'project-03' };
    controller.handleProjectClick(project);

    expect(clearHoverLeaveTimer).toHaveBeenCalled();
    expect(openProjectModalFromRoute).toHaveBeenCalledWith(project, null);
  });
});
