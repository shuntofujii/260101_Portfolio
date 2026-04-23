import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createModalSwipeController } from '../appModalSwipeController.js';

function createTouchEvent(type, { x = 0, y = 0, target } = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touch = { clientX: x, clientY: y };
  Object.defineProperty(event, 'changedTouches', { value: [touch], configurable: true });
  Object.defineProperty(event, 'touches', { value: [touch], configurable: true });
  Object.defineProperty(event, 'target', { value: target, configurable: true });
  return event;
}

function setupController(overrides = {}) {
  const overlay = document.createElement('div');
  overlay.hidden = false;
  const container = document.createElement('div');
  const content = document.createElement('div');
  container.appendChild(content);
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  const refs = {
    modalOverlay: overlay,
    modalContainer: container,
    modalContent: content
  };
  refs.modalContainer.getBoundingClientRect = () => ({
    left: 100,
    right: 300,
    top: 80,
    width: 200,
    height: 160
  });

  const deps = {
    refs,
    state: { currentState: 'modal', isClosing: false },
    isMobileProjectPageSwipeEnabled: () => true,
    isLightboxOpen: () => false,
    getCurrentSelectedProjectIndex: () => 0,
    getProjects: () => [{ id: 'p1' }, { id: 'p2' }],
    renderModalContent: vi.fn(),
    updateModalProjectInPlace: vi.fn(),
    onGestureFinalized: vi.fn(),
    config: {
      swipeMaxY: 72,
      swipeLockY: 14,
      swipeCommitMs: 10
    },
    ...overrides
  };

  const controller = createModalSwipeController(deps);
  return { controller, deps };
}

describe('appModalSwipeController', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('無効条件では touchstart を無視する', () => {
    const { controller, deps } = setupController({
      isMobileProjectPageSwipeEnabled: () => false
    });
    const target = document.createElement('div');
    const start = createTouchEvent('touchstart', { x: 120, y: 80, target });

    controller.onTouchStart(start);
    controller.onTouchMove(createTouchEvent('touchmove', { x: 60, y: 82, target }));
    controller.onTouchEnd(createTouchEvent('touchend', { x: 30, y: 82, target }));

    expect(deps.renderModalContent).not.toHaveBeenCalled();
    expect(deps.updateModalProjectInPlace).not.toHaveBeenCalled();
  });

  it('操作UI要素からの touchstart はスワイプ状態を確定しない', () => {
    const { controller, deps } = setupController();
    const button = document.createElement('button');
    const start = createTouchEvent('touchstart', { x: 120, y: 80, target: button });

    controller.onTouchStart(start);
    controller.onTouchMove(createTouchEvent('touchmove', { x: 40, y: 80, target: button }));
    controller.onTouchEnd(createTouchEvent('touchend', { x: 10, y: 80, target: button }));

    expect(deps.renderModalContent).not.toHaveBeenCalled();
    expect(deps.updateModalProjectInPlace).not.toHaveBeenCalled();
    expect(deps.onGestureFinalized).toHaveBeenCalled();
  });

  it('横スワイプで次プロジェクトへ確定遷移する', async () => {
    const { controller, deps } = setupController();
    const target = document.createElement('div');

    controller.onTouchStart(createTouchEvent('touchstart', { x: 520, y: 100, target }));
    controller.onTouchMove(createTouchEvent('touchmove', { x: 80, y: 102, target }));
    controller.onTouchEnd(createTouchEvent('touchend', { x: 40, y: 104, target }));

    await new Promise((r) => setTimeout(r, 30));

    expect(deps.renderModalContent).toHaveBeenCalled();
    expect(deps.updateModalProjectInPlace).toHaveBeenCalledWith({ id: 'p2' }, { fromSwipe: true });
  });

  it('縦移動が大きい場合は確定せず戻る', async () => {
    const { controller, deps } = setupController();
    const target = document.createElement('div');

    controller.onTouchStart(createTouchEvent('touchstart', { x: 240, y: 100, target }));
    controller.onTouchMove(createTouchEvent('touchmove', { x: 130, y: 190, target }));
    controller.onTouchEnd(createTouchEvent('touchend', { x: 100, y: 220, target }));

    await new Promise((r) => setTimeout(r, 40));
    expect(deps.updateModalProjectInPlace).not.toHaveBeenCalled();
  });
});
