import { describe, expect, it, vi } from 'vitest';
import { renderProjectNavigation } from '../appNavigation.js';

function createProjects() {
  return [
    { id: 'p1', title: 'Project 1', thumbnail: '/p1.jpg' },
    { id: 'p2', title: 'Project 2', thumbnail: '/p2.jpg' },
    { id: 'p3', title: 'Project 3', thumbnail: '/p3.jpg' }
  ];
}

function createHandlers() {
  return {
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
    onTouchStart: vi.fn(),
    onClick: vi.fn()
  };
}

describe('renderProjectNavigation', () => {
  it('複数案件時は3セグメント描画で無限スクロールを初期化する', () => {
    const nav = document.createElement('nav');
    const projects = createProjects();
    Object.defineProperty(nav, 'scrollWidth', {
      configurable: true,
      get: () => 900
    });
    Object.defineProperty(nav, 'clientWidth', {
      configurable: true,
      get: () => 150
    });

    renderProjectNavigation(nav, projects, {
      baseAssetsUrl: '',
      projectThumbnailSizePx: 90,
      thumbnailFetchPriorityCount: 2,
      handlers: createHandlers()
    });

    const items = nav.querySelectorAll('.project-item');
    expect(items.length).toBe(projects.length * 3);
    expect(nav.classList.contains('is-infinite-loop')).toBe(true);
    expect(nav.scrollLeft).toBe(375);

    const thumbs = [...nav.querySelectorAll('img.project-thumbnail')];
    // 1周目: index < 2 が high、それ以外とループ複製は lazy
    expect(thumbs[0].fetchPriority).toBe('high');
    expect(thumbs[0].loading).toBe('eager');
    expect(thumbs[2].fetchPriority).toBe('low');
    expect(thumbs[2].loading).toBe('lazy');
    expect(thumbs[3].fetchPriority).toBe('low');
    expect(thumbs[3].loading).toBe('lazy');
  });

  it('端へ寄ったスクロール時に中央セグメントへ戻す', () => {
    const nav = document.createElement('nav');
    const projects = createProjects();
    Object.defineProperty(nav, 'scrollWidth', {
      configurable: true,
      get: () => 900
    });
    Object.defineProperty(nav, 'clientWidth', {
      configurable: true,
      get: () => 150
    });

    renderProjectNavigation(nav, projects, {
      baseAssetsUrl: '',
      projectThumbnailSizePx: 90,
      thumbnailFetchPriorityCount: 2,
      handlers: createHandlers()
    });

    nav.scrollLeft = 10;
    nav.dispatchEvent(new Event('scroll'));
    expect(nav.scrollLeft).toBe(310);

    nav.scrollLeft = 490;
    nav.dispatchEvent(new Event('scroll'));
    expect(nav.scrollLeft).toBe(190);
  });

  it('画面内に収まる場合は無限スクロールを有効化しない', () => {
    const nav = document.createElement('nav');
    const projects = createProjects();
    Object.defineProperty(nav, 'scrollWidth', {
      configurable: true,
      get: () => nav.childElementCount * 100
    });
    Object.defineProperty(nav, 'clientWidth', {
      configurable: true,
      get: () => 400
    });

    renderProjectNavigation(nav, projects, {
      baseAssetsUrl: '',
      projectThumbnailSizePx: 90,
      thumbnailFetchPriorityCount: 2,
      handlers: createHandlers()
    });

    const items = nav.querySelectorAll('.project-item');
    expect(items.length).toBe(projects.length);
    expect(nav.classList.contains('is-infinite-loop')).toBe(false);
    expect(nav.scrollLeft).toBe(0);
  });

  it('touchend タップでも click 合成に依存せず onClick を呼ぶ', () => {
    const nav = document.createElement('nav');
    const projects = createProjects();
    const handlers = createHandlers();
    Object.defineProperty(nav, 'scrollWidth', {
      configurable: true,
      get: () => nav.childElementCount * 100
    });
    Object.defineProperty(nav, 'clientWidth', {
      configurable: true,
      get: () => 400
    });

    renderProjectNavigation(nav, projects, {
      baseAssetsUrl: '',
      projectThumbnailSizePx: 90,
      thumbnailFetchPriorityCount: 2,
      handlers
    });

    const firstItem = nav.querySelector('.project-item');
    const thumb = firstItem.querySelector('.project-thumbnail');
    expect(firstItem).toBeTruthy();
    expect(thumb).toBeTruthy();

    const touchStart = new Event('touchstart', { bubbles: true, cancelable: true });
    Object.defineProperty(touchStart, 'touches', {
      value: [{ clientX: 30, clientY: 40 }],
      configurable: true
    });
    Object.defineProperty(touchStart, 'target', {
      value: thumb,
      configurable: true
    });
    nav.dispatchEvent(touchStart);

    const touchEnd = new Event('touchend', { bubbles: true, cancelable: true });
    nav.dispatchEvent(touchEnd);

    expect(handlers.onTouchStart).toHaveBeenCalledTimes(1);
    expect(handlers.onClick).toHaveBeenCalledTimes(1);
    expect(handlers.onClick).toHaveBeenCalledWith(projects[0], firstItem);
  });

  it('touchend で既定動作を抑止し click-through を防ぐ', () => {
    const nav = document.createElement('nav');
    const projects = createProjects();
    const handlers = createHandlers();
    Object.defineProperty(nav, 'scrollWidth', {
      configurable: true,
      get: () => nav.childElementCount * 100
    });
    Object.defineProperty(nav, 'clientWidth', {
      configurable: true,
      get: () => 400
    });

    renderProjectNavigation(nav, projects, {
      baseAssetsUrl: '',
      projectThumbnailSizePx: 90,
      thumbnailFetchPriorityCount: 2,
      handlers
    });

    const firstItem = nav.querySelector('.project-item');
    const thumb = firstItem.querySelector('.project-thumbnail');
    const touchStart = new Event('touchstart', { bubbles: true, cancelable: true });
    Object.defineProperty(touchStart, 'touches', {
      value: [{ clientX: 30, clientY: 40 }],
      configurable: true
    });
    Object.defineProperty(touchStart, 'target', {
      value: thumb,
      configurable: true
    });
    nav.dispatchEvent(touchStart);

    let prevented = false;
    const touchEnd = new Event('touchend', { bubbles: true, cancelable: true });
    touchEnd.preventDefault = () => {
      prevented = true;
    };
    nav.dispatchEvent(touchEnd);

    expect(prevented).toBe(true);
    expect(handlers.onClick).toHaveBeenCalledTimes(1);
  });

  it('優先サムネは eager + fetchpriority=high、それ以外は lazy', () => {
    const nav = document.createElement('nav');
    const projects = createProjects();
    Object.defineProperty(nav, 'scrollWidth', {
      configurable: true,
      get: () => nav.childElementCount * 100
    });
    Object.defineProperty(nav, 'clientWidth', {
      configurable: true,
      get: () => 400
    });

    renderProjectNavigation(nav, projects, {
      baseAssetsUrl: '',
      projectThumbnailSizePx: 90,
      thumbnailFetchPriorityCount: 2,
      handlers: createHandlers()
    });

    const thumbs = [...nav.querySelectorAll('.project-thumbnail')];
    expect(thumbs[0].loading).toBe('eager');
    expect(thumbs[0].fetchPriority).toBe('high');
    expect(thumbs[0].sizes).toBe('90px');
    expect(thumbs[2].loading).toBe('lazy');
    expect(thumbs[2].fetchPriority).toBe('low');
  });
});
